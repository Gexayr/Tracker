import React from 'react';
import { t } from '../i18n';
import { WEEK_ORDER, weekdayNameLong, weekdayNameShort } from '../utils/date';

/** value: array of JS weekdays (0 = Sunday) or null for every day. */
export function DayPicker({ value, onChange, idPrefix = 'days' }) {
  const selected = new Set(Array.isArray(value) && value.length ? value : WEEK_ORDER);
  const all = selected.size === 7;

  const toggle = (wd) => {
    const next = new Set(selected);
    if (next.has(wd)) {
      if (next.size === 1) return; // at least one day stays scheduled
      next.delete(wd);
    } else {
      next.add(wd);
    }
    onChange(next.size === 7 ? null : WEEK_ORDER.filter((d) => next.has(d)));
  };

  return (
    <div className="day-picker">
      <div className="day-chips" role="group" aria-labelledby={`${idPrefix}-label`}>
        {WEEK_ORDER.map((wd) => {
          const on = selected.has(wd);
          return (
            <button
              key={wd}
              type="button"
              className={`day-chip${on ? ' on' : ''}`}
              aria-pressed={on}
              aria-label={weekdayNameLong(wd)}
              title={weekdayNameLong(wd)}
              onClick={() => toggle(wd)}
            >
              {weekdayNameShort(wd)}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="link-btn day-all"
        onClick={() => onChange(null)}
        disabled={all}
      >
        {t.scheduleEveryDay}
      </button>
    </div>
  );
}
