// The simulation of GLOWTIDE v2: one state object, one fixed-step update.
// The renderer only reads this state, it never mutates it, so the sim can
// run headless (screenshots, playtests) exactly as it runs in the browser.
//
// The run is a ten-wave voyage to dawn. Each wave asks for 18 tide pearls;
// waves 5 and 10 also ask for the Tide Leviathan, and only a dash through
// its body wounds it. After every wave but the last, the sea offers three
// blessings and the player keeps one. Three kinds of hazard stalk the skiff:
// urchin mines from wave 1, darting eels from wave 2, tide wraiths from
// wave 4. The lantern meter fills as pearls are gathered; a full lantern
// bursts and clears every hazard in reach.
import { between, wholeBetween, odds, chooseOne } from './random.js';
import { TIDE, BLESSINGS, isBossWave, bossHpFor } from './config.js';

export const VIEW_W = TIDE.view.w;
export const VIEW_H = TIDE.view.h;
export const STEP = 1 / 60;

/** One fresh sea: plankton drifting, nothing else yet. */
export function createSea(rng) {
  const plankton = [];
  for (let i = 0; i < 90; i++) {
    plankton.push({
      x: between(rng, 0, VIEW_W),
      y: between(rng, 0, VIEW_H),
      r: between(rng, 0.8, 2.4),
      phase: between(rng, 0, Math.PI * 2),
      drift: between(rng, 4, 14),
    });
  }
  return {
    mode: 'title', // title | play | blessing | paused | over | victory
    rng,
    time: 0,
    playTime: 0,
    score: 0,
    best: loadBest(),
    combo: 0,
    comboTimer: 0,
    maxCombo: 0,
    lives: 3,
    maxLives: 3,
    wave: 1,
    inWave: 0, // pearls gathered in this wave
    collected: 0, // pearls gathered in the whole run
    pearls: [],
    urchins: [],
    eels: [],
    wraiths: [],
    boss: null,
    sparks: [],
    floaters: [],
    plankton,
    banner: '',
    bannerT: 0,
    shakeT: 0,
    slowed: false,
    lantern: 0,
    shield: 0,
    gifts: { speed: false, twin: false, magnet: false, dashCd: false, aegis: false },
    offer: [],
    stats: { pearls: 0, urchins: 0, eels: 0, wraiths: 0, boss: 0, bursts: 0 },
    pearlT: 0,
    urchinT: 1.5,
    eelT: 2,
    wraithT: 3,
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

/** A fresh run: skiff centred, a full pearl field, a few urchins, wave 1. */
export function beginRun(sea) {
  const { rng } = sea;
  sea.mode = 'play';
  sea.playTime = 0;
  sea.score = 0;
  sea.combo = 0;
  sea.comboTimer = 0;
  sea.maxCombo = 0;
  sea.lives = 3;
  sea.maxLives = 3;
  sea.wave = 1;
  sea.inWave = 0;
  sea.collected = 0;
  sea.pearls = [];
  sea.urchins = [];
  sea.eels = [];
  sea.wraiths = [];
  sea.boss = null;
  sea.sparks = [];
  sea.floaters = [];
  sea.banner = 'GELOMBANG 1';
  sea.bannerT = 2;
  sea.shakeT = 0;
  sea.slowed = false;
  sea.lantern = 0;
  sea.shield = 0;
  sea.gifts = { speed: false, twin: false, magnet: false, dashCd: false, aegis: false };
  sea.offer = [];
  sea.stats = { pearls: 0, urchins: 0, eels: 0, wraiths: 0, boss: 0, bursts: 0 };
  sea.pearlT = 0;
  sea.urchinT = 1.5;
  sea.eelT = 2;
  sea.wraithT = 3;
  const p = sea.player;
  p.x = VIEW_W / 2;
  p.y = VIEW_H / 2;
  p.vx = 0;
  p.vy = 0;
  p.angle = -Math.PI / 2;
  p.dashT = 0;
  p.coolT = 0;
  p.invT = 0;
  for (let i = 0; i < 16; i++) spawnPearl(sea, rng);
  for (let i = 0; i < 3; i++) spawnUrchin(sea, rng);
}

/** A decorative field for the title screen: pearls and urchins drifting, no play. */
export function seedTitle(sea) {
  const { rng } = sea;
  sea.pearls = [];
  sea.urchins = [];
  for (let i = 0; i < 14; i++) spawnPearl(sea, rng);
  for (let i = 0; i < 4; i++) spawnUrchin(sea, rng);
}

function farFromSkiff(sea, x, y, minDist) {
  const p = sea.player;
  return Math.hypot(x - p.x, y - p.y) >= minDist;
}

function spawnPearl(sea, rng, star = null) {
  let x = 0;
  let y = 0;
  for (let tries = 0; tries < 12; tries++) {
    x = between(rng, 50, VIEW_W - 50);
    y = between(rng, 70, VIEW_H - 50);
    if (farFromSkiff(sea, x, y, 130)) break;
  }
  const isStar = star === null ? odds(rng, TIDE.pearls.starChance) : star;
  sea.pearls.push({
    x,
    y,
    r: isStar ? 12 : 9,
    star: isStar,
    value: isStar ? TIDE.pearls.starValue : TIDE.pearls.value,
    phase: between(rng, 0, Math.PI * 2),
    vx: between(rng, -8, 8),
    vy: between(rng, -6, 6),
  });
}

function spawnUrchin(sea, rng) {
  let x = 0;
  let y = 0;
  for (let tries = 0; tries < 12; tries++) {
    x = between(rng, 60, VIEW_W - 60);
    y = between(rng, 80, VIEW_H - 60);
    if (farFromSkiff(sea, x, y, 200)) break;
  }
  const speed = between(rng, TIDE.urchins.speedMin, TIDE.urchins.speedMax) + sea.wave * TIDE.urchins.speedPerWave;
  const angle = between(rng, 0, Math.PI * 2);
  sea.urchins.push({
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    r: TIDE.urchins.radius,
    phase: between(rng, 0, Math.PI * 2),
  });
}

function spawnEel(sea, rng) {
  let x = 0;
  let y = 0;
  for (let tries = 0; tries < 12; tries++) {
    x = between(rng, 70, VIEW_W - 70);
    y = between(rng, 90, VIEW_H - 70);
    if (farFromSkiff(sea, x, y, 260)) break;
  }
  sea.eels.push({
    x,
    y,
    vx: 0,
    vy: 0,
    r: TIDE.eels.radius,
    phase: between(rng, 0, Math.PI * 2),
    state: 'stalk',
    t: 0,
    dx: 0,
    dy: 0,
  });
}

function spawnWraith(sea, rng) {
  let x = 0;
  let y = 0;
  for (let tries = 0; tries < 12; tries++) {
    x = between(rng, 70, VIEW_W - 70);
    y = between(rng, 90, VIEW_H - 70);
    if (farFromSkiff(sea, x, y, 260)) break;
  }
  sea.wraiths.push({
    x,
    y,
    r: TIDE.wraiths.radius,
    phase: between(rng, 0, Math.PI * 2),
  });
}

function spawnBoss(sea) {
  const hp = bossHpFor(sea.wave);
  sea.boss = {
    x: VIEW_W / 2,
    y: 190,
    vx: 0,
    vy: 0,
    hp,
    maxHp: hp,
    r: TIDE.boss.radius,
    phase: 'drift',
    t: 0,
    cycleT: 2.5,
    lx: 0,
    ly: 0,
    angle: Math.PI / 2,
    wobble: 0,
  };
}

// A burst of glowing sparks at a point, for collects, hits and banishings.
function burst(sea, x, y, color, n, speed) {
  for (let i = 0; i < n; i++) {
    if (sea.sparks.length > 320) sea.sparks.shift();
    const a = between(sea.rng, 0, Math.PI * 2);
    const v = between(sea.rng, speed * 0.3, speed);
    sea.sparks.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      life: between(sea.rng, 0.35, 0.8),
      maxLife: 0.8,
      size: between(sea.rng, 2, 5),
      color,
    });
  }
}

