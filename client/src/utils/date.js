import { getLocale } from '../i18n';

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
  const locale = getLocale();
  const k = `${locale}|${JSON.stringify(options)}`;
  if (!fmtCache.has(k)) fmtCache.set(k, new Intl.DateTimeFormat(locale, options));
  return fmtCache.get(k);
}

const capitalize = (s) => (s ? s.charAt(0).toLocaleUpperCase(getLocale()) + s.slice(1) : s);

// Standalone month names ("Октябрь 2026", not the genitive "октября").
export const formatMonthYear = (year, month) => {
  const d = new Date(year, month, 1);
  const name = fmt({ month: 'long' }).format(d);
  return `${capitalize(name)} ${fmt({ year: 'numeric' }).format(d).replace(/\D+$/, '')}`;
};
export const formatMonthName = (year, month) =>
  capitalize(fmt({ month: 'long' }).format(new Date(year, month, 1)));
export const formatMonthShort = (year, month) =>
  capitalize(fmt({ month: 'short' }).format(new Date(year, month, 1)).replace(/\.$/, ''));
export const formatFullDate = (year, month, day) =>
  fmt({ weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(year, month, day));
export const formatDayMonth = (year, month, day) =>
  fmt({ day: 'numeric', month: 'long' }).format(new Date(year, month, day));
export const formatWeekdayShort = (year, month, day) =>
  fmt({ weekday: 'short' }).format(new Date(year, month, day));
// Russian narrow forms are ambiguous (С = среда/суббота), so use the two-letter short form.
export const weekdayInitial = (year, month, day) =>
  fmt({ weekday: getLocale().startsWith('ru') ? 'short' : 'narrow' }).format(new Date(year, month, day));

/** 0..6 (JS getDay) in display order: Monday first. */
export const WEEK_ORDER = Array.from({ length: 7 }, (_, i) => (i + WEEK_STARTS_ON) % 7);

// 2024-01-07 was a Sunday, so 2024-01-(7 + d) has getDay() === d.
export const weekdayNameShort = (wd) => capitalize(fmt({ weekday: 'short' }).format(new Date(2024, 0, 7 + wd)));
export const weekdayNameLong = (wd) => fmt({ weekday: 'long' }).format(new Date(2024, 0, 7 + wd));

const pad = (n) => String(n).padStart(2, '0');
export const isoDate = (year, month, day) => `${year}-${pad(month + 1)}-${pad(day)}`;
export const isoMonth = (year, month) => `${year}-${pad(month + 1)}`;
