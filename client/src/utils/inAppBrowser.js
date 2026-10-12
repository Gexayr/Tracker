// Detects embedded in-app browsers (webviews) where Google blocks OAuth
// ("disallowed_useragent"). Deliberately conservative: a false positive would
// hide a working Google button from a real Safari/Chrome user, so generic
// heuristics are limited to signals real browsers never send.

// Explicit app tokens (most reliable). Order matters: more specific first.
const APP_TOKENS = [
  [/\bFBAN\/Messenger|\bMessengerForiOS|\bOrca-Android|\bMessengerLite/, 'Messenger'],
  [/\bInstagram\b/, 'Instagram'],
  [/\bFBAN\/|\bFBAV\/|\bFB_IAB\/|\bFBIOS\b|\bFB4A\b|\[FBAN/, 'Facebook'],
  [/\bMicroMessenger\//, 'WeChat'],
  [/\bLine\/\d/, 'LINE'],
  [/\bTelegram(-Android)?\b/, 'Telegram'],
  [/\bBytedanceWebview\b|\bTikTok\b|\bmusical_ly\b|\btrill_\d|\bByteLocale\b/, 'TikTok'],
  [/\bLinkedInApp\b/, 'LinkedIn'],
  [/\bSnapchat\b/, 'Snapchat'],
  [/\bTwitter(Android)?\b/, 'X'],
  [/\bPinterest\//, 'Pinterest'],
  [/\bKAKAOTALK\b/i, 'KakaoTalk'],
];

/**
 * @param {string} ua navigator.userAgent
 * @param {{ standalone?: boolean, telegramProxy?: boolean }} env
 *   standalone: iOS home-screen web app (its UA lacks "Safari/" too — not a webview we must block)
 *   telegramProxy: window.TelegramWebviewProxy exists (Telegram's own in-app browser)
 * @returns {{ inApp: boolean, app: string|null, platform: 'ios'|'android'|'other' }}
 */
export function detectInAppBrowser(ua, env = {}) {
  const s = typeof ua === 'string' ? ua : '';
  const platform = /\b(iPhone|iPad|iPod)\b/.test(s) ? 'ios' : /\bAndroid\b/.test(s) ? 'android' : 'other';

  for (const [re, app] of APP_TOKENS) {
    if (re.test(s)) return { inApp: true, app, platform };
  }
  if (env.telegramProxy) return { inApp: true, app: 'Telegram', platform };

  // Android System WebView marks itself with "; wv)".
  if (platform === 'android' && /;\s?wv\)/.test(s)) return { inApp: true, app: null, platform };

  // iOS WKWebView without an app token: WebKit + "Mobile/" but no "Safari/".
  // Safari, Chrome (CriOS), Firefox (FxiOS), Edge (EdgiOS) all send "Safari/".
  if (
    platform === 'ios' &&
    !env.standalone &&
    /AppleWebKit\//.test(s) &&
    /\bMobile\//.test(s) &&
    !/\bSafari\//.test(s)
  ) {
    return { inApp: true, app: null, platform };
  }
  return { inApp: false, app: null, platform };
}

export function currentBrowser() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { inApp: false, app: null, platform: 'other' };
  }
  let standalone = false;
  try {
    standalone =
      navigator.standalone === true ||
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  } catch (_) {
    standalone = false;
  }
  return detectInAppBrowser(navigator.userAgent, {
    standalone,
    telegramProxy: typeof window.TelegramWebviewProxy !== 'undefined',
  });
}

/** intent:// URL that asks Android to open the current page in Chrome. */
export function chromeIntentUrl(href) {
  try {
    const u = new URL(href);
    const scheme = u.protocol.replace(':', '');
    return `intent://${u.host}${u.pathname}${u.search}${u.hash}#Intent;scheme=${scheme};package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(
      href
    )};end`;
  } catch (_) {
    return null;
  }
}
