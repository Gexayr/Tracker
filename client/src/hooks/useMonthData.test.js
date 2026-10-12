import { act, renderHook, waitFor } from '@testing-library/react';
import { useMonthData } from './useMonthData';
import { habitStats } from '../utils/progress';

const server = {};
let puts = [];
let failGet = false;
let delays = {};
function mockFetch(url, opts = {}) {
  const u = new URL(url);
  const m = (opts.method || 'GET');
  return new Promise((resolve, reject) => {
    const d = delays[u.pathname] || 5;
    const timer = setTimeout(() => {
      if (m === 'GET') {
        if (failGet) return resolve({ ok: false, status: failGet, json: async () => ({ message: 'boom' }) });
        const k = u.pathname.replace('/storage/', '');
        resolve({ ok: true, status: 200, json: async () => ({ payload: server[k] ?? null }) });
      } else {
        const b = JSON.parse(opts.body);
        puts.push(b);
        server[`${b.year}/${b.month}`] = b.payload;
        resolve({ ok: true, status: 200, json: async () => ({}) });
      }
    }, d);
    opts.signal?.addEventListener('abort', () => { clearTimeout(timer); const e = new Error('aborted'); e.name = 'AbortError'; reject(e); });
  });
}

beforeEach(() => {
  global.fetch = jest.fn(mockFetch);
  puts = []; failGet = false; delays = {};
  Object.keys(server).forEach((k) => delete server[k]);
});

test('first load does not overwrite saved month; month switch does not leak', async () => {
  server['2026/9'] = { habits: [{ id: 7, name: 'Run', color: '#2a78d6' }], data: { 7: { 3: true } }, chartType: 'bar' };
  server['2026/10'] = { habits: [{ id: 8, name: 'Swim', color: '#eb6834' }], data: {}, chartType: 'line' };
  const onUnauth = jest.fn();
  const { result, rerender } = renderHook((p) => useMonthData(p), { initialProps: { token: 'x', year: 2026, month: 9, onUnauthorized: onUnauth } });
  expect(result.current.status).toBe('loading');
  await waitFor(() => expect(result.current.status).toBe('ready'));
  await new Promise((r) => setTimeout(r, 700));
  expect(puts.length).toBe(0);
  expect(result.current.habits[0].name).toBe('Run');

  act(() => { result.current.toggleDay(7, 4); });
  // switch month before debounce fires
  rerender({ token: 'x', year: 2026, month: 10, onUnauthorized: onUnauth });
  await waitFor(() => expect(result.current.status).toBe('ready'));
  await new Promise((r) => setTimeout(r, 700));
  expect(puts.length).toBe(1);
  expect(puts[0].month).toBe(9);
  expect(puts[0].payload.data[7]).toEqual({ 3: true, 4: true });
  expect(server['2026/10'].habits[0].name).toBe('Swim');
  expect(result.current.habits[0].name).toBe('Swim');
});

test('immutable toggle & debounce coalesces', async () => {
  server['2026/9'] = { habits: [{ id: 7, name: 'Run', color: '#2a78d6' }], data: { 7: { 3: true } } };
  const { result } = renderHook(() => useMonthData({ token: 'x', year: 2026, month: 9, onUnauthorized: () => {} }));
  await waitFor(() => expect(result.current.status).toBe('ready'));
  const before = result.current.data;
  const beforeInner = before[7];
  act(() => { result.current.toggleDay(7, 5); result.current.toggleDay(7, 6); result.current.toggleDay(7, 3); });
  expect(beforeInner).toEqual({ 3: true });
  expect(result.current.data[7]).toEqual({ 5: true, 6: true });
  await waitFor(() => expect(result.current.saveStatus).toBe('saved'));
  expect(puts.length).toBe(1);
});

test('failed load never writes defaults; 401 logs out', async () => {
  failGet = 500;
  const onUnauth = jest.fn();
  const { result, rerender } = renderHook((p) => useMonthData(p), { initialProps: { token: 'x', year: 2026, month: 9, onUnauthorized: onUnauth } });
  await waitFor(() => expect(result.current.status).toBe('error'));
  act(() => { result.current.toggleDay(1, 1); });
  await new Promise((r) => setTimeout(r, 700));
  expect(puts.length).toBe(0);
  failGet = 401;
  rerender({ token: 'x', year: 2026, month: 8, onUnauthorized: onUnauth });
  await waitFor(() => expect(onUnauth).toHaveBeenCalled());
  expect(puts.length).toBe(0);
});

test('null payload seeds from previous month habits, stale response ignored', async () => {
  server['2026/9'] = { habits: [{ id: 7, name: 'Run', color: '#2a78d6' }], data: { 7: { 3: true } } };
  const { result, rerender } = renderHook((p) => useMonthData(p), { initialProps: { token: 'x', year: 2026, month: 9, onUnauthorized: () => {} } });
  await waitFor(() => expect(result.current.status).toBe('ready'));
  delays['/storage/2026/10'] = 200;
  rerender({ token: 'x', year: 2026, month: 10, onUnauthorized: () => {} });
  rerender({ token: 'x', year: 2026, month: 11, onUnauthorized: () => {} });
  await waitFor(() => expect(result.current.status).toBe('ready'));
  expect(result.current.key).toBe('2026-11');
  expect(result.current.habits.map((h) => h.name)).toEqual(['Run']);
  expect(result.current.data).toEqual({ 7: {} });
  await waitFor(() => expect(puts.length).toBe(1));
  expect(puts[0].month).toBe(11);
  await new Promise((r) => setTimeout(r, 300));
  expect(result.current.key).toBe('2026-11');
});

test('remove + undo', async () => {
  server['2026/9'] = { habits: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }], data: { 1: { 1: true }, 2: { 2: true } } };
  const { result } = renderHook(() => useMonthData({ token: 'x', year: 2026, month: 9, onUnauthorized: () => {} }));
  await waitFor(() => expect(result.current.status).toBe('ready'));
  let removed;
  act(() => { removed = result.current.removeHabit(1); });
  expect(result.current.habits.map((h) => h.id)).toEqual([2]);
  act(() => { result.current.restoreHabit(removed); });
  expect(result.current.habits.map((h) => h.id)).toEqual([1, 2]);
  expect(result.current.data[1]).toEqual({ 1: true });
});

test('stats', () => {
  const now = new Date(2026, 9, 12);
  const e = { 1: true, 2: true, 3: true, 5: true, 10: true, 11: true };
  const s = habitStats(e, 2026, 9, now);
  expect(s).toEqual({ done: 6, eligible: 12, percent: 50, currentStreak: 2, bestStreak: 3 });
  expect(habitStats({ ...e, 12: true }, 2026, 9, now).currentStreak).toBe(3);
  expect(habitStats(e, 2026, 10, now).percent).toBe(null);
  expect(habitStats({ 30: true }, 2026, 8, now).percent).toBe(3);
});
