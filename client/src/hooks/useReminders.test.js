import { dueReminders } from './useReminders';
import { isTokenExpired } from '../utils/session';

const habits = [
  { id: 1, name: 'Run', reminder: '08:00' },
  { id: 2, name: 'Gym', reminder: '08:00', days: [1] }, // Mondays only
  { id: 3, name: 'Read', reminder: '21:00' },
  { id: 4, name: 'Old', reminder: '08:00', archived: true },
  { id: 5, name: 'None' },
];

test('due reminders: scheduled today, not done, time passed, not fired, within 1h', () => {
  const tue = new Date(2026, 9, 13, 8, 5); // Tuesday 08:05
  expect(dueReminders(habits, {}, tue, new Set()).map((h) => h.id)).toEqual([1]);
  expect(dueReminders(habits, { 1: { 13: true } }, tue, new Set())).toEqual([]);
  expect(dueReminders(habits, {}, tue, new Set(['2026-10-13|1|08:00']))).toEqual([]);
  const mon = new Date(2026, 9, 12, 8, 0);
  expect(dueReminders(habits, {}, mon, new Set()).map((h) => h.id)).toEqual([1, 2]);
  expect(dueReminders(habits, {}, new Date(2026, 9, 13, 9, 30), new Set())).toEqual([]); // too late
  expect(dueReminders(habits, {}, new Date(2026, 9, 13, 7, 59), new Set())).toEqual([]);
});

test('isTokenExpired', () => {
  const b = (o) => btoa(JSON.stringify(o)).replace(/=+$/, '');
  const tok = (exp) => `${b({ alg: 'HS256' })}.${b({ sub: 1, exp })}.sig`;
  expect(isTokenExpired(tok(1000), 2000 * 1000)).toBe(true);
  expect(isTokenExpired(tok(3000), 2000 * 1000)).toBe(false);
  expect(isTokenExpired('garbage')).toBe(false);
  expect(isTokenExpired(`${b({})}.${b({ sub: 1 })}.x`)).toBe(false);
});
