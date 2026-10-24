// usage: node bing.js "query" [maxResults]
const { spawnSync } = require("child_process");

const q = process.argv[2];
const max = parseInt(process.argv[3] || "8", 10);
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const r = spawnSync("curl", ["-s", "-L", "--max-time", "40", "-A", UA, "https://www.bing.com/search?setlang=en-US&q=" + encodeURIComponent(q)], { maxBuffer: 50 * 1024 * 1024 });
const html = (r.stdout || "").toString("utf8");

function decodeBing(href) {
  href = href.replace(/&amp;/g, "&");
  const m = href.match(/[?&]u=a1([A-Za-z0-9_\-]+)/);
  if (!m) return href;
  try {
    return Buffer.from(m[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  } catch (e) {
    return href;
  }
}

const blocks = html.split('<li class="b_algo"').slice(1);
let n = 0;
for (const b of blocks) {
  if (n >= max) break;
  const a = b.match(/<h2[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
  if (!a) continue;
  const title = a[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  const sn = b.match(/<p[^>]*>([\s\S]*?)<\/p>/);
  const snip = sn ? sn[1].replace(/<[^>]+>/g, "").replace(/&#0183;|&ensp;/g, " ").replace(/\s+/g, " ").trim().slice(0, 170) : "";
  console.log(`${title}\n   ${decodeBing(a[1])}\n   ${snip}`);
  n++;
}
if (!n) console.log("NO RESULTS (len " + html.length + ")" + (/captcha|unusual traffic/i.test(html) ? " [bot check]" : ""));
