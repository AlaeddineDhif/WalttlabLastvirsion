import { useCallback, useEffect, useState } from 'react';
import { findNav, getDefaultView } from '../lib/nav';
import { DEFAULT_MODE } from '../lib/modes';

function readHash(mode) {
  const raw = window.location.hash.replace(/^#\/?/, '');
  return findNav(raw, mode) ? raw : getDefaultView(mode);
}

/**
 * Hash router scoped to the active mode. Because the hash only stores a view id,
 * a mode switch invalidates the current route and this hook falls back to the
 * first module of the newly selected mode.
 */
export default function useActiveView(mode = DEFAULT_MODE) {
  const [view, setViewState] = useState(() => readHash(mode));

  useEffect(() => {
    const onHashChange = () => setViewState(readHash(mode));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [mode]);

  useEffect(() => {
    if (findNav(view, mode)) return;
    const fallback = getDefaultView(mode);
    if (!fallback) return;
    window.location.hash = `/${fallback}`;
    setViewState(fallback);
  }, [view, mode]);

  const setView = useCallback(
    (next) => {
      if (!findNav(next, mode)) return;
      if (window.location.hash.replace(/^#\/?/, '') === next) {
        setViewState(next);
        return;
      }
      window.location.hash = `/${next}`;
      setViewState(next);
    },
    [mode]
  );

  return [view, setView];
}
