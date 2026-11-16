// The look of GLOWTIDE v2: a dark bioluminescent sea, a little lantern-skiff,
// cyan tide pearls, magenta urchin mines, teal eels, violet wraiths, and the
// great Tide Leviathan. Everything is drawn with canvas primitives and glow
// (shadowBlur) — no images, no fonts to load. The shake here is a sine of
// the sim clock, so a frozen screenshot shakes exactly the same every time.
import { VIEW_W, VIEW_H } from './world.js';
import { TIDE } from './config.js';

const C = TIDE.colors;

function seaGradient(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, C.abyss);
  g.addColorStop(0.55, C.deep);
  g.addColorStop(1, C.floor);
  return g;
}

function glowBand(ctx, time, baseY, amp, speed, color, width) {
  ctx.beginPath();
  for (let x = 0; x <= VIEW_W; x += 16) {
    const y = baseY + Math.sin(x * 0.006 + time * speed) * amp + Math.sin(x * 0.013 - time * speed * 0.7) * amp * 0.4;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.stroke();
}

function drawPearl(ctx, pearl, time) {
  const pulse = 1 + Math.sin(time * 3 + pearl.phase) * 0.12;
  const r = pearl.r * pulse * 1.2;
  const color = pearl.star ? C.amber : C.cyan;
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(pearl.x, pearl.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(pearl.x - r * 0.25, pearl.y - r * 0.3, r * 0.38, 0, Math.PI * 2);
  ctx.fill();
  if (pearl.star) {
    ctx.strokeStyle = 'rgba(255,180,84,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pearl.x, pearl.y, r + 6 + Math.sin(time * 3 + pearl.phase) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawUrchin(ctx, u, time) {
  const pulse = 1 + Math.sin(time * 2.4 + u.phase) * 0.08;
  ctx.save();
  ctx.translate(u.x, u.y);
  // Warning ring, breathing.
  ctx.strokeStyle = 'rgba(255,61,126,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, (u.r + 10) * pulse, 0, Math.PI * 2);
  ctx.stroke();
  // Spikes.
  ctx.fillStyle = C.rose;
  ctx.shadowColor = C.rose;
  ctx.shadowBlur = 14;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + u.phase * 0.15;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a - 0.22) * u.r * 0.7, Math.sin(a - 0.22) * u.r * 0.7);
    ctx.lineTo(Math.cos(a) * (u.r + 9), Math.sin(a) * (u.r + 9));
    ctx.lineTo(Math.cos(a + 0.22) * u.r * 0.7, Math.sin(a + 0.22) * u.r * 0.7);
    ctx.closePath();
    ctx.fill();
  }
  // Dark core with a hot centre.
  ctx.shadowBlur = 0;
  ctx.fillStyle = C.roseDark;
  ctx.beginPath();
  ctx.arc(0, 0, u.r * 0.85, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.rose;
  ctx.beginPath();
  ctx.arc(0, 0, u.r * 0.32, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawEel(ctx, eel, time, player) {
  ctx.save();
  ctx.translate(eel.x, eel.y);
  const heading = eel.state === 'dart'
    ? Math.atan2(eel.vy, eel.vx)
    : Math.atan2(player.y - eel.y, player.x - eel.x);
  ctx.rotate(heading);
  // Telegraph: while aiming, the eel flashes and draws its line.
  if (eel.state === 'aim') {
    const flash = Math.floor(time * 14) % 2 === 0;
    ctx.strokeStyle = flash ? 'rgba(55,242,226,0.9)' : 'rgba(55,242,226,0.25)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(320, 0);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // A sleek body, tapering to a tail, with a glowing eye.
  ctx.fillStyle = '#0e7d74';
  ctx.shadowColor = C.cyan;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.quadraticCurveTo(6, -9, -16, -4);
  ctx.quadraticCurveTo(-24, 0, -16, 4);
  ctx.quadraticCurveTo(6, 9, 20, 0);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#e8fbff';
  ctx.beginPath();
  ctx.arc(12, -3, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawWraith(ctx, w, time) {
  ctx.save();
  ctx.translate(w.x, w.y);
  // The still-water field: a wide violet ring that slows the skiff inside.
  ctx.strokeStyle = 'rgba(167,139,250,0.28)';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 10]);
  ctx.beginPath();
  ctx.arc(0, 0, TIDE.wraiths.fieldRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  // The wraith itself: a drifting wisp with a hollow heart.
  const breathe = 1 + Math.sin(time * 2 + w.phase) * 0.15;
  ctx.fillStyle = 'rgba(167,139,250,0.35)';
  ctx.shadowColor = C.violet;
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.arc(0, 0, w.r * breathe, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = C.violetDeep;
  ctx.beginPath();
  ctx.arc(0, 0, w.r * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ede9fe';
  ctx.beginPath();
  ctx.arc(-4, -3, 2.5, 0, Math.PI * 2);
  ctx.arc(5, -3, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBoss(ctx, boss, time) {
  const cfg = TIDE.boss;
  ctx.save();
  ctx.translate(boss.x, boss.y);
  // The wind-up telegraph: a pulsing ring that warns the lunge is coming.
  if (boss.phase === 'windup') {
    const flash = Math.floor(time * 12) % 2 === 0;
    ctx.strokeStyle = flash ? 'rgba(255,209,102,0.95)' : 'rgba(255,61,126,0.7)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, boss.r + 18 + Math.sin(time * 10) * 6, 0, Math.PI * 2);
    ctx.stroke();
  }
  // A segmented serpent body trailing behind the head, swaying as it moves.
  const segs = 5;
  for (let i = segs; i >= 1; i--) {
    const back = i * 26;
    const sway = Math.sin(time * 2.2 + boss.wobble - i * 0.7) * 10;
    const px = -Math.cos(boss.angle) * back - Math.sin(boss.angle) * sway;
    const py = -Math.sin(boss.angle) * back + Math.cos(boss.angle) * sway;
    const rr = boss.r * (0.62 - i * 0.06);
    ctx.fillStyle = i % 2 === 0 ? '#3b2a6e' : '#241a4d';
    ctx.shadowColor = C.violet;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(px, py, rr, 0, Math.PI * 2);
    ctx.fill();
  }
  // The head: a great glowing maw with amber eyes.
  ctx.shadowColor = C.violet;
  ctx.shadowBlur = 28;
  ctx.fillStyle = '#4c2d8f';
  ctx.beginPath();
  ctx.arc(0, 0, boss.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = C.gold;
  ctx.beginPath();
  ctx.arc(Math.cos(boss.angle - 0.5) * boss.r * 0.5, Math.sin(boss.angle - 0.5) * boss.r * 0.5, 6, 0, Math.PI * 2);
  ctx.arc(Math.cos(boss.angle + 0.5) * boss.r * 0.5, Math.sin(boss.angle + 0.5) * boss.r * 0.5, 6, 0, Math.PI * 2);
  ctx.fill();
  // Its health, in gold, above its head.
  const bw = 110;
  ctx.fillStyle = 'rgba(5,9,20,0.7)';
  ctx.fillRect(-bw / 2, -boss.r - 26, bw, 8);
  ctx.fillStyle = C.gold;
  ctx.fillRect(-bw / 2, -boss.r - 26, bw * Math.max(0, boss.hp / boss.maxHp), 8);
  ctx.restore();
}

function drawSkiff(ctx, player, time) {
  ctx.save();
  ctx.translate(player.x, player.y);
  // Invulnerability blink: the skiff flickers while shielded.
  if (player.invT > 0 && Math.floor(time * 12) % 2 === 0) ctx.globalAlpha = 0.45;
  ctx.rotate(player.angle);
  ctx.scale(1.3, 1.3);
  // The dash shield: a cyan ring while the dash's shield holds.
  if (player.dashT > 0) {
    ctx.strokeStyle = 'rgba(55,242,226,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Hull: a slim leaf, teal with a pale rim.
  ctx.fillStyle = C.teal;
  ctx.strokeStyle = C.tealLine;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(24, 0);
  ctx.bezierCurveTo(10, -11, -14, -10, -20, 0);
  ctx.bezierCurveTo(-14, 10, 10, 11, 24, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Deck line and lantern mast.
  ctx.strokeStyle = 'rgba(232,251,255,0.75)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-14, 0);
  ctx.lineTo(16, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-2, -4);
  ctx.lineTo(-2, -16);
  ctx.stroke();
  // The lantern: the one warm light on the dark sea.
  ctx.shadowColor = C.amber;
  ctx.shadowBlur = 26;
  ctx.fillStyle = C.amber;
  ctx.beginPath();
  ctx.arc(-2, -19, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = C.amberPale;
  ctx.beginPath();
  ctx.arc(-2, -19, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** The whole scene: sea, entities, particles, floating text. HUD and screens live in hud.js. */
export function drawScene(ctx, sea) {
  const t = sea.time;
  ctx.save();
  if (sea.shakeT > 0) {
    ctx.translate(Math.sin(t * 47) * sea.shakeT * 0.5, Math.cos(t * 39) * sea.shakeT * 0.5);
  }
  ctx.fillStyle = seaGradient(ctx);
  ctx.fillRect(-20, -20, VIEW_W + 40, VIEW_H + 40);

  // Three slow glow bands rolling across the sea.
  glowBand(ctx, t, 180, 26, 0.5, 'rgba(55,242,226,0.05)', 64);
  glowBand(ctx, t, 380, 30, 0.35, 'rgba(55,242,226,0.04)', 48);
  glowBand(ctx, t, 580, 24, 0.6, 'rgba(255,61,126,0.03)', 40);

  // Plankton: tiny drifting motes that make the dark water feel alive.
  for (const dot of sea.plankton) {
    const tw = 0.25 + Math.sin(t * 1.5 + dot.phase) * 0.2;
    ctx.fillStyle = `rgba(120,240,225,${Math.max(0.05, tw)})`;
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const pearl of sea.pearls) drawPearl(ctx, pearl, t);
  for (const u of sea.urchins) drawUrchin(ctx, u, t);
  for (const eel of sea.eels) drawEel(ctx, eel, t, sea.player);
  for (const w of sea.wraiths) drawWraith(ctx, w, t);
  if (sea.boss) drawBoss(ctx, sea.boss, t);

  // Sparks (collect bursts, hits, wake, lantern bursts).
  for (const sp of sea.sparks) {
    const a = Math.max(0, sp.life / sp.maxLife);
    ctx.globalAlpha = a;
    ctx.fillStyle = sp.color;
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, sp.size * a + 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Floating score text.
  for (const fl of sea.floaters) {
    const a = Math.max(0, fl.life / fl.maxLife);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = `800 20px 'Trebuchet MS', 'Segoe UI', system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = fl.color;
    ctx.shadowColor = fl.color;
    ctx.shadowBlur = 10;
    ctx.fillText(fl.text, fl.x, fl.y);
    ctx.restore();
  }

  if (sea.mode !== 'title') drawSkiff(ctx, sea.player, t);
  ctx.restore();
}
