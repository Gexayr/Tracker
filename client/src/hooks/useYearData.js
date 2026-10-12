import { useCallback, useEffect, useState } from 'react';
import { apiGetMonth, apiGetYear } from '../api';

function validMonths(list, year) {
  if (!Array.isArray(list)) return [];
  return list
    .filter(
      (m) =>
        m &&
        Number(m.year) === year &&
        Number.isInteger(Number(m.month)) &&
        Number(m.month) >= 0 &&
        Number(m.month) <= 11 &&
        m.payload &&
        typeof m.payload === 'object'
    )
    .map((m) => ({ year, month: Number(m.month), payload: m.payload }));
}

/**
 * Loads every stored month of a year (read-only). Uses GET /storage/year/:year
 * and falls back to 12 month requests when the endpoint is missing (404/405).
 */
export async function loadYear(year, token, signal) {
  try {
    return validMonths(await apiGetYear(year, token, signal), year);
  } catch (err) {
    if (err?.name === 'AbortError' || ![404, 405, 501].includes(err?.status)) throw err;
  }
  const res = await Promise.all(
    Array.from({ length: 12 }, (_, month) =>
      apiGetMonth(year, month, token, signal).then((r) => ({ year, month, payload: r?.payload }))
    )
  );
  return validMonths(res, year);
}

/** Replaces the stored copy of the month currently in memory (it may have unsaved edits). */
export function withLiveMonth(months, live) {
  if (!live) return months;
  const rest = months.filter((m) => !(m.year === live.year && m.month === live.month));
  return [...rest, live].sort((a, b) => a.month - b.month);
}

export function useYearData({ token, year, enabled, onUnauthorized }) {
  const [state, setState] = useState({ year: null, status: 'idle', months: [], error: null });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!enabled || !token) return undefined;
    const ctrl = new AbortController();
    setState((s) => ({ year, status: 'loading', months: s.year === year ? s.months : [], error: null }));
    loadYear(year, token, ctrl.signal)
      .then((months) => {
        if (!ctrl.signal.aborted) setState({ year, status: 'ready', months, error: null });
      })
      .catch((err) => {
        if (err?.name === 'AbortError' || ctrl.signal.aborted) return;
        if (err?.status === 401) {
          onUnauthorized?.();
          return;
        }
        setState({ year, status: 'error', months: [], error: err?.message || 'Error' });
      });
    return () => ctrl.abort();
  }, [enabled, token, year, nonce, onUnauthorized]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, reload };
}
