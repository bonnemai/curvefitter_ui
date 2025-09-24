import { useCallback, useMemo, useState } from 'react';
import { useEventSource } from './hooks/useEventSource';
import { CurveMessage } from './types/curve';
import { YieldCurveChart } from './components/YieldCurveChart';
import './App.css';

const STREAM_URL = 'http://localhost:8000/curves/stream';

type ConnectionState = 'connecting' | 'open' | 'error';

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString();
}

export default function App() {
  const [curve, setCurve] = useState<CurveMessage | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [lastError, setLastError] = useState<string | null>(null);

  const handleMessage = useCallback((data: CurveMessage) => {
    setCurve(data);
    setConnectionState('open');
    setLastError(null);
  }, []);

  const handleOpen = useCallback(() => {
    setConnectionState('open');
    setLastError(null);
  }, []);

  const handleError = useCallback((event: Event) => {
    console.error('EventSource error', event);
    setConnectionState('error');
    setLastError('Connection lost. Retrying automatically...');
  }, []);

  useEventSource<CurveMessage>(STREAM_URL, {
    onMessage: handleMessage,
    onOpen: handleOpen,
    onError: handleError,
  });

  const statusLabel = useMemo(() => {
    switch (connectionState) {
      case 'open':
        return 'Live';
      case 'error':
        return 'Reconnecting';
      default:
        return 'Connecting';
    }
  }, [connectionState]);

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <h1>Curve Fitter Monitor</h1>
          <p className="app__subtitle">Streaming live rates and fitted curves</p>
        </div>
        <div className={`app__status app__status--${connectionState}`}>
          <span className="app__status-indicator" aria-hidden />
          <span>{statusLabel}</span>
        </div>
      </header>

      <main className="app__content">
        {curve ? (
          <>
            <section className="app__chart">
              <YieldCurveChart curve={curve} />
            </section>

            <section className="app__details">
              <h2>Snapshot</h2>
              <dl>
                <div>
                  <dt>Timestamp</dt>
                  <dd>{formatTimestamp(curve.timestamp)}</dd>
                </div>
                <div>
                  <dt>Raw Tenors</dt>
                  <dd>{curve.tenorYears.join(', ')}</dd>
                </div>
                <div>
                  <dt>Raw Rates</dt>
                  <dd>{curve.rawRates.map((rate) => rate.toFixed(3)).join(', ')}</dd>
                </div>
              </dl>
            </section>
          </>
        ) : (
          <div className="app__placeholder">
            <p>Waiting for the first curve...</p>
          </div>
        )}

        {lastError && <p className="app__error" role="alert">{lastError}</p>}
      </main>
    </div>
  );
}