// Floating score text that rises and fades: "+40", "HIT!", "AEGIS!"...
function floater(sea, x, y, text, color) {
  if (sea.floaters.length > 24) sea.floaters.shift();
  sea.floaters.push({ x, y, text, color, life: 1.1, maxLife: 1.1 });
}

// --- wave flow ------------------------------------------------------------

// The wave is done when the pearl quota is met and, on a boss wave, the
// leviathan is dead. Wave 10 ends the run at dawn; any other wave opens the
// blessing choice.
function checkWaveDone(sea, sfx) {
  if (sea.mode !== 'play') return;
  if (sea.inWave < TIDE.waves.quota) return;
  if (isBossWave(sea.wave) && sea.boss) return;
  if (sea.wave >= TIDE.waves.total) {
    winRun(sea, sfx);
    return;
  }
  sea.mode = 'blessing';
  sea.offer = rollOffer(sea);
  sea.banner = 'PILIH BERKAH';
  sea.bannerT = 999;
}

function winRun(sea, sfx) {
  sea.mode = 'victory';
  if (sea.score > sea.best) {
    sea.best = sea.score;
    saveBest(sea.best);
  }
  if (sfx) sfx.victory();
}

function endRun(sea, sfx) {
  sea.mode = 'over';
  if (sea.score > sea.best) {
    sea.best = sea.score;
    saveBest(sea.best);
  }
  if (sfx) sfx.over();
}

