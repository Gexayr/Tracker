// All user-facing strings live here. `t` is a live binding: call `setLang()`
// and re-render, and every component reads the new dictionary. Never capture
// `t.something` in a module-level constant.
import { safeStorage } from './utils/storage';

export const LANGS = ['en', 'ru'];
const LANG_KEY = 'lang'; // explicit user choice
const PROFILE_LANG_KEY = 'lang_profile'; // last locale seen on the profile

const LOCALES = { en: 'en-US', ru: 'ru-RU' };

const rulesCache = {};
function pluralRules(locale) {
  if (!rulesCache[locale]) rulesCache[locale] = new Intl.PluralRules(locale);
  return rulesCache[locale];
}

/**
 * Picks a plural form. `forms` is keyed by Intl.PluralRules categories
 * (`one`, `few`, `many`, `other`); a missing category falls back to `other`.
 */
export function pluralFor(locale, n, forms) {
  const cat = pluralRules(locale).select(n);
  return forms[cat] ?? forms.other;
}

const enP = (n, one, other) => pluralFor('en-US', n, { one, other });
// Russian: 1 день, 2 дня, 5 дней; fractions ("other") use the genitive singular like "few".
const ruP = (n, one, few, many) => pluralFor('ru-RU', n, { one, few, many, other: few });

function num(n) {
  return typeof n === 'number' ? formatNumber(n) : n;
}

