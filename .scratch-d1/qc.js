// usage: node qc.js path/to/file.json
// Re-fetches every source URL and checks that each quote appears verbatim (modes A and B).
const fs = require("fs");
const { getRaw, htmlToText, collapse } = require("./lib");

(async () => {
  const file = process.argv[2];
  let raw = fs.readFileSync(file, "utf8").replace(/\/\*NEXT\*\/\s*/g, "");
  const doc = JSON.parse(raw);
  const items = [];
  for (const [code, groups] of Object.entries(doc.data)) {
    for (const [g, obj] of Object.entries(groups)) {
      for (const s of obj.sources || []) items.push({ code, g, s });
    }
  }
  const urls = [...new Set(items.map((i) => i.s.url))];
  const pages = {};
  const queue = urls.slice();
  async function worker() {
    while (queue.length) {
      const u = queue.shift();
      const r = await getRaw(u);
      pages[u] = {
        status: r.status,
        ct: r.ct,
        pdf: !!r.pdf,
        A: collapse(htmlToText(r.body || "", "A")),
        B: collapse(htmlToText(r.body || "", "B")),
      };
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker));

  let bad = 0;
  let warn = 0;
  for (const { code, g, s } of items) {
    const p = pages[s.url];
    const tag = `${code}.${g} <${s.url}>`;
    if (s.quote === null) {
      console.log(`NULLQUOTE ${tag} (status ${p.status}, ${p.ct})`);
      continue;
    }
    if (typeof s.quote !== "string" || s.quote.length === 0) {
      console.log(`BADQUOTE-TYPE ${tag}`);
      bad++;
      continue;
    }
    if (s.quote.length > 300) {
      console.log(`TOOLONG(${s.quote.length}) ${tag}`);
      bad++;
    }
    if (p.status !== 200) {
      console.log(`HTTP${p.status} ${tag}`);
      bad++;
      continue;
    }
    if (p.pdf) {
      console.log(`PDF-WITH-QUOTE (set quote null) ${tag}`);
      bad++;
      continue;
    }
    const q = collapse(s.quote);
    const inA = p.A.includes(q);
    const inB = p.B.includes(q);
    const inAi = p.A.toLowerCase().includes(q.toLowerCase());
    if (!inA && !inB) {
      console.log(`MISSING ${tag}\n   quote: ${s.quote.slice(0, 120)}${inAi ? "  (case-insensitive hit)" : ""}`);
      bad++;
    } else if (!(inA && inB)) {
      console.log(`WARN-ONLY-${inA ? "A" : "B"} ${tag}\n   quote: ${s.quote.slice(0, 120)}`);
      warn++;
    }
    if (/[\u2018\u2019\u201c\u201d\u2013\u2014\u00a0\u00a7]/.test(s.quote)) {
      console.log(`WARN-SPECIALCHARS ${tag}`);
      warn++;
    }
  }
  console.log(`checked ${items.length} sources over ${urls.length} urls; bad=${bad} warn=${warn}`);
  process.exit(bad ? 1 : 0);
})();
