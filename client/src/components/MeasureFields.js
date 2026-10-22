import React from 'react';
import { t } from '../i18n';
import { MAX_UNIT, normalizeAmount } from '../utils/progress';

/** Form state for a measurable habit: { on, amount: string, unit: string }. */
export const measureState = (habit) => {
  const amount = normalizeAmount(habit?.amount);
  return { on: amount !== null, amount: amount === null ? '' : String(amount), unit: habit?.unit || '' };
};

/** Returns an error string or '' for the measure part of a habit form. */
export function validateMeasure(m) {
  if (!m.on) return '';
  return normalizeAmount(m.amount) === null ? t.amountInvalid : '';
}

/** Habit fields for the measure: { amount, unit } or nulls to make it a plain habit. */
export const measureChanges = (m) =>
  m.on ? { amount: normalizeAmount(m.amount), unit: m.unit.trim() || null } : { amount: null, unit: null };

export function MeasureFields({ value, onChange, error, idPrefix }) {
  const set = (patch) => onChange({ ...value, ...patch });
  return (
    <div className="measure">
      <label className="check-row" htmlFor={`${idPrefix}-on`}>
        <input
          id={`${idPrefix}-on`}
          type="checkbox"
          checked={value.on}
          onChange={(e) => set({ on: e.target.checked })}
        />
        <span>
          <span className="check-label">{t.measurable}</span>
          <span className="field-hint">{t.measurableHint}</span>
        </span>
      </label>
      {value.on ? (
        <div className="measure-row">
          <div className="field">
            <label htmlFor={`${idPrefix}-amount`}>{t.amount}</label>
            <input
              id={`${idPrefix}-amount`}
              className="input"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              placeholder={t.amountPlaceholder}
              value={value.amount}
              aria-invalid={!!error}
              aria-describedby={error ? `${idPrefix}-amount-error` : undefined}
              onChange={(e) => set({ amount: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor={`${idPrefix}-unit`}>{t.unit}</label>
            <input
              id={`${idPrefix}-unit`}
              className="input"
              maxLength={MAX_UNIT}
              autoComplete="off"
              placeholder={t.unitPlaceholder}
              value={value.unit}
              onChange={(e) => set({ unit: e.target.value })}
            />
          </div>
          {error ? (
            <p className="field-error measure-error" id={`${idPrefix}-amount-error`} role="alert">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
