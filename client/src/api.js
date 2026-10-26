import { t } from './i18n';

export const API_BASE = process.env.REACT_APP_API_URL || '/api';
export const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

export class ApiError extends Error {
  constructor(message, status, messages) {
    super(message);
    this.name = 'ApiError';
    this.status = status; // 0 = network error
    this.messages = messages; // string[]
  }
}

function normalizeMessages(raw, fallback) {
  if (Array.isArray(raw)) {
    const list = raw.filter((m) => typeof m === 'string' && m.trim()).map((m) => m.trim());
    return list.length ? list : [fallback];
  }
  if (typeof raw === 'string' && raw.trim()) return [raw.trim()];
  return [fallback];
}

async function request(path, { method = 'GET', token, body, signal, keepalive, fallback } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
      keepalive,
    });
  } catch (e) {
    if (e?.name === 'AbortError') throw e;
    throw new ApiError(t.networkError, 0, [t.networkError]);
  }
  if (!res.ok) {
    let raw;
    try {
      raw = (await res.json())?.message;
    } catch (_) {
      raw = undefined;
    }
    const fb = res.status === 429 ? t.rateLimited : fallback || `Request failed (${res.status})`;
    const messages = normalizeMessages(raw, fb);
    throw new ApiError(messages.join(' '), res.status, messages);
  }
  if (res.status === 204) return null;
  try {
    return await res.json();
  } catch (_) {
    return null;
  }
}

export const apiLogin = (email, password) =>
  request('/auth/login', { method: 'POST', body: { email, password }, fallback: t.loginFailed });

export const apiRegister = ({ email, password, name }) =>
  request('/auth/register', {
    method: 'POST',
    body: name ? { email, password, name } : { email, password },
    fallback: t.registerFailed,
  });

export const apiGoogle = (idToken) =>
  request('/auth/google', { method: 'POST', body: { idToken }, fallback: t.googleFailed });

export const apiProfile = (token, signal) => request('/auth/profile', { token, signal });

export const apiUpdateProfile = (token, changes) =>
  request('/auth/profile', { method: 'PATCH', token, body: changes });

/** `password` is only required when the account has one (see `hasPassword` on the profile). */
export const apiDeleteAccount = (token, password) =>
  request('/auth/account', {
    method: 'DELETE',
    token,
    body: password ? { password } : {},
  });

/** [{ year, month, payload }] for the months of `year` that exist. */
export const apiGetYear = (year, token, signal) =>
  request(`/storage/year/${year}`, { token, signal, fallback: t.yearLoadFailed });

export const apiGetMonth = (year, month, token, signal) =>
  request(`/storage/${year}/${month}`, { token, signal, fallback: t.loadFailed });

export const apiPutMonth = (year, month, payload, token, { keepalive } = {}) =>
  request('/storage', {
    method: 'PUT',
    token,
    body: { year, month, payload },
    keepalive,
    fallback: t.saveFailed,
  });