export const en = {
  langName: 'English',
  langShort: 'EN',
  language: 'Language',
  appName: 'Habit Tracker',
  tagline: 'Small daily wins, tracked month by month.',

  // Auth
  signIn: 'Sign in',
  signUp: 'Sign up',
  signingIn: 'Signing in…',
  creatingAccount: 'Creating account…',
  createAccount: 'Create account',
  email: 'Email',
  password: 'Password',
  nameOptional: 'Name (optional)',
  passwordHint: 'At least 6 characters.',
  showPassword: 'Show password',
  hidePassword: 'Hide password',
  or: 'or',
  loginFailed: 'Sign in failed',
  registerFailed: 'Registration failed',
  googleFailed: 'Google sign-in failed',
  tokenMissing: 'The server did not return a session token.',
  googleNotConfigured: 'Google Sign-In is not configured (REACT_APP_GOOGLE_CLIENT_ID).',
  sessionExpiredTitle: 'Session expired',
  sessionExpired: 'Your session has expired — please sign in again.',
  networkError: 'Network error. Check your connection and try again.',
  rateLimited: 'Too many attempts. Please wait a minute and try again.',
  authModeLabel: 'Account',
  googleUnavailable: 'Google sign-in could not be loaded. You can still sign in with email.',
  inAppTitle: 'Google sign-in doesn’t work here',
  inAppBody: (app) =>
    app
      ? `Google blocks sign-in inside ${app}’s built-in browser. Open this page in Safari or Chrome to use Google, or sign in with email above.`
      : 'Google blocks sign-in inside apps’ built-in browsers. Open this page in Safari or Chrome to use Google, or sign in with email above.',
  inAppHintIos: 'Tip: tap ⋯ or the share icon and choose “Open in Safari”.',
  inAppHintAndroid: 'Tip: tap ⋮ and choose “Open in Chrome”, or use the button.',
  googleTrouble: 'Trouble with Google sign-in?',
  googleTroubleBody:
    'If Google shows an error, this page may be open inside another app’s browser. Copy the link and open it in Safari or Chrome.',
  copyLink: 'Copy link',
  linkCopied: 'Link copied',
  copyFailed: 'Copy the address manually:',
  openInChrome: 'Open in Chrome',

  // Header
  monthNav: 'Month navigation',
  prevMonth: 'Previous month',
  nextMonth: 'Next month',
  today: 'Today',
  goToToday: 'Go to current month',
  themeLight: 'Light theme',
  themeDark: 'Dark theme',
  themeSystem: 'System theme',
  themeToggle: (current) => `Theme: ${current}. Click to change.`,
  account: 'Account menu',
  signedInAs: 'Signed in as',
  logout: 'Log out',
  exportSection: 'Export CSV',
  exportMonth: (label) => `This month (${label})`,
  exportYear: (y) => `Whole year ${y}`,
  exportSummary: (y) => `Monthly summary ${y}`,
  exporting: 'Preparing export…',
  exportFailed: 'Export failed. Try again.',
  exportDone: (name) => `Downloaded ${name}`,

  // Save status
  saving: 'Saving…',
  saved: 'Saved',
  saveFailed: 'Save failed',
  retry: 'Retry',

  // Loading
  loading: 'Loading…',
  loadFailed: 'Could not load this month.',

  // Views
  viewLabel: 'View',
  viewToday: 'Today',
  viewMonth: 'Month',
  viewYear: 'Year',

  // Stats
  statToday: 'Today',
  statTodayHint: 'habits done',
  statTodayRest: 'rest day',
  statMonth: 'Month completion',
  statMonthHintCurrent: 'of scheduled days so far',
  statMonthHintPast: 'of scheduled days',
  statMonthHintFuture: 'not started yet',
  statBestStreak: 'Best streak',
  statBestStreakHint: (name) => (name ? `days · ${name}` : 'days'),
  statHabits: 'Active habits',
  statHabitsHint: 'being tracked',
  statGoals: 'Monthly goals',
  statGoalsHint: (n) => `reached · ${num(n)} ${enP(n, 'habit', 'habits')}`,
  notCurrentMonth: 'not this month',
  dash: '—',

  // Grid
  habit: 'Habit',
  monthPct: '%',
  monthPctLong: 'Month completion',
  streak: 'Streak',
  done: 'done',
  notDone: 'not done',
  future: 'upcoming',
  offDay: 'not scheduled',
  cellLabel: (habit, date, state) => `${habit}, ${date}, ${state}`,
  editHabit: (name) => `Edit ${name}`,
  gridCaption: (month) => `Habit completion for ${month}`,
  noHabits: 'No habits yet. Add your first one below.',

  // Reorder
  dragHandle: (name) => `Reorder ${name}. Drag, or use the up and down arrow keys.`,
  moved: (name, pos, total) => `${name} moved to position ${pos} of ${total}.`,
  moveUp: 'Move up',
  moveDown: 'Move down',
  position: (pos, total) => `Position ${pos} of ${total}`,

  // Today view
  todayOnlyCurrent: 'The Today view shows the current month.',
  markDone: (name) => `Mark ${name} done for today`,
  markNotDone: (name) => `Mark ${name} not done for today`,
  restToday: (name) => `${name} is not scheduled today`,
  restDay: 'Rest day',
  last7: 'Last 7 days',
  days: (n) => `${num(n)} ${enP(n, 'day', 'days')}`,
  streakDays: (n) => `${num(n)}-day streak`,
  bestDays: (n) => `best ${num(n)}`,

  // Habit management
  addHabit: 'Add habit',
  newHabitPlaceholder: 'New habit name',
  add: 'Add',
  cancel: 'Cancel',
  save: 'Save',
  delete: 'Delete',
  deleteHabit: 'Delete habit',
  editTitle: 'Edit habit',
  name: 'Name',
  color: 'Color',
  colorOption: (n) => `Color ${n}`,
  nameRequired: 'Enter a name.',
  nameTooLong: (max) => `Use at most ${max} characters.`,
  nameDuplicate: 'A habit with this name already exists.',
  tooManyHabits: (max) => `You can track up to ${max} habits.`,
  removed: (name) => `Removed “${name}”.`,
  undo: 'Undo',
  dismiss: 'Dismiss',
  close: 'Close',
  schedule: 'Days',
  scheduleHint: 'Unselected days are rest days: they don’t count against progress or break streaks.',
  scheduleEveryDay: 'Every day',
  scheduleNeedOne: 'Pick at least one day.',
  target: 'Monthly goal',
  targetHint: 'Days to complete this month. Leave empty to track % of scheduled days.',
  targetPlaceholder: 'e.g. 20',
  targetInvalid: 'Enter a number from 1 to 31.',
  targetDays: (n) => `${num(n)} ${enP(n, 'day', 'days')}`,
  reminder: 'Reminder',
  reminderHint: 'Reminders only fire while this site is open in a browser tab (a background tab is fine).',
  reminderClear: 'Clear',
  notifUnsupported:
    'This browser can’t show notifications, so you’ll get an in-app reminder instead. On iPhone, add the site to the Home Screen to allow notifications.',
  notifDenied:
    'Notifications are blocked for this site. Allow them in the browser’s site settings, or rely on in-app reminders.',
  notifDefault: 'Your browser will ask for permission to show notifications.',
  notifGranted: 'Notifications are allowed.',
  reminderTitle: (name) => `Time for: ${name}`,
  reminderBody: 'Open your habit tracker to mark it done.',
  reminderToast: (name) => `Time for: ${name}`,
  markDoneShort: 'Mark done',
  archive: 'Archive',
  archived: (name) => `Archived “${name}”.`,
  archivedHabits: (n) => `Archived habits (${num(n)})`,
  archivedHint: 'Archived habits are hidden from this month on. Their history is kept.',
  restore: 'Restore',
  restored: (name) => `Restored “${name}”.`,
  defaultHabits: ['Meditation', 'Workout', 'Read 30 min', 'No sugar'],

  // Progress
  progress: 'Progress',
  progressEmpty: 'Add a habit to see progress.',
  streakShort: (cur, best) => `streak ${num(cur)} · best ${num(best)}`,
  goalOf: (done, target) => `${num(done)} / ${num(target)}`,
  goalLabel: (done, target) => `${num(done)} of ${num(target)} goal days`,
  goalReached: 'Goal reached',
  goalMarker: (n) => `Goal: ${num(n)}`,

  // Chart
  chartTitle: 'Daily completion',
  chartSubtitleDaily: 'Share of scheduled habits done each day',
  chartSubtitleRadar: 'Month completion by habit',
  chartType: 'Chart type',
  chartLine: 'Line',
  chartBar: 'Bar',
  chartRadar: 'Radar',
  chartDay: (d) => `Day ${d}`,
  chartValue: (v) => `${formatPercent(v)} of habits`,
  chartEmpty: 'No data to chart yet.',

  // Year
  yearTitle: (y) => `${y} at a glance`,
  yearSubtitle: 'Share of scheduled habits completed each day. Select a day to open its month.',
  prevYear: 'Previous year',
  nextYear: 'Next year',
  yearLoadFailed: 'Could not load this year.',
  yearCell: (date, done, total) =>
    total ? `${date}: ${num(done)} of ${num(total)} habits` : `${date}: nothing scheduled`,
  yearNoData: 'No data',
  less: 'Less',
  more: 'More',
  yearActiveDays: 'Active days',
  yearPerfectDays: 'Perfect days',
  yearAverage: 'Average',
  yearHover: 'Hover or tap a day to see details.',
  yearOpenMonth: (m) => `Open ${m}`,
  yearMonths: 'Months',

  // CSV
  csvDate: 'date',
  csvWeekday: 'weekday',
  csvHabit: 'habit',
  csvScheduled: 'scheduled',
  csvDone: 'done',
  csvMonth: 'month',
  csvPercent: 'percent',
  csvTarget: 'target',
  csvYes: 'yes',
  csvNo: 'no',
};

