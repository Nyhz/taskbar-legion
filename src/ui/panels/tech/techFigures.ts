import { nodeCost, type TechEffect, type TechNode } from '@/data/techTree';
import { AUTO_OPEN_BASE_INTERVAL_MS, AUTO_OPEN_FLOOR_MS, CHEST_CONFIG } from '@/data/chests';
import { SYNTH_DOUBLE_TIER_CHANCE } from '@/data/cube';
import { format } from '@/sim/num';
import { getLanguage } from '@/i18n/core';

// What an upgrade is worth at a rank, as a figure the wing can print (no React). The numbers are the game's own:
// per-rank effect × rank on top of the base the sim starts from (sim/bonuses, data/chests, data/cube).

/** Offline yield before any upgrade (sim/bonuses baseBonuses.offlineMult). */
const OFFLINE_BASE = 0.5;

export type TechFigure =
  | { kind: 'gain'; fraction: number } // "+35 %": a bonus on top of the normal rate
  | { kind: 'share'; fraction: number } // "62.5 %": a total, not a bonus
  | { kind: 'slots'; count: number } // chest storage
  | { kind: 'heroes'; count: number } // heroes fighting at once
  | { kind: 'every'; ms: number } // auto-open interval
  | { kind: 'locked' }; // not unlocked yet (auto-open at rank 0)

/** The effect the figure speaks for (the auto-open UNLOCK flag is not a number: its interval is). */
function headline(node: TechNode): TechEffect | undefined {
  return node.effects.find((e) => e.kind !== 'unlockAutoOpen') ?? node.effects[0];
}

/** What the upgrade gives at `rank` (0 = not bought). */
export function techFigure(node: TechNode, rank: number): TechFigure {
  const r = Math.max(0, Math.min(rank, node.maxRanks));
  const e = headline(node);
  if (e === undefined) return { kind: 'gain', fraction: 0 };
  switch (e.kind) {
    case 'goldDropMult':
    case 'xpDropMult':
    case 'gemDropMult':
    case 'chestTypeDropMult':
      return { kind: 'gain', fraction: e.value * r };
    case 'offlineMult':
      return { kind: 'share', fraction: OFFLINE_BASE + e.value * r };
    case 'synthDoubleChance':
      return { kind: 'share', fraction: SYNTH_DOUBLE_TIER_CHANCE + e.value * r };
    case 'chestStorage':
      return { kind: 'slots', count: CHEST_CONFIG.capacity[e.type] + e.value * r };
    case 'partySlot':
      return { kind: 'heroes', count: 1 + r };
    case 'autoOpenReduce':
      return r === 0
        ? { kind: 'locked' }
        : { kind: 'every', ms: Math.max(AUTO_OPEN_FLOOR_MS, AUTO_OPEN_BASE_INTERVAL_MS - e.value * r) };
    case 'unlockAutoOpen':
      return r === 0 ? { kind: 'locked' } : { kind: 'every', ms: AUTO_OPEN_BASE_INTERVAL_MS };
  }
}

/** Numbers follow the language: Spanish writes a decimal comma and a space before the percent sign. */
function localNumber(text: string): string {
  return getLanguage() === 'es' ? text.replace('.', ',') : text;
}

/** A fraction as a percentage with as many decimals as it needs, up to two: 0.35 → "35%", 0.0225 → "2.25%". */
export function percentText(fraction: number): string {
  const digits = localNumber(String(Math.round(fraction * 10_000) / 100));
  return getLanguage() === 'es' ? `${digits} %` : `${digits}%`;
}

/** "9:45" from milliseconds. */
export function clockText(ms: number): string {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** The short figure under the seal: "+35%", "62.5%", "11", "3", "9:45", "—". */
export function figureText(figure: TechFigure): string {
  switch (figure.kind) {
    case 'gain':
      return `+${percentText(figure.fraction)}`;
    case 'share':
      return percentText(figure.fraction);
    case 'slots':
    case 'heroes':
      return String(figure.count);
    case 'every':
      return clockText(figure.ms);
    case 'locked':
      return '—';
  }
}

/** A plain factor in the language's notation: 1.35 → "1.35" / "1,35". */
export function factorText(n: number): string {
  return localNumber(String(n));
}

/** A price in the game's big-number format, in the language's notation: "5.91K" / "5,91K". */
export function goldText(amount: number): string {
  return localNumber(format(amount));
}

export interface TechState {
  rank: number;
  maxed: boolean;
  /** Gold for the next rank (meaningless when maxed). */
  cost: number;
  affordable: boolean;
  /** Gold missing for the next rank (0 when affordable or maxed). */
  short: number;
}

/** Where an upgrade stands for a purse: mirrors the store's canBuyTech (rank below the cap and gold ≥ cost). */
export function techState(node: TechNode, rank: number, gold: number): TechState {
  const maxed = rank >= node.maxRanks;
  const cost = nodeCost(node, rank);
  const affordable = !maxed && gold >= cost;
  return { rank, maxed, cost, affordable, short: maxed || affordable ? 0 : cost - gold };
}
