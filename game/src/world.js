// The simulation of GLOWTIDE: one state object, one fixed-step update. The
// renderer only reads this state, it never mutates it, so the sim can run
// headless (screenshots, playtests) exactly as it runs in the browser.
import { range, intRange, chance } from './random.js';

export const VIEW_W = 1280;
export const VIEW_H = 720;
export const STEP = 1 / 60;

const COLLECTS_PER_WAVE = 18;
const MAX_COMBO = 8;
const COMBO_WINDOW = 4;
const DASH_TIME = 0.18;
const DASH_COOLDOWN = 2.5;
const HIT_INVULN = 2;

export function createWorld(rng) {
  const plankton = [];
  for (let i = 0; i < 90; i++) {
    plankton.push({
      x: range(rng, 0, VIEW_W),
      y: range(rng, 0, VIEW_H),
      r: range(rng, 0.8, 2.4),
      phase: range(rng, 0, Math.PI * 2),
      drift: range(rng, 4, 14),
    });
  }
  return {
    mode: 'title', // title | play | paused | over
    rng,
    time: 0,
    playTime: 0,
    score: 0,
    best: loadBest(),
    combo: 0,
    comboTimer: 0,
    lives: 3,
    wave: 1,
    collected: 0,
    orbs: [],
    mines: [],
    parts: [],
    plankton,
    banner: '',
    bannerT: 0,
    shake: 0,
    spawnT: 0,
    mineT: 0,
    player: {
      x: VIEW_W / 2,
      y: VIEW_H / 2,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      dashT: 0,
      dashX: 0,
      dashY: 0,
      coolT: 0,
      invT: 0,
      wakeT: 0,
    },
  };
}

function loadBest() {
  try {
    const v = Number(window.localStorage.getItem('glowtide-best'));
    return Number.isFinite(v) && v > 0 ? v : 0;
  } catch {
    return 0;
  }
}

function saveBest(score) {
  try {
    window.localStorage.setItem('glowtide-best', String(score));
  } catch {
    // Private mode or headless: the best score just lives for the session.
  }
}

/** A fresh run: player centred, a full orb field, a few mines, wave 1. */
export function startRun(world) {
  const { rng } = world;
  world.mode = 'play';
  world.playTime = 0;
  world.score = 0;
  world.combo = 0;
  world.comboTimer = 0;
  world.lives = 3;
  world.wave = 1;
  world.collected = 0;
  world.orbs = [];
  world.mines = [];
  world.parts = [];
  world.banner = 'GELOMBANG 1';
  world.bannerT = 2;
  world.shake = 0;
  world.spawnT = 0;
  world.mineT = 1.5;
  const p = world.player;
  p.x = VIEW_W / 2;
  p.y = VIEW_H / 2;
  p.vx = 0;
  p.vy = 0;
  p.angle = -Math.PI / 2;
  p.dashT = 0;
  p.coolT = 0;
  p.invT = 0;
  for (let i = 0; i < 16; i++) spawnOrb(world, rng);
  for (let i = 0; i < 3; i++) spawnMine(world, rng);
}

/** A decorative field for the title screen: orbs and mines drifting, no play. */
export function seedTitleScene(world) {
  const { rng } = world;
  world.orbs = [];
  world.mines = [];
  for (let i = 0; i < 14; i++) spawnOrb(world, rng);
  for (let i = 0; i < 4; i++) spawnMine(world, rng);
}

function farFromPlayer(world, x, y, minDist) {
  const p = world.player;
  return Math.hypot(x - p.x, y - p.y) >= minDist;
}

function spawnOrb(world, rng) {
  let x = 0;
  let y = 0;
  for (let tries = 0; tries < 12; tries++) {
    x = range(rng, 50, VIEW_W - 50);
    y = range(rng, 70, VIEW_H - 50);
    if (farFromPlayer(world, x, y, 130)) break;
  }
  const star = chance(rng, 0.12);
  world.orbs.push({
    x,
    y,
    r: star ? 12 : 9,
    star,
    value: star ? 25 : 10,
    phase: range(rng, 0, Math.PI * 2),
    vx: range(rng, -8, 8),
    vy: range(rng, -6, 6),
  });
}

function spawnMine(world, rng) {
  let x = 0;
  let y = 0;
  for (let tries = 0; tries < 12; tries++) {
    x = range(rng, 60, VIEW_W - 60);
    y = range(rng, 80, VIEW_H - 60);
    if (farFromPlayer(world, x, y, 200)) break;
  }
  const speed = range(rng, 18, 34) + world.wave * 3;
  const angle = range(rng, 0, Math.PI * 2);
  world.mines.push({
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    r: 16,
    phase: range(rng, 0, Math.PI * 2),
  });
}

function burst(world, x, y, color, n, speed) {
  for (let i = 0; i < n; i++) {
    if (world.parts.length > 320) world.parts.shift();
    const a = range(world.rng, 0, Math.PI * 2);
    const v = range(world.rng, speed * 0.3, speed);
    world.parts.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      life: range(world.rng, 0.35, 0.8),
      maxLife: 0.8,
      size: range(world.rng, 2, 5),
      color,
    });
  }
}

