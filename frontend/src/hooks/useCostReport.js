import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

/** Scoped energy-cost report (units, kWh, DT per piece) from the production store. */
export default function useCostReport({ departmentId = null, workshopId = null, days = 90 } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const query = new URLSearchParams();
  if (departmentId) query.set('department', departmentId);
  if (workshopId) query.set('workshop', workshopId);
  if (days) query.set('days', String(days));
  const qs = query.toString();

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/production/cost${qs ? `?${qs}` : ''}`);
      if (res.ok) setData(await res.json());
    } catch {
      /* keep last snapshot */
    } finally {
      setLoading(false);
    }
  }, [qs]);

  useEffect(() => {
    setLoading(true);
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [load]);

  return { data, loading, reload: load };
}
