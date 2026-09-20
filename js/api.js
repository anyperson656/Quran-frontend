const BASE_URL = (function () {
  const RENDER_API = "https://quran-backend-8k4b.onrender.com/api";
  if (window.QURAN_API_BASE) return window.QURAN_API_BASE;
  return location.hostname.endsWith("github.io") ? RENDER_API : `http://${location.hostname}:4000/api`;
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

export const api = {
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
  async addBookmark(surahNumber, surahName, ayahNumber) {
    return request("/bookmarks", { method: "POST", body: JSON.stringify({ surahNumber, surahName, ayahNumber }) });
  },
  async removeBookmark(id) {
    return request(`/bookmarks/${id}`, { method: "DELETE" });
  },
  async getProgress() {
    return request("/progress");
  },
  async setProgress(surahNumber, ayahNumber) {
    return request("/progress", { method: "PUT", body: JSON.stringify({ surahNumber, ayahNumber }) });
  },
};