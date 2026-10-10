import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

/**
 * Annual billing history + subscription optimisation from the backend
 * EnergyHistory store. Refreshed on a slow cadence because the figures only
 * change once per simulated interval.
 */
export default function useAuditHistory(refreshMs = 15000) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch('/api/audit/history');
      if (res.ok) setData(await res.json());
    } catch {
      /* keep last snapshot */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, refreshMs);
    return () => clearInterval(timer);
  }, [load, refreshMs]);

  return { data, loading, reload: load };
}
