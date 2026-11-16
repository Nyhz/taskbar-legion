"""Round 7 — summary of scripts/luck-diag.ts output files (dev tooling).
Usage: python3 scripts/luck-summary.py file1.jsonl [file2.jsonl ...]
Prints per difficulty and variant: win rate at each wall-life factor, coherence at ×1, losses by cause, first deaths,
and how the dice differ between won and lost fights; and the width of the band where the own build's win rate goes
from 80 % to 20 % as the wall's life rises (interpolated on the factors).
"""
import json, sys, statistics as st
from collections import defaultdict

rows = [json.loads(l) for f in sys.argv[1:] for l in open(f)]
diff = lambda s: ['Normal', 'Infierno', 'Averno', 'Eterno', 'Tormento'][(s - 1) // 100]
by = defaultdict(list)
for r in rows: by[(diff(r['stage']), r['variant'], r['mult'])].append(r)
mults = sorted({r['mult'] for r in rows})
variants = ['own', 'knightOff', 'knightDef', 'noHeal', 'noMr']
for d in ['Averno', 'Eterno', 'Tormento']:
    print(f'\n== {d}')
    print('variant    ' + '  '.join(f'×{m:<5}' for m in mults) + '  coh@1  surv/race@1  first deaths @1')
    for v in variants:
        cells = []
        for m in mults:
            rs = by.get((d, v, m), [])
            cells.append(f'{st.mean(r["win"] for r in rs):.2f}  ' if rs else '  -    ')
        rs1 = by.get((d, v, 1), [])
        if not rs1: continue
        coh = st.mean(r['coherence'] for r in rs1)
        surv = sum(r['lossSurvival'] for r in rs1); race = sum(r['lossRace'] for r in rs1)
        deaths = defaultdict(int)
        for r in rs1:
            for t in r['firstDeaths'].split():
                deaths[t.split('@')[0]] += 1
        print(f'{v:10} ' + ''.join(cells) + f' {coh:.2f}   {surv:3}/{race:<3}     {dict(deaths)}')
    # dice, own build, all factors
    w = defaultdict(list); l = defaultdict(list)
    for (dd, v, m), rs in by.items():
        if dd != d or v != 'own': continue
        for r in rs:
            for k, x in r['diceWin'].items():
                if x is not None and r['win'] > 0: w[k].append(x)
            for k, x in r['diceLoss'].items():
                if x is not None and r['win'] < 1: l[k].append(x)
    print('dice (own): ' + '  '.join(f'{k} won {st.mean(w[k]):.2f} / lost {st.mean(l[k]):.2f}' for k in w if w[k] and l[k]))
# transition width per wall (own)
print('\n== band (own): wall-life factor where the win rate crosses 0.8 and 0.2')
walls = sorted({(r['snap'], r['stage']) for r in rows})
widths = []
for snap, S in walls:
    pts = sorted((r['mult'], r['win']) for r in rows if r['snap'] == snap and r['stage'] == S and r['variant'] == 'own')
    def cross(th):
        for (m0, w0), (m1, w1) in zip(pts, pts[1:]):
            if w0 >= th > w1: return m0 + (m1 - m0) * (w0 - th) / (w0 - w1)
        return None
    a, b = cross(0.8), cross(0.2)
    nonmono = any(w1 > w0 + 0.13 for (_, w0), (_, w1) in zip(pts, pts[1:]))
    if a is not None and b is not None: widths.append(b - a)
    print(f'{snap} {S}: ' + ' '.join(f'{w:.2f}' for _, w in pts) + f'   80%→20%: {a and round(a,2)} → {b and round(b,2)}' + ('  NON-MONOTONE' if nonmono else ''))
if widths: print(f'median band width (life factor): {st.median(widths):.2f}')

# magic resist by the boss's mix: world 3 and 5 of each difficulty lean on spells (0.6), world 8 on steel (0.4)
print('\n== magic resist: own vs noMr, by the boss\'s mix (mean win rate over the factors)')
mix = lambda S: 0.6 if ((S // 10 - 1) % 10 + 1) in (2, 3, 5, 7, 10) else 0.4
for d in ['Averno', 'Eterno', 'Tormento']:
    for m in (0.6, 0.4):
        line = []
        for v in ('own', 'noMr'):
            rs = [r for r in rows if diff(r['stage']) == d and mix(r['stage']) == m and r['variant'] == v]
            if rs: line.append(f'{v} {st.mean(r["win"] for r in rs):.2f}')
        if line: print(f'{d} magic {m}: ' + '  '.join(line))
