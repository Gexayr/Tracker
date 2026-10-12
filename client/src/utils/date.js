import { LOCALE } from '../i18n';

// Monday-first weeks (ISO). Change to 0 for Sunday-first.
export const WEEK_STARTS_ON = 1;

export const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

export const monthKey = (year, month) => `${year}-${month}`;

export function todayParts(now = new Date()) {
  return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
}

/** -1 = past month, 0 = current month, 1 = future month (relative to `now`). */
export function monthRelation(year, month, now = new Date()) {
  const a = year * 12 + month;
  const b = now.getFullYear() * 12 + now.getMonth();
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Number of days of the month that have started (today counts). */
export function elapsedDays(year, month, now = new Date()) {
  const rel = monthRelation(year, month, now);
  if (rel < 0) return daysInMonth(year, month);
  if (rel > 0) return 0;
  return now.getDate();
}

export function shiftMonth(year, month, delta) {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

export const weekday = (year, month, day) => new Date(year, month, day).getDay();
export const isWeekend = (year, month, day) => {
  const w = weekday(year, month, day);
  return w === 0 || w === 6;
};
export const isWeekStart = (year, month, day) => weekday(year, month, day) === WEEK_STARTS_ON;

const fmtCache = new Map();
function fmt(options) {
  const k = JSON.stringify(options);
  if (!fmtCache.has(k)) fmtCache.set(k, new Intl.DateTimeFormat(LOCALE, options));
  return fmtCache.get(k);
}

export const formatMonthYear = (year, month) =>
  fmt({ month: 'long', year: 'numeric' }).format(new Date(year, month, 1));
export const formatMonthName = (year, month) =>
  fmt({ month: 'long' }).format(new Date(year, month, 1));
export const formatDayMonth = (year, month, day) =>
  fmt({ day: 'numeric', month: 'long' }).format(new Date(year, month, day));
export const formatWeekdayShort = (year, month, day) =>
  fmt({ weekday: 'short' }).format(new Date(year, month, day));
export const weekdayInitial = (year, month, day) =>
  fmt({ weekday: 'narrow' }).format(new Date(year, month, day));
