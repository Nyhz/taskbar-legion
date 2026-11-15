# Writes only the walls (run from the repository root: python3 scripts/tune-pacing-apply-walls.py <tuner output>).
# Input: the output of a walls-only pass (`TUNE_KEEP=1 npx vite-node scripts/tune-pacing.ts`), finished or not.
# Writes WORLD_WALL_MULT from a (possibly unfinished) walls-only tuner log: the worlds it has reached take its
# values (Hell on: smoothed 1-2-1 in log space; life always climbs), the rest keep what the data file has.
import re, math, sys
root='./'  # run from the repository root
t=open(sys.argv[1]).read()
p=root+'src/data/stageScaling.ts'; s=open(p).read()
i=s.index('export const WORLD_WALL_MULT: readonly number[] = ['); j=s.index('];', i)+2
cur=[float(x) for x in re.findall(r'[0-9.]+', s[s.index('= [',i)+3:j-2])]
assert len(cur)==50, len(cur)
raw={}
for line in t.split('\n'):
    c=line.split('\t')
    if len(c)>=17 and c[0].isdigit(): raw[int(c[0])]=float(c[14])
n=max(raw) if raw else 0
wall=[raw.get(w+1, cur[w]) for w in range(50)]
def smooth(xs, frm, to):
    out=list(xs)
    for i in range(frm, to):
        acc=wt=0
        for d,k in ((-1,1),(0,2),(1,1)):
            jx=i+d
            if frm<=jx<to: acc+=math.log(xs[jx])*k; wt+=k
        out[i]=math.exp(acc/wt)
    return out
wall=smooth(wall,10,n)
def base(w):
    S=10*w; phi=(1+S/600)**3; ramp=min(1, 0.12+0.88*max(0,w-1)/21)
    return 260000*phi*ramp/(1+phi/80)
hp=[base(w+1)*m for w,m in enumerate(wall)]
for k in range(1,50):
    step=1.01 if k<10 else 1.03
    if hp[k] < hp[k-1]*step: hp[k]=hp[k-1]*step; wall[k]=hp[k]/base(k+1)
def r3(x):
    if x>=100: return '%.0f' % x
    if x>=10: return '%.1f' % x
    if x>=1: return '%.2f' % x
    return '%.3f' % x
rows='\n'.join('  '+', '.join(r3(x) for x in wall[k:k+10])+',' for k in range(0,50,10))
s=s[:i]+'export const WORLD_WALL_MULT: readonly number[] = [\n'+rows+'\n];'+s[j:]
open(p,'w').write(s)
print('worlds from the log:', n); print(rows)
