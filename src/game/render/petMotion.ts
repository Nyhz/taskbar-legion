// How the party's COMPANION moves in the strip (no Pixi here — pure, unit-tested). The chosen pet is cosmetic: it
// is not in the simulation, takes no damage and is nobody's target. It lives BEHIND the rearmost hero and reacts
// to things the game already knows (a boss falling, a chest dropping, a hero gaining a level, the party falling).
//
// Two ways of moving (`PetStyle.kind`):
//   a FLIER hovers behind the last hero at shoulder height; when the party walks on it lifts, comes up to the
//     last hero's shoulder and flies along; when they stop it falls back to its place — and one that `perches`
//     comes down to stand on the path once the party has stood a while;
//   a WALKER never leaves the path: it sits behind the party, gets up and trots after it when it walks on, and
//     sits down again where the party stops.
// Coming to rest on the path and leaving it take a moment each (`settleMs`, `launchMs`): the strip plays the
// pet's `settle` and `takeoff` clips over them, so nothing changes clip dry.
//
// Positions are in the strip's world x (the heroes' own space) and `alt`, art pixels of its feet above the path.
// One rule keeps it off the heroes' bars, chips and numbers, however the heroes bunch up (a hero close behind
// another wears his bar a storey higher — GameStrip.layoutHeroHuds): it never passes the LINE behind the last
// hero (`clearBehind`). Everything a hero wears is centred on him; behind that line there is only air.

export type PetKind = 'flier' | 'walker';

/** How one pet moves, in art pixels and ms. */
export interface PetStyle {
  kind: PetKind;
  /** A flier that comes down to stand on the path when the party has stood a while. */
  perches: boolean;
  /** Its place at rest: this far behind the last hero's root (a flier's feet `homeAlt` high). */
  homeBehind: number;
  homeAlt: number;
  /** Where a flier stands when it comes down. */
  perchBehind: number;
  /** Going with the party, a flier flies this high. */
  travelAlt: number;
  /** The line it never passes, this far behind the last hero's root: at least the reach of its figure (its
   *  wings' half span) clear of where a hero's bar begins (HERO_BACK). */
  clearBehind: number;
  /** It keeps this far inside the strip's left edge, so a camera that has panned ahead never leaves it cut by
   *  the edge — unless the last hero himself is that close to it. */
  edge: number;
  /** Time on the path before it leaves it (its `takeoff` clip) and after it comes to rest (its `settle` clip). */
  launchMs: number;
  settleMs: number;
  /** At rest it plays its `fidget` clip this often; 0 = it has none. */
  fidgetEveryMs: number;
  /** Width of the shadow under it on the path, in art px (it narrows and fades as a flier climbs). */
  shadow: number;
}

/** A hero's bar and chips begin this far behind his root (render/stripHud: the widest HUD, centred on his body). */
export const HERO_BACK = 10;

// The Scholar Owl is the reference. The Coin Sprite and the Time Imp never land (their fidgets are the flip and the
// turn of the glass); the Lucky Cat, the Pack Mule and the Hoarder walk (the Hoarder's chest does).
export const PET_STYLES: Readonly<Record<string, PetStyle>> = {
  scholar_owl: { kind: 'flier', perches: true, homeBehind: 40, homeAlt: 19, perchBehind: 36, travelAlt: 33, clearBehind: 29, edge: 21, launchMs: 220, settleMs: 330, fidgetEveryMs: 0, shadow: 15 },
  coin_sprite: { kind: 'flier', perches: false, homeBehind: 33, homeAlt: 24, perchBehind: 31, travelAlt: 34, clearBehind: 24, edge: 16, launchMs: 120, settleMs: 220, fidgetEveryMs: 7000, shadow: 9 },
  lucky_cat: { kind: 'walker', perches: false, homeBehind: 31, homeAlt: 0, perchBehind: 31, travelAlt: 0, clearBehind: 24, edge: 16, launchMs: 160, settleMs: 260, fidgetEveryMs: 9000, shadow: 17 },
  pack_mule: { kind: 'walker', perches: false, homeBehind: 34, homeAlt: 0, perchBehind: 34, travelAlt: 0, clearBehind: 25, edge: 16, launchMs: 120, settleMs: 230, fidgetEveryMs: 11000, shadow: 19 },
  time_imp: { kind: 'flier', perches: false, homeBehind: 31, homeAlt: 22, perchBehind: 29, travelAlt: 33, clearBehind: 22, edge: 14, launchMs: 120, settleMs: 230, fidgetEveryMs: 8000, shadow: 9 },
  hoarder: { kind: 'walker', perches: false, homeBehind: 31, homeAlt: 0, perchBehind: 31, travelAlt: 0, clearBehind: 23, edge: 11, launchMs: 150, settleMs: 240, fidgetEveryMs: 10000, shadow: 16 },
};

