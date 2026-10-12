import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, MotionConfig } from 'framer-motion';
import { FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';
import { apiProfile } from './api';
import { AddHabitToggle } from './components/AddHabitForm';
import { AuthScreen } from './components/AuthScreen';
import { HabitDialog } from './components/HabitDialog';
import { HabitGrid } from './components/HabitGrid';
import { Header } from './components/Header';
import { ProgressChart } from './components/ProgressChart';
import { ProgressList } from './components/ProgressList';
import { StatCards } from './components/StatCards';
import { Toast } from './components/Toast';
import { TodayView } from './components/TodayView';
import { useMediaQuery, useNow } from './hooks/useMediaQuery';
import { useMonthData } from './hooks/useMonthData';
import { useTheme } from './hooks/useTheme';
import { t } from './i18n';
import { formatMonthName, monthRelation, shiftMonth } from './utils/date';
import { habitStats } from './utils/progress';
import { safeStorage } from './utils/storage';

const TOKEN_KEY = 'access_token';
const VIEW_KEY = 'mobile_view';

/** Picks up `#access_token=...` from the OAuth redirect and clears the hash. */
function initialSession() {
  let token = safeStorage.get(TOKEN_KEY) || '';
  let notice = '';
  try {
    const hash = window.location.hash || '';
    if (hash.length > 1) {
      const params = new URLSearchParams(hash.slice(1));
      const fromHash = params.get('access_token');
      const error = params.get('error');
      if (fromHash || error !== null) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
      if (fromHash) {
        token = fromHash;
        safeStorage.set(TOKEN_KEY, fromHash);
      } else if (error !== null) {
        notice = t.googleFailed;
      }
    }
  } catch (_) {
    /* ignore malformed hash */
  }
  return { token, notice };
}

function LoadingCard() {
  return (
    <div className="card skeleton" aria-busy="true">
      <span className="sr-only">{t.loading}</span>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="skeleton-row" />
      ))}
    </div>
  );
}

