// The look of GLOWTIDE: a dark bioluminescent sea, a little lantern-skiff,
// cyan tide pearls and magenta urchin mines. Everything is drawn with canvas
// primitives and glow (shadowBlur) — no images, no fonts to load.
import { VIEW_W, VIEW_H } from './world.js';

const SEA_TOP = '#050914';
const SEA_MID = '#0a2436';
const SEA_BOT = '#071426';

function seaGradient(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, SEA_TOP);
  g.addColorStop(0.55, SEA_MID);
  g.addColorStop(1, SEA_BOT);
  return g;
}

function waveBand(ctx, time, baseY, amp, speed, color, width) {
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

function drawOrb(ctx, orb, time) {
  const pulse = 1 + Math.sin(time * 3 + orb.phase) * 0.12;
  const r = orb.r * pulse * 1.2;
  const color = orb.star ? '#ffb454' : '#37f2e2';
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(orb.x, orb.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(orb.x - r * 0.25, orb.y - r * 0.3, r * 0.38, 0, Math.PI * 2);
  ctx.fill();
  if (orb.star) {
    ctx.strokeStyle = 'rgba(255,180,84,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, r + 6 + Math.sin(time * 3 + orb.phase) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawMine(ctx, mine, time) {
  const pulse = 1 + Math.sin(time * 2.4 + mine.phase) * 0.08;
  ctx.save();
  ctx.translate(mine.x, mine.y);
  // Warning ring, breathing.
  ctx.strokeStyle = 'rgba(255,61,126,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, (mine.r + 10) * pulse, 0, Math.PI * 2);
  ctx.stroke();
  // Spikes.
  ctx.fillStyle = '#ff3d7e';
  ctx.shadowColor = '#ff3d7e';
  ctx.shadowBlur = 14;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + mine.phase * 0.15;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a - 0.22) * mine.r * 0.7, Math.sin(a - 0.22) * mine.r * 0.7);
    ctx.lineTo(Math.cos(a) * (mine.r + 9), Math.sin(a) * (mine.r + 9));
    ctx.lineTo(Math.cos(a + 0.22) * mine.r * 0.7, Math.sin(a + 0.22) * mine.r * 0.7);
    ctx.closePath();
    ctx.fill();
  }
  // Dark core with a hot centre.
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#2a0a24';
  ctx.beginPath();
  ctx.arc(0, 0, mine.r * 0.85, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff3d7e';
  ctx.beginPath();
  ctx.arc(0, 0, mine.r * 0.32, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSkiff(ctx, player, time) {
  ctx.save();
  ctx.translate(player.x, player.y);
  // Invulnerability blink: the skiff flickers while shielded.
  if (player.invT > 0 && Math.floor(time * 12) % 2 === 0) ctx.globalAlpha = 0.45;
  ctx.rotate(player.angle);
  ctx.scale(1.3, 1.3);
  // Hull: a slim leaf, teal with a pale rim.
  ctx.fillStyle = '#0f4c5c';
  ctx.strokeStyle = '#9ff5ea';
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
  ctx.shadowColor = '#ffb454';
  ctx.shadowBlur = 26;
  ctx.fillStyle = '#ffb454';
  ctx.beginPath();
  ctx.arc(-2, -19, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff3d6';
  ctx.beginPath();
  ctx.arc(-2, -19, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** The whole scene: sea, entities, particles. HUD and screens live in hud.js. */
export function drawScene(ctx, world) {
  const t = world.time;
  ctx.save();
  if (world.shake > 0) {
    ctx.translate((Math.random() - 0.5) * world.shake, (Math.random() - 0.5) * world.shake);
  }
  ctx.fillStyle = seaGradient(ctx);
  ctx.fillRect(-20, -20, VIEW_W + 40, VIEW_H + 40);

  // Three slow glow bands rolling across the sea.
  waveBand(ctx, t, 180, 26, 0.5, 'rgba(55,242,226,0.05)', 64);
  waveBand(ctx, t, 380, 30, 0.35, 'rgba(55,242,226,0.04)', 48);
  waveBand(ctx, t, 580, 24, 0.6, 'rgba(255,61,126,0.03)', 40);

  // Plankton: tiny drifting motes that make the dark water feel alive.
  for (const dot of world.plankton) {
    const tw = 0.25 + Math.sin(t * 1.5 + dot.phase) * 0.2;
    ctx.fillStyle = `rgba(120,240,225,${Math.max(0.05, tw)})`;
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const orb of world.orbs) drawOrb(ctx, orb, t);
  for (const mine of world.mines) drawMine(ctx, mine, t);

  // Particles (collect bursts, hits, wake).
  for (const pt of world.parts) {
    const a = Math.max(0, pt.life / pt.maxLife);
    ctx.globalAlpha = a;
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size * a + 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (world.mode !== 'title') drawSkiff(ctx, world.player, t);
  ctx.restore();
}