export const ru = {
  langName: 'Русский',
  langShort: 'RU',
  language: 'Язык',
  appName: 'Трекер привычек',
  tagline: 'Маленькие победы каждый день — месяц за месяцем.',

  signIn: 'Войти',
  signUp: 'Регистрация',
  signingIn: 'Входим…',
  creatingAccount: 'Создаём аккаунт…',
  createAccount: 'Создать аккаунт',
  email: 'Эл. почта',
  password: 'Пароль',
  nameOptional: 'Имя (необязательно)',
  passwordHint: 'Не меньше 6 символов.',
  showPassword: 'Показать пароль',
  hidePassword: 'Скрыть пароль',
  or: 'или',
  loginFailed: 'Не удалось войти',
  registerFailed: 'Не удалось зарегистрироваться',
  googleFailed: 'Не удалось войти через Google',
  tokenMissing: 'Сервер не вернул токен сессии.',
  googleNotConfigured: 'Вход через Google не настроен (REACT_APP_GOOGLE_CLIENT_ID).',
  sessionExpiredTitle: 'Сессия истекла',
  sessionExpired: 'Срок действия сессии истёк — войдите снова.',
  networkError: 'Ошибка сети. Проверьте подключение и попробуйте ещё раз.',
  rateLimited: 'Слишком много попыток. Подождите минуту и попробуйте снова.',
  authModeLabel: 'Аккаунт',
  googleUnavailable: 'Не удалось загрузить вход через Google. Можно войти по почте.',
  inAppTitle: 'Вход через Google здесь не работает',
  inAppBody: (app) =>
    app
      ? `Google не разрешает вход во встроенном браузере ${app}. Откройте эту страницу в Safari или Chrome, чтобы войти через Google, или войдите по почте выше.`
      : 'Google не разрешает вход во встроенных браузерах приложений. Откройте эту страницу в Safari или Chrome, чтобы войти через Google, или войдите по почте выше.',
  inAppHintIos: 'Подсказка: нажмите ⋯ или «Поделиться» и выберите «Открыть в Safari».',
  inAppHintAndroid: 'Подсказка: нажмите ⋮ и выберите «Открыть в Chrome» или воспользуйтесь кнопкой.',
  googleTrouble: 'Не получается войти через Google?',
  googleTroubleBody:
    'Если Google показывает ошибку, страница, скорее всего, открыта во встроенном браузере другого приложения. Скопируйте ссылку и откройте её в Safari или Chrome.',
  copyLink: 'Скопировать ссылку',
  linkCopied: 'Ссылка скопирована',
  copyFailed: 'Скопируйте адрес вручную:',
  openInChrome: 'Открыть в Chrome',

  monthNav: 'Выбор месяца',
  prevMonth: 'Предыдущий месяц',
  nextMonth: 'Следующий месяц',
  today: 'Сегодня',
  goToToday: 'К текущему месяцу',
  themeLight: 'Светлая тема',
  themeDark: 'Тёмная тема',
  themeSystem: 'Как в системе',
  themeToggle: (current) => `${current}. Нажмите, чтобы сменить тему.`,
  account: 'Меню аккаунта',
  signedInAs: 'Вы вошли как',
  logout: 'Выйти',
  exportSection: 'Экспорт в CSV',
  exportMonth: (label) => `Этот месяц (${label})`,
  exportYear: (y) => `Весь ${y} год`,
  exportSummary: (y) => `Итоги по месяцам за ${y}`,
  exporting: 'Готовим файл…',
  exportFailed: 'Не удалось выгрузить данные. Попробуйте ещё раз.',
  exportDone: (name) => `Файл ${name} скачан`,

  saving: 'Сохраняем…',
  saved: 'Сохранено',
  saveFailed: 'Не сохранилось',
  retry: 'Повторить',

  loading: 'Загрузка…',
  loadFailed: 'Не удалось загрузить этот месяц.',

  viewLabel: 'Вид',
  viewToday: 'Сегодня',
  viewMonth: 'Месяц',
  viewYear: 'Год',

  statToday: 'Сегодня',
  statTodayHint: 'привычек выполнено',
  statTodayRest: 'день отдыха',
  statMonth: 'Итог месяца',
  statMonthHintCurrent: 'запланированных дней на сегодня',
  statMonthHintPast: 'запланированных дней',
  statMonthHintFuture: 'ещё не начался',
  statBestStreak: 'Лучшая серия',
  statBestStreakHint: (name) => (name ? `дн. подряд · ${name}` : 'дн. подряд'),
  statHabits: 'Активные привычки',
  statHabitsHint: 'отслеживается',
  statGoals: 'Цели месяца',
  statGoalsHint: (n) => `достигнуто · ${num(n)} ${ruP(n, 'привычка', 'привычки', 'привычек')}`,
  notCurrentMonth: 'не текущий месяц',
  dash: '—',

  habit: 'Привычка',
  monthPct: '%',
  monthPctLong: 'Выполнение за месяц',
  streak: 'Серия',
  done: 'выполнено',
  notDone: 'не выполнено',
  future: 'впереди',
  offDay: 'не запланировано',
  cellLabel: (habit, date, state) => `${habit}, ${date}, ${state}`,
  editHabit: (name) => `Изменить «${name}»`,
  gridCaption: (month) => `Выполнение привычек: ${month}`,
  noHabits: 'Привычек пока нет. Добавьте первую ниже.',

  dragHandle: (name) => `Переместить «${name}». Перетащите или используйте стрелки вверх и вниз.`,
  moved: (name, pos, total) => `«${name}» теперь на ${pos}-м месте из ${total}.`,
  moveUp: 'Выше',
  moveDown: 'Ниже',
  position: (pos, total) => `Место ${pos} из ${total}`,

  todayOnlyCurrent: 'Вид «Сегодня» показывает только текущий месяц.',
  markDone: (name) => `Отметить «${name}» выполненной сегодня`,
  markNotDone: (name) => `Снять отметку «${name}» за сегодня`,
  restToday: (name) => `«${name}» сегодня не запланирована`,
  restDay: 'Выходной',
  last7: 'Последние 7 дней',
  days: (n) => `${num(n)} ${ruP(n, 'день', 'дня', 'дней')}`,
  streakDays: (n) => `серия: ${num(n)} ${ruP(n, 'день', 'дня', 'дней')}`,
  bestDays: (n) => `рекорд ${num(n)}`,

  addHabit: 'Добавить привычку',
  newHabitPlaceholder: 'Название новой привычки',
  add: 'Добавить',
  cancel: 'Отмена',
  save: 'Сохранить',
  delete: 'Удалить',
  deleteHabit: 'Удалить привычку',
  editTitle: 'Настройки привычки',
  name: 'Название',
  color: 'Цвет',
  colorOption: (n) => `Цвет ${n}`,
  nameRequired: 'Введите название.',
  nameTooLong: (max) => `Не больше ${max} ${ruP(max, 'символа', 'символов', 'символов')}.`,
  nameDuplicate: 'Привычка с таким названием уже есть.',
  tooManyHabits: (max) => `Можно отслеживать не больше ${max} привычек.`,
  removed: (name) => `«${name}» удалена.`,
  undo: 'Отменить',
  dismiss: 'Закрыть',
  close: 'Закрыть',
  schedule: 'Дни',
  scheduleHint: 'Невыбранные дни — выходные: они не влияют на прогресс и не прерывают серию.',
  scheduleEveryDay: 'Каждый день',
  scheduleNeedOne: 'Выберите хотя бы один день.',
  target: 'Цель на месяц',
  targetHint: 'Сколько дней выполнить за месяц. Оставьте пустым, чтобы считать % от запланированных дней.',
  targetPlaceholder: 'например, 20',
  targetInvalid: 'Введите число от 1 до 31.',
  targetDays: (n) => `${num(n)} ${ruP(n, 'день', 'дня', 'дней')}`,
  reminder: 'Напоминание',
  reminderHint: 'Напоминания срабатывают, только пока сайт открыт во вкладке браузера (можно в фоне).',
  reminderClear: 'Убрать',
  notifUnsupported:
    'Этот браузер не умеет показывать уведомления, поэтому напоминание появится внутри приложения. На iPhone сначала добавьте сайт на экран «Домой».',
  notifDenied:
    'Уведомления для сайта запрещены. Разрешите их в настройках сайта в браузере или пользуйтесь напоминаниями внутри приложения.',
  notifDefault: 'Браузер спросит разрешение на уведомления.',
  notifGranted: 'Уведомления разрешены.',
  reminderTitle: (name) => `Пора: ${name}`,
  reminderBody: 'Откройте трекер, чтобы отметить выполнение.',
  reminderToast: (name) => `Пора: ${name}`,
  markDoneShort: 'Отметить',
  archive: 'В архив',
  archived: (name) => `«${name}» перенесена в архив.`,
  archivedHabits: (n) => `Архив (${num(n)})`,
  archivedHint: 'Привычки из архива скрыты начиная с этого месяца. История сохраняется.',
  restore: 'Вернуть',
  restored: (name) => `«${name}» возвращена.`,
  defaultHabits: ['Медитация', 'Тренировка', 'Чтение 30 минут', 'Без сахара'],

  progress: 'Прогресс',
  progressEmpty: 'Добавьте привычку, чтобы увидеть прогресс.',
  streakShort: (cur, best) => `серия ${num(cur)} · рекорд ${num(best)}`,
  goalOf: (done, target) => `${num(done)} / ${num(target)}`,
  goalLabel: (done, target) => `выполнено ${num(done)} из ${num(target)} по цели`,
  goalReached: 'Цель достигнута',
  goalMarker: (n) => `Цель: ${num(n)}`,

  chartTitle: 'Выполнение по дням',
  chartSubtitleDaily: 'Доля запланированных привычек, выполненных за день',
  chartSubtitleRadar: 'Выполнение за месяц по привычкам',
  chartType: 'Тип графика',
  chartLine: 'Линия',
  chartBar: 'Столбцы',
  chartRadar: 'Радар',
  chartDay: (d) => `${d}-е число`,
  chartValue: (v) => `выполнено ${formatPercent(v)} привычек`,
  chartEmpty: 'Пока нечего показать.',

  yearTitle: (y) => `${y} год целиком`,
  yearSubtitle: 'Доля запланированных привычек, выполненных за день. Выберите день, чтобы открыть его месяц.',
  prevYear: 'Предыдущий год',
  nextYear: 'Следующий год',
  yearLoadFailed: 'Не удалось загрузить этот год.',
  yearCell: (date, done, total) =>
    total
      ? `${date}: ${num(done)} из ${num(total)} ${ruP(total, 'привычки', 'привычек', 'привычек')}`
      : `${date}: ничего не запланировано`,
  yearNoData: 'Нет данных',
  less: 'Меньше',
  more: 'Больше',
  yearActiveDays: 'Активных дней',
  yearPerfectDays: 'Идеальных дней',
  yearAverage: 'В среднем',
  yearHover: 'Наведите или нажмите на день, чтобы увидеть подробности.',
  yearOpenMonth: (m) => `Открыть: ${m}`,
  yearMonths: 'Месяцы',

  csvDate: 'дата',
  csvWeekday: 'день недели',
  csvHabit: 'привычка',
  csvScheduled: 'запланировано',
  csvDone: 'выполнено',
  csvMonth: 'месяц',
  csvPercent: 'процент',
  csvTarget: 'цель',
  csvYes: 'да',
  csvNo: 'нет',
};

