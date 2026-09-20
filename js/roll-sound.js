// Champion Roll only. Start with the roll, then let the full clip finish naturally.
(() => {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  let context = null;
  let buffer = null;
  let source = null;
  let rollStartedAt = null;
  let loaded = false;
  try { if (AudioContextClass) context = new AudioContextClass(); } catch (_) {}

  const ready = (async () => {
    if (!context) return;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch('./sounds/rollsond.mp3', { signal: controller.signal });
      if (!response.ok) return;
      const decoded = await context.decodeAudioData(await response.arrayBuffer());
      if (Number.isFinite(decoded.duration) && decoded.duration > 0) buffer = decoded;
    } catch (_) {
      // Missing/invalid audio or offline without a saved copy must not break the game.
    } finally {
      clearTimeout(timer);
    }
  })().finally(() => { loaded = true; });

  function stop() {
    rollStartedAt = null;
    if (!source) return;
    const previous = source;
    source = null;
    try { previous.stop(); } catch (_) {}
    previous.disconnect();
  }

  function playIfAllowed() {
    if (!context || context.state !== 'running' || !buffer || source || rollStartedAt === null) return;
    // If the user unlocks audio during the first auto-roll, join at its current
    // position rather than restarting the clip late.
    const offset = Math.max(0, (performance.now() - rollStartedAt) / 1000);
    const remaining = buffer.duration - offset;
    if (remaining <= 0) return;
    const next = context.createBufferSource();
    next.buffer = buffer;
    next.connect(context.destination);
    source = next;
    next.onended = () => {
      next.disconnect();
      if (source === next) { source = null; rollStartedAt = null; }
    };
    // Do not truncate to the animation length: the remaining clip plays at normal pitch.
    next.start(0, offset, remaining);
  }

  function unlock() {
    if (!context) return;
    if (context.state === 'running') { playIfAllowed(); return; }
    // Called inside a real gesture; delayed auto-rolls then reuse this context.
    context.resume().then(playIfAllowed).catch(() => {});
  }
  document.addEventListener('pointerdown', unlock, { capture: true, passive: true });
  document.addEventListener('keydown', unlock, { capture: true });
  document.addEventListener('click', unlock, { capture: true });
  window.addEventListener('pagehide', stop);

  window.RiftRollSound = {
    ready,
    get loaded() { return loaded; },
    durationMs() { return 2500; },
    start() {
      stop();
      rollStartedAt = performance.now();
      playIfAllowed();
      return rollStartedAt;
    },
    stop
  };
})();
