// What a translation must keep from its English (REDESIGN §8): the {tokens} and the numbers.

export function tokensOf(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1] ?? '').sort();
}

/** The numbers written in a text, decimal comma or point alike: "+2,5 %" and "+2.5%" both give ["2.5"]. */
export function numbersOf(text: string): string[] {
  return [...text.replace(/\{\w+\}/g, '').matchAll(/\d+(?:[.,]\d+)?/g)].map((m) => m[0].replace(',', '.')).sort();
}
