// Keyboard + pointer state for GLOWTIDE. The game loop reads this object and
// never touches DOM events directly, so the loop, the pause handling and the
// screenshot autopilot all steer through one input.
const GAME_KEYS = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space',
  'Enter', 'KeyR', 'KeyP', 'KeyM',
]);

export function createInput(canvas) {
  const keys = new Set();
  const justPressed = new Set();
  const pointer = { x: 0, y: 0, down: false, seen: false };

  function onKeyDown(event) {
    if (!GAME_KEYS.has(event.code)) return;
    event.preventDefault();
    if (!event.repeat) justPressed.add(event.code);
    keys.add(event.code);
  }

  function onKeyUp(event) {
    keys.delete(event.code);
  }

  function trackPointer(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 1280;
    pointer.y = ((event.clientY - rect.top) / rect.height) * 720;
    pointer.seen = true;
  }

  canvas.addEventListener('pointermove', trackPointer);
  canvas.addEventListener('pointerdown', (event) => {
    trackPointer(event);
    pointer.down = true;
  });
  window.addEventListener('pointerup', () => {
    pointer.down = false;
  });
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', () => keys.clear());

  return {
    keys,
    pointer,

    /** True once since the last frame the key went down (edge-triggered). */
    consume(code) {
      if (!justPressed.has(code)) return false;
      justPressed.delete(code);
      return true;
    },

    /** Call at the end of each frame: a press only counts for one frame. */
    endFrame() {
      justPressed.clear();
    },

    /** Movement axis from WASD / arrows, -1..1 on each axis, normalised. */
    axis() {
      let x = 0;
      let y = 0;
      if (keys.has('ArrowLeft') || keys.has('KeyA')) x -= 1;
      if (keys.has('ArrowRight') || keys.has('KeyD')) x += 1;
      if (keys.has('ArrowUp') || keys.has('KeyW')) y -= 1;
      if (keys.has('ArrowDown') || keys.has('KeyS')) y += 1;
      if (x !== 0 && y !== 0) {
        const len = Math.hypot(x, y);
        x /= len;
        y /= len;
      }
      return { x, y };
    },

    /** True while any movement key is held. */
    get steering() {
      return (
        keys.has('ArrowLeft') || keys.has('ArrowRight') ||
        keys.has('ArrowUp') || keys.has('ArrowDown') ||
        keys.has('KeyW') || keys.has('KeyA') ||
        keys.has('KeyS') || keys.has('KeyD')
      );
    },
  };
}
