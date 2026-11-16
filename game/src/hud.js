// HUD, title screen, pause overlay and game-over screen for GLOWTIDE. One
// typeface (the system stack), one accent per job: cyan for score, amber for
// the lantern/lives, magenta for danger. Everything must read at a glance in
// a 1280x720 screenshot, so numbers are big and labels are short.
import { VIEW_W, VIEW_H, waveProgress, clockText } from './world.js';

const FONT = "'Trebuchet MS', 'Segoe UI', system-ui, sans-serif";

function text(ctx, str, x, y, size, color, align = 'left', weight = 700) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

function bar(ctx, x, y, w, h, frac, fill, back = 'rgba(232,251,255,0.16)') {
  ctx.fillStyle = back;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, Math.max(0, Math.min(1, frac)) * w, h);
}

function lanternIcon(ctx, x, y, lit) {
  ctx.save();
  if (lit) {
    ctx.shadowColor = '#ffb454';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#ffb454';
  } else {
    ctx.fillStyle = 'rgba(232,251,255,0.18)';
  }
  ctx.beginPath();
  ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = lit ? '#fff3d6' : 'rgba(232,251,255,0.25)';
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** In-play HUD: score, combo, lives, wave, clock, dash cooldown. */
export function drawHud(ctx, world) {
  // Score, top left.
  text(ctx, 'SKOR', 28, 36, 15, '#7fd9cf', 'left', 700);
  text(ctx, String(world.score), 28, 74, 40, '#e8fbff', 'left', 800);
  // Combo under the score, with its decay bar.
  if (world.combo > 1) {
    text(ctx, `KOMBO x${world.combo}`, 28, 102, 20, '#37f2e2', 'left', 800);
    bar(ctx, 28, 110, 120, 5, world.comboTimer / 4, '#37f2e2');
  } else {
    text(ctx, 'kumpulkan mutiara untuk kombo', 28, 102, 14, 'rgba(232,251,255,0.45)', 'left', 400);
  }
  // Lives as lanterns, top left under the combo line.
  for (let i = 0; i < 3; i++) {
    lanternIcon(ctx, 40 + i * 28, 138, i < world.lives);
  }
  text(ctx, 'NYAWA', 118, 143, 13, 'rgba(232,251,255,0.55)', 'left', 700);

  // Wave, top centre, with progress to the next wave.
  text(ctx, `GELOMBANG ${world.wave}`, VIEW_W / 2, 36, 17, '#e8fbff', 'center', 800);
  bar(ctx, VIEW_W / 2 - 90, 46, 180, 5, waveProgress(world), '#ffb454');

  // Clock, top right.
  text(ctx, clockText(world), VIEW_W - 28, 40, 24, '#e8fbff', 'right', 700);
  text(ctx, 'WAKTU', VIEW_W - 28, 62, 13, 'rgba(232,251,255,0.55)', 'right', 700);

  // Dash cooldown, bottom centre.
  const dashFrac = world.player.coolT > 0 ? 1 - world.player.coolT / 2.5 : 1;
  const dashLabel = world.player.coolT > 0 ? 'DASH mengisi…' : 'DASH siap — [Spasi]';
  text(ctx, dashLabel, VIEW_W / 2, VIEW_H - 44, 14, dashFrac >= 1 ? '#37f2e2' : 'rgba(232,251,255,0.55)', 'center', 700);
  bar(ctx, VIEW_W / 2 - 70, VIEW_H - 34, 140, 5, dashFrac, '#37f2e2');

  // Controls hint, bottom left, quiet.
  text(ctx, 'WASD / panah gerak · tahan klik untuk steer · Spasi dash · P jeda · M suara', 28, VIEW_H - 24, 13, 'rgba(232,251,255,0.4)', 'left', 400);

  // Wave banner, centre, fading.
  if (world.bannerT > 0) {
    const a = Math.min(1, world.bannerT / 0.6);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.shadowColor = '#37f2e2';
    ctx.shadowBlur = 24;
    text(ctx, world.banner, VIEW_W / 2, 190, 44, '#e8fbff', 'center', 800);
    ctx.restore();
  }
}

/** Title screen over the drifting sea. */
export function drawTitle(ctx, world) {
  ctx.fillStyle = 'rgba(5,9,20,0.45)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.save();
  ctx.shadowColor = '#37f2e2';
  ctx.shadowBlur = 32;
  text(ctx, 'GLOWTIDE', VIEW_W / 2, 250, 92, '#e8fbff', 'center', 800);
  ctx.restore();
  text(ctx, 'Neon Tide Run', VIEW_W / 2, 300, 30, '#37f2e2', 'center', 700);
  text(ctx, 'Kemudikan lantern-skiff di laut bercahaya. Kumpulkan mutiara,', VIEW_W / 2, 372, 20, 'rgba(232,251,255,0.85)', 'center', 400);
  text(ctx, 'hindari ranjau landak — tiga nyawa, gelombang makin deras.', VIEW_W / 2, 400, 20, 'rgba(232,251,255,0.85)', 'center', 400);
  text(ctx, 'WASD / panah untuk gerak · Spasi untuk dash · tahan klik untuk steer', VIEW_W / 2, 452, 17, '#ffb454', 'center', 700);
  const blink = 0.65 + Math.sin(world.time * 3) * 0.35;
  ctx.save();
  ctx.globalAlpha = blink;
  text(ctx, 'Tekan ENTER atau klik untuk mulai', VIEW_W / 2, 540, 24, '#e8fbff', 'center', 800);
  ctx.restore();
  if (world.best > 0) {
    text(ctx, `Skor terbaik: ${world.best}`, VIEW_W / 2, 590, 17, 'rgba(232,251,255,0.6)', 'center', 700);
  }
}

/** Pause overlay. */
export function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(5,9,20,0.6)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  text(ctx, 'JEDA', VIEW_W / 2, 350, 64, '#e8fbff', 'center', 800);
  text(ctx, 'Tekan P untuk lanjut', VIEW_W / 2, 400, 20, '#37f2e2', 'center', 700);
}

