// Synthesised sound for GLOWTIDE v2: no audio files at all. Every effect is
// built from WebAudio oscillators, so the game ships zero assets, loads
// nothing over the network, and stays silent (never throws) when the browser
// has no gesture yet or no audio device. A failed blip must never break the
// game loop, so every note is wrapped in try/catch.
export function makeSound() {
  let ac = null;
  let muted = false;

  // The context is made lazily on the first user gesture; before that every
  // effect is a no-op, which keeps headless runs and muted tabs error-free.
  function ensure() {
    if (ac) {
      if (ac.state === 'suspended') ac.resume().catch(() => {});
      return ac;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
    } catch {
      ac = null;
    }
    return ac;
  }

  // One note: an oscillator with a gain envelope that falls to silence.
  function blip({ f, f2 = null, d = 0.12, type = 'sine', v = 0.16, at = 0 }) {
    if (muted) return;
    const audio = ensure();
    if (!audio) return;
    try {
      const t0 = audio.currentTime + at;
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(f, t0);
      if (f2 !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, f2), t0 + d);
      gain.gain.setValueAtTime(v, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
      osc.connect(gain).connect(audio.destination);
      osc.start(t0);
      osc.stop(t0 + d + 0.02);
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
    // Collect blip: the pitch climbs with the combo, so a hot streak sounds hot.
    collect(combo) {
      const base = 520 + Math.min(combo, 8) * 55;
      blip({ f: base, f2: base * 1.6, d: 0.09, v: 0.14 });
      blip({ f: base * 2, d: 0.06, type: 'triangle', v: 0.05, at: 0.02 });
    },
    // A hit: a low thud that falls away.
    hit() {
      blip({ f: 170, f2: 42, d: 0.32, type: 'triangle', v: 0.22 });
      blip({ f: 90, f2: 30, d: 0.28, type: 'sawtooth', v: 0.08 });
    },
    // The shield catches a hit: a bright metallic ping instead of a thud.
    shield() {
      blip({ f: 1180, d: 0.1, type: 'triangle', v: 0.16 });
      blip({ f: 1760, d: 0.14, type: 'sine', v: 0.1, at: 0.05 });
    },
    // Wave up: a bright two-note chime.
    wave() {
      blip({ f: 660, d: 0.12, v: 0.14 });
      blip({ f: 990, d: 0.2, v: 0.14, at: 0.1 });
    },
    // Dash: a short airy sweep upward.
    dash() {
      blip({ f: 300, f2: 900, d: 0.14, type: 'sawtooth', v: 0.05 });
    },
    // A dash wound on the leviathan: a sharp crack.
    wound() {
      blip({ f: 220, f2: 880, d: 0.12, type: 'square', v: 0.1 });
      blip({ f: 660, d: 0.1, type: 'triangle', v: 0.12, at: 0.03 });
    },
    // The leviathan dies: a deep boom that falls away.
    bossDown() {
      blip({ f: 140, f2: 36, d: 0.6, type: 'sawtooth', v: 0.2 });
      blip({ f: 523, d: 0.16, v: 0.12, at: 0.1 });
      blip({ f: 784, d: 0.3, v: 0.12, at: 0.22 });
    },
    // Lantern burst: a warm swell.
    burst() {
      blip({ f: 440, f2: 1320, d: 0.3, type: 'sine', v: 0.14 });
      blip({ f: 880, d: 0.24, type: 'triangle', v: 0.08, at: 0.08 });
    },
    // A blessing is chosen: three notes stepping up.
    bless() {
      blip({ f: 523, d: 0.12, v: 0.13 });
      blip({ f: 659, d: 0.12, v: 0.13, at: 0.1 });
      blip({ f: 784, d: 0.22, v: 0.13, at: 0.2 });
    },
    click() {
      blip({ f: 800, d: 0.05, type: 'square', v: 0.06 });
    },
    // Dawn breaks: a slow rising arpeggio.
    victory() {
      blip({ f: 392, d: 0.2, v: 0.13 });
      blip({ f: 523, d: 0.2, v: 0.13, at: 0.16 });
      blip({ f: 659, d: 0.2, v: 0.13, at: 0.32 });
      blip({ f: 784, d: 0.44, v: 0.14, at: 0.48 });
    },
    // Game over: three notes stepping down.
    over() {
      blip({ f: 392, d: 0.16, v: 0.14 });
      blip({ f: 311, d: 0.16, v: 0.14, at: 0.16 });
      blip({ f: 233, d: 0.34, v: 0.14, at: 0.32 });
    },
  };
}
