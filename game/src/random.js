// Seeded chance for GLOWTIDE v2: one small generator (mulberry32) so a
// screenshot seed replays the same sea, the same pearls and the same hazards
// every time. Nothing in the game calls Math.random — the only nondeterminism
// a seeded run ever sees is the player's own input.
export function seededRng(seed) {
  let state = seed >>> 0;
  return function next() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

/** A float in [min, max). */
export function between(rng, min, max) {
  return min + rng() * (max - min);
}

/** An integer in [min, max]. */
export function wholeBetween(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

/** One element of a list, uniformly. */
export function chooseOne(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

/** True with probability p (0..1). */
export function odds(rng, p) {
  return rng() < p;
}
