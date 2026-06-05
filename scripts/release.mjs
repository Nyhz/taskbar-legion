// Release helper for Taskbar Legion.
//
// Bumps the version in the three files that must stay in lockstep
// (package.json, src-tauri/tauri.conf.json, src-tauri/Cargo.toml), rolls the
// CHANGELOG "Unreleased" section into a dated version section, commits the
// change, and creates the matching `vX.Y.Z` git tag.
//
// Pushing that tag is what triggers .github/workflows/desktop-build.yml to
// build all three desktop clients and publish them to a draft GitHub Release.
//
// Usage:
//   npm run release patch          # 0.1.0 -> 0.1.1
//   npm run release minor          # 0.1.0 -> 0.2.0
//   npm run release major          # 0.1.0 -> 1.0.0
//   npm run release 0.4.2          # explicit version
//   npm run release minor --dry-run   # show what would change, touch nothing

import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const bump = argv.find((a) => !a.startsWith('--'));

const PKG = resolve(root, 'package.json');
const TAURI = resolve(root, 'src-tauri/tauri.conf.json');
const CARGO = resolve(root, 'src-tauri/Cargo.toml');
const CHANGELOG = resolve(root, 'CHANGELOG.md');

function fail(msg) {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

function git(cmd) {
  return execSync(`git ${cmd}`, { cwd: root, encoding: 'utf8' }).trim();
}

if (!bump) {
  fail('Usage: npm run release <patch|minor|major|x.y.z> [--dry-run]');
}

// --- Canonical current version comes from tauri.conf.json ----------------------
const tauriJson = JSON.parse(readFileSync(TAURI, 'utf8'));
const current = tauriJson.version;
const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(current);
if (!m) fail(`Could not parse current version "${current}" from tauri.conf.json`);
const [major, minor, patch] = m.slice(1).map(Number);

let next;
if (/^\d+\.\d+\.\d+$/.test(bump)) {
  next = bump;
} else if (bump === 'major') {
  next = `${major + 1}.0.0`;
} else if (bump === 'minor') {
  next = `${major}.${minor + 1}.0`;
} else if (bump === 'patch') {
  next = `${major}.${minor}.${patch + 1}`;
} else {
  fail(`Unknown bump "${bump}". Use patch | minor | major | x.y.z`);
}

const tag = `v${next}`;
console.log(`\nReleasing ${current} → ${next}  (tag ${tag})${dryRun ? '  [dry-run]' : ''}\n`);

// --- Preconditions -------------------------------------------------------------
if (!dryRun) {
  // The working tree must be clean EXCEPT for CHANGELOG.md — the /release-*
  // commands populate the Unreleased section just before invoking this script,
  // and we want that edit to land in the single "chore: release" commit below.
  const dirty = git('status --porcelain')
    .split('\n')
    .filter(Boolean)
    // Strip the porcelain status prefix to get the path. git() .trim()s its output, so a
    // leading-space status (e.g. " M" for an unstaged-only change) loses its space on the
    // first line — a fixed `slice(3)` then misreads the path. Parse the path robustly so a
    // lone, unstaged CHANGELOG.md is correctly tolerated (the documented behavior).
    .filter((line) => line.trim().replace(/^\S{1,2}\s+/, '') !== 'CHANGELOG.md');
  if (dirty.length) {
    fail(
      'Working tree is dirty (only CHANGELOG.md may be uncommitted):\n  ' +
        dirty.join('\n  ') +
        '\nCommit or stash these before releasing.',
    );
  }
  const existingTags = git('tag -l').split('\n');
  if (existingTags.includes(tag)) fail(`Tag ${tag} already exists.`);
}

const branch = git('rev-parse --abbrev-ref HEAD');

// --- 1. Bump the three version files -------------------------------------------
function bumpJsonVersion(file) {
  const raw = readFileSync(file, 'utf8');
  // Replace only the top-level "version": "x.y.z" field, preserving formatting.
  const updated = raw.replace(/("version":\s*")\d+\.\d+\.\d+(")/, `$1${next}$2`);
  if (updated === raw) fail(`Could not find a version field to bump in ${file}`);
  if (!dryRun) writeFileSync(file, updated);
  console.log(`  ✓ ${file.replace(root + '/', '')}`);
}

function bumpCargoVersion(file) {
  const raw = readFileSync(file, 'utf8');
  // Only the [package] version — the first `version = "..."` line in the file.
  const updated = raw.replace(/^version = "\d+\.\d+\.\d+"/m, `version = "${next}"`);
  if (updated === raw) fail(`Could not find a [package] version to bump in ${file}`);
  if (!dryRun) writeFileSync(file, updated);
  console.log(`  ✓ ${file.replace(root + '/', '')}`);
}

console.log('Bumping version files:');
bumpJsonVersion(PKG);
bumpJsonVersion(TAURI);
bumpCargoVersion(CARGO);

// --- 2. Roll the CHANGELOG -----------------------------------------------------
function rollChangelog() {
  const raw = readFileSync(CHANGELOG, 'utf8');
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // Grab everything under "## [Unreleased]" up to the next "## [" heading.
  const unrelHeader = '## [Unreleased]';
  const start = raw.indexOf(unrelHeader);
  if (start === -1) fail('Could not find "## [Unreleased]" in CHANGELOG.md');
  const after = start + unrelHeader.length;
  const nextHeading = raw.indexOf('\n## [', after);
  const bodyEnd = nextHeading === -1 ? raw.length : nextHeading;
  const body = raw.slice(after, bodyEnd).trim();

  const hasContent = /^- /m.test(body);
  if (!hasContent) {
    console.log('  ! Unreleased section has no entries — recording an empty release.');
  }

  const freshUnreleased = `${unrelHeader}\n\n### Added\n\n### Changed\n\n### Fixed\n`;
  const versionSection = `## [${next}] - ${date}\n\n${body}\n`;

  let out = raw.slice(0, start) + freshUnreleased + '\n' + versionSection + raw.slice(bodyEnd).replace(/^\n+/, '\n');

  // Update the link reference block at the bottom.
  // Derive the repo slug from the existing [Unreleased] link.
  const repoMatch = /\[Unreleased\]:\s*(https:\/\/github\.com\/[^/]+\/[^/]+)\/compare/.exec(out);
  if (repoMatch) {
    const repo = repoMatch[1];
    out = out.replace(
      /\[Unreleased\]:\s*\S+/,
      `[Unreleased]: ${repo}/compare/${tag}...HEAD`,
    );
    // Insert the new version link right after the Unreleased link line.
    const compareFrom = `v${current}`;
    const newLink = `[${next}]: ${repo}/compare/${compareFrom}...${tag}`;
    out = out.replace(
      /(\[Unreleased\]:[^\n]*\n)/,
      `$1${newLink}\n`,
    );
  }

  if (!dryRun) writeFileSync(CHANGELOG, out);
  console.log('  ✓ CHANGELOG.md');
}

console.log('\nUpdating changelog:');
rollChangelog();

// --- 3. Commit + tag -----------------------------------------------------------
if (dryRun) {
  console.log('\n[dry-run] No files written, no commit, no tag created.\n');
  process.exit(0);
}

git('add package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml CHANGELOG.md');
git(`commit -m "chore: release ${tag}"`);
git(`tag ${tag}`);

console.log(`\n✓ Committed and tagged ${tag} on branch "${branch}".`);
console.log('\nNext step — push to trigger the multi-platform build:\n');
console.log(`    git push origin ${branch} --tags\n`);
console.log('Then go to GitHub → Releases, review the draft, write notes, and Publish.\n');
