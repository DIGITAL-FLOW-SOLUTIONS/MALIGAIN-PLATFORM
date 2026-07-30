/**
 * useSpinBalance — fetches spin balance once and subscribes to SSE updates.
 * The SSE endpoint (`/api/spin/events`) pushes a new balance object
 * whenever the server processes a spin or deposit for the current user.
 */
import { useState, useEffect, useRef, useCallback } from "react";

export interface SpinBalance {
  spinBalance:  number;
  spinEarnings: number;
  spinCost:     number;
  currency:     string;
  canFreeSpin:  boolean;
  lastFreeAt:   string | null;
}

const EMPTY: SpinBalance = {
  spinBalance: 0, spinEarnings: 0, spinCost: 25,
  currency: "KES", canFreeSpin: true, lastFreeAt: null,
};

export function useSpinBalance() {
  const [data, setData]     = useState<SpinBalance>(EMPTY);
  const [loading, setLoading] = useState(true);
  const esRef = useRef<EventSource | null>(null);

  const fetchOnce = useCallback(async () => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/spin/balance`, {
        credentials: "include",
      });
      if (res.ok) {
        const json = await res.json() as SpinBalance;
        setData(json);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void fetchOnce();

    // Open SSE connection for real-time updates
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    const es   = new EventSource(`${base}/api/spin/events`, { withCredentials: true });
    esRef.current = es;

    es.onmessage = (evt) => {
      try {
        const payload = JSON.parse(evt.data as string) as SpinBalance;
        setData(payload);
        setLoading(false);
      } catch { /* ignore */ }
    };

    es.onerror = () => {
      es.close();
      esRef.current = null;
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [fetchOnce]);

  const refetch = useCallback(() => { void fetchOnce(); }, [fetchOnce]);

  return { ...data, loading, refetch };
}
