/**
 * EAN-13 as bars: 95 modules, "1" = black, "0" = white (ISO/IEC 15420).
 * Expects a code already checked by validGtin.
 */
const L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
const G = ["0100111", "0110011", "0011011", "0100001", "0011101", "0111001", "0000101", "0010001", "0001001", "0010111"];
const R = ["1110010", "1100110", "1101100", "1000010", "1011100", "1001110", "1010000", "1000100", "1001000", "1110100"];
/** The first digit is not drawn as bars - it decides which of L/G each of the next six uses. */
const PARITY = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];

export function ean13Modules(code: string): string {
  if (!/^\d{13}$/.test(code)) throw new Error(`Not an EAN-13: ${code}`);
  const d = [...code].map(Number);
  const left = d
    .slice(1, 7)
    .map((digit, i) => (PARITY[d[0]][i] === "L" ? L : G)[digit])
    .join("");
  const right = d
    .slice(7)
    .map((digit) => R[digit])
    .join("");
  return `101${left}01010${right}101`;
}

/** Runs of black modules as [start, width], ready to draw as rectangles. */
export function barRuns(modules: string): Array<[number, number]> {
  const runs: Array<[number, number]> = [];
  for (let i = 0; i < modules.length; i++) {
    if (modules[i] !== "1") continue;
    const start = i;
    while (modules[i + 1] === "1") i++;
    runs.push([start, i - start + 1]);
  }
  return runs;
}
