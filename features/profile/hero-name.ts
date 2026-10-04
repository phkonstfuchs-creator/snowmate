/* The profile name is set big, one word per line. A long word (a handle
   used as name, "Philipptesting") would run off the screen, so the size
   shrinks to fit the longest word in the 390 px the header has on a phone. */
const MAX_PX = 56;
const MIN_PX = 26;
const AVAILABLE_PX = 380;
/* Average width of an uppercase letter in the display face, per px. */
const LETTER_WIDTH = 0.66;

export function heroNameFontSize(name: string): number {
  const longest = Math.max(1, ...name.split(/\s+/u).map((word) => [...word].length));
  const fit = Math.floor(AVAILABLE_PX / (longest * LETTER_WIDTH));
  return Math.max(MIN_PX, Math.min(MAX_PX, fit));
}
