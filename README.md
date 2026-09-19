# Quran Website — Front-end

A static site (HTML/CSS/vanilla JS, no build step) that reads the Qur'an,
plays Maher Al-Muaiqly's recitation, and talks to `../back-end` for
accounts, bookmarks and reading progress.

## Running it

Browsers block `fetch()` of local JSON files when a page is opened directly
as `file://`, so serve the folder over plain HTTP. Any of these work:

```bash
# Option 1 — Python (already installed on most machines)
cd front-end
python3 -m http.server 5500

# Option 2 — Node
npx serve -l 5500

# Option 3 — VS Code
# Right-click index.html → "Open with Live Server"
```

Then open `http://localhost:5500`.

## Connecting to the back-end
By default the app calls the API at `http://localhost:4000/api`. To point
it somewhere else (e.g. a deployed API), add this **before** the app script
tag in `index.html`:

```html
<script>window.QURAN_API_BASE = "https://your-api-domain.com/api";</script>
<script type="module" src="js/app.js"></script>
```

If the back-end isn't running at all, the site still works fully as a
guest: bookmarks and reading progress are kept in the browser's local
storage instead, and sign-in simply isn't available until the API is up.

## What's in here
- `index.html` — page shell
- `css/styles.css` — all styling (design tokens at the top)
- `js/app.js` — router + all page rendering + bookmarks/auth wiring
- `js/player.js` — the persistent HTML5 audio player
- `js/api.js` — talks to the back-end, fails gracefully if it's unreachable
- `js/storage.js` — local-storage layer (guest bookmarks/progress/prefs, respects the cookie choice)
- `js/data/surahs.json` — metadata for all 114 surahs (name, Arabic name, ayah count, Meccan/Medinan)
- `js/data/quran.json` — the Uthmani Arabic text for all 6,236 ayahs
- `js/data/audio.json` — the surah → recitation URL map

## About the Qur'an text
Your supplied PDF (`quran-hafs-mushaf.pdf`) turned out to contain no
extractable text — its pages are vector outlines, not selectable characters
— so it couldn't be used as a programmatic data source. `quran.json` instead
uses the Tanzil.net Uthmani Hafs text, the same text King Fahd Complex
mushafs like yours are printed from, and the text nearly every Quran app
(quran.com included) is built on. Every ayah count in `surahs.json` matches
the standard 6,236-ayah Hafs count.

## About the audio
Every URL in `audio.json` points at `server12.mp3quran.net/maher/NNN.mp3`,
confirmed against mp3quran.net's own public reciter API (moshaf id 102,
"Maher Al Mu'aiqly — Murattal", 114/114 surahs present) and spot-checked
directly — surah 1 returned a real `audio/mpeg` file.
