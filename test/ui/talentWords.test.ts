import { afterEach, describe, expect, it } from 'vitest';
import { ABILITIES } from '@/data/abilities';
import { CLASS_KEYS } from '@/data/classes';
import { talentNodes, tryTalentNode } from '@/data/talents';
import { heroAbilities, heroBaseStats } from '@/sim/loadout';
import { aggregate } from '@/sim/stats';
import { canSpend } from '@/sim/talentRules';
import { setLanguage, talentNodeDescription, talentNodeName } from '@/i18n';
import { abilityLines, figure, fireLine, nodeKindName, nodeRequirementLine, signed, spendBlockLine, targetName, ultimateFireLine } from '@/ui/panels/hero/talentWords';
import { ULTIMATES, type UltimateDef } from '@/data/ultimates';

// The words of the talents wing in both languages: written here from the facts the simulation hands over.

afterEach(() => setLanguage('en'));

const stats = aggregate(heroBaseStats('knight', 60), []);

describe('talent words', () => {
  it('says in words why a node cannot be raised, naming what is in the way', () => {
    const line = (talents: Record<string, number>, key: string, points = 5): string => {
      const c = canSpend('knight', talents, points, key);
      return c.ok ? 'ok' : spendBlockLine('knight', c, tryTalentNode('knight', key));
    };
    const trunk = Object.fromEntries(talentNodes('knight').filter((n) => n.lane === 'trunk' && n.kind !== 'ability').map((n) => [n.key, 5]));
    const build = { ...trunk, knight_guard: 5, knight_bulwark: 5 };
    const deep = { ...build, knight_bastion_t5_magicResist: 5, knight_close_ranks: 5, knight_bastion_t7_health: 5, knight_bastion_t8_block: 5, knight_scourge_t5_block: 5 }; // 90 spent

    expect(line({}, 'knight_bulwark')).toBe('Opens at 10 points spent.');
    expect(line({}, 'knight_guard', 0)).toBe(''); // nothing to spend is not a warning
    expect(line(build, 'knight_riposte')).toMatch(/^Already has 2 abilities/);
    expect(line(build, 'knight_mod_crippling_cleave')).toBe('Needs Debilitating Cleave.');
    expect(line({ ...build, knight_mod_shared_skin: 1 }, 'knight_mod_mending_bulwark')).toBe('Choose one: Shared Skin is already taken.');
    expect(line(deep, 'knight_cap_living_wall')).toBe('Needs 25 points in Bastion (has 20).');
    expect(line(deep, 'knight_cap_vengeance')).toBe('Needs 25 points in Scourge (has 5).');
    expect(spendBlockLine('knight', { reason: 'needsAbility', abilityKey: 'gone_ability' })).toBe('Needs gone_ability.');

    setLanguage('es');
    expect(line({}, 'knight_bulwark')).toBe('Se abre con 10 puntos gastados.');
    expect(line(build, 'knight_riposte')).toMatch(/^Ya lleva 2 habilidades/);
    expect(line(build, 'knight_mod_crippling_cleave')).toBe('Necesita Tajo debilitante.');
    expect(line({ ...build, knight_mod_shared_skin: 1 }, 'knight_mod_mending_bulwark')).toBe('Elige una: ya tienes Piel compartida.');
    expect(line(deep, 'knight_cap_living_wall')).toBe('Necesita 25 puntos en Bastión (lleva 20).');
  });

  it('words what a node asks for beyond its tier', () => {
    const req = (key: string): string | undefined => {
      const n = tryTalentNode('ranger', key);
      return n === undefined ? '?' : nodeRequirementLine('ranger', n);
    };
    expect(req('ranger_cap_killing_field')).toBe('Needs 25 points in Stalker. Only one capstone.');
    expect(req('ranger_mod_heartseeker')).toBe('Choose one of the pair.');
    expect(req('ranger_mod_open_wound')).toBeUndefined();
    setLanguage('es');
    expect(req('ranger_cap_killing_field')).toBe('Necesita 25 puntos en Acechador. Solo cabe un remate.');
    expect(req('ranger_mod_heartseeker')).toBe('Elige una de las dos.');
  });

  it('names every node, kind and target in both languages, and no Spanish name is left in English', () => {
    for (const lang of ['en', 'es'] as const) {
      setLanguage(lang);
      for (const kind of ['ability', 'passive', 'role', 'modifier', 'capstone'] as const) expect(nodeKindName(kind)).not.toBe('');
      for (const target of ['self', 'lowestAllyHp', 'lowestOtherAlly', 'frontEnemy', 'meleeEnemies', 'allEnemies', 'allAllies', 'randomDpsAlly', 'twoDpsAllies', 'tank'] as const) {
        expect(targetName(target)).not.toBe('');
      }
    }
    for (const c of CLASS_KEYS) {
      for (const n of talentNodes(c)) {
        setLanguage('en');
        const en = { name: talentNodeName(c, n.key), desc: talentNodeDescription(c, n.key) };
        setLanguage('es');
        const es = { name: talentNodeName(c, n.key), desc: talentNodeDescription(c, n.key) };
        expect(es.name, n.key).not.toBe('');
        if (n.desc !== undefined) {
          expect(en.desc).toBe(n.desc);
          expect(es.desc, n.key).not.toBe(en.desc); // a description is a sentence: it cannot read the same
        }
      }
    }
    expect(talentNodeName('knight', 'no_such_node')).toBe('no_such_node');
  });

  it('writes one line per effect of every hero ability, at every rank, with every modifier, in both languages', () => {
    for (const c of CLASS_KEYS) {
      const nodes = talentNodes(c);
      const everything = Object.fromEntries(nodes.map((n) => [n.key, n.maxRank])); // every modifier at once
      for (const talents of [{}, everything]) {
        for (const n of nodes) {
          if (n.abilityKey === undefined) continue;
          const def = heroAbilities(c, { ...talents, [n.key]: 1 }).find((a) => a.def.key === n.abilityKey)?.def ?? ABILITIES[n.abilityKey];
          expect(def, n.abilityKey).toBeDefined();
          if (def === undefined) continue;
          for (let rank = 1; rank <= n.maxRank; rank++) {
            setLanguage('en');
            const en = abilityLines(def, rank, stats, 1);
            setLanguage('es');
            const es = abilityLines(def, rank, stats, 1);
            expect(en.length, def.key).toBeGreaterThan(0);
            expect(es).toHaveLength(en.length);
            for (const line of [...en, ...es]) {
              expect(line, def.key).not.toMatch(/\{\w+\}|undefined|NaN/);
            }
            // A Spanish line never keeps an English verb.
            for (const line of es) expect(line, def.key).not.toMatch(/\b(Damage|Heals|Shield|for|over|chance|taken|dealt)\b/);
          }
        }
      }
    }
  });

  it('writes the known lines exactly', () => {
    const cleave = ABILITIES.knight_debilitate;
    const cry = ABILITIES.knight_battlecry;
    const light = ABILITIES.priest_healing_light;
    const circle = ABILITIES.priest_circle;
    const hold = ABILITIES.knight_holdtheline;
    expect(cleave).toBeDefined();
    expect(cry).toBeDefined();
    expect(light).toBeDefined();
    expect(circle).toBeDefined();
    expect(hold).toBeDefined();
    if (cleave === undefined || cry === undefined || light === undefined || circle === undefined || hold === undefined) return;
    expect(abilityLines(cleave, 1, stats, 1)[1]).toBe('−25 % damage dealt for 6 s');
    // A heal of hers says it lifts what the healed carry (data/healing: all of it, from those it heals).
    expect(abilityLines(light, 1, stats, 1).at(-1)).toBe('Lifts every harmful effect from each ally it heals');
    // When it fires, in words (the tooltip's own line).
    // Round 7: a rule for the waves and another for the bosses.
    expect(fireLine(hold)).toBe('When the party is taking damage. Against a boss: when it winds up its Charged Strike (any blow, if it has none).');
    expect(fireLine(cry)).toBe('With 3 or more enemies up, or against an elite or a boss.');
    expect(fireLine(light)).toBe('When an ally carries a harmful effect, is under 60 % of its life or has just taken a heavy hit.');
    expect(fireLine(circle)).toBe('When 2 allies are under 80 % of their life, one is under 50 %, or 2 carry a harmful effect.');
    expect(ultimateFireLine(ULTIMATES.knight as UltimateDef)).toBe('When a blow would kill the hero. Uses per stage: 1.');
    expect(ultimateFireLine(ULTIMATES.ranger as UltimateDef, { vs: 'eliteOrBoss' })).toBe('On engaging an elite, a stage boss or a world boss.');
    setLanguage('es');
    expect(abilityLines(cleave, 1, stats, 1)[1]).toBe('−25 % de daño infligido durante 6 s');
    expect(abilityLines(circle, 1, stats, 1).at(-1)).toBe('Quita todos los efectos dañinos a cada aliado que cura');
    expect(fireLine(light)).toBe('Cuando un aliado lleva un efecto dañino, baja del 60 % de su vida o acaba de recibir un golpe fuerte.');
    expect(abilityLines(cry, 1, stats, 1)[0]).toMatch(/^\+\d+(,\d)? % de daño de ataque durante \d+ s$/);
    expect(fireLine(hold)).toBe('Cuando el grupo está recibiendo daño. Contra un jefe: cuando prepara su Golpe cargado (cualquier golpe, si no tiene).');
    expect(fireLine(ABILITIES.priest_mend ?? light)).toBe('Cuando un aliado baja del 70 % de su vida o acaba de recibir un golpe fuerte. Contra un jefe: cuando prepara su Golpe cargado (cualquier golpe, si no tiene), o cuando un aliado baja del 70 % de su vida o acaba de recibir un golpe fuerte.');
    expect(ultimateFireLine(ULTIMATES.priest as UltimateDef)).toBe('Al entrar en combate con un jefe de etapa o de mundo.');
  });

  it('every hero ability says when it fires, in both languages, with no token left unfilled', () => {
    for (const lang of ['en', 'es'] as const) {
      setLanguage(lang);
      for (const def of Object.values(ABILITIES)) {
        if (!def.key.startsWith('knight_') && !def.key.startsWith('ranger_') && !def.key.startsWith('priest_')) continue;
        if (def.aura !== undefined) continue;
        const line = fireLine(def);
        expect(line.length, def.key).toBeGreaterThan(10);
        expect(line, def.key).not.toMatch(/[{}]/);
      }
    }
  });

  it('numbers follow the language: a decimal comma in Spanish, no wasted decimals', () => {
    expect(figure(2.5)).toBe('2.5');
    expect(figure(3)).toBe('3');
    expect(signed(0.05, ' %/s')).toBe('+0.05 %/s');
    expect(signed(-3, '')).toBe('−3');
    setLanguage('es');
    expect(figure(2.5)).toBe('2,5');
    expect(signed(0.05, ' %/s')).toBe('+0,05 %/s');
  });
});
