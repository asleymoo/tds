// §11 subdomain rotation script.
// Spins up 5 new Workers under fresh random names, rewires the bait page
// to point at them, redeploys the bait page, then deletes the old Workers.
//
// Usage:
//   node shared/rotate.mjs              — full rotation
//   node shared/rotate.mjs --dry-run   — print what would happen, change nothing
//
// Prerequisites:
//   - `wrangler` logged in to the isolated account (npx wrangler whoami)
//   - Run from the repo root: cd ~/dev/tds && node shared/rotate.mjs

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DRY_RUN = process.argv.includes('--dry-run');

const LANES = [
  { dir: 'lane-1-attribution' },
  { dir: 'lane-2-antitamper' },
  { dir: 'lane-3-classify' },
  { dir: 'lane-4-container' },
  { dir: 'lane-5-reveal' },
];

const BAIT_PAGE_DIR = path.join(ROOT, 'bait-page');
const BAIT_INDEX    = path.join(BAIT_PAGE_DIR, 'public', 'index.html');

function randomName() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function run(cmd, cwd = ROOT) {
  console.log(`  $ ${cmd}`);
  if (DRY_RUN) return '';
  return execSync(cmd, { cwd, stdio: ['ignore', 'pipe', 'inherit'] }).toString().trim();
}

// Strip // comments without clobbering // inside string literals.
function stripJsoncComments(src) {
  return src.replace(/("(?:[^"\\]|\\.)*")|\/\/[^\n]*/g, (m, str) => str ?? '');
}

// Read the current Worker name from a lane's wrangler.jsonc.
function currentName(laneDir) {
  const raw = readFileSync(path.join(ROOT, laneDir, 'wrangler.jsonc'), 'utf8');
  return JSON.parse(stripJsoncComments(raw)).name;
}

