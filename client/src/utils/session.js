/** True when the JWT carries an `exp` in the past (unparseable tokens are left to the server). */
export function isTokenExpired(token, nowMs = Date.now()) {
  try {
    const part = token.split('.')[1];
    if (!part) return false;
    const json = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof json.exp === 'number' && json.exp * 1000 <= nowMs;
  } catch (_) {
    return false;
  }
}
