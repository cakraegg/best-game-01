// GLOWTIDE entry point: the frame loop, the title/play/pause/game-over
// states, and the screenshot modes (?shot=title|play|gameover&seed=N).
// The sim itself lives in world.js and runs on a fixed 1/60 step, so a
// screenshot run replays exactly while live play stays smooth.
import { createWorld, startRun, seedTitleScene, updateWorld, dropMineOnPlayer, STEP, VIEW_W, VIEW_H } from './world.js';
import { drawScene } from './render.js';
import { drawHud, drawTitle, drawPaused, drawGameOver } from './hud.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { makeRng } from './random.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || '20261116') || 20261116;
const shot = params.get('shot') || '';
const rng = makeRng(seed);
const world = createWorld(rng);
const input = createInput(canvas);
const sfx = createAudio();

// The autopilot steers the skiff at the nearest pearl. It drives the
// screenshot runs (real sim, real collects, real score) and the playtest;
// a human player never sees it.
function autopilotInput(reckless) {
  let target = null;
  let bestD = Infinity;
  for (const orb of world.orbs) {
    const d = Math.hypot(orb.x - world.player.x, orb.y - world.player.y);
    if (d < bestD) {
      bestD = d;
      target = orb;
    }
  }
  const axis = { x: 0, y: 0 };
  if (target) {
    const dx = target.x - world.player.x;
    const dy = target.y - world.player.y;
    const len = Math.hypot(dx, dy) || 1;
    axis.x = dx / len;
    axis.y = dy / len;
  }
  return {
    axis: () => axis,
    pointer: { down: false, seen: false, x: 0, y: 0 },
    consume: (code) => {
      if (!reckless && code === 'Space') {
        // Dash when a mine is close ahead of the skiff.
        for (const mine of world.mines) {
          const d = Math.hypot(mine.x - world.player.x, mine.y - world.player.y);
          if (d < 130) return true;
        }
      }
      return false;
    },
  };
}

const silentSfx = {
  collect: () => {},
  hit: () => {},
  wave: () => {},
  dash: () => {},
  click: () => {},
  over: () => {},
};

function stepOnce(driver, useSfx) {
  updateWorld(world, driver, STEP, useSfx ? sfx : silentSfx);
  input.endFrame();
}

function render() {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawScene(ctx, world);
  if (world.mode === 'play' || world.mode === 'paused') drawHud(ctx, world);
  if (world.mode === 'title') drawTitle(ctx, world);
  if (world.mode === 'paused') drawPaused(ctx);
  if (world.mode === 'over') drawGameOver(ctx, world);
}

// --- screenshot modes: fast-forward the real sim, then keep playing itself.
if (shot === 'title') {
  seedTitleScene(world);
} else if (shot === 'play') {
  startRun(world);
  for (let i = 0; i < 320; i++) stepOnce(autopilotInput(false), false);
} else if (shot === 'gameover') {
  startRun(world);
  let guard = 0;
  while (world.mode !== 'over' && guard < 3600) {
    stepOnce(autopilotInput(true), false);
    guard++;
  }
  // A reckless run should sink on its own; if it somehow survives, mines
  // dropped on the skiff finish it through the real collision path.
  while (world.mode !== 'over' && world.lives > 0) {
    dropMineOnPlayer(world);
    stepOnce(autopilotInput(true), false);
  }
  for (let i = 0; i < 40; i++) stepOnce(autopilotInput(true), false);
}

let last = performance.now();
let acc = 0;

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  const driver = shot ? autopilotInput(shot === 'gameover') : input;

  // Menu keys, handled here so the sim never sees them.
  if (world.mode === 'title' && (input.consume('Enter') || input.consume('Space'))) {
    sfx.unlock();
    sfx.click();
    startRun(world);
  } else if (world.mode === 'over' && (input.consume('KeyR') || input.consume('Enter') || input.consume('Space'))) {
    sfx.unlock();
    sfx.click();
    startRun(world);
  } else if (world.mode === 'play' && input.consume('KeyP')) {
    world.mode = 'paused';
  } else if (world.mode === 'paused' && input.consume('KeyP')) {
    world.mode = 'play';
  }
  if (input.consume('KeyM')) {
    const muted = sfx.toggleMute();
    if (!muted) sfx.click();
  }

  if (world.mode === 'play') {
    acc += dt;
    let n = 0;
    while (acc >= STEP && n < 5) {
      stepOnce(driver, true);
      acc -= STEP;
      n++;
    }
    if (n === 5) acc = 0;
  } else if (world.mode === 'title') {
    acc += dt;
    let n = 0;
    while (acc >= STEP && n < 5) {
      stepOnce(driver, false);
      acc -= STEP;
      n++;
    }
    if (n === 5) acc = 0;
  } else {
    // Paused / game over: particles and the clock still breathe.
    world.time += dt;
    input.endFrame();
  }
  render();
  requestAnimationFrame(frame);
}

canvas.addEventListener('pointerdown', () => {
  sfx.unlock();
  if (world.mode === 'title' || world.mode === 'over') {
    sfx.click();
    startRun(world);
  }
});
window.addEventListener('keydown', () => sfx.unlock(), { once: true });

// Test hook for the headless playtest: state, real key events, scripted steps.
window.__glowtide = {
  state() {
    return {
      mode: world.mode,
      score: world.score,
      best: world.best,
      lives: world.lives,
      wave: world.wave,
      combo: world.combo,
      collected: world.collected,
      orbs: world.orbs.length,
      mines: world.mines.length,
      playTime: Math.round(world.playTime * 10) / 10,
      player: { x: Math.round(world.player.x), y: Math.round(world.player.y) },
    };
  },
  start() {
    startRun(world);
  },
  key(code) {
    window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
  },
  hold(code, ms) {
    window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
    setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true })), ms);
  },
  autopilotSteps(n, reckless = false) {
    for (let i = 0; i < n; i++) stepOnce(autopilotInput(reckless), false);
  },
};

requestAnimationFrame(frame);
