import { validateHabitPayload } from './storage.constants';

const base = (habit: Record<string, unknown>) => ({
  habits: [{ id: 1, name: 'Read', color: '#fff', ...habit }],
  data: { '1': {} },
});

describe('validateHabitPayload', () => {
  it('accepts legacy habits without optional fields', () => {
    expect(validateHabitPayload(base({}))).toBeNull();
  });

  it('accepts valid optional fields', () => {
    expect(
      validateHabitPayload(
        base({
          days: [1, 3, 5],
          target: 12,
          reminder: '07:30',
          archived: false,
          amount: 6000,
          unit: 'steps',
        }),
      ),
    ).toBeNull();
    expect(validateHabitPayload(base({ reminder: null }))).toBeNull();
    expect(validateHabitPayload(base({ reminder: '23:59' }))).toBeNull();
    expect(validateHabitPayload(base({ amount: 2.5 }))).toBeNull();
  });

  it.each([
    [{ days: [] }, 'days'],
    [{ days: [1, 1] }, 'days'],
    [{ days: [7] }, 'days'],
    [{ days: [1.5] }, 'days'],
    [{ days: '1,2' }, 'days'],
    [{ target: 0 }, 'target'],
    [{ target: 32 }, 'target'],
    [{ target: 2.5 }, 'target'],
    [{ reminder: '24:00' }, 'reminder'],
    [{ reminder: '7:30' }, 'reminder'],
    [{ reminder: 730 }, 'reminder'],
    [{ archived: 'yes' }, 'archived'],
    [{ amount: 0 }, 'amount'],
    [{ amount: -5 }, 'amount'],
    [{ amount: '6000' }, 'amount'],
    [{ amount: 1e7 }, 'amount'],
    [{ unit: 5 }, 'unit'],
    [{ unit: 'x'.repeat(25) }, 'unit'],
  ])('rejects %j', (habit, field) => {
    expect(validateHabitPayload(base(habit))).toContain(`.${field} `);
  });
});
