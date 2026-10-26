import React, { useEffect, useRef, useState } from 'react';
import { FiCheckSquare, FiChevronLeft, FiChevronRight, FiDownload, FiLogOut, FiTrash2 } from 'react-icons/fi';
import { t } from '../i18n';
import { formatMonthYear } from '../utils/date';
import { LanguageSwitch } from './LanguageSwitch';
import { SaveStatus } from './SaveStatus';
import { ThemeToggle } from './ThemeToggle';

function UserMenu({ email, onLogout, onDeleteAccount, lang, onLang, onExport, exporting, year, month }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const initial = (email || '?').trim().charAt(0).toUpperCase();
  return (
    <div className="user-menu" ref={ref}>
      <button
        type="button"
        className="avatar-btn"
        aria-label={t.account}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
      >
        <span aria-hidden="true">{initial}</span>
      </button>
      {open && (
        <div className="menu" role="menu">
          <div className="menu-head">
            <span className="muted small">{t.signedInAs}</span>
            <span className="menu-email">{email || '—'}</span>
          </div>
          <div className="menu-section">
            <span className="menu-label" id="menu-lang-label">
              {t.language}
            </span>
            <LanguageSwitch lang={lang} onChange={onLang} />
          </div>
          <div className="menu-sep" role="separator" />
          <span className="menu-label">{t.exportSection}</span>
          {[
            ['month', t.exportMonth(formatMonthYear(year, month))],
            ['year', t.exportYear(year)],
            ['summary', t.exportSummary(year)],
          ].map(([kind, label]) => (
            <button
              key={kind}
              type="button"
              role="menuitem"
              className="menu-item"
              disabled={!!exporting}
              onClick={() => {
                onExport(kind);
                setOpen(false);
              }}
            >
              <FiDownload aria-hidden="true" /> {label}
            </button>
          ))}
          <div className="menu-sep" role="separator" />
          <button type="button" role="menuitem" className="menu-item" onClick={onLogout}>
            <FiLogOut aria-hidden="true" /> {t.logout}
          </button>
          <button
            type="button"
            role="menuitem"
            className="menu-item menu-item-danger"
            onClick={() => {
              setOpen(false);
              onDeleteAccount();
            }}
          >
            <FiTrash2 aria-hidden="true" /> {t.deleteAccount}
          </button>
        </div>
      )}
    </div>
  );
}

export function Header({
  year,
  month,
  isCurrentMonth,
  onPrev,
  onNext,
  onToday,
  saveStatus,
  onRetrySave,
  themePreference,
  onCycleTheme,
  email,
  onLogout,
  onDeleteAccount,
  lang,
  onLang,
  onExport,
  exporting,
  hideMonthNav,
}) {
  return (
    <header className="app-header">
      <div className="brand compact">
        <span className="brand-mark" aria-hidden="true">
          <FiCheckSquare />
        </span>
        <span className="brand-name">{t.appName}</span>
      </div>

      <nav className={`month-nav${hideMonthNav ? ' is-hidden' : ''}`} aria-label={t.monthNav} hidden={hideMonthNav}>
        <button type="button" className="icon-btn" onClick={onPrev} aria-label={t.prevMonth}>
          <FiChevronLeft aria-hidden="true" />
        </button>
        <h1 className="month-label" aria-live="polite">
          {formatMonthYear(year, month)}
        </h1>
        <button type="button" className="icon-btn" onClick={onNext} aria-label={t.nextMonth}>
          <FiChevronRight aria-hidden="true" />
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm today-btn"
          onClick={onToday}
          disabled={isCurrentMonth}
          title={t.goToToday}
        >
          {t.today}
        </button>
      </nav>

      <div className="header-actions">
        <SaveStatus status={saveStatus} onRetry={onRetrySave} />
        <ThemeToggle preference={themePreference} onCycle={onCycleTheme} />
        <UserMenu
          email={email}
          onLogout={onLogout}
          onDeleteAccount={onDeleteAccount}
          lang={lang}
          onLang={onLang}
          onExport={onExport}
          exporting={exporting}
          year={year}
          month={month}
        />
      </div>
    </header>
  );
}
