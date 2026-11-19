const BASE_URL = (function () {
  const RENDER_API = "https://quran-backend-8k4b.onrender.com/api";
  if (window.QURAN_API_BASE) return window.QURAN_API_BASE;

  const isLocal = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  return isLocal ? "http://localhost:4000/api" : RENDER_API;
})();

const TOKEN_KEY = "quran.authToken";
function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; }
}
function setToken(t) {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch (e) { /* ignore */ }
}

async function request(path, options = {}) {
  let res;
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers["Authorization"] = "Bearer " + token;
  try {
    res = await fetch(BASE_URL + path, {
      credentials: "include",
      headers,
      ...options,
    });
  } catch (err) {
    throw new Error("NETWORK");
  }
  let body = null;
  try {
    body = await res.json();
  } catch (e) { /* no body */ }
  if (!res.ok) {
    const message = (body && body.error) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return body;
}

/* ---------- Tafsir (commentary) sources, one per app language ---------- */
const TAFSIR_BASES = [
  "https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir",
  "https://raw.githubusercontent.com/spa5k/tafsir_api/main/tafsir",
  "https://cdn.statically.io/gh/spa5k/tafsir_api/main/tafsir",
];
const TAFSIR_SOURCES = {
  ur: { slug: "ur-tafsir-bayan-ul-quran", name: "Bayan ul Quran — Dr. Israr Ahmad" },
  tr: { slug: "turkish-tafsir-as-saadi-turkish", name: "Tefsir es-Sa'dî (Türkçe)" },
  en: { slug: "en-tafsir-maarif-ul-quran", name: "Ma'arif al-Qur'an — Mufti Muhammad Shafi" },
};
const tafsirCache = new Map();

export const api = {
  hasToken() {
    return Boolean(getToken());
  },
  async signup(name, email, password) {
    const body = await request("/auth/signup", { method: "POST", body: JSON.stringify({ name, email, password }) });
    if (body && body.token) setToken(body.token);
    return body;
  },
  async login(email, password) {
    const body = await request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    if (body && body.token) setToken(body.token);
    return body;
  },
  async logout() {
    const body = await request("/auth/logout", { method: "POST" });
    setToken(null);
    return body;
  },
  async me() {
    return request("/auth/me");
  },
  async getBookmarks() {
    return request("/bookmarks");
  },
  async addBookmark(surahNumber, surahName, ayahNumber, mode = "surah", source = "plain") {
    return request("/bookmarks", {
      method: "POST",
      body: JSON.stringify({
        bookmarkType: "normal_surah",
        surahNumber,
        surahName,
        ayahNumber,
        mode,
        source,
      }),
    });
  },
  async addExtraBookmark({
    bookmarkType,
    surahNumber = null,
    surahName = null,
    parahNumber = null,
    ayahNumber = null,
  }) {
    return request("/bookmarks", {
      method: "POST",
      body: JSON.stringify({
        bookmarkType,
        surahNumber,
        surahName,
        parahNumber,
        ayahNumber,
      }),
    });
  },
  async removeBookmark(id, options = {}) {
    const isExtra =
      typeof options === "string"
        ? options === "extra"
        : Boolean(options && options.extra);
    const query = isExtra ? "?table=extra" : "";
    return request(`/bookmarks/${id}${query}`, { method: "DELETE" });
  },
  async getProgress() {
    return request("/progress");
  },
  async setProgress(surahNumber, ayahNumber) {
    return request("/progress", { method: "PUT", body: JSON.stringify({ surahNumber, ayahNumber }) });
  },

  // Tafsir for ONE ayah in the given app language (ur | tr | en). Cached per ayah.
  // NEVER throws: returns { text, name, lang, status }
  async getTafsir(surahNumber, ayahNumber, lang = "en") {
    const source = TAFSIR_SOURCES[lang] || TAFSIR_SOURCES.en;
    const key = `${source.slug}:${surahNumber}:${ayahNumber}`;
    if (tafsirCache.has(key)) return tafsirCache.get(key);

    const make = (text, status) => ({ text, name: source.name, lang, status });

    for (const base of TAFSIR_BASES) {
      try {
        const res = await fetch(`${base}/${source.slug}/${surahNumber}/${ayahNumber}.json`);
        if (res.status === 404) {
          const empty = make("", "empty");
          tafsirCache.set(key, empty);
          return empty;
        }
        if (!res.ok) continue; // Try next mirror if 403, 5xx, etc.
        const data = await res.json();
        const raw = typeof data === "string" ? data : (data.text ?? data.tafsir ?? data.content ?? "");
        const text = String(raw || "").trim();
        const result = make(text, text ? "ok" : "empty");
        tafsirCache.set(key, result);
        return result;
      } catch (e) {
        /* Network error -> try next mirror */
      }
    }
    return make("", "unavailable");
  },

  async getSurahTranslation(surahNumber, lang = "en") {
    // Map your app language codes to official AlQuran Cloud edition identifiers
    const editions = {
      en: "en.sahih",          // English - Sahih International
      ur: "ur.jalandhry",      // Urdu - Fateh Muhammad Jalandhry
      tr: "tr.vakfi",          // Turkish - Diyanet Vakfi Meali
      // You can add more languages here later easily (e.g., fr: "fr.hamidullah")
    };

    const translationEdition = editions[lang] || "en.sahih";

    // Fetch Arabic text and translation text simultaneously in one request
    const response = await fetch(
      `https://api.alquran.cloud/v1/surah/${surahNumber}/editions/quran-uthmani,${translationEdition}`
    );

    if (!response.ok) throw new Error("Failed to fetch translation from API");

    const result = await response.json();
    const arabicAyahs = result.data[0].ayahs;
    const translationAyahs = result.data[1].ayahs;

    return {
      ayahs: arabicAyahs.map((arabicAyah, index) => ({
        surahNumber: parseInt(surahNumber, 10),
        ayahNumber: arabicAyah.numberInSurah,
        arabicText: arabicAyah.text,
        translationText: translationAyahs[index].text,
      })),
    };
  },
};