import { dailyCompletion, habitStats, isDone, isMeasurable, normalizeAmount, overallStats } from './progress';

// October 2026: the 1st is a Thursday. Mondays: 5, 12, 19, 26. Wednesdays: 7, 14, 21, 28.
const MON_WED_FRI = { id: 1, name: 'Gym', days: [1, 3, 5] };

test('only scheduled days count towards percent', () => {
  const now = new Date(2026, 9, 12); // Monday
  // Scheduled so far: Fri 2, Mon 5, Wed 7, Fri 9, Mon 12 = 5 days.
  const s = habitStats({ 2: true, 5: true, 7: true, 4: true }, 2026, 9, now, MON_WED_FRI);
  expect(s.eligible).toBe(5);
  expect(s.done).toBe(3); // the 4th (Sunday) is not scheduled and does not count
  expect(s.percent).toBe(60);
});

test('streaks skip unscheduled days instead of breaking', () => {
  const now = new Date(2026, 9, 12);
  const s = habitStats({ 2: true, 5: true, 7: true, 9: true }, 2026, 9, now, MON_WED_FRI);
  // 2 (Fri) -> 5 (Mon) -> 7 (Wed) -> 9 (Fri): weekend/Tue/Thu are rest days.
  expect(s.bestStreak).toBe(4);
  // Today (Mon 12) is still open, so the streak continues.
  expect(s.currentStreak).toBe(4);
  // A missed scheduled day breaks it.
  const broken = habitStats({ 2: true, 7: true, 9: true }, 2026, 9, now, MON_WED_FRI);
  expect(broken.bestStreak).toBe(2);
});

test('rest day today: streak counts back from the last scheduled day', () => {
  const now = new Date(2026, 9, 13); // Tuesday, not scheduled
  const s = habitStats({ 9: true, 12: true }, 2026, 9, now, MON_WED_FRI);
  expect(s.currentStreak).toBe(2);
  expect(s.eligible).toBe(5);
});

test('no scheduled day yet -> percent is null', () => {
  const now = new Date(2026, 9, 1); // Thursday
  const s = habitStats({}, 2026, 9, now, { id: 1, days: [0] });
  expect(s.eligible).toBe(0);
  expect(s.percent).toBe(null);
});

test('monthly target', () => {
  const now = new Date(2026, 9, 12);
  const h = { id: 1, target: 3 };
  const s = habitStats({ 1: true, 2: true }, 2026, 9, now, h);
  expect(s).toMatchObject({ target: 3, targetReached: false, scheduledInMonth: 31 });
  expect(habitStats({ 1: true, 2: true, 3: true }, 2026, 9, now, h).targetReached).toBe(true);
  expect(habitStats({}, 2026, 9, now, { id: 1, target: 0 }).target).toBe(null);
  expect(habitStats({}, 2026, 9, now, { ...MON_WED_FRI, target: 12 }).scheduledInMonth).toBe(13);
});

test('daily and overall completion only consider scheduled habits', () => {
  const now = new Date(2026, 9, 5); // Thu 1, Fri 2, Sat 3, Sun 4, Mon 5
  const habits = [{ id: 10 }, { ...MON_WED_FRI, id: 20 }];
  const data = { 10: { 1: true, 5: true }, 20: { 2: true } };
  expect(dailyCompletion(habits, data, 2026, 9, now).slice(0, 6)).toEqual([100, 50, 0, 0, 50, null]);
  expect(overallStats(habits, data, 2026, 9, now)).toEqual({ done: 3, eligible: 7, percent: 43 });
  // A day where nothing is scheduled is a gap, not 0%.
  expect(dailyCompletion([{ id: 1, days: [1] }], {}, 2026, 9, now).slice(0, 5)).toEqual([null, null, null, null, 0]);
});

test('measurable habits: a day is done once the amount reaches the daily goal', () => {
  const steps = { id: 1, name: 'Walk', amount: 6000, unit: 'steps' };
  expect(isMeasurable(steps)).toBe(true);
  expect(isMeasurable({ id: 2, name: 'Read' })).toBe(false);
  expect(isDone(steps, 6000)).toBe(true);
  expect(isDone(steps, 7200)).toBe(true);
  expect(isDone(steps, 5999)).toBe(false);
  expect(isDone(steps, undefined)).toBe(false);
  expect(isDone(steps, true)).toBe(true); // marked before it became measurable
  expect(isDone({ id: 2, name: 'Read' }, 3)).toBe(true); // amount kept after it became plain

  const now = new Date(2026, 9, 31);
  const s = habitStats({ 1: 6000, 2: 3000, 3: 6500, 4: 8000 }, 2026, 9, now, steps);
  expect(s.done).toBe(3);
  expect(s.bestStreak).toBe(2);
});

test('amount normalization', () => {
  expect(normalizeAmount('6000')).toBe(6000);
  expect(normalizeAmount('2,5')).toBe(2.5);
  expect(normalizeAmount(0)).toBeNull();
  expect(normalizeAmount(-1)).toBeNull();
  expect(normalizeAmount('abc')).toBeNull();
  expect(normalizeAmount(1e7)).toBeNull();
});
