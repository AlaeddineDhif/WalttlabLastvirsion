import { useCallback, useState } from 'react';
import { DEFAULT_MODE, MODE_STORAGE_KEY, findMode } from '../lib/modes';

function readStoredMode() {
  try {
    const raw = localStorage.getItem(MODE_STORAGE_KEY);
    return findMode(raw) ? raw : DEFAULT_MODE;
  } catch {
    return DEFAULT_MODE;
  }
}

/** Global operational mode (live IoT vs historical analytics), persisted across reloads. */
export default function useMode() {
  const [mode, setModeState] = useState(readStoredMode);

  const setMode = useCallback((next) => {
    if (!findMode(next)) return;
    try {
      localStorage.setItem(MODE_STORAGE_KEY, next);
    } catch {
      /* storage unavailable */
    }
    setModeState((cur) => (cur === next ? cur : next));
  }, []);

  return [mode, setMode];
}
