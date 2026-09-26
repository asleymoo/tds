// Shared build step for a lane Worker: bundle with esbuild, then run
// javascript-obfuscator over the bundle before `wrangler deploy` picks it up.
// Usage from a lane's own build.mjs:
//   import { buildLane } from '../shared/build-lane.mjs';
//   await buildLane({ entry: 'src/index.js', outdir: 'dist' });
//
// This is a build-time-only dependency shared across lanes for convenience —
// it does not make the deployed Workers depend on each other or on this file
// at runtime. Each lane's dist/ output is self-contained.

import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SHARED_DIR = path.dirname(fileURLToPath(import.meta.url));
const OBFUSCATOR_CONFIG_PATH = path.join(SHARED_DIR, 'obfuscator.config.json');

export async function buildLane({ entry, outdir = 'dist', obfuscate = true }) {
  mkdirSync(outdir, { recursive: true });
  const bundlePath = path.join(outdir, 'bundle.js');

  await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    format: 'esm',
    target: 'es2022',
    outfile: bundlePath,
    minify: false, // let the obfuscator handle this
  });

  if (!obfuscate) {
    console.log(`[build] wrote ${bundlePath} (unobfuscated — pass obfuscate:true when ready)`);
    return;
  }

  const JavaScriptObfuscator = (await import('javascript-obfuscator')).default;
  const config = JSON.parse(readFileSync(OBFUSCATOR_CONFIG_PATH, 'utf8'));
  const source = readFileSync(bundlePath, 'utf8');
  const result = JavaScriptObfuscator.obfuscate(source, config);

  const outPath = path.join(outdir, 'worker.js');
  writeFileSync(outPath, result.getObfuscatedCode());
  console.log(`[build] wrote ${outPath} (obfuscated)`);
}