// Deploy a lane under a new name by writing a temp wrangler.jsonc.
function deployLane(laneDir, newName, baitOrigin) {
  const cfgPath = path.join(ROOT, laneDir, 'wrangler.jsonc');
  const raw = readFileSync(cfgPath, 'utf8');
  const cfg = JSON.parse(stripJsoncComments(raw));

  cfg.name = newName;
  cfg.vars = { ...cfg.vars, ALLOWED_ORIGIN: baitOrigin };

  const tmpDir = mkdtempSync(path.join(tmpdir(), 'tds-rotate-'));
  const tmpCfg = path.join(tmpDir, 'wrangler.jsonc');
  writeFileSync(tmpCfg, JSON.stringify(cfg, null, 2));

  try {
    run(`npx wrangler deploy --config ${tmpCfg}`, path.join(ROOT, laneDir));
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

// Delete an old Worker by name.
function deleteWorker(name) {
  run(`npx wrangler delete --name ${name} --force`);
}

// Update the LANES array in bait-page/public/index.html.
function updateBaitLanes(newUrls, baitIndex) {
  const html = readFileSync(baitIndex, 'utf8');
  const lanesBlock = newUrls.map(u => `    "${u}",`).join('\n');
  const updated = html.replace(
    /const LANES = \[[\s\S]*?\];/,
    `const LANES = [\n${lanesBlock}\n  ];`,
  );
  if (updated === html) throw new Error('LANES pattern not found in index.html — check the regex');
  if (!DRY_RUN) writeFileSync(baitIndex, updated);
}

// ---- main ------------------------------------------------------------------

console.log(DRY_RUN ? '=== DRY RUN (no changes will be made) ===' : '=== TDS subdomain rotation ===');

// 1. Collect current names.
const oldNames = LANES.map(l => currentName(l.dir));
console.log('\nCurrent Worker names:', oldNames);

// 2. Read bait-page project name for ALLOWED_ORIGIN.
//    Derive from the current LANES array in index.html.
const htmlNow = readFileSync(BAIT_INDEX, 'utf8');
const baitOriginMatch = htmlNow.match(/const BAIT_ORIGIN\s*=\s*["']([^"']+)["']/);
// Fallback: read from the first lane's wrangler.jsonc ALLOWED_ORIGIN.
const firstLaneCfg = JSON.parse(
  stripJsoncComments(readFileSync(path.join(ROOT, LANES[0].dir, 'wrangler.jsonc'), 'utf8'))
);
const baitOrigin = baitOriginMatch?.[1] ?? firstLaneCfg.vars?.ALLOWED_ORIGIN ?? 'https://tds-bait.pages.dev';
console.log('Bait origin (ALLOWED_ORIGIN):', baitOrigin);

// 3. Generate new random names.
const newNames = LANES.map(() => randomName());
console.log('\nNew Worker names:', newNames);

// 4. Deploy each lane under its new name.
console.log('\n--- Deploying new Workers ---');
for (let i = 0; i < LANES.length; i++) {
  const { dir } = LANES[i];
  const newName = newNames[i];
  console.log(`\n[${i + 1}/5] ${dir} → ${newName}`);
  deployLane(dir, newName, baitOrigin);
}

// 5. Derive new URLs.
//    Get the workers.dev subdomain from the current config (account-level, doesn't change).
const wranglerSubdomain = (() => {
  // Extract from the existing LANES URLs in index.html.
  const m = htmlNow.match(/workers\.dev\/deliver/);
  if (m) {
    const urlMatch = htmlNow.match(/https:\/\/[^.]+\.([^.]+)\.workers\.dev/);
    return urlMatch?.[1] ?? null;
  }
  return null;
})();

// Get subdomain from wrangler whoami output if not found in HTML.
const subdomain = wranglerSubdomain ?? (() => {
  const out = execSync('npx wrangler subdomain get 2>/dev/null || true').toString();
  const m = out.match(/([a-z0-9]+)\.workers\.dev/);
  return m?.[1] ?? 'UNKNOWN';
})();

// Derive from current LANES URLs in index.html.
const currentSubdomain = (() => {
  const m = htmlNow.match(/https:\/\/[^.]+\.([^.]+)\.workers\.dev/);
  return m?.[1] ?? subdomain;
})();

const newUrls = newNames.map(n => `https://${n}.${currentSubdomain}.workers.dev/deliver`);
console.log('\nNew LANES URLs:');
newUrls.forEach(u => console.log(' ', u));

// 6. Update bait page LANES array.
console.log('\n--- Updating bait page LANES ---');
updateBaitLanes(newUrls, BAIT_INDEX);

// 7. Also update ALLOWED_ORIGIN in each lane's wrangler.jsonc (persisted for next rotation).
if (!DRY_RUN) {
  for (let i = 0; i < LANES.length; i++) {
    const cfgPath = path.join(ROOT, LANES[i].dir, 'wrangler.jsonc');
    const raw = readFileSync(cfgPath, 'utf8');
    const cfg = JSON.parse(stripJsoncComments(raw));
    cfg.name = newNames[i];
    // Keep comments by replacing only the name field via regex.
    const updated = raw
      .replace(/"name":\s*"[^"]*"/, `"name": "${newNames[i]}"`)
      .replace(/"ALLOWED_ORIGIN":\s*"[^"]*"/, `"ALLOWED_ORIGIN": "${baitOrigin}"`);
    writeFileSync(cfgPath, updated);
  }
}

// 8. Redeploy bait page.
console.log('\n--- Redeploying bait page ---');
run('npx wrangler pages deploy public --project-name tds-bait --commit-dirty=true', BAIT_PAGE_DIR);

// 9. Delete old Workers.
console.log('\n--- Retiring old Workers ---');
for (const name of oldNames) {
  console.log(`  Deleting ${name}`);
  deleteWorker(name);
}

console.log('\nDone. New subdomain rotation complete.');
if (DRY_RUN) console.log('(dry run — nothing was actually changed)');
