import type { ReactNode } from 'react';
import type { ItemInstance } from '@/sim/items';
import type { RoleKey, RoleScores } from '@/sim/roleScore';
import { gemGrants } from '@/sim/gems';
import type { StatKey } from '@/data/stats';
import { className, statLabel, tierName, useT, type PlainTextKey } from '@/i18n';
import {
  Delta,
  Sign,
  Tip,
  TipAffix,
  TipLine,
  TipName,
  TipNote,
  TipRule,
  TipSub,
  TipWarn,
  TipWorn,
  type TipSide,
} from '@/ui/kit';
import { classCrestStem } from '@/ui/itemArt';
import {
  itemFamilyName,
  itemKindName,
  ownStats,
  signed,
  signedPercent,
  statDelta,
  statGain,
} from './itemText';

// The card of an item: what it is (name in its rarity's colour, rarity and — for armour — its family, item level,
// the crest of the class it belongs to), its base affix(es), its own rolled substats (a perfect roll starred),
// its sockets with what each set gem grants, and — when it is compared against the worn piece — the difference
// of every stat in its own column, the stats the worn piece has and this one lacks, and the net effect on the
// hero's roles. Item stats and gem stats stay apart: gems are never folded into the item's own numbers.

const ROLE_TEXT: Readonly<Record<RoleKey, PlainTextKey>> = {
  dps: 'items.roleDps',
  tank: 'items.roleTank',
  heal: 'items.roleHeal',
};
const ALL_ROLES: readonly RoleKey[] = ['dps', 'tank', 'heal'];

export interface ItemCardProps {
  item: ItemInstance;
  /** The worn piece this one would replace: shows the differences. */
  compareTo?: ItemInstance;
  /** A header above the name (the worn card says "Worn"). */
  worn?: ReactNode;
  locked?: boolean;
  wrongClass?: boolean;
  roleDelta?: RoleScores;
  roleKeys?: readonly RoleKey[];
  /** Shift is held: the comparison leaves the gems out (their rows step back). */
  ignoreGems?: boolean;
  side?: TipSide;
  /** Laid out in place (inside a TipGroup, or pinned) instead of shown on hover. */
  still?: boolean;
}

export function ItemCard({
  item,
  compareTo,
  worn,
  locked = false,
  wrongClass = false,
  roleDelta,
  roleKeys,
  ignoreGems = false,
  side,
  still = false,
}: ItemCardProps): React.JSX.Element {
  const t = useT();
  const mine = ownStats(item);
  const theirs = compareTo === undefined ? undefined : ownStats(compareTo);
  const baseKeys = new Set(item.baseAffix.map((b) => b.key));
  const perfect = new Set(item.stats.filter((s) => s.perfect === true).map((s) => s.key));
  // Substat rows: every non-base stat THIS item has, then (when comparing) any the WORN one has and this lacks.
  const subKeys = [...new Set<StatKey>([...mine.keys(), ...(theirs?.keys() ?? [])])].filter(
    (k) => !baseKeys.has(k),
  );
  const delta = (key: StatKey): number =>
    theirs === undefined ? 0 : (mine.get(key) ?? 0) - (theirs.get(key) ?? 0);
  const levelDelta = compareTo === undefined ? 0 : item.ilvl - compareTo.ilvl;
  const family = itemFamilyName(item);
  const crest = classCrestStem(item.classKey);

  const affix = (key: StatKey, isPerfect: boolean): React.JSX.Element => {
    const value = mine.get(key) ?? 0;
    const d = delta(key);
    return (
      <TipAffix
        key={key}
        sign={`stat_${key}`}
        value={value > 0 ? statGain(key, value) : undefined}
        name={statLabel(key)}
        delta={d === 0 ? undefined : statDelta(key, d)}
        deltaTone={d > 0 ? 'up' : 'dn'}
        perfect={isPerfect}
        lost={value <= 0}
      />
    );
  };

  return (
    <Tip size={compareTo === undefined ? 'item' : 'wide'} tier={item.tier} side={side} still={still}>
      {worn !== undefined && <TipWorn>{worn}</TipWorn>}
      <TipName>{itemKindName(item)}</TipName>
      <TipSub
        end={
          <>
            <Sign name="ui_power" alt={t('items.itemLevel')} />
            {item.ilvl}
            {levelDelta !== 0 && <Delta tone={levelDelta > 0 ? 'up' : 'dn'}>{signed(levelDelta)}</Delta>}
            {crest !== undefined && item.classKey !== undefined && (
              <Sign name={crest} alt={className(item.classKey)} />
            )}
          </>
        }
      >
        {family === undefined ? tierName(item.tier) : `${tierName(item.tier)} · ${family}`}
      </TipSub>
      <TipRule />
      {item.baseAffix.map((b) => affix(b.key, false))}
      {subKeys.map((key) => affix(key, perfect.has(key)))}
      {item.sockets.length > 0 && (
        <div className={ignoreGems ? 'tk-cell-gems off' : 'tk-cell-gems'}>
          {item.sockets.map((socket, i) =>
            socket.gem === null ? (
              <TipAffix key={i} sign="ui_gem" name={t('items.emptySocket')} empty />
            ) : (
              gemGrants(socket.gem).map((grant) => (
                <TipAffix
                  key={`${i}-${grant.key}`}
                  sign="ui_gem"
                  value={statGain(grant.key, grant.value)}
                  name={statLabel(grant.key)}
                  gem
                />
              ))
            ),
          )}
        </div>
      )}
      {roleDelta !== undefined && (
        <>
          <TipRule />
          {(roleKeys ?? ALL_ROLES).map((role) => (
            <RoleLine key={role} label={t(ROLE_TEXT[role])} pct={roleDelta[role]} />
          ))}
        </>
      )}
      {wrongClass && <TipWarn>{t('items.wrongClass')}</TipWarn>}
      {locked && <TipWarn>{t('items.levelTooLow')}</TipWarn>}
      {roleDelta !== undefined && <TipNote>{ignoreGems ? t('items.shiftOn') : t('items.shiftHint')}</TipNote>}
    </Tip>
  );
}

// One role line: the net change to this role's combat proxy if the piece were worn. Rounded to 0.1 % — under
// 0.05 it reads as "no change" so a swap that does not touch a role does not shout.
function RoleLine({ label, pct }: { label: string; pct: number }): React.JSX.Element {
  if (Math.abs(pct) < 0.05) return <TipLine label={label} value="—" />;
  return <TipLine label={label} value={signedPercent(pct)} tone={pct > 0 ? 'good' : 'bad'} />;
}
