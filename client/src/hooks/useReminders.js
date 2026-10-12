import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGetMonth } from '../api';
import { t } from '../i18n';
import { isoDate } from '../utils/date';
import { showNotification } from '../utils/notify';
import { activeHabits, isScheduled } from '../utils/progress';

const CHECK_MS = 30 * 1000;
const LATE_WINDOW_MS = 60 * 60 * 1000; // fire up to 1h late (sleeping tab, throttled timers)

function minutesOf(hhmm) {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm || '');
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** Reminders due right now: scheduled today, not done, time passed within the window. */
export function dueReminders(habits, data, now, fired) {
  const y = now.getFullYear();
  const mo = now.getMonth();
  const d = now.getDate();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return activeHabits(habits).filter((h) => {
    const at = minutesOf(h.reminder);
    if (at === null || at > nowMin) return false;
    if ((nowMin - at) * 60000 > LATE_WINDOW_MS) return false;
    if (!isScheduled(h, y, mo, d) || data?.[h.id]?.[d]) return false;
    return !fired.has(`${isoDate(y, mo, d)}|${h.id}|${h.reminder}`);
  });
}

/**
 * Client-side reminders. Only works while the page is open (a background tab
 * is fine; timers there may run up to a minute late). No server push.
 *
 * `live` is the current month's { habits, data } when that month is loaded in
 * the UI; otherwise the current month is fetched read-only (never saved).
 */
export function useReminders({ token, live, onReminder }) {
  const [fetched, setFetched] = useState(null);
  const liveRef = useRef(live);
  const fetchedRef = useRef(fetched);
  const firedRef = useRef(new Set());
  const onRef = useRef(onReminder);
  liveRef.current = live;
  fetchedRef.current = fetched;
  onRef.current = onReminder;

  const refetch = useCallback(
    (signal) => {
      if (!token) return Promise.resolve(null);
      const n = new Date();
      return apiGetMonth(n.getFullYear(), n.getMonth(), token, signal)
        .then((res) => {
          const p = res?.payload;
          const next = {
            key: `${n.getFullYear()}-${n.getMonth()}`,
            habits: Array.isArray(p?.habits) ? p.habits.filter((h) => h && typeof h.name === 'string') : [],
            data: p?.data && typeof p.data === 'object' ? p.data : {},
          };
          setFetched(next);
          return next;
        })
        .catch(() => null);
    },
    [token]
  );

  // When the current month isn't on screen, keep a read-only copy for scheduling.
  const needFetch = !!token && !live;
  useEffect(() => {
    if (!needFetch) return undefined;
    const ctrl = new AbortController();
    refetch(ctrl.signal);
    return () => ctrl.abort();
  }, [needFetch, refetch]);

  useEffect(() => {
    if (!token) return undefined;
    let busy = false;
    const check = async () => {
      if (busy) return;
      const now = new Date();
      const key = `${now.getFullYear()}-${now.getMonth()}`;
      let src = liveRef.current || fetchedRef.current;
      if (!src || (src.key && src.key !== key)) return;
      const hasAny = activeHabits(src.habits).some((h) => h.reminder);
      if (!hasAny) return;
      let due = dueReminders(src.habits, src.data, now, firedRef.current);
      if (!due.length) return;
      if (!liveRef.current) {
        // Re-check against the server copy: it may have been marked elsewhere.
        busy = true;
        src = (await refetch()) || src;
        busy = false;
        due = dueReminders(src.habits, src.data, now, firedRef.current);
      }
      due.forEach((h) => {
        firedRef.current.add(`${isoDate(now.getFullYear(), now.getMonth(), now.getDate())}|${h.id}|${h.reminder}`);
        showNotification(t.reminderTitle(h.name), { body: t.reminderBody, tag: `habit-${h.id}` });
        onRef.current?.(h);
      });
    };
    const id = setInterval(check, CHECK_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);
    check();
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [token, refetch]);
}
