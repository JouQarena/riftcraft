# Riftcrafter — League of Legends Draft

A responsive, fan-made League of Legends draft tool. Roll a champion, keep **one** part of their kit, and repeat until you have a model, passive, Q, W, E, and R. Build something that shouldn't exist.

**Live Demo:** `https://JouQarena.github.io/riftcraft/`

**No build step, backend, or API key required. Ready for GitHub Pages.**

---

## How to Play

1. Click **Roll champion** — a random champion appears with a 2.8s roll animation synced with sound.
2. Choose one available slot: Model, Passive, Q, W, E, or R. That slot locks.
3. The next champion auto-rolls automatically after your pick.
4. Repeat until all six slots are filled.
5. Your broken build is ready — share it as image, link, or text.
6. Click **Play again** to start a fresh draft.

Keyboard shortcuts:
- `Space` / `R` = Roll
- `1-6` = Pick slot (1=Model, 2=Passive, 3=Q, 4=W, 5=E, 6=R)
- `Z` = Undo last pick

---

## Features

### Core Draft
- **Six slots:** Model · Passive · Q · W · E · R
- **Balanced randomizer:** No repeats within a build, recent champions have lower weight across Play Again until refresh
- **Auto-roll:** Automatically rolls the next champion after you pick a slot
- **Long roll animation:** 2.8s roll synced with sound for better feel
- **Undo:** Revert your last pick (button + `Z` key)
- **Reroll single slot:** After completion, click ↻ on any tag to clear that slot and auto-roll again
- **Rating:** After completing a build, shows Rank (C to SSS BROKEN) + stats: Mobility, CC, DMG, Troll, Synergy

### Sounds
Five sound effects located in `sounds/`:
- `roll.mp3/wav` — rolling animation (2.8s)
- `pick.mp3/wav` — picking a slot
- `complete.mp3/wav` — build completed
- `replay.mp3/wav` — play again
- `share.mp3/wav` — sharing/downloading

Toggle with **🔊 Sound ON/OFF** button. Preference is saved in localStorage. Falls back to Web Audio beep if files are missing or autoplay is blocked.

> Replace the placeholder wavs in `sounds/` with your own files using the same names.

### History & Persistence
- **Local draft autosave:** Current progress is saved to localStorage every pick. Refreshing restores it.
- **Build history:** Last 30 builds saved locally with timestamp. Click any history item to reopen that exact build via hash link.
- **Clear History** button to wipe local history.

### Sharing
- **Share image:** Uses Web Share API with file if supported, otherwise downloads PNG. Image is prepared before enabling the button to preserve user gesture.
- **Download PNG:** Always downloads a 2380×848 PNG with transparent HUD cutouts, no summoner spells, no HP numbers.
- **Share link:** Versioned payload in URL fragment `#build=...` containing patch version and six champion IDs. Opens the exact same six picks, no account needed.
- **Copy text:** Plain-text export for chats that block images.

### UI/UX
- Responsive layout for phones, tablets, desktops
- Touch-friendly buttons (44px minimum), keyboard focus indicators, `prefers-reduced-motion` support
- LoL-style ability tooltip on hover/focus
- True alpha cutouts in HUD frame
- Resource bar color changes by resource type (Mana, Energy, Fury, etc.)

---

## Files

```
index.html          Main HTML, imports ES modules
css/style.css       All styles, responsive breakpoints
js/
  app.js            Main application logic
  randomizer.js     Balanced randomizer (no-repeat + weight recovery)
  storage.js        localStorage for history + draft
  hud.js            HUD geometry (2380x848) + PNG export
  share.js          Token encode/decode + link building
  sounds.js         Sound manager with mp3/wav fallback
sounds/
  roll.mp3/wav      2.8s roll sound
  pick.mp3/wav      pick slot
  complete.mp3/wav  build complete
  replay.mp3/wav    play again
  share.mp3/wav     share/download
public/
  frame.webp        HUD frame with transparent cutouts (98KB)
  og-image.jpg      Social preview placeholder
```

The frame artwork is now a separate `public/frame.webp` file instead of base64 inline for better maintainability. The old single-file version still works, but this modular version is recommended.

---

## Publish on GitHub Pages

1. Upload all files from `riftcrafter-final/` to your repository root (or `/docs`).
2. Go to **Settings → Pages**.
3. Choose **Deploy from a branch**, select `main` and `/ (root)`, Save.
4. Wait for deployment. URL will be `https://JouQarena.github.io/riftcraft/`

The app automatically uses its current URL for share links, so custom domains work without code changes. Use HTTPS for native sharing and clipboard.

Local preview:
```bash
python -m http.server 8003
# open http://localhost:8003/
```

---

## Customization

- **Colors, sizes, breakpoints:** `css/style.css`
- **HUD coordinates:** `js/hud.js` → `HUD` object. Bounds are in source-image pixels (2380×848) and used for both display and export.
- **Roll duration:** `js/app.js` → `total = 35` and `80` ms interval (35×80=2800ms). Match to your `roll.wav` length.
- **Auto-roll delay:** `js/app.js` → `setTimeout(..., 600)` after pick.
- **Frame artwork:** Replace `public/frame.webp`. If you change dimensions, update `HUD` geometry and `#final-hud` aspect ratio together. Frame must have real transparent cutouts.
- **Sounds:** Replace files in `sounds/`. Keep same filenames.

Champion data and artwork are fetched from Riot's public Data Dragon CDN and require internet.

---

## Browser Support

- Chrome, Edge, Firefox, Safari (desktop & mobile)
- Six draft options collapse to 3 columns on narrow screens
- Share controls wrap on small screens
- Exported PNG always full resolution regardless of screen size
- Native sharing support varies by OS/browser — fallback to download/copy is provided

---

## Credits

- Champion names, artwork, and data belong to Riot Games via Data Dragon
- HUD frame supplied with project
- Sounds: placeholder wavs generated for demo — replace with your own
- Fan-made tool, not an official Riot product, not endorsed by Riot Games
