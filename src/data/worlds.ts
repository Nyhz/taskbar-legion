// The ten worlds of a difficulty and who lives in each (redesign: docs/redesign/REDESIGN.md §4). Every world has
// a name and four creatures, one per ROLE: a beast (fast, weak), a melee fighter, a ranged one and the stage
// boss. A world may also have a creature of its own for its WORLD boss (the W-10 fight, the wall of the world);
// until it has one, its stage boss stands in there. Presentation data — names and which figure stands for an enemy; the sim's enemy stats do not read it.
// A creature's `key` is the key of its figure in the art pipeline (tools/assets/pipeline/foes).

export type CreatureRole = 'beast' | 'melee' | 'ranged' | 'boss';

export const CREATURE_ROLES: readonly CreatureRole[] = ['beast', 'melee', 'ranged', 'boss'];

export interface CreatureDef {
  key: string;
  name: string;
  role: CreatureRole;
}

export interface WorldDef {
  /** 1–10: its place in a difficulty. */
  index: number;
  name: string;
  creatures: Record<CreatureRole, CreatureDef>;
  /** The creature of its world boss, if it has one of its own. */
  worldBoss?: CreatureDef;
  /** The creature of its SUPPORT (the wave enemy that carries auras: data/enemies SUPPORT_KIND), if it has one of
   *  its own. Until a world has it — and its figure is exported — the strip draws the support with the world's
   *  ranged creature, tinted (render/foeFx). */
  support?: CreatureDef;
}

const creature = (role: CreatureRole, key: string, name: string): CreatureDef => ({ key, name, role });

export const WORLDS: readonly WorldDef[] = [
  {
    index: 1,
    name: 'Golden Meadows',
    creatures: {
      beast: creature('beast', 'boar', 'Bristleback Boar'),
      melee: creature('melee', 'scarecrow', 'Hollow Scarecrow'),
      ranged: creature('ranged', 'poacher', 'Crowfeather Poacher'),
      boss: creature('boss', 'king', 'Harvest King'),
    },
    support: creature('ranged', 'drummer', 'Reaping Drummer'),
    worldBoss: creature('boss', 'crowmother', 'The Crowmother'),
  },
  {
    index: 2,
    name: 'Old Moss Forest',
    creatures: {
      beast: creature('beast', 'spider', 'Thornweaver'),
      melee: creature('melee', 'revenant', 'Mossbound Revenant'),
      ranged: creature('ranged', 'sporecaller', 'Sporecaller'),
      boss: creature('boss', 'warden', 'Antlered Warden'),
    },
    support: creature('ranged', 'bellringer', 'Moss Bell-Ringer'),
    worldBoss: creature('boss', 'mistletoe', 'Our Lady of Mistletoe'),
  },
  {
    index: 3,
    name: 'The Stilt Marshes',
    creatures: {
      beast: creature('beast', 'toad', 'Mire Toad'),
      melee: creature('melee', 'drowned', 'Drowned Fisher'),
      ranged: creature('ranged', 'bogwitch', 'Bog Witch'),
      boss: creature('boss', 'ferryman', 'The Ferryman'),
    },
    support: creature('ranged', 'stiltwalker', 'Marsh Carp-Bearer'),
    worldBoss: creature('boss', 'drownedmoon', 'The Drowned Moon'),
  },
  {
    index: 4,
    name: 'Red Rock Canyons',
    creatures: {
      beast: creature('beast', 'scorpion', 'Dune Scorpion'),
      melee: creature('melee', 'raider', 'Canyon Raider'),
      ranged: creature('ranged', 'vulture', 'Carrion Harrier'),
      boss: creature('boss', 'colossus', 'Sandstone Colossus'),
    },
    support: creature('ranged', 'hornblower', 'War-Horn Bearer'),
    worldBoss: creature('boss', 'scapegoat', 'The Scapegoat'),
  },
  {
    index: 5,
    name: 'Monastery Peaks',
    creatures: {
      beast: creature('beast', 'frostwolf', 'Rime Wolf'),
      melee: creature('melee', 'monk', 'Fallen Monk'),
      ranged: creature('ranged', 'rimewraith', 'Rime Wraith'),
      boss: creature('boss', 'bellbearer', 'The Bell-Bearer'),
    },
    support: creature('ranged', 'wheelturner', 'Wheel-Turner'),
    worldBoss: creature('boss', 'abbot', 'The Gilded Abbot'),
  },
  {
    index: 6,
    name: 'Coast of Sunken Ruins',
    creatures: {
      beast: creature('beast', 'crab', 'Tide Crab'),
      melee: creature('melee', 'legionary', 'Barnacled Legionary'),
      ranged: creature('ranged', 'siren', 'Siren'),
      boss: creature('boss', 'admiral', 'The Drowned Admiral'),
    },
    support: creature('ranged', 'tideaugur', 'Tide Augur'),
    worldBoss: creature('boss', 'ninthwave', 'The Ninth Wave'),
  },
  {
    index: 7,
    name: 'Caverns of Crystal and Fungus',
    creatures: {
      beast: creature('beast', 'beetle', 'Geode Beetle'),
      melee: creature('melee', 'shardling', 'Shardling'),
      ranged: creature('ranged', 'bat', 'Gloom Bat'),
      boss: creature('boss', 'geode', 'The Geode Titan'),
    },
    support: creature('ranged', 'lightangler', 'Light Angler'),
    worldBoss: creature('boss', 'amanita', 'The Destroying Angel'),
  },
  {
    index: 8,
    name: 'Ash Lands and Forges',
    creatures: {
      beast: creature('beast', 'salamander', 'Magma Salamander'),
      melee: creature('melee', 'smith', 'Forge Brute'),
      ranged: creature('ranged', 'slagimp', 'Slag Imp'),
      boss: creature('boss', 'magmawyrm', 'Forge Wyrm'),
    },
    support: creature('ranged', 'stoker', 'Ember Stoker'),
    worldBoss: creature('boss', 'quench', 'The Quench'),
  },
  {
    index: 9,
    name: 'Citadel among the Clouds',
    creatures: {
      beast: creature('beast', 'gryphon', 'Citadel Gryphon'),
      melee: creature('melee', 'templar', 'Sky Templar'),
      ranged: creature('ranged', 'cantor', 'Storm Cantor'),
      boss: creature('boss', 'archon', 'The Archon'),
    },
    support: creature('ranged', 'kiteflyer', 'Kite Acolyte'),
    worldBoss: creature('boss', 'verdict', 'The Verdict'),
  },
  {
    index: 10,
    name: 'The Rift',
    creatures: {
      beast: creature('beast', 'voidmaw', 'Void Maw'),
      melee: creature('melee', 'echo', 'Riftbound Echo'),
      ranged: creature('ranged', 'weaver', 'Star Weaver'),
      boss: creature('boss', 'lictor', 'The Lictor'),
    },
    support: creature('ranged', 'hourbearer', 'Hour Bearer'),
    worldBoss: creature('boss', 'unmaker', 'The Unmaker'),
  },
];

/** The world at `index` (1–10), or undefined for a number out of range (a stale value must not throw). */
export function tryWorldDef(index: number): WorldDef | undefined {
  return WORLDS[index - 1];
}

/** Every creature of every world: its cast of four and, where it has one, the creature of its world boss. */
export function allCreatures(): CreatureDef[] {
  return WORLDS.flatMap((w) => [...CREATURE_ROLES.map((role) => w.creatures[role]), ...(w.worldBoss === undefined ? [] : [w.worldBoss]), ...(w.support === undefined ? [] : [w.support])]);
}
