// Keyboard + pointer state for GLOWTIDE v2. The loop reads this object and
// never touches DOM events directly, so live play, the pause handling, the
// blessing choice and the screenshot autopilot all steer through one input.
// Keys are edge-triggered through consume(): a press counts for exactly one
// frame, then it is gone.
const PLAY_KEYS = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space',
  'Enter', 'KeyR', 'KeyP', 'KeyM',
  'Digit1', 'Digit2', 'Digit3',
]);

export function makeControls(canvas) {
  const held = new Set();
  const pressed = new Set();
  const pointer = { x: 0, y: 0, down: false, seen: false };
  let clickAt = null;

  function onKeyDown(event) {
    if (!PLAY_KEYS.has(event.code)) return;
    event.preventDefault();
    if (!event.repeat) pressed.add(event.code);
    held.add(event.code);
  }

  function onKeyUp(event) {
    held.delete(event.code);
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
    clickAt = { x: pointer.x, y: pointer.y };
  });
  window.addEventListener('pointerup', () => {
    pointer.down = false;
  });
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', () => held.clear());

  return {
    held,
    pointer,

    /** True once since the last frame the key went down. */
    consume(code) {
      if (!pressed.has(code)) return false;
      pressed.delete(code);
      return true;
    },

    /** The latest click position, once — then it is gone. */
    takeClick() {
      const at = clickAt;
      clickAt = null;
      return at;
    },

    /** Call at the end of each frame: a press only counts for one frame. */
    endFrame() {
      pressed.clear();
    },

    /** Movement axis from WASD / arrows, -1..1 on each axis, normalised. */
    axis() {
      let x = 0;
      let y = 0;
      if (held.has('ArrowLeft') || held.has('KeyA')) x -= 1;
      if (held.has('ArrowRight') || held.has('KeyD')) x += 1;
      if (held.has('ArrowUp') || held.has('KeyW')) y -= 1;
      if (held.has('ArrowDown') || held.has('KeyS')) y += 1;
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
        held.has('ArrowLeft') || held.has('ArrowRight') ||
        held.has('ArrowUp') || held.has('ArrowDown') ||
        held.has('KeyW') || held.has('KeyA') ||
        held.has('KeyS') || held.has('KeyD')
      );
    },
  };
}
