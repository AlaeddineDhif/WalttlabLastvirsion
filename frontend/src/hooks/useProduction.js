import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

export default function useProduction() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch('/api/production');
      if (res.ok) setData(await res.json());
    } catch {
      /* keep snapshot */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 6000);
    return () => clearInterval(timer);
  }, [load]);

  const run = useCallback(
    async (path, body) => {
      setBusy(true);
      setActionError(null);
      try {
        const res = await apiFetch(path, { method: 'POST', body: JSON.stringify(body) });
        const parsed = await res.json().catch(() => ({}));
        if (!res.ok) {
          setActionError(parsed.error || 'Action failed');
          return false;
        }
        await load();
        return true;
      } catch (err) {
        setActionError(err.message || 'Action failed');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [load]
  );

  const startBatch = useCallback((label) => run('/api/production/start', { label }), [run]);
  const completeBatch = useCallback((units, energyKwh) => run('/api/production/complete', { units, energyKwh }), [run]);
  const addRecord = useCallback((label, units, energyKwh) => run('/api/production/record', { label, units, energyKwh }), [run]);

  return { data, loading, busy, actionError, startBatch, completeBatch, addRecord };
}