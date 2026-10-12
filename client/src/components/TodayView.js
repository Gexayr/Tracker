import React from 'react';
import { motion } from 'framer-motion';
import { FiCheck } from 'react-icons/fi';
import { t } from '../i18n';
import { habitColor, textOn } from '../utils/color';
import { formatDayMonth, formatWeekdayShort, monthRelation, weekdayInitial } from '../utils/date';

export function TodayView({ year, month, habits, data, stats, now, theme, onToggle, onEdit, onGoToday }) {
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
        const done = !!entries[today];
        const s = stats[h.id];
        return (
          <li key={h.id} className="today-card card" style={{ '--c': bg, '--on-c': fg }}>
            <div className="today-top">
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
              </span>
              <motion.button
                type="button"
                className={`big-toggle${done ? ' done' : ''}`}
                aria-pressed={done}
                aria-label={done ? t.markNotDone(h.name) : t.markDone(h.name)}
                onClick={() => onToggle(h.id, today)}
                whileTap={{ scale: 0.9 }}
              >
                <FiCheck aria-hidden="true" />
              </motion.button>
            </div>
            <div className="mini-strip" role="group" aria-label={`${h.name}: ${t.last7}`}>
              {strip.map((d) =>
                d < 1 ? (
                  <span key={`p${d}`} className="mini-day is-out" aria-hidden="true" />
                ) : (
                  <button
                    key={d}
                    type="button"
                    className={`mini-day${entries[d] ? ' done' : ''}${d === today ? ' is-today' : ''}`}
                    aria-pressed={!!entries[d]}
                    aria-label={t.cellLabel(
                      h.name,
                      formatDayMonth(year, month, d),
                      entries[d] ? t.done : t.notDone
                    )}
                    title={`${formatWeekdayShort(year, month, d)} ${d}`}
                    onClick={() => onToggle(h.id, d)}
                  >
                    <span className="mini-wd" aria-hidden="true">
                      {weekdayInitial(year, month, d)}
                    </span>
                    <span className="mini-num" aria-hidden="true">
                      {d}
                    </span>
                  </button>
                )
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
