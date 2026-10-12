// Categorical habit palette (validated with the dataviz validator for both
// modes: lightness band, chroma floor, adjacent CVD separation, normal-vision
// floor). Stored value is always the light hex; the dark step is looked up at
// render time so the same habit keeps its identity across themes.
export const HABIT_PALETTE = [
  { light: '#2a78d6', dark: '#3987e5' }, // blue
  { light: '#eb6834', dark: '#d95926' }, // orange
  { light: '#1baf7a', dark: '#199e70' }, // aqua
  { light: '#eda100', dark: '#c98500' }, // yellow
  { light: '#e87ba4', dark: '#d55181' }, // magenta
  { light: '#008300', dark: '#008300' }, // green
  { light: '#4a3aa7', dark: '#9085e9' }, // violet
  { light: '#e34948', dark: '#e66767' }, // red
];

// Pastel colors used by older versions of the app -> nearest palette hue.
const LEGACY = {
  '#8ecae6': 0,
  '#219ebc': 2,
  '#ffd166': 3,
  '#06d6a0': 5,
  '#f783ac': 4,
  '#bdb2ff': 6,
  '#ffb4a2': 1,
};

const BY_HEX = HABIT_PALETTE.reduce((acc, p, i) => {
  acc[p.light] = i;
  acc[p.dark] = i;
  return acc;
}, {});

export const DEFAULT_HABITS = [
  { id: 1, name: 'Meditation', color: HABIT_PALETTE[0].light },
  { id: 2, name: 'Workout', color: HABIT_PALETTE[1].light },
  { id: 3, name: 'Read 30 min', color: HABIT_PALETTE[2].light },
  { id: 4, name: 'No sugar', color: HABIT_PALETTE[3].light },
];

function normalizeHex(hex) {
  if (typeof hex !== 'string') return null;
  let h = hex.trim().toLowerCase();
  if (!h.startsWith('#')) h = `#${h}`;
  if (/^#[0-9a-f]{3}$/.test(h)) h = `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`;
  return /^#[0-9a-f]{6}$/.test(h) ? h : null;
}

/** Palette index for a stored color, or -1 for an arbitrary custom color. */
export function paletteIndex(hex) {
  const h = normalizeHex(hex);
  if (!h) return -1;
  if (h in BY_HEX) return BY_HEX[h];
  if (h in LEGACY) return LEGACY[h];
  return -1;
}

/** Color to render for a stored habit color in the given theme. */
export function habitColor(hex, theme) {
  const i = paletteIndex(hex);
  if (i >= 0) return HABIT_PALETTE[i][theme === 'dark' ? 'dark' : 'light'];
  return normalizeHex(hex) || HABIT_PALETTE[0][theme === 'dark' ? 'dark' : 'light'];
}

/** First palette color not used by the given habits (fixed order). */
export function nextHabitColor(habits) {
  const used = new Set(habits.map((h) => paletteIndex(h.color)));
  for (let i = 0; i < HABIT_PALETTE.length; i++) if (!used.has(i)) return HABIT_PALETTE[i].light;
  return HABIT_PALETTE[habits.length % HABIT_PALETTE.length].light;
}

function channel(c) {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex) {
  const h = normalizeHex(hex) || '#000000';
  const r = parseInt(h.slice(1, 3), 16);
  const g = parseInt(h.slice(3, 5), 16);
  const b = parseInt(h.slice(5, 7), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

const contrast = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/** White or near-black, whichever contrasts more with the background. */
export function textOn(hex) {
  const l = luminance(hex);
  const dark = '#141413';
  return contrast(l, 1) >= contrast(l, luminance(dark)) ? '#ffffff' : dark;
}

export function withAlpha(hex, alpha) {
  const h = normalizeHex(hex) || '#000000';
  const r = parseInt(h.slice(1, 3), 16);
  const g = parseInt(h.slice(3, 5), 16);
  const b = parseInt(h.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Chart chrome per theme (mirrors the CSS tokens in styles.css).
export const CHART_THEME = {
  light: {
    series: '#2a78d6',
    surface: '#ffffff',
    text: '#161614',
    textMuted: '#6b6a65',
    grid: '#e8e7e1',
    axis: '#c3c2b7',
    tooltipBg: '#ffffff',
    tooltipBorder: 'rgba(11, 11, 11, 0.14)',
  },
  dark: {
    series: '#3987e5',
    surface: '#1a1a19',
    text: '#f3f3f0',
    textMuted: '#a3a199',
    grid: '#2c2c2a',
    axis: '#45453f',
    tooltipBg: '#262624',
    tooltipBorder: 'rgba(255, 255, 255, 0.14)',
  },
};
