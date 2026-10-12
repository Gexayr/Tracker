import { useCallback, useEffect, useState } from 'react';
import { safeStorage } from '../utils/storage';

const KEY = 'theme'; // must match the inline script in public/index.html
const ORDER = ['light', 'dark', 'system'];
const META_COLORS = { light: '#f5f5f2', dark: '#0f0f0e' };

const mql = () =>
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

function readPreference() {
  const v = safeStorage.get(KEY);
  return ORDER.includes(v) ? v : 'system';
}

export function useTheme() {
  const [preference, setPreference] = useState(readPreference);
  const [systemDark, setSystemDark] = useState(() => !!mql()?.matches);

  useEffect(() => {
    const m = mql();
    if (!m) return undefined;
    const onChange = (e) => setSystemDark(e.matches);
    m.addEventListener ? m.addEventListener('change', onChange) : m.addListener(onChange);
    return () => {
      m.removeEventListener ? m.removeEventListener('change', onChange) : m.removeListener(onChange);
    };
  }, []);

  const theme = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.style.colorScheme = theme;
    // Keep the browser UI color in sync when the user overrides the OS setting.
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
      m.setAttribute('content', META_COLORS[theme]);
    });
  }, [theme]);

  const cycle = useCallback(() => {
    setPreference((p) => {
      const next = ORDER[(ORDER.indexOf(p) + 1) % ORDER.length];
      safeStorage.set(KEY, next);
      return next;
    });
  }, []);

  return { preference, theme, cycle };
}
