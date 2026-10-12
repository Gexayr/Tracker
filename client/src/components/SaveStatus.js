import React from 'react';
import { FiAlertCircle, FiCheck, FiLoader } from 'react-icons/fi';
import { t } from '../i18n';

export function SaveStatus({ status, onRetry }) {
  let content = null;
  if (status === 'pending' || status === 'saving') {
    content = (
      <>
        <FiLoader className="spin" aria-hidden="true" /> <span className="save-text">{t.saving}</span>
      </>
    );
  } else if (status === 'saved') {
    content = (
      <>
        <FiCheck aria-hidden="true" /> <span className="save-text">{t.saved}</span>
      </>
    );
  } else if (status === 'error') {
    content = (
      <>
        <FiAlertCircle aria-hidden="true" /> <span className="save-text">{t.saveFailed}</span>
        <button type="button" className="link-btn" onClick={onRetry}>
          {t.retry}
        </button>
      </>
    );
  }
  return (
    <div className={`save-status is-${status}`} role="status" aria-live="polite">
      {content}
    </div>
  );
}
