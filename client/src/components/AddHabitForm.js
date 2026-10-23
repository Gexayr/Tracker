import React, { useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import { MAX_HABIT_NAME, MAX_HABITS } from '../hooks/useMonthData';
import { t } from '../i18n';
import { DayPicker } from './DayPicker';
import { MeasureFields, measureChanges, measureState, validateMeasure } from './MeasureFields';

/** Returns an error string or '' for a proposed habit name. */
export function validateHabitName(name, habits, selfId) {
  const n = name.trim();
  if (!n) return t.nameRequired;
  if (n.length > MAX_HABIT_NAME) return t.nameTooLong(MAX_HABIT_NAME);
  const lower = n.toLocaleLowerCase();
  if (habits.some((h) => h.id !== selfId && h.name.trim().toLocaleLowerCase() === lower)) {
    return t.nameDuplicate;
  }
  return '';
}

export function AddHabitForm({ habits, onAdd, disabled, autoFocus, onCancel }) {
  const [text, setText] = useState('');
  const [days, setDays] = useState(null);
  const [measure, setMeasure] = useState(() => measureState(null));
  const [error, setError] = useState('');
  const [measureError, setMeasureError] = useState('');
  const full = habits.length >= MAX_HABITS;

  const submit = (e) => {
    e.preventDefault();
    const err = full ? t.tooManyHabits(MAX_HABITS) : validateHabitName(text, habits);
    const mErr = full ? '' : validateMeasure(measure);
    setError(err);
    setMeasureError(mErr);
    if (err || mErr) return;
    onAdd(text.trim(), { ...(days ? { days } : {}), ...measureChanges(measure) });
    setText('');
    setMeasure(measureState(null));
  };

  return (
    <form className="add-habit" onSubmit={submit} noValidate>
      <div className="add-habit-row">
        <label className="sr-only" htmlFor="new-habit">
          {t.newHabitPlaceholder}
        </label>
        <input
          id="new-habit"
          className="input"
          value={text}
          placeholder={t.newHabitPlaceholder}
          maxLength={MAX_HABIT_NAME}
          autoFocus={autoFocus}
          autoComplete="off"
          enterKeyHint="done"
          aria-invalid={!!error}
          aria-describedby={error ? 'new-habit-error' : undefined}
          onChange={(e) => {
            setText(e.target.value);
            if (error) setError('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && onCancel) onCancel();
          }}
          disabled={disabled || full}
        />
        <button className="btn btn-primary" type="submit" disabled={disabled || full || !text.trim()}>
          <FiPlus aria-hidden="true" /> {t.add}
        </button>
        {onCancel ? (
          <button className="btn btn-ghost" type="button" onClick={onCancel}>
            {t.cancel}
          </button>
        ) : null}
      </div>
      {error || full ? (
        <p className="field-error" id="new-habit-error" role="alert">
          {full ? t.tooManyHabits(MAX_HABITS) : error}
        </p>
      ) : null}
      <div className="add-habit-days">
        <span className="label" id="new-habit-days-label">
          {t.schedule}
        </span>
        <DayPicker value={days} onChange={setDays} idPrefix="new-habit-days" />
      </div>
      <MeasureFields
        value={measure}
        onChange={(m) => {
          setMeasure(m);
          if (measureError) setMeasureError('');
        }}
        error={measureError}
        idPrefix="new-habit-measure"
      />
    </form>
  );
}

export function AddHabitToggle({ habits, onAdd, disabled }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        type="button"
        className="btn btn-ghost add-habit-btn"
        onClick={() => setOpen(true)}
        disabled={disabled}
        aria-label={t.addHabit}
      >
        <FiPlus aria-hidden="true" /> <span className="btn-label">{t.addHabit}</span>
      </button>
    );
  }
  return (
    <AddHabitForm
      habits={habits}
      onAdd={onAdd}
      disabled={disabled}
      autoFocus
      onCancel={() => setOpen(false)}
    />
  );
}
