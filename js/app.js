import { store } from "./storage.js";
import { api } from "./api.js";
import { Player } from "./player.js";
import { t as i18nT } from "./i18n.js";
const t = i18nT || window.t || ((key, fallback) => fallback || key);
/* =====================================================
   ICONS (inline SVG, stroke-based, currentColor)
   ===================================================== */
const ICONS = {
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  bookmark: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"/></svg>`,
  bookmarkFilled: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"/></svg>`,
  play: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5v14l11-7z"/></svg>`,
  pause: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>`,
  prev: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 6v12L9 12z"/><rect x="6" y="6" width="2" height="12"/></svg>`,
  next: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6v12l9-6z"/><rect x="16" y="6" width="2" height="12"/></svg>`,
  moon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  sun: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`,
  menu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>`,
  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg>`,
  user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>`,
  volume: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9v6h4l5 5V4l-5 5H5z"/><path d="M17 9a4 4 0 0 1 0 6"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6"/></svg>`,
  tafsir: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="9" y1="12" x2="15" y2="12"/></svg>`,
};

/* =====================================================
   STATE
   ===================================================== */
const state = {
  surahs: [],
  quran: {},
  audio: {},
  user: null,
  authChecked: false,
  bookmarks: [], // [{id?, surahNumber, surahName, ayahNumber, createdAt}]
  translationBookmarks: [],
  extraBookmarks: [], // extra_bookmarks rows from API for signed-in users
  qmBookmarks: [], // word_by_word bookmarks from API for signed-in users
  progress: null, // {surahNumber, ayahNumber}
  route: { name: "home" },
};

let player = null;
const app = document.getElementById("app");

/* =====================================================
   DATA LOADING
   ===================================================== */
async function loadData() {
  const [surahs, quran, audio] = await Promise.all([
    fetch("js/data/surahs.json").then((r) => r.json()),
    fetch("js/data/quran.json").then((r) => r.json()),
    fetch("js/data/audio.json").then((r) => r.json()),
  ]);
  state.surahs = surahs;
  state.quran = quran;
  state.audio = audio;
}

async function loadUserState() {
  try {
    const me = await api.me();
    state.user = me.user;
  } catch (e) {
    state.user = null;
  }
  state.authChecked = true;
  await refreshBookmarksAndProgress();
}

async function refreshBookmarksAndProgress() {
  if (state.user) {
    try {
      const b = await api.getBookmarks();
      state.bookmarks = b.bookmarks || [];
      const extra = Array.isArray(b.extraBookmarks) ? b.extraBookmarks : [];
      state.extraBookmarks = extra;

      state.translationBookmarks = extra
        .filter((item) => item.bookmarkType === "translation_surah" || item.bookmarkType === "translation_parah")
        .map((item) => ({
          id: item.id,
          storageTable: "extra",
          surahNumber: Number(item.surahNumber),
          ayahNumber: Number(item.ayahNumber),
          mode: item.bookmarkType === "translation_parah" ? "para" : "surah",
          modeId: item.bookmarkType === "translation_parah" ? Number(item.parahNumber) : Number(item.surahNumber),
          createdAt: item.createdAt ? new Date(item.createdAt).getTime() : Date.now(),
        }));

      state.qmBookmarks = extra
        .filter((item) => item.bookmarkType === "word_by_word")
        .map((item) => ({
          id: item.id,
          storageTable: "extra",
          surahNumber: Number(item.surahNumber),
          surahName: item.surahName,
          ayahNumber: Number(item.ayahNumber),
          parahNumber: item.parahNumber != null ? Number(item.parahNumber) : null,
          createdAt: item.createdAt || new Date().toISOString(),
        }));
    } catch (e) {
      state.bookmarks = [];
      state.extraBookmarks = [];
      state.translationBookmarks = [];
      state.qmBookmarks = [];
    }
    try {
      const p = await api.getProgress();
      state.progress = p.progress || null;
    } catch (e) {
      state.progress = null;
    }
  } else {
    state.extraBookmarks = [];
    state.qmBookmarks = [];
    state.bookmarks = store.getGuestBookmarks();
    state.translationBookmarks = store.getGuestTranslationBookmarks ? store.getGuestTranslationBookmarks() : [];
    state.progress = store.getGuestProgress();
  }
}

/* =====================================================
   BOOKMARK HELPERS
   ===================================================== */
function isBookmarked(surahNumber, ayahNumber) {
  return state.bookmarks.some((b) => b.surahNumber === surahNumber && b.ayahNumber === ayahNumber);
}

async function toggleBookmark(surahNumber, surahName, ayahNumber) {
  // GUARD 1: Block object payloads marked as translation
  if (typeof surahNumber === "object" && surahNumber !== null) {
    if (surahNumber.source === "translation") return;
    ayahNumber = surahNumber.ayahNumber;
    surahName = surahNumber.surahName;
    surahNumber = surahNumber.surahNumber;
  }

  // GUARD 2: Block execution if currently in translation view or clicked inside translation container
  if (
    window.location.hash.includes("/translation") || 
    (document.activeElement && document.activeElement.closest(".btn-bookmark-trans")) ||
    surahName === "translation"
  ) {
    return;
  }

  const existing = state.bookmarks.find((b) => b.surahNumber === surahNumber && b.ayahNumber === ayahNumber);
  if (state.user) {
    try {
      if (existing) {
        await api.removeBookmark(existing.id);
      } else {
        await api.addBookmark(surahNumber, surahName, ayahNumber);
      }
      await refreshBookmarksAndProgress();
    } catch (e) {
      toast("Couldn't update your bookmark. Please try again.", "error");
      return;
    }
  } else {
    let list = store.getGuestBookmarks();
    if (existing) {
      list = list.filter((b) => !(b.surahNumber === surahNumber && b.ayahNumber === ayahNumber));
    } else {
      list.push({ id: `${surahNumber}:${ayahNumber}`, surahNumber, surahName, ayahNumber, createdAt: new Date().toISOString() });
    }
    store.setGuestBookmarks(list);
    state.bookmarks = list;
  }
  // render(); // Prevent global re-render from jumping position
}

async function saveProgress(surahNumber, ayahNumber) {
  state.progress = { surahNumber, ayahNumber, updatedAt: new Date().toISOString() };
  if (state.user) {
    try {
      await api.setProgress(surahNumber, ayahNumber);
    } catch (e) {
      /* non-fatal */
    }
  } else {
    store.setGuestProgress(state.progress);
  }
}

// Quran-with-Translation reading position tracker
function saveTranslationProgress(mode, number, surahNumber, ayahNumber) {
  if (!surahNumber || !ayahNumber) return;
  store.setTranslationProgress({
    mode: mode === "para" ? "para" : "surah",
    number: Number(number),
    surahNumber: Number(surahNumber),
    ayahNumber: Number(ayahNumber),
    updatedAt: new Date().toISOString(),
  });
}

/* =====================================================
   TOASTS
   ===================================================== */
function toast(message, type = "info") {
  const host = document.getElementById("toast-host");
  const el = document.createElement("div");
  el.className = `toast toast--${type}`;
  el.textContent = message;
  host.appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

/* =====================================================
   ROUTER
   ===================================================== */
function parseHash() {
  const hash = location.hash.replace(/^#\/?/, "");
  const [name, param, sub] = hash.split("/");
  if (!name) return { name: "home" };
  if (name === "translation" && !param) {
    return { name: "translation-home" };
  }
  if (name === "translation" && param) {
    return { 
      name: "translation", 
      mode: param || "surah", 
      number: sub ? parseInt(sub, 10) : 1 
    };
  }
  if (name === "surah" && param) return { name: "surah", number: parseInt(param, 10), ayah: sub ? parseInt(sub, 10) : null };
  if (name === "para" && param) return { name: "para", number: parseInt(param, 10) };
  if (name === "quran") return { name: "quran", number: param ? parseInt(param, 10) : 1, ayah: sub ? parseInt(sub, 10) : null }; // Quran word-by-word mode
  if (name === "bookmarks") return { name: "bookmarks" };
  if (name === "direction") return { name: "direction" };
  if (name === "settings") return { name: "settings" };
  if (name === "account") return { name: "account" };
  return { name: "home" };
}

function navigate(path) {
  location.hash = path;
}

window.addEventListener("hashchange", () => {
  state.route = parseHash();
  render();
  window.scrollTo({ top: 0 });
});

/* =====================================================
   AYAH JUMP (top-bar search pill)
   ===================================================== */
function isAyahJumpRoute(r = state.route || {}) {
  return (
    r.name === "surah" ||
    r.name === "para" ||
    (r.name === "translation" && (r.mode === "surah" || r.mode === "para"))
  );
}

function getAyahRows() {
  const r = state.route || {};
  return Array.from(
    document.querySelectorAll(
      r.name === "translation" ? "#translation-content .translation-row" : "#ayah-list .ayah"
    )
  );
}

function jumpToAyahNumber(raw) {
  const text = String(raw ?? "").trim();
  if (!/^\d+$/.test(text)) return false;

  const n = parseInt(text, 10);
  const rows = getAyahRows();
  const total = rows.length;
  if (!total || n < 1 || n > total) return false;

  const r = state.route || {};
  const isTrans = r.name === "translation";
  const isSurah = r.name === "surah" || r.mode === "surah";

  const el =
    (isSurah && document.getElementById(isTrans ? `trans-ayah-${n}` : `ayah-${n}`)) ||
    rows[n - 1];
  if (!el) return false;

  el.scrollIntoView({ behavior: "smooth", block: "center" });
  const cls = isTrans ? "ayah-highlight" : "is-target";
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), isTrans ? 3500 : 2600);
  return true;
}

// Global Scroll-to-Top Button Handler (Survives theme toggles and shell re-renders)
  if (!window.__scrollTopWired) {
    window.__scrollTopWired = true;

    window.addEventListener("scroll", () => {
      const btn = document.getElementById("scroll-top-btn");
      if (!btn) return;
      const route = (state.route && state.route.name) || "home";
      const onListPage = route === "home" || route === "translation-home";
      btn.classList.toggle("is-visible", onListPage && window.scrollY > 150);
    }, { passive: true });

    document.addEventListener("click", (e) => {
      const btn = e.target.closest("#scroll-top-btn");
      if (btn) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

/* =====================================================
   RENDER: SHELL (header + view mount)
   ===================================================== */
function renderShell() {
  const theme = store.getTheme();
  document.getElementById("app").setAttribute("data-theme", theme);

 const ayahJumpHtml = isAyahJumpRoute()
    ? `<label class="ayah-jump" id="ayah-jump" title="Jump to ayah">
          <span class="ayah-jump__icon">${ICONS.search}</span>
          <input type="number" id="ayah-jump-input" class="ayah-jump__input" inputmode="numeric" min="1" step="1" placeholder="Ayah" aria-label="Jump to ayah number" autocomplete="off">
        </label>`
    : "";

  app.innerHTML = `
    <header class="site-header">
      <a href="#/" class="brand"><span class="brand__mark">☾</span> Quran</a>
      <nav class="main-nav" id="main-nav">
        <a href="#/" data-route="home">Home</a>
        <a href="#/" data-route="surahs">Surahs</a>
        <a href="#/bookmarks" data-route="bookmarks">Bookmarks</a>
        <a href="#/direction" data-route="direction">Direction & Prayers</a>
        <a href="#/settings" data-route="settings">Settings</a>
      </nav>
      <div class="header-actions">
        ${ayahJumpHtml}
        <button class="icon-btn" id="theme-toggle" aria-label="Toggle dark mode">${theme === "dark" ? ICONS.sun : ICONS.moon}</button>
        <button class="icon-btn" id="account-btn" aria-label="Account">${ICONS.user}</button>
        <button class="icon-btn nav-toggle" id="nav-toggle" aria-label="Menu">${ICONS.menu}</button>
      </div>
    </header>
    <main class="view" id="view"></main>
    <footer class="site-footer">Default Recitation by Maher Al-Muaiqly · Text: Uthmani script</footer>
    <div class="player glass" id="player-bar"></div>
    <button class="scroll-top-btn" id="scroll-top-btn" aria-label="Scroll to top">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
    </button>
  `;

  document.getElementById("theme-toggle").addEventListener("click", () => {
  const currentScroll = window.scrollY;
  const next = store.getTheme() === "dark" ? "light" : "dark";
  store.setTheme(next);

  // Update theme dynamically on #app without wiping the DOM
  const appEl = document.getElementById("app");
  if (appEl) appEl.setAttribute("data-theme", next);

  // Update theme toggle icon
  const toggleBtn = document.getElementById("theme-toggle");
  if (toggleBtn) {
    toggleBtn.innerHTML = next === "dark" ? ICONS.sun : ICONS.moon;
  }

  // Instantly preserve exact scroll position (prevents fallback jumps to old bookmarks/read Ayahs)
  window.scrollTo({
    top: currentScroll,
    behavior: "instant"
  });
});

  document.getElementById("nav-toggle").addEventListener("click", () => {
    document.getElementById("main-nav").classList.toggle("is-open");
  });
  document.getElementById("account-btn").addEventListener("click", () => {
    if (state.user) navigate("/account");
    else openAuthModal();
  });
  document.querySelectorAll("#main-nav a").forEach((a) => {
    a.addEventListener("click", () => document.getElementById("main-nav").classList.remove("is-open"));
  });

  // Ayah jump pill (only exists on Surah / Parah pages)
  const jumpInput = document.getElementById("ayah-jump-input");
  if (jumpInput) {
    let lastJump = 0;
    const runJump = () => {
      if (Date.now() - lastJump < 400) return; 
      if (jumpToAyahNumber(jumpInput.value)) {
        lastJump = Date.now();
        jumpInput.blur();
        jumpInput.value = "";
      }
    };
    jumpInput.addEventListener("focus", () => {
      const total = getAyahRows().length;
      if (total) {
        jumpInput.max = total;
        jumpInput.placeholder = `1–${total}`;
      }
    });
    jumpInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); runJump(); }
    });
    jumpInput.addEventListener("change", runJump);
  }

  renderPlayerBar();
}


/* =====================================================
   RENDER: PLAYER BAR
   ===================================================== */
function renderPlayerBar() {
  const bar = document.getElementById("player-bar");
  bar.innerHTML = `
    <div class="player__meta">
      <div class="player__surah" id="player-surah">Nothing playing</div>
      <div class="player__reciter" id="player-reciter">Maher Al-Muaiqly</div>
    </div>
    <div class="player__controls">
      <button class="player__skipbtn" id="player-prev" aria-label="Previous surah">${ICONS.prev}</button>
      <button class="player__playbtn" id="player-toggle" aria-label="Play">${ICONS.play}</button>
      <button class="player__skipbtn" id="player-next" aria-label="Next surah">${ICONS.next}</button>
    </div>
    <div class="player__progress">
      <span class="player__time" id="player-current">0:00</span>
      <input type="range" min="0" max="100" value="0" class="player__seek" id="player-seek" aria-label="Seek">
      <span class="player__time" id="player-duration">0:00</span>
    </div>
    <div class="player__volume-wrap">
      <span aria-hidden="true">${ICONS.volume}</span>
      <input type="range" min="0" max="1" step="0.05" class="player__volume" id="player-volume" aria-label="Volume">
    </div>
    <div class="player__status" id="player-status"></div>
  `;

  document.getElementById("player-toggle").addEventListener("click", () => player.toggle());
  document.getElementById("player-prev").addEventListener("click", () => player.prev());
  document.getElementById("player-next").addEventListener("click", () => player.next());
  const seek = document.getElementById("player-seek");
  seek.addEventListener("input", (e) => player.seekPercent(Number(e.target.value)));
  const vol = document.getElementById("player-volume");
  vol.value = store.getVolume();
  vol.addEventListener("input", (e) => player.setVolume(Number(e.target.value)));

  player.onUpdate((s) => {
    const barEl = document.getElementById("player-bar");
    if (s.surah) barEl.classList.add("is-visible");
    const meta = player.currentSurahMeta();
    document.getElementById("player-surah").textContent = meta ? `${meta.number}. ${meta.name}` : "Nothing playing";
    document.getElementById("player-reciter").textContent = s.reciter;
    document.getElementById("player-toggle").innerHTML = s.playing ? ICONS.pause : ICONS.play;
    document.getElementById("player-toggle").setAttribute("aria-label", s.playing ? "Pause" : "Play");
    document.getElementById("player-current").textContent = s.currentLabel;
    document.getElementById("player-duration").textContent = s.durationLabel;
    const pct = s.duration ? (s.currentTime / s.duration) * 100 : 0;
    document.getElementById("player-seek").value = pct;
    document.getElementById("player-status").textContent = s.loading ? "Loading…" : s.error ? "" : "";
    if (s.error) toast(s.error, "error");
  });
}
 function renderParahList() {
  const container = document.getElementById("surah-list-container");
  if (!container) return;

  if (!state.parahs || state.parahs.length === 0) {
    container.innerHTML = '<div class="empty-state">No parahs found.</div>';
    return;
  }

  const query = (state.searchQuery || "").toLowerCase().trim();
  const filtered = state.parahs.filter((p) => {
    const numMatch = p.number.toString().includes(query);
    const nameMatch = (p.name || "").toLowerCase().includes(query);
    return numMatch || nameMatch;
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty-state">No parahs match your search.</div>`;
    return;
  }

  const list = (typeof window !== "undefined" && window.store && window.store.getTranslationBookmarks ? window.store.getTranslationBookmarks() :
                (typeof window !== "undefined" && window.store && window.store.getGuestTranslationBookmarks ? window.store.getGuestTranslationBookmarks() : null)) ||
                state.translationBookmarks ||
                JSON.parse(localStorage.getItem("translationBookmarks") || "[]");

  container.innerHTML = filtered
    .map((p) => {
      const hasTransBookmark = Array.isArray(list) && list.some((b) => {
        const sNum = Number(b.surahNumber || b.surah);
        const mId = Number(b.modeId || b.id || sNum);
        const matchMode = mId === Number(p.number) && b.mode === "para";
        const matchSurahRange = p.start && p.end && sNum >= Number(p.start.surah) && sNum <= Number(p.end.surah);
        return matchMode || matchSurahRange;
      });

      const bookmarkDotHtml = hasTransBookmark
        ? `<span class="trans-bookmark-dot" title="Translation bookmark saved"></span>`
        : "";

      return `
        <a href="#/para/${p.number}" class="surah-card">
          <div class="surah-card__number">${p.number}</div>
          <div class="surah-card__info">
            <div class="surah-card__name">${p.name} ${bookmarkDotHtml}</div>
            <div class="surah-card__meta">Surah ${p.start.surah}:${p.start.ayah} - Surah ${p.end.surah}:${p.end.ayah}</div>
          </div>
        </a>
      `;
    })
    .join("");
}
function renderSurahList() {
  const container = document.getElementById("surah-list-container");
  if (!container) return;

  if (!state.surahs || state.surahs.length === 0) {
    container.innerHTML = `<div class="empty-state">No surahs found.</div>`;
    return;
  }

  const query = (state.searchQuery || "").toLowerCase().trim();
  const filtered = state.surahs.filter((s) => {
    const numMatch = s.number.toString().includes(query);
    const nameMatch = (s.name || "").toLowerCase().includes(query);
    const englishMatch = (s.englishName || "").toLowerCase().includes(query);
    return numMatch || nameMatch || englishMatch;
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty-state">${t("home.noResults", "No surahs match your search.")}</div>`;
    return;
  }

  container.innerHTML = filtered
  .map((s) => {
    // Check all possible bookmark stores & local storage fallback
    const list = (typeof window !== "undefined" && window.store && window.store.getTranslationBookmarks ? window.store.getTranslationBookmarks() : null) ||
                 (typeof window !== "undefined" && window.store && window.store.getGuestTranslationBookmarks ? window.store.getGuestTranslationBookmarks() : null) ||
                 state.translationBookmarks || 
                 JSON.parse(localStorage.getItem("translationBookmarks") || "[]");

    const hasTransBookmark = Array.isArray(list) && list.some(
      (b) => Number(b.surahNumber || b.surah) === Number(s.number)
    );

    const bookmarkDotHtml = hasTransBookmark
      ? `<span class="trans-bookmark-dot" title="Translation bookmark saved"></span>`
      : "";

    return `
      <a href="#/surah/${s.number}" class="surah-card">
        <div class="surah-card__number">${s.number}</div>
        <div class="surah-card__info">
          <div class="surah-card__name">${s.englishName} ${bookmarkDotHtml}</div>
          <div class="surah-card__meta">${s.englishNameTranslation} • ${s.numberOfAyahs} Ayahs</div>
        </div>
        <div class="surah-card__arabic">${s.name}</div>
      </a>
    `;
  })
  .join("");
}
/* =========================================================
   RENDER: HOME
   ========================================================= */
function renderHome() {
  const totalSurahs = state.surahs.length;
  const totalParahs = 30;
  const progress = state.progress;
  const progressSurah = progress ? state.surahs.find((s) => s.number === progress.surahNumber) : null;
  const parahResume = progressSurah ? getParahResume() : null;

  // Mode toggle state (surah vs para)
  const browseMode = localStorage.getItem("quran.browseMode") || "surah";
  const isPara = browseMode === "para";

  // Dynamic titles and translations
  const titleText = isPara ? t("home.allParahs", "All Parahs") : t("home.allSurahs", "All Surahs");
  const subText = isPara ? t("home.subtextParahs", "Tap any parah to start reading and listening.") : t("home.subtextSurahs", "Tap any surah to start reading and listening.");
  const toggleBtnText = isPara ? t("home.surahsShort", "Surahs") : t("home.parahsShort", "Parahs");
  const searchPlaceholder = isPara ? t("home.searchParaPlaceholder", "Search by parah number...") : t("home.searchSurahPlaceholder", "Search by name or number...");

  const view = document.getElementById("view");
  view.innerHTML = `
    <section class="hero">
      <div class="hero__kicker">${t("home.kicker", "The Noble Qur'an")}</div>
      <h1 class="hero__title">${t("home.title", "Quran")}</h1>
      <p class="hero__subtitle">${t("home.subtitle", "Read, listen, and continue your journey through the Qur'an.")}</p>
       <div class="hero__actions">
  <button class="btn btn--primary" id="cta-browse">${isPara ? t("home.browseParahs", "Browse Parahs (Juz)") : t("home.browseSurahs", "Browse Surahs")}</button>
  <button class="btn btn--ghost btn--glass-white" id="cta-bookmarks-home">${t("home.bookmarks", "Bookmarks")}</button>
</div>
<div class="hero__actions-full" style="margin-top: 12px; width: 100%;">
 <a href="#/translation" class="translation-gold-btn" id="cta-translation" style="width: 40%; text-align: center; display: block; box-sizing: border-box;">Qur'an with Translation</a>
</div>
      <div class="stat-row">
        <div><strong>${isPara ? totalParahs : totalSurahs}</strong> ${isPara ? t("home.totalParahs", "Total Parahs") : t("home.totalSurahs", "Total Surahs")}</div>
        <div><strong>Maher Al-Muaiqly</strong> ${t("home.reciter", "Reciter")}</div>
        <div><strong>6,236</strong> ${t("home.totalAyahs", "Total Ayahs")}</div>
      </div>
      ${
        progressSurah
          ? `<div class="continue-card">
              <div>
                <div class="continue-card__label">${t("home.continueReading", "Continue Reading")}</div>
                <div class="continue-card__title">${parahResume
                  ? `Parah ${parahResume.parahNumber} • ${progressSurah.name}, Ayah ${progress.ayahNumber}`
                  : `${progressSurah.number}. ${progressSurah.name} • Ayah ${progress.ayahNumber}`}</div>
              </div>
              <button class="btn btn--accent" id="cta-continue">${t("home.resume", "Resume")}</button>
            </div>`
          : ""
      }
    </section>

    <section class="section">
      <div class="section__head" style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 1rem;">
        <div>
          <h2 class="section__title">${titleText}</h2>
          <p class="section__sub">${subText}</p>
        </div>
        <div class="trans-toggle-wrap" style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.75rem;">
          <div class="qm-toggle-row">
            <a href="#/quran/1" class="qm-entry-btn" id="qm-entry-btn" aria-label="Open Quran word-by-word reader">${QM_REHAL_ICON}<span>Quran</span></a>
            <button id="browse-mode-toggle" class="btn btn--accent">${toggleBtnText}</button>
          </div>
          <div class="search-box">
            ${ICONS.search}
            <input type="text" id="surah-search" placeholder="${searchPlaceholder}" aria-label="Search">
          </div>
        </div>
      </div>
      <div class="surah-grid" id="surah-grid"></div>
    </section>
  `;

  // Shared Surah <-> Parah switch (used by the section toggle)
  const flipBrowseMode = () => {
    localStorage.setItem("quran.browseMode", isPara ? "surah" : "para");
    renderHome();
  };

  document.getElementById("cta-browse").addEventListener("click", () => {
    const sec = document.querySelector(".section");
    if (sec) sec.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.getElementById("cta-bookmarks-home").addEventListener("click", () => navigate("/bookmarks"));

  const contBtn = document.getElementById("cta-continue");
  if (contBtn && progressSurah) {
    contBtn.addEventListener("click", () => {
      if (parahResume) {
        state.pendingParahJump = { parah: parahResume.parahNumber, surah: progress.surahNumber, ayah: progress.ayahNumber };
        navigate(`/para/${parahResume.parahNumber}`);
      } else {
        navigate(`/surah/${progress.surahNumber}/${progress.ayahNumber}`);
      }
    });
  }

  // Browse Mode Toggle handler
  const toggleBtn = document.getElementById("browse-mode-toggle");
  if (toggleBtn) toggleBtn.addEventListener("click", flipBrowseMode);

  // Initial Grid render
  if (isPara) {
    renderParaGrid(state.paras || []);
  } else {
    renderSurahGrid(state.surahs || []);
  }

  // Dynamic Search listener
  document.getElementById("surah-search").addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    if (isPara) {
      const filtered = !q
        ? state.paras
        : (state.paras || []).filter(
            (p) =>
              p.name.toLowerCase().includes(q) ||
              String(p.number) === q ||
              `para ${p.number}`.includes(q) ||
              `juz ${p.number}`.includes(q)
          );
      renderParaGrid(filtered);
    } else {
      const filtered = !q
        ? state.surahs
        : (state.surahs || []).filter(
            (s) =>
              s.name.toLowerCase().includes(q) ||
              (s.englishMeaning && s.englishMeaning.toLowerCase().includes(q)) ||
              String(s.number) === q
          );
      renderSurahGrid(filtered);
    }
  });
}

function renderSurahGrid(list) {
  const grid = document.getElementById("surah-grid");
  if (!grid) return;

  if (!list.length) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-state__icon">${ICONS.search}</div>3>No surahs found</h3><p>Try a different name or number.</p></div>`;
    return;
  }

  grid.innerHTML = list
    .map((s) => {
      const hasBookmark = state.bookmarks.some((b) => b.surahNumber === s.number);
      return `
        <button class="surah-card" data-num="${s.number}">
          <span class="surah-card__num">${s.number}</span>
          <span class="surah-card__body">
            <span class="surah-card__name">${s.name}</span>
            <span class="surah-card__meta">${s.ayahsCount || s.ayahCount} ayahs • ${s.revelationType}</span>
          </span>
          ${hasBookmark ? `<span class="surah-card__bookmark-dot" title="Has a bookmark"></span>` : ""}
          <span class="surah-card__arabic">${s.arabicName || s.nameArabic}</span>
        </button>
      `;
    })
    .join("");

  grid.querySelectorAll(".surah-card").forEach((el) => {
    el.addEventListener("click", () => navigate(`/surah/${el.dataset.num}`));
  });
}

// Normal Quran parahs: loaded separately (state.normalParas) so Translation mode is never affected
let normalParasPromise = null;
function loadNormalParas() {
  if (Array.isArray(state.normalParas)) return Promise.resolve(state.normalParas);
  if (!normalParasPromise) {
    normalParasPromise = fetch("js/data/paras.json")
      .then((r) => r.json())
      .then((d) => (state.normalParas = Array.isArray(d) ? d : []))
      .catch(() => (state.normalParas = []));
  }
  return normalParasPromise;
}

// NOTE: takes no arguments on purpose. The home screen's search listener still
// passes a list (possibly undefined); it is ignored and the search box is read here.
function renderParaGrid() {
  const grid = document.getElementById("surah-grid");
  if (!grid) return;

  // Not loaded yet: show a loader, fetch once, then draw again
  if (!Array.isArray(state.normalParas)) {
    grid.innerHTML = `<div class="empty-state"><h3>Loading parahs…</h3></div>`;
    loadNormalParas().then(() => {
      if (document.getElementById("surah-grid") === grid) renderParaGrid();
    });
    return;
  }

  // Safe defaults so nothing below can hit "undefined"
  const paras = state.normalParas.filter((p) => p && p.start && p.end);
  const surahs = Array.isArray(state.surahs) ? state.surahs : [];
  const bookmarks = Array.isArray(state.bookmarks) ? state.bookmarks : [];
  const juzMeta = typeof JUZ_META !== "undefined" && Array.isArray(JUZ_META) ? JUZ_META : [];

  const searchEl = document.getElementById("surah-search");
  const q = searchEl ? String(searchEl.value || "").trim().toLowerCase() : "";

  const surahName = (n) => (surahs.find((s) => s.number === n) || {}).name || `Surah ${n}`;

  const items = paras.map((p) => {
    const meta = juzMeta[p.number - 1] || {};
    return {
      p,
      title: meta.name || p.name || `Parah ${p.number}`,
      arabic: meta.arabic || "",
      details:
        meta.ayahs ||
        `${surahName(p.start.surah)} ${p.start.ayah} - ${surahName(p.end.surah)} ${p.end.ayah}`,
    };
  });

  const isNumber = /^\d+$/.test(q); // "5" means Parah 5 only, not every range containing a 5
  const filtered = !q
    ? items
    : isNumber
    ? items.filter((it) => String(it.p.number) === q)
    : items.filter(
        (it) =>
          `parah ${it.p.number}` === q ||
          `para ${it.p.number}` === q ||
          `juz ${it.p.number}` === q ||
          String(it.title).toLowerCase().includes(q) ||
          String(it.p.name || "").toLowerCase().includes(q) ||
          String(it.details).toLowerCase().includes(q)
      );

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-state__icon">${ICONS.search}</div><h3>No parahs found</h3><p>Try a different number or name.</p></div>`;
    return;
  }

  // Bookmark dot: any saved Normal Quran bookmark inside this parah's range
  const hasBookmarkIn = (p) =>
    bookmarks.some((b) => {
      const s = Number(b.surahNumber), a = Number(b.ayahNumber);
      const afterStart = s > p.start.surah || (s === p.start.surah && a >= p.start.ayah);
      const beforeEnd = s < p.end.surah || (s === p.end.surah && a <= p.end.ayah);
      return afterStart && beforeEnd;
    });

  grid.innerHTML = filtered
    .map(
      ({ p, title, arabic, details }) => `
        <button class="surah-card" data-para="${p.number}">
          <span class="surah-card__num">${p.number}</span>
          <span class="surah-card__body">
            <span class="surah-card__name">${title}</span>
            <span class="surah-card__meta">${details}</span>
          </span>
          ${arabic ? `<span class="surah-card__arabic">${arabic}</span>` : ""}
          ${hasBookmarkIn(p) ? `<span class="surah-card__bookmark-dot" title="Bookmark saved"></span>` : ""}
        </button>
      `
    )
    .join("");

  grid.querySelectorAll("[data-para]").forEach((el) => {
    el.addEventListener("click", () => navigate(`/para/${el.dataset.para}`));
  });
}

