import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGetMonth, apiPutMonth } from '../api';
import { t } from '../i18n';
import { DEFAULT_HABITS, nextHabitColor } from '../utils/color';
import { monthKey } from '../utils/date';
import { normalizeDays, normalizeTarget } from '../utils/progress';

const SAVE_DEBOUNCE_MS = 500;
const CHART_TYPES = ['line', 'bar', 'radar'];
export const MAX_HABIT_NAME = 100;
export const MAX_HABITS = 50;
const REMINDER_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Keeps only the fields the server accepts, in their valid form. Defaults are
 * omitted: no `days` = every day, no `target` = % of scheduled days.
 */
export function cleanHabit(h) {
  const out = { id: h.id, name: h.name };
  if (h.color !== undefined) out.color = h.color;
  const days = normalizeDays(h.days);
  if (days) out.days = days;
  const target = normalizeTarget(h.target);
  if (target !== null) out.target = target;
  if (typeof h.reminder === 'string' && REMINDER_RE.test(h.reminder)) out.reminder = h.reminder;
  if (h.archived === true) out.archived = true;
  return out;
}

function defaultHabits() {
  const names = Array.isArray(t.defaultHabits) ? t.defaultHabits : [];
  return DEFAULT_HABITS.map((h, i) => ({ ...h, name: names[i] || h.name }));
}

const EMPTY = { key: null, status: 'idle', habits: [], data: {}, chartType: 'line', error: null };

function sanitizePayload(payload) {
  const habits = Array.isArray(payload.habits)
    ? payload.habits
        .filter((h) => h && h.id !== undefined && h.id !== null && typeof h.name === 'string')
        .map(cleanHabit)
    : [];
  const data = payload.data && typeof payload.data === 'object' ? payload.data : {};
  const chartType = CHART_TYPES.includes(payload.chartType) ? payload.chartType : 'line';
  return { habits, data, chartType };
}

const toPayload = (s) => ({ habits: s.habits, data: s.data, chartType: s.chartType });

/**
 * Loads and saves one month of habit data.
 *
 * Invariants that prevent data loss:
 *  - Nothing is saved for a month until that month was successfully loaded
 *    (edits are only accepted while status === 'ready').
 *  - Every pending save carries its own year/month/token snapshot, so switching
 *    months can never write one month's data into another.
 *  - A failed load shows an error; defaults are never written over server data.
 *  - Saves are debounced, serialized (in order), and flushed on month change,
 *    logout, page hide and unmount.
 *  - Stale GET responses are aborted/ignored.
 */
