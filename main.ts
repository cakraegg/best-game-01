// GLOWTIDE v2 entry program for best-game-01 (Node 22, stdlib only).
//
// The game is plain static files under game/ — game/index.html plus its ES
// modules, no library, no network request. This program hands it in: it
// copies game/ and screenshots/ from beside this file into the output
// directory and writes /output/dossier.json with the vendored make.fun
// library, so the judge reads exactly the dossier the scorer rebuilds.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The repository root: the folder this file sits in.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));
// The grader writes to /output; a local run writes wherever the env says.
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's own caps for this bounty. Only text_max_bytes shapes the
// dossier's bytes; the rest make this program fail exactly where the scorer
// would refuse the entry (too many screenshots, one too big, game/ past its
// file or byte cap, a path too long), so a local run that passes is one the
// gate accepts on those rows.
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function copyTree(fromDir, toDir) {
  mkdirSync(toDir, { recursive: true });
  cpSync(fromDir, toDir, { recursive: true });
}

function handIn() {
  mkdirSync(outputDir, { recursive: true });
  copyTree(join(repoRoot, 'game'), join(outputDir, 'game'));
  const shotsDir = join(repoRoot, 'screenshots');
  if (existsSync(shotsDir)) {
    copyTree(shotsDir, join(outputDir, 'screenshots'));
  }
  const dossier = buildDossier(outputDir, CAPS);
  writeFileSync(join(outputDir, 'dossier.json'), dossier);
}

handIn();
