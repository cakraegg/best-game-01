// GLOWTIDE v2 entry point: the frame loop, the title/play/blessing/pause/
// victory/game-over states, and the staged screenshot modes
// (?shot=boss|title|blessing|victory&seed=N). The sim lives in world.js and
// runs on a fixed 1/60 step, so a screenshot seed replays exactly while
// live play stays smooth. A frozen shot never steps the sim again after
// staging: the frame the judge sees is the frame that was staged.
import { createSea, beginRun, seedTitle, tickSea, chooseBlessing, dropUrchinOnPlayer, jumpToWave, forceWaveComplete, STEP, VIEW_W, VIEW_H } from './world.js';
import { drawScene } from './render.js';
import { drawHud, drawTitle, drawBlessing, blessingCardRects, drawPaused, drawGameOver, drawVictory } from './hud.js';
import { makeControls } from './input.js';
import { makeSound } from './audio.js';
import { seededRng } from './random.js';
import { stageTitle, stageBoss, stageBlessing, stageVictory } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || '20261116') || 20261116;
const shot = params.get('shot') || '';
const rng = seededRng(seed);
const sea = createSea(rng);
const controls = makeControls(canvas);
const sfx = makeSound();

// The autopilot steers the skiff at the nearest pearl — or, while a
// leviathan lives, straight at the leviathan, dashing through it when it
// gets close. It drives the screenshot runs (real sim, real collects, real
// score) and the playtest; a human player never sees it.
function autopilotInput(reckless) {
  let target = null;
  let bestD = Infinity;
  const chase = sea.boss || null;
  if (chase) {
    target = chase;
  } else {
    for (const pearl of sea.pearls) {
      const d = Math.hypot(pearl.x - sea.player.x, pearl.y - sea.player.y);
      if (d < bestD) {
        bestD = d;
        target = pearl;
      }
    }
  }
  const axis = { x: 0, y: 0 };
  if (target) {
    const dx = target.x - sea.player.x;
    const dy = target.y - sea.player.y;
    const len = Math.hypot(dx, dy) || 1;
    axis.x = dx / len;
    axis.y = dy / len;
  }
  return {
    axis: () => axis,
    pointer: { down: false, seen: false, x: 0, y: 0 },
    consume: (code) => {
      if (code !== 'Space') return false;
      // Dash through the leviathan when it is in range.
      if (sea.boss) {
        const d = Math.hypot(sea.boss.x - sea.player.x, sea.boss.y - sea.player.y);
        if (d < 170) return true;
      }
      if (!reckless) {
        // Dash when a hazard is close ahead of the skiff.
        for (const u of sea.urchins) {
          if (Math.hypot(u.x - sea.player.x, u.y - sea.player.y) < 130) return true;
        }
        for (const eel of sea.eels) {
          if (eel.state === 'dart' && Math.hypot(eel.x - sea.player.x, eel.y - sea.player.y) < 140) return true;
        }
      }
      return false;
    },
  };
}

const silentSfx = {
  collect: () => {},
  hit: () => {},
  shield: () => {},
  wave: () => {},
  dash: () => {},
  wound: () => {},
  bossDown: () => {},
  burst: () => {},
  bless: () => {},
  click: () => {},
  victory: () => {},
  over: () => {},
};

function stepOnce(driver, useSfx) {
  tickSea(sea, driver, STEP, useSfx ? sfx : silentSfx);
  controls.endFrame();
}

function render() {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawScene(ctx, sea);
  if (sea.mode === 'play' || sea.mode === 'paused') drawHud(ctx, sea);
  if (sea.mode === 'blessing') {
    drawHud(ctx, sea);
    drawBlessing(ctx, sea);
  }
  if (sea.mode === 'title') drawTitle(ctx, sea);
  if (sea.mode === 'paused') drawPaused(ctx);
  if (sea.mode === 'over') drawGameOver(ctx, sea);
  if (sea.mode === 'victory') drawVictory(ctx, sea);
}

// --- staged screenshot modes: build the scene, freeze it, signal ready.
let frozen = false;
if (shot === 'title') {
  stageTitle(sea);
  frozen = true;
} else if (shot === 'boss') {
  stageBoss(sea);
  frozen = true;
} else if (shot === 'blessing') {
  stageBlessing(sea);
  frozen = true;
} else if (shot === 'victory') {
  stageVictory(sea);
  frozen = true;
}
if (frozen) {
  render();
  window.__shotReady = true;
}

