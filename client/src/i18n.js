// All user-facing strings live here so another language (e.g. `ru`) can be
// added later by providing an object with the same shape.

export const LOCALE = 'en-US';

export const en = {
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
  sessionExpired: 'Your session has expired. Please sign in again.',
  networkError: 'Network error. Check your connection and try again.',
  authModeLabel: 'Account',

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

  // Stats
  statToday: 'Today',
  statTodayHint: 'habits done',
  statMonth: 'Month completion',
  statMonthHintCurrent: 'of days so far',
  statMonthHintPast: 'of all days',
  statMonthHintFuture: 'not started yet',
  statBestStreak: 'Best streak',
  statBestStreakHint: (name) => (name ? `days · ${name}` : 'days'),
  statHabits: 'Active habits',
  statHabitsHint: 'being tracked',
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
  cellLabel: (habit, date, state) => `${habit}, ${date}, ${state}`,
  editHabit: (name) => `Edit ${name}`,
  gridCaption: (month) => `Habit completion for ${month}`,
  noHabits: 'No habits yet. Add your first one below.',

  // Today view
  todayOnlyCurrent: 'The Today view shows the current month.',
  markDone: (name) => `Mark ${name} done for today`,
  markNotDone: (name) => `Mark ${name} not done for today`,
  last7: 'Last 7 days',
  streakDays: (n) => `${n} day streak`,
  bestDays: (n) => `best ${n}`,

  // Habit management
  addHabit: 'Add habit',
  newHabitPlaceholder: 'New habit name',
  add: 'Add',
  cancel: 'Cancel',
  save: 'Save',
  delete: 'Delete habit',
  editTitle: 'Edit habit',
  name: 'Name',
  color: 'Color',
  colorOption: (n) => `Color ${n}`,
  nameRequired: 'Enter a name.',
  nameTooLong: (max) => `Use at most ${max} characters.`,
  nameDuplicate: 'A habit with this name already exists.',
  removed: (name) => `Removed “${name}”.`,
  undo: 'Undo',
  dismiss: 'Dismiss',
  close: 'Close',

  // Progress
  progress: 'Progress',
  progressEmpty: 'Add a habit to see progress.',
  streakShort: (cur, best) => `streak ${cur} · best ${best}`,

  // Chart
  chartTitle: 'Daily completion',
  chartSubtitleDaily: 'Share of habits done each day',
  chartSubtitleRadar: 'Month completion by habit',
  chartType: 'Chart type',
  chartLine: 'Line',
  chartBar: 'Bar',
  chartRadar: 'Radar',
  chartDay: (d) => `Day ${d}`,
  chartValue: (v) => `${v}% of habits`,
  chartEmpty: 'No data to chart yet.',
};

export const t = en;
