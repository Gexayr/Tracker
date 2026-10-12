import React from 'react';
import { en, LANGS, ru, t } from '../i18n';

const DICTS = { en, ru };

export function LanguageSwitch({ lang, onChange, className = '' }) {
  return (
    <div className={`segmented segmented-sm lang-switch ${className}`} role="group" aria-label={t.language}>
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          className={lang === l ? 'active' : ''}
          aria-pressed={lang === l}
          aria-label={DICTS[l].langName}
          title={DICTS[l].langName}
          onClick={() => onChange(l)}
        >
          {DICTS[l].langShort}
        </button>
      ))}
    </div>
  );
}
