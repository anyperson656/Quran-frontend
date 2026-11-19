// Local-storage layer. Used as the guest data store, and as an offline
// fallback if the back-end API is unreachable. Nothing here ever touches
// the Quran text itself — only user preferences, bookmarks and progress.

const KEYS = {
  consent: "quran.cookieConsent", // "accepted" | "rejected" | null
  theme: "quran.theme", // "light" | "dark"
  textSize: "quran.textSize", // "sm" | "md" | "lg"
  bookmarks: "quran.bookmarks", // guest normal-surah bookmarks array
  normalParahBookmarks: "quran.normal_parah_bookmarks", // guest normal-parah bookmarks array
  translationBookmarks: "quran.translation_bookmarks", // guest translation-surah bookmarks array
  translationParahBookmarks: "quran.translation_parah_bookmarks", // guest translation-parah bookmarks array
  wordByWordBookmarks: "quran.word_by_word_bookmarks", // guest word-by-word (1 per surah) array
  progress: "quran.progress", // { surah, ayah, updatedAt }
  autoplay: "quran.autoplay",
  volume: "quran.volume",
  translationProgress: "quran.translation_progress",
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

function getKeyForExtraType(bookmarkType) {
  switch (bookmarkType) {
    case "normal_parah":
      return KEYS.normalParahBookmarks;
    case "translation_surah":
      return KEYS.translationBookmarks;
    case "translation_parah":
      return KEYS.translationParahBookmarks;
    case "word_by_word":
      return KEYS.wordByWordBookmarks;
    default:
      return null;
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

  getArabicFont: () => read("quran.arabicFont", "uthmani"),
  setArabicFont: (v) => write("quran.arabicFont", v),

  getVolume: () => read(KEYS.volume, 1),
  setVolume: (v) => write(KEYS.volume, v),

  // 1. Normal Surah bookmarks
  getGuestBookmarks: () => read(KEYS.bookmarks, []),
  setGuestBookmarks: (v) => write(KEYS.bookmarks, v),

  addGuestBookmark: (surahNumber, ayahNumber, mode = "surah", source = "plain", surahName = null) => {
    const list = store.getGuestBookmarks();
    const exists = list.some(
      (b) => b.surahNumber === surahNumber && b.ayahNumber === ayahNumber
    );
    if (!exists) {
      list.push({
        id: `local-surah-${surahNumber}-${ayahNumber}-${Date.now()}`,
        bookmarkType: "normal_surah",
        surahNumber,
        surahName,
        ayahNumber,
        mode,
        source,
        createdAt: new Date().toISOString(),
      });
      store.setGuestBookmarks(list);
    }
  },

  removeGuestBookmark: (idOrPredicate) => {
    const list = store.getGuestBookmarks();
    const next =
      typeof idOrPredicate === "function"
        ? list.filter((item) => !idOrPredicate(item))
        : list.filter((item) => String(item.id) !== String(idOrPredicate));
    store.setGuestBookmarks(next);
  },

  // 2. Normal Parah bookmarks
  getGuestNormalParahBookmarks: () => read(KEYS.normalParahBookmarks, []),
  setGuestNormalParahBookmarks: (v) => write(KEYS.normalParahBookmarks, v),

  // 3. Translation Surah bookmarks (keeps existing method names)
  getGuestTranslationBookmarks: () => read(KEYS.translationBookmarks, []),
  setGuestTranslationBookmarks: (v) => write(KEYS.translationBookmarks, v),

  // 4. Translation Parah bookmarks
  getGuestTranslationParahBookmarks: () => read(KEYS.translationParahBookmarks, []),
  setGuestTranslationParahBookmarks: (v) => write(KEYS.translationParahBookmarks, v),

  // 5. Word-by-Word bookmarks (single ayah per Surah per user)
  getGuestWordByWordBookmarks: () => read(KEYS.wordByWordBookmarks, []),
  setGuestWordByWordBookmarks: (v) => write(KEYS.wordByWordBookmarks, v),

  setGuestWordByWordBookmark: ({
    surahNumber,
    surahName = null,
    parahNumber = null,
    ayahNumber,
  }) => {
    const filtered = store
      .getGuestWordByWordBookmarks()
      .filter((b) => Number(b.surahNumber) !== Number(surahNumber));

    const entry = {
      id: `local-wbw-${surahNumber}-${Date.now()}`,
      bookmarkType: "word_by_word",
      surahNumber: Number(surahNumber),
      surahName,
      parahNumber: parahNumber != null ? Number(parahNumber) : null,
      ayahNumber: Number(ayahNumber),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    filtered.unshift(entry);
    store.setGuestWordByWordBookmarks(filtered);
    return entry;
  },

  // Generic helpers for any of the 4 extra categories
  getGuestExtraBookmarks: (bookmarkType) => {
    const key = getKeyForExtraType(bookmarkType);
    return key ? read(key, []) : [];
  },

  setGuestExtraBookmarks: (bookmarkType, list) => {
    const key = getKeyForExtraType(bookmarkType);
    if (key) write(key, list);
  },

  addGuestExtraBookmark: (item) => {
    const type = item.bookmarkType;
    if (type === "word_by_word") {
      return store.setGuestWordByWordBookmark(item);
    }
    const list = store.getGuestExtraBookmarks(type);
    const entry = {
      id: item.id || `local-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      bookmarkType: type,
      surahNumber: item.surahNumber ?? null,
      surahName: item.surahName ?? null,
      parahNumber: item.parahNumber ?? null,
      ayahNumber: item.ayahNumber ?? null,
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    list.unshift(entry);
    store.setGuestExtraBookmarks(type, list);
    return entry;
  },

  removeGuestExtraBookmark: (bookmarkType, id) => {
    const list = store.getGuestExtraBookmarks(bookmarkType);
    const next = list.filter((b) => String(b.id) !== String(id));
    store.setGuestExtraBookmarks(bookmarkType, next);
  },

  getReciter: () => read("quran.reciter", "maher_almuaiqly"),
  setReciter: (v) => write("quran.reciter", v),

  getNormalReciter: () => read("quran.normal_reciter", "maher_almuaiqly"),
  setNormalReciter: (v) => write("quran.normal_reciter", v),

  getGuestProgress: () => read(KEYS.progress, null),
  setGuestProgress: (v) => write(KEYS.progress, v),
  // Quran-with-Translation reader keeps its own position (never touches standard progress)
  getTranslationProgress: () => read(KEYS.translationProgress, null),
  setTranslationProgress: (v) => write(KEYS.translationProgress, v),
  getParahProgress: () => read("quran.parah_progress", null),
  setParahProgress: (v) => write("quran.parah_progress", v),
  getParahBookmarks: () => read("quran.parah_bookmarks", {}),
  setParahBookmarks: (v) => write("quran.parah_bookmarks", v),
  getLanguage: () => read("quran.language", "en"),
  setLanguage: (v) => write("quran.language", v),
};