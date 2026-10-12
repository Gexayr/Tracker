import { daysInMonth, elapsedDays, monthRelation } from './date';

/**
 * Single source of truth for progress numbers.
 *
 * - Current month: share of elapsed days (1..today) that were completed.
 * - Past month: share of all days of the month.
 * - Future month: `percent` is null (render as "—").
 *
 * Streaks only consider days up to today (or the whole month for past months).
 * `currentStreak` counts back from the last elapsed day; for the current month
 * an unchecked *today* does not break the streak yet (it is still in progress).
 */
export function habitStats(entries, year, month, now = new Date()) {
  const e = entries || {};
  const elapsed = elapsedDays(year, month, now);
  const isCurrent = monthRelation(year, month, now) === 0;

  let done = 0;
  let best = 0;
  let run = 0;
  for (let d = 1; d <= elapsed; d++) {
    if (e[d]) {
      done++;
      run++;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }

  let current = 0;
  let start = elapsed;
  if (isCurrent && start > 0 && !e[start]) start -= 1; // today still open
  for (let d = start; d >= 1 && e[d]; d--) current++;

  return {
    done,
    eligible: elapsed,
    percent: elapsed > 0 ? Math.round((done / elapsed) * 100) : null,
    currentStreak: current,
    bestStreak: best,
  };
}

/** Aggregate completion across habits with the same definition as habitStats. */
export function overallStats(habits, data, year, month, now = new Date()) {
  const elapsed = elapsedDays(year, month, now);
  if (!habits.length || elapsed === 0) return { done: 0, eligible: 0, percent: null };
  let done = 0;
  habits.forEach((h) => {
    const e = data[h.id] || {};
    for (let d = 1; d <= elapsed; d++) if (e[d]) done++;
  });
  const eligible = elapsed * habits.length;
  return { done, eligible, percent: Math.round((done / eligible) * 100) };
}

/** Percent of habits completed on each day; null for days not yet started. */
export function dailyCompletion(habits, data, year, month, now = new Date()) {
  const total = daysInMonth(year, month);
  const elapsed = elapsedDays(year, month, now);
  return Array.from({ length: total }, (_, i) => {
    const day = i + 1;
    if (day > elapsed || !habits.length) return null;
    const done = habits.reduce((n, h) => n + (data[h.id]?.[day] ? 1 : 0), 0);
    return Math.round((done / habits.length) * 100);
  });
}