const DICTS = { en, ru };

export function normalizeLang(value) {
  if (typeof value !== 'string') return null;
  const v = value.trim().toLowerCase();
  if (v.startsWith('ru')) return 'ru';
  if (v.startsWith('en')) return 'en';
  return null;
}

function browserLang() {
  try {
    return normalizeLang(navigator.language) === 'ru' ? 'ru' : 'en';
  } catch (_) {
    return 'en';
  }
}

/** Saved choice -> last known profile locale -> browser language -> en. */
export function detectLang() {
  return (
    normalizeLang(safeStorage.get(LANG_KEY)) ||
    normalizeLang(safeStorage.get(PROFILE_LANG_KEY)) ||
    browserLang()
  );
}

export const hasSavedLang = () => !!normalizeLang(safeStorage.get(LANG_KEY));

let current = 'en';
export let t = en;

function apply(lang) {
  current = DICTS[lang] ? lang : 'en';
  t = DICTS[current];
  try {
    document.documentElement.lang = current;
    document.title = t.appName;
  } catch (_) {
    /* non-DOM env */
  }
}

/** Switch the active language. `persist` stores it as the explicit choice. */
export function setLang(lang, { persist = false } = {}) {
  const l = normalizeLang(lang) || 'en';
  if (persist) safeStorage.set(LANG_KEY, l);
  apply(l);
  return l;
}

/** Remember the profile locale (used while the user never chose explicitly). */
export function rememberProfileLang(lang) {
  const l = normalizeLang(lang);
  if (l) safeStorage.set(PROFILE_LANG_KEY, l);
  return l;
}

export const getLang = () => current;
export const getLocale = () => LOCALES[current];

const numCache = {};
export function formatNumber(n, options) {
  const locale = getLocale();
  const k = `${locale}|${JSON.stringify(options || {})}`;
  if (!numCache[k]) numCache[k] = new Intl.NumberFormat(locale, options);
  return numCache[k].format(n);
}

/** 0..100 -> "50%" (en) / "50 %" (ru). */
export const formatPercent = (v) =>
  formatNumber(v / 100, { style: 'percent', maximumFractionDigits: 0 });

/** Plural form in the active locale. */
export const plural = (n, forms) => pluralFor(getLocale(), n, forms);

apply(detectLang());
