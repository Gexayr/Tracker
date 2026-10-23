import React from 'react';
import { FiBarChart2, FiCalendar, FiSun } from 'react-icons/fi';
import { t } from '../i18n';

const ICONS = { today: FiSun, month: FiCalendar, year: FiBarChart2 };

export function BottomNav({ views, active, labels, onChange }) {
  return (
    <nav className="bottom-nav" role="tablist" aria-label={t.viewLabel}>
      {views.map((v) => {
        const Icon = ICONS[v];
        const isActive = active === v;
        return (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`bottom-nav-item${isActive ? ' active' : ''}`}
            onClick={() => onChange(v)}
          >
            <Icon aria-hidden="true" />
            <span>{labels[v]}</span>
          </button>
        );
      })}
    </nav>
  );
}
