import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FiAlertTriangle, FiX } from 'react-icons/fi';
import { t } from '../i18n';
import { ErrorList } from './AuthScreen';

/**
 * Destructive confirmation for permanently deleting the signed-in account
 * and everything it owns. Requires typing the account's own email (a
 * well-understood "prove you mean it" pattern) plus the current password
 * when the account has one — Google-only accounts have nothing to check a
 * password against, so the dialog skips that field for them.
 */
export function DeleteAccountDialog({ email, hasPassword, onClose, onConfirm }) {
  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const matches = confirmText.trim().toLocaleLowerCase() === (email || '').trim().toLocaleLowerCase();

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      if (!loading) onClose();
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!matches || loading) return;
    setErrors([]);
    setLoading(true);
    try {
      await onConfirm(hasPassword ? password : undefined);
    } catch (err) {
      setErrors(Array.isArray(err?.messages) && err.messages.length ? err.messages : [err?.message || t.deleteAccountFailed]);
      setLoading(false);
    }
  };

  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && !loading && onClose()}
    >
      <motion.div
        className="dialog card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
        onKeyDown={onKeyDown}
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.16 }}
      >
        <form onSubmit={submit} noValidate>
          <div className="dialog-head">
            <h2 id="delete-account-title" className="card-title">
              {t.deleteAccountTitle}
            </h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label={t.close} disabled={loading}>
              <FiX aria-hidden="true" />
            </button>
          </div>

          <p className="form-error" role="alert">
            <FiAlertTriangle aria-hidden="true" /> {t.deleteAccountWarning}
          </p>

          <div className="field">
            <label htmlFor="delete-confirm-email">{t.deleteAccountConfirmLabel(email)}</label>
            <input
              id="delete-confirm-email"
              ref={inputRef}
              className="input"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              disabled={loading}
            />
            {confirmText && !matches ? <p className="field-error">{t.deleteAccountMismatch}</p> : null}
          </div>

          {hasPassword ? (
            <div className="field">
              <label htmlFor="delete-confirm-password">{t.deleteAccountPasswordLabel}</label>
              <input
                id="delete-confirm-password"
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={loading}
              />
            </div>
          ) : null}

          <ErrorList messages={errors} />

          <div className="dialog-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
              {t.cancel}
            </button>
            <span className="spacer" />
            <button
              type="submit"
              className="btn btn-danger-ghost"
              disabled={!matches || loading || (hasPassword && !password)}
            >
              {loading ? t.deleteAccountDeleting : t.deleteAccountConfirmButton}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