/* =====================================================
   NORMAL QURAN RECITERS (independent of Translation mode)
   Saved under its own key: "quran.normal_reciter"
   ===================================================== */
const NORMAL_RECITERS = [
  { id: "maher_almuaiqly", name: "Maher Al-Muaiqly", sub: "Default", folder: "MaherAlMuaiqly128kbps", surahServer: "https://server12.mp3quran.net/maher/" },
  { id: "yasser_aldosari", name: "Sheikh Yasser Al-Dosari", sub: "", folder: "Yasser_Ad-Dussary_128kbps", surahServer: "https://server11.mp3quran.net/yasser/" },
  { id: "urdu_arabic_shamshad", name: "Mishary Alafasy + Shamshad Ali Khan", sub: "Arabic + Urdu translation", folder: "Alafasy_128kbps", translationFolder: "translations/urdu_shamshad_ali_khan_46kbps" },
  { id: "english_arabic_ibrahim", name: "Mishary Alafasy + Ibrahim Walk", sub: "Arabic + English translation", folder: "Alafasy_128kbps", translationFolder: "English/Sahih_Intnl_Ibrahim_Walk_192kbps" },
  { id: "sudais", name: "Abdul Rahman Al-Sudais", sub: "", folder: "Abdurrahmaan_As-Sudais_192kbps" },
  { id: "saad_alghamdi", name: "Saad Al-Ghamdi", sub: "", folder: "Ghamadi_40kbps" },
  { id: "abubakr_alshatri", name: "Abu Bakr Al-Shatri", sub: "", folder: "Abu_Bakr_Ash-Shaatree_128kbps" },
  { id: "nasser_alqatami", name: "Nasser Al Qatami", sub: "", folder: "Nasser_Alqatami_128kbps" },
  { id: "hani_rifai", name: "Hani Ar-Rifai", sub: "", folder: "Hani_Rifai_192kbps" },
  { id: "ahmed_alajmi", name: "Ahmed Al-Ajmi", sub: "", folder: "Ahmed_ibn_Ali_al-Ajamy_128kbps_ketaballah.net" },
  { id: "minshawi", name: "Mohamed Siddiq El-Minshawi", sub: "", folder: "Minshawy_Murattal_128kbps" },
  { id: "husary", name: "Mahmoud Khalil Al-Husary", sub: "", folder: "Husary_128kbps" },
  { id: "alafasy", name: "Mishary Rashid Alafasy", sub: "", folder: "Alafasy_128kbps" },
  { id: "maher_murattal_64", name: "Maher Al-Muaiqly", sub: "Murattal / Alternative", folder: "Maher_AlMuaiqly_64kbps" },
  { id: "saud_alshuraim", name: "Saud Al-Shuraim", sub: "", folder: "Saood_ash-Shuraym_128kbps" },
];

function getNormalReciter() {
  const id = store.getNormalReciter();
  return NORMAL_RECITERS.find((r) => r.id === id) || NORMAL_RECITERS[0];
}

