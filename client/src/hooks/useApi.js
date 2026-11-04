import { useEffect, useState } from 'react';

// Runs load() whenever deps change and tracks its result.
// While reloading, the previous data is kept, so the page doesn't jump or flash.
export function useApi(load, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true });

  useEffect(() => {
    let cancelled = false;
    setState((previous) => ({ ...previous, loading: true }));

    load().then(
      (data) => {
        if (!cancelled) setState({ data, error: null, loading: false });
      },
      (error) => {
        if (!cancelled) setState((previous) => ({ ...previous, error: error.message, loading: false }));
      }
    );

    // A newer request replaces this one: ignore its answer when it arrives.
    return () => {
      cancelled = true;
    };
  }, deps);

  return state;
}
