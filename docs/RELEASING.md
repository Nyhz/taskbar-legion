# Releasing Taskbar Legion

This is the canonical, end-to-end release procedure. The `/release-fix`,
`/release-minor`, and `/release-major` slash commands each execute this exact
procedure with a different **bump type**:

| Command          | Bump type | Example         |
| ---------------- | --------- | --------------- |
| `/release-fix`   | `patch`   | 0.2.0 → 0.2.1   |
| `/release-minor` | `minor`   | 0.2.0 → 0.3.0   |
| `/release-major` | `major`   | 0.2.0 → 1.0.0   |

The single source of truth for the version is `src-tauri/tauri.conf.json`.
`scripts/release.mjs` keeps `package.json` and `src-tauri/Cargo.toml` in lockstep
with it. Pushing the resulting `vX.Y.Z` tag triggers
`.github/workflows/desktop-build.yml`, which builds the macOS / Windows / Linux
clients and attaches them to a **draft** GitHub Release.

---

## Procedure

Carry out these steps **in order**. Stop and report to the user if any precondition fails.

### 1. Preflight — refuse to release from a bad state

1. Confirm the current branch is `main`:
   `git rev-parse --abbrev-ref HEAD` must print `main`.
   If not, STOP — tell the user a release must be cut from `main` after their PR is merged.
2. Sync with the remote: `git fetch origin`.
   - If local `main` is **behind** `origin/main`, STOP and ask the user to `git pull` first.
   - If local `main` is **ahead** of `origin/main`, STOP — there are unpushed commits;
     the release must build from what's on the remote.
3. The working tree must be clean. `git status --porcelain` should be empty.
   (The release script tolerates an uncommitted `CHANGELOG.md` — that's expected,
   because step 3 edits it — but nothing else may be dirty.)

### 2. Gather what changed since the last release

1. Find the last tag: `git describe --tags --abbrev=0` (it may print nothing — that's
   the first release, in which case use the whole history).
2. List the commits to summarize:
   `git log <lastTag>..HEAD --no-merges --pretty=format:'%s'`
   (omit `<lastTag>..` entirely if there is no previous tag).
   Also glance at merge commits (`git log <lastTag>..HEAD --merges --pretty=format:'%s'`)
   for PR titles, which are often more descriptive.

### 3. Update the CHANGELOG

Edit the `## [Unreleased]` section of `CHANGELOG.md` (do **not** create the version
section yourself — the script does that next).

- Write concise, **user-facing** entries — describe the change, not the commit.
- Categorize under the existing `### Added`, `### Changed`, `### Fixed` headings, mapping
  Conventional Commit prefixes: `feat:` → Added, `fix:` → Fixed, `refactor:`/`perf:`/
  `chore:` that affect behavior → Changed. Add a `### Removed` heading if needed.
- Skip pure-noise commits (formatting, internal CI tweaks, dependency bumps with no
  user impact) unless they matter to a player.
- Merge with anything already written under Unreleased; don't duplicate.
- **Do not commit this edit** — leave it in the working tree. The script commits it.

### 4. Cut the release (bump + roll changelog + commit + tag)

Run the script with the bump type for this command:

```bash
npm run release <patch|minor|major>
```

This bumps the three version files, moves the Unreleased entries into a dated
`## [X.Y.Z]` section, updates the changelog link references, commits everything as
`chore: release vX.Y.Z`, and creates the `vX.Y.Z` tag.

Capture the new version it prints (e.g. `v0.3.0`) — call it `$TAG`.

### 5. Push — this triggers the CI build

```bash
git push origin main --tags
```

### 6. Watch the multi-platform build

The tag push starts the `Desktop build` workflow. Wait for it:

```bash
gh run watch $(gh run list --workflow=desktop-build.yml --event=push --limit=1 --json databaseId --jq '.[0].databaseId') --exit-status
```

If `gh run list` doesn't yet show the run, wait a few seconds and retry — the trigger
can lag the push. If the run **fails**, report which platform job failed and the error;
do not proceed to publish.

### 7. Present and publish the GitHub Release

On success, the workflow has created a **draft** Release named `Taskbar Legion $TAG`
with the three installers attached — one per OS.

1. Show it to the user:
   `gh release view $TAG` and `gh release view $TAG --json assets --jq '.assets[].name'`
   (confirm all three bundles are present: `.dmg` for macOS, `.exe` (NSIS) for Windows,
   `.AppImage` for Linux).
2. **Confirm with the user before publishing** — publishing makes the release public.
   On confirmation, publish it:
   ```bash
   gh release edit $TAG --draft=false --latest
   ```
3. Verify it published and report the URL with this EXACT command:
   ```bash
   gh release view $TAG --json isDraft,tagName,url --jq '{isDraft, tagName, url}'
   ```
   `isDraft` must be `false`.

   > ⚠️ **Do NOT add `isLatest` to that `--json` list** — it is **not** a queryable field on
   > `gh release view` and makes the command exit non-zero (this has broken the verify step on
   > past releases). The `--latest` *flag* on the `gh release edit` publish command above is what
   > marks it latest; if you want to *confirm* that separately, query the API instead:
   > ```bash
   > gh api repos/{owner}/{repo}/releases/latest --jq '.tag_name'   # must equal $TAG
   > ```

---

## Notes

- **First release ever**: there is no previous tag, so step 2 summarizes the full
  history and the changelog already has a hand-written `[0.1.0]` section — start the
  Unreleased entries from scratch.
- **Failure recovery**: if something breaks after the tag was created locally but before
  a successful push, delete the local tag and commit and retry:
  `git tag -d $TAG && git reset --hard HEAD~1`. If the tag was already pushed, delete it
  remotely too: `git push origin :refs/tags/$TAG`, and delete any draft release with
  `gh release delete $TAG --yes`.
- The release script accepts `--dry-run` to preview the bump and changelog roll without
  writing anything.
