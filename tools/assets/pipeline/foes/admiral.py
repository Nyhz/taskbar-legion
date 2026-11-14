"""The Drowned Admiral — world 6, stage boss. He went down with his fleet and walked back out of the sea, twice the
height of a man: a great cocked hat bound in tarnished gold, a head that is half drowned flesh and half bare skull
with one socket burning, a beard of tentacles that never lies still, a blood-dark coat with fringed epaulettes
crusted with barnacles and lashed round with chain, a peg for one leg, a crab's crusher where his left hand was —
and, on a length of chain, the ship's anchor he drags behind him. The sea still runs off him. He walks heavily,
the anchor ploughing after him. His attack takes hand and claw on the chain: he hauls the anchor off the ground,
whirls it up over his head and brings it down in front of him, flukes first, in a tower of spray; then he jerks
it back over his shoulder to where it lay. His death is the sea taking him back: the anchor sinks through the
stone as if it were water, the chain goes taut, he digs in, loses, is pulled off his feet onto his back with his
arm stretched to the hole, and the hat rolls away.

His frame is larger than the common boss frame (128 wide, 38 extra rows above: the anchor goes high). Drawn facing
right; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Chain, ChainSpec, Character, Gait, Pose, Pt, gait_legs, ik, keyed, lerp, loose, stagger_keys

FIGURE = ("Admiral", "boss", "w06")

BUILD = Build(root_x=52, thigh=10.5, shin=10.5, foot=6.5, hip_dx=2.6, spine=18.0, sh_near=7.5, sh_far=6.5, upper=11.0, fore=10.5, neck=1.5, head_dx=1.0,
              heel=2.4, toe=1.6, min_pelvis=8.0)

L = {
    "z": ("ink", 0), "k": ("ink", 1), "l": ("ink", 2), "m": ("ink", 3), "n": ("ink", 4), "o": ("ink", 6),
    "j": ("brass", 3), "J": ("brass", 4), "K": ("brass", 5), "Q": ("brass", 6),
    "b": ("bone", 3), "c": ("bone", 4), "d": ("bone", 5), "e": ("bone", 6), "E": ("bone", 7),
    "f": ("sea", 2), "g": ("sea", 3), "h": ("sea", 4),
    "q": ("crimson", 0), "r": ("crimson", 1), "s": ("crimson", 2), "t": ("crimson", 3), "u": ("crimson", 4), "F": ("crimson", 6),
    "W": ("bone", 6), "w": ("bone", 4),
    "R": ("leather", 3), "S": ("leather", 4), "T": ("leather", 5), "U": ("leather", 6), "V": ("sea", 5),
}

# A great cocked hat: the brim turned up at both ends and bound in tarnished gold, a cockade, a ragged red feather.
HAT = [
    "..........F............",
    ".........FFF..kll......",
    "........FFkkllllmm.....",
    "......kkkllllllmmmm....",
    "...kkklllllllllmmmmnn..",
    ".kkkllllllQlllmmmmmnnn.",
    "JkkllllllllllmmmmmmnnnJ",
    "JJJJKKkkllllmmmmKKKKJJJ",
]
# The head: the back of it still has its drowned flesh, the front is bare skull — a hollow socket, a second one
# that burns (G), the hole of the nose, and the teeth bared to the jaw.
FACE = [
    "...fgghcddee...",
    "..fgghhcdddeeE.",
    "..fghhccddzzeE.",
    "..fghzkcdzGGzE.",
    "..fgghhcdzzzeE.",
    "..fgghccddzdeE.",
    "...fghcdddddE..",
    "...fgcEzEzEzE..",
    "...fgzzzzzzz...",
    "....gcEzEzEc...",
    "....fgccddc....",
]
# The coat: a cravat, fringed epaulettes, buttons, barnacles on the chest, a length of chain lashed across it, a
# belt with a great buckle, and the skirts in rags.
TORSO = [
    "......cddddc.......",
    "..JKQqrsdddttuQKJ..",
    ".JKQqrrsscdsttuuQKJ",
    "JJKqqrrsssdstttuuKJ",
    "j.jqqrrsWssdsttuuj.",
    "..qqqrrswWssttouum.",
    "..qqrrssKssstomtuu.",
    "..qqrrWssssomtttuu.",
    "..qqrrswKsomsttuuu.",
    "..qqrrssomWstttuuu.",
    "..qqrromKsswsttuuu.",
    "..qqomrsssssttWuuu.",
    ".omqqrrsKsssttwuuu.",
    "..kkkkkkjQQjkkkkkk.",
    "..qqrrrsssssttttuu.",
    ".qqqrrrsssssttttuuu",
    ".qqrrrssss.stttuuuu",
    "qqqrrrsss..sttttuuu",
    "qqrr.rsss...ttt.uuu",
    "qq.r..ss....tt..uu.",
    "q.....s......t...u.",
    "......s............",
]
# The anchor, rust-red so that it reads on wet stone and on mist alike: ring, stock, shank with verdigris and a
# barnacle, and the two arms with their flukes.
ANCHOR = [
    ".........RSSST.........",
    "........R.....T........",
    "........R.....T........",
    ".........RSSST.........",
    "..........STU..........",
    ".RRSSSSSSSSTTTTTTTUUU..",
    ".RSSSSSSSSSTTTTTTTTUU..",
    "..........STU..........",
    "..........STU..........",
    "..........SVU..........",
    "..........STU..........",
    "..........WTU..........",
    "..........STU..........",
    "..........STU..........",
    "..........SVV..........",
    "..........STU..........",
    "U.........STU.........U",
    "TU........STU........UT",
    "STU.......STU.......UTS",
    "SSTU......STU......UTSS",
    "RSSTU.....STU.....UTSSR",
    ".RSSTTU...STU...UTTSS..",
    "..RSSTTU..STU..UTTSS...",
    "...RSSTTTUSTUUTTTSS....",
    "....RSSSTTTTTTTTSS.....",
    "......RSSSTTTTSS.......",
    "........RSSTTS.........",
    "..........RS...........",
]
for _rows in (HAT, FACE, TORSO, ANCHOR):
    assert len({len(r) for r in _rows}) == 1


def chain_points(grip: Pt, ring: Pt, slack: float) -> list[Pt]:
    """Link positions from the hand to the anchor's ring: a line that sags by `slack` and never goes underground."""
    n = max(2, int(math.hypot(ring[0] - grip[0], ring[1] - grip[1]) / 2.6))
    pts = []
    for i in range(n + 1):
        t = i / n
        pts.append((lerp(grip[0], ring[0], t), min(GROUND - 1.0, lerp(grip[1], ring[1], t) + slack * 4 * t * (1 - t))))
    return pts