function openNormalReciterModal() {
  document.querySelectorAll(".reciter-overlay").forEach((el) => el.remove());
  const activeId = getNormalReciter().id;

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay reciter-overlay";
  overlay.innerHTML = `
    <div class="modal reciter-modal" role="dialog" aria-label="Choose reciter">
      <button class="icon-btn modal-close" id="reciter-close" aria-label="Close">${ICONS.close}</button>
      <h2>Choose Reciter</h2>
      <p class="modal-sub">Applies to every surah and parah.</p>
      <div class="reciter-list">
        ${NORMAL_RECITERS.map((r) => `
          <button type="button" class="reciter-option ${r.id === activeId ? "is-active" : ""}" data-reciter="${r.id}" aria-pressed="${r.id === activeId}">
            <span class="reciter-option__text">
              <span class="reciter-option__name">${r.name}</span>
              ${r.sub ? `<span class="reciter-option__sub">${r.sub}</span>` : ""}
            </span>
            <span class="reciter-option__tick" aria-hidden="true">${TICK_ICON}</span>
          </button>`).join("")}
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const onKey = (e) => { if (e.key === "Escape") close(); };
  const close = () => { overlay.remove(); document.removeEventListener("keydown", onKey); };
  document.addEventListener("keydown", onKey);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  overlay.querySelector("#reciter-close").addEventListener("click", close);

  overlay.querySelectorAll(".reciter-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      const reciter = NORMAL_RECITERS.find((r) => r.id === btn.dataset.reciter);
      if (!reciter) return;
      store.setNormalReciter(reciter.id);
      player.setReciter(reciter);
      overlay.querySelectorAll(".reciter-option").forEach((b) => {
        const on = b === btn;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-pressed", String(on));
      });
      toast(`Reciter: ${reciter.name}${reciter.sub && reciter.sub !== "Default" ? " (" + reciter.sub + ")" : ""}`, "success");
      setTimeout(close, 250);
    });
  });
}

function wireReaderReciterButton() {
  const btn = document.getElementById("reader-reciter-btn");
  if (btn) btn.addEventListener("click", openNormalReciterModal);
}

/* =====================================================
   RENDER: SURAH READER
   ===================================================== */
let readerObserver = null;

function renderReader(number, jumpToAyah) {
  const meta = state.surahs.find((s) => s.number === number);
  const view = document.getElementById("view");
  if (!meta) {
    view.innerHTML = `<div class="empty-state"><h3>Surah not found</h3></div>`;
    return;
  }
  const ayahs = state.quran[String(number)] || [];
  const textSize = store.getTextSize();
  const prev = state.surahs.find((s) => s.number === number - 1);
  const next = state.surahs.find((s) => s.number === number + 1);
  const showBismillah = number !== 1 && number !== 9;

  view.innerHTML = `
    <div class="reader text-size-${textSize}">
      <div class="reader-topbar">
        <button class="btn btn--ghost btn--sm" id="back-home">← All Surahs</button>
        <div class="reader-topbar__actions">
         <button type="button" class="icon-btn" id="reader-reciter-btn" aria-label="Choose reciter" title="Choose reciter">${HEADPHONES_ICON}</button>
          <button class="btn btn--accent btn--sm" id="play-surah">${ICONS.play} Listen</button>
        </div>
      </div>
      <div class="reader-header">
        <div class="reader-header__eyebrow">Surah ${meta.number} of 114</div>
        <div class="reader-header__arabic">${meta.arabicName}</div>
        <div class="reader-header__name">${meta.name} · ${meta.englishMeaning}</div>
        <div class="reader-header__meta">${meta.ayahCount} ayahs · ${meta.revelationType}</div>
      </div>
      ${showBismillah ? `<p class="bismillah">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</p>` : ""}
      <div id="ayah-list"></div>
      <div class="reader-footer-nav">
        ${prev ? `<a class="nav-link-card" href="#/surah/${prev.number}"><span class="nav-link-card__label">Previous</span><span class="nav-link-card__name">${prev.number}. ${prev.name}</span></a>` : `<span></span>`}
        ${next ? `<a class="nav-link-card nav-link-card--next" href="#/surah/${next.number}"><span class="nav-link-card__label">Next</span><span class="nav-link-card__name">${next.number}. ${next.name}</span></a>` : `<span></span>`}
      </div>
    </div>
  `;

  document.getElementById("back-home").addEventListener("click", () => navigate("/"));
  document.getElementById("play-surah").addEventListener("click", () => {
    const playerBar = document.getElementById("player-bar");
    if (playerBar) {
      playerBar.hidden = false;
      playerBar.style.display = "";
      playerBar.classList.remove("is-hidden", "hidden");
      playerBar.classList.add("is-visible");
    }
    if (typeof renderPlayerBar === "function") {
      renderPlayerBar();
    }
    player.load(number, { autoplay: true });
    if (playerBar) {
      playerBar.classList.add("is-visible");
    }
  });

  const list = document.getElementById("ayah-list");
  list.innerHTML = ayahs
    .map((a) => {
      const bookmarked = isBookmarked(number, a.number);
      return `
      <div class="ayah" data-ayah="${a.number}" id="ayah-${a.number}">
        <span class="ayah__number">${a.number}</span>
        <div class="ayah__main">
          <p class="ayah__arabic">${a.text}</p>
          <div class="ayah__actions">
            <button class="ayah-action ${isBookmarked(number, a.number) ? 'is-active' : ''}" data-action="bookmark" data-ayah="${a.number}" 
             aria-label="${isBookmarked(number, a.number) ? 'Remove bookmark' : 'Bookmark this ayah'}" 
             aria-pressed="${isBookmarked(number, a.number)}">
             ${isBookmarked(number, a.number) ? ICONS.bookmarkFilled : ICONS.bookmark}
           </button>
          </div>
        </div>
      </div>`;
    })
    .join("");

list.querySelectorAll('[data-action="bookmark"]').forEach((btn) => {
    btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const ayahNum = Number(btn.dataset.ayah);
        
        // 1. Toggle the bookmark
        toggleBookmark(number, meta ? meta.name : '', ayahNum);

        // 2. Update progress
        if (typeof saveProgress === "function") {
            saveProgress(number, ayahNum);
        }

        // 3. Find if there are ANY other bookmarked ayahs in this Surah to fall back to
        if (typeof state !== "undefined" && Array.isArray(state.bookmarks)) {
            const otherBookmarkInSurah = state.bookmarks.find(
                (b) => Number(b.surahNumber) === Number(number) && Number(b.ayahNumber) !== Number(ayahNum)
            );
            if (otherBookmarkInSurah) {
                jumpToAyah = otherBookmarkInSurah.ayahNumber;
                // Instantly scroll back to the previously bookmarked ayah
                const fallbackTarget = document.getElementById(`ayah-${jumpToAyah}`);
                if (fallbackTarget) {
                    fallbackTarget.classList.add("is-target");
                    setTimeout(() => fallbackTarget.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
                    setTimeout(() => fallbackTarget.classList.remove("is-target"), 2600);
                }
            }
        }

        // 4. Update button UI styling and icon instantly based on state
        const isNowBookmarked = typeof isBookmarked === "function" 
            ? isBookmarked(number, ayahNum) 
            : false;
            
        if (isNowBookmarked) {
            btn.classList.add("is-active");
            btn.innerHTML = ICONS.bookmarkFilled;
            btn.setAttribute("aria-pressed", "true");
            btn.setAttribute("aria-label", "Remove bookmark");
        } else {
            btn.classList.remove("is-active");
            btn.innerHTML = ICONS.bookmark;
            btn.setAttribute("aria-pressed", "false");
            btn.setAttribute("aria-label", "Bookmark this ayah");
        }
    });
});

wireReaderReciterButton();

// Automatically stop Normal Quran audio, clear player state, and hide player bar when leaving a Surah or Parah reader page
window.addEventListener("hashchange", () => {
  const currentHash = window.location.hash;
  if (!currentHash.includes("/surah/") && !currentHash.includes("/para/")) {
    if (typeof player !== "undefined" && player && player.audio) {
      player.audio.pause();
      player.audio.currentTime = 0;
      player.audio.removeAttribute("src"); // Safely removes the source attribute completely
      player.currentSurah = null;
      player.loadedReciter = null;
      player._chain = null;
      player._emit(); // Refresh the player bar state to "Nothing playing"
    }
    const playerBar = document.getElementById("player-bar");
    if (playerBar) {
      playerBar.classList.remove("is-visible");
    }
  }
});

// 1. Normal Quran: Keep player bar visible across Surah Next/Previous transitions even after visiting translation mode
document.addEventListener("click", (e) => {
  const navCard = e.target.closest("a[href*='#/surah/']");
  if (navCard) {
    // Check if we are navigating within normal surahs and normal audio is active
    if (typeof player !== "undefined" && player && player.audio && !player.audio.paused) {
      setTimeout(() => {
        const playerBar = document.getElementById("player-bar");
        if (playerBar) {
          playerBar.hidden = false;
          playerBar.style.display = "";
          playerBar.classList.remove("is-hidden", "hidden");
          playerBar.classList.add("is-visible");
        }
      }, 150);
    }
  }
});



  // Track reading progress as the user scrolls.
  if (readerObserver) readerObserver.disconnect();
  let lastSeen = jumpToAyah || 1;
  readerObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const n = Number(entry.target.dataset.ayah);
          if (n > lastSeen) lastSeen = n;
        }
      });
    },
    { rootMargin: "-40% 0px -40% 0px" }
  );
  list.querySelectorAll(".ayah").forEach((el) => readerObserver.observe(el));
  window.addEventListener(
    "hashchange",
    () => {
      saveProgress(number, lastSeen);
    },
    { once: true }
  );
  // Also save periodically while reading this surah.
  const saveInterval = setInterval(() => saveProgress(number, lastSeen), 5000);
  const clearOnLeave = () => {
    clearInterval(saveInterval);
    saveProgress(number, lastSeen);
    window.removeEventListener("hashchange", clearOnLeave);
  };
  window.addEventListener("hashchange", clearOnLeave, { once: true });

  if (jumpToAyah) {
    const target = document.getElementById(`ayah-${jumpToAyah}`);
    if (target) {
        target.classList.add("is-target");
        setTimeout(() => target.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
        setTimeout(() => target.classList.remove("is-target"), 2600);
    }
    
    // Check if this left-off ayah is bookmarked
    const isTargetBookmarked = typeof isBookmarked === "function" ? isBookmarked(number, jumpToAyah) : false;
    
    // If it's NOT bookmarked, clear jumpToAyah after scrolling so it never acts as a fallback later
    if (!isTargetBookmarked) {
        jumpToAyah = null;
    }
}
}

/* =====================================================
   NORMAL QURAN PARAH READER (#/para/N)
   Separate from renderReader (Surahs) and the Translation reader.
   Same look: topbar, header, ayah rows. No Next/Previous cards.
   ===================================================== */

// --- Parah progress + bookmark markers (Normal Quran only) ---------------
function saveParahProgress(parahNumber, surahNumber, ayahNumber) {
  saveProgress(surahNumber, ayahNumber);
  store.setParahProgress({
    parahNumber: Number(parahNumber),
    surahNumber: Number(surahNumber),
    ayahNumber: Number(ayahNumber),
    updatedAt: new Date().toISOString(),
  });
}

function getParahResume() {
  const p = state.progress;
  const m = store.getParahProgress();
  if (!p || !m) return null;
  if (Number(m.surahNumber) !== Number(p.surahNumber) || Number(m.ayahNumber) !== Number(p.ayahNumber)) return null;
  return m;
}

function markParahBookmark(parahNumber, surahNumber, ayahNumber, on) {
  const map = store.getParahBookmarks() || {};
  const key = `${surahNumber}:${ayahNumber}`;
  if (on) {
    const bm = state.bookmarks.find((b) => b.surahNumber === surahNumber && b.ayahNumber === ayahNumber);
    map[key] = { parah: Number(parahNumber), createdAt: bm ? bm.createdAt || null : null };
  } else {
    delete map[key];
  }
  store.setParahBookmarks(map);
}

function getBookmarkParah(b) {
  const map = store.getParahBookmarks() || {};
  const rec = map[`${b.surahNumber}:${b.ayahNumber}`];
  if (!rec) return null;
  return (rec.createdAt || null) === (b.createdAt || null) ? rec.parah : null;
}

let paraReaderObserver = null;

function renderParaReader(number) {
  const view = document.getElementById("view");
  number = Number(number);

  if (!state.normalParas) {
    view.innerHTML = `<div class="empty-state"><h3>Loading parah…</h3></div>`;
    loadNormalParas().then(() => {
      if (state.route && state.route.name === "para" && Number(state.route.number) === number) {
        renderParaReader(number);
      }
    });
    return;
  }

  const para = state.normalParas.find((p) => Number(p.number) === number);
  if (!para) {
    view.innerHTML = `<div class="empty-state"><h3>Parah not found</h3></div>`;
    return;
  }

  const juz = JUZ_META[number - 1] || {};
  const surahName = (n) => (state.surahs.find((s) => s.number === n) || {}).name || `Surah ${n}`;
  const title = juz.name || para.name || `Parah ${number}`;
  const rangeText = juz.ayahs || `${surahName(para.start.surah)} ${para.start.ayah} - ${surahName(para.end.surah)} ${para.end.ayah}`;
  const textSize = store.getTextSize();

  const blocks = [];
  for (let s = para.start.surah; s <= para.end.surah; s++) {
    const from = s === para.start.surah ? para.start.ayah : 1;
    const to = s === para.end.surah ? para.end.ayah : Infinity;
    const ayahs = (state.quran[String(s)] || []).filter((a) => a.number >= from && a.number <= to);
    if (ayahs.length) blocks.push({ s, from, ayahs });
  }

  const rowHtml = (s, a) => {
    const marked = isBookmarked(s, a.number);
    return `
      <div class="ayah" data-surah="${s}" data-ayah="${a.number}" id="ayah-${s}-${a.number}">
        <span class="ayah__number">${a.number}</span>
        <div class="ayah__main">
          <p class="ayah__arabic">${a.text}</p>
          <div class="ayah__actions">
            <button class="ayah-action ${marked ? "is-active" : ""}" data-action="bookmark" data-surah="${s}" data-ayah="${a.number}"
              aria-label="${marked ? "Remove bookmark" : "Bookmark this ayah"}" aria-pressed="${marked}">
              ${marked ? ICONS.bookmarkFilled : ICONS.bookmark}
            </button>
          </div>
        </div>
      </div>`;
  };

  const bodyHtml = blocks
    .map(({ s, from, ayahs }) => {
      const sMeta = state.surahs.find((x) => x.number === s) || {};
      const showBismillah = from === 1 && s !== 1 && s !== 9;
      return `
        <div class="para-surah-head">
          <div class="para-surah-head__arabic">${sMeta.arabicName || ""}</div>
          <div class="para-surah-head__name">${surahName(s)}${sMeta.englishMeaning ? " · " + sMeta.englishMeaning : ""}</div>
        </div>
        ${showBismillah ? `<p class="bismillah">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</p>` : ""}
        ${ayahs.map((a) => rowHtml(s, a)).join("")}`;
    })
    .join("");

  view.innerHTML = `
    <div class="reader text-size-${textSize}">
      <div class="reader-topbar">
        <button class="btn btn--ghost btn--sm" id="back-home">← All Parahs</button>
        <div class="reader-topbar__actions">
          <button type="button" class="icon-btn" id="reader-reciter-btn" aria-label="Choose reciter" title="Choose reciter">${HEADPHONES_ICON}</button>
          <button class="btn btn--accent btn--sm" id="play-surah">${ICONS.play} Listen</button>
        </div>
      </div>
      <div class="reader-header">
        <div class="reader-header__eyebrow">Parah ${number} of 30</div>
        <div class="reader-header__arabic">${juz.arabic || ""}</div>
        <div class="reader-header__name">${title}</div>
        <div class="reader-header__meta">${rangeText}</div>
      </div>
      <div id="ayah-list">${bodyHtml}</div>
    </div>
  `;

  document.getElementById("back-home").addEventListener("click", () => {
    localStorage.setItem("quran.browseMode", "para");
    navigate("/");
  });

  document.getElementById("play-surah").addEventListener("click", () => {
    const playerBar = document.getElementById("player-bar");
    if (playerBar) {
      playerBar.hidden = false;
      playerBar.style.display = "";
      playerBar.classList.remove("is-hidden", "hidden");
      playerBar.classList.add("is-visible");
    }
    if (typeof renderPlayerBar === "function") renderPlayerBar();
    player.load(para.start.surah, { autoplay: true });
    if (playerBar) playerBar.classList.add("is-visible");
  });

  wireReaderReciterButton();

  const list = document.getElementById("ayah-list");
  const rows = Array.from(list.querySelectorAll(".ayah"));
  let lastIdx = -1;

  // Same scroll/highlight timing as the Surah reader (80 ms scroll, 2600 ms highlight)
  const scrollToAyah = (s, a) => {
    const target = document.getElementById(`ayah-${s}-${a}`);
    if (!target) return null;
    target.classList.add("is-target");
    setTimeout(() => target.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
    setTimeout(() => target.classList.remove("is-target"), 2600);
    return target;
  };

  // Bookmark buttons (same rules as the Surah reader, plus remembers the Parah)
  list.querySelectorAll('[data-action="bookmark"]').forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const s = Number(btn.dataset.surah);
      const a = Number(btn.dataset.ayah);
      await toggleBookmark(s, surahName(s), a);
      const on = isBookmarked(s, a);
      markParahBookmark(number, s, a, on);
      saveParahProgress(number, s, a);

      if (state.user) {
        try {
          const existingParahBm = (state.extraBookmarks || []).find(
            (b) =>
              b.bookmarkType === "normal_parah" &&
              Number(b.parahNumber) === Number(number) &&
              Number(b.surahNumber) === s &&
              Number(b.ayahNumber) === a
          );
          if (on && !existingParahBm) {
            await api.addExtraBookmark({
              bookmarkType: "normal_parah",
              parahNumber: number,
              surahNumber: s,
              surahName: surahName(s),
              ayahNumber: a,
            });
          } else if (!on && existingParahBm) {
            await api.removeBookmark(existingParahBm.id, { extra: true });
          }
          await refreshBookmarksAndProgress();
        } catch (err) {
          /* keep local parah marker working */
        }
      } else if (on && store.addGuestExtraBookmark) {
        store.addGuestExtraBookmark({
          bookmarkType: "normal_parah",
          parahNumber: number,
          surahNumber: s,
          surahName: surahName(s),
          ayahNumber: a,
        });
      }

      // Surah rule: if there is ANY other bookmarked ayah on this page, scroll back to it.
      // (Only bookmarks whose ayah is actually shown in this Parah count.)
      const other = (state.bookmarks || []).find(
        (b) =>
          !(Number(b.surahNumber) === s && Number(b.ayahNumber) === a) &&
          document.getElementById(`ayah-${b.surahNumber}-${b.ayahNumber}`)
      );
      if (other) scrollToAyah(other.surahNumber, other.ayahNumber);

      btn.classList.toggle("is-active", on);
      btn.innerHTML = on ? ICONS.bookmarkFilled : ICONS.bookmark;
      btn.setAttribute("aria-pressed", String(on));
      btn.setAttribute("aria-label", on ? "Remove bookmark" : "Bookmark this ayah");
    });
  });

  // Reading progress (also remembers the Parah, so "Resume" can reopen it)
  if (paraReaderObserver) paraReaderObserver.disconnect();

  // Jump from "Resume" or a Parah bookmark's "Open" (same rules as the Surah reader)
  const jump = state.pendingParahJump;
  state.pendingParahJump = null;
  if (jump && Number(jump.parah) === number) {
    const target = scrollToAyah(Number(jump.surah), Number(jump.ayah));
    if (target) lastIdx = rows.indexOf(target); // progress never moves backwards past the target
  }

  paraReaderObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const i = rows.indexOf(entry.target);
        if (i > lastIdx) lastIdx = i;
      });
    },
    { rootMargin: "-40% 0px -40% 0px" }
  );
  rows.forEach((el) => paraReaderObserver.observe(el));

  const saveNow = () => {
    if (lastIdx < 0) return;
    const el = rows[lastIdx];
    saveParahProgress(number, Number(el.dataset.surah), Number(el.dataset.ayah));
  };
  const saveInterval = setInterval(saveNow, 5000);
  window.addEventListener(
    "hashchange",
    () => {
      clearInterval(saveInterval);
      saveNow();
      const h = window.location.hash;
      if (!h.includes("/surah/") && !h.includes("/para/") && player && player.audio) {
        player.audio.pause();
        player.audio.currentTime = 0;
        player.audio.removeAttribute("src");
        player.currentSurah = null;
        player.loadedReciter = null;
        player._chain = null;
        player._emit();
        const bar = document.getElementById("player-bar");
        if (bar) bar.classList.remove("is-visible");
      }
    },
    { once: true }
  );
}

async function syncTranslationBookmarkApi(action, item, existingRecord = null) {
  if (!state.user) return;
  const isPara = (item.mode || "surah") === "para";
  const bookmarkType = isPara ? "translation_parah" : "translation_surah";
  const surahNum = Number(item.surahNumber);
  const ayahNum = Number(item.ayahNumber);
  const parahNum = isPara ? Number(item.modeId || item.parahNumber || 1) : null;
  const sMeta = (state.surahs || []).find((x) => Number(x.number) === surahNum);

  try {
    if (action === "add") {
      await api.addExtraBookmark({
        bookmarkType,
        surahNumber: surahNum,
        surahName: sMeta ? sMeta.name : null,
        parahNumber: parahNum,
        ayahNumber: ayahNum,
      });
    } else if (action === "remove") {
      const targetId =
        (existingRecord && existingRecord.id) ||
        (
          (state.extraBookmarks || []).find(
            (b) =>
              b.bookmarkType === bookmarkType &&
              Number(b.surahNumber) === surahNum &&
              Number(b.ayahNumber) === ayahNum &&
              (!isPara || Number(b.parahNumber) === parahNum)
          ) || {}
        ).id;
      if (targetId) {
        await api.removeBookmark(targetId, { extra: true });
      }
    }
    await refreshBookmarksAndProgress();
  } catch (err) {
    toast("Couldn't sync translation bookmark.", "error");
  }
}

// --- TRANSLATION BOOKMARKS HELPER ---
function toggleTranslationBookmark(item) {
  if (!state.translationBookmarks) {
    state.translationBookmarks = [];
  }

  const index = state.translationBookmarks.findIndex(
    (b) =>
      Number(b.surahNumber) === Number(item.surahNumber) &&
      Number(b.ayahNumber) === Number(item.ayahNumber) &&
      (b.mode || "surah") === (item.mode || "surah") &&
      Number(b.modeId || item.surahNumber) === Number(item.modeId || item.surahNumber)
  );

  if (index > -1) {
    // --- 1. REMOVING / UNBOOKMARKING AN AYAH ---
    const [removedItem] = state.translationBookmarks.splice(index, 1);
    syncTranslationBookmarkApi("remove", item, removedItem);

    // Find remaining bookmarks in this same Surah
    const remainingBookmarks = state.translationBookmarks.filter(
      (b) => Number(b.surahNumber) === Number(item.surahNumber)
    );

    if (remainingBookmarks.length > 0) {
      // Pick the newly bookmarked / most recent remaining ayah in this Surah
      const targetBookmark = remainingBookmarks[remainingBookmarks.length - 1];
      const fallbackEl = document.getElementById(`trans-ayah-${targetBookmark.ayahNumber}`);
      if (fallbackEl) {
        fallbackEl.classList.add("ayah-highlight");
        fallbackEl.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => fallbackEl.classList.remove("ayah-highlight"), 2600);
      }
    }
  } else {
    // --- 2. ADDING / BOOKMARKING A NEW AYAH ---

    // First, find if there was already a bookmarked ayah in this Surah *before* adding this new one
    const previousBookmark = state.translationBookmarks.find(
      (b) => Number(b.surahNumber) === Number(item.surahNumber)
    );

    state.translationBookmarks.push({
      surahNumber: Number(item.surahNumber),
      ayahNumber: Number(item.ayahNumber),
      mode: item.mode || "surah",
      modeId: item.modeId || item.surahNumber,
      createdAt: Date.now(),
    });
    syncTranslationBookmarkApi("add", item);

    // If there was already a previous bookmark in this Surah, fallback/scroll back to it
    if (previousBookmark) {
      const prevEl = document.getElementById(`trans-ayah-${previousBookmark.ayahNumber}`);
      if (prevEl) {
        prevEl.classList.add("is-target");
        setTimeout(() => prevEl.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
        setTimeout(() => prevEl.classList.remove("is-target"), 2600);
      }
    }
  }

  // Save updated state to localStorage
  if (typeof store !== "undefined" && store.setGuestTranslationBookmarks) {
    store.setGuestTranslationBookmarks(state.translationBookmarks);
  }

  if (typeof saveState === "function") {
    saveState();
  } else if (window.store && window.store.saveState) {
    window.store.saveState();
  }
}
/* =====================================================
   RENDER: BOOKMARKS
   ===================================================== */
function renderBookmarks() {
  const view = document.getElementById("view");
  const quranBookmarks = state.bookmarks || [];
  const translationBookmarks = state.translationBookmarks || [];
  const qmBookmarks = qmGetBookmarks(); // Quran word-by-word mode (its own independent list)
  const totalSaved = quranBookmarks.length + translationBookmarks.length + qmBookmarks.length;

  view.innerHTML = `
    <section class="section">
      <div class="section__head">
        <div>
          <h2 class="section__title">Bookmarks</h2>
          <p class="section__sub">${totalSaved ? `${totalSaved} saved ayah${totalSaved > 1 ? "s" : ""}` : "Ayahs you save while reading show up here."}</p>
        </div>
      </div>
      ${totalSaved === 0 ? `
        <div class="empty-state">
          <div class="empty-state__icon">☾</div>
          <h3>No bookmarks yet</h3>
          <p>Open any surah and tap the bookmark icon next to an ayah.</p>
        </div>
      ` : `
        <div class="bookmarks-group" style="margin-bottom: 2rem;">
          <div class="bookmark-list" id="unified-bookmark-list"></div>
        </div>
      `}
    </section>
  `;

  if (totalSaved === 0) return;

  const unifiedList = document.getElementById("unified-bookmark-list");
  if (unifiedList) {
    const formattedQuran = quranBookmarks.map((b) => ({
      type: 'quran',
      parahNumber: getBookmarkParah(b),
      surahNumber: b.surahNumber,
      ayahNumber: b.ayahNumber,
      surahName: b.surahName,
      createdAt: b.createdAt || Date.now(),
      openKey: `${b.surahNumber}:${b.ayahNumber}`,
      removeKey: `${b.surahNumber}:${b.ayahNumber}`
    }));

    const formattedTrans = translationBookmarks.map((b) => {
      const isPara = b.mode === "para";
      const titleText = isPara ? `Translation Para ${b.modeId} — Ayah ${b.ayahNumber}` : `Translation Surah ${b.surahNumber} — Ayah ${b.ayahNumber}`;
      const key = `${b.surahNumber}:${b.ayahNumber}:${b.mode || 'surah'}:${b.modeId || b.surahNumber}`;
      return {
        type: 'trans',
        surahNumber: b.surahNumber,
        ayahNumber: b.ayahNumber,
        titleText: titleText,
        createdAt: b.createdAt || Date.now(),
        openKey: key,
        removeKey: key
      };
    });

    const formattedQm = qmBookmarks.map((b) => ({
      type: 'qm',
      surahNumber: b.surahNumber,
      ayahNumber: b.ayahNumber,
      titleText: qmBookmarkTitle(b),
      createdAt: b.createdAt || Date.now(),
      openKey: `${b.surahNumber}:${b.ayahNumber}`
    }));

    const allBookmarks = [...formattedQuran, ...formattedTrans, ...formattedQm].sort((a, b) => b.createdAt - a.createdAt);

    unifiedList.innerHTML = allBookmarks.map((b) => {
      if (b.type === 'qm') {
        return `
          <div class="bookmark-row bookmark-row--qm">
            <span class="bookmark-row__num">${b.surahNumber}</span>
            <div class="bookmark-row__body">
              <div class="bookmark-row__title">${qmEsc(b.titleText)}</div>
              <div class="bookmark-row__date">Saved ${new Date(b.createdAt).toLocaleDateString()}</div>
            </div>
            <div class="bookmark-row__actions">
              <button class="btn btn--ghost btn--sm" data-open-qm="${b.openKey}">Open</button>
              <button class="ayah-action" data-remove-qm="${b.surahNumber}" aria-label="Remove bookmark">${typeof ICONS !== "undefined" && ICONS.trash ? ICONS.trash : '🗑️'}</button>
            </div>
          </div>
        `;
      }
      if (b.type === 'quran') {
        return `
          <div class="bookmark-row">
            <span class="bookmark-row__num">${b.parahNumber || b.surahNumber}</span>
            <div class="bookmark-row__body">
              <div class="bookmark-row__title">${b.parahNumber ? `Parah ${b.parahNumber} • ${b.surahName} - Ayah ${b.ayahNumber}` : `${b.surahName} — Ayah ${b.ayahNumber}`}</div>
              <div class="bookmark-row__date">Saved ${new Date(b.createdAt).toLocaleDateString()}</div>
            </div>
            <div class="bookmark-row__actions">
              <button class="btn btn--ghost btn--sm" data-open-quran="${b.openKey}" data-parah="${b.parahNumber || ""}">Open</button>
              <button class="ayah-action" data-remove-quran="${b.removeKey}" aria-label="Remove bookmark">${typeof ICONS !== "undefined" && ICONS.trash ? ICONS.trash : '🗑️'}</button>
            </div>
          </div>
        `;
      } else {
        return `
          <div class="bookmark-row bookmark-row--translation">
            <span class="bookmark-row__num">${b.surahNumber}</span>
            <div class="bookmark-row__body">
              <div class="bookmark-row__title">${b.titleText}</div>
              <div class="bookmark-row__date">Saved ${new Date(b.createdAt).toLocaleDateString()}</div>
            </div>
            <div class="bookmark-row__actions">
              <button class="btn btn--ghost btn--sm" data-open-trans="${b.openKey}">Open</button>
              <button class="ayah-action" data-remove-trans="${b.removeKey}" aria-label="Remove bookmark">${typeof ICONS !== "undefined" && ICONS.trash ? ICONS.trash : '🗑️'}</button>
            </div>
          </div>
        `;
      }
    }).join("");

    // Event Listeners for Quran Bookmarks
    unifiedList.querySelectorAll("[data-open-quran]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const [s, a] = btn.dataset.openQuran.split(":");
      const parah = Number(btn.dataset.parah);
      if (parah) {
        state.pendingParahJump = { parah, surah: Number(s), ayah: Number(a) };
        navigate(`/para/${parah}`);
      } else {
        navigate(`/surah/${s}/${a}`);
      }
    });
  });

    unifiedList.querySelectorAll("[data-remove-quran]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const [s, a] = btn.dataset.removeQuran.split(":").map(Number);
        const b = quranBookmarks.find((x) => x.surahNumber === s && x.ayahNumber === a);
        const meta = state.surahs ? state.surahs.find((x) => x.number === s) : null;
        await toggleBookmark(s, meta ? meta.name : (b ? b.surahName : ""), a);
        renderBookmarks();
      });
    });

    // Event Listeners for Quran word-by-word bookmarks
    unifiedList.querySelectorAll("[data-open-qm]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const [s, a] = btn.dataset.openQm.split(":");
        navigate(`/quran/${s}/${a}`);
      });
    });

    unifiedList.querySelectorAll("[data-remove-qm]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await qmRemoveBookmark(Number(btn.dataset.removeQm));
        renderBookmarks();
      });
    });

    // Event Listeners for Translation Bookmarks
    unifiedList.querySelectorAll("[data-open-trans]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const [surahNum, ayahNum, mode, id] = btn.dataset.openTrans.split(":");
        navigate(`/translation/${mode}/${id}?ayah=${ayahNum}`);
      });
    });

    unifiedList.querySelectorAll("[data-remove-trans]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const [surahNum, ayahNum, mode, id] = btn.dataset.removeTrans.split(":");
        const item = { surahNumber: Number(surahNum), ayahNumber: Number(ayahNum), mode, modeId: Number(id) };
        if (typeof toggleTranslationBookmark === "function") {
          await toggleTranslationBookmark(item);
        } else if (window.store && window.store.toggleTranslationBookmark) {
          window.store.toggleTranslationBookmark(item);
        }
        renderBookmarks();
      });
    });
  }
}
export function getReciterAudioUrl(surahNumber, ayahNumber = null) {
  const selectedReciterId = store.getReciter();
  const reciters = state.reciters || [];
  
  const activeReciter = reciters.find((r) => r.id === selectedReciterId) || {
    server: "https://server12.mp3quran.net/maher/",
    ayahServer: "https://everyayah.com/data/MaherAlMuaiqly128kbps/",
  };

  if (ayahNumber !== null) {
      const paddedSurah = String(surahNumber).padStart(3, '0');
      const paddedAyah = String(ayahNumber).padStart(3, '0');
      
      const cleanServer = activeReciter.ayahServer.replace(/\/+$/, '');
      return `${cleanServer}/${paddedSurah}${paddedAyah}.mp3`;
    }
  
  const paddedSurah = String(surahNumber).padStart(3, "0");
  return `${activeReciter.server}${paddedSurah}.mp3`;
}

/* =========================================================
   RECITERS (Quran with Translation, per-ayah audio)
   One global choice, saved via store.setReciter() -> "quran.reciter"
   ========================================================= */
const RECITERS = [
  { id: "maher_almuaiqly",       name: "Maher Al-Muaiqly",                          sub: "Default",                    folder: "MaherAlMuaiqly128kbps" },
  { id: "yasser_aldosari",       name: "Sheikh Yasser Al-Dosari",                   sub: "",                           folder: "Yasser_Ad-Dussary_128kbps" },
  { 
    id: "urdu_arabic_shamshad", 
    name: "Mishary Alafasy + Shamshad Ali Khan", 
    sub: "Arabic + Urdu translation", 
    folder: "Alafasy_128kbps", 
    translationFolder: "translations/urdu_shamshad_ali_khan_46kbps" 
  },
  { 
    id: "english_arabic_ibrahim", 
    name: "Mishary Alafasy + Ibrahim Walk", 
    sub: "Arabic + English translation", 
    folder: "Alafasy_128kbps", 
    translationFolder: "English/Sahih_Intnl_Ibrahim_Walk_192kbps" 
  },
  { id: "sudais",                name: "Abdul Rahman Al-Sudais",                    sub: "",                           folder: "Abdurrahmaan_As-Sudais_192kbps" },
  { id: "saad_alghamdi",         name: "Saad Al-Ghamdi",                            sub: "",                           folder: "Ghamadi_40kbps" },
  { id: "abubakr_alshatri",      name: "Abu Bakr Al-Shatri",                        sub: "",                           folder: "Abu_Bakr_Ash-Shaatree_128kbps" },
  { id: "nasser_alqatami",       name: "Nasser Al Qatami",                          sub: "",                           folder: "Nasser_Alqatami_128kbps" },
  { id: "hani_rifai",            name: "Hani Ar-Rifai",                             sub: "",                           folder: "Hani_Rifai_192kbps" },
  { id: "ahmed_alajmi",          name: "Ahmed Al-Ajmi",                             sub: "",                           folder: "Ahmed_ibn_Ali_al-Ajamy_128kbps_ketaballah.net" },
  { id: "minshawi",              name: "Mohamed Siddiq El-Minshawi",                sub: "",                           folder: "Minshawy_Murattal_128kbps" },
  { id: "husary",                name: "Mahmoud Khalil Al-Husary",                  sub: "",                           folder: "Husary_128kbps" },
  { id: "alafasy",               name: "Mishary Rashid Alafasy",                    sub: "",                           folder: "Alafasy_128kbps" },
  { id: "maher_murattal_64",     name: "Maher Al-Muaiqly",                          sub: "Murattal / Alternative",     folder: "Maher_AlMuaiqly_64kbps" },
  { id: "saud_alshuraim",        name: "Saud Al-Shuraim",                           sub: "",                           folder: "Saood_ash-Shuraym_128kbps" },
];

const HEADPHONES_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path fill="currentColor" d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>`;
const TICK_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`;

function getActiveReciter() {
  const id = store.getReciter();
  return RECITERS.find((r) => r.id === id) || RECITERS[0];
}

function getAyahAudioUrl(surahNumber, ayahNumber) {
  const r = getActiveReciter();
  const s = String(surahNumber).padStart(3, "0");
  const a = String(ayahNumber).padStart(3, "0");
  return `https://everyayah.com/data/${r.folder}/${s}${a}.mp3`;
}

