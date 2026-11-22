#!/usr/bin/env python3
"""Fit the per-world wall factor (src/data/power.ts WALL_ASK_TILT) to per-world hours targets.

Dev tooling (2026-11-22). Feed it fast-probe outputs (`PROBE_FAST=1 PROBE_SEEDS=1 PROBE_SEED_FROM=k npx vite-node
scripts/sim-progression.ts > run-sk.txt`, a few seeds) and it moves each world's factor toward its target:

    python3 scripts/fit-wall-tilt.py 'path/run-s*.txt'           # report only
    python3 scripts/fit-wall-tilt.py 'path/run-s*.txt' apply     # and rewrite WALL_ASK_TILT

Targets are FULL-probe hours (the user's: each world of a difficulty a little longer than the one before; Hell ~52,
Inferno ~138, Eternal ~240, Torment ~320). The fast probe reads long from Inferno on (its farm model), so its target is
the full one ÷ BIAS. The correction is damped (a harder wall sends a better-geared party to the next one) and has two
numbers a difficulty — its level and its slope (single worlds are too noisy to fit one by one) — and constrained: what a wall asks (base curve × factor) never falls, nor rises more than ×1.3.
Normal is left alone (its hours are its stages).
"""
import glob
import math
import re
import statistics as st
import sys

POWER = 'src/data/power.ts'
SENSITIVITY = 1.5  # hours ∝ ask^SENSITIVITY, roughly (measured on the probe)
DAMPING = 0.7
MAX_STEP = 1.3  # at a difficulty's seam; 1.15 inside one
MAX_STEP_INSIDE = 1.1


def line(total, ratio):
    first = total / 10 * 2 / (1 + ratio)
    return [first * (1 + (ratio - 1) * k / 9) for k in range(10)]


TARGETS = {1: line(52, 2.5), 2: line(138, 2.4), 3: line(240, 2.4), 4: line(320, 2.6)}
BIAS = {1: 0.75, 2: 0.58, 3: 0.63, 4: 0.54}  # full-probe hours ÷ fast-probe hours, by difficulty (2026-11-22)
NAMES = ['Normal', 'Hell', 'Inferno', 'Eternal', 'Torment']


def world_medians(paths):
    per = {}
    for path in paths:
        txt = open(path).read()
        if 'every world, median' not in txt:
            continue
        for row in txt.split('every world, median')[1].split('\n')[2:52]:
            p = row.split('\t')
            if len(p) > 8 and p[0].isdigit():
                per.setdefault(int(p[0]), []).append(float(p[4]))
    return {w: st.median(v) for w, v in per.items()}


def main():
    paths = sorted(glob.glob(sys.argv[1]))
    apply = len(sys.argv) > 2 and sys.argv[2] == 'apply'
    src = open(POWER).read()
    first = float(re.search(r'WALL_ASK_FIRST = ([\d.]+)', src).group(1))
    last = float(re.search(r'WALL_ASK_LAST = ([\d.]+)', src).group(1))
    exp = float(re.search(r'WALL_ASK_EXP = ([\d.]+)', src).group(1))
    m = re.search(r'(export const WALL_ASK_TILT: readonly number\[\] = \[)(.*?)(\];)', src, re.S)
    tilt = [float(x) for x in m.group(2).replace('\n', ' ').split(',') if x.strip()]
    base = [first + (last - first) * ((w - 1) / 49) ** exp for w in range(1, 51)]
    med = world_medians(paths)
    print(f'{len(paths)} runs')
    for d in range(5):
        got = [med.get(d * 10 + 1 + k, float('nan')) for k in range(10)]
        line_ = f"{NAMES[d]:8s} fast {' '.join('%.0f' % g for g in got)}  sum {sum(g for g in got if g == g):.0f}"
        if d in TARGETS:
            tg = [t / BIAS[d] for t in TARGETS[d]]
            line_ += f"  | target {' '.join('%.0f' % t for t in tg)}  sum {sum(tg):.0f}"
        print(line_)
    if not apply:
        return
    # Two numbers a difficulty, robust to the noise of single worlds (±40 % between runs even as a median of 5): its
    # level (all ten worlds' hours against the target's) and its slope (the second half against the first).
    logf = [0.0] * 50
    for d in TARGETS:
        got = [med.get(d * 10 + k + 1, 0.0) for k in range(10)]
        tgt = [t / BIAS[d] for t in TARGETS[d]]
        level = DAMPING / SENSITIVITY * math.log(sum(tgt) / max(1.0, sum(got)))
        slope = DAMPING / SENSITIVITY * (math.log(sum(tgt[5:]) / max(0.5, sum(got[5:]))) - math.log(sum(tgt[:5]) / max(0.5, sum(got[:5]))))
        for k in range(10):
            logf[d * 10 + k] = level + slope * (k - 4.5) / 9
    ask = [base[i] * tilt[i] * math.exp(logf[i]) for i in range(50)]
    for i in range(1, 50):  # always rising (by 1 % at least), never leaping
        cap = MAX_STEP if i % 10 == 0 else MAX_STEP_INSIDE
        ask[i] = min(max(ask[i], ask[i - 1] * 1.01), ask[i - 1] * cap)
    new = [round(ask[i] / base[i], 3) for i in range(50)]
    rows = '\n'.join('  ' + ', '.join(str(v) for v in new[k:k + 10]) + ',' for k in range(0, 50, 10))
    src = src[:m.start(2)] + '\n' + rows + '\n' + src[m.end(2):]
    open(POWER, 'w').write(src)
    print('WALL_ASK_TILT rewritten')


if __name__ == '__main__':
    main()
