import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from "pdf-lib";
import { saveAs } from "file-saver";
import type { BusinessPlan, GeneratedDocument, EstatePlan } from "@/data/types";
import { DISCLAIMER, APP_NAME, APP_OWNER, fmtUSD } from "./constants";
import { toWinAnsi } from "./textSafety";

// Letter size, points
const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 56;
const CONTENT_W = PAGE_W - MARGIN * 2;
// y of the rule above the footer disclaimer. Body text stops at y=60, and the
// page number sits at y=18, so 51 keeps both clear of the two disclaimer lines.
const FOOTER_RULE_Y = 51;
const BODY_SIZE = 10.5;
const LINE_H = 15;
const TITLE_SIZE = 18;
const HEADING_SIZE = 13;

// Brand colors (deep teal / slate)
const TEAL = rgb(0.043, 0.22, 0.27);
const SLATE = rgb(0.18, 0.24, 0.29);
const MUTED = rgb(0.42, 0.47, 0.52);
const RULE = rgb(0.78, 0.82, 0.85);

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
  mono: PDFFont;
}

/** Word-wrap a single logical line to the available width. */
function wrapLine(text: string, font: PDFFont, size: number, maxW: number): string[] {
  if (text === "") return [""];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? current + " " + word : word;
    let w: number;
    try {
      w = font.widthOfTextAtSize(test, size);
    } catch {
      w = test.length * size * 0.5;
    }
    if (w > maxW && current) {
      lines.push(current);
      current = word;
      // hard-break a single overly long word
      while (safeWidth(font, current, size) > maxW && current.length > 1) {
        let cut = current.length - 1;
        while (cut > 1 && safeWidth(font, current.slice(0, cut), size) > maxW) cut--;
        lines.push(current.slice(0, cut));
        current = current.slice(cut);
      }
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function safeWidth(font: PDFFont, text: string, size: number): number {
  try {
    return font.widthOfTextAtSize(text, size);
  } catch {
    return text.length * size * 0.5;
  }
}

let substitutionLog: Set<string> | null = null;

/** Sanitize text for the WinAnsi-encoded standard fonts; substitutions are recorded for the caller. */
function sanitize(text: string): string {
  const mapped = text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2022/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u2713/g, "[x]")
    .replace(/\u26a0/g, "!")
    .replace(/\u2610/g, "[ ]")
    .replace(/[\u2265]/g, ">=")
    .replace(/[\u2264]/g, "<=")
    .replace(/[\u2260]/g, "!=")
    .replace(/[\u2248]/g, "~")
    .replace(/[\u2192]/g, "->")
    .replace(/[\u2190]/g, "<-")
    .replace(/[\u2212]/g, "-")
    .replace(/\u2714/g, "[x]")
    .replace(/\u00a0/g, " ")
    .replace(/\t/g, "    ")
    .replace(/\r/g, "");
  const { text: safe, substituted } = toWinAnsi(mapped);
  for (const ch of substituted) substitutionLog?.add(ch);
  return safe;
}


class Cursor {
  doc: PDFDocument;
  fonts: Fonts;
  page!: PDFPage;
  y = 0;
  pageNum = 0;
  footer: string;
  pages: PDFPage[] = [];

  constructor(doc: PDFDocument, fonts: Fonts, footer: string) {
    this.doc = doc;
    this.fonts = fonts;
    this.footer = footer;
    this.newPage();
  }

  newPage() {
    this.page = this.doc.addPage([PAGE_W, PAGE_H]);
    this.pages.push(this.page);
    this.pageNum++;
    this.y = PAGE_H - MARGIN;
    this.drawFooter();
  }

  drawFooter() {
    const size = 7;
    const lines = wrapLine(sanitize(this.footer), this.fonts.regular, size, CONTENT_W);
    let fy: number;
    // page number, centered; sits below the two-line disclaimer with clearance
    const pageLabel = `${this.pageNum}`;
    this.page.drawText(pageLabel, {
      x: (PAGE_W - this.fonts.regular.widthOfTextAtSize(pageLabel, size)) / 2,
      y: 18,
      size,
      font: this.fonts.regular,
      color: MUTED,
    });
    // rule + disclaimer block. Body text stops at y=60 (see ensure()), so the
    // rule at 51 keeps clear of it while leaving room for the page number.
    this.page.drawLine({
      start: { x: MARGIN, y: FOOTER_RULE_Y },
      end: { x: PAGE_W - MARGIN, y: FOOTER_RULE_Y },
      thickness: 0.5,
      color: RULE,
    });
    // footer text (below the rule, max 2 lines)
    const shown = lines.slice(0, 2);
    fy = FOOTER_RULE_Y - 10;
    for (const ln of shown) {
      this.page.drawText(ln, {
        x: MARGIN,
        y: fy,
        size,
        font: this.fonts.italic,
        color: MUTED,
      });
      fy -= 9;
    }
  }

  ensure(space: number) {
    if (this.y - space < 60) {
      this.newPage();
    }
  }

  text(
    line: string,
    opts: { size?: number; font?: PDFFont; color?: any; indent?: number; gap?: number } = {}
  ) {
    const size = opts.size ?? BODY_SIZE;
    const font = opts.font ?? this.fonts.regular;
    const color = opts.color ?? SLATE;
    const indent = opts.indent ?? 0;
    const lineH = size * 1.4;
    const wrapped = wrapLine(sanitize(line), font, size, CONTENT_W - indent);
    for (const wl of wrapped) {
      this.ensure(lineH);
      this.page.drawText(wl, {
        x: MARGIN + indent,
        y: this.y,
        size,
        font,
        color,
      });
      this.y -= lineH;
    }
    if (opts.gap) this.y -= opts.gap;
  }

  heading(line: string) {
    this.y -= 8;
    this.ensure(HEADING_SIZE * 2);
    this.text(line, { size: HEADING_SIZE, font: this.fonts.bold, color: TEAL });
    this.page.drawLine({
      start: { x: MARGIN, y: this.y + 4 },
      end: { x: PAGE_W - MARGIN, y: this.y + 4 },
      thickness: 0.75,
      color: RULE,
    });
    this.y -= 6;
  }

  gap(n = LINE_H) {
    this.y -= n;
  }
}

async function loadFonts(doc: PDFDocument): Promise<Fonts> {
  return {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    italic: await doc.embedFont(StandardFonts.HelveticaOblique),
    mono: await doc.embedFont(StandardFonts.Courier),
  };
}

function triggerDownload(bytes: Uint8Array, filename: string) {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const blob = new Blob([buffer], { type: "application/pdf" });
  saveAs(blob, filename);
}

function safeName(s: string): string {
  return s.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").slice(0, 60) || "document";
}

/** Runs a renderer and returns the characters that had to be substituted in the PDF. */
function withSubstitutionLog(run: () => Promise<void>): Promise<string[]> {
  substitutionLog = new Set();
  return run()
    .then(() => Array.from(substitutionLog ?? []))
    .finally(() => {
      substitutionLog = null;
    });
}

/** Render a single text document to a downloadable PDF. Resolves to the substituted characters. */
export function renderTextPdf(title: string, body: string): Promise<string[]> {
  return withSubstitutionLog(() => renderTextPdfInner(title, body));
}

async function renderTextPdfInner(title: string, body: string): Promise<void> {
  const doc = await PDFDocument.create();
  const fonts = await loadFonts(doc);
  const cur = new Cursor(doc, fonts, DISCLAIMER);

  // title
  cur.text(title, { size: TITLE_SIZE, font: fonts.bold, color: TEAL, gap: 6 });
  cur.page.drawLine({
    start: { x: MARGIN, y: cur.y + 6 },
    end: { x: PAGE_W - MARGIN, y: cur.y + 6 },
    thickness: 1,
    color: TEAL,
  });
  cur.gap(10);

  const lines = body.split("\n");
  for (const ln of lines) {
    // body header markers like "ARTICLE I" get bold
    const isArticle = /^(ARTICLE|SCHEDULE|ACKNOWLEDGMENT|WITNESSES|SELLER|BUYER|LENDER|BORROWER)/.test(
      ln.trim()
    );
    cur.text(ln, {
      font: isArticle ? fonts.bold : fonts.mono,
      size: isArticle ? BODY_SIZE : 9.5,
      color: isArticle ? TEAL : SLATE,
    });
  }

  const bytes = await doc.save();
  triggerDownload(bytes, `${safeName(title)}.pdf`);
}

/** Render the all-in-one booklet: cover + TOC + plan sections + all documents. Resolves to the substituted characters. */
export function renderBooklet(plan: EstatePlan, businessPlan: BusinessPlan, docs: GeneratedDocument[]): Promise<string[]> {
  return withSubstitutionLog(() => renderBookletInner(plan, businessPlan, docs));
}

async function renderBookletInner(
  plan: EstatePlan,
  businessPlan: BusinessPlan,
  docs: GeneratedDocument[]
): Promise<void> {
  const doc = await PDFDocument.create();
  const fonts = await loadFonts(doc);

  // ---- Cover page (drawn manually, not via cursor) ----
  const cover = doc.addPage([PAGE_W, PAGE_H]);
  cover.drawRectangle({ x: 0, y: PAGE_H - 8, width: PAGE_W, height: 8, color: TEAL });
  cover.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: 8, color: TEAL });

  let cy = PAGE_H - 240;
  // emblem: layered tiers (drawn well above the wordmark with clearance)
  const cx = PAGE_W / 2;
  // tiers ascend; widest (TEAL) on top. Lowest tier sits ~40pt above the wordmark baseline.
  [0, 1, 2].forEach((i) => {
    const w = 120 - i * 32;
    cover.drawRectangle({
      x: cx - w / 2,
      y: cy + 96 + i * 24,
      width: w,
      height: 18,
      color: i === 0 ? TEAL : i === 1 ? SLATE : MUTED,
    });
  });
  const draws = (txt: string, size: number, font: PDFFont, color: any, gap: number) => {
    const w = safeWidth(font, txt, size);
    cover.drawText(txt, { x: cx - w / 2, y: cy, size, font, color });
    cy -= gap;
  };
  draws(sanitize(APP_NAME), 13, fonts.bold, MUTED, 50);
  // title can wrap
  const titleLines = wrapLine(sanitize(businessPlan.title), fonts.bold, 26, CONTENT_W);
  for (const tl of titleLines) {
    const w = safeWidth(fonts.bold, tl, 26);
    cover.drawText(tl, { x: cx - w / 2, y: cy, size: 26, font: fonts.bold, color: TEAL });
    cy -= 34;
  }
  cy -= 6;
  draws(sanitize(businessPlan.subtitle), 13, fonts.italic, SLATE, 40);
  draws(sanitize(`Prepared ${businessPlan.generatedAt}`), 10, fonts.regular, MUTED, 18);
  draws(sanitize(`Estate planning workbook - by ${APP_OWNER}`), 10, fonts.regular, MUTED, 0);

  // disclaimer near bottom of cover
  const discLines = wrapLine(sanitize(DISCLAIMER), fonts.italic, 8, CONTENT_W);
  let dy = 80;
  cover.drawLine({ start: { x: MARGIN, y: dy + 12 }, end: { x: PAGE_W - MARGIN, y: dy + 12 }, thickness: 0.5, color: RULE });
  for (const dl of discLines) {
    cover.drawText(dl, { x: MARGIN, y: dy, size: 8, font: fonts.italic, color: MUTED });
    dy -= 10;
  }

  // record: section title -> doc page index (0-based, absolute)
  const entries: { label: string; index: number }[] = [];

  // Reserve TOC page now so its absolute index is 1 (cover is 0).
  const tocPage = doc.insertPage(1, [PAGE_W, PAGE_H]);

  // Cursor appends content pages AFTER the TOC page.
  const c = new Cursor(doc, fonts, DISCLAIMER);

  const recordEntry = (label: string) => {
    entries.push({ label, index: doc.getPages().indexOf(c.page) });
  };

  // PART 1 — Business plan
  c.text("Part I — Business Plan", { size: TITLE_SIZE, font: fonts.bold, color: TEAL, gap: 8 });
  for (const section of businessPlan.sections) {
    recordEntry(section.title);
    c.heading(section.title);
    for (const ln of section.body) {
      c.text(ln, { font: ln.trim().startsWith("•") || ln.startsWith("  ") ? fonts.regular : fonts.regular });
    }
    c.gap(6);
  }

  // cost tables
  recordEntry("Cost Summary");
  c.heading("Cost Summary");
  c.text("Setup Costs (one-time)", { font: fonts.bold, color: TEAL });
  let setupLow = 0, setupHigh = 0;
  for (const cl of businessPlan.setupCosts) {
    setupLow += cl.low; setupHigh += cl.high;
    c.text(`${cl.item}: ${fmtUSD(cl.low)}${cl.high !== cl.low ? " - " + fmtUSD(cl.high) : ""}${cl.note ? "  (" + cl.note + ")" : ""}`, { indent: 12 });
  }
  c.text(`Total setup: ${fmtUSD(setupLow)} - ${fmtUSD(setupHigh)}`, { font: fonts.bold });
  c.gap(8);
  c.text("Annual Costs (recurring)", { font: fonts.bold, color: TEAL });
  let annLow = 0, annHigh = 0;
  for (const cl of businessPlan.annualCosts) {
    annLow += cl.low; annHigh += cl.high;
    c.text(`${cl.item}: ${fmtUSD(cl.low)}${cl.high !== cl.low ? " - " + fmtUSD(cl.high) : ""}${cl.note ? "  (" + cl.note + ")" : ""}`, { indent: 12 });
  }
  c.text(`Total annual: ${fmtUSD(annLow)} - ${fmtUSD(annHigh)}`, { font: fonts.bold });
  c.gap(8);

  if (businessPlan.outstandingItems.length) {
    recordEntry("Outstanding Items");
    c.heading("Outstanding Items");
    for (const oi of businessPlan.outstandingItems) {
      c.text(`- ${oi.item}`, { font: fonts.bold });
      c.text(oi.action, { indent: 12, color: MUTED });
    }
  }

  // PART 2 — Documents
  c.newPage();
  c.text("Part II — Documents", { size: TITLE_SIZE, font: fonts.bold, color: TEAL, gap: 8 });
  for (const d of docs) {
    c.newPage();
    recordEntry(d.title);
    c.text(d.title, { size: 15, font: fonts.bold, color: TEAL });
    c.page.drawLine({ start: { x: MARGIN, y: c.y + 4 }, end: { x: PAGE_W - MARGIN, y: c.y + 4 }, thickness: 1, color: TEAL });
    c.gap(10);
    for (const ln of d.body.split("\n")) {
      const isArticle = /^(ARTICLE|SCHEDULE|ACKNOWLEDGMENT|WITNESSES|SELLER|BUYER|LENDER|BORROWER|PROPERTY|PARCEL|FILING|TEMPLATE)/.test(ln.trim());
      c.text(ln, { font: isArticle ? fonts.bold : fonts.mono, size: isArticle ? 10 : 9, color: isArticle ? TEAL : SLATE });
    }
  }

  // ---- Draw TOC onto reserved page ----
  // Map absolute page index -> printed page number. Cover is index 0 (unnumbered).
  // Content cursor pages start numbering at 1 on the page after TOC.
  // Printed number on a content page = (absolute index) since cover(0)+toc(1) => first content is index2 prints "1"? 
  // Our cursor prints its own pageNum starting at 1 for its first page (the page after TOC).
  // Absolute index of cursor's first page = 2. So printedNumber = absoluteIndex - 1.
  {
    let ty = PAGE_H - MARGIN;
    tocPage.drawText("Table of Contents", { x: MARGIN, y: ty, size: TITLE_SIZE, font: fonts.bold, color: TEAL });
    ty -= 12;
    tocPage.drawLine({ start: { x: MARGIN, y: ty }, end: { x: PAGE_W - MARGIN, y: ty }, thickness: 1, color: TEAL });
    ty -= 26;
    for (const e of entries) {
      const printed = e.index - 1; // cover absolute0 + toc absolute1 => first content prints 1
      const label = sanitize(e.label);
      const num = `${printed}`;
      const labelLines = wrapLine(label, fonts.regular, 10.5, CONTENT_W - 40);
      const shown = labelLines[0] + (labelLines.length > 1 ? "..." : "");
      tocPage.drawText(shown, { x: MARGIN, y: ty, size: 10.5, font: fonts.regular, color: SLATE });
      const nw = safeWidth(fonts.regular, num, 10.5);
      tocPage.drawText(num, { x: PAGE_W - MARGIN - nw, y: ty, size: 10.5, font: fonts.regular, color: MUTED });
      ty -= 18;
      if (ty < 70) break;
    }
    // footer on TOC
    tocPage.drawLine({ start: { x: MARGIN, y: FOOTER_RULE_Y }, end: { x: PAGE_W - MARGIN, y: FOOTER_RULE_Y }, thickness: 0.5, color: RULE });
    const fl = wrapLine(sanitize(DISCLAIMER), fonts.italic, 7, CONTENT_W).slice(0, 2);
    let fy = FOOTER_RULE_Y - 10;
    for (const l of fl) { tocPage.drawText(l, { x: MARGIN, y: fy, size: 7, font: fonts.italic, color: MUTED }); fy -= 9; }
  }

  const bytes = await doc.save();
  triggerDownload(bytes, `${safeName(businessPlan.title)}_booklet.pdf`);
}