// Three distinct blessings the player does not already hold. Heartbloom
// stays on offer until the skiff carries five lives; lantern oil is always
// on offer, so the choice is never empty.
function rollOffer(sea) {
  const pool = BLESSINGS.filter((b) => {
    if (b.id === 'heartbloom') return sea.maxLives < 5;
    if (b.id === 'lantern-oil') return true;
    const key = blessingKey(b.id);
    return !sea.gifts[key];
  });
  const picked = [];
  const bag = [...pool];
  while (bag.length > 0 && picked.length < 3) {
    const i = wholeBetween(sea.rng, 0, bag.length - 1);
    picked.push(bag.splice(i, 1)[0]);
  }
  return picked;
}

function blessingKey(id) {
  return {
    'swift-current': 'speed',
    'twin-tide': 'twin',
    'aegis-lantern': 'aegis',
    'pearl-magnet': 'magnet',
    'swift-dash': 'dashCd',
  }[id];
}

/** Keep the offered blessing at index i, then open the next wave. */
export function chooseBlessing(sea, index, sfx) {
  if (sea.mode !== 'blessing') return;
  const picked = sea.offer[index];
  if (!picked) return;
  if (picked.id === 'heartbloom') {
    sea.maxLives = Math.min(5, sea.maxLives + 1);
    sea.lives = Math.min(sea.maxLives, sea.lives + 1);
  } else if (picked.id === 'lantern-oil') {
    sea.lantern = Math.min(100, sea.lantern + 50);
  } else {
    sea.gifts[blessingKey(picked.id)] = true;
    if (picked.id === 'aegis-lantern') sea.shield = 1;
  }
  if (sfx) sfx.bless();
  sea.offer = [];
  sea.wave += 1;
  sea.inWave = 0;
  sea.mode = 'play';
  sea.shield = sea.gifts.aegis ? 1 : 0;
  if (isBossWave(sea.wave)) {
    sea.banner = 'THE TIDE LEVIATHAN';
    spawnBoss(sea);
  } else {
    sea.banner = `GELOMBANG ${sea.wave}  ·  +${100 * sea.wave}`;
    sea.score += 100 * sea.wave;
  }
  sea.bannerT = 2.2;
  for (let i = 0; i < 6; i++) spawnPearl(sea, sea.rng);
}

// --- hurting and healing --------------------------------------------------

// The skiff takes a hit from direction (kx, ky). The aegis shield eats the
// first hit of a wave; otherwise a life is lost, the combo breaks, and the
// skiff is knocked back with a brief shield.
function hurtSkiff(sea, kx, ky, sfx) {
  const p = sea.player;
  if (p.invT > 0 || sea.mode !== 'play') return;
  if (sea.shield > 0) {
    sea.shield -= 1;
    p.invT = 1.2;
    floater(sea, p.x, p.y - 34, 'AEGIS!', TIDE.colors.amber);
    burst(sea, p.x, p.y, TIDE.colors.amber, 12, 180);
    if (sfx) sfx.shield();
    return;
  }
  sea.lives -= 1;
  sea.combo = 0;
  sea.comboTimer = 0;
  sea.shakeT = 14;
  p.invT = 2;
  p.vx += kx * 520;
  p.vy += ky * 520;
  burst(sea, p.x, p.y, TIDE.colors.rose, 22, 260);
  burst(sea, p.x, p.y, TIDE.colors.amber, 10, 180);
  if (sfx) sfx.hit();
  if (sea.lives <= 0) endRun(sea, sfx);
}

