# Writes the tuner's tables into the game (run from the repository root: python3 scripts/tune-pacing-apply.py <tuner output>).
# Input: the full output of `npx vite-node scripts/tune-pacing.ts` (a complete pass, anchors included). It smooths the
# per-world entries in log space, keeps every table climbing and every anchor inside its band of the measured
# reference, and writes GRUNT_HP_TUNE / STAGE_BOSS_HP_TUNE / TRASH_DMG_TUNE / WORLD_WALL_MULT into
# src/data/stageScaling.ts and the reference into test/sim/probe/anchorReference.ts.
import re, math, sys
root='./'  # run from the repository root
t=open(sys.argv[1]).read()
def table(name):
    m=re.search(name+r' = \[([^\]]*)\]', t); return [float(x) for x in re.split(r'[,\s]+', m.group(1).strip()) if x]
grunt_raw=table('GRUNT_HP_TUNE'); dmg_raw=table('TRASH_DMG_TUNE'); boss_raw=table('STAGE_BOSS_HP_TUNE'); wall_raw=table('WORLD_WALL_MULT')
hit=table('REFERENCE_TOP_HIT'); dps=table('REFERENCE_BOSS_DPS')
for xs in (grunt_raw, boss_raw, hit, dps): xs[9]=xs[8]
def smooth(xs, frm):
    out=[]
    for i,x in enumerate(xs):
        if i<frm: out.append(x); continue
        acc=wt=0
        for d,k in ((-1,1),(0,2),(1,1)):
            j=i+d
            if frm<=j<len(xs): acc+=math.log(xs[j])*k; wt+=k
        out.append(math.exp(acc/wt))
    return out
def climb(xs, step=1.01, skip9=True):
    out=list(xs)
    for i in range(1,len(out)):
        if skip9 and i==9: out[i]=out[i-1]; continue
        if out[i] < out[i-1]*step: out[i]=out[i-1]*step
    return out
def pav(xs, frm):
    # isotonic regression (pool adjacent violators) in log space from index `frm`: a dip is shared with its
    # neighbour instead of lifting one point far above what was measured there
    blocks=[[math.log(x),1] for x in xs[frm:]]
    i=0
    while i < len(blocks)-1:
        if blocks[i][0] > blocks[i+1][0]:
            n=blocks[i][1]+blocks[i+1][1]
            blocks[i]=[(blocks[i][0]*blocks[i][1]+blocks[i+1][0]*blocks[i+1][1])/n, n]
            del blocks[i+1]
            if i>0: i-=1
        else: i+=1
    out=[]
    for v,n in blocks: out += [math.exp(v)]*n
    return list(xs[:frm])+out
grunt=climb(pav(smooth(grunt_raw,10),10)); boss=climb(pav(smooth(boss_raw,10),10))
def fit(vals, ref, lo, hi):
    # keep every entry inside its band of the measured reference (lo…hi × ref) while the table still climbs:
    # an entry above its band comes down, and the ones before it give way
    out=list(vals)
    for i in range(len(out)-1, 9, -1):
        out[i]=min(out[i], hi*ref[i])
        if i>10 and out[i-1] > out[i]/1.01: out[i-1]=out[i]/1.01
    for i in range(10, len(out)):
        # a point whose reference jumps (a new rarity arriving) is lifted to the band's lower edge
        if out[i] < lo*ref[i]: out[i]=lo*ref[i]
        if i>10 and out[i] < out[i-1]*1.01: out[i]=out[i-1]*1.01
        assert out[i] <= hi*ref[i]*1.02, ('above its band', i, out[i]/ref[i])
    return out
grunt=fit(grunt, hit, 2.1, 2.9); boss=fit(boss, dps, 5.5, 9.5)
dmgS=smooth(dmg_raw,10); dmg=[min(a,b) for a,b in zip(dmg_raw,dmgS)]
def base(w):
    S=10*w; phi=(1+S/600)**3; ramp=min(1, 0.12+0.88*max(0,w-1)/21)
    return 260000*phi*ramp/(1+phi/80)
wall=smooth(wall_raw,10)
hp=[base(w+1)*m for w,m in enumerate(wall)]
for i in range(1,len(wall)):
    step=1.01 if i<10 else 1.03
    if hp[i] < hp[i-1]*step: hp[i]=hp[i-1]*step; wall[i]=hp[i]/base(i+1)
def r3(x):
    if x>=1000: return str(int(round(x, -int(math.floor(math.log10(x)))+2)))
    if x>=100: return '%.0f' % x
    if x>=10: return '%.1f' % x
    if x>=1: return '%.2f' % x
    return '%.3f' % x
def rows(xs): return '\n'.join('  '+', '.join(r3(x) for x in xs[i:i+10])+',' for i in range(0,len(xs),10))
print('hits   :', ' '.join('%.2f' % (g/h) for g,h in zip(grunt,hit)))
print('boss s :', ' '.join('%.1f' % (b/d) for b,d in zip(boss,dps)))
print('wall   :', ' '.join(r3(x) for x in wall))
p=root+'src/data/stageScaling.ts'; s=open(p).read()
def put(name, xs):
    global s
    i=s.index(name+' = ['); j=s.index('];', i)+2
    s=s[:i]+name+' = [\n'+rows(xs)+'\n];'+s[j:]
put('export const GRUNT_HP_TUNE: number[]', grunt)
put('export const STAGE_BOSS_HP_TUNE: number[]', boss)
put('export const TRASH_DMG_TUNE: number[]', dmg)
put('export const WORLD_WALL_MULT: readonly number[]', wall)
open(p,'w').write(s)
p=root+'test/sim/probe/anchorReference.ts'; s=open(p).read()
put('export const REFERENCE_TOP_HIT: readonly number[]', hit)
put('export const REFERENCE_BOSS_DPS: readonly number[]', dps)
open(p,'w').write(s)
