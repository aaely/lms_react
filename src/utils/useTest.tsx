import { useEffect, useState } from "react";

type FetchOptions = {
  /** Optional headers (e.g., Authorization, custom headers) */
  headers?: Record<string, string>;
  /** Optional request init overrides (method, body, etc.) */
  init?: RequestInit;
};

export default function useEndpoint<T = unknown>(
  endpoint: string,
  { headers, init }: FetchOptions = {}
) {
  const [data, setData] = useState<T | string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!endpoint) return;

    const controller = new AbortController();
    const signal = controller.signal;

    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch(endpoint, {
          ...(init ?? {}),
          headers: { ...(headers ?? {}) },
          signal,
        });

        if (!res.ok) {
          throw new Error(`${res.status} ${res.statusText}`);
        }

        // Try to infer response type by Content-Type
        const ct = res.headers.get("content-type")?.toLowerCase() ?? "";
        if (ct.includes("application/json")) {
          const json = (await res.json()) as T;
          if (!signal.aborted) setData(json);
        } else if (ct.includes("text/csv") || ct.includes("text/plain")) {
          const text = await res.text();
          if (!signal.aborted) setData(text);
        } else {
          try {
            const json = (await res.json()) as T;
            if (!signal.aborted) setData(json);
          } catch {
            const text = await res.text();
            if (!signal.aborted) setData(text);
          }
        }
      } catch (err: unknown) {
        if (signal.aborted) return;
        const msg =
          err instanceof Error ? err.message : "Request failed unexpectedly";
        setError(msg);
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    })();

    // Cleanup on unmount or dependency change
    return () => controller.abort();
  }, [endpoint, JSON.stringify(headers), JSON.stringify(init)]);
  console.log(data, error, loading)
  return { data, error, loading };
}