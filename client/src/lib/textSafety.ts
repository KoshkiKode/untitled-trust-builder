/**
 * Character handling for the built-in PDF fonts.
 *
 * pdf-lib's standard fonts (Helvetica, Courier, ...) can only encode WinAnsi
 * (Windows-1252). Characters outside that set are kept when printable, folded to a
 * base letter when a clear equivalent exists, and otherwise replaced with "?". Every
 * character that was not printed as-is is reported so the user can check the document.
 */

/** Windows-1252 code points outside the Latin-1 range (U+0080-U+009F are control codes there). */
const CP1252_EXTRA = new Set([
  0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160, 0x2039, 0x0152, 0x017d,
  0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x017e, 0x0178,
]);

/** Letters with no Unicode decomposition that still appear in European names. */
const FOLD: Record<string, string> = {
  Ł: "L",
  ł: "l",
  Đ: "D",
  đ: "d",
  Ħ: "H",
  ħ: "h",
  ı: "i",
  Ŀ: "L",
  ŀ: "l",
  Ŋ: "N",
  ŋ: "n",
  Ŧ: "T",
  ŧ: "t",
};

export function isWinAnsi(ch: string): boolean {
  const cp = ch.codePointAt(0) ?? 0;
  return (cp >= 0x20 && cp <= 0x7e) || (cp >= 0xa0 && cp <= 0xff) || CP1252_EXTRA.has(cp);
}

export interface WinAnsiResult {
  text: string;
  /** Original characters that were not printed as-is (folded or replaced), in first-seen order. */
  substituted: string[];
}

export function toWinAnsi(input: string): WinAnsiResult {
  const substituted = new Set<string>();
  let out = "";
  for (const ch of Array.from(input)) {
    if ((ch.codePointAt(0) ?? 0) < 0x20) continue;
    if (isWinAnsi(ch)) {
      out += ch;
      continue;
    }
    substituted.add(ch);
    const folded = FOLD[ch] ?? ch.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    out += folded.length > 0 && Array.from(folded).every(isWinAnsi) ? folded : "?";
  }
  return { text: out, substituted: Array.from(substituted) };
}
