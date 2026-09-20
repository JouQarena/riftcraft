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

### What Is Available Offline?

`sw.js` caches the app shell, both pages, shared guides and supporting assets. It keeps the two HTML pages separate so one cannot replace the other in the offline cache.

- **Riftcrafter:** Riot Data Dragon champion data and artwork are cached as they are requested. Offline use is limited to resources already saved on that device; one online visit does **not** guarantee that every champion and ability image has been downloaded.
- **Champion Roll:** its embedded champion/ability/model assets travel with the cached HTML page. Its scripts and optional roll audio must also be saved for offline use.
- **Guides:** work offline once their CSS and JavaScript have been cached.
- The custom `rollsond.mp3` is revalidated online, with a cached copy used offline when available.

Artwork previews and exported images use compatible CORS requests. Old opaque image-cache entries are repaired on demand when online, without clearing valid saved artwork.

> Use HTTPS in production, or `localhost` for development. Opening the files directly with `file://` does not provide a supported module/service-worker environment. Browsers may clear cached data, so offline availability is not permanent storage.

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

**When editing cached assets:** update the relevant HTML resource query/version and update `sw.js` so the app-shell cache is refreshed. Do not change stable cache names merely to force an update; they retain saved artwork. Add any new required local files to `APP_SHELL`.

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
| Offline asset list and caching | `sw.js` |

If changing `public/frame.webp`, update the original HUD geometry and display aspect ratio together. Preserve the frame’s transparent cutouts.

To test the guides again, use **?**. To specifically retest automatic first-visit behavior, remove these keys from **both localStorage and sessionStorage** in browser developer tools, then reload:

```text
riftcrafter.guide.v1.draft
riftcrafter.guide.v1.roll
```

Do not clear unrelated storage keys just to replay a guide.

## Troubleshooting and Current Limitations

- **No sound on the first automatic roll:** interact with the page to unlock browser audio. For Champion Roll, verify that `sounds/rollsond.mp3` is uploaded with the exact spelling and casing.
- **Artwork warning or letter placeholders:** go online and reload to allow failed or incompatible cached artwork to be fetched again. Offline images that were never downloaded cannot be displayed.
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
