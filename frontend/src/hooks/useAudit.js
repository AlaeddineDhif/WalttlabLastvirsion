import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

export default function useAudit() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch('/api/audit');
      if (res.ok) setData(await res.json());
    } catch {
      /* keep last snapshot */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 4000);
    return () => clearInterval(timer);
  }, [load]);

  const setSubscription = useCallback(
    async (contractedPower) => {
      setBusy(true);
      try {
        const res = await apiFetch('/api/audit/subscription', {
          method: 'POST',
          body: JSON.stringify({ contractedPower: Number(contractedPower) })
        });
        if (res.ok) setData(await res.json());
      } finally {
        setBusy(false);
      }
    },
    []
  );

  const resetPeak = useCallback(async () => {
    try {
      await apiFetch('/api/audit/reset', { method: 'POST' });
      await load();
    } catch {
      /* ignore */
    }
  }, [load]);

  return { data, loading, busy, setSubscription, resetPeak };
}