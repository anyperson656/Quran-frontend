import { store } from "./storage.js";
import { api } from "./api.js";
import { Player } from "./player.js";

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
    } catch (e) {
      state.bookmarks = [];
    }
    try {
      const p = await api.getProgress();
      state.progress = p.progress || null;
    } catch (e) {
      state.progress = null;
    }
  } else {
    state.bookmarks = store.getGuestBookmarks();
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
  render();
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
  if (name === "surah" && param) return { name: "surah", number: parseInt(param, 10), ayah: sub ? parseInt(sub, 10) : null };
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
   RENDER: SHELL (header + view mount)
   ===================================================== */
function renderShell() {
  const theme = store.getTheme();
  document.getElementById("app").setAttribute("data-theme", theme);

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
        <button class="icon-btn" id="theme-toggle" aria-label="Toggle dark mode">${theme === "dark" ? ICONS.sun : ICONS.moon}</button>
        <button class="icon-btn" id="account-btn" aria-label="Account">${ICONS.user}</button>
        <button class="icon-btn nav-toggle" id="nav-toggle" aria-label="Menu">${ICONS.menu}</button>
      </div>
    </header>
    <main class="view" id="view"></main>
    <footer class="site-footer">Recitation by Maher Al-Muaiqly · Text: Uthmani script (Hafs)</footer>
    <div class="player glass" id="player-bar"></div>
  `;

  document.getElementById("theme-toggle").addEventListener("click", () => {
    const next = store.getTheme() === "dark" ? "light" : "dark";
    store.setTheme(next);
    renderShell();
    renderView();
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
      <div class="player__reciter">Maher Al-Muaiqly</div>
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

/* =====================================================
   RENDER: HOME
   ===================================================== */
function renderHome() {
  const totalSurahs = state.surahs.length;
  const progress = state.progress;
  const progressSurah = progress ? state.surahs.find((s) => s.number === progress.surahNumber) : null;

  const view = document.getElementById("view");
  view.innerHTML = `
    <section class="hero">
      <div class="hero__kicker">The Noble Qur'an</div>
      <h1 class="hero__title">Quran</h1>
      <p class="hero__subtitle">Read, listen, and continue your journey through the Qur'an.</p>
      <div class="hero__actions">
        <button class="btn btn--primary" id="cta-browse">Browse Surahs</button>
        <button class="btn btn--ghost" id="cta-bookmarks">Bookmarks</button>
      </div>
      <div class="stat-row">
        <div><strong>${totalSurahs}</strong>Total Surahs</div>
        <div><strong>Maher Al-Muaiqly</strong>Reciter</div>
        <div><strong>6,236</strong>Total Ayahs</div>
      </div>
      ${
        progressSurah
          ? `<div class="continue-card">
              <div>
                <div class="continue-card__label">Continue Reading</div>
                <div class="continue-card__title">${progressSurah.number}. ${progressSurah.name} — Ayah ${progress.ayahNumber}</div>
              </div>
              <button class="btn btn--accent" id="cta-continue">Resume</button>
            </div>`
          : ""
      }
    </section>

    <section class="section">
      <div class="section__head">
        <div>
          <h2 class="section__title">All Surahs</h2>
          <p class="section__sub">Tap any surah to start reading and listening.</p>
        </div>
        <div class="search-box">
          ${ICONS.search}
          <input type="text" id="surah-search" placeholder="Search by name or number…" aria-label="Search surahs">
        </div>
      </div>
      <div class="surah-grid" id="surah-grid"></div>
    </section>
  `;

  document.getElementById("cta-browse").addEventListener("click", () => {
    document.getElementById("surah-search").scrollIntoView({ behavior: "smooth", block: "center" });
  });
  document.getElementById("cta-bookmarks").addEventListener("click", () => navigate("/bookmarks"));
  const contBtn = document.getElementById("cta-continue");
  if (contBtn) contBtn.addEventListener("click", () => navigate(`/surah/${progress.surahNumber}/${progress.ayahNumber}`));

  renderSurahGrid(state.surahs);
  document.getElementById("surah-search").addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    const filtered = !q
      ? state.surahs
      : state.surahs.filter((s) => s.name.toLowerCase().includes(q) || s.englishMeaning.toLowerCase().includes(q) || String(s.number) === q);
    renderSurahGrid(filtered);
  });
}

function renderSurahGrid(list) {
  const grid = document.getElementById("surah-grid");
  if (!list.length) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-state__icon">☾</div><h3>No surahs found</h3><p>Try a different name or number.</p></div>`;
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
          <span class="surah-card__meta">${s.ayahCount} ayahs · ${s.revelationType}</span>
        </span>
        ${hasBookmark ? `<span class="surah-card__bookmark-dot" title="Has a bookmark"></span>` : ""}
        <span class="surah-card__arabic">${s.arabicName}</span>
      </button>`;
    })
    .join("");
  grid.querySelectorAll(".surah-card").forEach((el) => {
    el.addEventListener("click", () => navigate(`/surah/${el.dataset.num}`));
  });
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
        <button class="btn btn--accent btn--sm" id="play-surah">${ICONS.play} Listen</button>
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
  document.getElementById("play-surah").addEventListener("click", () => player.load(number, { autoplay: true }));

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
            <button class="ayah-action ${bookmarked ? "is-active" : ""}" data-action="bookmark" data-ayah="${a.number}"
              aria-label="${bookmarked ? "Remove bookmark" : "Bookmark this ayah"}" aria-pressed="${bookmarked}">
              ${bookmarked ? ICONS.bookmarkFilled : ICONS.bookmark}
            </button>
          </div>
        </div>
      </div>`;
    })
    .join("");

  list.querySelectorAll('[data-action="bookmark"]').forEach((btn) => {
    btn.addEventListener("click", () => toggleBookmark(number, meta.name, Number(btn.dataset.ayah)));
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
  }
}

