// GLOWTIDE v2 — every number the game balances on lives in this one file.
//
// The sea's palette, the skiff's feel, the wave table, the blessings and the
// Tide Leviathan are all tuned from here, so a balance change is a single
// edit instead of a hunt through the simulation. This file holds data only:
// no function here runs the game, and nothing in the sim hard-codes a number
// that belongs below.

export const TIDE = {
  view: { w: 1280, h: 720 },

  colors: {
    abyss: '#050914',
    deep: '#0a2436',
    floor: '#071426',
    cyan: '#37f2e2',
    cyanSoft: '#7fd9cf',
    ink: '#e8fbff',
    amber: '#ffb454',
    amberPale: '#fff3d6',
    gold: '#ffd166',
    rose: '#ff3d7e',
    roseDark: '#2a0a24',
    teal: '#0f4c5c',
    tealLine: '#9ff5ea',
    violet: '#a78bfa',
    violetDeep: '#5b21b6',
  },

  // The lantern-skiff: how it accelerates, how drag bleeds speed off, how
  // fast it may go. Speed grows a little with every wave.
  skiff: { accel: 2600, drag: 3.1, baseSpeed: 340, speedPerWave: 8, radius: 22 },

  // The dash: a short burst with a brief shield, then a cooldown. Dashing
  // through the leviathan is the only way to wound it, and dashing through
  // an eel or a wraith banishes it.
  dash: { time: 0.18, cooldown: 2.5, speed: 900, shield: 0.5 },

  // Tide pearls: the wave quota, their value, the combo that multiplies it,
  // and the magnet that pulls near pearls toward the skiff.
  pearls: {
    perWave: 18,
    value: 10,
    starValue: 25,
    starChance: 0.12,
    magnet: 90,
    comboWindow: 4,
    maxCombo: 8,
    targetBase: 14,
    targetCap: 30,
  },

  // Urchin mines: drifting spiked balls. They bounce off the walls and cost
  // a life on touch. Their count grows with the wave.
  urchins: { base: 3, perWave: 2, cap: 16, radius: 16, speedMin: 18, speedMax: 34, speedPerWave: 3 },

  // Darting eels: they stalk, flash a telegraph, then dart in a straight
  // line. They unlock on wave 2.
  eels: {
    unlockWave: 2,
    base: 1,
    cap: 8,
    radius: 14,
    stalkSpeed: 70,
    dartSpeed: 520,
    aimTime: 0.5,
    dartTime: 0.45,
    restTime: 0.9,
    triggerRange: 320,
    banishScore: 25,
  },

  // Tide wraiths: slow drifters that drag a field of still water behind
  // them; inside the field the skiff is sluggish. They unlock on wave 4.
  wraiths: {
    unlockWave: 4,
    base: 1,
    cap: 5,
    radius: 18,
    speed: 46,
    fieldRadius: 80,
    slowFactor: 0.55,
    banishScore: 25,
  },

  // The lantern meter: pearls fill it, and a full meter bursts, clearing
  // every hazard inside its radius. The boss is untouched by the burst —
  // only a dash wounds it.
  lantern: { perPearl: 6, perStar: 12, burstRadius: 260, burstScore: 150, perCleared: 15 },

  // The Tide Leviathan: the boss of waves 5 and 10. It drifts toward the
  // skiff, winds up with a flash, then lunges. Touching it costs a life;
  // dashing through it is the only wound.
  boss: {
    waves: [5, 10],
    hp: { 5: 18, 10: 24 },
    radius: 46,
    driftSpeed: 42,
    windupTime: 0.8,
    lungeTime: 0.5,
    lungeSpeed: 460,
    recoverTime: 1.0,
    cycleTime: 3.5,
    hitScore: 40,
    killScore: 500,
  },

  waves: { total: 10, quota: 18 },
};

// The seven blessings. One of three is offered after every completed wave
// (waves 1–9); the player keeps one. None of them is a trap: each one makes
// the run plainly stronger, so the choice is about play style, not about
// dodging a bad pick.
export const BLESSINGS = [
  { id: 'swift-current', name: 'Arus Cepat', line: '+18% kecepatan skiff', detail: 'Berlayar lebih cepat di semua gelombang.' },
  { id: 'twin-tide', name: 'Pasang Kembar', line: 'Nilai mutiara berlipat dua', detail: 'Setiap mutiara bernilai dua kali lipat.' },
  { id: 'aegis-lantern', name: 'Lentera Aegis', line: 'Perisai 1 pukulan tiap gelombang', detail: 'Sekali tiap gelombang, pukulan pertama ditahan perisai.' },
  { id: 'pearl-magnet', name: 'Magnet Mutiara', line: 'Jangkauan tarik mutiara ×2', detail: 'Mutiara dekat tersedot dari jauh.' },
  { id: 'swift-dash', name: 'Dash Kilat', line: 'Cooldown dash −35%', detail: 'Dash siap lebih sering.' },
  { id: 'heartbloom', name: 'Kuncup Hati', line: '+1 nyawa (maks 5)', detail: 'Satu lentera nyawa tambahan.' },
  { id: 'lantern-oil', name: 'Minyak Lentera', line: 'Meter lentera langsung +50', detail: 'Lentera hampir penuh seketika.' },
];

/** True when this wave has a leviathan in it. */
export function isBossWave(wave) {
  return TIDE.boss.waves.includes(wave);
}

/** The leviathan's hit points on this wave. */
export function bossHpFor(wave) {
  return TIDE.boss.hp[wave] ?? 0;
}
