/**
 * Structured document model.
 *
 * Document generators emit `DocBlock[]` (via `DocBuilder`); the PDF renderer lays the
 * blocks out (keeping signature/witness/notary blocks together on a page) and
 * `blocksToText` produces a plain-text rendering for in-app preview, tests and export.
 */

export type DocBlock =
  | { t: "title"; text: string; subtitle?: string }
  /** Boxed banner, e.g. the "TEMPLATE - REVIEW BEFORE USE" header. */
  | { t: "banner"; text: string }
  | { t: "heading"; text: string; level: 1 | 2 | 3 }
  | { t: "para"; text: string; align?: "left" | "center"; indent?: 0 | 1 | 2; bold?: boolean; italic?: boolean }
  /** Numbered clause with hanging indent, e.g. num "4.2", heading "Trustee Powers". */
  | { t: "clause"; num: string; heading?: string; text: string }
  | { t: "list"; items: string[]; style: "bullet" | "number" | "alpha" }
  | { t: "kv"; rows: { k: string; v: string }[] }
  | { t: "sig"; name: string; role?: string; date?: boolean }
  | { t: "witness"; count: number; label?: string; attestation?: string }
  | {
      t: "notary";
      form: "acknowledgment" | "jurat";
      stateName: string;
      county: string;
      signers: string[];
      /** Verbatim mandated wording (e.g. California Civil Code 1189) - replaces the default text. */
      wording?: string;
    }
  | { t: "check"; items: string[] }
  | { t: "note"; text: string; tone?: "info" | "warn" }
  | { t: "table"; headers: string[]; rows: string[][] }
  | { t: "pagebreak" }
  | { t: "spacer"; size?: number };

export type DocBlockType = DocBlock["t"];

const BLANK = "____________________";

/** Default notary certificate text, shared by the PDF renderer and the text export. */
export function notaryLines(block: Extract<DocBlock, { t: "notary" }>): string[] {
  const who = block.signers.length ? block.signers.join(" and ") : BLANK;
  const lines: string[] = [];
  lines.push(block.form === "jurat" ? "JURAT" : "ACKNOWLEDGMENT");
  lines.push(`STATE OF ${(block.stateName || BLANK).toUpperCase()}`);
  lines.push(`COUNTY OF ${(block.county || BLANK).toUpperCase()}`);
  if (block.wording) {
    lines.push(...block.wording.split("\n"));
  } else if (block.form === "jurat") {
    lines.push(
      `Subscribed and sworn to (or affirmed) before me on this ______ day of ________________, 20____, by ${who}, who is personally known to me or has produced satisfactory evidence of identity.`,
    );
  } else {
    lines.push(
      `On this ______ day of ________________, 20____, before me, the undersigned notary public, personally appeared ${who}, personally known to me or proved to me on the basis of satisfactory evidence to be the individual(s) whose name(s) is (are) subscribed to the within instrument, and acknowledged that he/she/they executed the same for the purposes therein contained.`,
    );
  }
  lines.push("");
  lines.push("____________________________________");
  lines.push(`Notary Public, ${block.stateName || BLANK}`);
  lines.push("Printed name: ________________________");
  lines.push("My commission expires: ________________");
  return lines;
}

