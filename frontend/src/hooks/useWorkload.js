import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

/** Virtual plant state: topology, load profile and the live departmental split. */
export default function useWorkload(refreshMs = 3000) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch('/api/workload');
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
