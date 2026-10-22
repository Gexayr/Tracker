import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FiArchive, FiArrowDown, FiArrowUp, FiBell, FiCheck, FiTrash2, FiX } from 'react-icons/fi';
import { MAX_HABIT_NAME } from '../hooks/useMonthData';
import { t } from '../i18n';
import { HABIT_PALETTE, habitColor, paletteIndex, textOn } from '../utils/color';
import { notificationState, requestNotificationPermission } from '../utils/notify';
import { normalizeDays, normalizeTarget } from '../utils/progress';
import { validateHabitName } from './AddHabitForm';
import { DayPicker } from './DayPicker';
import { MeasureFields, measureChanges, measureState, validateMeasure } from './MeasureFields';

function NotificationHint({ state }) {
  const text =
    state === 'unsupported'
      ? t.notifUnsupported
      : state === 'denied'
      ? t.notifDenied
      : state === 'granted'
      ? t.notifGranted
      : t.notifDefault;
  return (
    <p className={`field-hint${state === 'denied' || state === 'unsupported' ? ' is-warning' : ''}`} role="status">
      {text}
    </p>
  );
}

export function HabitDialog({
  habit,
  habits,
  theme,
  position,
  total,
  onMove,
  onSave,
  onDelete,
  onArchive,
  onClose,
}) {
  const [name, setName] = useState(habit.name);
  const [color, setColor] = useState(habit.color);
  const [days, setDays] = useState(() => normalizeDays(habit.days));
  const [target, setTarget] = useState(() => (normalizeTarget(habit.target) ? String(habit.target) : ''));
  const [measure, setMeasure] = useState(() => measureState(habit));
  const [measureError, setMeasureError] = useState('');
  const [reminder, setReminder] = useState(habit.reminder || '');
  const [notif, setNotif] = useState(notificationState);
  const [error, setError] = useState('');
  const [targetError, setTargetError] = useState('');
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

  const askPermission = async () => {
    if (notificationState() === 'default') setNotif(await requestNotificationPermission());
  };

  const submit = async (e) => {
    e.preventDefault();
    const err = validateHabitName(name, habits, habit.id);
    const tv = target.trim();
    const tErr = tv && normalizeTarget(tv) === null ? t.targetInvalid : '';
    setError(err);
    const mErr = validateMeasure(measure);
    setTargetError(tErr);
    setMeasureError(mErr);
    if (err || tErr || mErr) return;
    if (reminder && reminder !== habit.reminder) await askPermission();
    onSave({
      name: name.trim(),
      color,
      days,
      target: tv ? Number(tv) : null,
      reminder: reminder || null,
      ...measureChanges(measure),
    });
  };

  const options = HABIT_PALETTE.map((p) => p.light);
  if (paletteIndex(habit.color) < 0 && habit.color) options.push(habit.color);
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

          <div className="field">
            <span className="label" id="habit-days-label">
              {t.schedule}
            </span>
            <DayPicker value={days} onChange={setDays} idPrefix="habit-days" />
            <p className="field-hint">{t.scheduleHint}</p>
          </div>

          <MeasureFields
            value={measure}
            onChange={(m) => {
              setMeasure(m);
              if (measureError) setMeasureError('');
            }}
            error={measureError}
            idPrefix="habit-measure"
          />

          <div className="field-row">
            <div className="field">
              <label htmlFor="habit-target">{t.target}</label>
              <input
                id="habit-target"
                className="input input-narrow"
                type="number"
                inputMode="numeric"
                min={1}
                max={31}
                step={1}
                placeholder={t.targetPlaceholder}
                value={target}
                aria-invalid={!!targetError}
                aria-describedby="habit-target-hint"
                onChange={(e) => {
                  setTarget(e.target.value);
                  if (targetError) setTargetError('');
                }}
              />
              {targetError ? (
                <p className="field-error" role="alert">
                  {targetError}
                </p>
              ) : null}
              <p className="field-hint" id="habit-target-hint">
                {t.targetHint}
              </p>
            </div>
            <div className="field">
              <label htmlFor="habit-reminder">
                <FiBell aria-hidden="true" className="label-icon" /> {t.reminder}
              </label>
              <div className="inline-row">
                <input
                  id="habit-reminder"
                  className="input input-narrow"
                  type="time"
                  value={reminder}
                  aria-describedby="habit-reminder-hint"
                  onChange={(e) => {
                    setReminder(e.target.value);
                    if (e.target.value) askPermission();
                  }}
                />
                {reminder ? (
                  <button type="button" className="btn btn-ghost" onClick={() => setReminder('')}>
                    {t.reminderClear}
                  </button>
                ) : null}
              </div>
              <div id="habit-reminder-hint" className="field-hints">
                <p className="field-hint">{t.reminderHint}</p>
                {reminder ? <NotificationHint state={notif} /> : null}
              </div>
            </div>
          </div>

          {total > 1 ? (
            <div className="move-row">
              <span className="muted small">{t.position(position + 1, total)}</span>
              <span className="spacer" />
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => onMove(-1)}
                disabled={position <= 0}
              >
                <FiArrowUp aria-hidden="true" /> {t.moveUp}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => onMove(1)}
                disabled={position >= total - 1}
              >
                <FiArrowDown aria-hidden="true" /> {t.moveDown}
              </button>
            </div>
          ) : null}

          <div className="dialog-actions">
            <div className="dialog-secondary">
              <button type="button" className="btn btn-ghost" onClick={onArchive}>
                <FiArchive aria-hidden="true" /> {t.archive}
              </button>
              <button type="button" className="btn btn-danger-ghost" onClick={onDelete}>
                <FiTrash2 aria-hidden="true" /> {t.delete}
              </button>
            </div>
            <span className="spacer" />
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
