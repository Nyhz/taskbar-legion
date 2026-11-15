import { useEffect, useState } from 'react';
import { loadGame } from '@/persistence/saveManager';

// What the Continue key says about the game it continues: where the party is and who is in it. Read from the
// stored save (the store is not hydrated on the title screen). Reading is side-effect free; null until loaded,
// or when there is nothing to continue.

export interface SaveSummary {
  globalStage: number;
  heroes: { classKey: string; level: number }[];
}

export function useSaveSummary(hasSave: boolean): SaveSummary | null {
  const [summary, setSummary] = useState<SaveSummary | null>(null);
  useEffect(() => {
    if (!hasSave) return;
    let cancelled = false;
    void loadGame().then((save) => {
      if (cancelled || save === null) return;
      setSummary({
        globalStage: save.progress.globalStageIndex,
        heroes: save.roster.map((h) => ({ classKey: h.classKey, level: h.level })),
      });
    });
    return () => {
      cancelled = true;
    };
  }, [hasSave]);
  return summary;
}