function openReciterModal() {
  document.querySelectorAll(".reciter-overlay").forEach((el) => el.remove());
  const activeId = getActiveReciter().id;

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay reciter-overlay";
  overlay.innerHTML = `
    <div class="modal reciter-modal" role="dialog" aria-label="Choose reciter">
      <button class="icon-btn modal-close" id="reciter-close" aria-label="Close">${ICONS.close}</button>
      <h2>Choose Reciter</h2>
      <p class="modal-sub">Applies to every surah and parah.</p>
      <div class="reciter-list">
        ${RECITERS.map((r) => `
          <button type="button" class="reciter-option ${r.id === activeId ? "is-active" : ""}" data-reciter="${r.id}" aria-pressed="${r.id === activeId}">
            <span class="reciter-option__text">
              <span class="reciter-option__name">${r.name}</span>
              ${r.sub ? `<span class="reciter-option__sub">${r.sub}</span>` : ""}
            </span>
            <span class="reciter-option__tick" aria-hidden="true">${TICK_ICON}</span>
          </button>`).join("")}
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const onKey = (e) => { if (e.key === "Escape") close(); };
  const close = () => { overlay.remove(); document.removeEventListener("keydown", onKey); };
  document.addEventListener("keydown", onKey);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  overlay.querySelector("#reciter-close").addEventListener("click", close);

  overlay.querySelectorAll(".reciter-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      const reciter = RECITERS.find((r) => r.id === btn.dataset.reciter);
      if (!reciter) return;
      store.setReciter(reciter.id);
      overlay.querySelectorAll(".reciter-option").forEach((b) => {
        const on = b === btn;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-pressed", String(on));
      });
      toast(`Reciter: ${reciter.name}${reciter.sub && reciter.sub !== "Default" ? " (" + reciter.sub + ")" : ""}`, "success");
      setTimeout(close, 250);
    });
  });
}

/* =====================================================
   ARABIC FONT SETTING (Settings → Appearance → Arabic font)
   Applies to Normal Quran AND Quran with Translation.
   Saved with store.setArabicFont() (same rules as theme / text size).
   ===================================================== */
const ARABIC_FALLBACK = "'Amiri Quran', 'Scheherazade New', serif"; // always last: nothing can look broken
const ARABIC_SAMPLE = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";

const ARABIC_FONTS = [
  { id: "uthmani", name: "Uthmani script (Default)", family: "Amiri Quran", google: "Amiri+Quran" },
  { id: "indopak", name: "IndoPak Nastaleeq", family: "Noto Nastaliq Urdu", google: "Noto+Nastaliq+Urdu" },
  // Add  file: "assets/fonts/KFGQPC-Hafs-Smart.woff2"  only AFTER you put the file there (until then it looks like the default).
  { id: "kfgqpc", name: "KFGQPC Hafs Smart", family: "KFGQPC Hafs Smart",
    local: ["KFGQPC Uthmanic Script HAFS", "KFGQPC HAFS Uthmanic Script"] },
  // Same here:  file: "assets/fonts/Sini-Script.woff2"
   { id: "sini", name: "ṣīnī (Chinese) script", family: "Sini Script", plain: true,
    fallback: { family: "Aref Ruqaa", google: "Aref+Ruqaa" } },
  { id: "amiri", name: "Amiri", family: "Amiri", google: "Amiri" },
  { id: "amiribold", name: "Amiri Bold", family: "Amiri", google: "Amiri:wght@700", weight: 700 },
  { id: "scheherazade", name: "Scheherazade New", family: "Scheherazade New", google: "Scheherazade+New" },
  { id: "scheherazadebold", name: "Scheherazade New Bold", family: "Scheherazade New", google: "Scheherazade+New:wght@700", weight: 700 },
  { id: "naskh", name: "Noto Naskh Arabic", family: "Noto Naskh Arabic", google: "Noto+Naskh+Arabic" },
  { id: "naskhbold", name: "Noto Naskh Arabic Bold", family: "Noto Naskh Arabic", google: "Noto+Naskh+Arabic:wght@700", weight: 700 },
  { id: "lateef", name: "Lateef", family: "Lateef", google: "Lateef" },
  { id: "harmattan", name: "Harmattan", family: "Harmattan", google: "Harmattan" },
  { id: "notosans", name: "Noto Sans Arabic", family: "Noto Sans Arabic", google: "Noto+Sans+Arabic" },
  { id: "notokufi", name: "Noto Kufi Arabic", family: "Noto Kufi Arabic", google: "Noto+Kufi+Arabic" },
  { id: "plexarabic", name: "IBM Plex Sans Arabic", family: "IBM Plex Sans Arabic", google: "IBM+Plex+Sans+Arabic", plain: true },
  { id: "cairo", name: "Cairo", family: "Cairo", google: "Cairo", plain: true },
  { id: "tajawal", name: "Tajawal", family: "Tajawal", google: "Tajawal", plain: true },
  { id: "elmessiri", name: "El Messiri", family: "El Messiri", google: "El+Messiri", plain: true },
  { id: "almarai", name: "Almarai", family: "Almarai", google: "Almarai", plain: true },
  { id: "mada", name: "Mada", family: "Mada", google: "Mada", plain: true },
  { id: "lalezar", name: "Lalezar", family: "Lalezar", google: "Lalezar", plain: true },
];

const loadedFontCss = new Set(["Amiri+Quran", "Scheherazade+New"]);
const previewFontCss = new Set();

function getArabicFontById(id) {
  return ARABIC_FONTS.find((f) => f.id === id) || ARABIC_FONTS[0];
}

function arabicFontStack(font) {
  return `'${font.family}', ${font.fallback ? `'${font.fallback.family}', ` : ""}${ARABIC_FALLBACK}`;
}

function addFontStylesheet(href, onFail) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.onerror = () => { link.remove(); if (onFail) onFail(); };
  document.head.appendChild(link);
}

function loadGoogleFont(param) {
  if (!param || loadedFontCss.has(param)) return;
  loadedFontCss.add(param);
  addFontStylesheet(`https://fonts.googleapis.com/css2?family=${param}&display=swap`, () => loadedFontCss.delete(param));
}

// Installed-on-device font (local) and/or your own file. With neither, nothing is requested, so no 404 errors.
function loadFontFile(font) {
  if (document.getElementById(`font-face-${font.id}`)) return;
  const sources = (font.local || []).map((n) => `local("${n}")`);
  if (font.file) sources.push(`url("${font.file}") format("woff2")`);
  if (!sources.length) return;
  const style = document.createElement("style");
  style.id = `font-face-${font.id}`;
  style.textContent = `@font-face{font-family:"${font.family}";src:${sources.join(", ")};font-display:swap;}`;
  document.head.appendChild(style);
}

function applyArabicFont(id) {
  const font = getArabicFontById(id);
  const root = document.documentElement;
  try {
    loadFontFile(font);
    loadGoogleFont(font.google);
    if (font.fallback) loadGoogleFont(font.fallback.google);
  } catch (e) {}

  if (font.id === "uthmani") {
    root.style.removeProperty("--quran");
    root.style.removeProperty("--quran-trans");
  } else {
    const stack = arabicFontStack(font);
    root.style.setProperty("--quran", stack);
    root.style.setProperty("--quran-trans", stack);
  }
  root.setAttribute("data-arabic-font", font.id);
  root.setAttribute("data-arabic-plain", font.plain ? "1" : "0");
  if (font.weight) root.setAttribute("data-arabic-weight", "bold"); else root.removeAttribute("data-arabic-weight");
  return font;
}

function loadFontPreview(font) {
  [font.google, font.fallback && font.fallback.google].forEach((param) => {
    if (!param || loadedFontCss.has(param) || previewFontCss.has(param)) return;
    previewFontCss.add(param);
    addFontStylesheet(
      `https://fonts.googleapis.com/css2?family=${param}&text=${encodeURIComponent(ARABIC_SAMPLE)}&display=swap`
    );
  });
}

function openArabicFontModal() {
  document.querySelectorAll(".reciter-overlay").forEach((el) => el.remove());
  const activeId = getArabicFontById(store.getArabicFont()).id;
  ARABIC_FONTS.forEach(loadFontPreview);

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay reciter-overlay";
  overlay.innerHTML = `
    <div class="modal reciter-modal" role="dialog" aria-label="Choose Arabic font">
      <button class="icon-btn modal-close" id="font-close" aria-label="Close">${ICONS.close}</button>
      <h2>Arabic Font</h2>
      <p class="modal-sub">Applies to the Quran and Quran with Translation.</p>
      <div class="reciter-list">
        ${ARABIC_FONTS.map((f) => `
          <button type="button" class="reciter-option ${f.id === activeId ? "is-active" : ""}" data-font="${f.id}" aria-pressed="${f.id === activeId}">
            <span class="reciter-option__text">
              <span class="reciter-option__name">${f.name}</span>
              <span class="reciter-option__sub font-option__sample" dir="rtl" style="font-family:${arabicFontStack(f)};font-weight:${f.weight || 400}">${ARABIC_SAMPLE}</span>
            </span>
            <span class="reciter-option__tick" aria-hidden="true">${TICK_ICON}</span>
          </button>`).join("")}
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const onKey = (e) => { if (e.key === "Escape") close(); };
  const close = () => { overlay.remove(); document.removeEventListener("keydown", onKey); };
  document.addEventListener("keydown", onKey);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  overlay.querySelector("#font-close").addEventListener("click", close);

  overlay.querySelectorAll(".reciter-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      const font = applyArabicFont(btn.dataset.font);
      store.setArabicFont(font.id);
      overlay.querySelectorAll(".reciter-option").forEach((b) => {
        const on = b === btn;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-pressed", String(on));
      });
      const label = document.getElementById("arabic-font-name");
      if (label) label.textContent = font.name;
      toast(`Arabic font: ${font.name}`, "success");
      setTimeout(close, 250);
    });
  });
}

// Apply saved font early before render
applyArabicFont(store.getArabicFont());


/* =====================================================
   RENDER: SETTINGS
   ===================================================== */
function renderSettings() {
  const theme = store.getTheme();
  const textSize = store.getTextSize();
  const autoplay = store.getAutoplay();
  const consent = store.getCookieConsent();

  const view = document.getElementById("view");
  view.innerHTML = `
    <section class="section">
      <h2 class="section__title">Settings</h2>
    </section>
    <div class="settings-grid">
      <div class="settings-card">
        <h3>Appearance</h3>
        <p>Choose how Quran looks on this device.</p>
        <div class="settings-row">
          <span class="settings-row__label">Theme</span>
          <div class="segmented" id="theme-segmented">
            <button data-v="light" class="${theme === "light" ? "active" : ""}">Light</button>
            <button data-v="dark" class="${theme === "dark" ? "active" : ""}">Dark</button>
          </div>
        </div>
        <div class="settings-row">
          <span class="settings-row__label">Arabic text size</span>
          <div class="segmented" id="size-segmented">
            <button data-v="sm" class="${textSize === "sm" ? "active" : ""}">Small</button>
            <button data-v="md" class="${textSize === "md" ? "active" : ""}">Medium</button>
            <button data-v="lg" class="${textSize === "lg" ? "active" : ""}">Large</button>
          </div>
        </div>
        <div class="settings-row">
          <div>
            <div class="settings-row__label">Arabic font</div>
            <div class="settings-row__desc" id="arabic-font-name">${getArabicFontById(store.getArabicFont()).name}</div>
          </div>
          <button class="btn btn--ghost btn--sm" id="change-arabic-font">Change</button>
        </div>
      </div>

      <div class="settings-card">
        <h3>Audio</h3>
        <p>Recitation by Maher Al-Muaiqly.</p>
        <div class="settings-row">
          <div>
            <div class="settings-row__label">Autoplay next surah</div>
            <div class="settings-row__desc">Continue to the next surah when one finishes.</div>
          </div>
          <button class="switch ${autoplay ? "is-on" : ""}" id="autoplay-switch" role="switch" aria-checked="${autoplay}"></button>
        </div>
      </div>
      
      <div class="settings-card">
        <h3>Privacy</h3>
        <p>Your current choice: <strong>${consent === "accepted" ? "Accepted" : consent === "rejected" ? "Rejected" : "Not set"}</strong></p>
        <div class="settings-row">
          <div>
            <div class="settings-row__label">Cookie & local storage preference</div>
            <div class="settings-row__desc">Controls whether bookmarks and progress are remembered on this device.</div>
          </div>
          <button class="btn btn--ghost btn--sm" id="reopen-cookie">Change</button>
        </div>
      </div>

      <div class="settings-card">
        <h3>Account</h3>
        ${
          state.user
            ? `<p>Signed in as <strong>${state.user.email}</strong>.</p>
               <button class="btn btn--ghost" id="settings-logout">Log out</button>`
            : `<p>Sign in to sync bookmarks and reading progress across devices.</p>
               <button class="btn btn--accent" id="settings-login">Sign in / Sign up</button>`
        }
      </div>
    </div>
  `;


const langSelect = document.getElementById("language-select");
if (langSelect) {
  langSelect.addEventListener("change", (e) => {
    store.setLanguage(e.target.value);
    window.location.reload();
  });
}
  
  document.querySelectorAll("#theme-segmented button").forEach((b) =>
    b.addEventListener("click", () => {
      store.setTheme(b.dataset.v);
      renderShell();
      renderView();
    })
  );
  document.querySelectorAll("#size-segmented button").forEach((b) =>
    b.addEventListener("click", () => {
      store.setTextSize(b.dataset.v);
      renderView();
    })
  );
  document.getElementById("autoplay-switch").addEventListener("click", (e) => {
    const next = !store.getAutoplay();
    store.setAutoplay(next);
    e.target.classList.toggle("is-on", next);
    e.target.setAttribute("aria-checked", String(next));
  });
  document.getElementById("reopen-cookie").addEventListener("click", showCookieBanner);
  document.getElementById("change-arabic-font").addEventListener("click", openArabicFontModal);
  const logoutBtn = document.getElementById("settings-logout");
  if (logoutBtn) logoutBtn.addEventListener("click", doLogout);
  const loginBtn = document.getElementById("settings-login");
  if (loginBtn) loginBtn.addEventListener("click", openAuthModal);
  }

/* =====================================================
   RENDER: ACCOUNT
   ===================================================== */
function renderAccount() {
  const view = document.getElementById("view");
  if (!state.user) {
    navigate("/");
    return;
  }
  view.innerHTML = `
    <div class="account-card">
      <div class="account-avatar">${state.user.name ? state.user.name[0].toUpperCase() : "U"}</div>
      <h2 style="font-family:var(--serif); font-weight:500;">${state.user.name || "Reader"}</h2>
      <p style="color:var(--muted); margin-bottom:20px;">${state.user.email}</p>
      <p style="color:var(--muted); font-size:.85rem;">${state.bookmarks.length} bookmark${state.bookmarks.length === 1 ? "" : "s"} saved to your account</p>
      <button class="btn btn--ghost" id="logout-btn" style="margin-top:16px;">Log out</button>
    </div>
  `;
  document.getElementById("logout-btn").addEventListener("click", doLogout);
}

async function doLogout() {
  try {
    await api.logout();
  } catch (e) {
    /* ignore */
  }
  state.user = null;
  await refreshBookmarksAndProgress();
  toast("Signed out.", "success");
  navigate("/");
  renderShell();
  renderView();
}

/* =========================================================
   AUDIO: PER-AYAH PLAYBACK MANAGER
   ========================================================= */

function playAyahAudio(surahNumber, ayahNumber, buttonEl = null) {
  const audioUrl = getReciterAudioUrl(surahNumber, ayahNumber);

  // If already playing the exact same ayah, toggle play/pause
  if (state.activeAyahAudio && state.activeAyahAudio.url === audioUrl) {
    if (state.activeAyahAudio.instance.paused) {
      state.activeAyahAudio.instance.play();
      if (buttonEl) buttonEl.innerHTML = "⏸";
    } else {
      state.activeAyahAudio.instance.pause();
      if (buttonEl) buttonEl.innerHTML = "▶";
    }
    return;
  }

  // Stop any existing playing audio
  if (state.activeAyahAudio && state.activeAyahAudio.instance) {
    state.activeAyahAudio.instance.pause();
    if (state.activeAyahAudio.buttonEl) {
      state.activeAyahAudio.buttonEl.innerHTML = "▶";
    }
  }

  // Clear main surah audio player if playing
  if (state.audio && typeof state.audio.pause === 'function') {
    state.audio.pause();
    state.audio = null;
  }

  // Remove previous highlights
  document.querySelectorAll(".translation-row--active, .ayah-row--active").forEach((el) => {
    el.classList.remove("translation-row--active", "ayah-row--active");
  });

  const audioInstance = new Audio(audioUrl);
  state.activeAyahAudio = {
    url: audioUrl,
    instance: audioInstance,
    surahNumber,
    ayahNumber,
    buttonEl,
  };

  if (buttonEl) buttonEl.innerHTML = "⏸";

  // Smoothly scroll to the active ayah text safely without highlights or borders
  setTimeout(() => {
    const activeEl = document.getElementById(`trans-ayah-${ayahNumber}`) || 
                     document.getElementById(`ayah-${ayahNumber}`) || 
                     document.querySelector(`[data-ayah="${ayahNumber}"]`);
                     
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, 150);

  audioInstance.play().catch(err => {
    console.warn("Audio playback safely caught:", err);
  });

  // Reset button state and row highlight on playback finish
    audioInstance.onended = () => {
      if (buttonEl) buttonEl.innerHTML = "▶";
      
      // Safely find and remove the active class without crashing
      const activeRow = document.querySelector(`[data-ayah="${state.activeAyahAudio}"]`);
      if (activeRow) {
        activeRow.classList.remove("translation-row--active", "ayah-row--active");
      }
      state.activeAyahAudio = null;
    };
}

/* =========================================================
   RENDER: TRANSLATION READER (#/translation)
   ========================================================= */

   // Unconditionally force-update api.getParaTranslation for Parah mode
// Unconditionally force-update api.getParaTranslation for Parah mode
if (typeof api !== "undefined") {
  api.getParaTranslation = async (juzNumber, lang) => {
    const edition = ({ en: "en.sahih", ur: "ur.jalandhry", tr: "tr.diyanet" })[lang] || "en.sahih";
    
    // Fetch Arabic Uthmani text and requested translation in parallel
    const [arabicRes, transRes] = await Promise.all([
      fetch(`https://api.alquran.cloud/v1/juz/${juzNumber}/quran-uthmani`),
      fetch(`https://api.alquran.cloud/v1/juz/${juzNumber}/${edition}`)
    ]);

    const arabicData = await arabicRes.json();
    const transData = await transRes.json();

    if (
      arabicData && (arabicData.code === 200 || arabicData.status === "OK") &&
      transData && (transData.code === 200 || transData.status === "OK")
    ) {
      const arabicAyahs = arabicData.data.ayahs;
      const transAyahs = transData.data.ayahs;

      const ayahs = arabicAyahs.map((a, index) => ({
        surahNumber: a.surah.number,
        ayahNumber: a.numberInSurah,
        arabicText: a.text,
        translationText: transAyahs[index] ? transAyahs[index].text : ""
      }));

      return { ayahs };
    }
    throw new Error("Failed to fetch Juz translation");
  };
}

 const JUZ_META = [
        { name: "Alif Lam Meem", arabic: "آلم", ayahs: "Al-Fatihah 1 - Al-Baqarah 141" },
        { name: "Sayaqool", arabic: "سَيَقُولُ", ayahs: "Al-Baqarah 142 - Al-Baqarah 252" },
        { name: "Tilka 'r-Rusul", arabic: "تِلْكَ الرُّسُلُ", ayahs: "Al-Baqarah 253 - Aal-E-Imran 92" },
        { name: "Lan Tanalu", arabic: "لَنْ تَنَالُوا", ayahs: "Aal-E-Imran 93 - An-Nisa 23" },
        { name: "Wal Muhsanat", arabic: "وَالْمُحْصَنَاتُ", ayahs: "An-Nisa 24 - An-Nisa 147" },
        { name: "La Yuhibbu-Allah", arabic: "لَا يُحِبُّ اللَّهُ", ayahs: "An-Nisa 148 - Al-Ma'idah 81" },
        { name: "Wa Iza Sami'u", arabic: "وَإِذَا سَمِعُوا", ayahs: "Al-Ma'idah 82 - Al-An'am 110" },
        { name: "Wa Lau Annana", arabic: "وَلَوْ أَنَّنَا", ayahs: "Al-An'am 111 - Al-A'raf 87" },
        { name: "Qal Al-Mala'u", arabic: "قَالَ الْمَلَأُ", ayahs: "Al-A'raf 88 - Al-Anfal 40" },
        { name: "Wa A'lamu", arabic: "وَاعْلَمُوا", ayahs: "Al-Anfal 41 - At-Tawbah 92" },
        { name: "Yatazerona", arabic: "يَعْتَذِرُونَ", ayahs: "At-Tawbah 93 - Hud 5" },
        { name: "Wa Ma Min Da'abbatin", arabic: "وَمَا مِنْ دَابَّةٍ", ayahs: "Hud 6 - Yusuf 52" },
        { name: "Wa Ma Ubarri'u", arabic: "وَمَا أُبَرِّئُ", ayahs: "Yusuf 53 - Ibrahim 52" },
        { name: "Rubama", arabic: "رُبَمَا", ayahs: "Al-Hijr 1 - An-Nahl 128" },
        { name: "Subhanallazi", arabic: "سُبْحَانَ الَّذِي", ayahs: "Al-Isra 1 - Al-Kahf 74" },
        { name: "Qala Alam", arabic: "قَالَ أَلَمْ", ayahs: "Al-Kahf 75 - Ta-Ha 135" },
        { name: "Iqtaraba Li-n-Nasi", arabic: "اقْتَرَبَ لِلنَّاسِ", ayahs: "Al-Anbiya 1 - Al-Hajj 78" },
        { name: "Qad Aflaha", arabic: "قَدْ أَفْلَحَ", ayahs: "Al-Mu'minun 1 - Al-Furqan 20" },
        { name: "Wa Qala Allazina", arabic: "وَقَالَ الَّذِينَ", ayahs: "Al-Furqan 21 - An-Naml 55" },
        { name: "A'man Khalaqa", arabic: "أَمَّنْ خَلَقَ", ayahs: "An-Naml 56 - Al-Ankabut 45" },
        { name: "Utlu Ma Ohiya", arabic: "اتْلُ مَا أُوحِيَ", ayahs: "Al-Ankabut 46 - Al-Ahzab 30" },
        { name: "Wa Man Yaqnut", arabic: "وَمَنْ يَقْنُتْ", ayahs: "Al-Ahzab 31 - Ya-Sin 27" },
        { name: "Wa Ma Liya", arabic: "وَمَا لِيَ", ayahs: "Ya-Sin 28 - Az-Zumar 31" },
        { name: "Faman Azlamu", arabic: "فَمَنْ أَظْلَمُ", ayahs: "Az-Zumar 32 - Fussilat 46" },
        { name: "Ilaihi Yuraddu", arabic: "إِلَيْهِ يُرَدُّ", ayahs: "Fussilat 47 - Al-Jathiyah 37" },
        { name: "Ha'a Meem", arabic: "حم", ayahs: "Al-Ahqaf 1 - Qaf 45" },
        { name: "Qala Fama Khatbukum", arabic: "قَالَ فَمَا خَطْبُكُمْ", ayahs: "Az-Zariyat 1 - Al-Hadid 29" },
        { name: "Qad Sami'a-Allah", arabic: "قَدْ سَمِعَ اللَّهُ", ayahs: "Al-Mujadila 1 - At-Tahrim 12" },
        { name: "Tabarakallazi", arabic: "تَبَارَكَ الَّذِي", ayahs: "Al-Mulk 1 - Al-Mursalat 50" },
        { name: "Amma Yatasa'alun", arabic: "عَمَّ يَتَسَاءَلُونَ", ayahs: "An-Naba 1 - An-Nas 6" }
      ];

const TAFSIR_MESSAGES = {
  en: { loading: "Loading tafsir…", empty: "No commentary is available for this ayah in this tafsir.", error: "Couldn't load the tafsir. Tap to close, then try again.", label: "Show tafsir" },
  ur: { loading: "تفسیر لوڈ ہو رہی ہے…", empty: "اس آیت کے لیے اس تفسیر میں کوئی شرح دستیاب نہیں۔", error: "تفسیر لوڈ نہیں ہو سکی۔ بند کر کے دوبارہ کوشش کریں۔", label: "تفسیر دیکھیں" },
  tr: { loading: "Tefsir yükleniyor…", empty: "Bu ayet için bu tefsirde yorum bulunamadı.", error: "Tefsir yüklenemedi. Kapatıp tekrar deneyin.", label: "Tefsiri göster" },
};

