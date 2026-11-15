import type { Text } from 'pixi.js';

// The interface's pixel fonts (bundled by ui/kit/kit.css) for lettering drawn INSIDE the strip. A Pixi text is
// rasterised with whatever font the browser has at that moment, so the text starts in the fallback and switches
// once the font has loaded — changing the family is what makes Pixi draw it again.

export const KIT_FONT_TEXT = 'Jersey 10'; // numbers and short lettering, on a 10 px grid
export const KIT_FONT_PHRASE = 'Jersey 20'; // a sentence, on a 20 px grid

export function applyKitFont(text: Text, family: string, px: number): void {
  if (typeof document === 'undefined' || document.fonts === undefined) return;
  void document.fonts
    .load(`${px}px '${family}'`)
    .then(() => {
      if (!text.destroyed) text.style.fontFamily = `'${family}', monospace`;
    })
    .catch(() => undefined); // the fallback stays: lettering is never worth a crash
}
