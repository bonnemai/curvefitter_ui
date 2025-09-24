export interface CurveFitData {
  gridYears: number[];
  rates: number[];
  polynomialCoefficients: number[];
}

export interface CurveMessage {
  timestamp: string;
  tenorYears: number[];
  rawRates: number[];
  fit: CurveFitData;
}
