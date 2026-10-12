import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FiEye, FiEyeOff, FiCheckSquare } from 'react-icons/fi';
import { apiGoogle, apiLogin, apiRegister, GOOGLE_CLIENT_ID } from '../api';
import { t } from '../i18n';
import { ThemeToggle } from './ThemeToggle';

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

function GoogleSignIn({ theme, onToken }) {
  const ref = useRef(null);
  const [ready, setReady] = useState(
    () => !!window.google?.accounts?.id && gisInitializedFor === GOOGLE_CLIENT_ID
  );
  const [width, setWidth] = useState(320);

  // Always call the latest callback without re-initializing GIS.
  useLayoutEffect(() => {
    gisCallbackRef.current = onToken;
  });

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return undefined;
    let cancelled = false;
    loadGis()
      .then(() => {
        if (cancelled) return;
        if (gisInitializedFor !== GOOGLE_CLIENT_ID) {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: (response) => {
              if (response?.credential) gisCallbackRef.current?.(response.credential);
            },
          });
          gisInitializedFor = GOOGLE_CLIENT_ID;
        }
        setReady(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
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
    window.google.accounts.id.renderButton(ref.current, {
      theme: theme === 'dark' ? 'filled_black' : 'outline',
      size: 'large',
      shape: 'pill',
      text: 'continue_with',
      width,
    });
  }, [ready, theme, width]);

  return (
    <div className="google-wrap">
      <div ref={ref} className="google-btn" />
    </div>
  );
}

export function AuthScreen({ theme, themePreference, onCycleTheme, onSession, notice }) {
  const [mode, setMode] = useState('login');
  const [googleErrors, setGoogleErrors] = useState([]);

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

  return (
    <div className="auth-page">
      <div className="auth-topbar">
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

        {notice ? (
          <div className="notice" role="status">
            {notice}
          </div>
        ) : null}

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
        {GOOGLE_CLIENT_ID ? (
          <GoogleSignIn theme={theme} onToken={handleGoogle} />
        ) : (
          <p className="field-hint center">{t.googleNotConfigured}</p>
        )}
        <ErrorList messages={googleErrors} />
      </main>
    </div>
  );
}