const DEFAULT_STYLE: PetStyle = { kind: 'flier', perches: false, homeBehind: 36, homeAlt: 22, perchBehind: 34, travelAlt: 34, clearBehind: 28, edge: 20, launchMs: 150, settleMs: 250, fidgetEveryMs: 0, shadow: 9 };

/** How a pet moves; one with no entry of its own flies like a plain flier. */
export function petStyle(key: string): PetStyle {
  return PET_STYLES[key] ?? DEFAULT_STYLE;
}

/** What every pet's movement shares, in art pixels, px/s and ms. */
export const PET_FLIGHT = {
  /** How much of the party's speed it matches outright; the rest it makes up, so it trails a little and catches up. */
  keepPace: 0.85,
  /** The party counts as walking above this speed, and as stopped below the lower one. */
  walkFrom: 30,
  walkBelow: 8,
  /** A flier that perches comes down after the party has stood this long. */
  perchAfterMs: 5000,
  /** At rest on the path, it leaves it again when its place has moved this far from it. */
  leash: 14,
  /** Further than this from where it should be (a teleport, the party back from a defeat) it is simply put there. */
  snapBeyond: 260,
  maxSpeed: 190,
  maxClimb: 120,
  /** The springs that carry it: stiffness and damping, sideways and up. */
  kx: 16,
  cx: 7.2,
  ky: 34,
  cy: 10.5,
  /** A flier's push off the path, px/s upwards. */
  spring: 70,
  /** Hovering, it drifts this much about its place (px), on these periods (ms). */
  driftX: 2.5,
  driftAlt: 1.5,
  driftXMs: 4300,
  driftAltMs: 3100,
  /** Faster than this sideways a flier is "going" (leaning into it) rather than hovering; a walker, trotting. */
  flyFrom: 34,
  trotFrom: 10,
  /** A flier coming down to the path shows its `land` clip under this height. */
  landFrom: 14,
  /** A walker sits down once it is this close to its place and this slow. */
  arriveWithin: 2.5,
  arriveBelow: 14,
  /** A new companion comes in from this far behind its place. */
  enterBehind: 150,
} as const;

/** What it is doing: at rest behind the party, going with it, down on the path (a flier), grieving. */
export type PetMode = 'hover' | 'travel' | 'perch' | 'mourn';
export type PetReaction = 'cheer' | 'spot' | 'ding';
export type PetClip = 'idle' | 'move' | 'perch' | 'land' | 'settle' | 'takeoff' | 'fidget' | 'mourn' | PetReaction;

/** What the companion needs to know of the strip this frame. */
export interface PetScene {
  /** World x of the rearmost hero's root, as drawn. */
  rearX: number;
  /** The party lies fallen (the defeat's first beat). */
  fallen: boolean;
  /** World x of the strip's left edge, when known: the companion keeps inside it. */
  leftX?: number;
  /** It is in the middle of a reaction: a walker stays where it is until it is done. */
  hold?: boolean;
}

export interface PetState {
  x: number;
  alt: number;
  vx: number;
  valt: number;
  mode: PetMode;
  /** At rest ON the path: a flier standing, a walker sitting (or either grieving there). */
  grounded: boolean;
  /** Countdowns: about to leave the path; just come to rest on it. */
  launchMs: number;
  settleMs: number;
  /** +1 looking the way the party goes, −1 going back. */
  facing: 1 | -1;
  /** How long the party has stood still, ms. */
  stillMs: number;
  /** The party's own speed, smoothed (px/s): what the pet keeps pace with. */
  partyV: number;
  lastRearX: number;
  walking: boolean;
  clockMs: number;
}

export function petStart(scene: PetScene, style: PetStyle, fromBehind = true): PetState {
  const walker = style.kind === 'walker';
  return {
    x: scene.rearX - style.homeBehind - (fromBehind ? PET_FLIGHT.enterBehind : 0),
    alt: walker ? 0 : style.homeAlt + (fromBehind ? 14 : 0),
    vx: 0,
    valt: 0,
    mode: 'hover',
    grounded: walker && !fromBehind,
    launchMs: 0,
    settleMs: 0,
    facing: 1,
    stillMs: 0,
    partyV: 0,
    lastRearX: scene.rearX,
    walking: false,
    clockMs: 0,
  };
}

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/** Down on the path and at rest there. */
export function petLanded(s: PetState): boolean {
  return s.grounded;
}

