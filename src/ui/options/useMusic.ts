import { useEffect, useState } from 'react';
import { isMusicAvailable, isMusicMuted, subscribeAudio } from '@/platform/audio';

// The title music as the interface sees it: is there a track at all, and is it muted. Re-renders on change.

export function useMusic(): { available: boolean; muted: boolean } {
  const [, force] = useState(0);
  useEffect(() => subscribeAudio(() => force((n) => n + 1)), []);
  return { available: isMusicAvailable(), muted: isMusicMuted() };
}
