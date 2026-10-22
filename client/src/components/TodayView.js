import React from 'react';
import { motion } from 'framer-motion';
import { FiCheck, FiMenu, FiMoon, FiPlus } from 'react-icons/fi';
import { useReorder } from '../hooks/useReorder';
import { t } from '../i18n';
import { habitColor, textOn } from '../utils/color';
import { formatDayMonth, formatWeekdayShort, monthRelation, weekdayInitial } from '../utils/date';
import { entryAmount, isDone, isScheduled, normalizeAmount } from '../utils/progress';

export function TodayView({
  year,
  month,
  habits,
  data,
  stats,
  now,
  theme,
  onToggle,
  onEdit,
  onGoToday,
  onMove,
  onAnnounce,
}) {
  const reorder = useReorder({ ids: habits.map((h) => h.id), onMove, onAnnounce });

  if (monthRelation(year, month, now) !== 0) {
    return (
      <div className="empty-state">
        <p>{t.todayOnlyCurrent}</p>
        <button type="button" className="btn btn-primary" onClick={onGoToday}>
          {t.goToToday}
        </button>
      </div>
    );
  }
  const today = now.getDate();
  const strip = Array.from({ length: 7 }, (_, i) => today - 6 + i);

  return (
    <ul className="today-list">
      {habits.map((h) => {
        const bg = habitColor(h.color, theme);
        const fg = textOn(bg);
        const entries = data[h.id] || {};
        const goal = normalizeAmount(h.amount);
        const done = isDone(h, entries[today]);
        const amount = goal ? entryAmount(entries[today]) : 0;
        const restToday = !isScheduled(h, year, month, today) && !done && !amount;
        const s = stats[h.id];
        const drag = reorder.itemProps(h.id);
        return (
          <li
            key={h.id}
            ref={reorder.itemRef(h.id)}
            className={`today-card card ${drag.className}`}
            style={{ '--c': bg, '--on-c': fg, ...(drag.style || {}) }}
          >
            <div className="today-top">
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
              >
                <span className="dot" style={{ background: bg }} aria-hidden="true" />
                <span className="today-name">{h.name}</span>
              </button>
              <span className="today-streak muted small">
                {s ? `${t.streakDays(s.currentStreak)} · ${t.bestDays(s.bestStreak)}` : ''}
                {s && s.target ? ` · ${t.goalOf(s.done, s.target)}` : ''}
              </span>
              {goal ? (
                <span className="today-amount small">
                  <span className="today-amount-bar" aria-hidden="true">
                    <span style={{ width: `${Math.min(100, (amount / goal) * 100)}%` }} />
                  </span>
                  {t.amountOf(amount, goal, h.unit)}
                </span>
              ) : null}
              {restToday ? (
                <span className="big-toggle is-off" role="img" aria-label={t.restToday(h.name)} title={t.restDay}>
                  <FiMoon aria-hidden="true" />
                </span>
              ) : (
                <motion.button
                  type="button"
                  className={`big-toggle${done ? ' done' : ''}${goal && !done && amount ? ' partial' : ''}`}
                  aria-pressed={goal ? undefined : done}
                  aria-haspopup={goal ? 'dialog' : undefined}
                  aria-label={goal ? t.logAmount(h.name) : done ? t.markNotDone(h.name) : t.markDone(h.name)}
                  onClick={() => onToggle(h.id, today)}
                  whileTap={{ scale: 0.9 }}
                  style={goal && !done && amount ? { '--fill': `${Math.round((amount / goal) * 100)}%` } : undefined}
                >
                  {goal && !done ? <FiPlus aria-hidden="true" /> : <FiCheck aria-hidden="true" />}
                </motion.button>
              )}
            </div>
            <div className="mini-strip" role="group" aria-label={`${h.name}: ${t.last7}`}>
              {strip.map((d) => {
                if (d < 1) return <span key={`p${d}`} className="mini-day is-out" aria-hidden="true" />;
                const dayDone = isDone(h, entries[d]);
                const dayAmount = goal ? entryAmount(entries[d]) : 0;
                const off = !isScheduled(h, year, month, d);
                const locked = off && !dayDone && !dayAmount;
                const base = off ? (dayDone ? `${t.offDay}, ${t.done}` : t.offDay) : dayDone ? t.done : t.notDone;
                const state = dayAmount ? `${base}, ${t.amountOf(dayAmount, goal, h.unit)}` : base;
                return (
                  <button
                    key={d}
                    type="button"
                    className={`mini-day${dayDone ? ' done' : ''}${!dayDone && dayAmount ? ' partial' : ''}${off ? ' off' : ''}${d === today ? ' is-today' : ''}`}
                    style={!dayDone && dayAmount ? { '--fill': `${Math.round((dayAmount / goal) * 100)}%` } : undefined}
                    aria-pressed={locked || goal ? undefined : dayDone}
                    aria-haspopup={goal && !locked ? 'dialog' : undefined}
                    aria-disabled={locked || undefined}
                    aria-label={t.cellLabel(h.name, formatDayMonth(year, month, d), state)}
                    title={`${formatWeekdayShort(year, month, d)} ${d}`}
                    onClick={() => {
                      if (!locked) onToggle(h.id, d);
                    }}
                  >
                    <span className="mini-wd" aria-hidden="true">
                      {weekdayInitial(year, month, d)}
                    </span>
                    <span className="mini-num" aria-hidden="true">
                      {d}
                    </span>
                  </button>
                );
              })}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
