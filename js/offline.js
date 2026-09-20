/* Manual offline packs. A progress tick means a validated file was saved, not merely requested. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const ui = {
    root: $('offline-download'), progress: $('offline-progress'), percent: $('offline-percent'),
    status: $('offline-status'), details: $('offline-details'), start: $('offline-start'),
    pause: $('offline-pause'), badge: $('dl-offline-badge')
  };
  if (!ui.root) return;
  const CDN = 'https://ddragon.leagueoflegends.com';
  const VERSIONS = CDN + '/api/versions.json';
  const validPatch = value => typeof value === 'string' && /^\d+\.\d+\.\d+$/.test(value);
  const unique = values => [...new Set(values)];
  const number = value => value.toLocaleString('en-US');
  const aborted = () => new DOMException('Download paused', 'AbortError');
  let config = null, appCache = null, dataCache = null, manifest = null;
  let busy = false, checking = false, controller = null, fatal = null, pauseReason = '';
  let done = 0, total = 0, ready = false, lastCheck = 0;
  let audioDecoder = null;

  function render(state, message, details, indeterminate = false) {
    ui.root.dataset.state = state;
    ui.status.textContent = message;
    if (details !== undefined) ui.details.textContent = details;
    ui.progress.max = total || 100;
    if (indeterminate) ui.progress.removeAttribute('value');
    else ui.progress.value = Math.min(done, total || 100);
    ui.percent.textContent = indeterminate ? '—' : `${total ? Math.floor(done / total * 100) : 0}%`;
    ui.start.disabled = busy || checking || !config;
    ui.start.querySelector('span').textContent = state === 'ready'
      ? (navigator.onLine ? 'Check for updates' : 'Check saved files')
      : manifest ? 'Resume download' : 'Download for offline';
    ui.pause.hidden = !busy;
    ui.badge.dataset.ready = String(ready && state === 'ready');
    ui.badge.textContent = ready && state === 'ready'
      ? `Ready offline · Patch ${manifest.patch}`
      : (busy ? 'Preparing offline files…' : 'Offline files not verified');
  }
  function cacheFor(url) { return new URL(url).origin === location.origin ? appCache : dataCache; }
  function checkAbort(signal) { if (signal?.aborted) throw fatal || aborted(); }
  function describeError(error) {
    if (error?.name === 'QuotaExceededError') return 'Device storage is full. Free some space, then resume. Existing saved files have been kept.';
    return error?.message || 'Some files could not be saved. Check your connection and try again.';
  }

  async function validResponse(response, url) {
    if (!response?.ok || response.type === 'opaque' || response.type === 'opaqueredirect') return false;
    try {
      const path = new URL(url).pathname;
      const type = response.headers.get('content-type') || '';
      if (/\.(json|webmanifest)$/i.test(path)) {
        if (!type.includes('json') && !type.includes('manifest')) return false;
        const value = await response.clone().json();
        if (path === '/api/versions.json') return Array.isArray(value) && validPatch(value[0]);
        if (/\/data\/en_US\/champion\.json$/.test(path)) {
          const entries = Object.values(value?.data || {});
          const samePack = manifest?.champions && path.includes(`/cdn/${manifest.patch}/`);
          return entries.length > 0 && (!samePack || entries.length === manifest.champions) &&
            entries.every(champ => typeof champ.id === 'string' && typeof champ.name === 'string');
        }
        if (/\/data\/en_US\/champion\//.test(path)) {
          const id = decodeURIComponent(path.split('/').pop().replace(/\.json$/, ''));
          const champ = value?.data?.[id];
          return !!champ && champ.id === id && typeof champ.name === 'string' && !!champ.passive?.image?.full &&
            Array.isArray(champ.spells) && champ.spells.length >= 4 && champ.spells.slice(0, 4).every(spell => !!spell.image?.full);
        }
        return value !== null && typeof value === 'object';
      }
      if (/\.(png|webp|jpe?g|gif)$/i.test(path)) {
        if (!type.startsWith('image/')) return false;
        const blob = await response.clone().blob();
        if (!blob.size) return false;
        // Decode artwork rather than calling an HTML error page or broken image "saved".
        if (typeof createImageBitmap === 'function') {
          const bitmap = await createImageBitmap(blob); bitmap.close();
        } else {
          const objectURL = URL.createObjectURL(blob);
          try {
            await new Promise((resolve, reject) => {
              const image = new Image(); image.onload = resolve; image.onerror = reject; image.src = objectURL;
            });
          } finally { URL.revokeObjectURL(objectURL); }
        }
        return true;
      }
      if (/\.css$/i.test(path) && !type.includes('text/css')) return false;
      if (/\.js$/i.test(path) && !/(javascript|ecmascript)/i.test(type)) return false;
      if (/\.(mp3|wav)$/i.test(path)) {
        if (!/(audio\/|octet-stream)/i.test(type)) return false;
        const Decoder = window.OfflineAudioContext || window.webkitOfflineAudioContext;
        if (Decoder) {
          audioDecoder ||= new Decoder(1, 1, 44100);
          const decoded = await audioDecoder.decodeAudioData(await response.clone().arrayBuffer());
          return Number.isFinite(decoded.duration) && decoded.duration > 0;
        }
      }
      if (path.endsWith('/') || path.endsWith('.html')) {
        if (!type.includes('text/html')) return false;
        const html = await response.clone().text();
        return path.endsWith('/champion-roll.html') ? html.includes('id="lolFrame"') && html.includes('id="arena"') :
          html.includes('id="app"') && html.includes('id="roll-btn"');
      }
      return (await response.clone().blob()).size > 0;
    } catch (_) { return false; }
  }
  async function cached(url) {
    const response = await cacheFor(url).match(url, { ignoreVary: true });
    return await validResponse(response, url) ? response : null;
  }
  async function saveManifest() {
    await appCache.put(config.metadata, new Response(JSON.stringify(manifest), {
      headers: { 'Content-Type': 'application/json' }
    }));
  }
  async function readManifest() {
    const response = await appCache.match(config.metadata);
    const value = response ? await response.json().catch(() => null) : null;
    // Only follow this app's own asset URLs when resuming a stored pack.
    const allowed = url => {
      try { const u = new URL(url); return u.href.startsWith(config.scope) || u.origin === CDN; } catch (_) { return false; }
    };
    return value?.schema === 1 && validPatch(value.patch) && Array.isArray(value.required) &&
      value.required.every(allowed) ? value : null;
  }
  async function requestFresh(url, signal) {
    checkAbort(signal);
    const local = new AbortController();
    const cancel = () => local.abort();
    signal?.addEventListener('abort', cancel, { once: true });
    const timer = setTimeout(cancel, 20000);
    try {
      const requestURL = new URL(url); requestURL.searchParams.set('__rift_offline', '1');
      const response = await fetch(requestURL.href, { mode: 'cors', cache: 'reload', signal: local.signal });
      if (!response.ok) {
        const error = new Error(`A required file returned HTTP ${response.status}. Saved files are kept; retry when the file is available.`);
        error.status = response.status; throw error;
      }
      if (!await validResponse(response, url)) throw new Error('A file was invalid or incomplete. It was not counted as saved.');
      checkAbort(signal);
      await cacheFor(url).put(url, response.clone());
      // The download is only complete after the Cache API write succeeds.
      if (!await cacheFor(url).match(url, { ignoreVary: true })) throw new Error('Your browser could not keep a downloaded file.');
      return response;
    } finally {
      clearTimeout(timer); signal?.removeEventListener('abort', cancel);
    }
  }
  async function ensure(url, signal, force = false) {
    checkAbort(signal);
    if (!force) { const saved = await cached(url); if (saved) return saved; }
    let failure;
    for (let attempt = 0; attempt < 2; attempt++) {
      checkAbort(signal);
      try { return await requestFresh(url, signal); }
      catch (error) {
        failure = error;
        if (error.name === 'QuotaExceededError') { fatal = error; controller?.abort(); throw error; }
        if (signal?.aborted) throw fatal || aborted();
        if (error.status && error.status < 500) break;
      }
    }
    throw failure;
  }
  async function pool(items, handle, signal) {
    let cursor = 0;
    const errors = [];
    await Promise.all(Array.from({ length: Math.min(4, items.length) }, async () => {
      while (cursor < items.length && !signal?.aborted) {
        const item = items[cursor++];
        try { await handle(item); } catch (error) { errors.push({ item, error }); }
      }
    }));
    checkAbort(signal);
    return errors;
  }
  async function discoverShell(signal) {
    const paths = [...config.required];
    // Include the exact versioned scripts/styles used by both documents, not just
    // unversioned fallbacks. Relative URLs also work under /riftcraft/ on Pages.
    for (const filename of ['index.html', 'champion-roll.html']) {
      const url = new URL(filename, config.scope).href;
      const response = await ensure(url, signal);
      const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
      for (const node of doc.querySelectorAll('script[src], link[rel="stylesheet"], link[rel="manifest"], link[rel="apple-touch-icon"]')) {
        const resource = new URL(node.getAttribute('src') || node.getAttribute('href'), url);
        if (resource.href.startsWith(config.scope)) paths.push(resource.href);
      }
    }
    return unique(paths);
  }
  async function buildPlan(signal, update) {
    render('preparing', 'Preparing the file list…', 'Reading champion data before calculating the total. This can take a moment.', true);
    const previous = manifest;
    let patch = !update && previous ? previous.patch : null;
    if (!patch) {
      const versions = await (await ensure(VERSIONS, signal, true)).json();
      if (!Array.isArray(versions) || !validPatch(versions[0])) throw new Error('The champion version list could not be read.');
      patch = versions[0];
    }
    manifest = {
      schema: 1, build: config.build, patch, ready: false, planned: false, required: [], optionalMissing: [],
      fallbackPatch: previous?.ready ? previous.patch : previous?.fallbackPatch || null
    };
    await saveManifest();
    const shell = await discoverShell(signal);
    const rosterURL = `${CDN}/cdn/${patch}/data/en_US/champion.json`;
    const roster = await (await ensure(rosterURL, signal)).json();
    const ids = Object.keys(roster.data || {});
    if (!ids.length || ids.some(id => !/^[A-Za-z0-9]+$/.test(id))) throw new Error('The champion roster could not be read.');
    const dataURLs = ids.map(id => `${CDN}/cdn/${patch}/data/en_US/champion/${encodeURIComponent(id)}.json`);
    const images = [];
    let prepared = 0;
    const errors = await pool(ids, async id => {
      const url = `${CDN}/cdn/${patch}/data/en_US/champion/${encodeURIComponent(id)}.json`;
      const data = await (await ensure(url, signal)).json();
      const champ = data.data?.[id];
      if (!champ?.passive?.image?.full || !Array.isArray(champ.spells) || champ.spells.length < 4 || champ.spells.slice(0, 4).some(spell => !spell.image?.full)) {
        // Do not retain structurally incomplete champion data for the next retry.
        await dataCache.delete(url, { ignoreVary: true });
        throw new Error('Some champion details are incomplete. Retry the download.');
      }
      images.push(`${CDN}/cdn/${patch}/img/champion/${encodeURIComponent(id)}.png`);
      images.push(`${CDN}/cdn/${patch}/img/passive/${encodeURIComponent(champ.passive.image.full)}`);
      for (const spell of champ.spells.slice(0, 4)) images.push(`${CDN}/cdn/${patch}/img/spell/${encodeURIComponent(spell.image.full)}`);
      prepared++;
      render('preparing', `Preparing champions · ${number(prepared)} / ${number(ids.length)}`, `Patch ${patch}. Saved champion data is reused when you resume.`, true);
    }, signal);
    if (errors.length) throw errors[0].error;
    manifest.required = unique([...shell, VERSIONS, rosterURL, ...dataURLs, ...images]);
    manifest.champions = ids.length; manifest.planned = true;
    await saveManifest();
  }
  function packSummary() {
    return `Patch ${manifest.patch} · ${number(manifest.champions || 0)} champions · both pages`;
  }
  async function scan(signal, initial = false) {
    let count = 0, checked = 0;
    const missing = [];
    await pool(manifest.required, async url => {
      if (await cached(url)) count++; else missing.push(url);
      checked++;
      if (initial) done = count;
      render('checking', `Checking saved files · ${number(checked)} / ${number(total)}`, packSummary());
    }, signal).then(errors => { errors.forEach(entry => missing.push(entry.item)); });
    return { count, missing };
  }
  async function finishReady() {
    ready = true; done = total; manifest.ready = true;
    manifest.verifiedAt = Date.now(); manifest.build = config.build;
    await saveManifest();
    const missingSound = manifest.optionalMissing?.length;
    busy = false; checking = false;
    render('ready', `Ready offline · ${number(total)} / ${number(total)} files saved`,
      `${packSummary()}. A fresh offline draft uses this saved patch; older shared builds may need internet.` +
      (missingSound ? ' Optional Champion Roll sound is not saved; that page will be silent offline.' : ' Sounds are saved too.'));
    lastCheck = Date.now();
  }
  async function verifyStored() {
    if (!config || busy || checking) return;
    checking = true; ready = false; done = 0;
    try {
      manifest = await readManifest();
      if (!manifest) {
        total = 0; checking = false;
        render('idle', 'Offline files not downloaded', 'Download both pages, every champion and their artwork for one patch. Choose Wi-Fi if you have a limited data plan.');
        return;
      }
      if (!manifest.planned || !manifest.required.length) {
        total = 0; checking = false;
        render('paused', 'Preparation paused — resume when you are ready', `Patch ${manifest.patch}. Files already saved will not be downloaded again.`);
        return;
      }
      total = manifest.required.length;
      const result = await scan(null, true); done = result.count;
      if (!result.missing.length && manifest.build === config.build) {
        // Optional audio is reported separately; never promise it exists if it was evicted.
        manifest.optionalMissing = [];
        for (const url of config.optional) if (!await cached(url)) manifest.optionalMissing.push(url);
        await finishReady();
      } else {
        manifest.ready = false; await saveManifest(); checking = false;
        render('paused', `${number(done)} / ${number(total)} files saved — not ready yet`,
          manifest.build !== config.build ? 'A site update needs to be included. Resume to verify the updated file list.' : 'Some required files are missing or invalid. Resume online to repair only the missing files.');
      }
    } catch (error) {
      checking = false; ready = false;
      render('error', 'Offline files could not be verified', describeError(error));
    } finally { checking = false; lastCheck = Date.now(); }
  }

  async function download() {
    if (busy || checking || !config) return;
    if (!navigator.onLine) {
      await verifyStored();
      if (!ready) render('paused', 'Reconnect to continue downloading', 'Saved files are kept. Use Resume download when your connection is back.');
      return;
    }
    const update = ready;
    busy = true; ready = false; fatal = null; pauseReason = ''; controller = new AbortController();
    const signal = controller.signal;
    try {
      // Request protection from automatic storage eviction where the browser supports it.
      navigator.storage?.persist?.().catch(() => {});
      if (!manifest?.planned || manifest.build !== config.build || update) await buildPlan(signal, update);
      else { manifest.ready = false; await saveManifest(); }
      total = manifest.required.length; done = 0;
      render('downloading', `Saving files · 0 / ${number(total)}`, packSummary());
      const errors = await pool(manifest.required, async url => {
        await ensure(url, signal); done++;
        render('downloading', `Saving files · ${number(done)} / ${number(total)}`, packSummary());
      }, signal);
      if (errors.length) throw new Error(`${number(errors.length)} required file(s) could not be saved. ${describeError(errors[0].error)}`);
      manifest.optionalMissing = [];
      for (const url of config.optional) {
        try { await ensure(url, signal); }
        catch (error) { checkAbort(signal); manifest.optionalMissing.push(url); }
      }
      const result = await scan(signal);
      if (result.missing.length) {
        done = result.count;
        throw new Error('Some files disappeared from browser storage during verification. Free space, then resume.');
      }
      checkAbort(signal);
      await finishReady();
    } catch (error) {
      ready = false; busy = false;
      if (signal.aborted && !fatal) render('paused', pauseReason || 'Download paused', 'Your saved files are kept. Keep this page open when resuming the download.');
      else render('error', 'Not ready offline — download needs attention', describeError(fatal || error));
    } finally {
      busy = false; controller = null; ui.pause.hidden = true; ui.start.disabled = !config;
    }
  }
  function pause(reason = 'Download paused') {
    if (!busy) return;
    pauseReason = reason; controller?.abort(); ui.pause.disabled = true;
  }
  async function startDownload() {
    ui.pause.disabled = false;
    if (navigator.locks) {
      await navigator.locks.request('riftcrafter-offline-download', { ifAvailable: true }, async lock => {
        if (lock) await download();
        else ui.status.textContent = 'Another tab is downloading the offline pack. Finish or pause it there, then retry here.';
      });
    } else await download();
  }
  function workerMessage(worker) {
    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      const timeout = setTimeout(() => { channel.port1.close(); reject(new Error('The offline worker is updating. Reload this page, then try again.')); }, 8000);
      channel.port1.onmessage = event => { clearTimeout(timeout); channel.port1.close(); resolve(event.data); };
      worker.postMessage({ type: 'OFFLINE_CONFIG' }, [channel.port2]);
    });
  }
  async function initialize() {
    if (!window.isSecureContext || !('serviceWorker' in navigator) || !('caches' in window)) {
      render('unsupported', 'Offline storage is not supported here', 'Open the HTTPS site in a normal browser window. Local file:// pages cannot prepare an offline app.'); return;
    }
    try {
      render('checking', 'Checking offline support…', undefined, true);
      const registration = await navigator.serviceWorker.register('./sw.js');
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller || registration.installing) {
        await new Promise(resolve => {
          const timeout = setTimeout(finish, 10000);
          function finish() { clearTimeout(timeout); navigator.serviceWorker.removeEventListener('controllerchange', finish); resolve(); }
          navigator.serviceWorker.addEventListener('controllerchange', finish, { once: true });
        });
      }
      if (!navigator.serviceWorker.controller) throw new Error('The offline worker is not controlling this page yet. Reload once, then try again.');
      const worker = navigator.serviceWorker.controller;
      try { config = await workerMessage(worker); }
      catch (error) {
        if (navigator.serviceWorker.controller && navigator.serviceWorker.controller !== worker) config = await workerMessage(navigator.serviceWorker.controller);
        else throw error;
      }
      if (config?.schema !== 1 || !Array.isArray(config.required)) { config = null; throw new Error('The offline worker needs an update. Reload the page.'); }
      appCache = await caches.open(config.appCache); dataCache = await caches.open(config.dataCache);
      await verifyStored();
    } catch (error) {
      config = null; render('unsupported', 'Offline setup unavailable', describeError(error));
    }
  }
  ui.start.addEventListener('click', () => startDownload().catch(error => {
    busy = false; ready = false; render('error', 'Offline download could not start', describeError(error));
  }));
  ui.pause.addEventListener('click', () => pause());
  window.addEventListener('offline', () => { if (busy) pause('Download paused — connection lost'); else if (config) verifyStored(); });
  window.addEventListener('online', () => { if (config && !busy && !checking) verifyStored(); });
  window.addEventListener('pagehide', () => pause('Download paused when leaving the page'));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !busy && !checking && Date.now() - lastCheck > 60000) verifyStored();
  });
  initialize();
})();
