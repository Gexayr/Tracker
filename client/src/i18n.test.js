import { en, formatPercent, getLang, normalizeLang, pluralFor, ru, setLang, t } from './i18n';
import { formatMonthYear } from './utils/date';

afterEach(() => setLang('en'));

test('russian plural forms', () => {
  const forms = { one: 'день', few: 'дня', many: 'дней', other: 'дня' };
  const cases = { 0: 'дней', 1: 'день', 2: 'дня', 4: 'дня', 5: 'дней', 11: 'дней', 12: 'дней', 14: 'дней', 21: 'день', 22: 'дня', 25: 'дней', 101: 'день', 111: 'дней' };
  Object.entries(cases).forEach(([n, w]) => expect(pluralFor('ru-RU', Number(n), forms)).toBe(w));
  expect(ru.days(1)).toBe('1 день');
  expect(ru.days(2)).toBe('2 дня');
  expect(ru.days(5)).toBe('5 дней');
  expect(ru.days(21)).toBe('21 день');
  expect(ru.streakDays(3)).toBe('серия: 3 дня');
});

test('english plural forms', () => {
  expect(en.days(1)).toBe('1 day');
  expect(en.days(0)).toBe('0 days');
  expect(en.days(2)).toBe('2 days');
});

test('ru dictionary covers every key with the same kind of value', () => {
  Object.keys(en).forEach((k) => {
    expect(ru).toHaveProperty(k);
    expect(typeof ru[k]).toBe(typeof en[k]);
  });
  expect(Object.keys(ru).sort()).toEqual(Object.keys(en).sort());
});

test('setLang switches the live binding, <html lang> and Intl formatting', () => {
  setLang('ru');
  expect(getLang()).toBe('ru');
  expect(t.signIn).toBe('Войти');
  expect(document.documentElement.lang).toBe('ru');
  expect(formatMonthYear(2026, 9)).toBe('Октябрь 2026');
  expect(formatPercent(50)).toMatch(/^50\s%$/);
  setLang('en');
  expect(t.signIn).toBe('Sign in');
  expect(formatMonthYear(2026, 9)).toBe('October 2026');
  expect(formatPercent(50)).toBe('50%');
});

test('normalizeLang', () => {
  expect(normalizeLang('ru-RU')).toBe('ru');
  expect(normalizeLang('en-GB')).toBe('en');
  expect(normalizeLang('de')).toBe(null);
  expect(normalizeLang(undefined)).toBe(null);
});
