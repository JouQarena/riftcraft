/* Independent, non-destructive first-visit walkthroughs. No game state is reset. */
(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const isRoll = document.body.classList.contains('rift-page--roll');
  const page = isRoll ? 'roll' : 'draft';
  const storageKey = `riftcrafter.guide.v1.${page}`;
  function readSeen() {
    for (const name of ['localStorage', 'sessionStorage']) {
      try { if (window[name].getItem(storageKey)) return true; } catch (_) {}
    }
    return false;
  }
  function markSeen() {
    for (const name of ['localStorage', 'sessionStorage']) {
      try { window[name].setItem(storageKey, 'seen'); } catch (_) {}
    }
  }
  function visible(node) { return !!node && !!node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden'; }
  function enabled(selector) { const node = $(selector); return visible(node) && !node.disabled; }
  const draftCount = () => document.querySelectorAll('.slot-pip.done').length;
  const rollCount = () => document.querySelectorAll('.ability-slot img').length;
  const draftComplete = () => visible($('#complete-panel'));
  const rollComplete = () => document.querySelectorAll('.ability-btn.used').length >= 5;
  const canChooseRoll = () => !!$('.final-winner-img') && !!$('.ability-btn:not(:disabled):not(.used)') && ($('#statusLbl')?.textContent || '').includes('pick an ability below');

  const draftSteps = [
    { id: 'welcome', title: 'Six picks. One champion.', copy: 'Keep a model, a passive and four abilities from different rolls. Let’s try one real pick together. Your choices stay in your draft.', next: 'Let’s try it' },
    { id: 'draft-roll', title: 'Roll a champion', copy: 'Click the highlighted button to reveal a random champion. You’ll keep just one part of their kit.', task: 'Your turn · Click Roll champion', target: '#roll-btn', practice: true },
    { id: 'draft-pick', title: 'Keep one part', copy: 'Choose any available slot: MODEL, PASSIVE, Q, W, E or R. Filled slots can’t be picked again.', task: 'Your turn · Click an available slot', target: '#draft-options', practice: true },
    { id: 'draft-build', title: 'Your build grows here', copy: 'Each pick fills this HUD and starts the next roll automatically. Fill all six slots. Undo Last Pick lets you correct a choice.', target: '#final-hud' },
    { id: 'draft-share', title: 'Six picks unlock sharing', copy: 'Once your build is complete, save a PNG, share the image, copy the build text or send a link to the exact same six picks.', target: '#build-actions' },
    { id: 'draft-install', title: 'Take your draft with you', copy: 'Use this panel to install the app on your device. Open it online first; offline play uses champion data and artwork already saved on that device.', target: '#download-panel' },
    { id: 'pages', title: 'Two ways to play', copy: 'Use this floating switch to open Champion Roll. That page has its own quick guide. Click the ? button whenever you want to see this guide again.', target: '.rift-island', next: 'Finish guide' }
  ];
  const rollSteps = [
    { id: 'welcome', title: 'Let the champions bounce.', copy: 'A 2.5-second roll leaves one champion in the frame. Keep a model or an ability, then roll again. Let’s try it without clearing your picks.', next: 'Let’s try it' },
    { id: 'roll-pick', title: 'Keep something you like', copy: 'Click MODEL for the portrait, or P, Q, W, E or R for an ability. Your choice stays in the frame and the next roll starts automatically.', task: 'Your turn · Choose a model or ability', target: '.controls-abilities', practice: true },
    { id: 'roll-frame', title: 'Your picks stay here', copy: 'The small icons are your saved picks; the floating portrait is the current champion. Pick each ability once, and choose MODEL before your final ability.', target: '#lolFrame', pad: 28 },
    { id: 'roll-speed', title: 'Try a faster bounce', copy: 'Speed switches the portraits between normal and fast movement. It starts a new roll and keeps your picks. The roll stays 2.5 seconds; the sound plays to the end.', task: 'Your turn · Click Speed', target: '#speedBtn', practice: true },
    { id: 'wall-side', title: 'Move the side walls', copy: 'Drag this gold wall inward or outward. Rolling portraits bounce at its visible edge. The opposite wall works the same way.', task: 'Your turn · Drag the highlighted wall', target: '#wallRight', practice: true, drag: true, pad: 5 },
    { id: 'wall-top', title: 'The top and bottom move too', copy: 'Drag the top wall down to change the play area. You can also move the bottom wall. The portraits stay inside all four walls.', task: 'Your turn · Drag the top wall', target: '#wallTop', practice: true, drag: true, pad: 5 },
    { id: 'roll-reset', title: 'Start fresh when you want', copy: 'Re-Roll clears your selected model and abilities, then starts a new sequence. We won’t press it for you — your current choices are safe.', target: '#actionBtn' },
    { id: 'pages', title: 'You’re ready to roll', copy: 'Switch back to Riftcrafter from here. Your two page guides are independent. Use the ? button to replay this guide any time.', target: '.rift-island', next: 'Finish guide' }
  ];
  const steps = isRoll ? rollSteps : draftSteps;
  const help = document.createElement('button');
  help.type = 'button'; help.className = 'rift-guide-help'; help.textContent = '?';
  help.setAttribute('aria-label', 'Show how to play'); help.title = 'How to play';
  document.body.appendChild(help);
  const root = document.createElement('div');
  root.id = 'rift-guide'; root.hidden = true;
  root.innerHTML = `
    <div class="rg-shade"></div><div class="rg-shade"></div><div class="rg-shade"></div><div class="rg-shade"></div>
    <div class="rg-highlight" aria-hidden="true"></div>
    <svg class="rg-arrow" aria-hidden="true"><defs><marker id="rg-arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M1 1 L6 4 L1 7" fill="none" stroke="#e7c681" stroke-width="1.5"/></marker></defs><path class="rg-line" marker-end="url(#rg-arrowhead)"/></svg>
    <section class="rg-card" role="dialog" aria-labelledby="rg-title" aria-describedby="rg-copy">
      <div class="rg-header"><span class="rg-label">${isRoll ? 'Champion Roll' : 'Riftcrafter'} · Quick start</span><span class="rg-count"></span></div>
      <div class="rg-progress" aria-hidden="true">${steps.map(() => '<span></span>').join('')}</div>
      <h2 class="rg-title" id="rg-title" tabindex="-1"></h2>
      <p class="rg-copy" id="rg-copy"></p><p class="rg-task" role="status" aria-live="polite"></p>
      <div class="rg-footer"><button class="rg-skip" type="button">Skip guide</button><button class="rg-step-skip" type="button">Skip this step</button><button class="rg-next" type="button">Next →</button></div>
    </section>`;
  document.body.appendChild(root);
  const find = selector => root.querySelector(selector);
  const card = find('.rg-card'), title = find('.rg-title'), copy = find('.rg-copy'), task = find('.rg-task');
  const nextButton = find('.rg-next'), skipStep = find('.rg-step-skip');
  const shades = [...root.querySelectorAll('.rg-shade')], ring = find('.rg-highlight'), arrow = find('.rg-line');
  let active = false, index = 0, step = null, target = null, interval = null, frame = null;
  let baseCount = 0, baseSpeed = '', draggedFrom = null, dragFinished = false, lastFocus = null;
  let rolled = false, rollPickClicked = false, lastText = '';
  const clamp = (v, low, high) => Math.max(low, Math.min(high, v));

  function close() {
    if (!active) return;
    active = false; markSeen(); clearInterval(interval); cancelAnimationFrame(frame); frame = null;
    root.hidden = true; help.hidden = false; target = null; draggedFrom = null;
    const focus = visible(lastFocus) ? lastFocus : help;
    try { focus.focus({ preventScroll: true }); } catch (_) {}
  }
  function start() {
    if (active) return;
    lastFocus = document.activeElement; active = true; markSeen(); help.hidden = true; root.hidden = false;
    enter(0);
    interval = setInterval(update, 120);
  }
  function enter(position) {
    if (!active) return;
    if (position >= steps.length) { close(); return; }
    index = position; step = steps[index]; root.dataset.step = step.id;
    baseCount = isRoll ? rollCount() : draftCount(); baseSpeed = $('#speedBtn')?.textContent || '';
    rolled = false; rollPickClicked = false; draggedFrom = null; dragFinished = false;
    title.textContent = step.title; copy.textContent = step.copy; lastText = '';
    find('.rg-count').textContent = `${String(index + 1).padStart(2, '0')} / ${String(steps.length).padStart(2, '0')}`;
    [...root.querySelectorAll('.rg-progress span')].forEach((node, i) => node.classList.toggle('rg-done', i <= index));
    nextButton.hidden = !!step.practice; skipStep.hidden = !step.practice;
    nextButton.textContent = step.next || 'Next →';
    target = null; card.scrollTop = 0;
    update();
    if (active) title.focus({ preventScroll: true });
  }
  function next() { enter(index + 1); }
  function update() {
    if (!active) return;
    let selector = step.target;
    let message = step.task || '';
    if (step.id === 'draft-roll') {
      if (draftComplete()) { enter(3); return; }
      if (enabled('.draft-option:not(:disabled)')) { next(); return; }
      if (visible($('#shuffle-display'))) rolled = true;
      if (visible($('#loading'))) {
        selector = '#loading'; message = 'Waiting for champion data. You can retry there, skip this step or skip the guide.';
      } else if (rolled || visible($('#shuffle-display'))) {
        selector = '#shuffle-display'; message = 'Rolling… Your choices will appear shortly.';
        if (!visible($('#shuffle-display'))) { selector = '#roll-btn'; message = 'The champion could not load. Try Roll champion again, or skip this step.'; rolled = false; }
      }
    }
    if (step.id === 'draft-pick') {
      if (draftCount() > baseCount) { next(); return; }
      if (draftComplete()) { next(); return; }
      if (innerHeight < 640 && enabled('.draft-option:not(:disabled)')) {
        selector = '.draft-option:not(:disabled)';
        message = 'Your turn · Try the highlighted slot';
      }
      if (!enabled('.draft-option:not(:disabled)')) {
        selector = visible($('#shuffle-display')) ? '#shuffle-display' : (visible($('#loading')) ? '#loading' : '#roll-btn');
        message = enabled('#roll-btn') ? 'Click Roll champion, then choose an available slot.' : 'Waiting for a champion… You can skip at any time.';
      }
    }
    if (step.id === 'roll-pick') {
      if (rollComplete() || rollCount() > baseCount || rollPickClicked) { next(); return; }
      if (!canChooseRoll()) { selector = '#lolFrame'; message = 'Watch the 2.5-second roll, then choose a model or ability below.'; }
    }
    if (step.id === 'roll-speed' && $('#speedBtn')?.textContent !== baseSpeed) { next(); return; }
    if (step.drag && dragFinished) { next(); return; }
    task.hidden = !message;
    if (message !== lastText) { task.textContent = message; lastText = message; }
    const node = selector ? $(selector) : null;
    const nextTarget = visible(node) ? node : null;
    if (nextTarget !== target) {
      target = nextTarget;
      if (target && !isRoll) target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
    }
    scheduleLayout();
  }

  function scheduleLayout() {
    if (!active || frame) return;
    frame = requestAnimationFrame(() => { frame = null; layout(); });
  }
  function box(node, x, y, width, height) {
    Object.assign(node.style, { left: `${x}px`, top: `${y}px`, width: `${Math.max(0, width)}px`, height: `${Math.max(0, height)}px` });
  }
  function layout() {
    if (!active) return;
    const w = innerWidth, h = innerHeight, margin = 12, gap = 26;
    card.style.maxHeight = `${h - margin * 2}px`;
    card.style.width = '336px';
    let cw = card.offsetWidth, ch = card.offsetHeight;
    let r = target?.getBoundingClientRect();
    if (r && (r.bottom <= 0 || r.top >= h || r.right <= 0 || r.left >= w)) r = null;
    if (!r) {
      box(shades[0], 0, 0, w, h); shades.slice(1).forEach(n => box(n, 0, 0, 0, 0));
      ring.hidden = true; arrow.setAttribute('d', '');
      card.style.left = `${(w - cw) / 2}px`; card.style.top = `${Math.max(margin, (h - ch) / 2)}px`; return;
    }
    const pad = step.pad ?? 8;
    const left = clamp(r.left - pad, 0, w), right = clamp(r.right + pad, 0, w);
    const top = clamp(r.top - pad, 0, h), bottom = clamp(r.bottom + pad, 0, h);
    box(shades[0], 0, 0, w, top); box(shades[1], 0, bottom, w, h - bottom);
    box(shades[2], 0, top, left, bottom - top); box(shades[3], right, top, w - right, bottom - top);
    ring.hidden = false; box(ring, left, top, right - left, bottom - top);
    // A thin side wall needs a slightly narrower card on phones, not a tiny scroll box.
    const sideSpace = Math.max(left, w - right) - gap - margin;
    if (bottom - top > h / 2 && right - left < 64 && sideSpace >= 220 && sideSpace < cw) {
      card.style.width = `${Math.floor(sideSpace)}px`;
      cw = card.offsetWidth; ch = card.offsetHeight;
    }
    const cx = (left + right) / 2, cy = (top + bottom) / 2;
    const xCenter = clamp(cx - cw / 2, margin, w - cw - margin);
    const yCenter = clamp(cy - ch / 2, margin, h - ch - margin);
    const candidates = [
      { side: 'below', x: xCenter, y: bottom + gap, fits: bottom + gap + ch <= h - margin },
      { side: 'above', x: xCenter, y: top - gap - ch, fits: top - gap - ch >= margin },
      { side: 'right', x: right + gap, y: yCenter, fits: right + gap + cw <= w - margin },
      { side: 'left', x: left - gap - cw, y: yCenter, fits: left - gap - cw >= margin }
    ];
    let place = candidates.find(c => c.fits);
    if (!place) {
      // On very short screens shrink the card into the largest free vertical space.
      const above = top - gap - margin, below = h - bottom - gap - margin;
      const side = below >= above ? 'below' : 'above';
      const available = Math.max(80, Math.max(above, below));
      card.style.maxHeight = `${available}px`;
      const height = card.offsetHeight;
      place = { side, x: xCenter, y: side === 'below' ? bottom + gap : top - gap - height };
    }
    const height = card.offsetHeight;
    place.x = clamp(place.x, margin, w - cw - margin); place.y = clamp(place.y, margin, h - height - margin);
    card.style.left = `${place.x}px`; card.style.top = `${place.y}px`;
    let sx, sy, ex, ey;
    if (place.side === 'below' || place.side === 'above') {
      sx = clamp(cx, place.x + 24, place.x + cw - 24); ex = clamp(sx, left + 3, right - 3);
      sy = place.side === 'below' ? place.y - 4 : place.y + height + 4;
      ey = place.side === 'below' ? bottom + 4 : top - 4;
    } else {
      sy = clamp(cy, place.y + 24, place.y + height - 24); ey = clamp(sy, top + 3, bottom - 3);
      sx = place.side === 'right' ? place.x - 4 : place.x + cw + 4;
      ex = place.side === 'right' ? right + 4 : left - 4;
    }
    arrow.setAttribute('d', `M ${sx} ${sy} Q ${(sx + ex) / 2 + (place.side === 'above' || place.side === 'below' ? 5 : 0)} ${(sy + ey) / 2} ${ex} ${ey}`);
  }

  help.addEventListener('click', start);
  help.addEventListener('keydown', event => event.stopPropagation());
  find('.rg-skip').addEventListener('click', close);
  skipStep.addEventListener('click', next);
  nextButton.addEventListener('click', next);
  root.addEventListener('keydown', event => {
    if (event.key !== 'Tab' && event.key !== 'Escape') event.stopPropagation();
  });
  // Track real game interactions without synthesizing clicks or changing saved picks.
  document.addEventListener('click', event => {
    if (!active || root.contains(event.target) || !target?.contains(event.target)) return;
    if (step.id === 'roll-pick' && canChooseRoll()) {
      const button = event.target.closest('.ability-btn, .model-btn');
      if (button && !button.disabled) {
        const currentIndex = index;
        setTimeout(() => { if (active && index === currentIndex) { rollPickClicked = true; update(); } }, 0);
      }
    }
  }, true);
  document.addEventListener('pointerdown', event => {
    if (!active || !step.drag || !target?.contains(event.target)) return;
    const rect = target.getBoundingClientRect();
    draggedFrom = { x: rect.x, y: rect.y, index };
  }, true);
  document.addEventListener('pointerup', () => {
    if (!active || !draggedFrom) return;
    const before = draggedFrom; draggedFrom = null;
    if (before.index !== index || !target) return;
    const after = target.getBoundingClientRect();
    dragFinished = Math.hypot(after.x - before.x, after.y - before.y) >= 8;
    if (dragFinished) setTimeout(update, 0);
  }, true);
  document.addEventListener('pointercancel', () => { draggedFrom = null; }, true);
  // Do not let game-level Space/Enter/R shortcuts run behind the guide.
  window.addEventListener('keydown', event => {
    if (!active) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close(); return; }
    const allowedTarget = !!step.practice && target?.contains(event.target);
    if (event.key === 'Tab') {
      const selector = 'button:not(:disabled), a[href], input:not(:disabled), [tabindex="0"]';
      const live = step.practice && target ? [target, ...target.querySelectorAll(selector)].filter(n => n.matches(selector) && visible(n)) : [];
      const choices = [...live, ...card.querySelectorAll('button')].filter(n => visible(n) && !n.disabled);
      if (choices.length) {
        event.preventDefault(); event.stopImmediatePropagation();
        let at = choices.indexOf(document.activeElement);
        at = (at + (event.shiftKey ? -1 : 1) + choices.length) % choices.length;
        choices[at].focus({ preventScroll: true });
      }
    } else if (!allowedTarget || root.contains(event.target)) {
      event.stopImmediatePropagation();
      // Keep Enter/Space native button activation inside the tutorial card.
      if (!root.contains(event.target)) event.preventDefault();
    }
  }, true);
  window.addEventListener('pagehide', close);
  window.addEventListener('resize', update);
  window.addEventListener('scroll', scheduleLayout, { capture: true, passive: true });
  window.visualViewport?.addEventListener('resize', scheduleLayout);
  if (!readSeen()) start();
})();
