/** 'unsupported' | 'default' | 'denied' | 'granted' */
export function notificationState() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return window.Notification.permission || 'default';
}

export async function requestNotificationPermission() {
  const state = notificationState();
  if (state !== 'default') return state;
  try {
    const result = await new Promise((resolve) => {
      const maybe = window.Notification.requestPermission(resolve); // old Safari: callback
      if (maybe && typeof maybe.then === 'function') maybe.then(resolve, () => resolve('default'));
    });
    return result || notificationState();
  } catch (_) {
    return notificationState();
  }
}

/** Shows a system notification; returns false when not possible. */
export function showNotification(title, { body, tag } = {}) {
  if (notificationState() !== 'granted') return false;
  try {
    const n = new window.Notification(title, { body, tag });
    n.onclick = () => {
      try {
        window.focus();
      } catch (_) {
        /* ignore */
      }
      n.close();
    };
    return true;
  } catch (_) {
    // e.g. Android Chrome requires a service worker for notifications.
    return false;
  }
}
