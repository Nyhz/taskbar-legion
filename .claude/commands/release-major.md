---
description: Cut a MAJOR release (0.2.0 → 1.0.0) — update changelog, bump, tag, build all platforms, publish.
allowed-tools: Bash(git:*), Bash(npm:*), Bash(gh:*), Read, Edit
---

Read `docs/RELEASING.md` and execute the release procedure documented there **exactly and in order**, using **bump type = `major`** (e.g. 0.2.0 → 1.0.0).

Run the bump in step 4 as `npm run release major`.

A major release is significant — double-check with me that the changelog accurately reflects breaking changes before cutting it, and confirm before the final publish step.