// A full lantern bursts: every hazard inside its radius is cleared, each one
// worth a little extra on top of the flat burst score.
function lanternBurst(sea, sfx) {
  const p = sea.player;
  const reach = TIDE.lantern.burstRadius;
  sea.lantern = 0;
  sea.stats.bursts += 1;
  let cleared = 0;
  const clearList = (list, statKey) => {
    for (let i = list.length - 1; i >= 0; i--) {
      const e = list[i];
      if (Math.hypot(e.x - p.x, e.y - p.y) <= reach + e.r) {
        burst(sea, e.x, e.y, TIDE.colors.cyan, 10, 200);
        sea.stats[statKey] += 1;
        cleared += 1;
        list.splice(i, 1);
      }
    }
  };
  clearList(sea.urchins, 'urchins');
  clearList(sea.eels, 'eels');
  clearList(sea.wraiths, 'wraiths');
  const gained = TIDE.lantern.burstScore + TIDE.lantern.perCleared * cleared;
  sea.score += gained;
  floater(sea, p.x, p.y - 40, `LANTERN BURST +${gained}`, TIDE.colors.amber);
  burst(sea, p.x, p.y, TIDE.colors.amber, 26, 320);
  sea.shakeT = 10;
  if (sfx) sfx.burst();
}

// A dash through the leviathan wounds it: one hit point, +40, and a knock
// back. When its hit points run out, the boss breaks apart.
function woundBoss(sea, sfx) {
  const boss = sea.boss;
  if (!boss) return;
  const p = sea.player;
  boss.hp -= 1;
  sea.score += TIDE.boss.hitScore;
  floater(sea, boss.x, boss.y - boss.r - 8, `HIT! +${TIDE.boss.hitScore}`, TIDE.colors.cyan);
  burst(sea, p.x, p.y, TIDE.colors.cyan, 14, 240);
  const kx = (boss.x - p.x) / (Math.hypot(boss.x - p.x, boss.y - p.y) || 1);
  const ky = (boss.y - p.y) / (Math.hypot(boss.x - p.x, boss.y - p.y) || 1);
  boss.x += kx * 26;
  boss.y += ky * 26;
  p.invT = Math.max(p.invT, 0.6);
  sea.shakeT = 8;
  if (sfx) sfx.wound();
  if (boss.hp <= 0) {
    sea.boss = null;
    sea.stats.boss += 1;
    sea.score += TIDE.boss.killScore;
    floater(sea, boss.x, boss.y - 60, `LEVIATHAN BANISHED +${TIDE.boss.killScore}`, TIDE.colors.gold);
    burst(sea, boss.x, boss.y, TIDE.colors.gold, 40, 340);
    burst(sea, boss.x, boss.y, TIDE.colors.violet, 24, 260);
    for (let i = 0; i < 3; i++) spawnPearl(sea, sea.rng, true);
    if (sfx) sfx.bossDown();
    checkWaveDone(sea, sfx);
  }
}

// --- the fixed step -------------------------------------------------------

/** The leviathan's drift / wind-up / lunge / recover cycle, one step. */
function stepBoss(sea, dt) {
  const boss = sea.boss;
  if (!boss) return;
  const p = sea.player;
  const cfg = TIDE.boss;
  boss.wobble += dt;
  if (boss.phase === 'drift') {
    const dx = p.x - boss.x;
    const dy = p.y - boss.y;
    const d = Math.hypot(dx, dy) || 1;
    boss.x += (dx / d) * cfg.driftSpeed * dt;
    boss.y += (dy / d) * cfg.driftSpeed * dt;
    boss.angle = Math.atan2(dy, dx);
    boss.cycleT -= dt;
    if (boss.cycleT <= 0) {
      boss.phase = 'windup';
      boss.t = cfg.windupTime;
      boss.lx = p.x;
      boss.ly = p.y;
    }
  } else if (boss.phase === 'windup') {
    boss.t -= dt;
    if (boss.t <= 0) {
      boss.phase = 'lunge';
      boss.t = cfg.lungeTime;
      const dx = boss.lx - boss.x;
      const dy = boss.ly - boss.y;
      const d = Math.hypot(dx, dy) || 1;
      boss.vx = (dx / d) * cfg.lungeSpeed;
      boss.vy = (dy / d) * cfg.lungeSpeed;
      boss.angle = Math.atan2(dy, dx);
    }
  } else if (boss.phase === 'lunge') {
    boss.x += boss.vx * dt;
    boss.y += boss.vy * dt;
    boss.t -= dt;
    if (boss.t <= 0) {
      boss.phase = 'recover';
      boss.t = cfg.recoverTime;
    }
  } else {
    boss.t -= dt;
    if (boss.t <= 0) {
      boss.phase = 'drift';
      boss.cycleT = cfg.cycleTime;
    }
  }
  if (boss.x < 60) { boss.x = 60; boss.vx = Math.abs(boss.vx) * 0.5; }
  if (boss.x > VIEW_W - 60) { boss.x = VIEW_W - 60; boss.vx = -Math.abs(boss.vx) * 0.5; }
  if (boss.y < 110) { boss.y = 110; boss.vy = Math.abs(boss.vy) * 0.5; }
  if (boss.y > VIEW_H - 60) { boss.y = VIEW_H - 60; boss.vy = -Math.abs(boss.vy) * 0.5; }
}

