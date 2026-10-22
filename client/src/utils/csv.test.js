import { setLang } from '../i18n';
import { csvBlobText, csvFilename, csvSeparator, dailyRows, summaryRows, toCsv } from './csv';

afterEach(() => setLang('en'));

const months = [
  {
    year: 2026,
    month: 9,
    payload: {
      habits: [
        { id: 1, name: 'Run, fast', days: [1, 3, 5], target: 2 },
        { id: 2, name: 'Чтение "книг"', amount: 50, unit: 'pages' },
        { id: 3, name: 'Old', archived: true },
      ],
      data: { 1: { 2: true, 5: true }, 2: { 1: 50, 2: 20, 3: 60 }, 3: { 1: true } },
    },
  },
];

test('daily rows: one row per habit per elapsed day, archived excluded', () => {
  setLang('en');
  const rows = dailyRows(months, new Date(2026, 9, 3));
  expect(rows[0]).toEqual(['date', 'weekday', 'habit', 'scheduled', 'done', 'amount']);
  expect(rows.slice(1)).toEqual([
    ['2026-10-01', 'Thursday', 'Run, fast', 'no', 0, ''],
    ['2026-10-01', 'Thursday', 'Чтение "книг"', 'yes', 1, 50],
    ['2026-10-02', 'Friday', 'Run, fast', 'yes', 1, ''],
    ['2026-10-02', 'Friday', 'Чтение "книг"', 'yes', 0, 20],
    ['2026-10-03', 'Saturday', 'Run, fast', 'no', 0, ''],
    ['2026-10-03', 'Saturday', 'Чтение "книг"', 'yes', 1, 60],
  ]);
});

test('summary rows per habit per month', () => {
  setLang('en');
  const rows = summaryRows(months, new Date(2026, 10, 15)); // October is complete
  expect(rows[0]).toEqual(['habit', 'month', 'done', 'scheduled', 'percent', 'target']);
  expect(rows[1]).toEqual(['Run, fast', '2026-10', 2, 13, 15, 2]);
  expect(rows[2]).toEqual(['Чтение "книг"', '2026-10', 2, 31, 6, '']);
  expect(summaryRows(months, new Date(2026, 8, 1)).length).toBe(1); // future month skipped
});

test('escaping, formula neutralization, BOM, CRLF', () => {
  const csv = toCsv([['a,b', 'say "hi"', '=SUM(A1)', 'x\ny', 3]], ',');
  expect(csv).toBe('"a,b","say ""hi""",\'=SUM(A1),"x\ny",3\r\n');
  expect(csvBlobText([['я']], ',').charCodeAt(0)).toBe(0xfeff);
  expect(toCsv([['a;b', 'c']], ';')).toBe('"a;b";c\r\n');
});

test('separator, filenames and localized headers', () => {
  expect(csvSeparator('en')).toBe(',');
  expect(csvSeparator('ru')).toBe(';');
  expect(csvFilename('month', 2026, 9)).toBe('habits-2026-10.csv');
  expect(csvFilename('year', 2026)).toBe('habits-2026.csv');
  expect(csvFilename('summary', 2026)).toBe('habits-summary-2026.csv');
  setLang('ru');
  const rows = dailyRows(months, new Date(2026, 9, 1));
  expect(rows[0]).toEqual(['дата', 'день недели', 'привычка', 'запланировано', 'выполнено', 'количество']);
  expect(rows[1]).toEqual(['2026-10-01', 'четверг', 'Run, fast', 'нет', 0, '']);
});
