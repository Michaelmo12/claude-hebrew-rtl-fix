#!/usr/bin/env node
/**
 * build.js — regenerates icons, then packages the extension into:
 *   - dist/claude-hebrew-rtl-fix-v<version>.zip  (for AMO submission)
 *   - dist/claude-hebrew-rtl-fix-v<version>.xpi  (same bytes, .xpi
 *     extension — for permanent install via about:addons > Install Add-on
 *     From File on Firefox Developer Edition/Nightly/ESR with
 *     xpinstall.signatures.required disabled; see README)
 *
 * Uses PowerShell's built-in Compress-Archive (this is a Windows dev
 * machine) instead of adding an npm zip dependency, keeping the build
 * itself dependency-free like the extension it packages.
 */
'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
const version = manifest.version;

// Files/folders shipped in the packaged extension. Explicit allowlist
// (rather than "everything minus an exclude list") so packaging can't
// accidentally pick up dev-only files (test/, dist/, node_modules/, .git/).
const INCLUDE = [
  'manifest.json',
  'content',
  'styles',
  'icons/icon.svg',
  'icons/icon-16.png',
  'icons/icon-32.png',
  'icons/icon-48.png',
  'icons/icon-96.png',
  'icons/icon-128.png',
];

function run(cmd, args) {
  execFileSync(cmd, args, { stdio: 'inherit' });
}

function main() {
  console.log('Generating icons...');
  run(process.execPath, [path.join(ROOT, 'icons', 'generate-icons.js')]);

  for (const rel of INCLUDE) {
    if (!fs.existsSync(path.join(ROOT, rel))) {
      throw new Error(`Expected packaged file/folder missing: ${rel}`);
    }
  }

  if (!fs.existsSync(DIST)) fs.mkdirSync(DIST);
  const zipPath = path.join(DIST, `claude-hebrew-rtl-fix-v${version}.zip`);
  const xpiPath = path.join(DIST, `claude-hebrew-rtl-fix-v${version}.xpi`);
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
  if (fs.existsSync(xpiPath)) fs.unlinkSync(xpiPath);

  // Compress-Archive flattens every -Path entry to the zip root, which
  // would put icons/icon-16.png etc. at the root instead of under icons/
  // and break manifest.json's references. Stage a directory that mirrors
  // the real layout first, then zip *its contents*.
  const STAGE = path.join(DIST, '_stage');
  if (fs.existsSync(STAGE)) fs.rmSync(STAGE, { recursive: true, force: true });
  fs.mkdirSync(STAGE, { recursive: true });

  for (const rel of INCLUDE) {
    const src = path.join(ROOT, rel);
    const dest = path.join(STAGE, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.cpSync(src, dest, { recursive: true });
  }

  console.log('Zipping extension...');
  const psCommand = `Compress-Archive -Path "${STAGE}\\*" -DestinationPath "${zipPath}" -Force`;
  run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psCommand]);

  fs.rmSync(STAGE, { recursive: true, force: true });

  // An .xpi is just a zip with a different extension — copy rather than
  // re-zip, so both artifacts are byte-identical.
  fs.copyFileSync(zipPath, xpiPath);

  console.log(`Built: ${zipPath}`);
  console.log(`Built: ${xpiPath}`);
}

main();
