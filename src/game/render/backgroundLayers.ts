import { Assets } from 'pixi.js';
import type { Texture } from 'pixi.js';
import cloudsUrl from '@/assets/backgrounds/dusk-clouds.png';
import sunUrl from '@/assets/backgrounds/dusk-sun.png';

// Image-derived parallax background layers (the "dusk" scene). The distinctive elements
// (sun, clouds) are cut from the source wallpaper as transparent sprites; the flat
// regions (sky gradient, sea, grass) are reconstructed from its sampled colours in
// StageBackground so they stay crisp and tile seamlessly at the thin strip size.

let clouds: Texture | null = null;
let sun: Texture | null = null;
let loading: Promise<void> | null = null;

export async function loadBackgroundTextures(): Promise<void> {
  if (loading !== null) return loading;
  loading = (async () => {
    const [c, s] = await Promise.all([Assets.load<Texture>(cloudsUrl), Assets.load<Texture>(sunUrl)]);
    c.source.scaleMode = 'nearest';
    s.source.scaleMode = 'nearest';
    clouds = c;
    sun = s;
  })();
  return loading;
}

export function getDuskClouds(): Texture | null {
  return clouds;
}

export function getDuskSun(): Texture | null {
  return sun;
}
