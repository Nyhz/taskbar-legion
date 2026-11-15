// The ten worlds of a difficulty and who lives in each (redesign: docs/redesign/REDESIGN.md §4). Every world has
// a name and four creatures, one per ROLE: a beast (fast, weak), a melee fighter, a ranged one and the stage
// boss. Presentation data — names and which figure stands for an enemy; the sim's enemy stats do not read it.
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
  },
  {
    index: 10,
    name: 'The Rift',
    creatures: {
      beast: creature('beast', 'voidmaw', 'Void Maw'),
      melee: creature('melee', 'echo', 'Riftbound Echo'),
      ranged: creature('ranged', 'weaver', 'Star Weaver'),
      boss: creature('boss', 'unmaker', 'The Unmaker'),
    },
  },
];

/** The world at `index` (1–10), or undefined for a number out of range (a stale value must not throw). */
export function tryWorldDef(index: number): WorldDef | undefined {
  return WORLDS[index - 1];
}

/** Every creature of every world. */
export function allCreatures(): CreatureDef[] {
  return WORLDS.flatMap((w) => CREATURE_ROLES.map((role) => w.creatures[role]));
}
