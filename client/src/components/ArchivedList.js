import React from 'react';
import { FiArchive, FiRotateCcw } from 'react-icons/fi';
import { t } from '../i18n';
import { habitColor } from '../utils/color';

export function ArchivedList({ habits, theme, onRestore }) {
  const archived = habits.filter((h) => h.archived);
  if (!archived.length) return null;
  return (
    <details className="archived">
      <summary>
        <FiArchive aria-hidden="true" /> {t.archivedHabits(archived.length)}
      </summary>
      <p className="field-hint">{t.archivedHint}</p>
      <ul className="archived-list">
        {archived.map((h) => (
          <li key={h.id}>
            <span className="dot" style={{ background: habitColor(h.color, theme) }} aria-hidden="true" />
            <span className="archived-name" title={h.name}>
              {h.name}
            </span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onRestore(h)}>
              <FiRotateCcw aria-hidden="true" /> {t.restore}
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}
