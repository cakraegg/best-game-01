// HUD, title screen, blessing choice, pause overlay, game-over screen and
// the dawn victory table for GLOWTIDE v2. One typeface (the system stack),
// one accent per job: cyan for score, amber for the lantern and lives,
// magenta for danger, gold for the boss. Everything must read at a glance
// in a 1280x720 screenshot, so numbers are big and labels are short.
import { VIEW_W, VIEW_H, waveProgress, clockText, dashCooldownFor } from './world.js';
import { TIDE } from './config.js';

const FONT = "'Trebuchet MS', 'Segoe UI', system-ui, sans-serif";
const C = TIDE.colors;

function putText(ctx, str, x, y, size, color, align = 'left', weight = 700) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

function meter(ctx, x, y, w, h, frac, fill, back = 'rgba(232,251,255,0.16)') {
  ctx.fillStyle = back;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, Math.max(0, Math.min(1, frac)) * w, h);
}

function lanternIcon(ctx, x, y, lit) {
  ctx.save();
  if (lit) {
    ctx.shadowColor = C.amber;
    ctx.shadowBlur = 12;
    ctx.fillStyle = C.amber;
  } else {
    ctx.fillStyle = 'rgba(232,251,255,0.18)';
  }
  ctx.beginPath();
  ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = lit ? C.amberPale : 'rgba(232,251,255,0.25)';
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** In-play HUD: score, combo, lives, wave, clock, dash, lantern, boss bar. */
export function drawHud(ctx, sea) {
  // Score, top left.
  putText(ctx, 'SKOR', 28, 36, 15, C.cyanSoft, 'left', 700);
  putText(ctx, String(sea.score), 28, 74, 40, C.ink, 'left', 800);
  // Combo under the score, with its decay bar.
  if (sea.combo > 1) {
    putText(ctx, `KOMBO x${sea.combo}`, 28, 102, 20, C.cyan, 'left', 800);
    meter(ctx, 28, 110, 120, 5, sea.comboTimer / TIDE.pearls.comboWindow, C.cyan);
  } else {
    putText(ctx, 'kumpulkan mutiara untuk kombo', 28, 102, 14, 'rgba(232,251,255,0.45)', 'left', 400);
  }
  // Lives as lanterns, top left under the combo line; the label sits after
  // the last icon, so it never collides with an orb behind it.
  for (let i = 0; i < sea.maxLives; i++) {
    lanternIcon(ctx, 40 + i * 28, 138, i < sea.lives);
  }
  putText(ctx, 'NYAWA', 40 + sea.maxLives * 28 + 10, 143, 13, 'rgba(232,251,255,0.55)', 'left', 700);
  if (sea.shield > 0) {
    putText(ctx, '⛨ AEGIS', 40 + sea.maxLives * 28 + 76, 143, 13, C.amber, 'left', 800);
  }

  // Wave, top centre, with progress to the next wave.
  putText(ctx, `GELOMBANG ${sea.wave} / 10`, VIEW_W / 2, 36, 17, C.ink, 'center', 800);
  meter(ctx, VIEW_W / 2 - 90, 46, 180, 5, waveProgress(sea), C.amber);
  // The leviathan's health, in gold, under the wave bar while it lives.
  if (sea.boss) {
    putText(ctx, 'TIDE LEVIATHAN', VIEW_W / 2, 82, 14, C.gold, 'center', 800);
    meter(ctx, VIEW_W / 2 - 110, 90, 220, 7, sea.boss.hp / sea.boss.maxHp, C.gold);
  }

  // Clock, top right.
  putText(ctx, clockText(sea), VIEW_W - 28, 40, 24, C.ink, 'right', 700);
  putText(ctx, 'WAKTU', VIEW_W - 28, 62, 13, 'rgba(232,251,255,0.55)', 'right', 700);

  // Lantern meter, bottom centre, above the dash bar.
  const lampFull = sea.lantern >= 100;
  putText(ctx, lampFull ? 'LENTERA PENUH — BURST!' : 'LENTERA', VIEW_W / 2, VIEW_H - 76, 13, lampFull ? C.amber : 'rgba(232,251,255,0.55)', 'center', 800);
  meter(ctx, VIEW_W / 2 - 70, VIEW_H - 68, 140, 6, sea.lantern / 100, C.amber);

  // Dash cooldown, bottom centre.
  const cd = dashCooldownFor(sea);
  const dashFrac = sea.player.coolT > 0 ? 1 - sea.player.coolT / cd : 1;
  const dashLabel = sea.player.coolT > 0 ? 'DASH mengisi…' : 'DASH siap — [Spasi]';
  putText(ctx, dashLabel, VIEW_W / 2, VIEW_H - 44, 14, dashFrac >= 1 ? C.cyan : 'rgba(232,251,255,0.55)', 'center', 700);
  meter(ctx, VIEW_W / 2 - 70, VIEW_H - 34, 140, 5, dashFrac, C.cyan);

  // Controls hint, bottom left, quiet.
  putText(ctx, 'WASD / panah gerak · tahan klik untuk steer · Spasi dash · P jeda · M suara', 28, VIEW_H - 24, 13, 'rgba(232,251,255,0.4)', 'left', 400);
  if (sea.slowed) {
    putText(ctx, 'TERJEBAK AIR TENANG — gerak melambat', VIEW_W / 2, VIEW_H - 8, 13, C.violet, 'center', 700);
  }

  // Wave banner, centre, fading. The blessing screen has its own title, so
  // the banner stays out of the way while a blessing is offered.
  if (sea.bannerT > 0 && sea.mode !== 'blessing') {
    const a = Math.min(1, sea.bannerT / 0.6);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.shadowColor = C.cyan;
    ctx.shadowBlur = 24;
    putText(ctx, sea.banner, VIEW_W / 2, 190, 44, C.ink, 'center', 800);
    ctx.restore();
  }
}

// The three blessing cards, left to right. The same rects drive the click
// handling in main.js, so a card you click is the card you get.
export function blessingCardRects() {
  const w = 300;
  const h = 240;
  const y = 235;
  const gap = 30;
  const total = w * 3 + gap * 2;
  const x0 = (VIEW_W - total) / 2;
  return [0, 1, 2].map((i) => ({ x: x0 + i * (w + gap), y, w, h }));
}

/** The blessing choice after a wave: pick 1 of 3, by key 1-2-3 or by click. */
export function drawBlessing(ctx, sea) {
  ctx.fillStyle = 'rgba(5,9,20,0.62)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  putText(ctx, 'PILIH BERKAH', VIEW_W / 2, 150, 40, C.ink, 'center', 800);
  putText(ctx, `Gelombang ${sea.wave} selesai — pilih satu, lalu lanjut ke gelombang ${sea.wave + 1}`, VIEW_W / 2, 190, 18, 'rgba(232,251,255,0.8)', 'center', 400);
  const rects = blessingCardRects();
  sea.offer.forEach((b, i) => {
    const r = rects[i];
    ctx.fillStyle = 'rgba(10,36,54,0.92)';
    ctx.strokeStyle = 'rgba(55,242,226,0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(r.x, r.y, r.w, r.h, 16);
    ctx.fill();
    ctx.stroke();
    putText(ctx, `[${i + 1}]`, r.x + r.w / 2, r.y + 52, 16, C.cyanSoft, 'center', 700);
    putText(ctx, b.name, r.x + r.w / 2, r.y + 100, 26, C.ink, 'center', 800);
    putText(ctx, b.line, r.x + r.w / 2, r.y + 140, 17, C.amber, 'center', 800);
    // The detail may wrap: split it on words so it stays inside the card.
    const words = b.detail.split(' ');
    let line = '';
    const lines = [];
    for (const word of words) {
      if ((line + ' ' + word).trim().length > 24) {
        lines.push(line.trim());
        line = word;
      } else {
        line += ' ' + word;
      }
    }
    if (line.trim()) lines.push(line.trim());
    lines.forEach((ln, j) => {
      putText(ctx, ln, r.x + r.w / 2, r.y + 176 + j * 22, 15, 'rgba(232,251,255,0.75)', 'center', 400);
    });
  });
}

/** Title screen over the drifting sea. */
export function drawTitle(ctx, sea) {
  ctx.fillStyle = 'rgba(5,9,20,0.45)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.save();
  ctx.shadowColor = C.cyan;
  ctx.shadowBlur = 32;
  putText(ctx, 'GLOWTIDE', VIEW_W / 2, 230, 92, C.ink, 'center', 800);
  ctx.restore();
  putText(ctx, 'Neon Tide Run', VIEW_W / 2, 282, 30, C.cyan, 'center', 700);
  putText(ctx, 'Kemudikan lantern-skiff di laut bercahaya. Kumpulkan 18 mutiara tiap gelombang,', VIEW_W / 2, 352, 20, 'rgba(232,251,255,0.85)', 'center', 400);
  putText(ctx, 'lewati 10 gelombang sampai fajar — dan kalahkan Tide Leviathan di gelombang 5 dan 10.', VIEW_W / 2, 380, 20, 'rgba(232,251,255,0.85)', 'center', 400);
  putText(ctx, 'Satu-satunya cara melukainya: dash menembus badannya.', VIEW_W / 2, 408, 20, C.amber, 'center', 700);
  putText(ctx, 'Tiap gelombang: pilih 1 dari 3 berkah  ·  WASD / panah gerak · Spasi dash · klik steer', VIEW_W / 2, 458, 17, C.amber, 'center', 700);
  const blink = 0.65 + Math.sin(sea.time * 3) * 0.35;
  ctx.save();
  ctx.globalAlpha = blink;
  putText(ctx, 'Tekan ENTER atau klik untuk mulai', VIEW_W / 2, 540, 24, C.ink, 'center', 800);
  ctx.restore();
  if (sea.best > 0) {
    putText(ctx, `Skor terbaik: ${sea.best}`, VIEW_W / 2, 590, 17, 'rgba(232,251,255,0.6)', 'center', 700);
  }
}

/** Pause overlay. */
export function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(5,9,20,0.6)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  putText(ctx, 'JEDA', VIEW_W / 2, 350, 64, C.ink, 'center', 800);
  putText(ctx, 'Tekan P untuk lanjut', VIEW_W / 2, 400, 20, C.cyan, 'center', 700);
}

