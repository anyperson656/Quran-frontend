import { store } from "./storage.js";

const DEFAULT_RECITER = { id: "maher_almuaiqly", name: "Maher Al-Muaiqly", surahServer: "https://server12.mp3quran.net/maher/" };
const pad3 = (n) => String(n).padStart(3, "0");

function fmtTime(sec) {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export class Player {
 constructor({ surahs, audioMap, onSurahChange, reciter }) {
    this.surahs = surahs;
    this.audioMap = audioMap;
    this.onSurahChange = onSurahChange;
    this.audio = new Audio();
    this.audio.preload = "none";
    this.audio.volume = store.getVolume();
    this.currentSurah = null;
    this.listeners = new Set();
    this.reciter = reciter || DEFAULT_RECITER;
    this.loadedReciter = null;
    this._chain = null;

    this.audio.addEventListener("timeupdate", () => this._emit());
    this.audio.addEventListener("loadedmetadata", () => this._emit());
    this.audio.addEventListener("play", () => this._emit());
    this.audio.addEventListener("pause", () => this._emit());
    this.audio.addEventListener("waiting", () => this._emit({ loading: true }));
    this.audio.addEventListener("canplay", () => this._emit({ loading: false }));
    this.audio.addEventListener("ended", () => {
      if (this._chain && this._advanceChain()) return;
      if (store.getAutoplay()) this.next();
      else this._emit();
    });
    this.audio.addEventListener("error", () => {
      if (this.currentSurah !== null) {
        this._emit({ error: "Unable to load this recitation. Please check your internet connection." });
      }
    });
  }

  onUpdate(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  _emit(extra = {}) {
    const state = {
      surah: this.currentSurah,
      reciter: (this.loadedReciter || this.reciter).name,
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

  setReciter(reciter) {
    this.reciter = reciter || DEFAULT_RECITER;
    this._emit(); // updates the bar's name; current playback is not interrupted
  }

  _directUrl(n) {
    const r = this.reciter;
    return r.surahServer ? `${r.surahServer}${pad3(n)}.mp3` : null;
  }

  _chainUrl() {
    const c = this._chain, r = this.loadedReciter;
    const folder = c.step === "translation" ? r.translationFolder : r.folder;
    return `https://everyayah.com/data/${folder}/${pad3(c.surah)}${pad3(c.ayah)}.mp3`;
  }

  _playChainClip() {
    this.audio.src = this._chainUrl();
    this._emit({ loading: true });
    this.audio.play().catch(() => this._emit());
  }

  _advanceChain() {
    const c = this._chain, r = this.loadedReciter;
    if (c.step === "arabic" && r.translationFolder) {
      c.step = "translation";
      this._playChainClip();
      return true;
    }
    if (c.ayah < c.count) {
      c.ayah++;
      c.step = "arabic";
      this._playChainClip();
      return true;
    }
    this._chain = null;
    return false;
  }

  load(surahNumber, { autoplay = true } = {}) {
    const r = this.reciter;
    const direct = this._directUrl(surahNumber);
    const meta = this.surahs.find((s) => s.number === surahNumber);
    if (!direct && !(r.folder && meta)) {
      this._emit({ error: "No recitation is available for this surah yet." });
      return;
    }
    const sameLoaded =
      this.currentSurah === surahNumber &&
      this.loadedReciter && this.loadedReciter.id === r.id &&
      this.audio.src && (direct || this._chain);
    if (sameLoaded) {
      if (autoplay) this.play();
      return;
    }
    this.audio.pause();
    this.currentSurah = surahNumber;
    this.loadedReciter = r;
    this._chain = direct ? null : { surah: surahNumber, ayah: 1, count: meta.ayahCount, step: "arabic" };
    this.audio.src = direct || this._chainUrl();
    this.audio.currentTime = 0;
    this._emit({ loading: true });
    if (autoplay) {
      this.audio.play().catch(() => this._emit());
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