/** Game-over screen: final score, wave reached, time, best, restart prompt. */
export function drawGameOver(ctx, world) {
  ctx.fillStyle = 'rgba(5,9,20,0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Panel.
  ctx.fillStyle = 'rgba(10,36,54,0.9)';
  ctx.strokeStyle = 'rgba(55,242,226,0.35)';
  ctx.lineWidth = 2;
  const pw = 560;
  const ph = 380;
  const px = (VIEW_W - pw) / 2;
  const py = (VIEW_H - ph) / 2;
  ctx.beginPath();
  ctx.roundRect(px, py, pw, ph, 18);
  ctx.fill();
  ctx.stroke();
  text(ctx, 'PERMAINAN SELESAI', VIEW_W / 2, py + 64, 34, '#ff3d7e', 'center', 800);
  text(ctx, 'SKOR AKHIR', VIEW_W / 2, py + 118, 15, '#7fd9cf', 'center', 700);
  text(ctx, String(world.score), VIEW_W / 2, py + 178, 64, '#e8fbff', 'center', 800);
  text(ctx, `Gelombang ${world.wave}  ·  Waktu ${clockText(world)}  ·  Mutiara ${world.collected}`, VIEW_W / 2, py + 224, 18, 'rgba(232,251,255,0.8)', 'center', 400);
  if (world.score >= world.best && world.score > 0) {
    text(ctx, '★ Skor terbaik baru! ★', VIEW_W / 2, py + 262, 20, '#ffb454', 'center', 800);
  } else {
    text(ctx, `Skor terbaik: ${world.best}`, VIEW_W / 2, py + 262, 18, 'rgba(232,251,255,0.6)', 'center', 700);
  }
  const blink = 0.65 + Math.sin(world.time * 3) * 0.35;
  ctx.save();
  ctx.globalAlpha = blink;
  text(ctx, 'Tekan R atau klik untuk main lagi', VIEW_W / 2, py + 326, 22, '#37f2e2', 'center', 800);
  ctx.restore();
}