/* =====================================================
   RENDER: BOOKMARKS
   ===================================================== */
function renderBookmarks() {
  const view = document.getElementById("view");
  const sorted = [...state.bookmarks].sort((a, b) => a.surahNumber - b.surahNumber || a.ayahNumber - b.ayahNumber);
  view.innerHTML = `
    <section class="section">
      <div class="section__head">
        <div>
          <h2 class="section__title">Bookmarks</h2>
          <p class="section__sub">${sorted.length ? `${sorted.length} saved ayah${sorted.length > 1 ? "s" : ""}` : "Ayahs you save while reading show up here."}</p>
        </div>
      </div>
      ${sorted.length ? `<div class="bookmark-list" id="bookmark-list"></div>` : `<div class="empty-state"><div class="empty-state__icon">☾</div><h3>No bookmarks yet</h3><p>Open any surah and tap the bookmark icon next to an ayah.</p></div>`}
    </section>
  `;
  if (!sorted.length) return;
  const list = document.getElementById("bookmark-list");
  list.innerHTML = sorted
    .map(
      (b) => `
    <div class="bookmark-row">
      <span class="bookmark-row__num">${b.surahNumber}</span>
      <div class="bookmark-row__body">
        <div class="bookmark-row__title">${b.surahName} — Ayah ${b.ayahNumber}</div>
        <div class="bookmark-row__date">Saved ${new Date(b.createdAt).toLocaleDateString()}</div>
      </div>
      <div class="bookmark-row__actions">
        <button class="btn btn--ghost btn--sm" data-open="${b.surahNumber}:${b.ayahNumber}">Open</button>
        <button class="ayah-action" data-remove="${b.surahNumber}:${b.ayahNumber}" aria-label="Remove bookmark">${ICONS.trash}</button>
      </div>
    </div>`
    )
    .join("");
  list.querySelectorAll("[data-open]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const [s, a] = btn.dataset.open.split(":");
      navigate(`/surah/${s}/${a}`);
    });
  });
  list.querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const [s, a] = btn.dataset.remove.split(":").map(Number);
      const b = state.bookmarks.find((x) => x.surahNumber === s && x.ayahNumber === a);
      const meta = state.surahs.find((x) => x.number === s);
      toggleBookmark(s, meta ? meta.name : b.surahName, a);
    });
  });
}

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
  const guestProgress = store.getGuestProgress();
  if (guestProgress) {
    try {
      await api.setProgress(guestProgress.surahNumber, guestProgress.ayahNumber);
    } catch (e) {
      /* ignore */
    }
  }
  store.setGuestBookmarks([]);
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

