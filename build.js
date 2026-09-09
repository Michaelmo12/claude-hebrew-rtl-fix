#!/usr/bin/env node
/**
 * build.js — regenerates icons, then zips the extension for AMO submission
 * into dist/claude-hebrew-rtl-fix-v<version>.zip.
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
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

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

  console.log(`Built: ${zipPath}`);
}

main();
