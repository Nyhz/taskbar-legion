import type { ReactNode } from 'react';
import { Sign } from './Sign';
import { Rule } from './Rule';

// The pieces of an item's tooltip (presentation only — the caller decides what an item says). Put them inside a
// `Tip` with `tier` set, so the name takes the rarity's colour:
//
//   <Tip size="wide" tier={5}>
//     <TipName>Yelmo alado dorado</TipName>
//     <TipSub end={<><Sign name="ui_power" alt="Nivel de objeto" />93<Delta tone="up">+11</Delta><Sign name="crest_knight" alt="Knight" /></>}>Yelmo</TipSub>
//     <TipRule />
//     <TipAffix sign="stat_armor" value="+802" name="Armadura" delta="+178" deltaTone="up" />
//     <TipAffix sign="stat_block" name="Bloqueo" delta="−4,2 %" deltaTone="dn" lost />
//     <TipAffix sign="ui_gem" name="Engaste vacío" empty />
//   </Tip>

/** The name of the thing, in the blackletter face; coloured by the Tip's `tier`, or by `tone`. */
export function TipName({ tone, children }: { tone?: 'gold'; children: ReactNode }): React.JSX.Element {
  return (
    <div className="nm" style={tone === 'gold' ? { color: 'var(--gold-hi)' } : undefined}>
      {children}
    </div>
  );
}

/** The line under the name: what kind of thing it is, and at the far end its level / owner signs. */
export function TipSub({ end, children }: { end?: ReactNode; children: ReactNode }): React.JSX.Element {
  return (
    <div className="sub">
      <span>{children}</span>
      {end !== undefined && <span className="r">{end}</span>}
    </div>
  );
}

/** A small coloured difference: green up, red down. */
export function Delta({ tone, children }: { tone: 'up' | 'dn'; children: ReactNode }): React.JSX.Element {
  return <em className={tone}>{children}</em>;
}

/** The divider with its ornament, at tooltip spacing. */
export function TipRule(): React.JSX.Element {
  return <Rule />;
}

/** "Worn": the small header of the card that shows what the hero has on, beside the hovered piece. */
export function TipWorn({ children }: { children: ReactNode }): React.JSX.Element {
  return <div className="worn">{children}</div>;
}

export interface TipAffixProps {
  /** Art stem of the stat's sign (`stat_armor`), or of a gem for a socket row. */
  sign: string;
  /** "+802", "+2,6 %"… Omitted on a lost stat or an empty socket. */
  value?: ReactNode;
  name: ReactNode;
  /** The difference against the worn piece, in its own column. */
  delta?: ReactNode;
  deltaTone?: 'up' | 'dn';
  /** A perfect roll: a star after the name. */
  perfect?: boolean;
  /** A stat the worn piece has and this one does not (dimmed). */
  lost?: boolean;
  /** An empty socket (dimmed). */
  empty?: boolean;
  /** A set gem: its value takes the gem's warm tone. */
  gem?: boolean;
}

/** One affix: sign + value + name (+ the difference). Also a socket row. */
export function TipAffix({
  sign,
  value,
  name,
  delta,
  deltaTone = 'up',
  perfect = false,
  lost = false,
  empty = false,
  gem = false,
}: TipAffixProps): React.JSX.Element {
  const cls = `aff${delta !== undefined ? ' d' : ''}${lost ? ' lost' : ''}${empty ? ' empty' : ''}${gem ? ' gem' : ''}`;
  return (
    <div className={cls}>
      <Sign name={sign} />
      <b>{value}</b>
      <span>
        {name}
        {perfect && <Sign name="cube_star" />}
      </span>
      {delta !== undefined && <em className={deltaTone}>{delta}</em>}
    </div>
  );
}