export default function App() {
  const [initial] = useState(initialSession);
  const [token, setToken] = useState(initial.token);
  const [email, setEmail] = useState('');
  const [notice, setNotice] = useState(initial.notice);
  const now = useNow();
  const [ym, setYm] = useState(() => ({ year: now.getFullYear(), month: now.getMonth() }));
  const { year, month } = ym;
  const [view, setView] = useState(() => (safeStorage.get(VIEW_KEY) === 'month' ? 'month' : 'today'));
  const [editingId, setEditingId] = useState(null);
  const [toast, setToast] = useState(null);

  const { theme, preference, cycle } = useTheme();
  const isMobile = useMediaQuery('(max-width: 640px)');

  const endSession = useCallback((message) => {
    safeStorage.remove(TOKEN_KEY);
    setToken('');
    setEmail('');
    setEditingId(null);
    setToast(null);
    setNotice(message || '');
  }, []);

  const onUnauthorized = useCallback(() => endSession(t.sessionExpired), [endSession]);

  const monthData = useMonthData({ token, year, month, onUnauthorized });
  const { habits, data, status, saveStatus, flush } = monthData;

  // Fetch the email for sessions restored from storage / OAuth redirect.
  useEffect(() => {
    if (!token || email) return undefined;
    const ctrl = new AbortController();
    apiProfile(token, ctrl.signal)
      .then((p) => setEmail(p?.email || ''))
      .catch((err) => {
        if (err?.status === 401) onUnauthorized();
      });
    return () => ctrl.abort();
  }, [token, email, onUnauthorized]);

  const handleSession = useCallback((tok, mail) => {
    const d = new Date();
    safeStorage.set(TOKEN_KEY, tok);
    setNotice('');
    setEmail(mail || '');
    setYm({ year: d.getFullYear(), month: d.getMonth() });
    setToken(tok);
  }, []);

  const logout = useCallback(() => {
    flush();
    endSession('');
  }, [flush, endSession]);

  const dismissToast = useCallback(() => setToast(null), []);

  // An undo only applies to the month it was made in.
  useEffect(() => {
    setToast(null);
    setEditingId(null);
  }, [year, month]);

  const stats = useMemo(() => {
    const out = {};
    habits.forEach((h) => {
      out[h.id] = habitStats(data[h.id], year, month, now);
    });
    return out;
  }, [habits, data, year, month, now]);

  const goMonth = (delta) => setYm((s) => shiftMonth(s.year, s.month, delta));
  const goToday = () => setYm({ year: now.getFullYear(), month: now.getMonth() });

  const changeView = (v) => {
    setView(v);
    safeStorage.set(VIEW_KEY, v);
  };

  const editing = habits.find((h) => h.id === editingId) || null;

  const onDeleteHabit = () => {
    if (!editing) return;
    const removed = monthData.removeHabit(editing.id);
    setEditingId(null);
    if (removed) {
      setToast({
        id: Date.now(),
        message: t.removed(removed.habit.name),
        actionLabel: t.undo,
        onAction: () => monthData.restoreHabit(removed),
      });
    }
  };

  if (!token) {
    return (
      <MotionConfig reducedMotion="user">
        <AuthScreen
          theme={theme}
          themePreference={preference}
          onCycleTheme={cycle}
          onSession={handleSession}
          notice={notice}
        />
      </MotionConfig>
    );
  }

  const isCurrent = monthRelation(year, month, now) === 0;
  const showToday = isMobile && view === 'today';
  const ready = status === 'ready';

  return (
    <MotionConfig reducedMotion="user">
      <div className="app">
        <Header
          year={year}
          month={month}
          isCurrentMonth={isCurrent}
          onPrev={() => goMonth(-1)}
          onNext={() => goMonth(1)}
          onToday={goToday}
          saveStatus={saveStatus}
          onRetrySave={monthData.retrySave}
          themePreference={preference}
          onCycleTheme={cycle}
          email={email}
          onLogout={logout}
        />

        <main className="app-main">
          {status === 'error' ? (
            <div className="card error-card" role="alert">
              <FiAlertTriangle aria-hidden="true" className="error-icon" />
              <div className="error-body">
                <p className="error-title">{t.loadFailed}</p>
                <p className="muted small">{monthData.error}</p>
              </div>
              <button type="button" className="btn btn-primary" onClick={monthData.reload}>
                <FiRefreshCw aria-hidden="true" /> {t.retry}
              </button>
            </div>
          ) : !ready ? (
            <LoadingCard />
          ) : (
            <>
              <StatCards habits={habits} data={data} stats={stats} year={year} month={month} now={now} />

              {isMobile ? (
                <div className="segmented segmented-block view-switch" role="group" aria-label={t.viewLabel}>
                  {[
                    ['today', t.viewToday],
                    ['month', t.viewMonth],
                  ].map(([v, label]) => (
                    <button
                      key={v}
                      type="button"
                      className={view === v ? 'active' : ''}
                      aria-pressed={view === v}
                      onClick={() => changeView(v)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              ) : null}

              {showToday ? (
                <section className="today-section" aria-label={t.viewToday}>
                  <TodayView
                    year={year}
                    month={month}
                    habits={habits}
                    data={data}
                    stats={stats}
                    now={now}
                    theme={theme}
                    onToggle={monthData.toggleDay}
                    onEdit={(h) => setEditingId(h.id)}
                    onGoToday={goToday}
                  />
                  {isCurrent ? (
                    <div className="card add-card">
                      {!habits.length ? <p className="muted">{t.noHabits}</p> : null}
                      <AddHabitToggle habits={habits} onAdd={monthData.addHabit} />
                    </div>
                  ) : null}
                </section>
              ) : (
                <section className="card grid-card" aria-label={formatMonthName(year, month)}>
                  {habits.length ? (
                    <HabitGrid
                      year={year}
                      month={month}
                      habits={habits}
                      data={data}
                      stats={stats}
                      now={now}
                      theme={theme}
                      onToggle={monthData.toggleDay}
                      onEdit={(h) => setEditingId(h.id)}
                    />
                  ) : (
                    <p className="muted grid-empty">{t.noHabits}</p>
                  )}
                  <div className="grid-foot">
                    <AddHabitToggle habits={habits} onAdd={monthData.addHabit} />
                  </div>
                </section>
              )}

              <div className="insights">
                <section className="card progress-card">
                  <div className="card-head">
                    <h2 className="card-title">{t.progress}</h2>
                  </div>
                  <ProgressList habits={habits} stats={stats} theme={theme} />
                </section>
                <section className="card chart-card">
                  <ProgressChart
                    year={year}
                    month={month}
                    habits={habits}
                    data={data}
                    stats={stats}
                    now={now}
                    theme={theme}
                    chartType={monthData.chartType}
                    onChangeChartType={monthData.setChartType}
                    compact={isMobile}
                  />
                </section>
              </div>
            </>
          )}
        </main>

        <AnimatePresence>
          {editing ? (
            <HabitDialog
              key={editing.id}
              habit={editing}
              habits={habits}
              theme={theme}
              onClose={() => setEditingId(null)}
              onDelete={onDeleteHabit}
              onSave={(changes) => {
                monthData.editHabit(editing.id, changes);
                setEditingId(null);
              }}
            />
          ) : null}
        </AnimatePresence>

        <Toast toast={toast} onDismiss={dismissToast} />
      </div>
    </MotionConfig>
  );
}
