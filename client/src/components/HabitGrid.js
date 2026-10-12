import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FiCheck, FiMenu } from 'react-icons/fi';
import { useReorder } from '../hooks/useReorder';
import { formatPercent, t } from '../i18n';
import { habitColor, textOn } from '../utils/color';
import {
  daysInMonth,
  elapsedDays,
  formatDayMonth,
  formatMonthYear,
  isWeekend,
  isWeekStart,
  monthRelation,
  weekdayInitial,
} from '../utils/date';
import { isScheduled } from '../utils/progress';

export function HabitGrid({ year, month, habits, data, stats, now, theme, onToggle, onEdit, onMove, onAnnounce }) {
  const total = daysInMonth(year, month);
  const elapsed = elapsedDays(year, month, now); // last toggleable day
  const rel = monthRelation(year, month, now);
  const todayDay = rel === 0 ? now.getDate() : null;
  const days = Array.from({ length: total }, (_, i) => i + 1);

  const scrollRef = useRef(null);
  const tableRef = useRef(null);
  const [focus, setFocus] = useState({ r: 0, c: Math.max(1, elapsed) });
  const reorder = useReorder({
    ids: habits.map((h) => h.id),
    onMove,
    onAnnounce,
    getScroller: () => scrollRef.current,
  });

  useEffect(() => {
    setFocus({ r: 0, c: Math.max(1, elapsedDays(year, month, new Date())) });
  }, [year, month]);

  // Bring today's column into view (centered) when the month is shown.
  const hasHabits = habits.length > 0;
  useLayoutEffect(() => {
    const box = scrollRef.current;
    if (!box) return;
    const th = box.querySelector('th.is-today');
    const corner = box.querySelector('th.corner');
    if (!th) {
      box.scrollLeft = 0;
      return;
    }
    const sticky = corner ? corner.getBoundingClientRect().width : 0;
    const boxRect = box.getBoundingClientRect();
    const thRect = th.getBoundingClientRect();
    const visible = boxRect.width - sticky;
    const offset = thRect.left - boxRect.left - sticky - (visible - thRect.width) / 2;
    box.scrollLeft = Math.max(0, box.scrollLeft + offset);
  }, [year, month, hasHabits, todayDay]);

  const moveFocus = (r, c) => {
    const rr = Math.max(0, Math.min(habits.length - 1, r));
    const cc = Math.max(1, Math.min(elapsed, c));
    setFocus({ r: rr, c: cc });
    const btn = tableRef.current?.querySelector(`button[data-r="${rr}"][data-c="${cc}"]`);
    btn?.focus();
  };

  const onKeyDown = (e) => {
    const r = Number(e.target.dataset?.r);
    const c = Number(e.target.dataset?.c);
    if (Number.isNaN(r) || Number.isNaN(c) || e.target.dataset?.r === undefined) return;
    const map = {
      ArrowLeft: [r, c - 1],
      ArrowRight: [r, c + 1],
      ArrowUp: [r - 1, c],
      ArrowDown: [r + 1, c],
      Home: [r, 1],
      End: [r, elapsed],
    };
    const next = map[e.key];
    if (!next) return;
    e.preventDefault();
    moveFocus(next[0], next[1]);
  };

  const monthName = formatMonthYear(year, month);
  const fr = Math.min(focus.r, habits.length - 1);
  const fc = Math.min(focus.c, Math.max(1, elapsed));

  return (
    <div className="grid-scroll" ref={scrollRef}>
      <table className="habit-grid" ref={tableRef} onKeyDown={onKeyDown}>
        <caption className="sr-only">{t.gridCaption(monthName)}</caption>
        <thead>
          <tr>
            <th scope="col" className="corner">
              {t.habit}
            </th>
            {days.map((d) => {
              const cls = [
                'day-head',
                isWeekend(year, month, d) && 'is-weekend',
                isWeekStart(year, month, d) && d !== 1 && 'is-week-start',
                d === todayDay && 'is-today',
                d > elapsed && 'is-future',
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <th key={d} scope="col" className={cls} aria-label={formatDayMonth(year, month, d)}>
                  <span className="day-num">{d}</span>
                  <span className="day-wd" aria-hidden="true">
                    {weekdayInitial(year, month, d)}
                  </span>
                </th>
              );
            })}
            <th scope="col" className="pct-head" title={t.monthPctLong}>
              <span aria-hidden="true">{t.monthPct}</span>
              <span className="sr-only">{t.monthPctLong}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {habits.map((h, r) => {
            const bg = habitColor(h.color, theme);
            const fg = textOn(bg);
            const s = stats[h.id];
            const entries = data[h.id] || {};
            const drag = reorder.itemProps(h.id);
            return (
              <tr key={h.id} ref={reorder.itemRef(h.id)} className={drag.className} style={drag.style}>
                <th scope="row" className="habit-cell">
                  <div className="habit-cell-inner">
                  <button
                    type="button"
                    className="drag-handle"
                    {...reorder.handleProps(h.id, t.dragHandle(h.name))}
                  >
                    <FiMenu aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="habit-name-btn"
                    onClick={() => onEdit(h)}
                    aria-label={t.editHabit(h.name)}
                    title={h.name}
                  >
                    <span className="dot" style={{ background: bg }} aria-hidden="true" />
                    <span className="habit-name-text">{h.name}</span>
                  </button>
                  </div>
                </th>
                {days.map((d) => {
                  const done = !!entries[d];
                  const future = d > elapsed;
                  const off = !isScheduled(h, year, month, d);
                  const locked = off && !done; // rest day: nothing to mark
                  const cls = [
                    'day-cell',
                    isWeekend(year, month, d) && 'is-weekend',
                    isWeekStart(year, month, d) && d !== 1 && 'is-week-start',
                    d === todayDay && 'is-today',
                  ]
                    .filter(Boolean)
                    .join(' ');
                  const state = future
                    ? t.future
                    : off
                    ? done
                      ? `${t.offDay}, ${t.done}`
                      : t.offDay
                    : done
                    ? t.done
                    : t.notDone;
                  return (
                    <td key={d} className={cls}>
                      <button
                        type="button"
                        className={`cell${done ? ' done' : ''}${off ? ' off' : ''}`}
                        style={{ '--c': bg, '--on-c': fg }}
                        aria-pressed={locked ? undefined : done}
                        aria-disabled={locked || undefined}
                        aria-label={t.cellLabel(h.name, formatDayMonth(year, month, d), state)}
                        disabled={future}
                        tabIndex={fr === r && fc === d ? 0 : -1}
                        data-r={r}
                        data-c={d}
                        onClick={() => {
                          if (!locked) onToggle(h.id, d);
                        }}
                        onFocus={() => setFocus({ r, c: d })}
                      >
                        {done ? <FiCheck aria-hidden="true" /> : null}
                      </button>
                    </td>
                  );
                })}
                <td className="pct-cell">
                  <span className="pct-value">{s?.percent === null || !s ? t.dash : formatPercent(s.percent)}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
