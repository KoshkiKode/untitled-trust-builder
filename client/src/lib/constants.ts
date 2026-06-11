export const DISCLAIMER =
  "This tool produces informational planning materials and document templates, not legal advice. Laws and fees change and vary by locality. Review every document and verify current requirements with the relevant county/state offices (or a professional) before signing, recording, or filing.";

export const APP_NAME = "Trust Builder";
export const APP_OWNER = "KoshkiKode";
export const TEMPLATE_HEADER = "TEMPLATE — REVIEW BEFORE USE";

export function fmtUSD(n: number | undefined | null): string {
  if (n === undefined || n === null || isNaN(n)) return "—";
  return "$" + Math.round(n).toLocaleString("en-US");
}

export function fmtRange(low?: number, high?: number): string {
  if (low == null && high == null) return "—";
  if (low != null && high != null) {
    if (low === high) return fmtUSD(low);
    return `${fmtUSD(low)} – ${fmtUSD(high)}`;
  }
  return fmtUSD(low ?? high);
}

export function fmtPct(fraction: number): string {
  return (fraction * 100).toFixed(2).replace(/\.00$/, "") + "%";
}