/** One fixed step of the sim. `driver` is the input object (or the autopilot's). */
export function tickSea(sea, driver, dt, sfx) {
  sea.time += dt;
  for (const dot of sea.plankton) {
    dot.y += dot.drift * dt;
    dot.x += Math.sin(sea.time * 0.4 + dot.phase) * 6 * dt;
    if (dot.y > VIEW_H + 4) {
      dot.y = -4;
      dot.x = between(sea.rng, 0, VIEW_W);
    }
  }
  for (let i = sea.sparks.length - 1; i >= 0; i--) {
    const sp = sea.sparks[i];
    sp.x += sp.vx * dt;
    sp.y += sp.vy * dt;
    sp.vx *= Math.exp(-2.4 * dt);
    sp.vy *= Math.exp(-2.4 * dt);
    sp.life -= dt;
    if (sp.life <= 0) sea.sparks.splice(i, 1);
  }
  for (let i = sea.floaters.length - 1; i >= 0; i--) {
    const fl = sea.floaters[i];
    fl.y -= 30 * dt;
    fl.life -= dt;
    if (fl.life <= 0) sea.floaters.splice(i, 1);
  }
  if (sea.bannerT > 0) sea.bannerT -= dt;
  if (sea.shakeT > 0) sea.shakeT = Math.max(0, sea.shakeT - 40 * dt);

  // The title sea just drifts; the blessing / pause / end screens breathe.
  if (sea.mode === 'title') {
    driftField(sea, dt);
    return;
  }
  if (sea.mode !== 'play') return;

  sea.playTime += dt;
  const p = sea.player;
  const rng = sea.rng;

  // --- steering: keyboard first, held pointer second.
  const axis = driver.axis();
  const accel = TIDE.skiff.accel;
  if (axis.x !== 0 || axis.y !== 0) {
    p.vx += axis.x * accel * dt;
    p.vy += axis.y * accel * dt;
  } else if (driver.pointer.down && driver.pointer.seen) {
    const dx = driver.pointer.x - p.x;
    const dy = driver.pointer.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d > 12) {
      p.vx += (dx / d) * accel * 0.85 * dt;
      p.vy += (dy / d) * accel * 0.85 * dt;
    }
  }
  const drag = Math.exp(-TIDE.skiff.drag * dt);
  p.vx *= drag;
  p.vy *= drag;

  // --- dash: a burst with a short shield, then a cooldown.
  const dashCd = dashCooldownFor(sea);
  if (p.coolT > 0) p.coolT -= dt;
  if (p.dashT > 0) {
    p.dashT -= dt;
    p.vx = p.dashX * TIDE.dash.speed;
    p.vy = p.dashY * TIDE.dash.speed;
    if (sea.sparks.length < 300) {
      sea.sparks.push({
        x: p.x, y: p.y, vx: -p.dashX * 60, vy: -p.dashY * 60,
        life: 0.3, maxLife: 0.3, size: 4, color: TIDE.colors.cyan,
      });
    }
  } else if (driver.consume('Space') && p.coolT <= 0) {
    let dx = axis.x;
    let dy = axis.y;
    if (dx === 0 && dy === 0) {
      dx = Math.cos(p.angle);
      dy = Math.sin(p.angle);
    }
    const len = Math.hypot(dx, dy) || 1;
    p.dashX = dx / len;
    p.dashY = dy / len;
    p.dashT = TIDE.dash.time;
    p.dashHit = false;
    p.coolT = dashCd;
    p.invT = Math.max(p.invT, TIDE.dash.shield);
    if (sfx) sfx.dash();
  }

  // The wraiths' still-water fields slow the skiff while it sits in one.
  sea.slowed = false;
  for (const w of sea.wraiths) {
    if (Math.hypot(p.x - w.x, p.y - w.y) < TIDE.wraiths.fieldRadius) {
      sea.slowed = true;
      break;
    }
  }
  let maxSpeed = TIDE.skiff.baseSpeed + sea.wave * TIDE.skiff.speedPerWave;
  if (sea.gifts.speed) maxSpeed *= 1.18;
  if (sea.slowed) maxSpeed *= TIDE.wraiths.slowFactor;
  const speed = Math.hypot(p.vx, p.vy);
  if (speed > maxSpeed) {
    p.vx = (p.vx / speed) * maxSpeed;
    p.vy = (p.vy / speed) * maxSpeed;
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
    if (sea.sparks.length < 300) {
      sea.sparks.push({
        x: p.x - Math.cos(p.angle) * 22 + between(rng, -4, 4),
        y: p.y - Math.sin(p.angle) * 22 + between(rng, -4, 4),
        vx: between(rng, -12, 12), vy: between(rng, -12, 12),
        life: 0.55, maxLife: 0.55, size: between(rng, 2, 4.5), color: '#2fd8c8',
      });
    }
  }

  // --- pearls: drift, magnet toward the skiff up close, collect on touch.
  const pearlTarget = Math.min(TIDE.pearls.targetBase + sea.wave, TIDE.pearls.targetCap);
  sea.pearlT -= dt;
  if (sea.pearls.length < pearlTarget && sea.pearlT <= 0) {
    sea.pearlT = 0.45;
    spawnPearl(sea, rng);
  }
  const magnetR = TIDE.pearls.magnet * (sea.gifts.magnet ? 2 : 1);
  for (let i = sea.pearls.length - 1; i >= 0; i--) {
    const pearl = sea.pearls[i];
    pearl.phase += dt * 2;
    pearl.x += pearl.vx * dt;
    pearl.y += pearl.vy * dt;
    if (pearl.x < 30 || pearl.x > VIEW_W - 30) pearl.vx *= -1;
    if (pearl.y < 60 || pearl.y > VIEW_H - 30) pearl.vy *= -1;
    const dx = p.x - pearl.x;
    const dy = p.y - pearl.y;
    const d = Math.hypot(dx, dy);
    if (d < magnetR && d > 1) {
      pearl.x += (dx / d) * 240 * dt;
      pearl.y += (dy / d) * 240 * dt;
    }
    if (d < 16 + pearl.r + 6) {
      sea.pearls.splice(i, 1);
      sea.combo = Math.min(sea.combo + 1, TIDE.pearls.maxCombo);
      sea.maxCombo = Math.max(sea.maxCombo, sea.combo);
      sea.comboTimer = TIDE.pearls.comboWindow;
      const mult = sea.gifts.twin ? 2 : 1;
      const gained = pearl.value * mult * sea.combo;
      sea.score += gained;
      sea.collected += 1;
      sea.inWave += 1;
      sea.stats.pearls += 1;
      sea.lantern = Math.min(100, sea.lantern + (pearl.star ? TIDE.lantern.perStar : TIDE.lantern.perPearl));
      burst(sea, pearl.x, pearl.y, pearl.star ? TIDE.colors.amber : TIDE.colors.cyan, pearl.star ? 14 : 9, 190);
      if (sfx) sfx.collect(sea.combo);
      if (sea.lantern >= 100) lanternBurst(sea, sfx);
      if (sea.mode === 'play') checkWaveDone(sea, sfx);
    }
  }

  // --- combo decay: stop collecting for a while and the streak is gone.
  if (sea.comboTimer > 0) {
    sea.comboTimer -= dt;
    if (sea.comboTimer <= 0) sea.combo = 0;
  }

  // --- urchins: drift, bounce, and cost a life on touch (unless shielded).
  const urchinTarget = Math.min(TIDE.urchins.base + sea.wave * TIDE.urchins.perWave, TIDE.urchins.cap);
  sea.urchinT -= dt;
  if (sea.urchins.length < urchinTarget && sea.urchinT <= 0) {
    sea.urchinT = Math.max(0.9, 2.2 - sea.wave * 0.12);
    spawnUrchin(sea, rng);
  }
  for (let i = sea.urchins.length - 1; i >= 0; i--) {
    const u = sea.urchins[i];
    u.phase += dt * 2;
    u.x += u.vx * dt;
    u.y += u.vy * dt;
    if (u.x < 30 || u.x > VIEW_W - 30) u.vx *= -1;
    if (u.y < 60 || u.y > VIEW_H - 30) u.vy *= -1;
    const d = Math.hypot(p.x - u.x, p.y - u.y);
    if (d < 16 + u.r - 2 && p.invT <= 0) {
      sea.urchins.splice(i, 1);
      const kx = (p.x - u.x) / (d || 1);
      const ky = (p.y - u.y) / (d || 1);
      hurtSkiff(sea, kx, ky, sfx);
    }
  }

  // --- eels: stalk, telegraph, dart, rest. A dash through one banishes it.
  if (sea.wave >= TIDE.eels.unlockWave) {
    const eelTarget = Math.min(sea.wave, TIDE.eels.cap);
    sea.eelT -= dt;
    if (sea.eels.length < eelTarget && sea.eelT <= 0) {
      sea.eelT = Math.max(1.2, 2.6 - sea.wave * 0.15);
      spawnEel(sea, rng);
    }
  }
  for (let i = sea.eels.length - 1; i >= 0; i--) {
    const eel = sea.eels[i];
    eel.phase += dt * 2;
    const d = Math.hypot(p.x - eel.x, p.y - eel.y);
    if (p.dashT > 0 && d < eel.r + 20) {
      sea.eels.splice(i, 1);
      sea.score += TIDE.eels.banishScore;
      sea.stats.eels += 1;
      floater(sea, eel.x, eel.y - 20, `BANISHED +${TIDE.eels.banishScore}`, TIDE.colors.cyan);
      burst(sea, eel.x, eel.y, TIDE.colors.cyan, 12, 220);
      continue;
    }
    if (eel.state === 'stalk') {
      const dx = p.x - eel.x;
      const dy = p.y - eel.y;
      const len = Math.hypot(dx, dy) || 1;
      eel.x += (dx / len) * TIDE.eels.stalkSpeed * dt;
      eel.y += (dy / len) * TIDE.eels.stalkSpeed * dt;
      if (d < TIDE.eels.triggerRange) {
        eel.state = 'aim';
        eel.t = TIDE.eels.aimTime;
        eel.dx = dx / len;
        eel.dy = dy / len;
      }
    } else if (eel.state === 'aim') {
      eel.t -= dt;
      if (eel.t <= 0) {
        eel.state = 'dart';
        eel.t = TIDE.eels.dartTime;
        eel.vx = eel.dx * TIDE.eels.dartSpeed;
        eel.vy = eel.dy * TIDE.eels.dartSpeed;
      }
    } else if (eel.state === 'dart') {
      eel.x += eel.vx * dt;
      eel.y += eel.vy * dt;
      eel.t -= dt;
      if (eel.t <= 0) {
        eel.state = 'rest';
        eel.t = TIDE.eels.restTime;
        eel.vx = 0;
        eel.vy = 0;
      }
    } else {
      eel.t -= dt;
      if (eel.t <= 0) eel.state = 'stalk';
    }
    if (eel.x < 24 || eel.x > VIEW_W - 24) eel.x = Math.max(24, Math.min(VIEW_W - 24, eel.x));
    if (eel.y < 56 || eel.y > VIEW_H - 24) eel.y = Math.max(56, Math.min(VIEW_H - 24, eel.y));
    if (d < eel.r + 16 && p.invT <= 0 && p.dashT <= 0) {
      const kx = (p.x - eel.x) / (d || 1);
      const ky = (p.y - eel.y) / (d || 1);
      hurtSkiff(sea, kx, ky, sfx);
    }
  }

  // --- wraiths: slow drifters with a still-water field. A dash banishes them.
  if (sea.wave >= TIDE.wraiths.unlockWave) {
    const wraithTarget = Math.min(sea.wave - 3, TIDE.wraiths.cap);
    sea.wraithT -= dt;
    if (sea.wraiths.length < wraithTarget && sea.wraithT <= 0) {
      sea.wraithT = 3.0;
      spawnWraith(sea, rng);
    }
  }
  for (let i = sea.wraiths.length - 1; i >= 0; i--) {
    const w = sea.wraiths[i];
    w.phase += dt * 2;
    const d = Math.hypot(p.x - w.x, p.y - w.y);
    if (p.dashT > 0 && d < w.r + 20) {
      sea.wraiths.splice(i, 1);
      sea.score += TIDE.wraiths.banishScore;
      sea.stats.wraiths += 1;
      floater(sea, w.x, w.y - 20, `BANISHED +${TIDE.wraiths.banishScore}`, TIDE.colors.violet);
      burst(sea, w.x, w.y, TIDE.colors.violet, 12, 220);
      continue;
    }
    const dx = p.x - w.x;
    const dy = p.y - w.y;
    const len = Math.hypot(dx, dy) || 1;
    w.x += (dx / len) * TIDE.wraiths.speed * dt;
    w.y += (dy / len) * TIDE.wraiths.speed * dt;
    if (d < w.r + 16 && p.invT <= 0 && p.dashT <= 0) {
      const kx = (p.x - w.x) / (d || 1);
      const ky = (p.y - w.y) / (d || 1);
      hurtSkiff(sea, kx, ky, sfx);
    }
  }

  // --- the leviathan: its cycle, its wound, its touch.
  if (sea.boss) {
    stepBoss(sea, dt);
    const boss = sea.boss;
    if (boss) {
      const d = Math.hypot(p.x - boss.x, p.y - boss.y);
      if (p.dashT > 0 && !p.dashHit && d < boss.r + 20) {
        p.dashHit = true;
        woundBoss(sea, sfx);
      } else if (d < boss.r + 18 && p.invT <= 0 && p.dashT <= 0) {
        const kx = (p.x - boss.x) / (d || 1);
        const ky = (p.y - boss.y) / (d || 1);
        hurtSkiff(sea, kx, ky, sfx);
      }
    }
  }
}

