'use strict';
// Entry point.
window.addEventListener('DOMContentLoaded', () => {
  // Wait briefly for the display font so canvas text uses it, but never block on it.
  const start = () => { if (!window.SR.Game.state || window.SR.Game.state === 'boot') window.SR.Game.init(); };
  if (document.fonts && document.fonts.ready) {
    Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 800))]).then(start);
  } else start();
});
