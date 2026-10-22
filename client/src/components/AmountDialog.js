import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FiCheck, FiX } from 'react-icons/fi';
import { t } from '../i18n';
import { habitColor } from '../utils/color';
import { formatDayMonth } from '../utils/date';
import { entryAmount, normalizeAmount } from '../utils/progress';

/** Logs how much of a measurable habit was done on one day (e.g. 4200 of 6000 steps). */
export function AmountDialog({ habit, year, month, day, value, theme, onSave, onClose }) {
  const goal = normalizeAmount(habit.amount);
  const logged = entryAmount(value);
  const [text, setText] = useState(logged ? String(logged) : '');
  const [error, setError] = useState('');
  const dialogRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const opener = document.activeElement;
    inputRef.current?.focus();
    inputRef.current?.select();
    return () => {
      if (opener && typeof opener.focus === 'function' && document.contains(opener)) opener.focus();
    };
  }, []);

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab') return;
    const nodes = dialogRef.current?.querySelectorAll('button:not([disabled]), input:not([disabled])');
    if (!nodes || !nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const submit = (e) => {
    e.preventDefault();
    const v = text.trim();
    if (v === '' || Number(v.replace(',', '.')) === 0) {
      onSave(0);
      return;
    }
    const n = normalizeAmount(v);
    if (n === null) {
      setError(t.amountInvalid);
      return;
    }
    onSave(n);
  };

  const bg = habitColor(habit.color, theme);
  const current = normalizeAmount(text) || 0;
  const pct = goal ? Math.min(100, (current / goal) * 100) : 0;

  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div
        ref={dialogRef}
        className="dialog dialog-small card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="amount-dialog-title"
        onKeyDown={onKeyDown}
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.16 }}
      >
        <form onSubmit={submit} noValidate>
          <div className="dialog-head">
            <div>
              <h2 id="amount-dialog-title" className="card-title">
                <span className="dot" style={{ background: bg }} aria-hidden="true" /> {habit.name}
              </h2>
              <p className="muted small">{formatDayMonth(year, month, day)}</p>
            </div>
            <button type="button" className="icon-btn" onClick={onClose} aria-label={t.close}>
              <FiX aria-hidden="true" />
            </button>
          </div>

          <div className="field">
            <label htmlFor="amount-value">{t.amountLogged}</label>
            <div className="inline-row">
              <input
                id="amount-value"
                ref={inputRef}
                className="input"
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                placeholder="0"
                value={text}
                aria-invalid={!!error}
                aria-describedby="amount-goal"
                onChange={(e) => {
                  setText(e.target.value);
                  if (error) setError('');
                }}
              />
              {habit.unit ? <span className="amount-unit">{habit.unit}</span> : null}
            </div>
            {error ? (
              <p className="field-error" role="alert">
                {error}
              </p>
            ) : null}
            <div className="bar-track amount-bar" aria-hidden="true">
              <span className="bar-fill" style={{ width: `${pct}%`, background: bg }} />
            </div>
            <p className="field-hint" id="amount-goal">
              {t.amountGoal(goal, habit.unit)}
            </p>
          </div>

          <div className="dialog-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setText(String(goal))}>
              <FiCheck aria-hidden="true" /> {t.amountFill}
            </button>
            {logged ? (
              <button type="button" className="btn btn-danger-ghost" onClick={() => onSave(0)}>
                {t.reminderClear}
              </button>
            ) : null}
            <div className="dialog-primary">
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                {t.cancel}
              </button>
              <button type="submit" className="btn btn-primary">
                {t.save}
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
