import { useState } from 'react';
import { useStore } from '@/state/store';
import { HeroStatsTab } from './HeroStatsTab';
import { HeroTalentsTab } from './HeroTalentsTab';
import { PALETTE } from '@/styles/palette';

// The left-wing hero panel: Stats and Talents merged behind a tab row (they used to
// be two separate side panels). Always reflects the Party panel's selected hero.

type Tab = 'talents' | 'stats';

export function HeroTabsPanel(): React.JSX.Element {
  const heroId = useStore((s) => s.selectedHeroId);
  const hasTalentPoint = useStore((s) => (s.roster.find((h) => h.id === heroId)?.talentPoints ?? 0) > 0);
  const [tab, setTab] = useState<Tab>('talents');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        <TabBtn label="Talents" active={tab === 'talents'} dot={hasTalentPoint} onClick={() => setTab('talents')} />
        <TabBtn label="Stats" active={tab === 'stats'} onClick={() => setTab('stats')} />
      </div>
      {tab === 'talents' ? <HeroTalentsTab heroId={heroId} /> : <HeroStatsTab heroId={heroId} />}
    </div>
  );
}

function TabBtn({ label, active, dot, onClick }: { label: string; active: boolean; dot?: boolean; onClick: () => void }): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative',
        flex: 1,
        padding: '4px 0',
        fontWeight: 700,
        fontSize: 11,
        background: active ? PALETTE.titleRed : PALETTE.bgInset,
        border: `1px solid ${active ? PALETTE.gold : PALETTE.ink}`,
        color: active ? PALETTE.gold : PALETTE.parchment,
        cursor: 'pointer',
      }}
    >
      {label}
      {dot === true && (
        <span style={{ position: 'absolute', top: 3, right: 5, width: 7, height: 7, borderRadius: '50%', background: PALETTE.enemyAccent, border: `1px solid ${PALETTE.ink}` }} />
      )}
    </button>
  );
}
