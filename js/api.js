// Talks to the back-end (see /back-end). If the back-end isn't running or
// unreachable, every call rejects with a normal Error and the caller falls
// back to local storage - the reading experience never breaks because of it.

const RENDER_API = "https://quran-backend-8k4b.onrender.com/api";
const BASE_URL = window.QURAN_API_BASE || (location.hostname.endsWith("github.io") ? RENDER_API : `http://${location.hostname}:4000/api`);
async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(BASE_URL + path, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch (err) {
    throw new Error("NETWORK");
  }
  let body = null;
  try {
    body = await res.json();
  } catch (e) {
    /* no body */
  }
  if (!res.ok) {
    const message = (body && body.error) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return body;
}

export const api = {
  async signup(name, email, password) {
    return request("/auth/signup", { method: "POST", body: JSON.stringify({ name, email, password }) });
  },
  async login(email, password) {
    return request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
  },
  async logout() {
    return request("/auth/logout", { method: "POST" });
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