/** What is the same for every pet each frame: the clock, the party's speed, whether it walks, the countdowns. */
function tick(s: PetState, scene: PetScene, dtMs: number, dt: number): PetState {
  const F = PET_FLIGHT;
  const n: PetState = { ...s, clockMs: s.clockMs + dtMs };
  // The party's speed, from where its last hero is drawn; a jump (teleport, revival) is not speed.
  const moved = scene.rearX - s.lastRearX;
  n.lastRearX = scene.rearX;
  const jumped = Math.abs(moved) > 60;
  n.partyV = jumped ? 0 : s.partyV + (moved / dt - s.partyV) * Math.min(1, dt * 8);
  n.walking = s.walking ? n.partyV > F.walkBelow : n.partyV > F.walkFrom;
  n.stillMs = n.walking ? 0 : s.stillMs + dtMs;
  n.settleMs = Math.max(0, s.settleMs - dtMs);
  return n;
}

/** Where it may be, between the strip's left edge (if there is room) and the line behind the last hero. */
function allowed(tx: number, scene: PetScene, style: PetStyle): number {
  const inside = scene.leftX === undefined ? Number.NEGATIVE_INFINITY : scene.leftX + style.edge;
  return Math.min(Math.max(tx, inside), scene.rearX - style.clearBehind);
}

/** At rest on the path and wanting to leave it: spend `launchMs` there first. True once it may go. */
function launched(n: PetState, s: PetState, style: PetStyle, dtMs: number): boolean {
  if (s.launchMs <= 0) {
    n.launchMs = style.launchMs;
    n.settleMs = 0;
    return style.launchMs <= 0;
  }
  n.launchMs = s.launchMs - dtMs;
  return n.launchMs <= 0;
}

function flierStep(s: PetState, n: PetState, scene: PetScene, style: PetStyle, dtMs: number, dt: number): PetState {
  const F = PET_FLIGHT;
  const inside = scene.leftX === undefined ? Number.NEGATIVE_INFINITY : scene.leftX + style.edge;
  // What it wants to be doing.
  if (scene.fallen) n.mode = 'mourn';
  else if (n.walking) n.mode = 'travel';
  else if (s.mode === 'mourn' || s.mode === 'travel') n.mode = 'hover';
  else if (s.mode === 'hover' && style.perches && n.stillMs >= F.perchAfterMs) n.mode = 'perch';
  else if (s.mode === 'perch' && s.grounded && (Math.abs(scene.rearX - style.perchBehind - s.x) > F.leash || s.x < inside - 4)) n.mode = 'hover';

  const down = n.mode === 'perch' || n.mode === 'mourn';
  if (s.grounded) {
    // On the path: it stays where it landed — unless it now wants the air, and then it crouches first.
    n.vx = 0;
    n.valt = 0;
    n.alt = 0;
    if (down) {
      n.launchMs = 0;
      return n;
    }
    if (!launched(n, s, style, dtMs)) return n;
    n.grounded = false;
    n.launchMs = 0;
    n.valt = F.spring;
    return n;
  }

  // Where that puts it.
  let tx: number;
  let talt: number;
  if (n.mode === 'travel') {
    tx = scene.rearX - style.clearBehind;
    talt = style.travelAlt;
  } else if (down) {
    tx = scene.rearX - style.perchBehind;
    talt = 0;
  } else {
    tx = scene.rearX - style.homeBehind + F.driftX * Math.sin((n.clockMs / F.driftXMs) * Math.PI * 2);
    talt = style.homeAlt + F.driftAlt * Math.sin((n.clockMs / F.driftAltMs) * Math.PI * 2);
  }
  if (Math.abs(tx - s.x) > F.snapBeyond) {
    return { ...n, x: scene.rearX - style.homeBehind, alt: n.mode === 'mourn' ? 0 : style.homeAlt, vx: 0, valt: 0, grounded: n.mode === 'mourn', mode: n.mode === 'mourn' ? 'mourn' : 'hover' };
  }
  tx = allowed(tx, scene, style);

  // Sideways it keeps pace with the party (so it is not dragged behind a walking one) and springs to its place.
  const ax = F.kx * (tx - s.x) - F.cx * (s.vx - n.partyV * F.keepPace);
  n.vx = clamp(s.vx + ax * dt, -F.maxSpeed, F.maxSpeed);
  n.x = s.x + n.vx * dt;
  const ay = F.ky * (talt - s.alt) - F.cy * s.valt;
  n.valt = clamp(s.valt + ay * dt, -F.maxClimb, F.maxClimb);
  n.alt = Math.max(0, s.alt + n.valt * dt);
  // The rule holds against the spring's own overshoot too.
  const line = scene.rearX - style.clearBehind;
  if (n.x > line) {
    n.x = line;
    n.vx = Math.min(n.vx, n.partyV);
  }
  if (down && n.alt <= 0.5 && Math.abs(n.valt) < 40) {
    n.alt = 0;
    n.valt = 0;
    n.vx = 0;
    n.grounded = true;
    n.settleMs = style.settleMs;
  }
  if (Math.abs(n.vx) > F.flyFrom) n.facing = n.vx - n.partyV * 0.5 >= 0 ? 1 : -1;
  else n.facing = 1; // at rest it looks at the fight
  return n;
}

