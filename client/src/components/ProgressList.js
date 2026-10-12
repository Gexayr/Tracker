import React from 'react';
import { t } from '../i18n';
import { habitColor } from '../utils/color';

export function ProgressList({ habits, stats, theme }) {
  if (!habits.length) return <p className="muted">{t.progressEmpty}</p>;
  return (
    <ul className="progress-list">
      {habits.map((h) => {
        const s = stats[h.id];
        const pct = s?.percent;
        const color = habitColor(h.color, theme);
        return (
          <li key={h.id} className="progress-item">
            <div className="progress-row">
              <span className="dot" style={{ background: color }} aria-hidden="true" />
              <span className="progress-name" title={h.name}>
                {h.name}
              </span>
              <span className="progress-pct">{pct === null || pct === undefined ? t.dash : `${pct}%`}</span>
            </div>
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
            {s && s.eligible > 0 ? (
              <span className="progress-meta">{t.streakShort(s.currentStreak, s.bestStreak)}</span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
