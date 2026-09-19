// Local-storage layer. Used as the guest data store, and as an offline
// fallback if the back-end API is unreachable. Nothing here ever touches
// the Quran text itself — only user preferences, bookmarks and progress.

const KEYS = {
  consent: "quran.cookieConsent", // "accepted" | "rejected" | null
  theme: "quran.theme", // "light" | "dark"
  textSize: "quran.textSize", // "sm" | "md" | "lg"
  bookmarks: "quran.bookmarks", // guest bookmarks array
  progress: "quran.progress", // { surah, ayah, updatedAt }
  autoplay: "quran.autoplay",
  volume: "quran.volume",
};

function consentGiven() {
  return localStorage.getItem(KEYS.consent) === "accepted";
}

function getCookieConsent() {
  return localStorage.getItem(KEYS.consent);
}

function setCookieConsent(value) {
  // The consent flag itself must always be storable, otherwise we could
  // never remember a "reject" choice and would nag the user forever.
  try {
    localStorage.setItem(KEYS.consent, value);
  } catch (e) {
    /* storage unavailable (private mode) - fail silently */
  }
}

// Non-essential preferences respect the consent choice: if the user
// rejected, we still let the app function for the session (in-memory)
// but don't persist across visits.
const memoryFallback = {};

function read(key, fallback) {
  try {
    if (!consentGiven() && key !== KEYS.consent) {
      return key in memoryFallback ? memoryFallback[key] : fallback;
    }
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

function write(key, value) {
  memoryFallback[key] = value;
  try {
    if (!consentGiven() && key !== KEYS.consent) return; // don't persist without consent
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    /* ignore */
  }
}

export const store = {
  KEYS,
  consentGiven,
  getCookieConsent,
  setCookieConsent,

  getTheme: () => read(KEYS.theme, "light"),
  setTheme: (v) => write(KEYS.theme, v),

  getTextSize: () => read(KEYS.textSize, "md"),
  setTextSize: (v) => write(KEYS.textSize, v),

  getAutoplay: () => read(KEYS.autoplay, false),
  setAutoplay: (v) => write(KEYS.autoplay, v),

  getVolume: () => read(KEYS.volume, 1),
  setVolume: (v) => write(KEYS.volume, v),

  getGuestBookmarks: () => read(KEYS.bookmarks, []),
  setGuestBookmarks: (v) => write(KEYS.bookmarks, v),

  getGuestProgress: () => read(KEYS.progress, null),
  setGuestProgress: (v) => write(KEYS.progress, v),
};
