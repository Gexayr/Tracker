import { useEffect, useState } from 'react';

export function useMediaQuery(query) {
  const get = () =>
    typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false;
  const [matches, setMatches] = useState(get);

  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const m = window.matchMedia(query);
    const onChange = () => setMatches(m.matches);
    onChange();
    m.addEventListener ? m.addEventListener('change', onChange) : m.addListener(onChange);
    return () => {
      m.removeEventListener ? m.removeEventListener('change', onChange) : m.removeListener(onChange);
    };
  }, [query]);

  return matches;
}

/** Re-renders when the calendar day changes (so "today" stays correct past midnight). */
export function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const next = new Date(now);
    next.setHours(24, 0, 1, 0);
    const id = setTimeout(() => setNow(new Date()), next.getTime() - now.getTime());
    const onVisible = () => {
      if (document.visibilityState === 'visible' && new Date().toDateString() !== now.toDateString()) {
        setNow(new Date());
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [now]);
  return now;
}
