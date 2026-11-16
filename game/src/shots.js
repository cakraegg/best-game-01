// Staged screenshot scenes for GLOWTIDE v2: `?shot=<name>&seed=N`.
// Each scene builds a real game state from the seeded rng, freezes the sim,
// and raises window.__shotReady, so the same seed always yields the same
// frame. The cover is the densest frame in the game: the wave-10 final
// leviathan fight, mid-dash, mid-burst. The skiff is always placed in the
// open, so the cover shows the hero and not only the panels.
import { beginRun, seedTitle, tickSea, STEP, VIEW_W, VIEW_H } from './world.js';
import { BLESSINGS, TIDE } from './config.js';
import { between, wholeBetween } from './random.js';

const IDLE_DRIVER = {
  axis: () => ({ x: 0, y: 0 }),
  pointer: { down: false, seen: false },
  consume: () => false,
};

/** Title screen over a living sea, drifted a little so it breathes. */
export function stageTitle(sea) {
  seedTitle(sea);
  for (let i = 0; i < 120; i++) tickSea(sea, IDLE_DRIVER, STEP, null);
}

/** The cover: wave 10, the final leviathan at half health, the skiff
 *  dashing straight through it in the middle of a lantern burst. */
export function stageBoss(sea) {
  const rng = sea.rng;
  beginRun(sea);
  sea.wave = 10;
  sea.inWave = 12;
  sea.collected = 172;
  sea.score = 3120;
  sea.combo = 4;
  sea.comboTimer = 3;
  sea.maxCombo = 8;
  sea.playTime = 462;
  sea.lantern = 86;
  sea.lives = 3;
  sea.stats = { pearls: 172, urchins: 24, eels: 9, wraiths: 3, boss: 1, bursts: 5 };

  // The leviathan, centre frame, at half health, winding up its lunge.
  sea.boss = {
    x: 640, y: 330, vx: 0, vy: 0,
    hp: 12, maxHp: 24, r: TIDE.boss.radius,
    phase: 'windup', t: 0.5, cycleT: 2.5, lx: 540, ly: 330,
    angle: Math.PI, wobble: 0.4,
  };
  // The skiff, mid-dash through the boss, shield ring up — placed clear of
  // the boss's edge so the hero reads against the dark sea, not inside it.
  const p = sea.player;
  p.x = 545;
  p.y = 330;
  p.angle = 0;
  p.dashT = 0.12;
  p.dashX = 1;
  p.dashY = 0;
  p.coolT = 0;
  p.invT = 0.6;

  // A crowded sea: pearls, urchins, eels (two aiming), wraiths with fields.
  // Staged below the HUD's top band, so no orb sits on the score or lives.
  sea.pearls = [];
  for (let i = 0; i < 12; i++) {
    sea.pearls.push({
      x: between(rng, 80, VIEW_W - 80), y: between(rng, 170, VIEW_H - 80),
      r: 9, star: false, value: 10,
      phase: between(rng, 0, Math.PI * 2),
      vx: between(rng, -8, 8), vy: between(rng, -6, 6),
    });
  }
  for (let i = 0; i < 3; i++) {
    sea.pearls.push({
      x: between(rng, 200, VIEW_W - 200), y: between(rng, 170, VIEW_H - 120),
      r: 12, star: true, value: 25,
      phase: between(rng, 0, Math.PI * 2),
      vx: between(rng, -8, 8), vy: between(rng, -6, 6),
    });
  }
  sea.urchins = [];
  for (let i = 0; i < 4; i++) {
    sea.urchins.push({
      x: between(rng, 120, VIEW_W - 120), y: between(rng, 200, VIEW_H - 100),
      vx: between(rng, -20, 20), vy: between(rng, -20, 20),
      r: 16, phase: between(rng, 0, Math.PI * 2),
    });
  }
  sea.eels = [];
  for (let i = 0; i < 4; i++) {
    sea.eels.push({
      x: between(rng, 150, VIEW_W - 150), y: between(rng, 200, VIEW_H - 120),
      vx: 0, vy: 0, r: 14, phase: between(rng, 0, Math.PI * 2),
      state: i < 2 ? 'aim' : 'stalk', t: 0.4,
      dx: 0.7, dy: 0.2,
    });
  }
  sea.wraiths = [];
  for (let i = 0; i < 2; i++) {
    sea.wraiths.push({
      x: between(rng, 200, VIEW_W - 200), y: between(rng, 200, VIEW_H - 150),
      r: 18, phase: between(rng, 0, Math.PI * 2),
    });
  }
  // The lantern burst, frozen mid-flash, and the score floaters it made.
  for (let i = 0; i < 30; i++) {
    const a = between(rng, 0, Math.PI * 2);
    const v = between(rng, 60, 320);
    sea.sparks.push({
      x: p.x + Math.cos(a) * 30, y: p.y + Math.sin(a) * 30,
      vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      life: 0.6, maxLife: 0.8, size: between(rng, 2, 5),
      color: i % 3 === 0 ? TIDE.colors.amber : TIDE.colors.cyan,
    });
  }
  sea.floaters = [
    { x: 640, y: 250, text: 'HIT! +40', color: TIDE.colors.cyan, life: 1.1, maxLife: 1.1 },
    { x: 560, y: 420, text: 'LANTERN BURST +250', color: TIDE.colors.amber, life: 1.1, maxLife: 1.1 },
    { x: 900, y: 300, text: '+40', color: TIDE.colors.cyan, life: 1.1, maxLife: 1.1 },
  ];
  sea.banner = 'THE FINAL LEVIATHAN';
  sea.bannerT = 999;
}

/** The blessing choice after wave 3: three cards over a living sea. */
export function stageBlessing(sea) {
  const rng = sea.rng;
  beginRun(sea);
  sea.wave = 3;
  sea.inWave = 18;
  sea.collected = 54;
  sea.score = 1480;
  sea.combo = 3;
  sea.comboTimer = 2;
  sea.playTime = 188;
  sea.lantern = 40;
  sea.mode = 'blessing';
  sea.offer = [
    BLESSINGS.find((b) => b.id === 'swift-current'),
    BLESSINGS.find((b) => b.id === 'twin-tide'),
    BLESSINGS.find((b) => b.id === 'aegis-lantern'),
  ];
  sea.banner = 'PILIH BERKAH';
  sea.bannerT = 999;
  for (let i = 0; i < 6; i++) {
    sea.pearls.push({
      x: between(rng, 80, VIEW_W - 80), y: between(rng, 100, VIEW_H - 80),
      r: 9, star: false, value: 10,
      phase: between(rng, 0, Math.PI * 2),
      vx: between(rng, -8, 8), vy: between(rng, -6, 6),
    });
  }
}

/** The dawn victory: ten waves done, the full run table on the table. */
export function stageVictory(sea) {
  beginRun(sea);
  sea.mode = 'victory';
  sea.wave = 10;
  sea.inWave = 18;
  sea.collected = 214;
  sea.score = 4860;
  sea.best = 4860;
  sea.playTime = 462;
  sea.maxCombo = 8;
  sea.stats = { pearls: 214, urchins: 31, eels: 12, wraiths: 6, boss: 2, bursts: 5 };
}
