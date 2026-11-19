// front-end/js/i18n.js
import { store } from './storage.js';

let currentLang = 'en';
let translations = {};

export async function initI18n() {
  currentLang = store.getLanguage() || 'en';
  await loadLanguage(currentLang);
}

export async function loadLanguage(langCode) {
  try {
    const res = await fetch(`./js/data/lang/${langCode}.json`);
    if (!res.ok) throw new Error(`Could not load language ${langCode}`);
    translations = await res.json();
    currentLang = langCode;
    store.setLanguage(langCode);
    document.documentElement.lang = langCode;
    document.documentElement.dir = (langCode === 'ur' || langCode === 'ar') ? 'rtl' : 'ltr';
  } catch (err) {
    console.warn(`Fallback to default language (en):`, err);
    if (langCode !== 'en') {
      await loadLanguage('en');
    }
  }
}

export function t(key, fallback = '') {
  const keys = key.split('.');
  let val = translations;
  for (const k of keys) {
    if (val && val[k] !== undefined) {
      val = val[k];
    } else {
      return fallback || key;
    }
  }
  return val;
}

export function getCurrentLanguage() {
  return currentLang;
}

export async function setLanguage(langCode) {
  await loadLanguage(langCode);
}