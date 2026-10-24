// usage: node ddg.js "query" [maxResults]
const { spawnSync } = require("child_process");

const q = process.argv[2];
const max = parseInt(process.argv[3] || "8", 10);
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0 Safari/537.36";
const r = spawnSync("curl", ["-s", "-L", "--max-time", "40", "-A", UA, "https://html.duckduckgo.com/html/?q=" + encodeURIComponent(q)], { maxBuffer: 50 * 1024 * 1024 });
const html = (r.stdout || "").toString("utf8");
const out = [];
const rx = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:class="result__snippet"[^>]*>([\s\S]*?)<\/a>)?/gi;
let m;
while ((m = rx.exec(html)) && out.length < max) {
  let href = m[1];
  const mm = href.match(/uddg=([^&]+)/);
  if (mm) href = decodeURIComponent(mm[1]);
  const title = m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  const snip = (m[3] || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 160);
  out.push(`${title}\n   ${href}\n   ${snip}`);
}
if (!out.length) console.log("NO RESULTS (len " + html.length + ") " + (/captcha|robot|anomaly/i.test(html) ? "[bot check]" : ""));
else console.log(out.join("\n"));
