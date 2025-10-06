import { useEffect, useRef } from 'react';

type PollingOptions<T> = {
  onData: (data: T) => void;
  onError?: (error: Error) => void;
  onSuccess?: () => void;
  interval?: number;
};

export function usePolling<T>(url: string | null, options: PollingOptions<T>) {
  const { onData, onError, onSuccess, interval = 1000 } = options;
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!url) {
      return undefined;
    }

    let isActive = true;

    const fetchData = async () => {
      if (!isActive) return;

      // Cancel any previous ongoing request
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch(url, {
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json() as T;

        if (isActive) {
          onData(data);
          onSuccess?.();
        }
      } catch (error) {
        // Ignore abort errors
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }

        if (isActive && error instanceof Error) {
          onError?.(error);
        }
      }
    };

    // Initial fetch
    fetchData();

    // Set up polling interval
    const intervalId = setInterval(fetchData, interval);

    return () => {
      isActive = false;
      clearInterval(intervalId);
      abortControllerRef.current?.abort();
    };
  }, [url, onData, onError, onSuccess, interval]);
}
