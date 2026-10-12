export const MIN_YEAR = 2000;
export const MAX_YEAR = 2100;
export const MAX_HABITS = 50;
export const MAX_HABIT_NAME_LENGTH = 100;
export const MAX_COLOR_LENGTH = 64;
export const MAX_DATA_KEYS = 500;

export const MIN_HABIT_TARGET = 1;
export const MAX_HABIT_TARGET = 31;
const REMINDER_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface Habit {
  id: number | string;
  name: string;
  color: string;
  /** Scheduled weekdays (Date.getDay(): 0=Sunday..6); absent = every day. */
  days?: number[];
  /** Monthly goal of completed days. */
  target?: number;
  /** Daily reminder time "HH:MM" (24h), or null for none. */
  reminder?: string | null;
  archived?: boolean;
  [key: string]: any;
}

export interface HabitPayload {
  habits: Habit[];
  data: Record<string, Record<string, boolean>>;
  chartType?: string;
  [key: string]: any;
}

export const DEFAULT_HABITS: Habit[] = [
  { id: 1, name: 'Meditation', color: '#8ecae6' },
  { id: 2, name: 'Workout', color: '#219ebc' },
  { id: 3, name: 'Read 30 min', color: '#ffd166' },
  { id: 4, name: 'No sugar', color: '#06d6a0' },
];

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Validates the optional per-habit fields only when they are present. */
function validateOptionalHabitFields(
  h: Record<string, unknown>,
  i: number,
): string | null {
  if (h.days !== undefined) {
    const days = h.days;
    if (
      !Array.isArray(days) ||
      days.length === 0 ||
      days.length > 7 ||
      !days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6) ||
      new Set(days).size !== days.length
    ) {
      return `payload.habits[${i}].days must be a non-empty array of unique integers 0-6`;
    }
  }
  if (h.target !== undefined) {
    const t = h.target;
    if (
      !Number.isInteger(t) ||
      (t as number) < MIN_HABIT_TARGET ||
      (t as number) > MAX_HABIT_TARGET
    ) {
      return `payload.habits[${i}].target must be an integer between ${MIN_HABIT_TARGET} and ${MAX_HABIT_TARGET}`;
    }
  }
  if (h.reminder !== undefined && h.reminder !== null) {
    if (typeof h.reminder !== 'string' || !REMINDER_RE.test(h.reminder)) {
      return `payload.habits[${i}].reminder must be "HH:MM" (24h) or null`;
    }
  }
  if (h.archived !== undefined && typeof h.archived !== 'boolean') {
    return `payload.habits[${i}].archived must be a boolean`;
  }
  return null;
}

/**
 * Returns a human-readable error for an invalid payload, or null if valid.
 * Intentionally lenient: unknown extra keys (e.g. chartType, future UI settings)
 * are allowed and preserved. Habit order is never changed (it is user-defined).
 */
export function validateHabitPayload(payload: unknown): string | null {
  if (!isPlainObject(payload)) return 'payload must be an object';
  const { habits, data, chartType } = payload;
  if (!Array.isArray(habits)) return 'payload.habits must be an array';
  if (habits.length > MAX_HABITS)
    return `payload.habits must contain at most ${MAX_HABITS} habits`;
  for (let i = 0; i < habits.length; i++) {
    const h: unknown = habits[i];
    if (!isPlainObject(h)) return `payload.habits[${i}] must be an object`;
    const idOk =
      (typeof h.id === 'number' && Number.isFinite(h.id)) ||
      (typeof h.id === 'string' && h.id.length > 0 && h.id.length <= 64);
    if (!idOk)
      return `payload.habits[${i}].id must be a number or non-empty string`;
    if (typeof h.name !== 'string' || h.name.length > MAX_HABIT_NAME_LENGTH) {
      return `payload.habits[${i}].name must be a string of at most ${MAX_HABIT_NAME_LENGTH} characters`;
    }
    if (typeof h.color !== 'string' || h.color.length > MAX_COLOR_LENGTH) {
      return `payload.habits[${i}].color must be a string of at most ${MAX_COLOR_LENGTH} characters`;
    }
    const optionalError = validateOptionalHabitFields(h, i);
    if (optionalError) return optionalError;
  }
  if (!isPlainObject(data)) return 'payload.data must be an object';
  if (Object.keys(data).length > MAX_DATA_KEYS)
    return 'payload.data has too many entries';
  for (const [key, days] of Object.entries(data)) {
    if (days !== null && !isPlainObject(days)) {
      return `payload.data["${key.slice(0, 64)}"] must be an object`;
    }
  }
  if (
    chartType !== undefined &&
    (typeof chartType !== 'string' || chartType.length > 32)
  ) {
    return 'payload.chartType must be a short string';
  }
  return null;
}
