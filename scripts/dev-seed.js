// dev-seed.js — a JS expression for scripts/shot-app.mjs (--step "$(cat scripts/dev-seed.js)"): fills the running
// dev game with a party, worn gear, a bag and a stash so the panels can be looked at. Dev server only.
(async () => {
  const useStore = window.__tlStore ?? (await import('/src/state/store.ts')).useStore;
  const { composeItem } = await import('/src/sim/loot.ts');
  const { makeRng } = await import('/src/sim/rng.ts');
  const { generateGem } = await import('/src/sim/gems.ts');
  const { GENERATOR_VERSION } = await import('/src/data/lootTables.ts');
  const origin = (seed, S = 120) => ({ rollSeed: seed, stageIndex: S, chestType: 'normal', generatorVersion: GENERATOR_VERSION });
  let n = 0;
  const item = (slot, tier, cls) => { n += 1; return { ...composeItem(slot, tier, origin(5000 + n), makeRng(5000 + n), undefined, cls), id: `seed-i${n}` }; };
  const gem = (tier) => { n += 1; return { ...generateGem({ rollSeed: 7000 + n, stageIndex: 120, generatorVersion: GENERATOR_VERSION }, tier), id: `seed-g${n}` }; };
  const s = useStore.getState();
  const knight = s.roster[0];
  const worn = {
    helmet: item('helmet', 3, 'knight'), chest: item('chest', 5, 'knight'), gloves: item('gloves', 1, 'knight'),
    legs: item('legs', 3, 'knight'), boots: item('boots', 0, 'knight'), weapon: item('weapon', 3, 'knight'),
    offhand: item('offhand', 5, 'knight'), ring: item('ring', 8), amulet: item('amulet', 1),
  };
  const roster = [
    { ...knight, level: 47, talentPoints: 3, equipment: worn },
    { ...knight, id: 'seed-h1', classKey: 'ranger', level: 45, exp: 0, equipment: { weapon: item('weapon', 2, 'ranger') }, talentPoints: 2, talents: {}, activeAbilities: [], loadouts: [null, null] },
  ];
  const bag = [
    item('helmet', 5, 'knight'), item('boots', 3, 'knight'), item('chest', 3, 'priest'), item('weapon', 5, 'ranger'), gem(2), gem(2),
    item('weapon', 8, 'priest'), item('offhand', 3, 'ranger'), item('legs', 5, 'priest'), item('amulet', 5), item('gloves', 5, 'ranger'), item('offhand', 1, 'knight'),
    gem(2), item('ring', 3), item('gloves', 3, 'knight'), item('weapon', 1, 'priest'), item('trinket', 1), item('weapon', 1, 'knight'),
    item('helmet', 1, 'ranger'), item('legs', 1, 'knight'), gem(3),
  ];
  const stash = [
    item('chest', 3, 'knight'), item('weapon', 5, 'knight'), item('helmet', 0, 'priest'), item('weapon', 3, 'ranger'), item('ring', 5), item('amulet', 3),
    gem(2), gem(3), gem(2), item('boots', 1, 'ranger'), item('offhand', 2, 'priest'), item('trinket', 5),
    item('offhand', 3, 'knight'), item('gloves', 2, 'ranger'), item('chest', 5, 'knight'), item('weapon', 3, 'priest'), gem(1), item('boots', 5, 'knight'),
  ];
  useStore.setState({ roster, selectedHeroId: knight.id, inventory: bag, inventorySlotUpgrades: 6, stash, stashPages: 2, stashSlotUpgrades: 0 });
  return { heroes: roster.length, bag: bag.length, stash: stash.length };
})()
