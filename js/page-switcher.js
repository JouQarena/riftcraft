// Normal relative links work without JavaScript and on GitHub Pages subpaths.
(() => {
  const island = document.querySelector('.rift-island');
  if (!island) return;

  island.addEventListener('keydown', (event) => {
    // Keep page/game shortcuts from intercepting navigation keyboard input.
    event.stopPropagation();
    const link = event.target.closest('a');
    if (link && event.key === ' ') {
      event.preventDefault();
      link.click();
    }
  });
  island.addEventListener('click', (event) => {
    const link = event.target.closest('a');
    if (link?.getAttribute('aria-current') === 'page' &&
        !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
      event.preventDefault(); // Clicking the selected half must not restart a game.
    }
  });

  // The original page registers this worker through its install panel.
  // Register here too for visitors who open the new page directly.
  if (document.body.classList.contains('rift-page--roll') && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
})();
