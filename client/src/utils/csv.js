import { getLang, t } from '../i18n';
import { daysInMonth, elapsedDays, isoDate, isoMonth, weekday, weekdayNameLong } from './date';
import { activeHabits, entryAmount, habitStats, isDone, isMeasurable, isScheduled } from './progress';

/** Excel uses the regional list separator: ';' for Russian locales, ',' otherwise. */
export const csvSeparator = (lang = getLang()) => (lang === 'ru' ? ';' : ',');

function cell(value, sep) {
  if (value === null || value === undefined) return '';
  let s = String(value);
  // Neutralize spreadsheet formulas in user-provided text (CSV injection).
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (s.includes(sep) || /["\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(rows, sep = ',') {
  return rows.map((r) => r.map((v) => cell(v, sep)).join(sep)).join('\r\n') + '\r\n';
}

function monthHabits(m) {
  const p = m && m.payload && typeof m.payload === 'object' ? m.payload : null;
  if (!p) return { habits: [], data: {} };
  const habits = activeHabits(
    (Array.isArray(p.habits) ? p.habits : []).filter((h) => h && h.id != null && typeof h.name === 'string')
  );
  const data = p.data && typeof p.data === 'object' ? p.data : {};
  return { habits, data };
}

const sortMonths = (months) =>
  [...(months || [])].filter(Boolean).sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month));

/**
 * Rows: date, weekday, habit, scheduled (yes/no), done (0/1), amount (measurable
 * habits only) — days up to today only.
 */
export function dailyRows(months, now = new Date()) {
  const rows = [[t.csvDate, t.csvWeekday, t.csvHabit, t.csvScheduled, t.csvDone, t.csvAmount]];
  sortMonths(months).forEach((m) => {
    const { habits, data } = monthHabits(m);
    const last = Math.min(elapsedDays(m.year, m.month, now), daysInMonth(m.year, m.month));
    for (let d = 1; d <= last; d++) {
      const date = isoDate(m.year, m.month, d);
      const wd = weekdayNameLong(weekday(m.year, m.month, d));
      habits.forEach((h) => {
        rows.push([
          date,
          wd,
          h.name,
          isScheduled(h, m.year, m.month, d) ? t.csvYes : t.csvNo,
          isDone(h, data[h.id]?.[d]) ? 1 : 0,
          isMeasurable(h) ? entryAmount(data[h.id]?.[d]) : '',
        ]);
      });
    }
  });
  return rows;
}

/** Rows: habit, month, done, scheduled, percent, target — one per habit per month. */
export function summaryRows(months, now = new Date()) {
  const rows = [[t.csvHabit, t.csvMonth, t.csvDone, t.csvScheduled, t.csvPercent, t.csvTarget]];
  sortMonths(months).forEach((m) => {
    if (elapsedDays(m.year, m.month, now) === 0) return;
    const { habits, data } = monthHabits(m);
    habits.forEach((h) => {
      const s = habitStats(data[h.id], m.year, m.month, now, h);
      rows.push([h.name, isoMonth(m.year, m.month), s.done, s.eligible, s.percent ?? '', s.target ?? '']);
    });
  });
  return rows;
}

export const csvFilename = (kind, year, month) =>
  kind === 'month'
    ? `habits-${isoMonth(year, month)}.csv`
    : kind === 'summary'
    ? `habits-summary-${year}.csv`
    : `habits-${year}.csv`;

/** UTF-8 with BOM so Excel detects the encoding (Cyrillic names). */
export function csvBlobText(rows, sep) {
  return `﻿${toCsv(rows, sep)}`;
}

export function downloadCsv(filename, rows, sep = csvSeparator()) {
  const blob = new Blob([csvBlobText(rows, sep)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
