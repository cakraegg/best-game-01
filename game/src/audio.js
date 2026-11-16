// Synthesised sound effects for GLOWTIDE: no audio files at all. Every sound
// is built from WebAudio oscillators, so the game ships zero assets, loads
// nothing over the network, and stays silent (never throws) when the browser
// has no gesture yet or no audio device.
export function createAudio() {
  let ctx = null;
  let muted = false;

  // The context is made lazily on the first user gesture; before that every
  // effect is a no-op, which keeps headless runs and muted tabs error-free.
  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return ctx;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    } catch {
      ctx = null;
    }
    return ctx;
  }

  function tone({ freq, slideTo = null, dur = 0.12, type = 'sine', vol = 0.16, delay = 0 }) {
    if (muted) return;
    const ac = ensure();
    if (!ac) return;
    try {
      const t0 = ac.currentTime + delay;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
      gain.gain.setValueAtTime(vol, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain).connect(ac.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch {
      // A failed blip must never break the game loop.
    }
  }

  return {
    unlock() {
      ensure();
    },
    get muted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    // Collect blip: pitch climbs with the combo, so a hot streak sounds hot.
    collect(combo) {
      const base = 520 + Math.min(combo, 8) * 55;
      tone({ freq: base, slideTo: base * 1.6, dur: 0.09, type: 'sine', vol: 0.14 });
      tone({ freq: base * 2, dur: 0.06, type: 'triangle', vol: 0.05, delay: 0.02 });
    },
    // Mine hit: a low thud that falls away.
    hit() {
      tone({ freq: 170, slideTo: 42, dur: 0.32, type: 'triangle', vol: 0.22 });
      tone({ freq: 90, slideTo: 30, dur: 0.28, type: 'sawtooth', vol: 0.08 });
    },
    // Wave up: a bright two-note chime.
    wave() {
      tone({ freq: 660, dur: 0.12, type: 'sine', vol: 0.14 });
      tone({ freq: 990, dur: 0.2, type: 'sine', vol: 0.14, delay: 0.1 });
    },
    // Dash: a short airy sweep upward.
    dash() {
      tone({ freq: 300, slideTo: 900, dur: 0.14, type: 'sawtooth', vol: 0.05 });
    },
    click() {
      tone({ freq: 800, dur: 0.05, type: 'square', vol: 0.06 });
    },
    // Game over: three notes stepping down.
    over() {
      tone({ freq: 392, dur: 0.16, type: 'sine', vol: 0.14 });
      tone({ freq: 311, dur: 0.16, type: 'sine', vol: 0.14, delay: 0.16 });
      tone({ freq: 233, dur: 0.34, type: 'sine', vol: 0.14, delay: 0.32 });
    },
  };
}
