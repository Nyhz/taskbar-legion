---
name: greedy-agent-must-play-optimally
description: User wants the balance test agent to play optimally (farm-retreat when stuck), and to balance around the EXPERIENCE not stage-reach
metadata:
  type: feedback
---

The greedy balance agent (`test/sim/harness.ts` `GreedyRunner`) must model an **optimal player**, not a naive
push-until-wipe bot. When it can't clear a stage/boss with current gear, it should **retreat, farm earlier stages to
get stronger (gear + levels), then come back** — never wipe-loop.

**Why:** balance is judged by the *experience*, not by "stages reached in a fixed time budget." The user explicitly
said: *"The reach is not important, the experience is. Make it make sense."* So the `reach ≥120` invariants
(progression.test.ts #1/#2, smoke.test.ts) should be dropped/replaced with experience-based checks, and the agent
should farm when under-geared.

**How to apply:**
- Give the agent a notion of "am I winning this stage?" (e.g., a trial-fight or recent wipe count). If losing, set a
  retreat target a few stages back, farm there until gear/level improves, then re-attempt — like a real player.
- Optionally expose/log the agent's chosen strategy (a "tab"/trace of decisions) so the optimal path is inspectable.
- Balance the difficulty curve so: **good on-level gear = easy-not-trivial; mediocre/under gear = extremely
  challenging or forces a farm-retreat.** Tune around that agent's behaviour.

Related: [[rebalance-task-state]].
