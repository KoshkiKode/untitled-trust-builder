// usage: node ft.js URL [regex] [ctxChars=250] [maxMatches=6]
const { getRaw, htmlToText, collapse } = require("./lib");

(async () => {
  const [, , url, pattern, ctxArg, maxArg] = process.argv;
  const r = await getRaw(url);
  console.log("STATUS", r.status, r.finalUrl, r.ct, r.err || "");
  if (!r.body) return;
  const text = collapse(htmlToText(r.body, "B"));
  console.log("LEN", text.length);
  if (!pattern) {
    console.log(text.slice(0, 3000));
    return;
  }
  const ctx = parseInt(ctxArg || "250", 10);
  const max = parseInt(maxArg || "6", 10);
  const re = new RegExp(pattern, "gi");
  let m;
  let n = 0;
  while ((m = re.exec(text)) && n < max) {
    const s = Math.max(0, m.index - ctx);
    const e = Math.min(text.length, m.index + m[0].length + ctx);
    console.log("--- match @" + m.index + ": ..." + text.slice(s, e) + "...");
    n++;
    if (re.lastIndex === m.index) re.lastIndex++;
  }
  if (n === 0) console.log("NO MATCH");
})();
