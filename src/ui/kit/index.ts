// The interface kit (docs/redesign/REDESIGN.md §9). Panels compose these; nothing here knows about the game or
// holds a word of text — every visible string comes from the caller. See Gallery.tsx (dev: open /#kit) for each
// piece in use.
export { KitRoot } from './KitRoot';
export { Sign } from './Sign';
export { Bar, type BarTone } from './Bar';
export { Rule } from './Rule';
export {
  Window,
  Bookmarks,
  Head,
  Title,
  type WindowProps,
  type WindowTab,
  type WindowPlace,
  type TabState,
  type PlaceState,
} from './Window';
export { Slot, ItemIcon, SlotGrid, type SlotProps } from './Slot';
export { Key, SlimKey, Chip, Check, Gold, type KeyProps, type KeyTone, type ChipProps, type CheckProps } from './Key';
export { Pager, type PagerProps } from './Pager';
export { Segment, Switch, type SegmentItem } from './Choice';
export { Veil, type VeilLevel } from './Veil';
export { Menu, MenuRow, type MenuRowProps } from './Menu';
export { Node, type NodeProps, type NodeKind, type NodeState } from './Node';
export { StatRow, type StatRowProps } from './StatRow';
export {
  Tip,
  TipGroup,
  TipTitle,
  TipLine,
  TipText,
  TipNote,
  TipWarn,
  TipTag,
  tipSideClass,
  type TipProps,
  type TipSide,
  type TipSize,
} from './Tip';
export { TipName, TipSub, TipAffix, TipRule, TipWorn, Delta, type TipAffixProps } from './ItemTip';
export { art } from './art';
export { KIT_TOKENS, KIT_VARS, type KitToken } from './tokens';
