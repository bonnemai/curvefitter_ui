import { useEffect } from 'react';

type EventSourceOptions<T> = {
  onMessage: (data: T) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
};

export function useEventSource<T>(url: string | null, options: EventSourceOptions<T>) {
  const { onMessage, onError, onOpen } = options;

  useEffect(() => {
    if (!url) {
      return undefined;
    }

    const source = new EventSource(url);

    source.onopen = () => {
      onOpen?.();
    };

    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as T;
        onMessage(payload);
      } catch (parseError) {
        console.error('Failed to parse SSE payload', parseError);
      }
    };

    source.onerror = (event) => {
      onError?.(event);
    };

    return () => {
      source.close();
    };
  }, [url, onMessage, onError, onOpen]);
}