export function useMonthData({ token, year, month, onUnauthorized }) {
  const key = monthKey(year, month);
  const [state, setState] = useState(EMPTY);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | pending | saving | saved | error
  const [reloadNonce, setReloadNonce] = useState(0);

  const stateRef = useRef(EMPTY);
  const tokenRef = useRef(token);
  const pendingRef = useRef(new Map()); // monthKey -> { key, year, month, payload, token }
  const timerRef = useRef(null);
  const chainRef = useRef(Promise.resolve());
  const inFlightRef = useRef(0);
  const reqIdRef = useRef(0);
  const seedRef = useRef(null); // habits of the previously viewed month
  const onUnauthRef = useRef(onUnauthorized);

  tokenRef.current = token;
  onUnauthRef.current = onUnauthorized;

  const commit = useCallback((next) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const flush = useCallback(({ keepalive = false } = {}) => {
    clearTimeout(timerRef.current);
    timerRef.current = null;
    const entries = Array.from(pendingRef.current.values());
    pendingRef.current.clear();
    if (!entries.length) return Promise.resolve();
    setSaveStatus('saving');

    const jobs = entries.map((p) => {
      inFlightRef.current += 1;
      const job = chainRef.current.then(() =>
        apiPutMonth(p.year, p.month, p.payload, p.token, { keepalive })
      );
      chainRef.current = job.catch(() => {});
      return job.then(
        () => ({ ok: true }),
        (err) => {
          if (err?.status === 401) {
            onUnauthRef.current?.();
            return { ok: false, auth: true };
          }
          // Keep it for a retry unless a newer edit of the same month is queued.
          if (!pendingRef.current.has(p.key)) pendingRef.current.set(p.key, p);
          return { ok: false };
        }
      ).finally(() => {
        inFlightRef.current -= 1;
      });
    });

    return Promise.all(jobs).then((results) => {
      if (inFlightRef.current > 0 || timerRef.current) return;
      if (results.some((r) => r.auth)) setSaveStatus('idle');
      else if (pendingRef.current.size) setSaveStatus('error');
      else setSaveStatus('saved');
    });
  }, []);

  const scheduleSave = useCallback(
    (snapshot, { immediate = false } = {}) => {
      if (!snapshot.key || !tokenRef.current) return;
      const [y, m] = snapshot.key.split('-').map(Number);
      pendingRef.current.set(snapshot.key, {
        key: snapshot.key,
        year: y,
        month: m,
        payload: toPayload(snapshot),
        token: tokenRef.current,
      });
      setSaveStatus('pending');
      clearTimeout(timerRef.current);
      if (immediate) {
        timerRef.current = null;
        flush();
      } else {
        timerRef.current = setTimeout(() => flush(), SAVE_DEBOUNCE_MS);
      }
    },
    [flush]
  );

  // Load the month whenever the key/token changes.
  useEffect(() => {
    if (!token) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      pendingRef.current.clear();
      seedRef.current = null;
      setSaveStatus('idle');
      commit(EMPTY);
      return undefined;
    }

    flush(); // previous month's edits go out now, with their own key

    const prev = stateRef.current;
    if (prev.status === 'ready' && prev.key !== key) {
      seedRef.current = { habits: prev.habits, chartType: prev.chartType };
    }

    const ctrl = new AbortController();
    const reqId = ++reqIdRef.current;
    commit({ ...EMPTY, key, status: 'loading', chartType: prev.chartType || 'line' });

    apiGetMonth(year, month, token, ctrl.signal)
      .then((res) => {
        if (ctrl.signal.aborted || reqId !== reqIdRef.current) return;
        const payload = res?.payload;
        if (payload && typeof payload === 'object') {
          commit({ key, status: 'ready', error: null, ...sanitizePayload(payload) });
          return;
        }
        // No data for this month yet: start from the previously viewed month's
        // habits (without completions) or the defaults, and save that.
        const seed = seedRef.current;
        const habits = (seed && seed.habits.length ? seed.habits : defaultHabits()).map((h) => ({ ...h }));
        const next = {
          key,
          status: 'ready',
          error: null,
          habits,
          data: Object.fromEntries(habits.map((h) => [h.id, {}])),
          chartType: seed?.chartType || 'line',
        };
        commit(next);
        scheduleSave(next, { immediate: true });
      })
      .catch((err) => {
        if (err?.name === 'AbortError' || reqId !== reqIdRef.current) return;
        if (err?.status === 401) {
          onUnauthRef.current?.();
          return;
        }
        commit({ ...EMPTY, key, status: 'error', error: err?.message || 'Error' });
      });

    return () => ctrl.abort();
  }, [token, year, month, key, reloadNonce, commit, flush, scheduleSave]);

  // Flush pending saves when the page is hidden/closed and on unmount.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush({ keepalive: true });
    };
    const onPageHide = () => flush({ keepalive: true });
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('beforeunload', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('beforeunload', onPageHide);
      flush({ keepalive: true });
    };
  }, [flush]);

  /** Apply an immutable update to the loaded month; ignored unless loaded. */
  const update = useCallback(
    (fn) => {
      const cur = stateRef.current;
      if (cur.status !== 'ready') return false;
      const patch = fn(cur);
      if (!patch) return false;
      const next = { ...cur, ...patch };
      commit(next);
      scheduleSave(next);
      return true;
    },
    [commit, scheduleSave]
  );

  const toggleDay = useCallback(
    (habitId, day) =>
      update((s) => {
        const entries = { ...(s.data[habitId] || {}) };
        if (entries[day]) delete entries[day];
        else entries[day] = true;
        return { data: { ...s.data, [habitId]: entries } };
      }),
    [update]
  );

  /** extra: { color?, days?, target?, reminder? } */
  const addHabit = useCallback(
    (name, extra = {}) =>
      update((s) => {
        if (s.habits.length >= MAX_HABITS) return null;
        const ids = s.habits.map((h) => (typeof h.id === 'number' ? h.id + 1 : 0));
        const id = Math.max(Date.now(), ...ids);
        const habit = cleanHabit({ ...extra, id, name, color: extra.color || nextHabitColor(s.habits) });
        return { habits: [...s.habits, habit], data: { ...s.data, [id]: {} } };
      }),
    [update]
  );

  /** `changes` may set a field to null/undefined to reset it to the default. */
  const editHabit = useCallback(
    (id, changes) =>
      update((s) => ({
        habits: s.habits.map((h) => (h.id === id ? cleanHabit({ ...h, ...changes }) : h)),
      })),
    [update]
  );

  /** Moves a habit to `toIndex` among the non-archived habits (display order). */
  const moveHabit = useCallback(
    (id, toIndex) =>
      update((s) => {
        const active = s.habits.filter((h) => !h.archived);
        const from = active.findIndex((h) => h.id === id);
        const to = Math.max(0, Math.min(active.length - 1, toIndex));
        if (from < 0 || from === to) return null;
        const moved = [...active];
        const [item] = moved.splice(from, 1);
        moved.splice(to, 0, item);
        let i = 0;
        return { habits: s.habits.map((h) => (h.archived ? h : moved[i++])) };
      }),
    [update]
  );

  /** Removes a habit and returns what is needed to undo it. */
  const removeHabit = useCallback(
    (id) => {
      const cur = stateRef.current;
      const index = cur.habits.findIndex((h) => h.id === id);
      if (cur.status !== 'ready' || index < 0) return null;
      const removed = { key: cur.key, index, habit: cur.habits[index], entries: cur.data[id] };
      update((s) => {
        const { [id]: _omit, ...rest } = s.data;
        return { habits: s.habits.filter((h) => h.id !== id), data: rest };
      });
      return removed;
    },
    [update]
  );

  const restoreHabit = useCallback(
    (removed) =>
      update((s) => {
        if (!removed || s.key !== removed.key || s.habits.some((h) => h.id === removed.habit.id)) {
          return null;
        }
        const habits = [...s.habits];
        habits.splice(Math.min(removed.index, habits.length), 0, removed.habit);
        return { habits, data: { ...s.data, [removed.habit.id]: removed.entries || {} } };
      }),
    [update]
  );

  const setChartType = useCallback(
    (chartType) => update((s) => (s.chartType === chartType ? null : { chartType })),
    [update]
  );

  const reload = useCallback(() => setReloadNonce((n) => n + 1), []);
  const retrySave = useCallback(() => flush(), [flush]);

  return {
    ...state,
    saveStatus,
    toggleDay,
    addHabit,
    editHabit,
    moveHabit,
    removeHabit,
    restoreHabit,
    setChartType,
    reload,
    retrySave,
    flush,
  };
}
