import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig } from 'framer-motion';
import { FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';
import { apiDeleteAccount, apiProfile, apiUpdateProfile } from './api';
import { AddHabitToggle } from './components/AddHabitForm';
import { AmountDialog } from './components/AmountDialog';
import { ArchivedList } from './components/ArchivedList';
import { AuthScreen } from './components/AuthScreen';
import { BottomNav } from './components/BottomNav';
import { DeleteAccountDialog } from './components/DeleteAccountDialog';
import { HabitDialog } from './components/HabitDialog';
import { HabitGrid } from './components/HabitGrid';
import { Header } from './components/Header';
import { ProgressChart } from './components/ProgressChart';
import { ProgressList } from './components/ProgressList';
import { StatCards } from './components/StatCards';
import { Toast } from './components/Toast';
import { TodayView } from './components/TodayView';
import { YearHeatmap } from './components/YearHeatmap';
import { useMediaQuery, useNow } from './hooks/useMediaQuery';
import { useMonthData } from './hooks/useMonthData';
import { useReminders } from './hooks/useReminders';
import { useTheme } from './hooks/useTheme';
import { loadYear, useYearData, withLiveMonth } from './hooks/useYearData';
import { getLang, hasSavedLang, normalizeLang, rememberProfileLang, setLang, t } from './i18n';
import { csvFilename, dailyRows, downloadCsv, summaryRows } from './utils/csv';
import { formatMonthName, monthRelation, shiftMonth } from './utils/date';
import { activeHabits, habitStats, isDone, isMeasurable } from './utils/progress';
import { isTokenExpired } from './utils/session';
import { safeStorage } from './utils/storage';

const TOKEN_KEY = 'access_token';
const VIEW_KEY = 'mobile_view';
const VIEWS_MOBILE = ['today', 'month', 'year'];
const VIEWS_DESKTOP = ['month', 'year'];

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
        notice = 'google';
      }
    }
  } catch (_) {
    /* ignore malformed hash */
  }
  if (token && isTokenExpired(token)) {
    safeStorage.remove(TOKEN_KEY);
    token = '';
    notice = 'expired';
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
  const [hasPassword, setHasPassword] = useState(true);
  const [notice, setNotice] = useState(initial.notice); // '' | 'expired' | 'google' | 'deleted'
  const [lang, setLangState] = useState(getLang);
  const now = useNow();
  const [ym, setYm] = useState(() => ({ year: now.getFullYear(), month: now.getMonth() }));
  const { year, month } = ym;
  const [view, setView] = useState(() => {
    const v = safeStorage.get(VIEW_KEY);
    return VIEWS_MOBILE.includes(v) ? v : 'today';
  });
  const [heatYear, setHeatYear] = useState(() => now.getFullYear());
  const [editingId, setEditingId] = useState(null);
  const [logging, setLogging] = useState(null); // { id, day } of a measurable habit
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [toast, setToast] = useState(null);
  const [announce, setAnnounce] = useState('');
  const [exporting, setExporting] = useState(false);

  const { theme, preference, cycle } = useTheme();
  const isMobile = useMediaQuery('(max-width: 640px)');

  const tokenRef = useRef(token);
  tokenRef.current = token;

  const changeLang = useCallback((l) => {
    const next = setLang(l, { persist: true });
    setLangState(next);
    if (tokenRef.current) apiUpdateProfile(tokenRef.current, { locale: next }).catch(() => {});
  }, []);

  const endSession = useCallback((reason) => {
    safeStorage.remove(TOKEN_KEY);
    setToken('');
    setEmail('');
    setEditingId(null);
    setToast(null);
    setNotice(reason || '');
  }, []);

  const onUnauthorized = useCallback(() => endSession('expired'), [endSession]);

  const monthData = useMonthData({ token, year, month, onUnauthorized });
  const { habits, data, status, saveStatus, flush } = monthData;

  // Profile: email for restored sessions, and the saved locale.
  useEffect(() => {
    if (!token) return undefined;
    const ctrl = new AbortController();
    apiProfile(token, ctrl.signal)
      .then((p) => {
        if (p?.email) setEmail(p.email);
        if (typeof p?.hasPassword === 'boolean') setHasPassword(p.hasPassword);
        const profileLang = rememberProfileLang(p?.locale);
        if (hasSavedLang()) {
          // An explicit choice (possibly made on the sign-in screen) wins; sync it.
          if (normalizeLang(p?.locale) !== getLang()) {
            apiUpdateProfile(token, { locale: getLang() }).catch(() => {});
          }
        } else if (profileLang && profileLang !== getLang()) {
          setLangState(setLang(profileLang));
        }
      })
      .catch((err) => {
        if (err?.status === 401) onUnauthorized();
      });
    return () => ctrl.abort();
  }, [token, onUnauthorized]);

  const handleSession = useCallback((tok, mail) => {
    const d = new Date();
    safeStorage.set(TOKEN_KEY, tok);
    setNotice('');
    setEmail(mail || '');
    setHasPassword(true); // corrected by the profile fetch once it lands
    setYm({ year: d.getFullYear(), month: d.getMonth() });
    setToken(tok);
  }, []);

  const logout = useCallback(() => {
    flush();
    endSession('');
  }, [flush, endSession]);

  /** Permanently deletes the account; throws on failure so the dialog can show the error. */
  const deleteAccount = useCallback(
    async (password) => {
      await apiDeleteAccount(tokenRef.current, password);
      setDeletingAccount(false);
      endSession('deleted');
    },
    [endSession]
  );

  const dismissToast = useCallback(() => setToast(null), []);
  const showToast = useCallback((message, extra = {}) => {
    setToast({ id: Date.now() + Math.random(), message, ...extra });
  }, []);

  // An undo only applies to the month it was made in.
  useEffect(() => {
    setToast(null);
    setEditingId(null);
    setLogging(null);
  }, [year, month]);

  const active = useMemo(() => activeHabits(habits), [habits]);

  const stats = useMemo(() => {
    const out = {};
    active.forEach((h) => {
      out[h.id] = habitStats(data[h.id], year, month, now, h);
    });
    return out;
  }, [active, data, year, month, now]);

  const ready = status === 'ready';
  const isCurrent = monthRelation(year, month, now) === 0;

  // --- reminders (client-side, only while the page is open) ---------------
  const liveRef = useRef(null);
  liveRef.current = ready ? { key: monthData.key, habits, data } : null;
  const toggleDay = monthData.toggleDay;
  /** Plain habits toggle; measurable ones ask how much was done. */
  const onCell = useCallback(
    (id, day) => {
      const h = habits.find((x) => x.id === id);
      if (h && isMeasurable(h)) setLogging({ id, day });
      else toggleDay(id, day);
    },
    [habits, toggleDay]
  );
  const toggleRef = useRef(onCell);
  toggleRef.current = onCell;

  const onReminder = useCallback(
    (h) => {
      const n = new Date();
      const day = n.getDate();
      const curKey = `${n.getFullYear()}-${n.getMonth()}`;
      showToast(t.reminderToast(h.name), {
        duration: 20000,
        actionLabel: t.markDoneShort,
        onAction: () => {
          const live = liveRef.current;
          if (live && live.key === curKey && !isDone(h, live.data[h.id]?.[day])) toggleRef.current(h.id, day);
          else if (!live || live.key !== curKey) setYm({ year: n.getFullYear(), month: n.getMonth() });
        },
      });
    },
    [showToast]
  );

  const reminderLive = useMemo(
    () => (ready && isCurrent ? { key: monthData.key, habits, data } : null),
    [ready, isCurrent, monthData.key, habits, data]
  );
  useReminders({ token, live: reminderLive, onReminder });

  // --- views ----------------------------------------------------------------
  const views = isMobile ? VIEWS_MOBILE : VIEWS_DESKTOP;
  const shownView = views.includes(view) ? view : 'month';

  const changeView = (v) => {
    setView(v);
    safeStorage.set(VIEW_KEY, v);
    if (v === 'year') setHeatYear(year);
  };

  const yearData = useYearData({ token, year: heatYear, enabled: shownView === 'year', onUnauthorized });
  const yearMonths = useMemo(
    () =>
      withLiveMonth(
        yearData.months,
        ready && year === heatYear ? { year, month, payload: { habits, data } } : null
      ),
    [yearData.months, ready, year, month, heatYear, habits, data]
  );

  const pickMonth = (y, m) => {
    setYm({ year: y, month: m });
    changeView(isMobile && monthRelation(y, m, now) === 0 ? 'today' : 'month');
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (_) {
      /* ignore */
    }
  };

  // --- CSV export ---------------------------------------------------------------
  const exportCsv = async (kind) => {
    if (exporting) return;
    const y = shownView === 'year' ? heatYear : year;
    setExporting(true);
    try {
      let rows;
      let name;
      if (kind === 'month') {
        if (!ready) throw new Error('not ready');
        rows = dailyRows([{ year, month, payload: { habits, data } }], new Date());
        name = csvFilename('month', year, month);
      } else {
        const loaded = await loadYear(y, token);
        const live = ready && year === y ? { year, month, payload: { habits, data } } : null;
        const months = withLiveMonth(loaded, live);
        rows = kind === 'summary' ? summaryRows(months, new Date()) : dailyRows(months, new Date());
        name = csvFilename(kind, y);
      }
      downloadCsv(name, rows);
      showToast(t.exportDone(name));
    } catch (err) {
      if (err?.status === 401) onUnauthorized();
      else showToast(t.exportFailed);
    } finally {
      setExporting(false);
    }
  };

  // --- habit actions ----------------------------------------------------------
  const editing = habits.find((h) => h.id === editingId) || null;
  const loggingHabit = (logging && habits.find((h) => h.id === logging.id && isMeasurable(h))) || null;
  const editingPos = editing ? active.findIndex((h) => h.id === editing.id) : -1;

  const announceMove = useCallback(
    (id, to) => {
      const h = active.find((x) => x.id === id);
      if (h) setAnnounce(t.moved(h.name, to + 1, active.length));
    },
    [active]
  );

  const onMoveHabit = useCallback(
    (id, to) => {
      monthData.moveHabit(id, to);
      announceMove(id, to);
    },
    [monthData, announceMove]
  );

  const onDeleteHabit = () => {
    if (!editing) return;
    const removed = monthData.removeHabit(editing.id);
    setEditingId(null);
    if (removed) {
      showToast(t.removed(removed.habit.name), {
        actionLabel: t.undo,
        onAction: () => monthData.restoreHabit(removed),
      });
    }
  };

  const onArchiveHabit = () => {
    if (!editing) return;
    const h = editing;
    monthData.editHabit(h.id, { archived: true });
    setEditingId(null);
    showToast(t.archived(h.name), {
      actionLabel: t.undo,
      onAction: () => monthData.editHabit(h.id, { archived: null }),
    });
  };

  const onRestoreHabit = (h) => {
    monthData.editHabit(h.id, { archived: null });
    showToast(t.restored(h.name));
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
          onDismissNotice={() => setNotice('')}
          lang={lang}
          onLang={changeLang}
        />
      </MotionConfig>
    );
  }

  const showToday = shownView === 'today';
  const viewLabels = { today: t.viewToday, month: t.viewMonth, year: t.viewYear };

  const viewSwitch = (
    <div
      className={`segmented view-switch${isMobile ? ' segmented-block' : ''}`}
      role="group"
      aria-label={t.viewLabel}
    >
      {views.map((v) => (
        <button
          key={v}
          type="button"
          className={shownView === v ? 'active' : ''}
          aria-pressed={shownView === v}
          onClick={() => changeView(v)}
        >
          {viewLabels[v]}
        </button>
      ))}
    </div>
  );

  let content;
  if (shownView === 'year') {
    content = (
      <YearHeatmap
        year={heatYear}
        months={yearMonths}
        status={yearData.status}
        error={yearData.error}
        now={now}
        theme={theme}
        onReload={yearData.reload}
        onYear={(d) => setHeatYear((y) => Math.min(now.getFullYear(), y + d))}
        onPickDay={(y, m) => pickMonth(y, m)}
        onPickMonth={pickMonth}
        onExport={exportCsv}
        exporting={exporting}
      />
    );
  } else if (status === 'error') {
    content = (
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
    );
  } else if (!ready) {
    content = <LoadingCard />;
  } else {
    content = (
      <>
        <StatCards habits={active} data={data} stats={stats} year={year} month={month} now={now} />

        {showToday ? (
          <section className="today-section" aria-label={t.viewToday}>
            <TodayView
              year={year}
              month={month}
              habits={active}
              data={data}
              stats={stats}
              now={now}
              theme={theme}
              onToggle={onCell}
              onEdit={(h) => setEditingId(h.id)}
              onGoToday={() => setYm({ year: now.getFullYear(), month: now.getMonth() })}
              onMove={monthData.moveHabit}
              onAnnounce={announceMove}
            />
            {isCurrent ? (
              <div className="card add-card">
                {!active.length ? <p className="muted">{t.noHabits}</p> : null}
                <AddHabitToggle habits={habits} onAdd={monthData.addHabit} />
                <ArchivedList habits={habits} theme={theme} onRestore={onRestoreHabit} />
              </div>
            ) : null}
          </section>
        ) : (
          <section className="card grid-card" aria-label={formatMonthName(year, month)}>
            {active.length ? (
              <HabitGrid
                year={year}
                month={month}
                habits={active}
                data={data}
                stats={stats}
                now={now}
                theme={theme}
                onToggle={onCell}
                onEdit={(h) => setEditingId(h.id)}
                onMove={monthData.moveHabit}
                onAnnounce={announceMove}
              />
            ) : (
              <p className="muted grid-empty">{t.noHabits}</p>
            )}
            <div className="grid-foot">
              <AddHabitToggle habits={habits} onAdd={monthData.addHabit} />
              <ArchivedList habits={habits} theme={theme} onRestore={onRestoreHabit} />
            </div>
          </section>
        )}

        <div className="insights">
          <section className="card progress-card">
            <div className="card-head">
              <h2 className="card-title">{t.progress}</h2>
            </div>
            <ProgressList habits={active} stats={stats} theme={theme} />
          </section>
          <section className="card chart-card">
            <ProgressChart
              year={year}
              month={month}
              habits={active}
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
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="app">
        <Header
          year={year}
          month={month}
          isCurrentMonth={isCurrent}
          onPrev={() => setYm((s) => shiftMonth(s.year, s.month, -1))}
          onNext={() => setYm((s) => shiftMonth(s.year, s.month, 1))}
          onToday={() => setYm({ year: now.getFullYear(), month: now.getMonth() })}
          saveStatus={saveStatus}
          onRetrySave={monthData.retrySave}
          themePreference={preference}
          onCycleTheme={cycle}
          email={email}
          onLogout={logout}
          onDeleteAccount={() => setDeletingAccount(true)}
          lang={lang}
          onLang={changeLang}
          onExport={exportCsv}
          exporting={exporting}
          hideMonthNav={shownView === 'year'}
        />

        <main className="app-main">
          {isMobile ? null : viewSwitch}
          {content}
        </main>

        {isMobile ? (
          <BottomNav views={views} active={shownView} labels={viewLabels} onChange={changeView} />
        ) : null}

        <AnimatePresence>
          {editing ? (
            <HabitDialog
              key={editing.id}
              habit={editing}
              habits={habits}
              theme={theme}
              position={editingPos}
              total={active.length}
              onMove={(dir) => onMoveHabit(editing.id, editingPos + dir)}
              onClose={() => setEditingId(null)}
              onDelete={onDeleteHabit}
              onArchive={onArchiveHabit}
              onSave={(changes) => {
                monthData.editHabit(editing.id, changes);
                setEditingId(null);
              }}
            />
          ) : null}
          {loggingHabit && !editing ? (
            <AmountDialog
              key={`${loggingHabit.id}-${logging.day}`}
              habit={loggingHabit}
              year={year}
              month={month}
              day={logging.day}
              value={data[loggingHabit.id]?.[logging.day]}
              theme={theme}
              onClose={() => setLogging(null)}
              onSave={(value) => {
                monthData.setDayAmount(loggingHabit.id, logging.day, value);
                setLogging(null);
              }}
            />
          ) : null}
          {deletingAccount ? (
            <DeleteAccountDialog
              email={email}
              hasPassword={hasPassword}
              onClose={() => setDeletingAccount(false)}
              onConfirm={deleteAccount}
            />
          ) : null}
        </AnimatePresence>

        <div className="sr-only" role="status" aria-live="polite">
          {announce}
        </div>
        <Toast toast={toast} onDismiss={dismissToast} />
      </div>
    </MotionConfig>
  );
}