async function renderDirection() {
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
      method = 1; // Karachi / South Asia
      school = 1; // Hanafi
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

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      const { method, school } = getAutoParams(lat, lon);

      const now = new Date();
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

        let isJamaatMode = false;

        function renderContent() {
          const offsets = isJamaatMode ? { Fajr: 40, Dhuhr: 30, Asr: 30, Maghrib: 5, Isha: 30 } : { Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 };

          view.innerHTML = `
            <div class="settings-grid" style="padding-top: 20px;">
              
              <!-- Today's Prayer Timings Card -->
              <div class="settings-card">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                  <h3 style="margin:0;">Today's Prayer Timings</h3>
                  <button id="toggle-jamaat-btn" style="background: var(--bg-surface); border: 1px solid var(--border); padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; cursor: pointer; color: var(--fg);">
                    ${isJamaatMode ? "Mosque Jama'at" : "Adhan Start"} Mode
                  </button>
                </div>
                <p id="next-prayer-countdown" style="font-size: 0.85rem; color: var(--accent); font-weight: 600; margin-bottom: 20px;">Calculating next prayer...</p>

                <div class="settings-row"><span class="settings-row__label">Fajr</span><span class="settings-row__desc">${format12Hour(timings.Fajr, offsets.Fajr)}</span></div>
                <div class="settings-row"><span class="settings-row__label">Dhuhr</span><span class="settings-row__desc">${format12Hour(timings.Dhuhr, offsets.Dhuhr)}</span></div>
                <div class="settings-row"><span class="settings-row__label">Asr</span><span class="settings-row__desc">${format12Hour(timings.Asr, offsets.Asr)}</span></div>
                <div class="settings-row"><span class="settings-row__label">Maghrib</span><span class="settings-row__desc">${format12Hour(timings.Maghrib, offsets.Maghrib)}</span></div>
                <div class="settings-row"><span class="settings-row__label">Isha</span><span class="settings-row__desc">${format12Hour(timings.Isha, offsets.Isha)}</span></div>
              </div>

              <!-- Compass & Kaaba Card -->
              <div class="settings-card" style="text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: space-between; min-height: 520px; padding: 30px 20px;">
                <div>
                  <h3 style="margin-bottom:2px;">Qibla Direction</h3>
                  <p style="margin-bottom: 10px; font-size:0.9rem; color: var(--fg-muted);">${qiblaAngle.toFixed(1)}° from True North</p>
                </div>
                
                <!-- Compass Container -->
                <div style="position: relative; width: 250px; height: 250px; display: flex; align-items: center; justify-content: center; margin: 10px 0;">
                  
                  <svg width="250" height="250" viewBox="0 0 200 200" style="position: absolute; top: 0; left: 0;">
                    <!-- Black Outer Compass Dial as requested -->
                    <circle cx="100" cy="100" r="95" fill="#121826" stroke="rgba(255, 255, 255, 0.4)" stroke-width="2.5" />
                    <circle cx="100" cy="100" r="82" fill="none" stroke="rgba(255, 255, 255, 0.2)" stroke-width="1" stroke-dasharray="2 4" />
                    
                    <text x="100" y="27" text-anchor="middle" fill="#ffffff" font-weight="900" font-size="16">N</text>
                    <text x="100" y="186" text-anchor="middle" fill="rgba(255,255,255,0.75)" font-weight="700" font-size="14">S</text>
                    <text x="180" y="105" text-anchor="middle" fill="rgba(255,255,255,0.75)" font-weight="700" font-size="14">E</text>
                    <text x="20" y="105" text-anchor="middle" fill="rgba(255,255,255,0.75)" font-weight="700" font-size="14">W</text>
                  </svg>

                  <div style="position: absolute; width: 100%; height: 100%; transform: rotate(${qiblaAngle}deg); transform-origin: 50% 50%; pointer-events: none;">
                    <div style="position: absolute; top: -1px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 9px solid transparent; border-right: 9px solid transparent; border-top: 16px solid #ffd700; filter: drop-shadow(0px 2px 6px rgba(255,215,0,0.8));"></div>
                  </div>

                  <div id="qibla-arrow" style="transform: rotate(${qiblaAngle}deg); transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); transform-origin: 50% 50%; filter: drop-shadow(0px 6px 14px rgba(0,0,0,0.6)); width: 160px; height: 160px;">
                    <svg width="160" height="160" viewBox="0 0 100 100">
                      <polygon points="50,8 62,50 50,42" fill="#ffffff" />
                      <polygon points="50,8 38,50 50,42" fill="#cbd5e1" />
                      <polygon points="50,92 62,50 50,58" fill="#090d16" />
                      <polygon points="50,92 38,50 50,58" fill="#1e293b" />
                      <circle cx="50" cy="50" r="7" fill="#020617" stroke="#ffffff" stroke-width="2"/>
                    </svg>
                  </div>
                </div>

                <!-- Realistic 3D Kaaba Illustration -->
                <div style="position: relative; width: 220px; height: 220px; margin-top: 10px;">
                  <div style="position: absolute; bottom: 8px; left: 8%; width: 84%; height: 35px; background: radial-gradient(ellipse at center, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 75%); border-radius: 50%;"></div>
                  
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
            renderContent(); // Re-render text values safely without spawning duplicate timers
          });
        }

        renderContent();

        // Clear any existing active interval before starting a fresh one to prevent blinking/glitching
        if (activeCountdownInterval) clearInterval(activeCountdownInterval);

        activeCountdownInterval = setInterval(() => {
          const now = new Date();
          const offsets = isJamaatMode ? { Fajr: 40, Dhuhr: 30, Asr: 30, Maghrib: 5, Isha: 30 } : { Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 };
          const prayerList = [
            { name: "Fajr", time: timings.Fajr, off: offsets.Fajr },
            { name: "Dhuhr", time: timings.Dhuhr, off: offsets.Dhuhr },
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

        // Mobile gyroscope orientation listener
        if (window.DeviceOrientationEvent) {
          window.addEventListener("deviceorientation", (event) => {
            let heading = event.alpha;
            if (event.webkitCompassHeading) heading = event.webkitCompassHeading;
            if (heading !== null && heading !== undefined) {
              const arrow = document.getElementById("qibla-arrow");
              if (arrow) {
                const adjustedAngle = qiblaAngle - heading;
                arrow.style.transform = `rotate(${adjustedAngle}deg)`;
              }
            }
          });
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
/* =====================================================
   BOOT
   ===================================================== */

async function boot() {
  try {
    await loadData();
  } catch (e) {
    document.getElementById("view").innerHTML = `<div class="empty-state"><h3>Couldn't load the Qur'an data</h3><p>Please refresh the page. If this keeps happening, make sure the site is served over http:// (not opened directly as a file).</p></div>`;
    return;
  }

  player = new Player({
    surahs: state.surahs,
    audioMap: state.audio,
    onSurahChange: () => renderView(),
  });

  state.route = parseHash();
  render();
  wireCookieBanner();

  await loadUserState();
  renderView(); // re-render with real bookmarks/progress/user once known
}

boot();
