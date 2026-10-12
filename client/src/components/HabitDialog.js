import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FiCheck, FiTrash2, FiX } from 'react-icons/fi';
import { MAX_HABIT_NAME } from '../hooks/useMonthData';
import { t } from '../i18n';
import { HABIT_PALETTE, habitColor, paletteIndex, textOn } from '../utils/color';
import { validateHabitName } from './AddHabitForm';

export function HabitDialog({ habit, habits, theme, onSave, onDelete, onClose }) {
  const [name, setName] = useState(habit.name);
  const [color, setColor] = useState(habit.color);
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
    // Minimal focus trap.
    const nodes = dialogRef.current?.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
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
    const err = validateHabitName(name, habits, habit.id);
    if (err) {
      setError(err);
      return;
    }
    onSave({ name: name.trim(), color });
  };

  const options = HABIT_PALETTE.map((p) => p.light);
  if (paletteIndex(habit.color) < 0) options.push(habit.color);
  const selectedIdx = paletteIndex(color);

  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div
        ref={dialogRef}
        className="dialog card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="habit-dialog-title"
        onKeyDown={onKeyDown}
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.16 }}
      >
        <form onSubmit={submit} noValidate>
          <div className="dialog-head">
            <h2 id="habit-dialog-title" className="card-title">
              {t.editTitle}
            </h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label={t.close}>
              <FiX aria-hidden="true" />
            </button>
          </div>

          <div className="field">
            <label htmlFor="habit-name">{t.name}</label>
            <input
              id="habit-name"
              ref={inputRef}
              className="input"
              value={name}
              maxLength={MAX_HABIT_NAME}
              autoComplete="off"
              aria-invalid={!!error}
              aria-describedby={error ? 'habit-name-error' : undefined}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
            />
            {error ? (
              <p className="field-error" id="habit-name-error" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          <div className="field">
            <span className="label" id="habit-color-label">
              {t.color}
            </span>
            <div className="swatches" role="radiogroup" aria-labelledby="habit-color-label">
              {options.map((hex, i) => {
                const shown = habitColor(hex, theme);
                const checked =
                  i < HABIT_PALETTE.length ? selectedIdx === i : selectedIdx < 0 && hex === color;
                return (
                  <button
                    key={hex}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    aria-label={t.colorOption(i + 1)}
                    className={`swatch${checked ? ' selected' : ''}`}
                    style={{ background: shown, color: textOn(shown) }}
                    onClick={() => setColor(hex)}
                  >
                    {checked ? <FiCheck aria-hidden="true" /> : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="dialog-actions">
            <button type="button" className="btn btn-danger-ghost" onClick={onDelete}>
              <FiTrash2 aria-hidden="true" /> {t.delete}
            </button>
            <span className="spacer" />
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              {t.cancel}
            </button>
            <button type="submit" className="btn btn-primary">
              {t.save}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
