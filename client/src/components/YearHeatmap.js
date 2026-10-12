import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { FiAlertTriangle, FiChevronLeft, FiChevronRight, FiDownload, FiRefreshCw } from 'react-icons/fi';
import { formatNumber, formatPercent, t } from '../i18n';
import {
  daysInMonth,
  formatFullDate,
  formatMonthName,
  formatMonthShort,
  WEEK_ORDER,
  WEEK_STARTS_ON,
  weekdayNameShort,
} from '../utils/date';
import { activeHabits, dayCompletion, overallStats } from '../utils/progress';

/** Bins: 0 = nothing done, 1 = < 1/3, 2 = < 2/3, 3 = < 100%, 4 = perfect day. */
export function heatLevel(done, total) {
  if (!total) return null;
  if (done <= 0) return 0;
  if (done >= total) return 4;
  const r = done / total;
  return r < 1 / 3 ? 1 : r < 2 / 3 ? 2 : 3;
}

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Every day of `year` with its completion, laid out in Monday-first week columns. */
export function buildYearCells(year, months, now) {
  const byMonth = new Map();
  months.forEach((m) => {
    const p = m.payload || {};
    byMonth.set(m.month, {
      habits: activeHabits(Array.isArray(p.habits) ? p.habits.filter((h) => h && typeof h.name === 'string') : []),
      data: p.data && typeof p.data === 'object' ? p.data : {},
    });
  });
  const today = startOfDay(now).getTime();
  const jan1 = new Date(year, 0, 1);
  const offset = (jan1.getDay() - WEEK_STARTS_ON + 7) % 7;
  const cells = [];
  let index = 0;
  for (let month = 0; month < 12; month++) {
    const m = byMonth.get(month);
    const n = daysInMonth(year, month);
    for (let day = 1; day <= n; day++) {
      const date = new Date(year, month, day);
      const future = date.getTime() > today;
      const c = m && !future ? dayCompletion(m.habits, m.data, year, month, day) : { done: 0, total: 0 };
      const slot = index + offset;
      cells.push({
        index,
        month,
        day,
        col: Math.floor(slot / 7),
        row: slot % 7,
        future,
        hasData: !!m && !future,
        done: c.done,
        total: c.total,
        level: m && !future ? heatLevel(c.done, c.total) : null,
      });
      index++;
    }
  }
  const cols = Math.floor((index - 1 + offset) / 7) + 1;
  return { cells, cols, byMonth };
}

function summarize(cells) {
  let active = 0;
  let perfect = 0;
  let sum = 0;
  let counted = 0;
  cells.forEach((c) => {
    if (!c.hasData || !c.total) return;
    counted++;
    sum += c.done / c.total;
    if (c.done > 0) active++;
    if (c.done >= c.total) perfect++;
  });
  return { active, perfect, average: counted ? Math.round((sum / counted) * 100) : null };
}