function tafsirEscape(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function sanitizeTafsirHtml(raw) {
  let html = String(raw || "");
  if (!/<[a-z][\s\S]*>/i.test(html)) {
    html = tafsirEscape(html).replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br>");
    html = `<p>${html}</p>`;
  }
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script,style,iframe,object,embed,link,meta,form,input,button,svg,img,video,audio").forEach((n) => n.remove());
  doc.body.querySelectorAll("*").forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      const bad = /^\s*(javascript|data|vbscript):/i.test(attr.value);
      if (name.startsWith("on") || name === "style" || name === "srcdoc" || ((name === "href" || name === "src") && bad)) {
        el.removeAttribute(attr.name);
      }
    });
    if (el.tagName === "A") {
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener noreferrer");
    }
  });
  return doc.body.innerHTML;
}

async function toggleTafsir(row, open) {
  if (!row) return;
  const panel = row.querySelector(".tafsir-panel");
  const body = panel && panel.querySelector(".tafsir-panel__body");
  if (!panel || !body) return;

  if (!open) {
    const selected = window.getSelection ? String(window.getSelection()).trim() : "";
    if (selected) return;
    panel.dataset.token = ""; 
    row.classList.remove("is-tafsir-open"); 
    return;
  }

  const lang = store.getLanguage ? store.getLanguage() : "en";
  const msg = TAFSIR_MESSAGES[lang] || TAFSIR_MESSAGES.en;
  const token = String(Date.now() + Math.random());
  panel.dataset.token = token;
  panel.setAttribute("dir", lang === "ur" ? "rtl" : "ltr");
  panel.setAttribute("lang", lang);

  body.innerHTML = `<div class="tafsir-panel__status">${msg.loading}</div>`;
  row.classList.add("is-tafsir-open"); 

  try {
    const res = await api.getTafsir(Number(panel.dataset.surah), Number(panel.dataset.ayah), lang);
    if (panel.dataset.token !== token) return; 
    if (res.status === "unavailable") {
  body.innerHTML = `<div class="tafsir-panel__status">${msg.error}</div>`;
  return;
}
    body.innerHTML = res.text
      ? `<div class="tafsir-panel__text">${sanitizeTafsirHtml(res.text)}</div><div class="tafsir-panel__source">${tafsirEscape(res.name)}</div>`
      : `<div class="tafsir-panel__status">${msg.empty}</div>`;
  } catch (err) {
    if (panel.dataset.token !== token) return;
    console.warn("Tafsir load failed:", err);
    body.innerHTML = `<div class="tafsir-panel__status">${msg.error}</div>`;
  }
}

async function renderTranslationReader(mode = "surah", id = 1) {
  const currentLang = store.getLanguage ? store.getLanguage() : "en";
  const view = document.getElementById("view");

// Surah metadata for the rich header + prev/next cards (surah mode only)
  const surahNo = Number(id);
  const surahMeta = mode === "surah" ? (state.surahs || []).find((x) => x.number === surahNo) : null;
  const prevSurah = surahMeta ? (state.surahs || []).find((x) => x.number === surahNo - 1) : null;
  const nextSurah = surahMeta ? (state.surahs || []).find((x) => x.number === surahNo + 1) : null;
  const paraMeta = mode === "para" ? (JUZ_META[Number(id) - 1] || null) : null;

  view.innerHTML = `
    <div class="reader-container">
      <div class="reader-header glass-card" style="display: flex; flex-direction: column; gap: 1rem; position: relative;">
      
      <!-- Top Bar: Back Button Left, Glassy White Language Dropdown Right -->
      <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
        <button class="btn btn--ghost" id="btn-back-trans" style="display: flex; align-items: center; white-space: nowrap; width: auto; height: 38px; font-size: 0.8rem; padding: 6px 10px;">← ${t("common.back", "All Surahs")}</button>
        
       <!-- Glassy White Select Box with Exact Original Button Layout -->
      <div class="glass-card" style="display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0.85rem; border-radius: 20px; backdrop-filter: blur(8px); background: rgba(255, 255, 255, 0.25); border: 1px solid rgba(255, 255, 255, 0.4); box-shadow: 0 4px 12px rgba(0,0,0,0.05); position: relative;">
        🌐
        <select id="trans-lang-select" style="background: transparent; border: none; outline: none; color: inherit; font-family: inherit; font-weight: 500; font-size: 0.9rem; cursor: pointer;">
          <option value="en" ${currentLang === "en" ? "selected" : ""}>English</option>
          <option value="ur" ${currentLang === "ur" ? "selected" : ""}>Urdu (اردو)</option>
          <option value="tr" ${currentLang === "tr" ? "selected" : ""}>Türkçe</option>
        </select>

        <!-- Glassmorphism Vertical Options Menu -->
        <div id="trans-lang-menu" class="audio-dropdown-menu" style="display: none; position: absolute; top: 115%; right: 0; border-radius: 12px; padding: 0.4rem; min-width: 150px; z-index: 1000; flex-direction: column; gap: 0.3rem; animation: slideDown 0.25s ease forwards;">
          <button type="button" data-lang="en" class="audio-option-btn ${currentLang === 'en' ? 'audio-option-btn--primary' : 'audio-option-btn--secondary'}" style="width: 100%; text-align: left;">English</button>
          <button type="button" data-lang="ur" class="audio-option-btn ${currentLang === 'ur' ? 'active-ur' : ''} ${currentLang === 'ur' ? 'audio-option-btn--primary' : 'audio-option-btn--secondary'}" style="width: 100%; text-align: left;">Urdu (اردو)</button>
          <button type="button" data-lang="tr" class="audio-option-btn ${currentLang === 'tr' ? 'audio-option-btn--primary' : 'audio-option-btn--secondary'}" style="width: 100%; text-align: left;">Türkçe</button>
        </div>
      </div>
      </div>

     <!-- Centered Title Below -->
      ${surahMeta ? `
      <div class="reader-header__title" style="width: 100%; text-align: center;">
        <div class="reader-header__eyebrow">Surah ${surahMeta.number} of 114 · ${t("translation.title", "Translation Mode")}</div>
        <div class="reader-header__arabic">${surahMeta.arabicName}</div>
        <div class="reader-header__name">${surahMeta.name} · ${surahMeta.englishMeaning}</div>
        <div class="reader-header__meta">${surahMeta.ayahCount} ayahs · ${surahMeta.revelationType}</div>
      </div>` : paraMeta ? `
      <div class="reader-header__title" style="width: 100%; text-align: center;">
        <div class="reader-header__eyebrow">Parah ${Number(id)} of 30 · ${t("translation.title", "Translation Mode")}</div>
        <div class="reader-header__arabic">${paraMeta.arabic}</div>
        <div class="reader-header__name">${paraMeta.name}</div>
        <div class="reader-header__meta">${paraMeta.ayahs}</div>
      </div>` : `
      <div class="reader-header__title" style="width: 100%; text-align: center;">
        <h2 style="margin: 0;">${mode === "para" ? `Para ${id}` : `Surah ${id}`} (${t("translation.title", "Translation Mode")})</h2>
      </div>`}

    </div>
      
      <div id="translation-content" class="translation-list text-size-${store.getTextSize()}" style="min-height: 70vh;">
        <div class="loading-state">${t("common.loading", "Loading translation...")}</div>
      </div>
    </div>

    ${surahMeta ? `
      <div class="reader-footer-nav" id="translation-footer-nav" style="display: flex; justify-content: space-between; gap: 0.75rem; margin: 2rem auto; max-width: 520px; width: 100%;">
        ${prevSurah ? `<a class="nav-link-card" href="#/translation/surah/${prevSurah.number}" style="flex: 1; max-width: 240px; padding: 0.85rem 1rem; border-radius: 12px; text-decoration: none;"><span class="nav-link-card__label">Previous</span><span class="nav-link-card__name">${prevSurah.number}. ${prevSurah.name}</span></a>` : `<span></span>`}
        ${nextSurah ? `<a class="nav-link-card nav-link-card--next" href="#/translation/surah/${nextSurah.number}" style="flex: 1; max-width: 240px; padding: 0.85rem 1rem; border-radius: 12px; text-decoration: none; text-align: right;"><span class="nav-link-card__label">Next</span><span class="nav-link-card__name">${nextSurah.number}. ${nextSurah.name}</span></a>` : `<span></span>`}
      </div>` : ""}
  `;

    // Moving to another surah stays under /translation/surah/, so stop any running recitation first
  const footerNavEl = document.getElementById("translation-footer-nav");
  if (footerNavEl) {
    footerNavEl.addEventListener("click", (ev) => {
      if (ev.target.closest(".nav-link-card")) {
        // Safely stop any active audio element if it exists globally
        if (typeof window.stopAllAudio === "function") {
          window.stopAllAudio();
        } else if (window.currentAudio) {
          window.currentAudio.pause();
          window.currentAudio = null;
        }
      }
    });
  }

  document.getElementById("btn-back-trans").addEventListener("click", () => navigate("/translation"));
  
 // Native select interaction to toggle custom glass menu or change language directly
  const langSelect = document.getElementById("trans-lang-select");
  const langMenu = document.getElementById("trans-lang-menu");

  if (langSelect && langMenu) {
    // Prevent default native dropdown behavior and toggle custom glassmorphism list instead
    langSelect.addEventListener("mousedown", (e) => {
      e.preventDefault();
      langMenu.style.display = langMenu.style.display === "none" ? "flex" : "none";
    });

    document.addEventListener("click", (e) => {
      if (!langSelect.contains(e.target) && !langMenu.contains(e.target)) {
        langMenu.style.display = "none";
      }
    });

    langMenu.querySelectorAll("[data-lang]").forEach((optionBtn) => {
      optionBtn.addEventListener("click", () => {
        const selectedLang = optionBtn.dataset.lang;
        if (typeof store.setLanguage === "function") {
          store.setLanguage(selectedLang);
        } else if (window.store && window.store.setLanguage) {
          window.store.setLanguage(selectedLang);
        }
        renderTranslationReader(mode, id);
      });
    });
  }
// Delegated Listener for Bookmark & Audio Play in Translation Reader
const translationContentEl = document.getElementById("translation-content");
if (translationContentEl && !translationContentEl.dataset.hasListener) {
  translationContentEl.dataset.hasListener = "true";
  
  translationContentEl.addEventListener("click", (e) => {
    const bookmarkBtn = e.target.closest(".btn-bookmark-trans");
    const playBtn = e.target.closest(".btn-play-trans");
   const optionBtn = e.target.closest("button[data-type]");
   if (e.target.closest(".btn-reciter-trans")) {
  e.preventDefault();
  e.stopPropagation();
  openReciterModal();
  return;
}
    // --- 0. TAFSIR: golden icon opens it, clicking the open panel closes it ---
    const tafsirBtn = e.target.closest(".tafsir-trigger");
    const tafsirPanel = e.target.closest(".tafsir-panel");
    if (tafsirBtn || tafsirPanel) {
      if (e.target.closest(".tafsir-panel a")) return; 
      e.preventDefault();
      e.stopPropagation();
      toggleTafsir((tafsirBtn || tafsirPanel).closest(".translation-row"), !!tafsirBtn);
      return;
    }
   // --- 1. HANDLE TRANSLATION BOOKMARK CLICK ---
      if (bookmarkBtn) {
        e.stopPropagation();
        e.stopImmediatePropagation();
        e.preventDefault();

        const surahNumber = parseInt(bookmarkBtn.dataset.surah, 10);
        const ayahNumber = parseInt(bookmarkBtn.dataset.ayah, 10);

        const item = {
          surahNumber: surahNumber,
          ayahNumber: ayahNumber,
          source: "translation",
          mode: mode || "surah",
          modeId: id || surahNumber,
          createdAt: Date.now()
        };

        if (typeof toggleTranslationBookmark === "function") {
        toggleTranslationBookmark(item);
    } else if (window.store && window.store.toggleTranslationBookmark) {
        window.store.toggleTranslationBookmark(item);
    }

    // Instantly toggle the active class and icon on the clicked button without full re-render
    const isNowActive = bookmarkBtn.classList.toggle("is-active");
    bookmarkBtn.setAttribute("aria-pressed", String(isNowActive));
    bookmarkBtn.innerHTML = isNowActive ? ICONS.bookmarkFilled : ICONS.bookmark;
  }

    // --- 2. HANDLE AUDIO PLAY BUTTON CLICK (SLIDE-DOWN MENU TOGGLE) ---
    if (playBtn) {
      const actionsDiv = playBtn.closest(".translation-row__actions");
      const existingMenu = actionsDiv.querySelector(".audio-dropdown-menu");
      
      // Close any other open menus
      translationContentEl.querySelectorAll(".audio-dropdown-menu").forEach((m) => m.remove());
      if (!existingMenu) {
        const surahNumber = playBtn.dataset.surah;
        const ayahNumber = playBtn.dataset.ayah;
        
        const menuHTML = `
       <div class="audio-dropdown-menu glass-card" style="display: inline-flex; align-items: center; gap: 0.6rem; margin-top: 0.6rem; padding: 0.4rem 0.6rem; border-radius: 10px; background: rgba(255, 255, 255, 0.12); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); border: 1px solid var(--border-color, rgba(128, 128, 128, 0.25)); box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1); animation: slideDown 0.2s ease-out;">
        <button class="btn btn--sm audio-option-btn audio-option-btn--primary" data-type="ayah" data-surah="${surahNumber}" data-ayah="${ayahNumber}">▶ Play Ayah</button>
        <button class="btn btn--sm audio-option-btn audio-option-btn--secondary" data-type="surah" data-surah="${surahNumber}" data-ayah="${ayahNumber}">⏭ Play Surah</button>
        </div>
     `;
        actionsDiv.insertAdjacentHTML("beforeend", menuHTML);
      }
      return;
    }

    // --- 3. HANDLE AUDIO SLIDE-DOWN OPTION CLICK ---
   if (optionBtn) {
      e.stopPropagation();
      e.preventDefault();

    // --- ADD THIS AUDIO STOP CHECK HERE ---
  if (window.translationAudio) {
    window.translationAudio.pause();
    window.translationAudio.currentTime = 0;
  }

      const type = optionBtn.dataset.type;
      const surahNumber = parseInt(optionBtn.dataset.surah, 10);
      const ayahNumber = parseInt(optionBtn.dataset.ayah, 10);

      // Global session tracker
      window.currentAudioSession = Date.now();
      const thisSession = window.currentAudioSession;

      let translationAudio = window.translationAudioInstance;
      if (!translationAudio) {
        translationAudio = new Audio();
        window.translationAudioInstance = translationAudio;
      }
      translationAudio.onended = null;

      // Show bottom player bar
     const barEl = document.getElementById("player-bar");
if (barEl) {
  barEl.hidden = false;
  barEl.style.display = "";
  barEl.classList.remove("is-hidden", "hidden");
  barEl.classList.add("is-visible");
}

      const surahTitleEl = document.getElementById("player-surah");
      const toggleBtn = document.getElementById("player-toggle");
      const currentEl = document.getElementById("player-current");
      const durationEl = document.getElementById("player-duration");
      const seekEl = document.getElementById("player-seek");
      const volumeEl = document.getElementById("player-volume");
      const prevBtn = document.getElementById("player-prev");
      const nextBtn = document.getElementById("player-next");

      const formatTime = (secs) => {
        if (isNaN(secs)) return "0:00";
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
      };

      // 1. Fix Volume Slider
      if (volumeEl) {
        volumeEl.value = translationAudio.volume;
        volumeEl.oninput = (e) => {
          translationAudio.volume = Number(e.target.value);
        };
      }

     // 2. Fix Play/Pause Button State Icon with properly proportioned size
      const updatePlayButtonState = () => {
        if (!toggleBtn) return;
        
        toggleBtn.style.width = "44px";
        toggleBtn.style.height = "44px";
        toggleBtn.style.borderRadius = "50%";
        toggleBtn.style.display = "flex";
        toggleBtn.style.alignItems = "center";
        toggleBtn.style.justifyContent = "center";
        toggleBtn.style.border = "none";
        toggleBtn.style.cursor = "pointer";
        toggleBtn.style.flexShrink = "0";

        if (translationAudio.paused) {
          toggleBtn.innerHTML = window.ICONS ? window.ICONS.play : '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
        } else {
          toggleBtn.innerHTML = window.ICONS ? window.ICONS.pause : '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
        }
      };

      translationAudio.onplay = updatePlayButtonState;
      translationAudio.onpause = updatePlayButtonState;

      if (toggleBtn) {
        toggleBtn.onclick = () => {
          if (translationAudio.paused) {
            translationAudio.play();
          } else {
            translationAudio.pause();
          }
        };
      }

      // Live timeline listener
      translationAudio.ontimeupdate = () => {
        if (currentEl) currentEl.textContent = formatTime(translationAudio.currentTime);
        if (durationEl && translationAudio.duration) {
          durationEl.textContent = formatTime(translationAudio.duration);
          if (seekEl) seekEl.value = (translationAudio.currentTime / translationAudio.duration) * 100;
        }
        updatePlayButtonState();
      };

      // Seek bar binding
      if (seekEl) {
        seekEl.oninput = (e) => {
          if (translationAudio.duration) {
            translationAudio.currentTime = (Number(e.target.value) / 100) * translationAudio.duration;
          }
        };
      }

      const getAudioUrl = (s, a) => getAyahAudioUrl(s, a);

      // Urdu translation URL: only exists for the 3rd reciter (has translationFolder), else null
      const getUrduUrl = (s, a) => {
        const r = getActiveReciter();
        if (!r.translationFolder) return null;
        return `https://everyayah.com/data/${r.translationFolder}/${String(s).padStart(3, "0")}${String(a).padStart(3, "0")}.mp3`;
      };

      const continuous = type === "surah";   // Play Surah = keep going, Play Ayah = stop after this ayah
      let session = thisSession;
      let curSurah = surahNumber;
      let curAyah = ayahNumber;
      let step = "arabic";                   // "arabic" -> "urdu" (3rd reciter only) -> next ayah / stop

      const playStep = () => {
        if (window.currentAudioSession !== session) return; // stale or stopped
        const url = step === "urdu" ? getUrduUrl(curSurah, curAyah) : getAudioUrl(curSurah, curAyah);
        const sMeta = (state.surahs || []).find((s) => Number(s.number) === Number(curSurah));
        if (surahTitleEl) surahTitleEl.textContent = `${curSurah}. ${sMeta ? sMeta.name : `Surah ${curSurah}`}${step === "urdu" ? " · Urdu" : ""}`;
        translationAudio.src = url;
        translationAudio.play().catch((err) => console.log("Audio error:", err));
      };

      const startAyah = (s, a) => {
        curSurah = s;
        curAyah = a;
        step = "arabic";
        playStep();
      };

      // Called once an ayah (including its Urdu part, if any) is completely finished
      const advance = () => {
        if (!continuous) return;
        const max = (state.quran && state.quran[String(curSurah)]) ? state.quran[String(curSurah)].length : 7;
        if (curAyah + 1 > max) {
          window.activeSurahSession = null;
          return;
        }
        startAyah(curSurah, curAyah + 1);
      };

      translationAudio.onended = () => {
        if (window.currentAudioSession !== session) return;
        // Arabic just finished -> play Urdu for the SAME verse (3rd reciter only)
        if (step === "arabic" && getUrduUrl(curSurah, curAyah)) {
          step = "urdu";
          playStep();
          return;
        }
        advance();
      };

      translationAudio.onerror = () => {
        if (window.currentAudioSession !== session) return;
        if (step === "urdu") { advance(); return; } // missing Urdu file: skip it, keep going
        toast("This reciter's audio isn't available for this ayah.", "error");
      };

      window.activeSurahSession = continuous ? session : null;
      startAyah(surahNumber, ayahNumber);

      if (!continuous) {
        // Single-ayah mode: Previous / Next move one ayah
        if (prevBtn) {
          prevBtn.onclick = () => { if (curAyah > 1) startAyah(curSurah, curAyah - 1); };
        }
        if (nextBtn) {
          nextBtn.onclick = () => { startAyah(curSurah, curAyah + 1); };
        }
      } else {
        // Surah mode: Previous / Next move one surah
        if (prevBtn) {
          prevBtn.onclick = () => {
            if (curSurah > 1) {
              session = Date.now();
              window.currentAudioSession = session;
              window.activeSurahSession = session;
              startAyah(curSurah - 1, 1);
            }
          };
        }
        if (nextBtn) {
          nextBtn.onclick = () => {
            if (curSurah < 114) {
              session = Date.now();
              window.currentAudioSession = session;
              window.activeSurahSession = session;
              startAyah(curSurah + 1, 1);
            }
          };
        }
      }

      // Close dropdown menu after selection
      const menu = optionBtn.closest(".audio-dropdown-menu");
      if (menu) menu.remove();
      return;
    }
  });
}

// Click anywhere outside an open menu closes it
  if (!window.__audioMenuOutsideClick) window.__audioMenuOutsideClick = true;
  else document.removeEventListener("click", window.__audioMenuOutsideHandler);
  
  window.__audioMenuOutsideHandler = (ev) => {
    if (!ev.target.closest(".audio-dropdown-menu") && !ev.target.closest(".btn-play-trans")) {
      document.querySelectorAll("#translation-content .audio-dropdown-menu").forEach((m) => m.remove());
    }
  };
  document.addEventListener("click", window.__audioMenuOutsideHandler);

// Stop translation recitation when leaving a Surah view
const handleSurahExit = () => {
  const currentHash = window.location.hash;
  
  // If the user leaves the Surah page (e.g. goes back to translation main page or Normal Quran)
  if (!currentHash.includes('/translation/surah/')) {
    if (typeof translationAudio !== 'undefined' && translationAudio) {
      translationAudio.pause();
      translationAudio.currentTime = 0;
    }
    if (window.translationAudioInstance) {
      try { window.translationAudioInstance.pause(); } catch(e) {}
    }
    
    window.currentAudioSession = null;
    window.activeSurahSession = null;

    const transBar = document.getElementById('player-bar');
    if (transBar) {
      transBar.style.display = 'none';
    }
  }
};

// Safely register the listener
try {
  window.removeEventListener('hashchange', handleTranslationNavigation);
  window.removeEventListener('popstate', handleTranslationNavigation);
  window.removeEventListener('hashchange', handleSurahExit);
  window.removeEventListener('popstate', handleSurahExit);
} catch (e) {}

window.addEventListener('hashchange', handleSurahExit);
window.addEventListener('popstate', handleSurahExit);

  let data;
  try {
    data = mode === "para" 
      ? await api.getParaTranslation(id, currentLang) 
      : await api.getSurahTranslation(id, currentLang);
  } catch (e) {
    // Fallback using local state.quran data safely
    const rawAyahs = state.quran[String(id)] || [];
    data = {
      ayahs: rawAyahs.map((a) => ({
        surahNumber: parseInt(id, 10),
        ayahNumber: a.number,
        arabicText: a.text,
        translationText: currentLang === "ur" 
          ? `(اردو ترجمہ) ${a.text}` 
          : `(Translation) Verse text placeholder`
      }))
    };
  }
    const contentEl = document.getElementById("translation-content");
    if (!data || !data.ayahs || !data.ayahs.length) {
      contentEl.innerHTML = `<div class="empty-state">No translation data available.</div>`;
      return;
    }

    contentEl.innerHTML = data.ayahs
      .map((ayah) => {
        const isBookmarked = (state.translationBookmarks || []).some(
      (b) => Number(b.surahNumber) === Number(ayah.surahNumber) && Number(b.ayahNumber) === Number(ayah.ayahNumber)
    );
        return `
          <div class="translation-row" id="trans-ayah-${ayah.ayahNumber}" data-surah="${ayah.surahNumber}" data-ayah="${ayah.ayahNumber}" style="border-bottom: 1px solid var(--border-color, rgba(128, 128, 128, 0.2)); padding: 1.5rem 1.25rem; background: transparent; box-shadow: none; margin: 0 0.5rem;">
        <!-- Top Meta: Only the Ayah Number Badge -->
        <div class="translation-row__meta">
          <span class="ayah-badge" style="display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border: 1px solid rgba(223, 177, 128, 0.35); border-radius: 50%; font-size: 0.85rem; color: #8b8884; font-weight: 500;">${ayah.ayahNumber}</span>
        </div>

        <!-- Middle: Arabic Text & Translation -->
        <div class="translation-row__arabic" dir="rtl" style="font-family: 'Amiri Quran', 'Scheherazade New', 'KFGQPC Uthmanic Script HAFS', 'Uthmanic', serif; font-size: 2rem; line-height: 2.4; text-align: right;">${ayah.arabicText}</div>
       <div class="translation-row__text" dir="${currentLang === "ur" ? "rtl" : "ltr"}">${ayah.translationText || ayah.translation || ayah.text || "(Translation) Verse text placeholder"}<button type="button" class="tafsir-trigger" aria-label="Show tafsir" title="Tafsir">${ICONS.tafsir}</button><div class="tafsir-panel" data-surah="${ayah.surahNumber}" data-ayah="${ayah.ayahNumber}"><div class="tafsir-panel__inner"><div class="tafsir-panel__body"></div></div></div></div>
        <!-- Bottom Meta: Bookmark & Audio Play Buttons -->
        <div class="translation-row__actions" style="display: flex; gap: 0.5rem; margin-top: 0.75rem;">
        <button class="ayah-action btn-bookmark-trans ${isBookmarked ? 'is-active' : ''}" data-surah="${ayah.surahNumber}" data-ayah="${ayah.ayahNumber}" aria-label="${isBookmarked ? 'Remove bookmark' : 'Bookmark this ayah'}" aria-pressed="${isBookmarked}">
            ${isBookmarked ? ICONS.bookmarkFilled || "🔖" : ICONS.bookmark || "🔖"}
          </button>
          <button class="ayah-action btn-play-trans" data-surah="${ayah.surahNumber}" data-ayah="${ayah.ayahNumber}" aria-label="Play">
            ${ICONS.play || "▶"}
          </button>
          <button type="button" class="ayah-action btn-reciter-trans" aria-label="Choose reciter" title="Choose reciter">
            ${HEADPHONES_ICON}
          </button>
        </div>
      </div>
        `;
      })
      .join("");

     // --- Auto-scroll & Highlight Target Ayah ---
  const hashQuery = new URLSearchParams(window.location.hash.split("?")[1] || "");
  const targetAyah = Number(hashQuery.get("ayah")) || null;
  const targetSurah = Number(hashQuery.get("surah")) || null;
  const targetSelector = targetAyah
    ? `.translation-row[data-ayah="${targetAyah}"]${targetSurah ? `[data-surah="${targetSurah}"]` : ""}`
    : null;

  if (targetSelector) {
    let attempts = 0;
    const checkAndScroll = setInterval(() => {
      const el = contentEl.querySelector(targetSelector);
      attempts++;
      if (el) {
        clearInterval(checkAndScroll);
        el.classList.add("ayah-highlight");
        setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
        setTimeout(() => el.classList.remove("ayah-highlight"), 3500);
      } else if (attempts > 20) {
        clearInterval(checkAndScroll);
      }
    }, 100);
  }

  // --- Independent reading-position tracking ---
  if (window.__transObserver) window.__transObserver.disconnect();
  if (window.__transSaveTimer) clearInterval(window.__transSaveTimer);
  const transRows = Array.from(contentEl.querySelectorAll(".translation-row"));
  let lastIdx = 0;
  if (targetSelector) {
    const startIdx = transRows.findIndex((r) => r.matches(targetSelector));
    if (startIdx > -1) lastIdx = startIdx;
  }
  window.__transObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const i = transRows.indexOf(entry.target);
          if (i > lastIdx) lastIdx = i;
        }
      });
    },
    { rootMargin: "-40% 0px -40% 0px" }
  );
  transRows.forEach((r) => window.__transObserver.observe(r));
  const persistTransProgress = () => {
    const row = transRows[lastIdx];
    if (row) saveTranslationProgress(mode, id, row.dataset.surah, row.dataset.ayah);
  };
  window.__transSaveTimer = setInterval(persistTransProgress, 5000);
  const onTransLeave = () => {
    clearInterval(window.__transSaveTimer);
    persistTransProgress();
  };
  window.addEventListener("hashchange", onTransLeave, { once: true });

    // Bookmark event listeners
  contentEl.querySelectorAll(".btn-bookmark-trans").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();

    const s = parseInt(btn.dataset.surah, 10);
    const a = parseInt(btn.dataset.ayah, 10);

    const item = {
      surahNumber: s,
      ayahNumber: a,
      source: "translation",
      mode: mode || "surah",
      modeId: id || s,
      createdAt: Date.now()
    };

    // Check if this specific Ayah was already bookmarked BEFORE toggling
    const wasBookmarked = (state.translationBookmarks || []).some(
      (b) => Number(b.surahNumber) === s && Number(b.ayahNumber) === a
    );

    // If it was NOT bookmarked, find if there is a previous bookmark in this Surah
    let previousAyah = null;
    if (!wasBookmarked) {
      const existing = (state.translationBookmarks || []).find(
        (b) => Number(b.surahNumber) === s && Number(b.ayahNumber) !== a
      );
      if (existing) {
        previousAyah = existing.ayahNumber;
      }
    }

    // Toggle bookmark state in local storage & memory
    if (typeof toggleTranslationBookmark === "function") {
    toggleTranslationBookmark(item);
  } else if (window.store && window.store.toggleTranslationBookmark) {
    window.store.toggleTranslationBookmark(item);
  }

   // Sync state array immediately so list views detect the bookmark
  if (window.store && window.store.getTranslationBookmarks) {
    state.translationBookmarks = window.store.getTranslationBookmarks();
  } else if (window.store && window.store.getGuestTranslationBookmarks) {
    state.translationBookmarks = window.store.getGuestTranslationBookmarks();
  }

    // Check updated status
    const nowBookmarked = (state.translationBookmarks || []).some(
      (b) => Number(b.surahNumber) === s && Number(b.ayahNumber) === a
    );

    // Update button directly without reloading or jumping scroll position
    if (nowBookmarked) {
      btn.classList.add("is-active");
      btn.setAttribute("aria-pressed", "true");
      btn.innerHTML = ICONS.bookmarkFilled || ICONS.bookmark;
    } else {
      btn.classList.remove("is-active");
      btn.setAttribute("aria-pressed", "false");
      btn.innerHTML = ICONS.bookmark;
    }

    // If a new bookmark was added and a previous bookmark existed in this Surah, scroll to it smoothly!
    if (!wasBookmarked && nowBookmarked && previousAyah) {
      setTimeout(() => {
        const targetEl = document.getElementById(`trans-ayah-${previousAyah}`);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
          targetEl.classList.add("ayah-highlight");
          setTimeout(() => {
            targetEl.classList.remove("ayah-highlight");
          }, 3500);
        }
      }, 100);
    }
  });
});
// If an ayah was unbookmarked, fall back to the remaining bookmarked ayah in this Surah!
    const currentBookmarks = (window.store && window.store.getTranslationBookmarks ? window.store.getTranslationBookmarks() : null) 
        || state.translationBookmarks 
        || [];
        
   const currentSNum = typeof surahNum !== 'undefined' ? surahNum : (typeof sNum !== 'undefined' ? sNum : state.currentSurah);
        const currentANum = typeof ayahNum !== 'undefined' ? ayahNum : (typeof ayah !== 'undefined' ? ayah : state.currentAyah);

        const isStillBookmarked = currentBookmarks.some(
          (b) => Number(b.surahNumber || b.surah) === Number(currentSNum) && Number(b.ayahNumber || b.ayah) === Number(currentANum)
        );
        if (!isStillBookmarked) {
          // If it was just unbookmarked (i.e. not in current bookmarks anymore)
          const remainingBookmarks = currentBookmarks.filter(
            (b) => Number(b.surahNumber || b.surah) === Number(currentSNum) && Number(b.ayahNumber || b.ayah) === Number(currentANum)
          );
        
        if (remainingBookmarks.length > 0) {
            const nextTarget = remainingBookmarks[remainingBookmarks.length - 1];
            const targetAyahNum = nextTarget.ayahNumber || nextTarget.ayah;
            
            setTimeout(() => {
               const targetEl = document.getElementById(`trans-ayah-${targetAyahNum}`);
                if (targetEl) {
                    targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
                    targetEl.classList.add("ayah-highlight");
                    setTimeout(() => {
                        targetEl.classList.remove("ayah-highlight");
                    }, 3500);
                }
            }, 100);
        }
    }
  } 
