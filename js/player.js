import { store } from "./storage.js";

const RECITER_NAME = "Maher Al-Muaiqly";

function fmtTime(sec) {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export class Player {
  constructor({ surahs, audioMap, onSurahChange }) {
    this.surahs = surahs;
    this.audioMap = audioMap;
    this.onSurahChange = onSurahChange;
    this.audio = new Audio();
    this.audio.preload = "none";
    this.audio.volume = store.getVolume();
    this.currentSurah = null;
    this.listeners = new Set();

    this.audio.addEventListener("timeupdate", () => this._emit());
    this.audio.addEventListener("loadedmetadata", () => this._emit());
    this.audio.addEventListener("play", () => this._emit());
    this.audio.addEventListener("pause", () => this._emit());
    this.audio.addEventListener("waiting", () => this._emit({ loading: true }));
    this.audio.addEventListener("canplay", () => this._emit({ loading: false }));
    this.audio.addEventListener("ended", () => {
      if (store.getAutoplay()) this.next();
      else this._emit();
    });
    this.audio.addEventListener("error", () => {
      this._emit({ error: "Unable to load this recitation. Please check your internet connection." });
    });
  }

  onUpdate(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  _emit(extra = {}) {
    const state = {
      surah: this.currentSurah,
      reciter: RECITER_NAME,
      playing: !this.audio.paused && !this.audio.ended,
      currentTime: this.audio.currentTime || 0,
      duration: this.audio.duration || 0,
      currentLabel: fmtTime(this.audio.currentTime || 0),
      durationLabel: fmtTime(this.audio.duration || 0),
      volume: this.audio.volume,
      loading: false,
      error: null,
      ...extra,
    };
    this.listeners.forEach((fn) => fn(state));
  }

  load(surahNumber, { autoplay = true } = {}) {
    const url = this.audioMap[String(surahNumber)];
    if (!url) {
      this._emit({ error: "No recitation is available for this surah yet." });
      return;
    }
    if (this.currentSurah === surahNumber && this.audio.src) {
      if (autoplay) this.play();
      return;
    }
    this.audio.pause();
    this.currentSurah = surahNumber;
    this.audio.src = url;
    this.audio.currentTime = 0;
    this._emit({ loading: true });
    if (autoplay) {
      this.audio.play().catch(() => {
        // Autoplay can be blocked by the browser - not an error state, just wait for a tap.
        this._emit();
      });
    }
    if (this.onSurahChange) this.onSurahChange(surahNumber);
  }

  play() {
    if (!this.audio.src) return;
    this.audio.play().catch(() => this._emit({ error: "Playback was blocked. Tap play again." }));
  }

  pause() {
    this.audio.pause();
  }

  toggle() {
    if (this.audio.paused) this.play();
    else this.pause();
  }

  seek(seconds) {
    if (!isFinite(this.audio.duration)) return;
    this.audio.currentTime = Math.max(0, Math.min(seconds, this.audio.duration));
  }

  seekPercent(pct) {
    if (!isFinite(this.audio.duration)) return;
    this.seek((pct / 100) * this.audio.duration);
  }

  setVolume(v) {
    this.audio.volume = v;
    store.setVolume(v);
    this._emit();
  }

  next() {
    if (!this.currentSurah) return;
    const nextNum = this.currentSurah + 1;
    if (nextNum > 114) return;
    this.load(nextNum, { autoplay: true });
  }

  prev() {
    if (!this.currentSurah) return;
    const prevNum = this.currentSurah - 1;
    if (prevNum < 1) return;
    this.load(prevNum, { autoplay: true });
  }

  currentSurahMeta() {
    return this.surahs.find((s) => s.number === this.currentSurah) || null;
  }
}