/** Plain-text rendering of blocks (preview, tests, text export). */
export function blocksToText(blocks: DocBlock[]): string {
  const out: string[] = [];
  const push = (...ls: string[]) => out.push(...ls);
  for (const b of blocks) {
    switch (b.t) {
      case "title":
        push(b.text.toUpperCase(), ...(b.subtitle ? [b.subtitle] : []), "=".repeat(Math.min(64, Math.max(8, b.text.length))), "");
        break;
      case "banner":
        push(`[ ${b.text} ]`, "");
        break;
      case "heading":
        push(b.level === 1 ? b.text.toUpperCase() : b.text, "");
        break;
      case "para":
        push(b.text, "");
        break;
      case "clause":
        push(`${b.num}  ${b.heading ? `${b.heading}. ` : ""}${b.text}`, "");
        break;
      case "list":
        b.items.forEach((item, i) =>
          push(`  ${b.style === "bullet" ? "•" : b.style === "number" ? `${i + 1}.` : `(${String.fromCharCode(97 + i)})`} ${item}`),
        );
        push("");
        break;
      case "kv":
        b.rows.forEach((r) => push(`${r.k}: ${r.v}`));
        push("");
        break;
      case "sig":
        push("", "____________________________________", `${b.name}${b.role ? `, ${b.role}` : ""}`, ...(b.date === false ? [] : ["Date: ________________"]), "");
        break;
      case "witness":
        push(b.label ?? "WITNESSES", ...(b.attestation ? [b.attestation] : []), "");
        for (let i = 1; i <= b.count; i++) push("____________________________   Printed name: ____________________   Address: ____________________", `Witness ${i}`, "");
        break;
      case "notary":
        push(...notaryLines(b), "");
        break;
      case "check":
        b.items.forEach((item) => push(`  [ ] ${item}`));
        push("");
        break;
      case "note":
        push(`${b.tone === "warn" ? "WARNING: " : "NOTE: "}${b.text}`, "");
        break;
      case "table":
        push(b.headers.join(" | "), b.headers.map(() => "---").join(" | "), ...b.rows.map((r) => r.join(" | ")), "");
        break;
      case "pagebreak":
        push("-----", "");
        break;
      case "spacer":
        push("");
        break;
    }
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX"];

/**
 * Fluent builder for document blocks with automatic article/section numbering and
 * forward-safe cross references: write `{ref:key}` in any text, register the target with
 * `article(title, key)` / `section(..., key)`, and call `finish()` to resolve them.
 */
export class DocBuilder {
  private blocks: DocBlock[] = [];
  private articleNo = 0;
  private sectionNo = 0;
  private labels = new Map<string, string>();

  title(text: string, subtitle?: string) {
    this.blocks.push({ t: "title", text, subtitle });
    return this;
  }
  banner(text: string) {
    this.blocks.push({ t: "banner", text });
    return this;
  }
  heading(text: string, level: 1 | 2 | 3 = 2) {
    this.blocks.push({ t: "heading", text, level });
    return this;
  }
  para(text: string, opts: { align?: "left" | "center"; indent?: 0 | 1 | 2; bold?: boolean; italic?: boolean } = {}) {
    this.blocks.push({ t: "para", text, ...opts });
    return this;
  }
  /** Starts "ARTICLE III - TITLE" and resets section numbering. */
  article(title: string, key?: string) {
    this.articleNo += 1;
    this.sectionNo = 0;
    const label = `Article ${ROMAN[this.articleNo] ?? this.articleNo}`;
    if (key) this.labels.set(key, label);
    this.blocks.push({ t: "heading", text: `ARTICLE ${ROMAN[this.articleNo] ?? this.articleNo} - ${title.toUpperCase()}`, level: 1 });
    return this;
  }
  /** Numbered section within the current article, e.g. "3.2". */
  section(text: string, heading?: string, key?: string) {
    this.sectionNo += 1;
    const num = `${this.articleNo}.${this.sectionNo}`;
    if (key) this.labels.set(key, `Section ${num}`);
    this.blocks.push({ t: "clause", num, heading, text });
    return this;
  }
  /** Un-numbered clause with an explicit label (e.g. "(a)"). */
  clause(num: string, text: string, heading?: string) {
    this.blocks.push({ t: "clause", num, heading, text });
    return this;
  }
  list(items: string[], style: "bullet" | "number" | "alpha" = "bullet") {
    if (items.length) this.blocks.push({ t: "list", items, style });
    return this;
  }
  kv(rows: { k: string; v: string }[]) {
    this.blocks.push({ t: "kv", rows });
    return this;
  }
  sig(name: string, role?: string, date = true) {
    this.blocks.push({ t: "sig", name, role, date });
    return this;
  }
  witness(count: number, label?: string, attestation?: string) {
    if (count > 0) this.blocks.push({ t: "witness", count, label, attestation });
    return this;
  }
  notary(form: "acknowledgment" | "jurat", stateName: string, county: string, signers: string[], wording?: string) {
    this.blocks.push({ t: "notary", form, stateName, county, signers, wording });
    return this;
  }
  check(items: string[]) {
    if (items.length) this.blocks.push({ t: "check", items });
    return this;
  }
  note(text: string, tone: "info" | "warn" = "info") {
    this.blocks.push({ t: "note", text, tone });
    return this;
  }
  table(headers: string[], rows: string[][]) {
    this.blocks.push({ t: "table", headers, rows });
    return this;
  }
  pagebreak() {
    this.blocks.push({ t: "pagebreak" });
    return this;
  }
  spacer(size?: number) {
    this.blocks.push({ t: "spacer", size });
    return this;
  }
  /** Appends already-built blocks. */
  append(blocks: DocBlock[]) {
    this.blocks.push(...blocks);
    return this;
  }

  /** Resolves `{ref:key}` tokens and returns the finished blocks. */
  finish(): DocBlock[] {
    const resolve = (s: string) => s.replace(/\{ref:([A-Za-z0-9_-]+)\}/g, (_, k) => this.labels.get(k) ?? "the applicable provision");
    return this.blocks.map((b) => {
      switch (b.t) {
        case "para":
          return { ...b, text: resolve(b.text) };
        case "clause":
          return { ...b, text: resolve(b.text), heading: b.heading ? resolve(b.heading) : b.heading };
        case "list":
          return { ...b, items: b.items.map(resolve) };
        case "note":
          return { ...b, text: resolve(b.text) };
        default:
          return b;
      }
    });
  }
}