function showAudioChoiceModal(surahNumber, ayahNumber) {
  const choice = confirm(
    `Audio Options for Surah ${surahNumber}, Ayah ${ayahNumber}:\n\n` +
    `Click OK to "Play Ayah" (Single Verse)\n` +
    `Click Cancel to "Play Surah" (Continuous from this verse)`
  );

  if (choice) {
    // Play only this Ayah
    if (window.audioPlayer && window.audioPlayer.playAyah) {
      window.audioPlayer.playAyah(surahNumber, ayahNumber);
    }
  } else {
    // Play continuously from this Ayah to the end of the Surah
    if (window.audioPlayer && window.audioPlayer.playSurahFrom) {
      window.audioPlayer.playSurahFrom(surahNumber, ayahNumber);
    }
  }
}
/* =====================================================
   AUTH MODAL
   ===================================================== */
function openAuthModal() {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-label="Sign in">
      <button class="icon-btn modal-close" id="modal-close" aria-label="Close">${ICONS.close}</button>
      <h2>Welcome</h2>
      <p class="modal-sub">Sign in to sync your bookmarks and progress.</p>
      <div class="modal-tabs">
        <button data-tab="login" class="active">Sign in</button>
        <button data-tab="signup">Create account</button>
      </div>
      <div id="modal-error"></div>
      <form id="login-form">
        <div class="field"><label for="login-email">Email</label><input id="login-email" type="email" required autocomplete="email"></div>
        <div class="field"><label for="login-password">Password</label><input id="login-password" type="password" required autocomplete="current-password"></div>
        <button class="btn btn--primary btn--block" type="submit">Sign in</button>
      </form>
      <form id="signup-form" hidden>
        <div class="field"><label for="signup-name">Name</label><input id="signup-name" type="text" required autocomplete="name"></div>
        <div class="field"><label for="signup-email">Email</label><input id="signup-email" type="email" required autocomplete="email"></div>
        <div class="field"><label for="signup-password">Password</label><input id="signup-password" type="password" required minlength="8" autocomplete="new-password"></div>
        <button class="btn btn--primary btn--block" type="submit">Create account</button>
      </form>
      <p class="form-note">Continue without an account — your bookmarks stay saved on this device only.</p>
    </div>
  `;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  overlay.querySelector("#modal-close").addEventListener("click", close);

  const tabs = overlay.querySelectorAll(".modal-tabs button");
  const loginForm = overlay.querySelector("#login-form");
  const signupForm = overlay.querySelector("#signup-form");
  tabs.forEach((t) =>
    t.addEventListener("click", () => {
      tabs.forEach((x) => x.classList.remove("active"));
      t.classList.add("active");
      loginForm.hidden = t.dataset.tab !== "login";
      signupForm.hidden = t.dataset.tab !== "signup";
      overlay.querySelector("#modal-error").innerHTML = "";
    })
  );

  function showModalError(msg) {
    overlay.querySelector("#modal-error").innerHTML = `<div class="form-error">${msg}</div>`;
  }

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = overlay.querySelector("#login-email").value.trim();
    const password = overlay.querySelector("#login-password").value;
    try {
      const res = await api.login(email, password);
      state.user = res.user;
      await mergeGuestDataIntoAccount();
      close();
      toast(`Welcome back, ${res.user.name || res.user.email}.`, "success");
      renderShell();
      renderView();
    } catch (err) {
      if (err.message === "NETWORK") showModalError("Can't reach the server. Check that the back-end is running.");
      else showModalError("Incorrect email or password.");
    }
  });

  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = overlay.querySelector("#signup-name").value.trim();
    const email = overlay.querySelector("#signup-email").value.trim();
    const password = overlay.querySelector("#signup-password").value;
    if (password.length < 8) return showModalError("Password must be at least 8 characters.");
    try {
      const res = await api.signup(name, email, password);
      state.user = res.user;
      await mergeGuestDataIntoAccount();
      close();
      toast(`Account created. Welcome, ${name}.`, "success");
      renderShell();
      renderView();
    } catch (err) {
      if (err.message === "NETWORK") showModalError("Can't reach the server. Check that the back-end is running.");
      else showModalError(err.message || "Couldn't create your account.");
    }
  });
}

async function mergeGuestDataIntoAccount() {
  const guestBookmarks = store.getGuestBookmarks();
  for (const b of guestBookmarks) {
    try {
      await api.addBookmark(b.surahNumber, b.surahName, b.ayahNumber);
    } catch (e) {
      /* skip duplicates/errors */
    }
  }

  const guestTrans = store.getGuestTranslationBookmarks ? store.getGuestTranslationBookmarks() : [];
  for (const b of guestTrans) {
    const isPara = (b.mode || "surah") === "para";
    try {
      await api.addExtraBookmark({
        bookmarkType: isPara ? "translation_parah" : "translation_surah",
        surahNumber: Number(b.surahNumber),
        surahName: b.surahName || null,
        parahNumber: isPara ? Number(b.modeId || b.parahNumber || 1) : null,
        ayahNumber: Number(b.ayahNumber),
      });
    } catch (e) {
      /* ignore */
    }
  }

  const guestNormalParah = store.getGuestNormalParahBookmarks ? store.getGuestNormalParahBookmarks() : [];
  for (const b of guestNormalParah) {
    try {
      await api.addExtraBookmark({
        bookmarkType: "normal_parah",
        parahNumber: Number(b.parahNumber),
        surahNumber: Number(b.surahNumber),
        surahName: b.surahName || null,
        ayahNumber: Number(b.ayahNumber),
      });
    } catch (e) {
      /* ignore */
    }
  }

  const guestWbw = store.getGuestWordByWordBookmarks ? store.getGuestWordByWordBookmarks() : [];
  for (const b of guestWbw) {
    try {
      await api.addExtraBookmark({
        bookmarkType: "word_by_word",
        surahNumber: Number(b.surahNumber),
        surahName: b.surahName || null,
        parahNumber: b.parahNumber != null ? Number(b.parahNumber) : null,
        ayahNumber: Number(b.ayahNumber),
      });
    } catch (e) {
      /* ignore */
    }
  }

  const guestProgress = store.getGuestProgress();
  if (guestProgress) {
    try {
      await api.setProgress(guestProgress.surahNumber, guestProgress.ayahNumber);
    } catch (e) {
      /* ignore */
    }
  }

  store.setGuestBookmarks([]);
  if (store.setGuestTranslationBookmarks) store.setGuestTranslationBookmarks([]);
  if (store.setGuestNormalParahBookmarks) store.setGuestNormalParahBookmarks([]);
  if (store.setGuestWordByWordBookmarks) store.setGuestWordByWordBookmarks([]);
  store.setGuestProgress(null);
  await refreshBookmarksAndProgress();
}

/* =====================================================
   COOKIE BANNER
   ===================================================== */
function showCookieBanner() {
  const banner = document.getElementById("cookie-banner");
  banner.hidden = false;
}

function wireCookieBanner() {
  const banner = document.getElementById("cookie-banner");
  const consent = store.getCookieConsent();
  if (consent === null) banner.hidden = false;
  document.getElementById("cookie-accept").addEventListener("click", () => {
    store.setCookieConsent("accepted");
    banner.hidden = true;
    toast("Preference saved.", "success");
  });
  document.getElementById("cookie-reject").addEventListener("click", () => {
    store.setCookieConsent("rejected");
    banner.hidden = true;
    toast("Preference saved. Bookmarks will only last this session.", "info");
  });
}

/* =====================================================
   MAIN VIEW SWITCH
   ===================================================== */
function renderView() {
  document.querySelectorAll("#main-nav a").forEach((a) => a.classList.remove("active"));
  const routeToNav = { home: "home", surah: "surahs", bookmarks: "bookmarks", direction:"direction", settings: "settings" };
  const active = document.querySelector(`#main-nav a[data-route="${routeToNav[state.route.name] || "home"}"]`);
  if (active) active.classList.add("active");

  if (state.route.name === "home") renderHome();
  else if (state.route.name === "surah") renderReader(state.route.number, state.route.ayah);
  else if (state.route.name === "para") renderParaReader(state.route.number);
  else if (state.route.name === "quran") renderQuranMode(state.route.number, state.route.ayah);
  else if (state.route.name === "translation-home") renderTranslationHome();
  else if (state.route.name === "translation") renderTranslationReader(state.route.mode || "surah", state.route.number || 1);
  else if (state.route.name === "bookmarks") renderBookmarks();
   else if (state.route.name === "direction") renderDirection();
  else if (state.route.name === "settings") renderSettings();
  else if (state.route.name === "account") renderAccount();
}

function render() {
  renderShell();
  renderView();
}
/* =====================================================
   RENDER: DIRECTION & PRAYER TIMES
   ===================================================== */
// Keep track of the countdown timer globally inside the file so we can clear it
let activeCountdownInterval = null;
let currentCompassStyle = "dial"; 
let activeOrientationListener = null;
let isDirectionPageActive = false; 

function cleanupCompassSensors() {
  isDirectionPageActive = false; 
  if (activeOrientationListener) {
    window.removeEventListener("deviceorientation", activeOrientationListener);
    activeOrientationListener = null;
  }
  if (activeCountdownInterval) {
    clearInterval(activeCountdownInterval);
    activeCountdownInterval = null;
  }
}

