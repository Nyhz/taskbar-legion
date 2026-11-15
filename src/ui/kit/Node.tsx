import type { MouseEventHandler, ReactNode } from 'react';
import { Sign } from './Sign';

// A node: an ability, a passive, a role talent, an ability modifier or an ultimate, on the frame that says which
// (talents tab, and the hero's two abilities + ultimate under the paper doll). The shape is the meaning:
//   ability  → square plate (24)      passive  → round seal (22)
//   modifier → teal plate with a "+"  ultimate → octagon (30)
//   role     → a seal with four points, on the plate's footprint (24)
//   effect   → the same pointed seal at a passive's size (22): a passive with behaviour, not a "+X %"

export type NodeKind = 'ability' | 'passive' | 'effect' | 'role' | 'modifier' | 'ultimate';
/** off = nothing spent / not learned · on = has ranks / learned · max = every rank. */
export type NodeState = 'off' | 'on' | 'max';

const FRAME: Record<NodeKind, Record<NodeState, string>> = {
  ability: { off: 'tal_plate_off', on: 'tal_plate_on', max: 'tal_plate_max' },
  passive: { off: 'tal_seal_off', on: 'tal_seal_on', max: 'tal_seal_max' },
  effect: { off: 'tal_effect_off', on: 'tal_effect_on', max: 'tal_effect_max' },
  role: { off: 'tal_role_off', on: 'tal_role_on', max: 'tal_role_max' },
  modifier: { off: 'tal_mod_off', on: 'tal_mod_on', max: 'tal_mod_on' },
  ultimate: { off: 'tal_ult_off', on: 'tal_ult_on', max: 'tal_ult_on' },
};
const KIND_CLASS: Record<NodeKind, string> = {
  ability: '',
  passive: ' seal',
  effect: ' seal',
  role: ' role',
  modifier: ' mod',
  ultimate: ' ult',
};

export interface NodeProps {
  kind: NodeKind;
  state?: NodeState;
  /** Art stem of the 16×16 sign on the frame. */
  sign: string;
  alt?: string;
  /** Not available (tier closed, cap reached): dimmed. It can still be hovered for its tooltip. */
  locked?: boolean;
  /** Cooling down: the sign is shaded and this text (seconds left) sits in the corner. */
  cooldown?: ReactNode;
  /** Rank pips under the node: `rank` of `max` lit. */
  pips?: { rank: number; max: number };
  onClick?: MouseEventHandler<HTMLDivElement>;
  onContextMenu?: MouseEventHandler<HTMLDivElement>;
  className?: string;
  style?: React.CSSProperties;
  /** A tooltip (`Tip`): shown on hover. */
  children?: ReactNode;
}

export function Node({
  kind,
  state = 'off',
  sign,
  alt = '',
  locked = false,
  cooldown,
  pips,
  onClick,
  onContextMenu,
  className,
  style,
  children,
}: NodeProps): React.JSX.Element {
  const cls =
    `tk-node${KIND_CLASS[kind]}` +
    (locked ? ' lock' : '') +
    (cooldown !== undefined ? ' cd' : '') +
    (onClick !== undefined && !locked ? ' can' : '') +
    (children !== undefined ? ' has' : '') +
    (className === undefined ? '' : ` ${className}`);
  return (
    <div className={cls} style={style} onClick={locked ? undefined : onClick} onContextMenu={onContextMenu}>
      <Sign name={FRAME[kind][state]} className="f" />
      <Sign name={sign} alt={alt} className="g" />
      {kind === 'modifier' && <Sign name="tal_plus" className="b" />}
      {cooldown !== undefined && <i>{cooldown}</i>}
      {pips !== undefined && (
        <div className="tk-pips">
          {Array.from({ length: pips.max }, (_, i) => (
            <i key={i} className={i < pips.rank ? 'on' : undefined} />
          ))}
        </div>
      )}
      {children}
    </div>
  );
}
