# Riftcrafter — League of Legends Draft

Two ways to build an impossible League of Legends champion: a six-slot draft and a bouncing-champion arena. A responsive, fan-made browser game with interactive first-visit guides, install support and offline caching.

**[Play Riftcrafter](https://JouQarena.github.io/riftcraft/)** · **[Play Champion Roll](https://JouQarena.github.io/riftcraft/champion-roll.html)**

**No build step, backend, account or API key required. Ready for GitHub Pages.**

---

## The Two Pages

| Page | File | What it does |
| --- | --- | --- |
| **Riftcrafter** | `index.html` | Draft a model, passive and four abilities from different champion rolls. Complete the build to unlock sharing and PNG export. |
| **Champion Roll** | `champion-roll.html` | Watch champions bounce and disappear over a 2.5-second roll, keep a model or ability, and adjust the arena with four draggable walls. |

A floating, Dynamic Island-style switch appears on both pages. Each half opens its corresponding page, and the current page is highlighted in gold. Clicking the already-selected half does not restart the game.

The pages are separate play modes: switching between them does **not** transfer a build. Champion Roll selections are kept in the current page session, not saved across navigation or reloads.

## First-Time Interactive Guides

Each page has its own **English** walkthrough:

- Opens automatically on that page’s first visit in the same browser/profile.
- Dims the rest of the screen, outlines the relevant element and points to it with an arrow.
- Advances after real actions during practice steps—not just after clicking Next.
- Includes **Skip guide**, **Skip this step** for practice steps, and `Escape` to exit.
- Can be reopened at any time with the floating **?** button.
- Reopening or skipping the guide does not clear current selections.

**Riftcrafter guide:** try a roll and a pick, then learn about the HUD, sharing, installation and page navigation.

**Champion Roll guide:** try a selection, change the movement speed, drag the side and top walls, then learn about restarting and switching pages.

The guide remembers that it has been opened, including when it is skipped. Visit flags are stored separately for the two pages using browser storage, with a session-storage fallback. Clearing site data, changing browser/profile or restricting storage can affect this behavior. Guide progress is local; there is no account synchronization.

## How to Play — Riftcrafter

1. Click **Roll champion**. The standard roll animation lasts about **2.8 seconds**; reduced-motion mode uses a shorter animation.
2. Choose **one** available slot: **MODEL**, **PASSIVE**, **Q**, **W**, **E** or **R**.
3. That slot locks, and another champion rolls automatically after a short delay.
4. Repeat until all six slots are filled.
5. Share the completed build as an image, exact-build link or text, or download its PNG.
6. Click **Play again** to start a fresh draft.

Additional controls:

- **Undo Last Pick** reverses the most recent selection.
- **Reroll this champion** offers another champion before you make a selection.
- After completion, the **↻** button on a slot’s tag clears that slot and starts another roll.
- **Sound ON/OFF** controls this page’s sound effects and remembers the preference locally.

### Keyboard Shortcuts

| Key | Action |
| --- | --- |
| `Space` / `R` | Roll when a roll is available |
| `1`–`6` | Pick MODEL, PASSIVE, Q, W, E or R, respectively |
| `Z` | Undo the last pick |

### Draft Features

- Balanced champion randomizer: no repeats within a build, with reduced weighting for recently seen champions across subsequent builds in the same session.
- Six-slot HUD with ability descriptions, resource colors and champion tags.
- Build rating and stats after completion.
- Local history of up to **30 completed builds**; click an entry to reopen its picks.
- **Clear History** removes the locally stored build history.

### Sharing

Sharing unlocks after all six slots are filled. Image actions also wait for PNG preparation.

- **Share image:** uses supported clipboard/native sharing features, with a download fallback where appropriate.
- **Download PNG:** exports at **2380 × 848**, regardless of the display size.
- **Share link:** encodes the patch and six champion IDs in the URL fragment so another person can open the same picks.
- **Copy text:** copies a readable version of the build.

The HUD frame has transparent cutouts so the selected artwork can show through it. Native sharing and clipboard capabilities vary by browser and device.

## How to Play — Champion Roll

1. The page starts a roll automatically. Portraits bounce inside the arena and are eliminated until one champion remains.
2. The roll lasts **2.5 seconds**. The winning champion appears inside the central frame with a gentle floating animation.
3. Click **MODEL** to keep its model image, or **P**, **Q**, **W**, **E** or **R** to keep an ability icon.
4. Your selection stays in the frame, and the next roll starts automatically while more abilities remain to be selected.
5. Pick each of the five abilities once. **Choose MODEL before your final ability.** MODEL can be replaced during the ongoing sequence.
6. Click **Re-Roll** to clear the selected model and abilities and start over.

### Arena Controls

- **Four draggable walls:** move the left/right walls horizontally and the top/bottom walls vertically, using a mouse or touch.
- Portraits bounce at the **visible inner edges** of the gold walls. Their movement has no CSS transform delay that would make collisions appear detached from the walls.
- **Speed** switches between **Normal (1×)** and **Fast (1.6×)** movement. Changing speed starts a new roll but keeps the selected icons.
- Movement speed does **not** change the 2.5-second roll duration or the sound’s pitch.
- Rolling portraits render above the frame, arena walls and normal game interface without intercepting clicks. Guide overlays and the help button remain accessible above the animation.
- The selected portrait floats more gently, and frame/icon shadows have sharper edges.

**Keyboard:** `Space` or `Enter` starts a fresh sequence when focus is not on a button or navigation link. Focused buttons retain their normal keyboard behavior. The guide handles its own keyboard navigation.

## Sound Files

### Riftcrafter

The original draft page uses `js/sounds.js`:

| File(s) | Use |
| --- | --- |
| `sounds/roll.mp3` / `roll.wav` | Draft roll |
| `sounds/pick.mp3` / `pick.wav` | Slot selection |
| `sounds/complete.mp3` / `complete.wav` | Completed build |
| `sounds/replay.mp3` / `replay.wav` | New draft |
| `sounds/share.mp3` / `share.wav` | Sharing actions |
| `sounds/remove.wav` | Removal/undo actions |

The sound manager tries MP3/WAV alternatives where configured and attempts a Web Audio fallback if playback fails. Browser autoplay rules still apply.

### Champion Roll

Supply your own audio file at this exact, case-sensitive path:

```text
sounds/rollsond.mp3
```

The filename is intentionally **`rollsond.mp3`**, not `rollsound.mp3`. The custom file must be uploaded separately if it is not already in your project; the code updates do not generate this recording.

- `js/roll-sound.js` decodes the clip and starts it with each roll, including automatic rolls after a selection.
- The **full clip** plays at its normal speed and pitch. If it is longer than the 2.5-second roll, the audio continues after the winning champion appears. A shorter file ends when its audio runs out.
- Restarting a roll stops the previous playback before starting again, preventing overlap.
- Revealing the winner does **not** stop playback. Audio ends naturally, or stops when another roll begins or you leave the page.
- The roll duration is **fixed at 2.5 seconds**; it no longer changes to match the uploaded clip’s length.
- If the file is missing, invalid or unavailable offline, the game still runs silently with the same duration.

The first automatic roll may be silent until the user clicks, taps or presses a key. If audio is unlocked during a roll, it joins at the current position instead of starting late. The original page’s Sound ON/OFF preference does not control this separate audio player.

## Install and Offline Use

The download panel on **Riftcrafter** supports installing the site as a progressive web app (PWA):

- **Install app** opens the browser’s native install prompt when available, otherwise showing installation guidance.
- **Android**, **iPhone / iPad** and **Windows** buttons show platform-specific instructions.
- On iPhone/iPad, use Safari’s **Share → Add to Home Screen** flow.
- On supported Android/desktop browsers, use the install prompt or browser menu.

Installation is browser-managed; these buttons do not download an APK or Windows EXE. The installed app starts on Riftcrafter and can navigate to Champion Roll through the floating switch.

### Manual Offline Download and Progress

The **Download — Play Offline** panel on the first page includes an explicit **Download for offline** button. Installing the PWA alone does **not** mean its champion resources are ready offline.

1. Open the site online and click **Download for offline**. Use Wi-Fi if you have a limited data plan.
2. The app prepares a list of all champions and their required files for one Data Dragon patch.
3. Follow the progress bar, percentage and **saved / total files** count. The total is calculated from the actual patch, not a hard-coded timer. Preparing the list is shown separately before a total is known.
4. Wait for **Ready offline** and the green bar. Readiness appears only after all required files are checked in browser storage.
5. You can then reload offline and play with that saved patch. Shared builds from other patches may still need an internet connection.

The bulk champion download starts **only after you choose it**. Normal gameplay requests and the existing service-worker app-shell cache still operate as usual.

- **Pause / Resume download:** keeps valid saved files and only fetches missing or invalid resources on retry.
- **Interrupted connection, page changes or reloads:** stop the active transfer. Return to this panel and resume; keep the page open while downloading.
- **Failed requests, broken artwork or full storage:** show a not-ready state rather than a false success. A successful HTTP request alone does not count as a saved file; cache writes must succeed, and artwork is decoded for validation.
- **Check for updates:** after completion, you can prepare the current patch. Files that are already valid in the cache are reused.
- **Automatic verification:** reopening the first page checks the saved pack without automatically starting another bulk download. Missing or evicted files revoke the ready state on verification.
- **Optional arena sound:** `sounds/rollsond.mp3` is saved if available. If it is missing, the panel explicitly says that Champion Roll will be silent offline. It does not prevent the otherwise complete game pack from becoming ready.

Progress is measured in **files, not bytes**: a large embedded HTML page and a small icon each count as one file, so percentage changes are not a download-speed estimate. The app requests persistent browser storage where supported, but the browser may refuse or later remove data.

### What Is Saved?

`sw.js` and `js/offline.js` share the app-shell configuration. A complete offline pack includes:

- Both HTML pages, their versioned scripts/styles, interactive guides, the HUD frame, app manifest/icons and original sound effects.
- The selected patch’s roster and every champion’s detail JSON.
- Every champion portrait, passive icon and four ability icons required by the original draft.
- Champion Roll’s embedded artwork, plus its optional custom audio when available.

The pages have separate cache entries, so the arena HTML cannot replace the original draft. When the version endpoint is unreachable, the service worker selects a completed downloaded patch instead of a newer patch with only some files cached. While downloading an update, a previously completed patch can remain the offline fallback.

Without a completed manual pack, Riftcrafter can only use data and artwork already cached by ordinary play. One online visit does **not** automatically download every champion. The custom `rollsond.mp3` is revalidated online and uses its cached copy offline when available.

Artwork previews and exported images use compatible CORS requests. Old opaque or invalid artwork entries can be repaired online without clearing valid saved files. Offline pack metadata is stored in the app cache at `./.rift-offline-pack.json`; it is an internal cache entry, **not** a file to upload.

> Use HTTPS in production, or `localhost` for development. Opening files directly with `file://` does not provide a supported module/service-worker environment. Ready status applies to this browser/profile and its current saved resources, not permanent or cross-device storage.

## Project Structure

```text
index.html                  Original six-slot draft page
champion-roll.html          Arena page; inline game logic and embedded artwork
sw.js                       Offline caching, page routing and image-cache repair
README.md                   Project documentation
css/
  style.css                 Original draft styles
  page-switcher.css         Shared floating page navigation
  guide.css                 Spotlight, arrow, guide card and help button
  offline.css               Manual offline-download panel and progress bar
js/
  app.js                    Original draft logic and install panel
  randomizer.js             Balanced draft randomizer
  storage.js                Local history and draft storage helpers
  hud.js                    HUD geometry and PNG export
  share.js                  Build tokens, links and text
  sounds.js                 Original page sound manager
  page-switcher.js          Navigation behavior and roll-page SW registration
  roll-sound.js             Champion Roll's full-clip audio player
  guide.js                  Independent first-visit interactive guides
  offline.js                Pack discovery, manual download, resume and verification
sounds/
  roll, pick, complete,     Original page sound assets (MP3/WAV as listed above)
  replay, share, remove
  rollsond.mp3               User-supplied Champion Roll audio
public/
  frame.webp                Original page HUD frame
  manifest.webmanifest      PWA metadata, launch URL and icons
  icon-180.png              Apple touch icon
  icon-192.png              App icon
  icon-512.png              App icon
  icon-maskable-512.png      Maskable app icon
  og-image.jpg              Social artwork asset
```

Keep the relative directory structure intact. The original page is modular; the arena page still contains its embedded artwork and main game logic, with audio and guides in separate scripts.

## Run Locally

From the project root:

```bash
python -m http.server 8003
```

Open:

- `http://localhost:8003/` — Riftcrafter
- `http://localhost:8003/champion-roll.html` — Champion Roll

There is no npm install or build command required to run the site. The original page needs internet access for champion resources that are not already cached.

## Publish or Update on GitHub Pages

1. Upload the project files to the repository root, preserving `css/`, `js/`, `sounds/` and `public/`.
2. Add `sounds/rollsond.mp3` if you want audio on Champion Roll.
3. In **Settings → Pages**, choose **Deploy from a branch**, select `main` and **/ (root)**, then save. If using `/docs` instead, put the entire site there and select that folder.
4. Wait for the deployment to complete.
5. Open **https://JouQarena.github.io/riftcraft/**.

For an incremental update, extract the update ZIP and replace its files at their existing paths. Do not delete unrelated files or an already-uploaded custom audio file. Upload the extracted files, not just the ZIP itself.

After deployment, revisit the site online so the service worker can update, then reload. On Windows desktop, **Ctrl + F5** can help load the latest document. Avoid clearing all site data unless necessary: doing so also removes local history, guide visit flags and offline resources.

**When editing cached assets:** update the relevant HTML resource query/version and update `sw.js` so the app-shell cache is refreshed. Do not change stable cache names merely to force an update; they retain saved artwork. Add any new required local files to `APP_SHELL` and increment `OFFLINE_BUILD` when the offline file set changes. The manual downloader obtains that list from the active service worker and also includes the exact versioned resource URLs from both HTML pages.

Share links are based on the current site URL, so custom domains work without hard-coded link changes.

## Customization

| Change | Location |
| --- | --- |
| Original draft colors/layout | `css/style.css` |
| Floating page switch | `css/page-switcher.css`, `js/page-switcher.js` |
| Guide copy, steps and action detection | `js/guide.js` |
| Guide appearance and help button | `css/guide.css` |
| Original HUD coordinates/export size | `js/hud.js` → `HUD` |
| Original roll timing | `js/app.js` → standard 35 ticks × 80 ms, with a reduced-motion variant |
| Arena walls, collisions, portrait motion and shadows | Inline CSS/JavaScript in `champion-roll.html` |
| Arena roll timing | `champion-roll.html` → `DEFAULT_DURATION_MS` (2500 ms); independent of the audio file’s duration |
| Arena audio recording | `sounds/rollsond.mp3` |
| Install metadata and app icons | `public/manifest.webmanifest` |
| Offline download UI and pack verification | `css/offline.css`, `js/offline.js` |
| Offline asset list, pack revision and caching | `sw.js` → `APP_SHELL`, `OFFLINE_BUILD` |

If changing `public/frame.webp`, update the original HUD geometry and display aspect ratio together. Preserve the frame’s transparent cutouts.

To test the guides again, use **?**. To specifically retest automatic first-visit behavior, remove these keys from **both localStorage and sessionStorage** in browser developer tools, then reload:

```text
riftcrafter.guide.v1.draft
riftcrafter.guide.v1.roll
```

Do not clear unrelated storage keys just to replay a guide.

## Troubleshooting and Current Limitations

- **No sound on the first automatic roll:** interact with the page to unlock browser audio. For Champion Roll, verify that `sounds/rollsond.mp3` is uploaded with the exact spelling and casing.
- **Artwork warning or letter placeholders:** go online and use **Download for offline / Resume download** to save or repair the required artwork. Wait for **Ready offline** before disconnecting.
- **Offline download is paused or not ready:** check connectivity and available device storage, then resume. A missing required file blocks readiness; the optional Champion Roll sound is reported separately.
- **An older version still appears:** confirm GitHub Pages finished deploying, revisit online and reload after the service-worker update. Ensure the required helper files were uploaded too.
- **Guide does not open automatically:** it may already be marked as seen. Use **?**, or reset only the two guide keys for testing.
- **A practice step cannot be completed:** use **Skip this step** or **Skip guide**; unavailable data or audio should not trap the user in the walkthrough.
- **Unfinished draft after reload:** selections are written locally during play, but the current startup/reset path makes unfinished-draft recovery unreliable. Use completed-build history or a share link for builds you want to reopen.
- **Champion Roll persistence:** arena selections are not saved across page loads, and this mode does not provide the original page’s PNG/link export workflow.
- Install prompts, clipboard access, native sharing, audio autoplay and storage availability depend on the browser/device. Do not assume every browser exposes the same capabilities.

## Credits

Champion names, artwork and game data belong to Riot Games. The original draft uses Riot’s public Data Dragon CDN; Champion Roll includes embedded champion artwork and ability assets.

HUD artwork and bundled sound assets are supplied with the project. Supply your own `rollsond.mp3` recording and ensure you have permission to distribute any replacement media.

**Fan-made project. Not an official Riot Games product and not endorsed by Riot Games.**
