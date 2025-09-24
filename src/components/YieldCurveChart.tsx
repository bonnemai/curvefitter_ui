import { useEffect, useMemo, useRef } from 'react';
import * as d3 from 'd3';
import type { NumberValue } from 'd3';
import { CurveMessage } from '../types/curve';
import './YieldCurveChart.css';

const WIDTH = 860;
const HEIGHT = 420;
const MARGINS = { top: 32, right: 32, bottom: 56, left: 72 };

type CurvePoint = { tenor: number; rate: number };

type LegendItem = { label: string; color: string; shape: 'line' | 'dot'; };

type YieldCurveChartProps = {
  curve: CurveMessage;
};

export function YieldCurveChart({ curve }: YieldCurveChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const { points, fitPoints } = useMemo<{ points: CurvePoint[]; fitPoints: CurvePoint[] }>(() => {
    const rawPoints: CurvePoint[] = curve.tenorYears.map((year, index) => ({
      tenor: year,
      rate: curve.rawRates[index],
    }));

    const fitted: CurvePoint[] = curve.fit.gridYears.map((year, index) => ({
      tenor: year,
      rate: curve.fit.rates[index],
    }));

    return { points: rawPoints, fitPoints: fitted };
  }, [curve]);

  useEffect(() => {
    const svgElement = svgRef.current;
    if (!svgElement) {
      return;
    }

    const svg = d3.select(svgElement);
    svg.selectAll('*').remove();

    const innerWidth = WIDTH - MARGINS.left - MARGINS.right;
    const innerHeight = HEIGHT - MARGINS.top - MARGINS.bottom;

    const xDomain = d3.extent([...points, ...fitPoints], (d: CurvePoint) => d.tenor) as [number, number];
    const yExtent = d3.extent([...points, ...fitPoints], (d: CurvePoint) => d.rate) as [number, number];

    const yPadding = (yExtent[1] - yExtent[0]) * 0.08;
    const yDomain: [number, number] = [yExtent[0] - yPadding, yExtent[1] + yPadding];

    const xScale = d3.scaleLinear().domain(xDomain).range([0, innerWidth]);
    const yScale = d3.scaleLinear().domain(yDomain).range([innerHeight, 0]);

    const rootGroup = svg
      .append('g')
      .attr('transform', `translate(${MARGINS.left},${MARGINS.top})`);

    const gridGroup = rootGroup
      .append('g')
      .attr('class', 'chart-grid');

    gridGroup
      .append('g')
      .attr('class', 'chart-grid chart-grid--y')
      .call(
        d3
          .axisLeft(yScale)
          .ticks(8)
          .tickSize(-innerWidth)
          .tickFormat(() => ''),
      )
      .selectAll('line')
      .attr('stroke', 'rgba(148, 163, 184, 0.32)');

    gridGroup
      .append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .attr('class', 'chart-grid chart-grid--x')
      .call(
        d3
          .axisBottom(xScale)
          .ticks(10)
          .tickSize(-innerHeight)
          .tickFormat(() => ''),
      )
      .selectAll('line')
      .attr('stroke', 'rgba(148, 163, 184, 0.25)');

    const xAxisGroup = rootGroup
      .append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .attr('class', 'chart-axis chart-axis--x')
      .call(
        d3
          .axisBottom(xScale)
          .ticks(10)
          .tickFormat((value: NumberValue) => `${Number(value)}y`),
      );

    xAxisGroup
      .append('text')
      .attr('x', innerWidth)
      .attr('y', 40)
      .attr('fill', '#475569')
      .attr('text-anchor', 'end')
      .attr('font-size', 12)
      .text('Tenor (years)');

    const yAxisGroup = rootGroup
      .append('g')
      .attr('class', 'chart-axis chart-axis--y')
      .call(
        d3
          .axisLeft(yScale)
          .ticks(8)
          .tickFormat((value: NumberValue, index: number) => `${Number(value)}%`),
      );

    yAxisGroup
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -MARGINS.top)
      .attr('y', -48)
      .attr('fill', '#475569')
      .attr('text-anchor', 'end')
      .attr('font-size', 12)
      .text('Rate (%)');

    const fittedLine = d3
      .line<CurvePoint>()
      .curve(d3.curveMonotoneX)
      .x((d: CurvePoint) => xScale(d.tenor))
      .y((d: CurvePoint) => yScale(d.rate));

    rootGroup
      .append('path')
      .datum(fitPoints)
      .attr('fill', 'none')
      .attr('stroke', '#2563eb')
      .attr('stroke-width', 2.5)
      .attr('d', fittedLine);

    rootGroup
      .append('g')
      .selectAll<SVGCircleElement, CurvePoint>('circle')
      .data(points)
      .join('circle')
      .attr('cx', (d: CurvePoint) => xScale(d.tenor))
      .attr('cy', (d: CurvePoint) => yScale(d.rate))
      .attr('r', 5)
      .attr('fill', '#f97316')
      .attr('stroke', '#1f2937')
      .attr('stroke-width', 1)
      .append('title')
      .text((d: CurvePoint) => `Tenor ${d.tenor}y, Rate ${d.rate.toFixed(3)}%`);

    const legend = rootGroup
      .append('g')
      .attr('class', 'chart-legend')
      .attr('transform', `translate(${innerWidth - 180}, 0)`);

    legend
      .append('rect')
      .attr('width', 170)
      .attr('height', 56)
      .attr('rx', 10)
      .attr('ry', 10)
      .attr('fill', 'rgba(15, 23, 42, 0.08)');

    const legendItems: LegendItem[] = [
      { label: 'Fitted curve', color: '#2563eb', shape: 'line' },
      { label: 'Raw rates', color: '#f97316', shape: 'dot' },
    ];

    const legendGroup = legend
      .selectAll<SVGGElement, LegendItem>('g')
      .data(legendItems)
      .join('g')
      .attr('transform', (_: LegendItem, index: number) => `translate(16, ${18 + index * 20})`);

    legendGroup
      .filter((item: LegendItem) => item.shape === 'line')
      .append('line')
      .attr('x1', 0)
      .attr('x2', 24)
      .attr('y1', 0)
      .attr('y2', 0)
      .attr('stroke', (item: LegendItem) => item.color)
      .attr('stroke-width', 3);

    legendGroup
      .filter((item: LegendItem) => item.shape === 'dot')
      .append('circle')
      .attr('cx', 12)
      .attr('cy', 0)
      .attr('r', 5)
      .attr('fill', (item: LegendItem) => item.color)
      .attr('stroke', '#1f2937')
      .attr('stroke-width', 1);

    legendGroup
      .append('text')
      .attr('x', 36)
      .attr('y', 4)
      .attr('fill', '#1f2937')
      .attr('font-size', 12)
      .text((item: LegendItem) => item.label);
  }, [points, fitPoints]);

  return (
    <div className="chart">
      <div className="chart__header">
        <h2>Yield Curve Snapshot</h2>
        <p>{new Date(curve.timestamp).toLocaleString()}</p>
      </div>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label="Yield curve line chart"
      />
    </div>
  );
}