/** Game-over screen: final score, wave reached, time, pearls, best, restart. */
export function drawGameOver(ctx, sea) {
  ctx.fillStyle = 'rgba(5,9,20,0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = 'rgba(10,36,54,0.9)';
  ctx.strokeStyle = 'rgba(255,61,126,0.4)';
  ctx.lineWidth = 2;
  const pw = 560;
  const ph = 380;
  const px = (VIEW_W - pw) / 2;
  const py = (VIEW_H - ph) / 2;
  ctx.beginPath();
  ctx.roundRect(px, py, pw, ph, 18);
  ctx.fill();
  ctx.stroke();
  putText(ctx, 'PERMAINAN SELESAI', VIEW_W / 2, py + 64, 34, C.rose, 'center', 800);
  putText(ctx, 'SKOR AKHIR', VIEW_W / 2, py + 118, 15, C.cyanSoft, 'center', 700);
  putText(ctx, String(sea.score), VIEW_W / 2, py + 178, 64, C.ink, 'center', 800);
  putText(ctx, `Gelombang ${sea.wave}  ·  Waktu ${clockText(sea)}  ·  Mutiara ${sea.collected}`, VIEW_W / 2, py + 224, 18, 'rgba(232,251,255,0.8)', 'center', 400);
  if (sea.score >= sea.best && sea.score > 0) {
    putText(ctx, '★ Skor terbaik baru! ★', VIEW_W / 2, py + 262, 20, C.amber, 'center', 800);
  } else {
    putText(ctx, `Skor terbaik: ${sea.best}`, VIEW_W / 2, py + 262, 18, 'rgba(232,251,255,0.6)', 'center', 700);
  }
  const blink = 0.65 + Math.sin(sea.time * 3) * 0.35;
  ctx.save();
  ctx.globalAlpha = blink;
  putText(ctx, 'Tekan R atau klik untuk main lagi', VIEW_W / 2, py + 326, 22, C.cyan, 'center', 800);
  ctx.restore();
}

