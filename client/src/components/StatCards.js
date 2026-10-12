import React from 'react';
import { formatNumber, formatPercent, t } from '../i18n';
import { monthRelation } from '../utils/date';
import { dayCompletion, overallStats } from '../utils/progress';

function Stat({ label, value, hint, meter, tone }) {
  return (
    <div className={`stat card${tone ? ` is-${tone}` : ''}`}>
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
  const today = rel === 0 ? dayCompletion(habits, data, year, month, now.getDate()) : null;
  const overall = overallStats(habits, data, year, month, now);

  let best = { value: 0, name: '' };
  habits.forEach((h) => {
    const s = stats[h.id];
    if (s && s.bestStreak > best.value) best = { value: s.bestStreak, name: h.name };
  });

  const withGoal = habits.filter((h) => stats[h.id]?.target);
  const reached = withGoal.filter((h) => stats[h.id].targetReached).length;

  const monthHint =
    rel === 0 ? t.statMonthHintCurrent : rel < 0 ? t.statMonthHintPast : t.statMonthHintFuture;

  return (
    <section className="stats" aria-label={t.progress}>
      <Stat
        label={t.statToday}
        value={!today ? t.dash : `${formatNumber(today.done)}/${formatNumber(today.total)}`}
        hint={!today ? t.notCurrentMonth : today.total ? t.statTodayHint : t.statTodayRest}
        meter={!today || !today.total ? null : (today.done / today.total) * 100}
      />
      <Stat
        label={t.statMonth}
        value={overall.percent === null ? t.dash : formatPercent(overall.percent)}
        hint={monthHint}
        meter={overall.percent}
      />
      <Stat
        label={t.statBestStreak}
        value={rel > 0 ? t.dash : formatNumber(best.value)}
        hint={t.statBestStreakHint(best.value ? best.name : '')}
      />
      {withGoal.length ? (
        <Stat
          label={t.statGoals}
          value={`${formatNumber(reached)}/${formatNumber(withGoal.length)}`}
          hint={t.statGoalsHint(habits.length)}
          meter={(reached / withGoal.length) * 100}
          tone={reached === withGoal.length ? 'success' : undefined}
        />
      ) : (
        <Stat label={t.statHabits} value={formatNumber(habits.length)} hint={t.statHabitsHint} />
      )}
    </section>
  );
}