async function renderDirection() {
  cleanupCompassSensors();
  isDirectionPageActive = true; 

  const view = document.getElementById("view");
  view.innerHTML = `
    <div class="section" style="max-width: 640px; margin: 0 auto; text-align: center; padding-top: 30px;">
      <h2 class="section__title">Direction & Prayer Times</h2>
      <p class="section__sub">Detecting location & calculating local timings...</p>
    </div>
  `;

  if (!navigator.geolocation) {
    view.innerHTML = `
      <div class="section" style="max-width: 640px; margin: 0 auto; text-align: center; padding-top: 30px;">
        <h2 class="section__title">Direction & Prayer Times</h2>
        <p class="section__sub" style="color: var(--danger);">Geolocation is not supported by your browser.</p>
      </div>
    `;
    return;
  }

  function getAutoParams(lat, lon) {
    let method = 3; 
    let school = 0; 
    if (lat >= 5 && lat <= 38 && lon >= 60 && lon >= 92) {
      method = 1; 
      school = 1; 
    } else if (lat >= 12 && lat <= 32 && lon >= 34 && lon <= 56) {
      method = 4;
      school = 0;
    } else if (lat >= 24 && lat <= 50 && lon >= -125 && lon <= -65) {
      method = 2;
      school = 0;
    }
    return { method, school };
  }

  function format12Hour(timeStr, offsetMinutes = 0) {
    if (!timeStr) return "";
    const cleanTime = timeStr.split(" ")[0];
    const [hStr, mStr] = cleanTime.split(":");
    let date = new Date();
    date.setHours(parseInt(hStr, 10), parseInt(mStr, 10) + offsetMinutes, 0);

    let h = date.getHours();
    const m = String(date.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    h = h ? h : 12;
    return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
  }

  function getCardinalDirection(angle) {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(((angle %= 360) < 0 ? angle + 360 : angle) / 45) % 8;
    return directions[index];
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      const { method, school } = getAutoParams(lat, lon);

      const now = new Date();
      const isFriday = now.getDay() === 5;
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const dateStr = `${day}-${month}-${year}`;
      const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      try {
        const [timingRes, qiblaRes] = await Promise.all([
          fetch(`https://api.aladhan.com/v1/timings/${dateStr}?latitude=${lat}&longitude=${lon}&method=${method}&school=${school}&timezonestring=${encodeURIComponent(userTimeZone)}`),
          fetch(`https://api.aladhan.com/v1/qibla/${lat}/${lon}`)
        ]);

        const timingData = await timingRes.json();
        const qiblaData = await qiblaRes.json();

        const timings = timingData.data.timings;
        const qiblaAngle = qiblaData.data.direction || 0; 
        const qiblaCardinal = getCardinalDirection(qiblaAngle);

        let isJamaatMode = false;
        let lastVibratedState = false;

        function renderContent() {
          if (!isDirectionPageActive) return; 
          const offsets = isJamaatMode ? { Fajr: 40, Dhuhr: 30, Juma: 45, Asr: 30, Maghrib: 5, Isha: 30 } : { Fajr: 0, Dhuhr: 0, Juma: 15, Asr: 0, Maghrib: 0, Isha: 0 };

          view.innerHTML = `
            <style>
              @media (max-width: 768px) {
                .desktop-compass-select { display: none !important; }
                .mobile-compass-thumbnails { display: flex !important; }
              }
              @media (min-width: 769px) {
                .desktop-compass-select { display: block !important; }
                .mobile-compass-thumbnails { display: none !important; }
              }
            </style>

            <div class="settings-grid" style="padding-top: 20px;">
              <div class="settings-card">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                  <h3 style="margin:0;">Today's Prayer Timings</h3>
                  <button id="toggle-jamaat-btn" style="background: rgba(255, 255, 255, 0.25); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1.5px solid rgba(0, 0, 0, 0.25); padding: 6px 14px; border-radius: 20px; font-size: 0.8rem; cursor: pointer; color: var(--fg); font-weight: 700; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                    ${isJamaatMode ? "Mosque Jama'at" : "Adhan Start"} Mode
                  </button>
                </div>
                <p id="next-prayer-countdown" style="font-size: 0.85rem; color: var(--accent); font-weight: 600; margin-bottom: 20px;">Calculating next prayer...</p>

                <div class="settings-row"><span class="settings-row__label">Fajr</span><span class="settings-row__desc">${format12Hour(timings.Fajr, offsets.Fajr)}</span></div>
                <div class="settings-row"><span class="settings-row__label">Dhuhr</span><span class="settings-row__desc">${format12Hour(timings.Dhuhr, offsets.Dhuhr)}</span></div>
                
                ${isFriday ? `
                  <div class="settings-row" style="background: rgba(46, 125, 50, 0.08); border-radius: 8px; padding: 4px 8px; margin: 2px 0;">
                    <span class="settings-row__label" style="font-weight: 700; color: #2e7d32;">Juma (Friday Prayer)</span>
                    <span class="settings-row__desc" style="font-weight: 700; color: #2e7d32;">${format12Hour(timings.Dhuhr, offsets.Juma)}</span>
                  </div>
                ` : ''}

                <div class="settings-row"><span class="settings-row__label">Asr</span><span class="settings-row__desc">${format12Hour(timings.Asr, offsets.Asr)}</span></div>
                <div class="settings-row"><span class="settings-row__label">Maghrib</span><span class="settings-row__desc">${format12Hour(timings.Maghrib, offsets.Maghrib)}</span></div>
                <div class="settings-row"><span class="settings-row__label">Isha</span><span class="settings-row__desc">${format12Hour(timings.Isha, offsets.Isha)}</span></div>
              </div>

              <div class="settings-card" style="text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: space-between; min-height: 560px; padding: 30px 20px;">
                <div style="width: 100%; display: flex; justify-content: space-between; align-items: center;">
                  <div style="text-align: left;">
                    <h3 style="margin-bottom:2px;">Qibla Direction</h3>
                    <p style="margin: 0; font-size:0.85rem; color: var(--fg-muted);">${qiblaAngle.toFixed(1)}° (${qiblaCardinal}) from True North</p>
                  </div>
                  
                  <select id="compass-style-select" class="desktop-compass-select" style="background: rgba(255, 255, 255, 0.12); backdrop-filter: blur(12px); border: 1px solid rgba(0, 0, 0, 0.18); padding: 6px 12px; border-radius: 20px; font-size: 0.78rem; cursor: pointer; color: var(--fg); font-weight: 600; outline: none;">
                    <option value="dial" ${currentCompassStyle === 'dial' ? 'selected' : ''} style="background: var(--bg-surface); color: var(--fg);">Compass 1 (Standard Dial)</option>
                    <option value="arrow" ${currentCompassStyle === 'arrow' ? 'selected' : ''} style="background: var(--bg-surface); color: var(--fg);">Compass 2 (Minimal Arrow)</option>
                    <option value="classic" ${currentCompassStyle === 'classic' ? 'selected' : ''} style="background: var(--bg-surface); color: var(--fg);">Compass 3 (Dark Glassy)</option>
                  </select>
                </div>
                
                <div id="compass-display-container" style="position: relative; width: 260px; height: 260px; display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 15px 0;">
                  ${getCompassHTML(currentCompassStyle, qiblaAngle)}
                </div>

                <!-- Live phone heading degree and matching cardinal symbol -->
                <div style="margin-top: -5px; margin-bottom: 10px;">
                  <h2 id="live-degree-text" style="font-size: 1.8rem; font-weight: 800; margin: 0; letter-spacing: -0.5px;">0° N</h2>
                </div>

                <div class="mobile-compass-thumbnails" style="display: none; width: 100%; overflow-x: auto; gap: 10px; padding: 6px 0; justify-content: center; align-items: center;">
                  <div class="thumb-btn" data-style="dial" style="min-width: 50px; height: 50px; border-radius: 12px; border: 2px solid ${currentCompassStyle === 'dial' ? '#00aaff' : 'var(--border)'}; background: var(--bg-surface); display: flex; align-items: center; justify-content: center; cursor: pointer;">
                    <svg width="30" height="30" viewBox="0 0 200 200"><circle cx="100" cy="100" r="92" fill="#fff" stroke="#38bdf8" stroke-width="12"/><polygon points="100,2 108,14 92,14" fill="#38bdf8"/></svg>
                  </div>
                  <div class="thumb-btn" data-style="arrow" style="min-width: 50px; height: 50px; border-radius: 12px; border: 2px solid ${currentCompassStyle === 'arrow' ? '#00aaff' : 'var(--border)'}; background: var(--bg-surface); display: flex; align-items: center; justify-content: center; cursor: pointer;">
                    <svg width="30" height="30" viewBox="0 0 200 200"><polygon points="100,10 170,130 100,110 30,130" fill="#f59e0b"/></svg>
                  </div>
                  <div class="thumb-btn" data-style="classic" style="min-width: 50px; height: 50px; border-radius: 12px; border: 2px solid ${currentCompassStyle === 'classic' ? '#00aaff' : 'var(--border)'}; background: var(--bg-surface); display: flex; align-items: center; justify-content: center; cursor: pointer;">
                    <svg width="30" height="30" viewBox="0 0 200 200"><circle cx="100" cy="100" r="95" fill="#121826"/><polygon points="50,15 65,50 50,42" fill="#ffd700"/></svg>
                  </div>
                </div>

                <div style="position: relative; width: 170px; height: 170px;">
                  <div style="position: absolute; bottom: 8px; left: 8%; width: 84%; height: 30px; background: radial-gradient(ellipse at center, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 75%); border-radius: 50%;"></div>
                  <svg viewBox="0 0 160 160" width="100%" height="100%" style="position: absolute; bottom: 10px;">
                    <polygon points="80,138 150,108 80,78 10,108" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>
                    <polygon points="80,22 138,48 80,74 22,48" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1"/>
                    <polygon points="22,48 80,74 80,138 22,112" fill="#050505"/>
                    <polygon points="80,74 138,48 138,112 80,138" fill="#141414"/>
                    <polygon points="80,84 138,58 138,66 80,92" fill="#ffd700"/>
                    <polygon points="22,58 80,84 80,92 22,66" fill="#ca8a04"/>
                    <polygon points="94,98 109,91 109,123 94,130" fill="#facc15" stroke="#a16207" stroke-width="1"/>
                    <line x1="101.5" y1="94.5" x2="101.5" y2="126.5" stroke="#a16207" stroke-width="0.8"/>
                    <circle cx="80" cy="130" r="4.5" fill="#f8fafc" stroke="#475569" stroke-width="1.5"/>
                  </svg>
                </div>
              </div>
            </div>
          `;

          document.getElementById("toggle-jamaat-btn").addEventListener("click", () => {
            isJamaatMode = !isJamaatMode;
            renderContent();
          });

          const desktopSelect = document.getElementById("compass-style-select");
          if (desktopSelect) {
            desktopSelect.addEventListener("change", (e) => {
              currentCompassStyle = e.target.value;
              renderContent();
            });
          }

          document.querySelectorAll(".thumb-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
              currentCompassStyle = e.currentTarget.getAttribute("data-style");
              renderContent();
            });
          });
        }

        renderContent();

        if (activeCountdownInterval) clearInterval(activeCountdownInterval);

        activeCountdownInterval = setInterval(() => {
          if (!isDirectionPageActive) return; 
          const now = new Date();
          const offsets = isJamaatMode ? { Fajr: 40, Dhuhr: 30, Juma: 45, Asr: 30, Maghrib: 5, Isha: 30 } : { Fajr: 0, Dhuhr: 0, Juma: 15, Asr: 0, Maghrib: 0, Isha: 0 };
          
          let prayerList = [
            { name: "Fajr", time: timings.Fajr, off: offsets.Fajr },
            { name: isFriday ? "Juma" : "Dhuhr", time: timings.Dhuhr, off: isFriday ? offsets.Juma : offsets.Dhuhr },
            { name: "Asr", time: timings.Asr, off: offsets.Asr },
            { name: "Maghrib", time: timings.Maghrib, off: offsets.Maghrib },
            { name: "Isha", time: timings.Isha, off: offsets.Isha }
          ];

          let next = null;
          for (let p of prayerList) {
            const cleanT = p.time.split(" ")[0];
            const [h, m] = cleanT.split(":").map(Number);
            const pDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m + p.off);
            if (pDate > now) {
              next = { name: p.name, time: pDate };
              break;
            }
          }

          if (!next) {
            const cleanT = timings.Fajr.split(" ")[0];
            const [h, m] = cleanT.split(":").map(Number);
            const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, h, m + offsets.Fajr);
            next = { name: "Fajr (Tomorrow)", time: tomorrow };
          }

          const diffMs = next.time - now;
          const hrs = Math.floor(diffMs / 3600000);
          const mins = Math.floor((diffMs % 3600000) / 60000);
          const secs = Math.floor((diffMs % 60000) / 1000);

          const timerEl = document.getElementById("next-prayer-countdown");
          if (timerEl) {
            timerEl.textContent = `Next: ${next.name} in ${hrs}h ${mins}m ${secs}s`;
          }
        }, 1000);

        if (window.DeviceOrientationEvent) {
          activeOrientationListener = (event) => {
            if (!isDirectionPageActive || !document.getElementById("qibla-rotating-element")) {
              if (activeOrientationListener) {
                window.removeEventListener("deviceorientation", activeOrientationListener);
              }
              return;
            }

            let heading = event.alpha;
            if (event.webkitCompassHeading !== undefined && event.webkitCompassHeading !== null) {
              heading = event.webkitCompassHeading;
            } else if (heading !== null && heading !== undefined) {
              heading = 360 - heading;
            }

            if (heading !== null && heading !== undefined) {
              let rotationAngle = qiblaAngle - heading;
              const displayHeading = Math.round((heading % 360 + 360) % 360);
              
              const normalizedDiff = Math.abs((rotationAngle % 360 + 540) % 360 - 180);
              const isAligned = normalizedDiff <= 4;

              const rotatingElem = document.getElementById("qibla-rotating-element");
              if (rotatingElem) {
                rotatingElem.style.transform = `rotate(${rotationAngle}deg)`;
              }

              const liveDegEl = document.getElementById("live-degree-text");
              if (liveDegEl) {
                liveDegEl.textContent = `${displayHeading}° ${getCardinalDirection(displayHeading)}`;
              }

              updateCompassAccuracyState(currentCompassStyle, isAligned);

              if (isAligned && !lastVibratedState) {
                if (navigator.vibrate) navigator.vibrate(100);
                lastVibratedState = true;
              } else if (!isAligned) {
                lastVibratedState = false;
              }
            }
          };

          window.addEventListener("deviceorientation", activeOrientationListener);
        }

      } catch (e) {
        view.innerHTML = `
          <div class="section" style="max-width: 640px; margin: 0 auto; text-align: center; padding-top: 60px;">
            <h2 class="section__title">Direction & Prayer Times</h2>
            <p class="section__sub" style="color: var(--danger);">Failed to load prayer timings. Please check network connection.</p>
          </div>
        `;
      }
    },
    (error) => {
      view.innerHTML = `
        <div class="section" style="max-width: 640px; margin: 0 auto; text-align: center; padding-top: 60px;">
          <h2 class="section__title">Direction & Prayer Times</h2>
          <p class="section__sub" style="color: var(--danger);">Location permission denied. Please allow location access in your browser settings.</p>
        </div>
      `;
    }
  );
}

function getCompassHTML(style, qiblaAngle) {
  if (style === 'dial') {
    return `
      <div id="qibla-rotating-element" style="transform: rotate(0deg); transition: transform 0.3s ease-out; transform-origin: 50% 50%; width: 250px; height: 250px;">
        <svg width="250" height="250" viewBox="0 0 200 200">
          <circle id="compass-outer-ring" cx="100" cy="100" r="90" fill="#ffffff" stroke="#38bdf8" stroke-width="10" />
          <polygon id="compass-ring-pointer" points="100,0 110,12 90,12" fill="#38bdf8" />
          
          <circle cx="100" cy="100" r="78" fill="none" stroke="#cbd5e1" stroke-width="0.8" stroke-dasharray="2 4" />
          
          <text x="100" y="32" text-anchor="middle" fill="#ef4444" font-weight="800" font-size="11">N</text>
          <text x="172" y="104" text-anchor="middle" fill="#0f172a" font-weight="700" font-size="11">E</text>
          <text x="100" y="176" text-anchor="middle" fill="#0f172a" font-weight="700" font-size="11">S</text>
          <text x="28" y="104" text-anchor="middle" fill="#0f172a" font-weight="700" font-size="11">W</text>
          
          <text x="150" y="56" text-anchor="middle" fill="#64748b" font-size="8">60</text>
          <text x="150" y="152" text-anchor="middle" fill="#64748b" font-size="8">120</text>
          <text x="50" y="152" text-anchor="middle" fill="#64748b" font-size="8">240</text>
          <text x="50" y="56" text-anchor="middle" fill="#64748b" font-size="8">300</text>

          <circle cx="100" cy="100" r="18" fill="#0284c7" />
          <rect x="89" y="89" width="22" height="22" fill="#0f172a" rx="2" />
          <rect x="89" y="93" width="22" height="3" fill="#eab308" />
          <rect x="98" y="101" width="6" height="10" fill="#facc15" />

          <polygon points="100,122 112,150 100,142" fill="#10b981" />
          <polygon points="100,122 88,150 100,142" fill="#059669" />
        </svg>
      </div>
    `;
  } else if (style === 'arrow') {
    return `
      <div style="position: relative; width: 230px; height: 230px; display: flex; align-items: center; justify-content: center;">
        <div id="minimal-notch-pointer" style="position: absolute; top: 0; width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-top: 12px solid #e0f2fe; transition: border-color 0.3s;"></div>

        <div id="qibla-rotating-element" style="transform: rotate(0deg); transition: transform 0.3s ease-out; transform-origin: 50% 50%; width: 210px; height: 210px;">
          <svg width="210" height="210" viewBox="0 0 200 200">
            <polygon id="minimal-arrow-left" points="100,20 160,120 100,100" fill="#f59e0b" />
            <polygon id="minimal-arrow-right" points="100,20 40,120 100,100" fill="#facc15" />

            <circle cx="100" cy="120" r="22" fill="#0284c7" stroke="#ffffff" stroke-width="2.5" />
            <rect x="88" y="108" width="24" height="24" fill="#0f172a" rx="2" />
            <rect x="88" y="113" width="24" height="3" fill="#eab308" />
            <rect x="98" y="121" width="6" height="11" fill="#facc15" />
          </svg>
        </div>
      </div>
    `;
  } else {
    return `
      <div style="position: relative; width: 250px; height: 250px; display: flex; align-items: center; justify-content: center;">
        <svg width="250" height="250" viewBox="0 0 200 200" style="position: absolute; top: 0; left: 0;">
          <circle cx="100" cy="100" r="95" fill="#121826" stroke="rgba(255, 255, 255, 0.4)" stroke-width="2.5" />
          <circle cx="100" cy="100" r="82" fill="none" stroke="rgba(255, 255, 255, 0.2)" stroke-width="1" stroke-dasharray="2 4" />
          <text x="100" y="27" text-anchor="middle" fill="#ffffff" font-weight="900" font-size="16">N</text>
          <text x="100" y="186" text-anchor="middle" fill="rgba(255,255,255,0.75)" font-weight="700" font-size="14">S</text>
          <text x="180" y="105" text-anchor="middle" fill="rgba(255,255,255,0.75)" font-weight="700" font-size="14">E</text>
          <text x="20" y="105" text-anchor="middle" fill="rgba(255,255,255,0.75)" font-weight="700" font-size="14">W</text>
        </svg>

        <div id="qibla-rotating-element" style="transform: rotate(0deg); transition: transform 0.3s ease-out; transform-origin: 50% 50%; filter: drop-shadow(0px 6px 14px rgba(0,0,0,0.6)); width: 160px; height: 160px;">
          <svg width="160" height="160" viewBox="0 0 100 100">
            <polygon id="classic-qibla-pointer" points="50,8 62,50 50,42" fill="#ffd700" />
            <polygon points="50,8 38,50 50,42" fill="#eab308" />
            <polygon points="50,92 62,50 50,58" fill="#090d16" />
            <polygon points="50,92 38,50 50,58" fill="#1e293b" />
            <circle cx="50" cy="50" r="7" fill="#020617" stroke="#ffffff" stroke-width="2"/>
          </svg>
        </div>
      </div>
    `;
  }
}

function updateCompassAccuracyState(style, isAligned) {
  if (style === 'dial') {
    const ring = document.getElementById("compass-outer-ring");
    const pointer = document.getElementById("compass-ring-pointer");
    if (ring && pointer) {
      ring.setAttribute("stroke", isAligned ? "#22c55e" : "#38bdf8");
      pointer.setAttribute("fill", isAligned ? "#22c55e" : "#38bdf8");
    }
  } else if (style === 'arrow') {
    const arrowLeft = document.getElementById("minimal-arrow-left");
    const arrowRight = document.getElementById("minimal-arrow-right");
    const notch = document.getElementById("minimal-notch-pointer");
    if (arrowLeft && arrowRight) {
      arrowLeft.setAttribute("fill", isAligned ? "#22c55e" : "#f59e0b");
      arrowRight.setAttribute("fill", isAligned ? "#4ade80" : "#facc15");
    }
    if (notch) {
      notch.style.borderTopColor = isAligned ? "#22c55e" : "#e0f2fe";
    }
  } else if (style === 'classic') {
    const pointer = document.getElementById("classic-qibla-pointer");
    if (pointer) {
      pointer.setAttribute("fill", isAligned ? "#22c55e" : "#ffd700");
    }
  }
}

/* =========================================================
   RENDER: TRANSLATION LANDING & GRID (#/translation)
   ========================================================= */

function renderTranslationHome(mode = "surah") {
  const view = document.getElementById("view");
  const isPara = mode === "para";
  // Resume bar for THIS section only: its own saved position, independent of the normal reader
  const tProgress = store.getTranslationProgress ? store.getTranslationProgress() : null;
  const tProgressSurah = tProgress ? state.surahs.find((s) => s.number === Number(tProgress.surahNumber)) : null;
  const tResumeTitle = tProgressSurah
    ? (tProgress.mode === "para"
        ? `Parah ${tProgress.number} • ${tProgressSurah.name}, Ayah ${tProgress.ayahNumber}`
        : `${tProgressSurah.number}. ${tProgressSurah.name} • Ayah ${tProgress.ayahNumber}`)
    : "";
  const tResumePath = tProgressSurah
    ? (tProgress.mode === "para"
        ? `/translation/para/${tProgress.number}?ayah=${tProgress.ayahNumber}&surah=${tProgress.surahNumber}`
        : `/translation/surah/${tProgress.surahNumber}?ayah=${tProgress.ayahNumber}`)
    : "";

  view.innerHTML = `
    <section class="hero">
      <div class="hero__kicker">The Noble Qur'an</div>
      <h1 class="hero__title">Quran with Translation</h1>
      <p class="hero__subtitle">Read, listen, and continue your journey through the translated Qur'an.</p>
      <div class="hero__actions">
        <button class="btn btn--primary" id="btn-toggle-mode">${isPara ? "Browse Parahs (Juz)" : "Browse Surahs"}</button>
        <button class="btn btn--ghost" id="cta-bookmarks">Bookmarks</button>
      </div>
      <div class="stat-row">
        <div><strong>114</strong>Total Surahs</div>
        <div><strong>Maher Al-Muaiqly</strong>Reciter</div>
        <div><strong>6,236</strong>Total Ayahs</div>
      </div>
      ${
        tProgressSurah
          ? `<div class="continue-card">
              <div>
                <div class="continue-card__label">Continue Reading</div>
                <div class="continue-card__title">${tResumeTitle}</div>
              </div>
              <button class="btn btn--accent" id="cta-continue">Resume</button>
            </div>`
          : ""
      }
    </section>

    <section class="section">
      <div class="section__head" style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 1rem;">
        <div>
          <h2 class="section__title">${isPara ? "All Translated Parahs" : "All Translated Surahs"}</h2>
          <p class="section__sub">${isPara ? "Tap any parah to start reading translated verses." : "Tap any surah to start reading translated verses."}</p>
        </div>
        <div class="trans-toggle-wrap" style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.75rem;">
          <button class="btn btn--accent" id="btn-toggle-mode-secondary">
            ${isPara ? "Surahs" : "Parahs"}
          </button>
          <div class="search-box">
            ${ICONS.search}
            <input type="text" id="trans-search" placeholder="${isPara ? "Search by parah number..." : "Search by name or number..."}" aria-label="Search">
          </div>
        </div>
      </div>
      <div class="surah-grid" id="trans-grid"></div>
    </section>
  `;

  document.getElementById("btn-toggle-mode").addEventListener("click", () => {
  const sectionHead = document.querySelector(".section");
  if (sectionHead) {
    sectionHead.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});
  document.getElementById("cta-bookmarks").addEventListener("click", () => navigate("/bookmarks"));
  const contBtn = document.getElementById("cta-continue");
  if (contBtn && tResumePath) {
    contBtn.addEventListener("click", () => navigate(tResumePath));
  }

  renderTranslationGrid(mode, "");
  document.getElementById("trans-search").addEventListener("input", (e) => {
    renderTranslationGrid(mode, e.target.value);
  });

  const btnSec = document.getElementById("btn-toggle-mode-secondary");
if (btnSec) {
  btnSec.addEventListener("click", () => {
    renderTranslationHome(isPara ? "surah" : "para");
  });
}
}

function renderTranslationGrid(mode, query) {
  const container = document.getElementById("trans-grid");
  const q = query.trim().toLowerCase();

  if (mode === "surah") {
    const list = !q
      ? state.surahs
      : state.surahs.filter((s) => s.name.toLowerCase().includes(q) || s.englishMeaning.toLowerCase().includes(q) || String(s.number) === q);

    if (!list.length) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state__icon">☾</div><h3>No surahs found</h3><p>Try a different name or number.</p></div>`;
      return;
    }
    container.innerHTML = list
      .map((s) => {
        const transBookmarks = (typeof window !== "undefined" && window.store && window.store.getTranslationBookmarks ? window.store.getTranslationBookmarks() : null) ||
                               (typeof window !== "undefined" && window.store && window.store.getGuestTranslationBookmarks ? window.store.getGuestTranslationBookmarks() : null) ||
                               state.translationBookmarks || 
                               JSON.parse(localStorage.getItem("translationBookmarks") || "[]");

        const hasTransBookmark = Array.isArray(transBookmarks) && transBookmarks.some(
          (b) => Number(b.surahNumber || b.surah) === Number(s.number)
        );

        const bookmarkDotHtml = hasTransBookmark
          ? `<span class="trans-bookmark-dot" title="Translation bookmark saved"></span>`
          : "";

        return `
          <button class="surah-card" data-num="${s.number}">
            <span class="surah-card__num">${s.number}</span>
            <span class="surah-card__body">
              <span class="surah-card__name">${s.name}</span>
              <span class="surah-card__meta" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <span>${s.ayahCount} ayahs • ${s.revelationType}</span>
                ${bookmarkDotHtml}
              </span>
            </span>
            <span class="surah-card__arabic">${s.arabicName}</span>
          </button>
        `;
      })
      .join("");
    container.querySelectorAll(".surah-card").forEach((el) => {
      el.addEventListener("click", () => navigate(`/translation/surah/${el.dataset.num}`));
    });
  } else {
    const paraList = (state.paras && state.paras.length) ? state.paras : Array.from({ length: 30 }, (_, i) => ({ number: i + 1 }));
    const paras = paraList.filter((p) => !q || String(p.number) === q || (p.name || "").toLowerCase().includes(q));
    if (!paras.length) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state__icon">☾</div><h3>No parahs found</h3></div>`;
      return;
    }
   

      // Safely grab bookmarks without throwing reference errors
      const savedTransBookmarks = (typeof window !== "undefined" && window.store && window.store.getTranslationBookmarks ? window.store.getTranslationBookmarks() : null) || state.translationBookmarks || [];

      container.innerHTML = paras.map((p, idx) => {
        const meta = JUZ_META[p.number - 1] || JUZ_META[idx] || {};
        const title = p.name || meta.name || ("Para " + p.number);
        const arabic = p.arabicName || meta.arabic || "";
        const details = meta.ayahs || (p.start ? `Surah ${p.start.surah}:${p.start.ayah}` : `Juz ${p.number}`);

        const hasTransBookmark = Array.isArray(savedTransBookmarks) && savedTransBookmarks.some(b => {
          const sNum = Number(b.surahNumber || b.surah);
          const mId = Number(b.modeId || b.id || sNum);
          return (mId === Number(p.number) && b.mode === "para");
        });
        const bookmarkDotHtml = hasTransBookmark ? '<span class="trans-bookmark-dot" title="Translation bookmark saved"></span>' : '';

        return `
          <button class="surah-card" data-num="${p.number}">
            <span class="surah-card__num">${p.number}</span>
            <span class="surah-card__body">
              <span class="surah-card__name">${title}</span>
              <span class="surah-card__meta">${details}</span>
            </span>
            <span class="surah-card__arabic">${arabic}</span>
            ${bookmarkDotHtml}
          </button>
        `;
      }).join("");
    container.querySelectorAll(".surah-card").forEach((el) => {
        el.addEventListener("click", () => {
          const num = el.dataset.num;
          const targetRoute = mode === "para" ? `/translation/para/${num}` : `/translation/surah/${num}`;
          navigate(targetRoute);
        });
      });
  }
}

/* =========================================================
   QURAN WORD-BY-WORD MODE  —  route: #/quran/<surah>/<ayah?>
   Fully independent of Normal Quran and Quran with Translation.
   Never calls saveProgress / saveParahProgress / saveTranslationProgress /
   toggleBookmark / toggleTranslationBookmark.
   ========================================================= */

// Word-by-word source (public Quran.com API). Change here if you ever host the data yourself.
const QM_WBW_API = "https://api.quran.com/api/v4";
const QM_WBW_LANG = "ur";          // language of the per-word translation line
const QM_WBW_PER_PAGE = 50;        // API maximum per request
const QM_BOOKMARK_KEY = "quran.qm_bookmarks";
const QM_BISMILLAH = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";

// Open Quran resting on a rehal (folding book stand)
const QM_REHAL_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5.6C10.1 4.4 7.3 4.1 3.8 4.6v9.2c3.5-.5 6.3-.2 8.2 1 1.9-1.2 4.7-1.5 8.2-1v-9.2c-3.5-.5-6.3-.2-8.2 1z"/><path d="M12 5.6v9.2"/><path d="M7.2 15.6 16.8 21.2M16.8 15.6 7.2 21.2"/><path d="M6.4 21.2h3.2M14.4 21.2h3.2"/></svg>`;

