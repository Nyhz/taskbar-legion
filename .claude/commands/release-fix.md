---
description: Cut a PATCH release (0.2.0 → 0.2.1) — update changelog, bump, tag, build all platforms, publish.
allowed-tools: Bash(git:*), Bash(npm:*), Bash(gh:*), Read, Edit
---

Read `docs/RELEASING.md` and execute the release procedure documented there **exactly and in order**, using **bump type = `patch`** (e.g. 0.2.0 → 0.2.1).

Run the bump in step 4 as `npm run release patch`.

Stop and report to me if any preflight check fails. Confirm with me before the final publish step.
