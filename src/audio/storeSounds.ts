import { useStore, type GameStore } from '@/state/store';
import { playSound } from './soundEngine';

// Sounds of what changes in the game's state rather than on the strip: a hero levels up, a pet is found, a piece is
// equipped, a tech rank bought, a talent point spent, a panel opened or closed. Only while the game runs (not while a
// save is loaded into the store, when everything "changes" at once). The interface's own plain click (soundEngine)
// is skipped when one of these sounded for the same click.

function levels(s: GameStore): Map<string, number> {
  return new Map(s.roster.map((h) => [h.id, h.level]));
}

/** Starts listening (call once at boot). */
let started_ = false;

export function startStoreSounds(): void {
  if (started_) return; // once (React's strict mode runs boot effects twice)
  started_ = true;
  let before = useStore.getState();
  let lv = levels(before);
  useStore.subscribe((s) => {
    const live = s.screen === 'game' && before.screen === 'game';
    if (s.roster !== before.roster) {
      const now = levels(s);
      if (live && [...now].some(([id, n]) => n > (lv.get(id) ?? n))) playSound('level_up');
      lv = now;
    }
    if (live && s.ownedPets.length > before.ownedPets.length) playSound('pet_found');
    if (live && s.roster !== before.roster) {
      const was = new Map(before.roster.map((h) => [h.id, h]));
      for (const h of s.roster) {
        const b = was.get(h.id);
        if (b === undefined) continue;
        if (h.equipment !== b.equipment) playSound('ui_equip');
        if (h.talentPoints < b.talentPoints) playSound('ui_talent');
      }
    }
    if (live && s.techRanks !== before.techRanks) playSound('ui_buy');
    if (live && s.openPanels.length > before.openPanels.length) playSound('ui_panel_open');
    else if (live && s.openPanels.length < before.openPanels.length) playSound('ui_panel_close');
    before = s;
  });
}
