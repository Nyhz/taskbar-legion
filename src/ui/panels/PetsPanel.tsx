import { useStore } from '@/state/store';
import { PET_KEYS, petDef } from '@/data/pets';
import { PALETTE } from '@/styles/palette';

// Collection grid of pet icons: owned shown in color (selected = gold ring), unowned
// as silhouettes. Hover for the (always-on, stacking) economy bonus. Selection is
// cosmetic — owning a pet grants its bonus regardless of which is selected.

function bonusText(key: string): string {
  const b = petDef(key).bonus;
  switch (b.kind) {
    case 'goldMult': return `+${b.value * 100}% gold`;
    case 'xpMult': return `+${b.value * 100}% XP`;
    case 'chestDropMult': return `+${b.value * 100}% chest drop`;
    case 'chestStorage': return `+${b.value} ${b.type} storage`;
    case 'autoOpenReduce': return `-${b.value / 1000}s auto-open`;
    default: return '';
  }
}

export function PetsPanel(): React.JSX.Element {
  const owned = useStore((s) => s.ownedPets);
  const selected = useStore((s) => s.selectedPet);
  const selectPet = useStore((s) => s.selectPet);

  return (
    <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ color: PALETTE.textMute, fontSize: 10 }}>
        Owned pets grant their bonus permanently and STACK. Hover for details.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(56px, 1fr))', gap: 5 }}>
        {PET_KEYS.map((key) => {
          const have = owned.includes(key);
          const def = petDef(key);
          const sel = selected === key;
          return (
            <button
              key={key}
              disabled={!have}
              onClick={() => selectPet(key)}
              title={have ? `${def.name} — ${bonusText(key)}` : 'Undiscovered pet'}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
                height: 50, padding: 2,
                background: sel ? PALETTE.titleRed : PALETTE.bgInset,
                border: `2px solid ${sel ? PALETTE.gold : PALETTE.ink}`,
                boxShadow: sel ? `0 0 6px ${PALETTE.gold}` : undefined,
                color: have ? PALETTE.textLight : PALETTE.textMute,
              }}
            >
              <span style={{ fontSize: 20, opacity: have ? 1 : 0.3, filter: have ? 'none' : 'grayscale(1)' }}>🐾</span>
              <span style={{ fontSize: 8, color: have ? PALETTE.gold : PALETTE.textMute, lineHeight: 1, textAlign: 'center' }}>
                {have ? def.name : '???'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
