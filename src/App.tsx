import { useCallback, useMemo, useState } from 'react';
import { usePolling } from './hooks/usePolling';
import { CurveMessage } from './types/curve';
import { YieldCurveChart } from './components/YieldCurveChart';
import { appConfig } from './config';
import './App.css';

type ConnectionState = 'connecting' | 'open' | 'error';

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString();
}

export default function App() {
  const [curve, setCurve] = useState<CurveMessage | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [lastError, setLastError] = useState<string | null>(null);

  const handleData = useCallback((data: CurveMessage) => {
    setCurve(data);
    setConnectionState('open');
    setLastError(null);
  }, []);

  const handleSuccess = useCallback(() => {
    setConnectionState('open');
    setLastError(null);
  }, []);

  const handleError = useCallback((error: Error) => {
    console.error('Polling error', error);
    setConnectionState('error');
    setLastError('Connection lost. Retrying automatically...');
  }, []);

  usePolling<CurveMessage>(`${appConfig.STREAM_URL}/curves`, {
    onData: handleData,
    onSuccess: handleSuccess,
    onError: handleError,
    interval: 1000,
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

      <footer className="app__footer">
        <a href="https://github.com/bonnemai/curvefitter_ui" target="_blank" rel="noreferrer">
          github.com/bonnemai/curvefitter_ui
        </a>
        {' · '}
        <a href="https://staging.d3iwsh8gt9f3of.amplifyapp.com" target="_blank" rel="noreferrer">
          Olivier Bonnemaison
        </a>
      </footer>
    </div>
  );
}