// The title sea drifts on its own: pearls and urchins wander and bounce.
function driftField(sea, dt) {
  for (const pearl of sea.pearls) {
    pearl.phase += dt;
    pearl.x += pearl.vx * dt;
    pearl.y += pearl.vy * dt;
    if (pearl.x < 30 || pearl.x > VIEW_W - 30) pearl.vx *= -1;
    if (pearl.y < 60 || pearl.y > VIEW_H - 30) pearl.vy *= -1;
  }
  for (const u of sea.urchins) {
    u.phase += dt;
    u.x += u.vx * dt;
    u.y += u.vy * dt;
    if (u.x < 30 || u.x > VIEW_W - 30) u.vx *= -1;
    if (u.y < 60 || u.y > VIEW_H - 30) u.vy *= -1;
  }
}

/** The dash cooldown right now, with the Swift Dash blessing applied. */
export function dashCooldownFor(sea) {
  return TIDE.dash.cooldown * (sea.gifts.dashCd ? 0.65 : 1);
}

/** How far the player is into the current wave (0..1), for the HUD bar. */
export function waveProgress(sea) {
  return sea.inWave / TIDE.waves.quota;
}

/** mm:ss of the run clock. */
export function clockText(sea) {
  const total = Math.floor(sea.playTime);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Drop an urchin exactly on the skiff (used only by the game-over shot). */
export function dropUrchinOnPlayer(sea) {
  sea.urchins.push({
    x: sea.player.x,
    y: sea.player.y,
    vx: 0,
    vy: 0,
    r: TIDE.urchins.radius,
    phase: 0,
  });
}

// --- test hooks (headless playtest only; never called by the game itself) ---

/** Jump the run to wave n (spawning the leviathan on a boss wave). */
export function jumpToWave(sea, n) {
  sea.wave = n;
  sea.inWave = 0;
  sea.mode = 'play';
  sea.boss = null;
  if (isBossWave(n)) {
    sea.banner = 'THE TIDE LEVIATHAN';
    spawnBoss(sea);
  } else {
    sea.banner = `GELOMBANG ${n}`;
  }
  sea.bannerT = 2;
}

/** Complete the current wave through the real path (wound a living boss,
 *  or finish the quota), so a test can reach the blessing and the dawn. */
export function forceWaveComplete(sea, sfx) {
  sea.inWave = TIDE.waves.quota;
  if (sea.boss) {
    sea.boss.hp = 1;
    woundBoss(sea, sfx);
  } else {
    checkWaveDone(sea, sfx);
  }
}


