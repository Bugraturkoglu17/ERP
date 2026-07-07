import { useState, useCallback } from "react";

interface UseAsyncReturn<T, Args extends any[]> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  execute: (...args: Args) => Promise<T>;
}

export function useAsync<T, Args extends any[]>(
  asyncFunction: (...args: Args) => Promise<T>,
  immediate = false
): UseAsyncReturn<T, Args> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (...args: Args) => {
      setLoading(true);
      setError(null);
      try {
        const response = await asyncFunction(...args);
        setData(response);
        setLoading(false);
        return response;
      } catch (err: any) {
        const errorObj = err instanceof Error ? err : new Error(err.message || "Something went wrong");
        setError(errorObj);
        setLoading(false);
        throw errorObj;
      }
    },
    [asyncFunction]
  );

  return { data, loading, error, execute };
}
