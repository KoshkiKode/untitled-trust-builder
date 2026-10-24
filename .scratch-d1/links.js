// usage: node links.js URL [hrefOrTextRegex]
const { getRaw } = require("./lib");

(async () => {
  const [, , url, filter] = process.argv;
  const r = await getRaw(url);
  console.log("STATUS", r.status, r.finalUrl, r.ct);
  const re = filter ? new RegExp(filter, "i") : null;
  const seen = new Set();
  const rx = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = rx.exec(r.body))) {
    const href = m[1].trim();
    const text = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const line = `${text} -> ${href}`;
    if (re && !re.test(line)) continue;
    if (seen.has(line)) continue;
    seen.add(line);
    console.log(line);
  }
})();
