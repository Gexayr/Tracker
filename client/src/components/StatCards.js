import React from 'react';
import { t } from '../i18n';
import { monthRelation } from '../utils/date';
import { overallStats } from '../utils/progress';

function Stat({ label, value, hint, meter }) {
  return (
    <div className="stat card">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {meter !== undefined && meter !== null ? (
        <span className="meter" aria-hidden="true">
          <span className="meter-fill" style={{ width: `${meter}%` }} />
        </span>
      ) : null}
      <span className="stat-hint">{hint}</span>
    </div>
  );
}

export function StatCards({ habits, data, stats, year, month, now }) {
  const rel = monthRelation(year, month, now);
  const day = now.getDate();
  const doneToday = rel === 0 ? habits.filter((h) => data[h.id]?.[day]).length : null;
  const overall = overallStats(habits, data, year, month, now);

  let best = { value: 0, name: '' };
  habits.forEach((h) => {
    const s = stats[h.id];
    if (s && s.bestStreak > best.value) best = { value: s.bestStreak, name: h.name };
  });

  const monthHint =
    rel === 0 ? t.statMonthHintCurrent : rel < 0 ? t.statMonthHintPast : t.statMonthHintFuture;

  return (
    <section className="stats" aria-label={t.progress}>
      <Stat
        label={t.statToday}
        value={doneToday === null ? t.dash : `${doneToday}/${habits.length}`}
        hint={doneToday === null ? t.notCurrentMonth : t.statTodayHint}
        meter={doneToday === null || !habits.length ? null : (doneToday / habits.length) * 100}
      />
      <Stat
        label={t.statMonth}
        value={overall.percent === null ? t.dash : `${overall.percent}%`}
        hint={monthHint}
        meter={overall.percent}
      />
      <Stat
        label={t.statBestStreak}
        value={rel > 0 ? t.dash : best.value}
        hint={t.statBestStreakHint(best.value ? best.name : '')}
      />
      <Stat label={t.statHabits} value={habits.length} hint={t.statHabitsHint} />
    </section>
  );
}
