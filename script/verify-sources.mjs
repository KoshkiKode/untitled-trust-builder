#!/usr/bin/env node
/**
 * Verifies that every cited source in the state-law data is reachable and that its
 * `quote` really appears on the page.
 *
 *   node script/verify-sources.mjs <path> [--only=CA,NY] [--concurrency=8] [--report=out.json]
 *
 * <path> is either a directory of `<CODE>.json` state files (default:
 * client/src/data/states) or a single research JSON file shaped { data: { CODE: {...} } }.
 *
 * Result per source: exact | fuzzy | missing | no_quote | pdf | fetch_failed.
 * Exit code 1 if any `missing` or `fetch_failed` result is found (use --lenient to always exit 0).
 */
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const target = args.find((a) => !a.startsWith("--")) ?? "client/src/data/states";
const opt = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const only = opt("only", "")
  .split(",")
  .map((s) => s.trim().toUpperCase())
  .filter(Boolean);
const concurrency = Number(opt("concurrency", "8"));
const reportPath = opt("report", "");
const lenient = args.includes("--lenient");

// ---------- load sources ----------
function collect(obj, trail, out) {
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => collect(v, `${trail}[${i}]`, out));
  } else if (obj && typeof obj === "object") {
    if (typeof obj.url === "string" && typeof obj.label === "string") {
      out.push({ where: trail, label: obj.label, url: obj.url, quote: obj.quote ?? null });
    }
    for (const [k, v] of Object.entries(obj)) collect(v, trail ? `${trail}.${k}` : k, out);
  }
}

const sources = [];
const stat = fs.statSync(target);
if (stat.isDirectory()) {
  for (const f of fs.readdirSync(target).filter((n) => n.endsWith(".json")).sort()) {
    const code = f.replace(/\.json$/, "");
    if (only.length && !only.includes(code)) continue;
    collect(JSON.parse(fs.readFileSync(path.join(target, f), "utf8")), code, sources);
  }
} else {
  const json = JSON.parse(fs.readFileSync(target, "utf8"));
  for (const [code, groups] of Object.entries(json.data ?? {})) {
    if (only.length && !only.includes(code)) continue;
    collect(groups, code, sources);
  }
  if (json.items) collect(json.items, "federal", sources);
}
console.log(`Checking ${sources.length} source citations (${new Set(sources.map((s) => s.url)).size} unique URLs)…`);

// ---------- text helpers ----------
const ENTITIES = { nbsp: " ", amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", rsquo: "'", lsquo: "'", rdquo: '"', ldquo: '"', ndash: "-", mdash: "-", sect: "§", hellip: "..." };
function htmlToText(html) {
  return html
    .replace(/<(script|style|noscript|template)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? " ");
}
const norm = (s) =>
  s
    .toLowerCase()
    .replace(/[\u2018\u2019\u201a\u2032]/g, "'")
    .replace(/[\u201c\u201d\u201e\u2033]/g, '"')
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/\u00a0|\u200b/g, " ")
    .replace(/[^a-z0-9§$%.,'"()-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function fuzzyScore(pageWords, quoteWords) {
  if (quoteWords.length < 4) return 0;
  const seed = quoteWords.slice(0, 3).join(" ");
  const pageJoined = pageWords.join(" ");
  let best = 0;
  let from = 0;
  for (let guard = 0; guard < 50; guard++) {
    const at = pageJoined.indexOf(seed, from);
    if (at < 0) break;
    const startWord = pageJoined.slice(0, at).split(" ").length - (at === 0 ? 1 : 1);
    const window = pageWords.slice(Math.max(0, startWord), startWord + quoteWords.length + 6);
    const set = new Set(window);
    const hit = quoteWords.filter((w) => set.has(w)).length;
    best = Math.max(best, hit / quoteWords.length);
    from = at + 1;
  }
  return best;
}

// ---------- fetching ----------
const cache = new Map();
const hostBusy = new Map();
async function fetchText(url) {
  if (cache.has(url)) return cache.get(url);
  const p = (async () => {
    const host = new URL(url).host;
    while ((hostBusy.get(host) ?? 0) >= 2) await new Promise((r) => setTimeout(r, 150));
    hostBusy.set(host, (hostBusy.get(host) ?? 0) + 1);
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await fetch(url, {
            redirect: "follow",
            signal: AbortSignal.timeout(30000),
            headers: {
              "user-agent": "Mozilla/5.0 (compatible; TrustBuilderSourceCheck/1.0; +https://github.com/KoshkiKode/untitled-trust-builder)",
              accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5",
            },
          });
          const type = res.headers.get("content-type") ?? "";
          if (!res.ok) return { ok: false, status: res.status };
          if (/pdf/i.test(type) || /\.pdf($|\?)/i.test(url)) return { ok: true, pdf: true };
          const body = await res.text();
          return { ok: true, text: /html|xml/i.test(type) ? htmlToText(body) : body };
        } catch (e) {
          if (attempt === 1) return { ok: false, status: String(e?.cause?.code ?? e?.name ?? e) };
        }
      }
    } finally {
      hostBusy.set(host, hostBusy.get(host) - 1);
    }
  })();
  cache.set(url, p);
  return p;
}

// ---------- run ----------
const results = [];
let next = 0;
async function worker() {
  while (next < sources.length) {
    const s = sources[next++];
    const page = await fetchText(s.url);
    let status;
    let detail = "";
    if (!page.ok) {
      status = "fetch_failed";
      detail = `HTTP/err ${page.status}`;
    } else if (page.pdf) {
      status = "pdf";
    } else if (!s.quote) {
      status = "no_quote";
    } else {
      const pageNorm = norm(page.text);
      const quoteNorm = norm(s.quote);
      if (pageNorm.includes(quoteNorm)) status = "exact";
      else {
        const score = fuzzyScore(pageNorm.split(" "), quoteNorm.split(" "));
        status = score >= 0.85 ? "fuzzy" : "missing";
        detail = `score ${score.toFixed(2)}`;
      }
    }
    results.push({ ...s, status, detail });
  }
}
await Promise.all(Array.from({ length: concurrency }, worker));

const counts = {};
for (const r of results) counts[r.status] = (counts[r.status] ?? 0) + 1;
console.log("\nSummary:", JSON.stringify(counts));
const bad = results.filter((r) => r.status === "missing" || r.status === "fetch_failed");
for (const r of bad.sort((a, b) => a.where.localeCompare(b.where))) {
  console.log(`  [${r.status}] ${r.where}  ${r.url}  ${r.detail}\n      quote: ${(r.quote ?? "").slice(0, 110)}`);
}
if (reportPath) fs.writeFileSync(reportPath, JSON.stringify({ counts, results }, null, 2));
process.exit(bad.length && !lenient ? 1 : 0);
