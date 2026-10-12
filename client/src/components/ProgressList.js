import React from 'react';
import { FiAward } from 'react-icons/fi';
import { formatPercent, t } from '../i18n';
import { habitColor } from '../utils/color';

function GoalBar({ s, color, name }) {
  // Scale: the month's scheduled days (or the goal, if it is larger).
  const scale = Math.max(s.target, s.scheduledInMonth, 1);
  const fill = Math.min(100, (s.done / scale) * 100);
  const mark = Math.min(100, (s.target / scale) * 100);
  return (
    <div
      className="bar-track has-goal"
      role="progressbar"
      aria-label={name}
      aria-valuemin={0}
      aria-valuemax={s.target}
      aria-valuenow={Math.min(s.done, s.target)}
      aria-valuetext={t.goalLabel(s.done, s.target)}
    >
      <span className="bar-fill" style={{ width: `${fill}%`, background: color }} />
      <span className="goal-marker" style={{ left: `${mark}%` }} title={t.goalMarker(s.target)} aria-hidden="true" />
    </div>
  );
}

export function ProgressList({ habits, stats, theme }) {
  if (!habits.length) return <p className="muted">{t.progressEmpty}</p>;
  return (
    <ul className="progress-list">
      {habits.map((h) => {
        const s = stats[h.id];
        const pct = s?.percent;
        const color = habitColor(h.color, theme);
        const goal = s && s.target ? s : null;
        return (
          <li key={h.id} className="progress-item">
            <div className="progress-row">
              <span className="dot" style={{ background: color }} aria-hidden="true" />
              <span className="progress-name" title={h.name}>
                {h.name}
              </span>
              {goal && goal.targetReached ? (
                <span className="badge badge-success">
                  <FiAward aria-hidden="true" /> {t.goalReached}
                </span>
              ) : null}
              <span className="progress-pct">
                {goal ? t.goalOf(goal.done, goal.target) : pct === null || pct === undefined ? t.dash : formatPercent(pct)}
              </span>
            </div>
            {goal ? (
              <GoalBar s={goal} color={color} name={h.name} />
            ) : (
              <div
                className="bar-track"
                role="progressbar"
                aria-label={h.name}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={pct ?? 0}
              >
                <span className="bar-fill" style={{ width: `${pct || 0}%`, background: color }} />
              </div>
            )}
            {s && s.eligible > 0 ? (
              <span className="progress-meta">
                {t.streakShort(s.currentStreak, s.bestStreak)}
                {goal && pct !== null ? ` · ${formatPercent(pct)}` : ''}
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