function walkerStep(s: PetState, n: PetState, scene: PetScene, style: PetStyle, dtMs: number, dt: number): PetState {
  const F = PET_FLIGHT;
  n.alt = 0;
  n.valt = 0;
  if (scene.fallen) {
    // It lies down where it is.
    return { ...n, mode: 'mourn', grounded: true, vx: 0, launchMs: 0, settleMs: s.mode === 'mourn' ? n.settleMs : 0 };
  }
  const tx = allowed(n.walking ? scene.rearX - style.clearBehind : scene.rearX - style.homeBehind, scene, style);
  if (Math.abs(tx - s.x) > F.snapBeyond) {
    return { ...n, x: allowed(scene.rearX - style.homeBehind, scene, style), vx: 0, mode: 'hover', grounded: true, launchMs: 0, settleMs: 0 };
  }
  if (scene.hold === true) {
    return { ...n, vx: 0, launchMs: 0, mode: s.mode === 'mourn' ? 'hover' : s.mode }; // mid-reaction it stays put; it catches up after
  }
  if (s.grounded) {
    // Sitting: it gets up when the party walks on or its place has moved away from it.
    n.vx = 0;
    n.mode = 'hover';
    const leave = n.walking || Math.abs(tx - s.x) > F.leash;
    if (!leave) {
      n.launchMs = 0;
      return n;
    }
    if (!launched(n, s, style, dtMs)) return n;
    n.grounded = false;
    n.launchMs = 0;
    return n;
  }
  // On its feet: it keeps pace with the party and makes for its place; there, it sits.
  const ax = F.kx * (tx - s.x) - F.cx * (s.vx - n.partyV * F.keepPace);
  n.vx = clamp(s.vx + ax * dt, -F.maxSpeed, F.maxSpeed);
  n.x = s.x + n.vx * dt;
  const line = scene.rearX - style.clearBehind;
  if (n.x > line) {
    n.x = line;
    n.vx = Math.min(n.vx, n.partyV);
  }
  n.mode = 'travel';
  if (!n.walking && Math.abs(tx - n.x) < F.arriveWithin && Math.abs(n.vx) < F.arriveBelow) {
    n.vx = 0;
    n.grounded = true;
    n.settleMs = style.settleMs;
    n.mode = 'hover';
  }
  if (Math.abs(n.vx) > F.trotFrom) n.facing = n.vx >= 0 ? 1 : -1;
  else n.facing = 1;
  return n;
}

/** Advance the companion by `dtMs`. Returns a new state; `s` is not changed. */
export function petStep(s: PetState, scene: PetScene, dtMs: number, style: PetStyle): PetState {
  const dt = Math.min(dtMs, 50) / 1000; // a long frame must not blow the springs up
  if (dt <= 0) return s;
  const n = tick(s, scene, dtMs, dt);
  return style.kind === 'walker' ? walkerStep(s, n, scene, style, dtMs, dt) : flierStep(s, n, scene, style, dtMs, dt);
}

/** The clip it shows when nothing has made it react. */
export function petBaseClip(s: PetState, style: PetStyle): PetClip {
  if (style.kind === 'walker') {
    if (s.mode === 'mourn') return 'mourn';
    if (!s.grounded) return Math.abs(s.vx) > PET_FLIGHT.trotFrom ? 'move' : 'takeoff';
    if (s.launchMs > 0) return 'takeoff';
    return s.settleMs > 0 ? 'settle' : 'idle';
  }
  if (s.grounded) {
    if (s.launchMs > 0) return 'takeoff';
    if (s.settleMs > 0) return 'settle';
    return s.mode === 'mourn' ? 'mourn' : 'perch';
  }
  if ((s.mode === 'perch' || s.mode === 'mourn') && s.alt < PET_FLIGHT.landFrom) return 'land';
  return Math.abs(s.vx) > PET_FLIGHT.flyFrom ? 'move' : 'idle';
}

/** Whether the companion has passed the line behind the last hero (it never should). */
export function petPastLine(s: PetState, rearX: number, style: PetStyle): boolean {
  return s.x > rearX - style.clearBehind + 0.01;
}

/** The shadow under it on the path: its width in art px and its strength 0–1 (nothing once a flier is high). */
export function petShadow(s: PetState, style: PetStyle): { width: number; alpha: number } {
  const fade = clamp(1 - s.alt / 42, 0, 1);
  return { width: Math.max(3, Math.round(style.shadow - s.alt / 6)), alpha: fade };
}