function waveUp(world, sfx) {
  world.wave += 1;
  const bonus = 100 * world.wave;
  world.score += bonus;
  world.banner = `GELOMBANG ${world.wave}  ·  +${bonus}`;
  world.bannerT = 2.2;
  for (let i = 0; i < 6; i++) spawnOrb(world, world.rng);
  if (sfx) sfx.wave();
}

function gameOver(world, sfx) {
  world.mode = 'over';
  if (world.score > world.best) {
    world.best = world.score;
    saveBest(world.best);
  }
  if (sfx) sfx.over();
}

/** One fixed step of the sim. `input` is the input object (or the autopilot's). */
export function updateWorld(world, input, dt, sfx) {
  world.time += dt;
  for (const dot of world.plankton) {
    dot.y += dot.drift * dt;
    dot.x += Math.sin(world.time * 0.4 + dot.phase) * 6 * dt;
    if (dot.y > VIEW_H + 4) {
      dot.y = -4;
      dot.x = range(world.rng, 0, VIEW_W);
    }
  }
  for (let i = world.parts.length - 1; i >= 0; i--) {
    const pt = world.parts[i];
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= Math.exp(-2.4 * dt);
    pt.vy *= Math.exp(-2.4 * dt);
    pt.life -= dt;
    if (pt.life <= 0) world.parts.splice(i, 1);
  }
  if (world.bannerT > 0) world.bannerT -= dt;
  if (world.shake > 0) world.shake = Math.max(0, world.shake - 40 * dt);

  if (world.mode === 'title') {
    for (const orb of world.orbs) {
      orb.phase += dt;
      orb.x += orb.vx * dt;
      orb.y += orb.vy * dt;
      if (orb.x < 30 || orb.x > VIEW_W - 30) orb.vx *= -1;
      if (orb.y < 60 || orb.y > VIEW_H - 30) orb.vy *= -1;
    }
    for (const mine of world.mines) {
      mine.phase += dt;
      mine.x += mine.vx * dt;
      mine.y += mine.vy * dt;
      if (mine.x < 30 || mine.x > VIEW_W - 30) mine.vx *= -1;
      if (mine.y < 60 || mine.y > VIEW_H - 30) mine.vy *= -1;
    }
    return;
  }
  if (world.mode !== 'play') return;

  world.playTime += dt;
  const p = world.player;
  const rng = world.rng;

  // --- steering: keyboard first, held pointer second.
  const axis = input.axis();
  const accel = 2600;
  if (axis.x !== 0 || axis.y !== 0) {
    p.vx += axis.x * accel * dt;
    p.vy += axis.y * accel * dt;
  } else if (input.pointer.down && input.pointer.seen) {
    const dx = input.pointer.x - p.x;
    const dy = input.pointer.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d > 12) {
      p.vx += (dx / d) * accel * 0.85 * dt;
      p.vy += (dy / d) * accel * 0.85 * dt;
    }
  }
  const drag = Math.exp(-3.1 * dt);
  p.vx *= drag;
  p.vy *= drag;
  const maxSpeed = 340 + world.wave * 8;
  const speed = Math.hypot(p.vx, p.vy);
  if (speed > maxSpeed) {
    p.vx = (p.vx / speed) * maxSpeed;
    p.vy = (p.vy / speed) * maxSpeed;
  }

  // --- dash: a burst with a short shield, then a cooldown.
  if (p.coolT > 0) p.coolT -= dt;
  if (p.dashT > 0) {
    p.dashT -= dt;
    p.vx = p.dashX * 900;
    p.vy = p.dashY * 900;
    if (world.parts.length < 300) {
      world.parts.push({
        x: p.x, y: p.y, vx: -p.dashX * 60, vy: -p.dashY * 60,
        life: 0.3, maxLife: 0.3, size: 4, color: '#37f2e2',
      });
    }
  } else if (input.consume('Space') && p.coolT <= 0) {
    let dx = axis.x;
    let dy = axis.y;
    if (dx === 0 && dy === 0) {
      dx = Math.cos(p.angle);
      dy = Math.sin(p.angle);
    }
    const len = Math.hypot(dx, dy) || 1;
    p.dashX = dx / len;
    p.dashY = dy / len;
    p.dashT = DASH_TIME;
    p.coolT = DASH_COOLDOWN;
    p.invT = Math.max(p.invT, 0.5);
    if (sfx) sfx.dash();
  }

  p.x += p.vx * dt;
  p.y += p.vy * dt;
  if (p.x < 24) { p.x = 24; p.vx = Math.abs(p.vx) * 0.4; }
  if (p.x > VIEW_W - 24) { p.x = VIEW_W - 24; p.vx = -Math.abs(p.vx) * 0.4; }
  if (p.y < 56) { p.y = 56; p.vy = Math.abs(p.vy) * 0.4; }
  if (p.y > VIEW_H - 24) { p.y = VIEW_H - 24; p.vy = -Math.abs(p.vy) * 0.4; }
  if (speed > 30) p.angle = Math.atan2(p.vy, p.vx);
  if (p.invT > 0) p.invT -= dt;

  // Wake: a fading trail while the skiff moves.
  p.wakeT -= dt;
  if (speed > 120 && p.wakeT <= 0) {
    p.wakeT = 0.05;
    if (world.parts.length < 300) {
      world.parts.push({
        x: p.x - Math.cos(p.angle) * 22 + range(rng, -4, 4),
        y: p.y - Math.sin(p.angle) * 22 + range(rng, -4, 4),
        vx: range(rng, -12, 12), vy: range(rng, -12, 12),
        life: 0.55, maxLife: 0.55, size: range(rng, 2, 4.5), color: '#2fd8c8',
      });
    }
  }

  // --- orbs: drift, magnet toward the skiff up close, collect on touch.
  const orbTarget = Math.min(14 + world.wave, 30);
  world.spawnT -= dt;
  if (world.orbs.length < orbTarget && world.spawnT <= 0) {
    world.spawnT = 0.45;
    spawnOrb(world, rng);
  }
  for (let i = world.orbs.length - 1; i >= 0; i--) {
    const orb = world.orbs[i];
    orb.phase += dt * 2;
    orb.x += orb.vx * dt;
    orb.y += orb.vy * dt;
    if (orb.x < 30 || orb.x > VIEW_W - 30) orb.vx *= -1;
    if (orb.y < 60 || orb.y > VIEW_H - 30) orb.vy *= -1;
    const dx = p.x - orb.x;
    const dy = p.y - orb.y;
    const d = Math.hypot(dx, dy);
    if (d < 90 && d > 1) {
      orb.x += (dx / d) * 240 * dt;
      orb.y += (dy / d) * 240 * dt;
    }
    if (d < 16 + orb.r + 6) {
      world.orbs.splice(i, 1);
      world.combo = Math.min(world.combo + 1, MAX_COMBO);
      world.comboTimer = COMBO_WINDOW;
      const gained = orb.value * world.combo;
      world.score += gained;
      world.collected += 1;
      burst(world, orb.x, orb.y, orb.star ? '#ffb454' : '#37f2e2', orb.star ? 14 : 9, 190);
      if (sfx) sfx.collect(world.combo);
      if (world.collected % COLLECTS_PER_WAVE === 0) waveUp(world, sfx);
    }
  }

  // --- combo decay: stop collecting for a while and the streak is gone.
  if (world.comboTimer > 0) {
    world.comboTimer -= dt;
    if (world.comboTimer <= 0) world.combo = 0;
  }

  // --- mines: drift, bounce, and cost a life on touch (unless shielded).
  const mineTarget = Math.min(3 + world.wave * 2, 16);
  world.mineT -= dt;
  if (world.mines.length < mineTarget && world.mineT <= 0) {
    world.mineT = Math.max(0.9, 2.2 - world.wave * 0.12);
    spawnMine(world, rng);
  }
  for (let i = world.mines.length - 1; i >= 0; i--) {
    const mine = world.mines[i];
    mine.phase += dt * 2;
    mine.x += mine.vx * dt;
    mine.y += mine.vy * dt;
    if (mine.x < 30 || mine.x > VIEW_W - 30) mine.vx *= -1;
    if (mine.y < 60 || mine.y > VIEW_H - 30) mine.vy *= -1;
    const d = Math.hypot(p.x - mine.x, p.y - mine.y);
    if (d < 16 + mine.r - 2 && p.invT <= 0) {
      world.mines.splice(i, 1);
      world.lives -= 1;
      world.combo = 0;
      world.comboTimer = 0;
      world.shake = 14;
      p.invT = HIT_INVULN;
      const kx = (p.x - mine.x) / (d || 1);
      const ky = (p.y - mine.y) / (d || 1);
      p.vx += kx * 520;
      p.vy += ky * 520;
      burst(world, mine.x, mine.y, '#ff3d7e', 22, 260);
      burst(world, p.x, p.y, '#ffb454', 10, 180);
      if (sfx) sfx.hit();
      if (world.lives <= 0) gameOver(world, sfx);
    }
  }
}

/** How far the player is into the current wave (0..1), for the HUD bar. */
export function waveProgress(world) {
  return (world.collected % COLLECTS_PER_WAVE) / COLLECTS_PER_WAVE;
}

/** mm:ss of the run clock. */
export function clockText(world) {
  const total = Math.floor(world.playTime);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Drop a mine exactly on the player (used only by the game-over screenshot run). */
export function dropMineOnPlayer(world) {
  world.mines.push({
    x: world.player.x,
    y: world.player.y,
    vx: 0,
    vy: 0,
    r: 16,
    phase: 0,
  });
}
