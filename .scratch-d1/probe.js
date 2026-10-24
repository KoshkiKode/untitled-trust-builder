// usage: node probe.js url [url ...]   |   node probe.js --file path/to/file.json
const fs = require("fs");
const { probe } = require("./lib");

let urls = process.argv.slice(2);
if (urls[0] === "--file") {
  const doc = JSON.parse(fs.readFileSync(urls[1], "utf8").replace(/\/\*NEXT\*\/\s*/g, ""));
  const set = new Set();
  for (const groups of Object.values(doc.data)) for (const g of Object.values(groups)) for (const s of g.sources || []) set.add(s.url);
  urls = [...set];
}
for (const u of urls) {
  const r = probe(u);
  const ok = Object.values(r).every((x) => x === "200");
  console.log(`${ok ? "OK  " : "WARN"} curl=${r.curl} node=${r.node} py=${r.python} chrome=${r.chrome}  ${u}`);
}