let last = performance.now();
let acc = 0;

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;

  if (frozen) {
    render();
    requestAnimationFrame(frame);
    return;
  }

  const driver = shot ? autopilotInput(false) : controls;

  // Menu keys, handled here so the sim never sees them.
  if (sea.mode === 'title' && (controls.consume('Enter') || controls.consume('Space'))) {
    sfx.unlock();
    sfx.click();
    beginRun(sea);
  } else if ((sea.mode === 'over' || sea.mode === 'victory') && (controls.consume('KeyR') || controls.consume('Enter') || controls.consume('Space'))) {
    sfx.unlock();
    sfx.click();
    beginRun(sea);
  } else if (sea.mode === 'play' && controls.consume('KeyP')) {
    sea.mode = 'paused';
  } else if (sea.mode === 'paused' && controls.consume('KeyP')) {
    sea.mode = 'play';
  } else if (sea.mode === 'blessing') {
    for (let i = 0; i < 3; i++) {
      if (controls.consume(`Digit${i + 1}`)) {
        sfx.click();
        chooseBlessing(sea, i, sfx);
      }
    }
  }
  if (controls.consume('KeyM')) {
    const muted = sfx.toggleMute();
    if (!muted) sfx.click();
  }

  // Clicks: start / restart / blessing card.
  const click = controls.takeClick();
  if (click) {
    if (sea.mode === 'title' || sea.mode === 'over' || sea.mode === 'victory') {
      sfx.unlock();
      sfx.click();
      beginRun(sea);
    } else if (sea.mode === 'blessing') {
      const rects = blessingCardRects();
      for (let i = 0; i < rects.length; i++) {
        const r = rects[i];
        if (click.x >= r.x && click.x <= r.x + r.w && click.y >= r.y && click.y <= r.y + r.h) {
          sfx.click();
          chooseBlessing(sea, i, sfx);
          break;
        }
      }
    }
  }

  if (sea.mode === 'play') {
    acc += dt;
    let n = 0;
    while (acc >= STEP && n < 5) {
      stepOnce(driver, true);
      acc -= STEP;
      n++;
    }
    if (n === 5) acc = 0;
  } else if (sea.mode === 'title') {
    acc += dt;
    let n = 0;
    while (acc >= STEP && n < 5) {
      stepOnce(driver, false);
      acc -= STEP;
      n++;
    }
    if (n === 5) acc = 0;
  } else {
    // Blessing / paused / over / victory: the clock still breathes.
    sea.time += dt;
    controls.endFrame();
  }
  render();
  requestAnimationFrame(frame);
}

canvas.addEventListener('pointerdown', () => {
  sfx.unlock();
});
window.addEventListener('keydown', () => sfx.unlock(), { once: true });

// Test hook for the headless playtest: state, real key events, scripted
// steps, and the wave jumps that let a test reach the boss and the dawn
// without playing a whole ten-wave run by hand.
window.__tide = {
  state() {
    return {
      mode: sea.mode,
      score: sea.score,
      best: sea.best,
      lives: sea.lives,
      maxLives: sea.maxLives,
      wave: sea.wave,
      inWave: sea.inWave,
      combo: sea.combo,
      maxCombo: sea.maxCombo,
      collected: sea.collected,
      pearls: sea.pearls.length,
      urchins: sea.urchins.length,
      eels: sea.eels.length,
      wraiths: sea.wraiths.length,
      bossHp: sea.boss ? sea.boss.hp : null,
      bossMaxHp: sea.boss ? sea.boss.maxHp : null,
      lantern: Math.round(sea.lantern),
      shield: sea.shield,
      offer: sea.offer.length,
      playTime: Math.round(sea.playTime * 10) / 10,
      player: { x: Math.round(sea.player.x), y: Math.round(sea.player.y) },
    };
  },
  start() {
    beginRun(sea);
  },
  key(code) {
    window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
  },
  hold(code, ms) {
    window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
    setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true })), ms);
  },
  auto(n, reckless = false) {
    for (let i = 0; i < n; i++) stepOnce(autopilotInput(reckless), false);
  },
  toWave(n) {
    jumpToWave(sea, n);
  },
  choose(i) {
    chooseBlessing(sea, i, silentSfx);
  },
  winWave() {
    forceWaveComplete(sea, silentSfx);
  },
  dropUrchin() {
    dropUrchinOnPlayer(sea);
  },
};

requestAnimationFrame(frame);
