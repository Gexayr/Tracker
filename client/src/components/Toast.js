import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiX } from 'react-icons/fi';
import { t } from '../i18n';

/** toast: { id, message, actionLabel?, onAction?, duration? } | null */
export function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(onDismiss, toast.duration || 7000);
    return () => clearTimeout(id);
  }, [toast, onDismiss]);

  return (
    <div className="toast-region" aria-live="polite">
      <AnimatePresence>
        {toast ? (
          <motion.div
            key={toast.id}
            className="toast"
            role="status"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.18 }}
          >
            <span className="toast-msg">{toast.message}</span>
            {toast.onAction ? (
              <button
                type="button"
                className="toast-action"
                onClick={() => {
                  toast.onAction();
                  onDismiss();
                }}
              >
                {toast.actionLabel}
              </button>
            ) : null}
            <button type="button" className="icon-btn toast-close" onClick={onDismiss} aria-label={t.dismiss}>
              <FiX aria-hidden="true" />
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