const qm = {
  token: 0,                 // bumps on every real render; stale async results are dropped
  cache: new Map(),         // surah -> [{ n, words:[{ ar, tr, ur }] }]
  pending: new Map(),       // surah -> in-flight promise
  audioSurah: null,         // surah whose audio was started from this mode
  memoryBookmarks: null,    // used when cookies/local storage are not allowed
  popAnchor: null,          // scroll/width when the ayah popover opened
};

/* ---------- small helpers ---------- */
function qmEsc(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function qmArabicDigits(n) {
  return String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
}

function qmClampSurah(n) {
  n = Number(n);
  if (!Number.isInteger(n) || n < 1) return 1;
  return Math.min(n, 114);
}

/* ---------- independent bookmark storage (one ayah per surah) ---------- */
// Honours the same cookie choice as the rest of the app: no consent = kept for this session only.
function qmGetBookmarks() {
  if (state.user) {
    return Array.isArray(state.qmBookmarks) ? state.qmBookmarks : [];
  }
  try {
    if (!store.consentGiven()) return qm.memoryBookmarks || [];
    const list = store.getGuestWordByWordBookmarks ? store.getGuestWordByWordBookmarks() : [];
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return qm.memoryBookmarks || [];
  }
}

function qmSetBookmarks(list) {
  qm.memoryBookmarks = list;
  try {
    if (store.consentGiven() && store.setGuestWordByWordBookmarks) {
      store.setGuestWordByWordBookmarks(list);
    }
  } catch (e) { /* storage unavailable: session-only */ }
}

function qmGetSurahBookmark(surahNumber) {
  return qmGetBookmarks().find((b) => Number(b.surahNumber) === Number(surahNumber)) || null;
}

function qmIsBookmarked(surahNumber, ayahNumber) {
  const b = qmGetSurahBookmark(surahNumber);
  return !!b && Number(b.ayahNumber) === Number(ayahNumber);
}

function qmBookmarkTitle(b) {
  const meta = state.surahs.find((s) => s.number === Number(b.surahNumber));
  return `Quran • ${meta ? meta.name : b.surahName || "Surah " + b.surahNumber} — Ayah ${b.ayahNumber}`;
}

// Single-bookmark-per-surah rule: saving another ayah of the same surah replaces the old one.
async function qmToggleBookmark(surahNumber, ayahNumber) {
  surahNumber = Number(surahNumber);
  ayahNumber = Number(ayahNumber);
  const meta = state.surahs.find((s) => s.number === surahNumber);
  const surahName = meta ? meta.name : `Surah ${surahNumber}`;
  const current = qmGetSurahBookmark(surahNumber);
  const isRemoving = !!(current && Number(current.ayahNumber) === ayahNumber);

  if (state.user) {
    try {
      if (isRemoving) {
        if (current && current.id) {
          await api.removeBookmark(current.id, { extra: true });
        }
        toast(`Bookmark removed — ${surahName}, Ayah ${ayahNumber}`, "info");
      } else {
        await api.addExtraBookmark({
          bookmarkType: "word_by_word",
          surahNumber,
          surahName,
          ayahNumber,
        });
        toast(
          current
            ? `Bookmark moved from Ayah ${current.ayahNumber} to Ayah ${ayahNumber} — ${surahName}`
            : `Bookmarked ${surahName} — Ayah ${ayahNumber}`,
          "success"
        );
      }
      await refreshBookmarksAndProgress();
      qmRefreshMarkers(surahNumber);
      return;
    } catch (e) {
      toast("Couldn't update word-by-word bookmark.", "error");
      return;
    }
  }

  let list = qmGetBookmarks().filter((b) => Number(b.surahNumber) !== surahNumber);

  if (isRemoving) {
    toast(`Bookmark removed — ${surahName}, Ayah ${ayahNumber}`, "info");
  } else {
    list.push({ surahNumber, surahName, ayahNumber, createdAt: new Date().toISOString() });
    toast(
      current
        ? `Bookmark moved from Ayah ${current.ayahNumber} to Ayah ${ayahNumber} — ${surahName}`
        : `Bookmarked ${surahName} — Ayah ${ayahNumber}`,
      "success"
    );
  }
  qmSetBookmarks(list);
  qmRefreshMarkers(surahNumber);
}

async function qmRemoveBookmark(surahNumber) {
  surahNumber = Number(surahNumber);
  if (state.user) {
    const existing = (state.qmBookmarks || []).find((b) => Number(b.surahNumber) === surahNumber);
    if (existing && existing.id) {
      try {
        await api.removeBookmark(existing.id, { extra: true });
        await refreshBookmarksAndProgress();
        return;
      } catch (e) {
        toast("Couldn't remove bookmark.", "error");
        return;
      }
    }
  }
  qmSetBookmarks(qmGetBookmarks().filter((b) => Number(b.surahNumber) !== surahNumber));
}

function qmRefreshMarkers(surahNumber) {
  const bm = qmGetSurahBookmark(surahNumber);
  document.querySelectorAll("#qm-words .qm-marker").forEach((el) => {
    const on = !!bm && Number(el.dataset.ayah) === Number(bm.ayahNumber);
    el.classList.toggle("is-bookmarked", on);
    el.setAttribute("aria-label", `Ayah ${el.dataset.ayah}${on ? " (bookmarked)" : ""} — bookmark options`);
  });
}

/* ---------- word-by-word data ---------- */
async function qmFetchJson(url) {
  let cache = null;
  try { if ("caches" in window) cache = await caches.open("quran-wbw-v1"); } catch (e) { cache = null; }
  if (cache) {
    try {
      const hit = await cache.match(url);
      if (hit) return await hit.json();
    } catch (e) { /* fall through to network */ }
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (cache) { try { await cache.put(url, res.clone()); } catch (e) { /* ignore */ } }
  return res.json();
}

function qmLoadSurah(number) {
  if (qm.cache.has(number)) return Promise.resolve(qm.cache.get(number));
  if (qm.pending.has(number)) return qm.pending.get(number);

  const meta = state.surahs.find((s) => s.number === number);
  const pages = Math.max(1, Math.ceil((meta ? meta.ayahCount : 286) / QM_WBW_PER_PAGE));
  const urls = Array.from({ length: pages }, (_, i) =>
    `${QM_WBW_API}/verses/by_chapter/${number}?language=${QM_WBW_LANG}&words=true&word_fields=text_uthmani,transliteration&per_page=${QM_WBW_PER_PAGE}&page=${i + 1}`
  );

  const p = Promise.all(urls.map(qmFetchJson))
    .then((results) => {
      const verses = [];
      results.forEach((r) =>
        (r.verses || []).forEach((v) => {
          const n = Number(v.verse_number) || Number(String(v.verse_key || "").split(":")[1]);
          const words = (v.words || [])
            .filter((w) => !w.char_type_name || w.char_type_name === "word")
            .map((w) => ({
              ar: w.text_uthmani || w.text || "",
              tr: (w.transliteration && w.transliteration.text) || "",
              ur: (w.translation && w.translation.text) || "",
            }))
            .filter((w) => w.ar);
          if (n && words.length) verses.push({ n, words });
        })
      );
      verses.sort((a, b) => a.n - b.n);
      if (!verses.length) throw new Error("No word data returned");
      qm.cache.set(number, verses);
      return verses;
    })
    .finally(() => qm.pending.delete(number));

  qm.pending.set(number, p);
  return p;
}

// Offline / API-failure fallback: Arabic words from the bundled quran.json (no transliteration or Urdu)
function qmLocalVerses(number) {
  return (state.quran[String(number)] || []).map((a) => ({
    n: a.number,
    words: String(a.text).split(/\s+/).filter(Boolean).map((ar) => ({ ar, tr: "", ur: "" })),
  }));
}

function qmWordsHtml(number, verses) {
  const bm = qmGetSurahBookmark(number);
  return verses
    .map((v) => {
      const words = v.words
        .map(
          (w) => `<span class="qm-word" data-ayah="${v.n}"><span class="qm-word__ar" lang="ar">${qmEsc(w.ar)}</span>${
            w.tr ? `<span class="qm-word__tr" dir="ltr">${qmEsc(w.tr)}</span>` : ""
          }${w.ur ? `<span class="qm-word__ur" lang="ur" dir="rtl">${qmEsc(w.ur)}</span>` : ""}</span>`
        )
        .join("");
      const marked = !!bm && Number(bm.ayahNumber) === v.n;
      return `${words}<button type="button" class="qm-marker${marked ? " is-bookmarked" : ""}" id="qm-ayah-${v.n}" data-surah="${number}" data-ayah="${v.n}" aria-haspopup="menu" aria-label="Ayah ${v.n}${marked ? " (bookmarked)" : ""} — bookmark options"><span class="qm-marker__num">${qmArabicDigits(v.n)}</span></button>`;
    })
    .join("");
}

/* ---------- reader ---------- */
function renderQuranMode(number, jumpToAyah) {
  number = qmClampSurah(number);
  const view = document.getElementById("view");

  // Same surah already on screen (e.g. player.load() calls renderView): keep it, don't flash/re-fetch.
  const existing = document.getElementById("qm-reader");
  if (existing && Number(existing.dataset.surah) === number) {
    qmPatchBrand();
    return;
  }

  const meta = state.surahs.find((s) => s.number === number);
  if (!meta) {
    view.innerHTML = `<div class="empty-state"><h3>Surah not found</h3></div>`;
    return;
  }

  const token = ++qm.token;
  const textSize = store.getTextSize();
  const prev = state.surahs.find((s) => s.number === number - 1);
  const next = state.surahs.find((s) => s.number === number + 1);
  const showBismillah = number !== 1 && number !== 9;

  try { loadGoogleFont("Noto+Nastaliq+Urdu"); } catch (e) { /* Urdu falls back to a system font */ }

  view.innerHTML = `
    <div class="reader qm-reader text-size-${textSize}" id="qm-reader" data-surah="${number}">
      <div class="reader-topbar">
        <button class="btn btn--ghost btn--sm" id="qm-back">← Home</button>
        <div class="reader-topbar__actions">
          <button type="button" class="icon-btn" id="reader-reciter-btn" aria-label="Choose reciter" title="Choose reciter">${HEADPHONES_ICON}</button>
          <button class="btn btn--accent btn--sm" id="play-surah">${ICONS.play} Listen</button>
        </div>
      </div>
      <div class="reader-header">
        <div class="reader-header__eyebrow">Surah ${meta.number} of 114</div>
        <div class="reader-header__arabic">${meta.arabicName}</div>
        <div class="reader-header__name">${meta.name} · ${meta.englishMeaning}</div>
        <div class="reader-header__meta">${meta.ayahCount} ayahs · ${meta.revelationType}</div>
      </div>
      ${showBismillah ? `<p class="bismillah qm-bismillah">${QM_BISMILLAH}</p>` : ""}
      <div class="qm-notice" id="qm-notice" hidden></div>
      <div class="qm-words" id="qm-words" dir="rtl"><div class="qm-loading" dir="ltr">Loading word-by-word…</div></div>
      <div class="reader-footer-nav" id="qm-footer-nav" hidden>
        ${prev ? `<a class="nav-link-card" href="#/quran/${prev.number}"><span class="nav-link-card__label">Previous</span><span class="nav-link-card__name">${prev.number}. ${prev.name}</span></a>` : `<span></span>`}
        ${next ? `<a class="nav-link-card nav-link-card--next" href="#/quran/${next.number}"><span class="nav-link-card__label">Next</span><span class="nav-link-card__name">${next.number}. ${next.name}</span></a>` : `<span></span>`}
      </div>
    </div>
  `;

  qmPatchBrand();
  document.getElementById("qm-back").addEventListener("click", () => navigate("/"));
  document.getElementById("play-surah").addEventListener("click", () => qmPlay(number));
  wireReaderReciterButton(); // same reciter modal + same saved reciter as Normal Quran

  qmFillWords(number, jumpToAyah, token);
}

async function qmFillWords(number, jumpToAyah, token) {
  let verses;
  let fallback = false;
  try {
    verses = await qmLoadSurah(number);
  } catch (e) {
    verses = qmLocalVerses(number);
    fallback = true;
  }

  const reader = document.getElementById("qm-reader");
  const host = document.getElementById("qm-words");
  if (token !== qm.token || !reader || !host || Number(reader.dataset.surah) !== number) return; // user already moved on

  host.innerHTML = qmWordsHtml(number, verses);
 const footerNav = document.getElementById("qm-footer-nav");
  if (footerNav) footerNav.hidden = false;

  const notice = document.getElementById("qm-notice");
  if (notice) {
    if (fallback) {
      notice.hidden = false;
      notice.innerHTML = `<span>Word-by-word data couldn't be loaded. Showing the Arabic text only.</span> <button type="button" class="btn btn--ghost btn--sm" id="qm-retry">Retry</button>`;
      document.getElementById("qm-retry").addEventListener("click", () => {
        notice.hidden = true;
        host.innerHTML = `<div class="qm-loading" dir="ltr">Loading word-by-word…</div>`;
        qmFillWords(number, null, ++qm.token);
      });
    } else {
      notice.hidden = true;
      notice.innerHTML = "";
    }
  }

  if (jumpToAyah) qmJumpToAyah(Number(jumpToAyah));
}

function qmJumpToAyah(ayah) {
  const words = Array.from(document.querySelectorAll(`#qm-words .qm-word[data-ayah="${ayah}"]`));
  const marker = document.getElementById(`qm-ayah-${ayah}`);
  if (!marker) return;
  const targets = [...words, marker];
  targets.forEach((el) => el.classList.add("is-target"));
  setTimeout(() => (words[0] || marker).scrollIntoView({ behavior: "smooth", block: "center" }), 80);
  setTimeout(() => targets.forEach((el) => el.classList.remove("is-target")), 3200);
}

/* ---------- audio (same player, same reciter modal as Normal Quran) ---------- */
function qmPlay(number) {
  const bar = document.getElementById("player-bar");
  if (bar) {
    bar.hidden = false;
    bar.style.display = "";
    bar.classList.remove("is-hidden", "hidden");
    bar.classList.add("is-visible");
  }
  renderPlayerBar();
  qm.audioSurah = number;
  player.load(number, { autoplay: true });
  if (bar) bar.classList.add("is-visible");
}

function qmStopAudio() {
  if (player && player.audio) {
    player.audio.pause();
    player.audio.currentTime = 0;
    player.audio.removeAttribute("src");
    player.currentSurah = null;
    player.loadedReciter = null;
    player._chain = null;
    player._emit();
  }
  const bar = document.getElementById("player-bar");
  if (bar) bar.classList.remove("is-visible");
  qm.audioSurah = null;
}

/* ---------- ☾ Quran ▾  surah dropdown (this mode only) ---------- */
function qmPatchBrand() {
  const header = document.querySelector(".site-header");
  const brand = header && header.querySelector(".brand");
  if (!header || !brand || brand.classList.contains("qm-brand")) return;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.id = "qm-brand-btn";
  btn.className = "brand qm-brand";
  btn.setAttribute("aria-haspopup", "listbox");
  btn.setAttribute("aria-expanded", "false");
  btn.setAttribute("aria-controls", "qm-surah-menu");
  btn.innerHTML = `<span class="brand__mark">☾</span> Quran <span class="qm-brand__caret" aria-hidden="true">▾</span>`;
  brand.replaceWith(btn);

  const menu = document.createElement("div");
  menu.id = "qm-surah-menu";
  menu.className = "qm-surah-menu";
  menu.setAttribute("role", "listbox");
  menu.setAttribute("aria-label", "Choose a surah");
  menu.hidden = true;
  menu.innerHTML = state.surahs
    .map((s) => `<button type="button" class="qm-surah-menu__item" role="option" data-surah="${s.number}"><span class="qm-surah-menu__num">${s.number}</span><span class="qm-surah-menu__name">${qmEsc(s.name)}</span><span class="qm-surah-menu__tick" aria-hidden="true">${TICK_ICON}</span></button>`)
    .join("");
  header.appendChild(menu);

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    qmToggleSurahMenu();
  });
  menu.addEventListener("click", (e) => {
    const item = e.target.closest(".qm-surah-menu__item");
    if (!item) return;
    const n = Number(item.dataset.surah);
    qmCloseSurahMenu();
    const reader = document.getElementById("qm-reader");
    if (reader && Number(reader.dataset.surah) === n) return; // already here
    navigate(`/quran/${n}`);
  });
  qmPatchJump(); // Ayah-jump pill (Quran mode only)
}

/* ---------- Ayah-jump pill for #/quran only (own ids; the Normal/Translation pill is untouched) ---------- */
function qmPatchJump() {
  const actions = document.querySelector(".site-header .header-actions");
  if (!actions || document.getElementById("qm-jump")) return;

  const box = document.createElement("div");
  box.id = "qm-jump";
  box.className = "ayah-jump qm-jump";
  box.title = "Jump to ayah";
  box.innerHTML = `
    <span class="ayah-jump__icon">${ICONS.search}</span>
    <input type="number" id="qm-jump-input" class="ayah-jump__input" inputmode="numeric" min="1" step="1" placeholder="آیت نمبر" aria-label="Jump to ayah number" autocomplete="off">
    <button type="button" id="qm-jump-go" class="qm-jump__go">GO</button>`;
  actions.prepend(box);

  const input = box.querySelector("#qm-jump-input");
  const qmTotal = () => {
    const reader = document.getElementById("qm-reader");
    const meta = reader && state.surahs.find((s) => s.number === Number(reader.dataset.surah));
    return meta ? meta.ayahCount : 0;
  };

  input.addEventListener("focus", () => {
    const total = qmTotal();
    if (total) { input.max = total; input.placeholder = `1–${total}`; }
  });
  input.addEventListener("blur", () => { input.placeholder = "آیت نمبر"; });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); qmRunJump(); }
  });
  box.querySelector("#qm-jump-go").addEventListener("click", qmRunJump);
  // Tapping the search icon (collapsed pill on phones) opens + focuses the input
  box.querySelector(".ayah-jump__icon").addEventListener("click", () => input.focus());
}

function qmRunJump() {
  const input = document.getElementById("qm-jump-input");
  const reader = document.getElementById("qm-reader");
  if (!input || !reader) return;

  const meta = state.surahs.find((s) => s.number === Number(reader.dataset.surah));
  const total = meta ? meta.ayahCount : 0;
  const text = input.value.trim();
  const n = /^\d+$/.test(text) ? parseInt(text, 10) : NaN;

  if (!Number.isInteger(n) || n < 1 || n > total) {
    toast(`Enter an ayah number between 1 and ${total}.`, "error");
    return;
  }
  if (!document.getElementById(`qm-ayah-${n}`)) {
    toast("The surah is still loading — try again in a moment.", "error");
    return;
  }

  input.value = "";
  input.blur();
  qmClosePopover();
  qmCloseSurahMenu();
  qmJumpToAyah(n);
}

function qmToggleSurahMenu() {
  const menu = document.getElementById("qm-surah-menu");
  const btn = document.getElementById("qm-brand-btn");
  if (!menu || !btn) return;
  if (!menu.hidden) { qmCloseSurahMenu(); return; }
  qmClosePopover();
  menu.hidden = false;
  btn.setAttribute("aria-expanded", "true");
  const reader = document.getElementById("qm-reader");
  const current = reader ? Number(reader.dataset.surah) : 0;
  menu.querySelectorAll(".qm-surah-menu__item").forEach((el) => {
    const on = Number(el.dataset.surah) === current;
    el.classList.toggle("is-current", on);
    el.setAttribute("aria-selected", String(on));
    if (on) menu.scrollTop = Math.max(0, el.offsetTop - menu.clientHeight / 2 + el.offsetHeight / 2);
  });
}

function qmCloseSurahMenu() {
  const menu = document.getElementById("qm-surah-menu");
  const btn = document.getElementById("qm-brand-btn");
  if (menu) menu.hidden = true;
  if (btn) btn.setAttribute("aria-expanded", "false");
}

/* ---------- tap an ayah number → glass popover with Bookmark ---------- */
function qmClosePopover() {
  const pop = document.getElementById("qm-popover");
  if (pop) pop.remove();
  document.querySelectorAll(".qm-marker.is-open").forEach((el) => el.classList.remove("is-open"));
}

function qmOpenPopover(marker) {
  qmClosePopover();
  qmCloseSurahMenu();
  const surah = Number(marker.dataset.surah);
  const ayah = Number(marker.dataset.ayah);
  const marked = qmIsBookmarked(surah, ayah);

  const pop = document.createElement("div");
  pop.id = "qm-popover";
  pop.className = "qm-popover";
  pop.setAttribute("role", "menu");
  pop.innerHTML = `
    <div class="qm-popover__title">Ayah ${ayah}</div>
    <button type="button" class="qm-popover__btn" role="menuitem" data-qm-action="bookmark">
      ${marked ? ICONS.bookmarkFilled : ICONS.bookmark}<span>${marked ? "Remove bookmark" : "Bookmark"}</span>
    </button>`;
  // Inside #app so the light/dark theme variables apply
  document.getElementById("app").appendChild(pop);
  marker.classList.add("is-open");

  const r = marker.getBoundingClientRect();
  const w = pop.offsetWidth;
  const h = pop.offsetHeight;
  const left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), window.innerWidth - w - 8);
  const below = r.bottom + 8;
  const top = below + h > window.innerHeight - 8 ? Math.max(8, r.top - h - 8) : below;
  pop.style.left = `${left}px`;
  pop.style.top = `${top}px`;
  qm.popAnchor = { y: window.scrollY, w: window.innerWidth };

  pop.querySelector("[data-qm-action='bookmark']").addEventListener("click", async () => {
    await qmToggleBookmark(surah, ayah);
    qmClosePopover();
  });
}

/* ---------- one-time global wiring ---------- */
function qmWireGlobals() {
  if (window.__qmWired) return;
  window.__qmWired = true;

  // Tap on an ayah number marker
  document.addEventListener("click", (e) => {
    const marker = e.target.closest("#qm-words .qm-marker");
    if (marker) {
      e.stopPropagation();
      if (marker.classList.contains("is-open")) qmClosePopover();
      else qmOpenPopover(marker);
      return;
    }
    // Tap anywhere else closes the popover / dropdown
    if (!e.target.closest("#qm-popover")) qmClosePopover();
    if (!e.target.closest("#qm-surah-menu") && !e.target.closest("#qm-brand-btn")) qmCloseSurahMenu();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { qmClosePopover(); qmCloseSurahMenu(); }
  });

  // The popover is fixed-position, so close it once the page has moved away from the tapped marker
  window.addEventListener("scroll", () => {
    if (qm.popAnchor && Math.abs(window.scrollY - qm.popAnchor.y) > 24) qmClosePopover();
  }, { passive: true });
  window.addEventListener("resize", () => {
    if (qm.popAnchor && window.innerWidth !== qm.popAnchor.w) qmClosePopover();
  });

  // Leaving (or switching surah in) this mode stops audio that was started from it
  window.addEventListener("hashchange", () => {
    qmClosePopover();
    const r = parseHash();
    if (qm.audioSurah !== null && !(r.name === "quran" && qmClampSurah(r.number) === qm.audioSurah)) qmStopAudio();
  });
}
qmWireGlobals();


/* =====================================================
   BOOT
   ===================================================== */

async function boot() {
  try {
    await loadData();
  } catch (e) {
    const viewEl = document.getElementById("view");
    if (viewEl) {
      viewEl.innerHTML = `<div class="empty-state"><h3>Couldn't load the Qur'an data</h3><p>Please refresh</p></div>`;
    }
    return;
  }

  player = new Player({
    surahs: state.surahs,
    audioMap: state.audio,
    reciter: getNormalReciter(),
    onSurahChange: () => renderView(),
  });

  state.route = parseHash();
  render();
  wireCookieBanner();

  await loadUserState();
  renderView(); // re-render with real bookmarks/progress/user once known
}

boot();