export function YearHeatmap({
  year,
  months,
  status,
  error,
  now,
  onReload,
  onYear,
  onPickDay,
  onPickMonth,
  onExport,
  exporting,
}) {
  const { cells, cols, byMonth } = useMemo(() => buildYearCells(year, months, now), [year, months, now]);
  const summary = useMemo(() => summarize(cells), [cells]);
  const isThisYear = year === now.getFullYear();
  const defaultIndex = isThisYear
    ? cells.findIndex((c) => c.month === now.getMonth() && c.day === now.getDate())
    : 0;
  const [focusIdx, setFocusIdx] = useState(Math.max(0, defaultIndex));
  const [hover, setHover] = useState(null);
  const scrollRef = useRef(null);
  const gridRef = useRef(null);
  const fi = Math.min(focusIdx, cells.length - 1);

  // Show the most recent weeks first on narrow screens.
  useLayoutEffect(() => {
    const box = scrollRef.current;
    if (!box) return;
    if (!isThisYear) {
      box.scrollLeft = 0;
      return;
    }
    const cell = gridRef.current?.querySelector(`[data-i="${Math.max(0, defaultIndex)}"]`);
    if (cell) box.scrollLeft = Math.max(0, cell.offsetLeft - box.clientWidth + 80);
  }, [year, isThisYear, defaultIndex, status]);

  const monthStats = useMemo(
    () =>
      Array.from({ length: 12 }, (_, month) => {
        const m = byMonth.get(month);
        if (!m) return null;
        return overallStats(m.habits, m.data, year, month, now).percent;
      }),
    [byMonth, year, now]
  );

  const label = (c) => {
    const date = formatFullDate(year, c.month, c.day);
    if (c.future) return `${date}: ${t.future}`;
    if (!c.hasData) return `${date}: ${t.yearNoData}`;
    return t.yearCell(date, c.done, c.total);
  };

  const focusCell = (i) => {
    const n = Math.max(0, Math.min(cells.length - 1, i));
    setFocusIdx(n);
    const el = gridRef.current?.querySelector(`[data-i="${n}"]`);
    el?.focus();
  };

  const onKeyDown = (e) => {
    const i = Number(e.target.dataset?.i);
    if (Number.isNaN(i) || e.target.dataset?.i === undefined) return;
    const map = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7, Home: -i, End: cells.length - 1 - i };
    if (!(e.key in map)) return;
    e.preventDefault();
    focusCell(i + map[e.key]);
  };

  const showTip = (c, el) => {
    if (!el) return;
    const below = c.row < 3; // the scroll box would clip a tooltip above the first rows
    setHover({
      c,
      x: el.offsetLeft + el.offsetWidth / 2,
      y: el.offsetTop + (below ? el.offsetHeight : 0),
      edge: c.col < 5 ? 'left' : c.col > cols - 6 ? 'right' : 'mid',
      below,
    });
  };

  const firstCols = Array.from({ length: 12 }, (_, m) => cells.find((c) => c.month === m && c.day === 1).col);
  const loading = status === 'loading' && !months.length;

  return (
    <section className="card year-card" aria-labelledby="year-title">
      <div className="card-head">
        <div>
          <h2 className="card-title" id="year-title">
            {t.yearTitle(year)}
          </h2>
        </div>
        <div className="year-nav">
          <button type="button" className="icon-btn" onClick={() => onYear(-1)} aria-label={t.prevYear}>
            <FiChevronLeft aria-hidden="true" />
          </button>
          <span className="year-label" aria-live="polite">
            {year}
          </span>
          <button
            type="button"
            className="icon-btn"
            onClick={() => onYear(1)}
            aria-label={t.nextYear}
            disabled={year >= now.getFullYear()}
          >
            <FiChevronRight aria-hidden="true" />
          </button>
        </div>
      </div>

      <p className="card-subtitle year-subtitle">{t.yearSubtitle}</p>

      {status === 'error' ? (
        <div className="inline-error" role="alert">
          <FiAlertTriangle aria-hidden="true" />
          <span>
            {t.yearLoadFailed} <span className="muted small">{error}</span>
          </span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onReload}>
            <FiRefreshCw aria-hidden="true" /> {t.retry}
          </button>
        </div>
      ) : null}

      <div className="year-summary">
        <div>
          <span className="year-sum-label">{t.yearActiveDays}</span>
          <span className="year-sum-value">{loading ? t.dash : formatNumber(summary.active)}</span>
        </div>
        <div>
          <span className="year-sum-label">{t.yearPerfectDays}</span>
          <span className="year-sum-value">{loading ? t.dash : formatNumber(summary.perfect)}</span>
        </div>
        <div>
          <span className="year-sum-label">{t.yearAverage}</span>
          <span className="year-sum-value">
            {loading || summary.average === null ? t.dash : formatPercent(summary.average)}
          </span>
        </div>
      </div>

      <div className={`heatmap-scroll${loading ? ' is-loading' : ''}`} ref={scrollRef} aria-busy={loading}>
        <div className="heatmap" style={{ '--cols': cols }}>
          <div className="hm-months" aria-hidden="true">
            {firstCols.map((col, m) => (
              <span key={m} style={{ gridColumn: `${col + 1} / span 4` }}>
                {formatMonthShort(year, m)}
              </span>
            ))}
          </div>
          <div className="hm-weekdays" aria-hidden="true">
            {WEEK_ORDER.map((wd, i) => (
              <span key={wd} style={{ gridRow: i + 1 }}>
                {i % 2 === 0 ? weekdayNameShort(wd) : ''}
              </span>
            ))}
          </div>
          <div
            className="hm-grid"
            ref={gridRef}
            role="group"
            aria-label={t.yearTitle(year)}
            onKeyDown={onKeyDown}
            onPointerLeave={() => setHover(null)}
          >
            {cells.map((c) => {
              const lvl = c.level === null ? 'none' : c.level;
              return (
                <button
                  key={c.index}
                  type="button"
                  data-i={c.index}
                  className={`hm-cell lvl-${lvl}${c.future ? ' is-future' : ''}${
                    isThisYear && c.month === now.getMonth() && c.day === now.getDate() ? ' is-today' : ''
                  }`}
                  style={{ gridColumn: c.col + 1, gridRow: c.row + 1 }}
                  tabIndex={c.index === fi ? 0 : -1}
                  aria-label={label(c)}
                  onPointerEnter={(e) => showTip(c, e.currentTarget)}
                  onFocus={(e) => {
                    setFocusIdx(c.index);
                    showTip(c, e.currentTarget);
                  }}
                  onBlur={() => setHover(null)}
                  onClick={() => onPickDay(year, c.month, c.day)}
                />
              );
            })}
            {hover ? (
              <div
                className={`hm-tip is-${hover.edge}${hover.below ? ' is-below' : ''}`}
                style={{ left: hover.x, top: hover.y }}
                role="presentation"
                aria-hidden="true"
              >
                {label(hover.c)}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="hm-foot">
        <div className="hm-legend" aria-hidden="true">
          <span className="muted small">{t.less}</span>
          {[0, 1, 2, 3, 4].map((l) => (
            <span key={l} className={`hm-swatch lvl-${l}`} />
          ))}
          <span className="muted small">{t.more}</span>
          <span className="hm-swatch lvl-none" />
          <span className="muted small">{t.yearNoData}</span>
        </div>
        <div className="hm-export">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onExport('year')} disabled={!!exporting}>
            <FiDownload aria-hidden="true" /> {t.exportYear(year)}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onExport('summary')}
            disabled={!!exporting}
          >
            <FiDownload aria-hidden="true" /> {t.exportSummary(year)}
          </button>
        </div>
      </div>

      <h3 className="sr-only">{t.yearMonths}</h3>
      <ul className="year-months">
        {monthStats.map((pct, m) => (
          <li key={m}>
            <button
              type="button"
              className="month-chip"
              onClick={() => onPickMonth(year, m)}
              aria-label={`${t.yearOpenMonth(formatMonthName(year, m))}${pct === null || pct === undefined ? '' : `, ${formatPercent(pct)}`}`}
              disabled={year === now.getFullYear() && m > now.getMonth()}
            >
              <span className="month-chip-name">{formatMonthShort(year, m)}</span>
              <span className="month-chip-pct">{pct === null || pct === undefined ? t.dash : formatPercent(pct)}</span>
              <span className="month-chip-bar" aria-hidden="true">
                <span style={{ width: `${pct || 0}%` }} />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
