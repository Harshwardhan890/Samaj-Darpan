import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/services/api";

interface State<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApiData<T>(path: string | null, deps: unknown[] = []) {
  const [state, setState] = useState<State<T>>({
    data: null,
    loading: Boolean(path),
    error: null,
  });
  const [nonce, setNonce] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!path) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState((current) => ({ ...current, loading: true, error: null }));

    apiFetch<T>(path, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) {
          setState({ data, loading: false, error: null });
        }
      })
      .catch((error: Error) => {
        if (controller.signal.aborted) return;
        if (error.name === "AbortError") return;
        setState((current) => ({
          ...current,
          loading: false,
          error: error.message || "Could not load this data.",
        }));
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, nonce, ...deps]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  return { ...state, refresh };
}
