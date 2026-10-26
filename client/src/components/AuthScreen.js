import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  FiAlertCircle,
  FiCheck,
  FiCheckSquare,
  FiChrome,
  FiClock,
  FiCopy,
  FiEye,
  FiEyeOff,
  FiX,
} from 'react-icons/fi';
import { apiGoogle, apiLogin, apiRegister, GOOGLE_CLIENT_ID } from '../api';
import { t } from '../i18n';
import { copyText } from '../utils/clipboard';
import { chromeIntentUrl, currentBrowser } from '../utils/inAppBrowser';
import { LanguageSwitch } from './LanguageSwitch';
import { ThemeToggle } from './ThemeToggle';

const GIS_TIMEOUT_MS = 8000;

function toMessages(err, fallback) {
  if (Array.isArray(err?.messages) && err.messages.length) return err.messages;
  return [err?.message || fallback];
}

export function ErrorList({ messages, id }) {
  if (!messages || !messages.length) return null;
  return (
    <div className="form-error" role="alert" id={id}>
      {messages.length === 1 ? (
        <p>{messages[0]}</p>
      ) : (
        <ul>
          {messages.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PasswordInput({ id, value, onChange, autoComplete, describedBy, minLength }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="password-field">
      <input
        id={id}
        className="input"
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        aria-describedby={describedBy}
        minLength={minLength}
        required
      />
      <button
        type="button"
        className="icon-btn password-toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? t.hidePassword : t.showPassword}
        aria-pressed={visible}
        aria-controls={id}
      >
        {visible ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
      </button>
    </div>
  );
}

function AuthForm({ mode, onSession }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);
  const signup = mode === 'signup';

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setErrors([]);
    try {
      const res = signup
        ? await apiRegister({ name: name.trim() || undefined, email: email.trim(), password })
        : await apiLogin(email.trim(), password);
      if (!res?.access_token) throw new Error(t.tokenMissing);
      onSession(res.access_token, res?.user?.email || email.trim());
    } catch (err) {
      setErrors(toMessages(err, signup ? t.registerFailed : t.loginFailed));
      setLoading(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={submit}>
      {signup && (
        <div className="field">
          <label htmlFor="auth-name">{t.nameOptional}</label>
          <input
            id="auth-name"
            className="input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            maxLength={100}
          />
        </div>
      )}
      <div className="field">
        <label htmlFor="auth-email">{t.email}</label>
        <input
          id="auth-email"
          className="input"
          type="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
      </div>
      <div className="field">
        <label htmlFor="auth-password">{t.password}</label>
        <PasswordInput
          id="auth-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={signup ? 'new-password' : 'current-password'}
          describedBy={signup ? 'auth-password-hint' : undefined}
          minLength={signup ? 6 : undefined}
        />
        {signup && (
          <p className="field-hint" id="auth-password-hint">
            {t.passwordHint}
          </p>
        )}
      </div>
      <ErrorList messages={errors} />
      <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
        {loading ? (signup ? t.creatingAccount : t.signingIn) : signup ? t.createAccount : t.signIn}
      </button>
    </form>
  );
}

// Google Identity Services must be initialized only once per page.
let gisInitializedFor = null;
const gisCallbackRef = { current: null };

function loadGis() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const id = 'google-identity-services';
    let s = document.getElementById(id);
    if (!s) {
      s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.defer = true;
      s.id = id;
      document.head.appendChild(s);
    }
    s.addEventListener('load', () => resolve(), { once: true });
    s.addEventListener('error', () => reject(new Error('GIS failed to load')), { once: true });
  });
}

function GoogleSignIn({ theme, onToken, lang }) {
  const ref = useRef(null);
  const [ready, setReady] = useState(
    () => !!window.google?.accounts?.id && gisInitializedFor === GOOGLE_CLIENT_ID
  );
  const [width, setWidth] = useState(320);
  const [failed, setFailed] = useState(false);

  // Always call the latest callback without re-initializing GIS.
  useLayoutEffect(() => {
    gisCallbackRef.current = onToken;
  });

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return undefined;
    let cancelled = false;
    let ok = false;
    const timer = setTimeout(() => {
      if (!cancelled && !ok) setFailed(true);
    }, GIS_TIMEOUT_MS);
    loadGis()
      .then(() => {
        if (cancelled) return;
        if (!window.google?.accounts?.id) throw new Error('GIS missing');
        if (gisInitializedFor !== GOOGLE_CLIENT_ID) {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: (response) => {
              if (response?.credential) gisCallbackRef.current?.(response.credential);
            },
          });
          gisInitializedFor = GOOGLE_CLIENT_ID;
        }
        ok = true;
        clearTimeout(timer);
        setFailed(false);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  // Fit the button to its container (GIS accepts 200-400px).
  useEffect(() => {
    const el = ref.current?.parentElement;
    if (!el) return undefined;
    const measure = () => {
      const w = Math.floor(el.clientWidth);
      setWidth(Math.max(200, Math.min(320, w || 320)));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!ready || !ref.current || !window.google?.accounts?.id) return;
    ref.current.innerHTML = '';
    try {
      window.google.accounts.id.renderButton(ref.current, {
        theme: theme === 'dark' ? 'filled_black' : 'outline',
        size: 'large',
        shape: 'pill',
        text: 'continue_with',
        width,
        locale: lang,
      });
    } catch (_) {
      setFailed(true);
    }
  }, [ready, theme, width, lang]);

  return (
    <div className="google-wrap">
      {failed && !ready ? (
        <p className="field-hint center google-fallback" role="status">
          <FiAlertCircle aria-hidden="true" /> {t.googleUnavailable}
        </p>
      ) : (
        <div ref={ref} className="google-btn" />
      )}
    </div>
  );
}

function CopyLinkButton() {
  const [state, setState] = useState('idle'); // idle | copied | failed
  const href = window.location.href.split('#')[0];
  return (
    <>
      <button
        type="button"
        className="btn btn-ghost"
        onClick={async () => setState((await copyText(href)) ? 'copied' : 'failed')}
      >
        {state === 'copied' ? <FiCheck aria-hidden="true" /> : <FiCopy aria-hidden="true" />}{' '}
        {state === 'copied' ? t.linkCopied : t.copyLink}
      </button>
      {state === 'failed' ? (
        <div className="copy-fallback">
          <label className="field-hint" htmlFor="copy-url">
            {t.copyFailed}
          </label>
          <input
            id="copy-url"
            className="input"
            readOnly
            value={href}
            onFocus={(e) => e.target.select()}
          />
        </div>
      ) : null}
      <span className="sr-only" role="status">
        {state === 'copied' ? t.linkCopied : ''}
      </span>
    </>
  );
}

/** Shown instead of the Google button inside embedded app browsers. */
export function InAppNotice({ browser }) {
  const intent = browser.platform === 'android' ? chromeIntentUrl(window.location.href.split('#')[0]) : null;
  return (
    <div className="inapp-notice" role="note">
      <p className="inapp-title">
        <FiAlertCircle aria-hidden="true" /> {t.inAppTitle}
      </p>
      <p className="small">{t.inAppBody(browser.app)}</p>
      <div className="inapp-actions">
        <CopyLinkButton />
        {intent ? (
          <a className="btn btn-primary" href={intent}>
            <FiChrome aria-hidden="true" /> {t.openInChrome}
          </a>
        ) : null}
      </div>
      <p className="field-hint">{browser.platform === 'android' ? t.inAppHintAndroid : t.inAppHintIos}</p>
    </div>
  );
}

/** A low-key disclosure for mobile users we could not classify (e.g. Telegram on iOS). */
function GoogleTrouble() {
  const [open, setOpen] = useState(false);
  return (
    <div className="google-trouble">
      <button
        type="button"
        className="link-btn"
        aria-expanded={open}
        aria-controls="google-trouble-body"
        onClick={() => setOpen((o) => !o)}
      >
        {t.googleTrouble}
      </button>
      {open ? (
        <div id="google-trouble-body" className="google-trouble-body">
          <p className="small">{t.googleTroubleBody}</p>
          <div className="inapp-actions">
            <CopyLinkButton />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function SessionNotice({ notice, onDismiss }) {
  if (!notice) return null;
  const expired = notice === 'expired';
  const deleted = notice === 'deleted';
  const icon = expired ? <FiClock /> : deleted ? <FiCheck /> : <FiAlertCircle />;
  const title = expired ? t.sessionExpiredTitle : deleted ? t.accountDeletedTitle : null;
  const body = expired ? t.sessionExpired : deleted ? t.accountDeleted : t.googleFailed;
  return (
    <div className={`notice-banner${expired ? ' is-warning' : deleted ? ' is-success' : ' is-error'}`} role="alert">
      <span className="notice-icon" aria-hidden="true">
        {icon}
      </span>
      <div className="notice-body">
        {title ? <p className="notice-title">{title}</p> : null}
        <p>{body}</p>
      </div>
      <button type="button" className="icon-btn notice-close" onClick={onDismiss} aria-label={t.dismiss}>
        <FiX aria-hidden="true" />
      </button>
    </div>
  );
}

export function AuthScreen({
  theme,
  themePreference,
  onCycleTheme,
  onSession,
  notice,
  onDismissNotice,
  lang,
  onLang,
}) {
  const [mode, setMode] = useState('login');
  const [googleErrors, setGoogleErrors] = useState([]);
  const [browser] = useState(currentBrowser);

  const handleGoogle = async (idToken) => {
    setGoogleErrors([]);
    try {
      const res = await apiGoogle(idToken);
      if (!res?.access_token) throw new Error(t.tokenMissing);
      onSession(res.access_token, res?.user?.email || '');
    } catch (err) {
      setGoogleErrors(toMessages(err, t.googleFailed));
    }
  };

  const mobile = browser.platform === 'ios' || browser.platform === 'android';

  return (
    <div className="auth-page">
      <div className="auth-topbar">
        <LanguageSwitch lang={lang} onChange={onLang} />
        <ThemeToggle preference={themePreference} onCycle={onCycleTheme} />
      </div>
      <main className="auth-card">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <FiCheckSquare />
          </span>
          <div>
            <h1>{t.appName}</h1>
            <p className="muted">{t.tagline}</p>
          </div>
        </div>

        <SessionNotice notice={notice} onDismiss={onDismissNotice} />

        <div className="segmented segmented-block" role="group" aria-label={t.authModeLabel}>
          {[
            ['login', t.signIn],
            ['signup', t.signUp],
          ].map(([m, label]) => (
            <button
              key={m}
              type="button"
              className={mode === m ? 'active' : ''}
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
            >
              {label}
            </button>
          ))}
        </div>

        <AuthForm key={mode} mode={mode} onSession={onSession} />

        <div className="auth-divider">
          <span>{t.or}</span>
        </div>
        {browser.inApp ? (
          <InAppNotice browser={browser} />
        ) : GOOGLE_CLIENT_ID ? (
          <>
            <GoogleSignIn theme={theme} onToken={handleGoogle} lang={lang} />
            {mobile ? <GoogleTrouble /> : null}
          </>
        ) : (
          <p className="field-hint center">{t.googleNotConfigured}</p>
        )}
        <ErrorList messages={googleErrors} />
      </main>
    </div>
  );
}
