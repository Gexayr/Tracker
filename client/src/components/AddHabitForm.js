import React, { useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import { MAX_HABIT_NAME } from '../hooks/useMonthData';
import { t } from '../i18n';

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
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const err = validateHabitName(text, habits);
    if (err) {
      setError(err);
      return;
    }
    onAdd(text.trim());
    setText('');
    setError('');
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
          disabled={disabled}
        />
        <button className="btn btn-primary" type="submit" disabled={disabled || !text.trim()}>
          <FiPlus aria-hidden="true" /> {t.add}
        </button>
        {onCancel ? (
          <button className="btn btn-ghost" type="button" onClick={onCancel}>
            {t.cancel}
          </button>
        ) : null}
      </div>
      {error ? (
        <p className="field-error" id="new-habit-error" role="alert">
          {error}
        </p>
      ) : null}
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
      >
        <FiPlus aria-hidden="true" /> {t.addHabit}
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
