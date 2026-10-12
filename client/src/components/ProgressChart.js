import React, { useMemo } from 'react';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  RadialLinearScale,
  Tooltip,
} from 'chart.js';
import { Bar, Line, Radar } from 'react-chartjs-2';
import { t } from '../i18n';
import { CHART_THEME, withAlpha } from '../utils/color';
import { daysInMonth, formatDayMonth } from '../utils/date';
import { dailyCompletion } from '../utils/progress';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  RadialLinearScale,
  Filler,
  BarElement,
  Tooltip
);
ChartJS.defaults.font.family =
  'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const TYPES = [
  ['line', t.chartLine],
  ['bar', t.chartBar],
  ['radar', t.chartRadar],
];

export function ProgressChart({ year, month, habits, data, stats, now, theme, chartType, onChangeChartType, compact }) {
  const c = CHART_THEME[theme] || CHART_THEME.light;
  const type = TYPES.some(([k]) => k === chartType) ? chartType : 'line';

  const daily = useMemo(() => dailyCompletion(habits, data, year, month, now), [habits, data, year, month, now]);
  const total = daysInMonth(year, month);
  const labels = useMemo(() => Array.from({ length: total }, (_, i) => i + 1), [total]);

  const tooltip = useMemo(
    () => ({
      backgroundColor: c.tooltipBg,
      borderColor: c.tooltipBorder,
      borderWidth: 1,
      titleColor: c.text,
      bodyColor: c.text,
      padding: 10,
      cornerRadius: 8,
      displayColors: false,
      caretSize: 0,
    }),
    [c]
  );

  const dailyOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 300 },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          ...tooltip,
          callbacks: {
            title: (items) => formatDayMonth(year, month, Number(items[0].label)),
            label: (item) => (item.raw === null ? '' : t.chartValue(item.raw)),
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { color: c.axis },
          ticks: { color: c.textMuted, autoSkip: true, maxTicksLimit: compact ? 8 : 16, maxRotation: 0 },
        },
        y: {
          beginAtZero: true,
          max: 100,
          grid: { color: c.grid },
          border: { display: false },
          ticks: { color: c.textMuted, stepSize: 25, callback: (v) => `${v}%` },
        },
      },
    }),
    [c, tooltip, year, month, compact]
  );

  const radarOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 300 },
      plugins: {
        legend: { display: false },
        tooltip: { ...tooltip, callbacks: { label: (item) => `${item.raw}%` } },
      },
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          grid: { color: c.grid },
          angleLines: { color: c.grid },
          pointLabels: { color: c.text, font: { size: compact ? 11 : 12 } },
          ticks: { color: c.textMuted, backdropColor: 'transparent', stepSize: 25, showLabelBackdrop: false },
        },
      },
    }),
    [c, tooltip, compact]
  );

  const lineData = {
    labels,
    datasets: [
      {
        label: t.chartTitle,
        data: daily,
        borderColor: c.series,
        backgroundColor: withAlpha(c.series, 0.1),
        fill: true,
        tension: 0.3,
        borderWidth: 2,
        borderCapStyle: 'round',
        borderJoinStyle: 'round',
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBorderWidth: 2,
        pointHoverBackgroundColor: c.series,
        pointHoverBorderColor: c.surface,
        spanGaps: false,
      },
    ],
  };

  const barData = {
    labels,
    datasets: [
      {
        label: t.chartTitle,
        data: daily,
        backgroundColor: c.series,
        hoverBackgroundColor: c.series,
        borderRadius: 4,
        borderSkipped: 'start',
        maxBarThickness: 24,
        categoryPercentage: 0.8,
        barPercentage: 0.9,
      },
    ],
  };

  const radarData = {
    labels: habits.map((h) => (h.name.length > 18 ? `${h.name.slice(0, 17)}…` : h.name)),
    datasets: [
      {
        label: t.chartSubtitleRadar,
        data: habits.map((h) => stats[h.id]?.percent ?? 0),
        borderColor: c.series,
        backgroundColor: withAlpha(c.series, 0.12),
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: c.series,
        pointBorderColor: c.surface,
        pointBorderWidth: 2,
      },
    ],
  };

  const hasData = habits.length > 0 && daily.some((v) => v !== null);

  return (
    <div className="chart">
      <div className="card-head">
        <div>
          <h2 className="card-title">{t.chartTitle}</h2>
          <p className="card-subtitle">{type === 'radar' ? t.chartSubtitleRadar : t.chartSubtitleDaily}</p>
        </div>
        <div className="segmented segmented-sm" role="group" aria-label={t.chartType}>
          {TYPES.map(([k, label]) => (
            <button
              key={k}
              type="button"
              className={type === k ? 'active' : ''}
              aria-pressed={type === k}
              onClick={() => onChangeChartType(k)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-box">
        {!hasData ? (
          <p className="muted chart-empty">{t.chartEmpty}</p>
        ) : type === 'radar' ? (
          <Radar key={`r-${theme}`} data={radarData} options={radarOptions} aria-label={t.chartSubtitleRadar} role="img" />
        ) : type === 'bar' ? (
          <Bar key={`b-${theme}`} data={barData} options={dailyOptions} aria-label={t.chartSubtitleDaily} role="img" />
        ) : (
          <Line key={`l-${theme}`} data={lineData} options={dailyOptions} aria-label={t.chartSubtitleDaily} role="img" />
        )}
      </div>
    </div>
  );
}
