import { describe, it, expect, afterEach } from 'vitest';
import { foeMagicShare, mixedMitigation } from '@/sim/damageMix';
import { refreshAuras } from '@/sim/enemyTraits';
import { BOSS_MAGIC_SHARE, bossMagicShare } from '@/data/bossKit';
import { WORLDS } from '@/data/worlds';
import { globalStageOf } from '@/data/difficulties';
import { auraValue, SUPPORT_INNATE_AURAS } from '@/data/enemies';
import { ENRAGE_RAMP_MS_BY_DIFFICULTY, enrageMultiplier, enrageRampMs, mitigation } from '@/data/stageScaling';
import { bossMarks } from '@/ui/hud/bossMarks';
import { setLanguage } from '@/i18n';
import { unit } from './_kit';

// Round 5 (2026-11-16): every boss hits with a FIXED physical/magic mix (60/40 or 40/60), a support's Enchanted
// Weapons turn part of its wave's hits magic, and the enrage ramps harder from Inferno.

afterEach(() => setLanguage('en'));

describe('physical and magic damage', () => {
  it('every stage and world boss has its own mix, 25 % or 75 % magic (round 14), the same every time it appears', () => {
    for (const w of WORLDS) {
      for (const key of [w.creatures.boss.key, w.worldBoss?.key ?? '']) expect([0.25, 0.75]).toContain(BOSS_MAGIC_SHARE[key]);
    }
    const shares = Object.values(BOSS_MAGIC_SHARE);
    expect(shares.filter((m) => m > 0.5).length).toBeGreaterThan(5); // some lean on spells…
    expect(shares.filter((m) => m < 0.5).length).toBeGreaterThan(5); // …and some on steel
    // Keyed by the world's creature, so the same on every difficulty.
    for (let world = 1; world <= 10; world++) {
      expect(bossMagicShare(globalStageOf(0, world, 10), 'world')).toBe(bossMagicShare(globalStageOf(4, world, 10), 'world'));
      expect(bossMagicShare(globalStageOf(1, world, 5), 'stage')).toBe(BOSS_MAGIC_SHARE[WORLDS[world - 1]?.creatures.boss.key ?? '']);
    }
  });

  it('a hit is split by the share and each part is turned away by its own defence', () => {
    const S = 250;
    const armor = mitigation(400, S);
    const mr = mitigation(100, S);
    expect(mixedMitigation(400, 100, 0, S)).toBeCloseTo(armor, 12);
    expect(mixedMitigation(400, 100, 1, S)).toBeCloseTo(mr, 12);
    expect(mixedMitigation(400, 100, 0.6, S)).toBeCloseTo(0.4 * armor + 0.6 * mr, 12);
    // Without magic resist the magic part comes through whole.
    expect(mixedMitigation(400, 0, 0.4, S)).toBeCloseTo(0.6 * armor, 12);
  });

  it('who hits with what: a boss its mix, a caster all magic, a soldier steel — and a spell keeps its own kind', () => {
    const boss = unit({ id: 'b', side: 'enemy', isBoss: true, magicShare: 0.6 });
    expect(foeMagicShare(boss)).toBe(0.6);
    expect(foeMagicShare(boss, true)).toBe(1); // Chain Lightning
    expect(foeMagicShare(boss, false)).toBe(0);
    expect(foeMagicShare(unit({ id: 's', side: 'enemy', enemyMagic: true }))).toBe(1);
    expect(foeMagicShare(unit({ id: 'g', side: 'enemy' }))).toBe(0);
  });

  it("a living support's Enchanted Weapons turn part of its wave's hits magic; they end with it", () => {
    expect(SUPPORT_INNATE_AURAS).toContain('enchant');
    const S = globalStageOf(2, 4, 5);
    const support = unit({ id: 'sup', side: 'enemy', enemyMagic: true, enemyRole: 'support', auras: ['enchant'] });
    const grunt = unit({ id: 'g', side: 'enemy', enemyRole: 'soldier' });
    const wave = [support, grunt];
    refreshAuras(wave, S);
    expect(foeMagicShare(grunt)).toBeCloseTo(auraValue('enchant', 2) / 100, 12);
    expect(foeMagicShare(support)).toBe(1); // its own tap stays all magic
    support.alive = false;
    refreshAuras(wave, S);
    expect(foeMagicShare(grunt)).toBe(0);
  });

  it("the boss's mark says what it hits with, signed by the defence that matters more", () => {
    setLanguage('es');
    const steel = bossMarks({ magicShare: 0.25, bossRank: 'world' }, 110)[0];
    expect(steel?.kind).toBe('damage');
    expect(steel?.sign).toBe('stat_armor');
    expect(steel?.help).toBe('Cada golpe es un 75 % físico, que frena la armadura, y un 25 % mágico, que frena la resistencia mágica.');
    const spells = bossMarks({ magicShare: 0.75, bossRank: 'stage' }, 110)[0];
    expect(spells?.sign).toBe('stat_magicResist');
    expect(spells?.name).toBe('Sobre todo mágico');
    // A boss with no mix on record (an old save) shows no such mark.
    expect(bossMarks({ bossRank: 'stage' }, 110).some((m) => m.kind === 'damage')).toBe(false);
  });
});

describe('the enrage', () => {
  it('ramps harder from Inferno: twice as hard every second past the window', () => {
    expect(enrageRampMs(0)).toBe(ENRAGE_RAMP_MS_BY_DIFFICULTY[0]);
    expect(enrageRampMs(2)).toBe(1000);
    expect(enrageRampMs(4)).toBe(1000);
    expect(enrageRampMs(1)).toBeGreaterThan(enrageRampMs(2));
    expect(enrageMultiplier(65_000, 60_000, 1000)).toBeCloseTo(32, 9);
    expect(enrageMultiplier(65_000, 60_000, 2000)).toBeCloseTo(2 ** 2.5, 9);
    expect(enrageMultiplier(59_000, 60_000, 1000)).toBe(1);
  });
});