/** Victory screen: dawn breaks, and the full run table is laid out. */
export function drawVictory(ctx, sea) {
  // Dawn: a warm gradient over the sea, brighter at the horizon.
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, 'rgba(5,9,20,0.55)');
  g.addColorStop(0.55, 'rgba(255,180,84,0.16)');
  g.addColorStop(1, 'rgba(255,209,102,0.28)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  putText(ctx, 'FAJAR MENYINGSING', VIEW_W / 2, 130, 52, C.ink, 'center', 800);
  putText(ctx, 'Dawn breaks over the tide — 10 gelombang dilewati, Leviathan ditaklukkan.', VIEW_W / 2, 172, 19, C.amberPale, 'center', 700);
  // The run table.
  ctx.fillStyle = 'rgba(10,36,54,0.92)';
  ctx.strokeStyle = 'rgba(255,180,84,0.5)';
  ctx.lineWidth = 2;
  const pw = 600;
  const ph = 360;
  const px = (VIEW_W - pw) / 2;
  const py = 210;
  ctx.beginPath();
  ctx.roundRect(px, py, pw, ph, 18);
  ctx.fill();
  ctx.stroke();
  const rows = [
    ['SKOR AKHIR', String(sea.score)],
    ['WAKTU', clockText(sea)],
    ['GELOMBANG', '10 / 10'],
    ['MUTIARA', String(sea.collected)],
    ['RANJAU DIBERSIHKAN', String(sea.stats.urchins)],
    ['LEVIATHAN DITAKLUKKAN', String(sea.stats.boss)],
    ['KOMBO MAKSIMAL', `x${sea.maxCombo}`],
  ];
  rows.forEach(([label, value], i) => {
    const y = py + 52 + i * 40;
    putText(ctx, label, px + 36, y, 17, C.cyanSoft, 'left', 700);
    putText(ctx, value, px + pw - 36, y, 19, C.ink, 'right', 800);
  });
  if (sea.score >= sea.best && sea.score > 0) {
    putText(ctx, '★ Skor terbaik baru! ★', VIEW_W / 2, py + ph - 28, 18, C.amber, 'center', 800);
  }
  const blink = 0.65 + Math.sin(sea.time * 3) * 0.35;
  ctx.save();
  ctx.globalAlpha = blink;
  putText(ctx, 'Tekan R atau klik untuk berlayar lagi', VIEW_W / 2, py + ph + 52, 22, C.cyan, 'center', 800);
  ctx.restore();
}