class Admiral(Character):
    build = BUILD
    W = 128
    TOP = 38

    def joints(self, pose: Pose) -> dict[str, Pt]:
        J = super().joints(pose)
        ax, ah = pose["anchor_at"]
        J["ring"] = (self.build.root_x + ax, GROUND - ah)
        links = chain_points(J["handN"], J["ring"], pose.get("slack", 0.0))
        # Hand and claw on the chain for the heave: the claw takes it a few links down from the hand.
        w = pose.get("two", 0.0)
        if w > 0.01:
            on = links[min(len(links) - 1, 3)]
            hx, hy = J["handF"]
            J["elbowF"], J["handF"] = ik(J["shF"], (lerp(hx, on[0], w), lerp(hy, on[1], w)), self.build.upper, self.build.fore, +1)
        lean = pose.get("lean", 0.0)
        turn = pose.get("head_rot", 0.0) + (lean if abs(lean) > 24 else 0.0)
        a = math.radians(turn)
        hx, hy = J["head"]

        def on_head(x: float, y: float) -> Pt:
            return (hx + x * math.cos(a) - y * math.sin(a), hy + x * math.sin(a) + y * math.cos(a))

        J["crown"] = on_head(0.0, -8.6)
        J["eye"] = on_head(3.5, -6.0)
        J["brim"] = on_head(10.0, -9.0)
        for i, ox in enumerate((-0.5, 2.0, 4.5)):
            J[f"jaw{i}"] = on_head(ox, 0.5)
        J["turn"] = (turn, 0.0)
        return J

    def chains(self) -> dict[str, ChainSpec]:
        def behind(pts: list[Pt], J: dict[str, Pt]) -> None:
            lying = abs(J["lean"][0]) > 45.0
            px, _py = J["pelvis"]
            for i in range(1, len(pts)):
                x, y = pts[i]
                pts[i] = (x if lying else min(x, px - 2.5), min(y, GROUND - 1.5))

        def grounded(pts: list[Pt], J: dict[str, Pt]) -> None:
            for i in range(1, len(pts)):
                pts[i] = (pts[i][0], min(pts[i][1], GROUND - 1.5))

        out = {"skirt": ChainSpec(Chain(6, 3.0, gravity=0.24, drag=0.16, damp=0.1), lambda J: (J["pelvis"][0] - 5.5, J["pelvis"][1] - 2.5), behind)}
        # The beard: three tentacles of different lengths, each with a will of its own.
        for i, (n, seg, rest) in enumerate(((4, 2.2, (-0.3, 1.0)), (5, 2.3, (0.2, 1.0)), (4, 2.0, (0.6, 0.8)))):
            out[f"beard{i}"] = ChainSpec(Chain(n, seg, gravity=0.16 + 0.03 * i, drag=0.12, damp=0.08), (lambda J, i=i: J[f"jaw{i}"]), grounded, rest)
        return out

    def leg(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        hip, knee, ankle, toe = J["hip" + s], J["knee" + s], J["ankle" + s], J["toe" + s]
        cel.limb(hip, knee, 6.8, 5.4, "bone", (2, 3, 5), far=far)  # breeches
        if far:  # the peg
            cel.limb(knee, ankle, 3.6, 2.6, "leather", (2, 4, 5), far=True)
            cel.limb(ankle, (ankle[0], ankle[1] + 2.2), 2.6, 2.2, "leather", (2, 4, 5), far=True)
            cel.limb((knee[0] - 2.2, knee[1]), (knee[0] + 2.2, knee[1]), 2.0, 2.0, "brass", (2, 4, 5), far=True)
        else:
            cel.limb(knee, ankle, 5.8, 5.0, "ink", (1, 2, 4))  # sea boot
            cel.limb(ankle, toe, 5.2, 3.6, "ink", (1, 2, 4))
            cel.limb((knee[0] - 2.8, knee[1] + 0.5), (knee[0] + 2.8, knee[1] + 0.5), 2.4, 2.4, "ink", (2, 4, 6))  # its turned-down top

    def arm_near(self, cel: Cel, J: dict[str, Pt]) -> None:
        sh, el, hd = J["shN"], J["elbowN"], J["handN"]
        cel.limb(sh, el, 6.4, 5.4, "crimson", (1, 2, 4))
        cuff = (lerp(el[0], hd[0], 0.6), lerp(el[1], hd[1], 0.6))
        cel.limb(el, cuff, 5.4, 5.2, "crimson", (1, 2, 4))
        cel.limb(cuff, (lerp(el[0], hd[0], 0.72), lerp(el[1], hd[1], 0.72)), 6.0, 6.0, "brass", (3, 4, 6))  # the gold of the cuff
        cel.limb((lerp(el[0], hd[0], 0.78), lerp(el[1], hd[1], 0.78)), hd, 4.2, 4.6, "bone", (3, 5, 6))
        dx, dy = hd[0] - el[0], hd[1] - el[1]
        d = math.hypot(dx, dy) or 1.0
        for k_ in (-0.9, 0.0, 0.9):  # finger bones
            cel.line(hd, (hd[0] + dx / d * 4.0 - dy / d * k_ * 2.4, hd[1] + dy / d * 4.0 + dx / d * k_ * 2.4), ("bone", 6))

    def arm_claw(self, cel: Cel, J: dict[str, Pt], pose: Pose) -> None:
        """The far arm ends in a crab's crusher: a swollen palm and two fingers that open and snap."""
        sh, el, hd = J["shF"], J["elbowF"], J["handF"]
        cel.limb(sh, el, 6.0, 5.0, "crimson", (1, 2, 4), far=True)
        mid = (lerp(el[0], hd[0], 0.45), lerp(el[1], hd[1], 0.45))
        cel.limb(el, mid, 5.0, 4.6, "crimson", (1, 2, 4), far=True)
        cel.limb(mid, hd, 5.0, 8.0, "crimson", (3, 5, 6))
        dx, dy = hd[0] - el[0], hd[1] - el[1]
        d = math.hypot(dx, dy) or 1.0
        ux, uy = dx / d, dy / d
        gape = 1.6 + 3.4 * pose.get("claw_open", 0.5)
        for sgn, length, w0 in ((-1.0, 9.0, 4.6), (1.0, 7.5, 3.6)):
            knuckle = (hd[0] + ux * 3.0 - uy * sgn * (gape * 0.7 + 1.0), hd[1] + uy * 3.0 + ux * sgn * (gape * 0.7 + 1.0))
            tip = (hd[0] + ux * length - uy * sgn * gape * 0.5, hd[1] + uy * length + ux * sgn * gape * 0.5)
            cel.limb(hd, knuckle, w0, w0 - 0.8, "crimson", (3, 5, 6))
            cel.limb(knuckle, tip, w0 - 0.8, 1.0, "crimson", (3, 5, 6))
            cel.put(tip[0], tip[1], ("bone", 7))
            cel.put(tip[0] - ux, tip[1] - uy, ("bone", 6))
        cel.put(mid[0], mid[1] - 1, ("bone", 6))  # a barnacle on the wrist

    def draw(self, cel, J, pose, ropes, between) -> None:
        lean = pose.get("lean", 0.0)
        glow = pose.get("glow", 0.8)
        Lg = {**L, "G": ("light", 0) if glow >= 0.95 else ("sea", 8) if glow >= 0.5 else ("sea", 5) if glow >= 0.15 else ("ink", 0)}
        # The skirts of the coat hanging behind him.
        sk = ropes["skirt"]
        widths = [6.0, 7.8, 8.2, 7.8, 6.6, 5.0]
        for i in range(len(sk) - 1):
            cel.limb(sk[i], sk[i + 1], widths[i], widths[i + 1], "crimson", (0, 1, 3))
        a_, b_ = sk[-2], sk[-1]
        for side in (-2.6, 0.2, 2.4):
            cel.limb((b_[0] + side, b_[1] - 1.0), (b_[0] + side * 1.4 + (b_[0] - a_[0]) * 0.5, b_[1] + 3.2), 2.4, 0.8, "crimson", (0, 1, 2))
        self.arm_claw(cel, J, pose)
        self.leg(cel, J, "F", far=True)
        self.leg(cel, J, "N", far=False)
        px, py = J["pelvis"]
        cel.stamp_lean(TORSO, Lg, (px, py), 9, lean)
        # Head: skull, the beard of tentacles over the chest, and the hat — on it until it is knocked off.
        hx, hy = J["head"]
        turn = J["turn"][0]
        cel.stamp_turn(FACE, Lg, (hx, hy + 2), 7, turn)
        for i, (w0, w1) in enumerate(((2.6, 1.0), (3.0, 1.0), (2.4, 0.9))):
            pts = ropes[f"beard{i}"]
            n = len(pts) - 1
            for j in range(n):
                cel.limb(pts[j], pts[j + 1], w0 + (w1 - w0) * j / n, w0 + (w1 - w0) * (j + 1) / n, "sea", (1, 3, 5))
                if j % 2 == 1:
                    cel.put(pts[j][0] + 1, pts[j][1], ("bone", 6))  # a sucker
        hat = loose(pose, "hat", J["crown"], self.build.root_x)
        cel.stamp_turn(HAT, L, (hat[0], hat[1] + 1.0), 11, lerp(turn + pose.get("hat_tilt", 0.0), pose.get("hat_rot", 0.0), pose.get("hat_free", 0.0)))
        # Chain and anchor, cut off at the ground (the anchor buries its flukes, and at the end goes under whole).
        tmp = Cel(cel.w, cel.h, cel.top)
        links = chain_points(J["handN"], J["ring"], pose.get("slack", 0.0))
        for i, (x, y) in enumerate(links):
            tone = ("ink", 7) if i % 2 == 0 else ("ink", 4)
            for ox, oy in ((0, 0), (1, 0), (0, 1), (1, 1)):
                tmp.put(x + ox, y + oy, tone if (ox, oy) != (1, 1) else ("ink", 2))
        tmp.stamp_pivot(ANCHOR, L, J["ring"], 11.5, 2.0, pose.get("anchor_rot", 0.0))
        for (x, y), tone in tmp.px.items():
            if y < GROUND:
                cel.px[(x, y)] = tone
        self.arm_near(cel, J)
        # The near epaulette sits over the sleeve: a gold pad with its fringe hanging.
        if abs(lean) <= 40.0:
            ex, ey = J["shN"]
            cel.limb((ex - 4.0, ey - 1.0), (ex + 3.0, ey - 1.5), 3.4, 3.4, "brass", (3, 5, 6))
            for i in range(-4, 3, 2):
                cel.put(ex + i, ey + 1.0, ("brass", 4))
                cel.put(ex + i, ey + 2.0, ("brass", 3))
        cel.outline()

        if glow >= 0.5:
            ex, ey = J["eye"]
            cel.put(ex, ey, ("light", 0))
            for ox, oy in ((1, 0), (0, -1), (2, 0)):
                cel.soft(ex + ox, ey + oy, ("sea", 8))
        # The sea still runs off him: drops from the brim of the hat, the elbow, the claw and the hem.
        drip = pose.get("drip", -1.0)
        if drip >= 0.0 and abs(lean) < 45.0:
            for i, (sx, sy) in enumerate((J["brim"], J["elbowN"], J["handF"], (sk[-1][0], sk[-1][1]), (px + 6.0, py + 4.0))):
                u = (drip + i * 0.23) % 1.0
                y = sy + 2.0 + (GROUND - 2.0 - sy) * u * u
                if u < 0.9:
                    cel.soft(sx, y, ("light", 0))
                    cel.soft(sx, y - 1, ("sea", 7))
                    cel.soft(sx, y - 2, ("sea", 4))
                else:
                    for ox in (-2, -1, 1, 2):
                        cel.soft(sx + ox, GROUND - 1 - (abs(ox) == 1), ("sea", 7))
        scrape = pose.get("scrape", 0.0)
        if scrape > 0.05:
            fx = J["ring"][0] - 24.0
            for i in range(6):
                cel.soft(fx - i * 1.8 - scrape * 2.0, GROUND - 1.5 - (i % 2) * 1.3 - scrape, ("bone", 6 if i % 2 else 4))
                cel.soft(fx - i * 1.8 - scrape * 2.0, GROUND - 0.5 - (i % 2) * 1.3 - scrape, ("ink", 2))
        splash = pose.get("splash", 0.0)
        if 0.01 < splash < 0.985:
            self.splash(cel, J["ring"][0], splash)
        sink = pose.get("sink", 0.0)
        if 0.01 < sink < 0.985:
            self.ripples(cel, self.build.root_x + pose.get("hole", -30.0), sink)

    @staticmethod
    def splash(cel: Cel, ix: float, u: float) -> None:
        """The anchor goes in: a tower of water thrown up either side of it, a crown of drops, wet light running along
        the stone. The jets are solid, pale inside and dark-edged, so they read on mist and on dark slabs alike."""
        tmp = Cel(cel.w, cel.h, cel.top)
        rise = math.sin(math.pi * min(1.0, u * 1.15)) ** 0.7  # up fast, hang, fall
        for off, height, lean in ((-11.0, 26.0, -7.0), (-5.5, 42.0, -3.0), (2.5, 48.0, 2.0), (8.0, 34.0, 5.0), (12.0, 20.0, 7.0), (-16.0, 17.0, -10.0)):
            h = height * rise
            if h < 2.0:
                continue
            base, tip = (ix + off, GROUND + 1.0), (ix + off + lean * (0.4 + 0.6 * u), GROUND - h)
            mid = ((base[0] + tip[0]) / 2 + lean * 0.15, (base[1] + tip[1]) / 2)
            tmp.limb(base, mid, 6.0, 4.2, "sea", (5, 7, 8))
            tmp.limb(mid, tip, 4.2, 1.2, "sea", (5, 7, 8))
            tmp.put(tip[0], tip[1], ("light", 0))
        tmp.outline()
        for (x, y), tone in tmp.px.items():
            if y < GROUND and (x, y) not in cel.px:
                cel.px[(x, y)] = tone
        if u < 0.25:
            cel.star(ix, GROUND - 6, 5)
        # The crown of drops flung wider than the jets: each a pale pixel with a dark one under it.
        for i in range(26):
            ang = math.radians(-172 + i * 6.6)
            dist = 6.0 + (16.0 + (i * 5 % 4) * 4.0) * u
            # Thrown high rather than wide: ahead of him it must not reach the next enemy in the line.
            x, y = ix + math.cos(ang) * dist * (0.62 if math.cos(ang) > 0 else 1.0), GROUND - 3 + math.sin(ang) * dist * 1.5 + 16.0 * u * u
            if y < GROUND - 1:
                cel.soft(x, y, ("light", 0) if i % 2 == 0 else ("sea", 7))
                cel.soft(x, y + 1, ("sea", 3))
                if u < 0.6:
                    cel.soft(x + 1, y, ("sea", 7))
                    cel.soft(x + 1, y + 1, ("sea", 2))
        reach = 8.0 + 20.0 * u
        for i in range(int(reach)):
            for sgn in (-1, 1):
                if (i * 7 + (sgn > 0)) % 3 and (sgn < 0 or i < 20):
                    cel.soft(ix + sgn * i, GROUND - 1, ("light", 0) if u < 0.3 else ("sea", 7) if u < 0.65 else ("sea", 5))

    @staticmethod
    def ripples(cel: Cel, ix: float, u: float) -> None:
        """Where the anchor went through the stone: rings spreading on it as on water, and a few drops."""
        for ring in range(3):
            w = u * 1.3 - ring * 0.22
            if not 0.0 < w < 1.0:
                continue
            half = 5.0 + 19.0 * w
            tone = ("light", 0) if w < 0.3 else ("sea", 7) if w < 0.7 else ("sea", 5)
            for i in range(int(-half), int(half) + 1):
                if abs(i) > half * 0.55 or (i + ring) % 2 == 0:
                    cel.soft(ix + i, GROUND - 1 - (1 if abs(i) < half * 0.5 and ring == 0 and w < 0.5 else 0), tone)
        for i in range(8):
            ang = math.radians(-156 + i * 19.0)
            dist = 3.0 + 12.0 * u
            y = GROUND - 2 + math.sin(ang) * dist + 12.0 * u * u
            if y < GROUND - 1 and u < 0.7:
                cel.soft(ix + math.cos(ang) * dist, y, ("sea", 7) if i % 2 else ("light", 0))
                cel.soft(ix + math.cos(ang) * dist, y + 1, ("sea", 3))


# --------------------------------------------------------------------------------------- animations
REST_AT, REST_ROT = (-21.0, 11.5), 82.0
BASE: Pose = dict(dx=0.0, drop=2.0, lean=5.0, footN=(-7.0, 0.0, 0.0), footF=(7.0, 0.0, 0.0), hip_rot=0.0, sh_rot=0.0,
                  armN=-12.0, elbN=18.0, armF=20.0, elbF=46.0, head_dx=0.0, head_dy=0.0, head_rot=4.0, breath=0.0, hat_tilt=-4.0,
                  glow=0.8, two=0.0, claw_open=0.5, drip=0.0, anchor_at=REST_AT, anchor_rot=REST_ROT, slack=5.0, scrape=0.0, splash=0.0, sink=0.0, hole=-30.0,
                  hat_free=0.0, hat_at=(0.0, 0.0), hat_rot=0.0)


def idle_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    late = math.sin(math.tau * (ph - 0.2))
    flick = 1.0 if math.sin(math.tau * 2 * ph + 0.4) > 0.75 else 0.8
    # He stands like a wreck settling: a slow heave of the chest, the head turning, the chain shifting in his fist,
    # and the claw opening and snapping shut, twice.
    snap = 0.1 if 0.52 < ph < 0.58 or 0.68 < ph < 0.74 else 0.55 + 0.35 * math.sin(math.tau * (ph - 0.1))
    return {**BASE, "breath": 0.7 + 0.7 * s, "lean": 5.0 + 1.4 * s, "drop": 2.0 + 0.5 * late, "head_rot": 4.0 + 7.0 * late, "hat_tilt": -4.0 + 2.0 * math.sin(math.tau * (ph - 0.3)),
            "armN": -12.0 + 4.0 * late, "elbN": 18.0 + 5.0 * s, "armF": 20.0 + 6.0 * s, "elbF": 46.0 + 9.0 * late, "slack": 5.0 + 1.5 * late, "glow": flick,
            "claw_open": snap, "drip": ph}


def walk_pose(ph: float) -> Pose:
    c = math.cos(math.tau * ph)
    p: Pose = gait_legs(Gait(stride=0.7, give=1.15, lift=0.6, toe=0.6), ph)
    # A limp on the peg, and the anchor coming after him in jerks: the chain goes taut, the anchor lurches up.
    jerk = max(0.0, math.sin(math.tau * (ph - 0.2)))
    p.update({**{k_: v for k_, v in BASE.items() if k_ not in ("footN", "footF", "drop")},
              "lean": 9.0 + 3.0 * c, "dy": 0.8 * (1 + math.cos(2 * math.tau * (ph - 0.1))) + 1.0 * max(0.0, math.sin(math.tau * (ph - 0.55))), "hip_rot": -0.9 * c, "sh_rot": 0.9 * c,
              "armN": -20.0 - 10.0 * jerk, "elbN": 14.0, "armF": 20.0 + 16.0 * math.cos(math.tau * (ph - 0.2)), "elbF": 44.0 + 8.0 * c,
              "head_rot": 6.0 + 4.0 * math.cos(math.tau * (ph - 0.3)), "head_dy": 0.5 * math.cos(2 * math.tau * (ph - 0.2)), "hat_tilt": -4.0 + 3.0 * math.cos(2 * math.tau * (ph - 0.3)),
              "anchor_at": (REST_AT[0] - 1.0 + 1.8 * jerk, REST_AT[1] + 0.9 * jerk), "anchor_rot": REST_ROT - 5.0 * jerk, "slack": 5.0 * (1.0 - jerk), "scrape": jerk,
              "claw_open": 0.5 + 0.4 * math.sin(2 * math.tau * ph), "drip": (2 * ph) % 1.0})
    return p


def k(**over: object) -> Pose:
    return {**BASE, "drip": -1.0, **over}


# Anchor: hand and claw on the chain, a heave, the anchor up and round over his head, and down in front of him
# flukes first. Then one jerk brings it back over his shoulder to lie where it lay.
_HIT = dict(two=1.0, dx=5.0, drop=7.0, lean=27.0, armN=52.0, elbN=8.0, head_rot=12.0, footN=(-12.0, 0.0, -22.0), footF=(8.0, 0.0, 0.0), anchor_at=(34.0, 21.0),
            anchor_rot=360.0, slack=0.0, glow=1.0, claw_open=0.0)
ANCHOR_KEYS = [
    (0.00, k(), "lin"),
    (0.18, k(two=1.0, dx=-1.0, drop=3.8, lean=12.0, armN=-34.0, elbN=8.0, head_rot=10.0, footN=(-6.0, 0.0, 0.0), footF=(8.0, 0.0, 0.0), anchor_at=(-20.0, 13.0), anchor_rot=84.0,
             slack=0.0, glow=1.0, claw_open=0.0), "out"),
    (0.32, k(two=1.0, dx=-2.0, drop=1.8, lean=-8.0, armN=-118.0, elbN=-24.0, head_rot=-8.0, footN=(-5.0, 0.0, 0.0), footF=(9.0, 1.0, 6.0), anchor_at=(-23.0, 43.0), anchor_rot=100.0,
             slack=0.0, glow=1.0, claw_open=0.0), "io"),
    (0.42, k(two=1.0, dx=-1.0, drop=1.0, lean=-6.0, armN=172.0, elbN=8.0, head_rot=-12.0, footN=(-6.0, 0.0, 0.0), footF=(8.5, 2.4, 10.0), anchor_at=(-3.0, 72.0), anchor_rot=182.0,
             slack=0.0, glow=1.0, claw_open=0.0), "lin"),
    (0.49, k(two=1.0, dx=3.0, drop=3.4, lean=15.0, armN=92.0, elbN=8.0, head_rot=6.0, footN=(-10.0, 0.0, -10.0), footF=(10.0, 0.4, 0.0), anchor_at=(33.0, 48.0), anchor_rot=262.0,
             slack=0.0, glow=1.0, claw_open=0.0), "lin"),
    (0.54, k(**_HIT, splash=0.02), "lin"),
    (0.74, k(**{**_HIT, "drop": 7.8, "lean": 29.0}, splash=0.98), "lin"),
    (0.83, k(two=1.0, dx=0.0, drop=2.8, lean=-6.0, armN=-44.0, elbN=24.0, head_rot=-4.0, footN=(-7.0, 0.0, 0.0), footF=(7.5, 0.6, 4.0), anchor_at=(14.0, 44.0), anchor_rot=300.0,
             slack=0.0, splash=1.0, claw_open=0.2), "in"),
    (0.91, k(two=0.5, dx=-0.5, drop=2.4, lean=-2.0, armN=-74.0, elbN=20.0, head_rot=0.0, anchor_at=(-12.0, 34.0), anchor_rot=188.0, slack=0.0, splash=1.0), "lin"),
    (1.00, k(splash=1.0), "in"),
]

# Hit: he gives almost nothing, but the claw is thrown wide open, the hat slips and the anchor jumps on its chain.
HURT_KEYS = stagger_keys(k(), push=3.6, bend=9.0, buckle=3.2, whip=14.0, over={
    "impact": dict(armF=34.0, elbF=40.0, hat_tilt=-10.0, glow=1.0, claw_open=1.0),
    "reel": dict(armF=-40.0, elbF=44.0, armN=-34.0, elbN=10.0, hat_tilt=-22.0, anchor_at=(REST_AT[0] + 2.0, REST_AT[1] + 4.0), anchor_rot=70.0, slack=0.0, glow=0.3, claw_open=1.0),
    "catch": dict(armF=26.0, elbF=40.0, armN=-8.0, elbN=20.0, hat_tilt=4.0, anchor_at=REST_AT, anchor_rot=REST_ROT, slack=4.0, glow=1.0, claw_open=0.0),
})

# Death: the anchor sinks through the stone and takes him with it as far as it can.
_DOWN = dict(dx=0.0, drop=16.0, lean=-84.0, head_rot=0.0, armN=-92.0, elbN=0.0, armF=96.0, elbF=-16.0, footN=(9.0, 0.6, 20.0), footF=(14.0, 10.0, 70.0),
             anchor_at=(-32.0, -30.0), anchor_rot=10.0, slack=0.0, hat_free=1.0, claw_open=1.0)
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.10, k(dx=-2.6, drop=3.2, lean=-9.0, head_rot=-14.0, head_dx=-1.5, armF=-30.0, elbF=40.0, footN=(-4.4, 0.0, 0.0), footF=(9.6, 1.4, 8.0), hat_tilt=-18.0, glow=1.0, claw_open=1.0), "out3"),
    (0.24, k(dx=-1.0, drop=2.8, lean=4.0, head_rot=-30.0, armN=-40.0, elbN=4.0, armF=24.0, elbF=40.0, footN=(-6.0, 0.0, 0.0), footF=(8.0, 0.0, 0.0),
             anchor_at=(-25.0, 5.0), anchor_rot=60.0, slack=0.0, sink=0.02, glow=1.0), "io"),
    (0.40, k(two=1.0, dx=2.0, drop=5.6, lean=24.0, head_rot=-10.0, armN=-52.0, elbN=0.0, armF=-20.0, elbF=10.0, footN=(-9.0, 0.0, -14.0), footF=(8.0, 0.0, 0.0),
             anchor_at=(-29.0, -8.0), anchor_rot=30.0, slack=0.0, sink=0.35, glow=1.0, claw_open=0.0), "out"),
    (0.50, k(two=1.0, dx=0.0, drop=7.0, lean=14.0, head_rot=-6.0, armN=-58.0, elbN=0.0, armF=-24.0, elbF=10.0, footN=(-7.0, 0.0, -6.0), footF=(10.0, 0.6, 14.0),
             anchor_at=(-30.0, -14.0), anchor_rot=20.0, slack=0.0, sink=0.5, glow=0.8, claw_open=0.0), "io"),
    (0.58, k(dx=-4.0, drop=6.6, lean=-34.0, head_rot=-16.0, armN=-100.0, elbN=0.0, armF=120.0, elbF=10.0, footN=(2.0, 1.0, 10.0), footF=(12.0, 10.0, 40.0),
             anchor_at=(-32.0, -20.0), anchor_rot=12.0, slack=0.0, sink=0.65, hat_free=1.0, hat_at=(5.0, 58.0), hat_rot=-40.0, glow=0.6, claw_open=1.0), "in"),
    (0.66, k(**{**_DOWN, "footF": (14.0, 16.0, 80.0)}, hat_at=(14.0, 46.0), hat_rot=-110.0, sink=0.8, glow=0.4), "in"),
    (0.73, k(**{**_DOWN, "lean": -78.0, "drop": 14.6, "footF": (14.0, 14.0, 76.0)}, hat_at=(21.0, 22.0), hat_rot=-170.0, sink=0.92, glow=0.3), "out"),
    (0.81, k(**_DOWN, hat_at=(26.0, 4.2), hat_rot=-200.0, sink=1.0, glow=0.2), "in"),
    (0.90, k(**{**_DOWN, "footF": (14.0, 8.0, 66.0)}, hat_at=(29.0, 4.2), hat_rot=-186.0, sink=1.0, glow=0.1), "out"),
    (1.00, k(**{**_DOWN, "footF": (14.0, 9.0, 68.0)}, hat_at=(29.0, 4.2), hat_rot=-186.0, sink=1.0, glow=0.0), "lin"),
]

STILL = lambda t: (-0.2 + 0.2 * math.sin(math.tau * t), 0.0)  # noqa: E731

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 12 for i in range(12)], [200] * 12, True, STILL),
    "run": Anim("run", walk_pose, [i / 12 for i in range(12)], [125] * 12, True, lambda t: (-0.5, 0.0)),
    "attack": Anim("attack", keyed(ANCHOR_KEYS), [0.0, 0.09, 0.18, 0.25, 0.32, 0.37, 0.42, 0.455, 0.49, 0.54, 0.59, 0.64, 0.69, 0.74, 0.785, 0.83, 0.87, 0.91, 0.955, 1.0],
                   [90, 100, 130, 80, 100, 60, 70, 40, 40, 60, 70, 80, 90, 130, 80, 70, 60, 60, 60, 120], False, STILL),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, [int(m * 1.15) for m in HURT_MS], False, STILL),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.05, 0.10, 0.17, 0.24, 0.32, 0.40, 0.45, 0.50, 0.54, 0.58, 0.62, 0.66, 0.73, 0.81, 0.90, 1.0],
                  [60, 50, 90, 90, 120, 110, 140, 90, 110, 50, 60, 60, 80, 90, 110, 160, 1400], False, STILL),
}
