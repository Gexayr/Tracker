import { daysInMonth, elapsedDays, monthRelation, weekday } from './date';

/**
 * Single source of truth for progress numbers.
 *
 * Only *scheduled* days count. A habit without `days` is scheduled every day;
 * otherwise `days` lists JS weekdays (0 = Sunday ... 6 = Saturday).
 *
 * - Current month: share of elapsed scheduled days (1..today) that were completed.
 * - Past month: share of all scheduled days of the month.
 * - Future month (or no scheduled day yet): `percent` is null (render as "—").
 *
 * Streaks only consider days up to today (or the whole month for past months)
 * and *skip* unscheduled days instead of breaking. `currentStreak` counts back
 * from the last elapsed scheduled day; for the current month an unchecked
 * *today* does not break the streak yet (it is still in progress).
 *
 * With a monthly `target`, goal progress is reported too (`target`,
 * `targetReached`, and `scheduledInMonth` for the bar scale).
 */

/** Valid `days` array or null (= every day). */
export function normalizeDays(days) {
  if (!Array.isArray(days)) return null;
  const set = new Set(days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6));
  if (!set.size || set.size === 7) return null;
  return Array.from(set).sort((a, b) => a - b);
}

export function normalizeTarget(target) {
  const n = typeof target === 'string' && target.trim() !== '' ? Number(target) : target;
  return Number.isInteger(n) && n >= 1 && n <= 31 ? n : null;
}

const scheduleCache = new WeakMap();
function scheduleSet(habit) {
  if (!habit || typeof habit !== 'object') return null;
  if (scheduleCache.has(habit)) return scheduleCache.get(habit);
  const days = normalizeDays(habit.days);
  const set = days ? new Set(days) : null;
  scheduleCache.set(habit, set);
  return set;
}

export function isScheduled(habit, year, month, day) {
  const set = scheduleSet(habit);
  return !set || set.has(weekday(year, month, day));
}

/** Habits shown in the current views (archived ones are hidden). */
export const activeHabits = (habits) => (habits || []).filter((h) => !h.archived);

export function habitStats(entries, year, month, now = new Date(), habit = null) {
  const e = entries || {};
  const elapsed = elapsedDays(year, month, now);
  const total = daysInMonth(year, month);
  const isCurrent = monthRelation(year, month, now) === 0;
  const on = (d) => isScheduled(habit, year, month, d);

  let done = 0;
  let eligible = 0;
  let best = 0;
  let run = 0;
  for (let d = 1; d <= elapsed; d++) {
    if (!on(d)) continue; // rest day: neither counts nor breaks
    eligible++;
    if (e[d]) {
      done++;
      run++;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }

  let current = 0;
  let d = elapsed;
  if (isCurrent && d > 0 && on(d) && !e[d]) d--; // today still open
  for (; d >= 1; d--) {
    if (!on(d)) continue;
    if (!e[d]) break;
    current++;
  }

  let scheduledInMonth = 0;
  for (let x = 1; x <= total; x++) if (on(x)) scheduledInMonth++;

  const target = normalizeTarget(habit?.target);
  return {
    done,
    eligible,
    percent: eligible > 0 ? Math.round((done / eligible) * 100) : null,
    currentStreak: current,
    bestStreak: best,
    scheduledInMonth,
    target,
    targetReached: target !== null && done >= target,
  };
}

/** One day across the given habits: { done, total } counting scheduled habits only. */
export function dayCompletion(habits, data, year, month, day) {
  let done = 0;
  let total = 0;
  habits.forEach((h) => {
    if (!isScheduled(h, year, month, day)) return;
    total++;
    if (data?.[h.id]?.[day]) done++;
  });
  return { done, total };
}

/** Aggregate completion across habits with the same definition as habitStats. */
export function overallStats(habits, data, year, month, now = new Date()) {
  const elapsed = elapsedDays(year, month, now);
  let done = 0;
  let eligible = 0;
  for (let d = 1; d <= elapsed; d++) {
    const c = dayCompletion(habits, data, year, month, d);
    done += c.done;
    eligible += c.total;
  }
  return { done, eligible, percent: eligible > 0 ? Math.round((done / eligible) * 100) : null };
}

/**
 * Percent of scheduled habits completed on each day; null for days not yet
 * started or with nothing scheduled.
 */
export function dailyCompletion(habits, data, year, month, now = new Date()) {
  const total = daysInMonth(year, month);
  const elapsed = elapsedDays(year, month, now);
  return Array.from({ length: total }, (_, i) => {
    const day = i + 1;
    if (day > elapsed) return null;
    const c = dayCompletion(habits, data, year, month, day);
    return c.total ? Math.round((c.done / c.total) * 100) : null;
  });
}
