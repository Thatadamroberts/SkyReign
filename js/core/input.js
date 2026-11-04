'use strict';
// Keyboard, mouse and touch input. Touch: drag anywhere on the canvas to steer.
(function (SR) {
  const Input = {
    keys: {},
    pressed: {},
    mouse: { x: 0, y: 0, down: false, inside: false },
    touch: { active: false, id: null, sx: 0, sy: 0, x: 0, y: 0 },

    init(canvas) {
      window.addEventListener('keydown', (e) => {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
        if (!this.keys[e.code]) this.pressed[e.code] = true;
        this.keys[e.code] = true;
        SR.Audio.init();
      });
      window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
      window.addEventListener('blur', () => { this.keys = {}; this.mouse.down = false; this.touch.active = false; });

      canvas.addEventListener('mousemove', (e) => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; this.mouse.inside = true; });
      canvas.addEventListener('mouseleave', () => { this.mouse.inside = false; this.mouse.down = false; });
      canvas.addEventListener('mousedown', (e) => { if (e.button === 0) this.mouse.down = true; SR.Audio.init(); });
      window.addEventListener('mouseup', (e) => { if (e.button === 0) this.mouse.down = false; });
      canvas.addEventListener('contextmenu', (e) => e.preventDefault());

      const opts = { passive: false };
      canvas.addEventListener('touchstart', (e) => {
        SR.Audio.init();
        const t = e.changedTouches[0];
        if (!this.touch.active) {
          this.touch.active = true; this.touch.id = t.identifier;
          this.touch.sx = this.touch.x = t.clientX; this.touch.sy = this.touch.y = t.clientY;
        }
        e.preventDefault();
      }, opts);
      canvas.addEventListener('touchmove', (e) => {
        for (const t of e.changedTouches) if (t.identifier === this.touch.id) { this.touch.x = t.clientX; this.touch.y = t.clientY; }
        e.preventDefault();
      }, opts);
      const end = (e) => { for (const t of e.changedTouches) if (t.identifier === this.touch.id) this.touch.active = false; };
      canvas.addEventListener('touchend', end);
      canvas.addEventListener('touchcancel', end);
    },

    // Movement vector, normalised
    axis() {
      const k = this.keys;
      let x = 0, y = 0;
      if (k.KeyA || k.ArrowLeft) x -= 1;
      if (k.KeyD || k.ArrowRight) x += 1;
      if (k.KeyW || k.ArrowUp) y -= 1;
      if (k.KeyS || k.ArrowDown) y += 1;
      if (this.touch.active) {
        const dx = this.touch.x - this.touch.sx, dy = this.touch.y - this.touch.sy;
        const d = Math.hypot(dx, dy);
        if (d > 8) { const m = Math.min(1, d / 60); x = dx / d * m; y = dy / d * m; return { x, y }; }
      }
      const l = Math.hypot(x, y);
      if (l > 0) { x /= l; y /= l; }
      return { x, y };
    },
    wasPressed(code) { if (this.pressed[code]) { this.pressed[code] = false; return true; } return false; },
    endFrame() { this.pressed = {}; },
  };
  SR.Input = Input;
})(window.SR);
