const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const ENT = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "\u2019",
  lsquo: "\u2018", ldquo: "\u201c", rdquo: "\u201d", mdash: "\u2014", ndash: "\u2013",
  sect: "\u00a7", hellip: "\u2026", bull: "\u2022", copy: "\u00a9", para: "\u00b6",
  eacute: "\u00e9", frac12: "\u00bd", times: "\u00d7", deg: "\u00b0",
};

function decode(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-z0-9]+);/gi, (m, n) => (ENT[n] !== undefined ? ENT[n] : m));
}

// mode "A": tags removed with no replacement; mode "B": tags replaced by a space
function htmlToText(html, mode) {
  let h = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  h = h.replace(/<\/?(p|div|li|ul|ol|tr|td|th|table|h[1-6]|br|section|article|header|footer|blockquote|dd|dt|dl)\b[^>]*>/gi, "\n");
  h = h.replace(/<[^>]+>/g, mode === "B" ? " " : "");
  return decode(h);
}

function collapse(s) {
  return s.replace(/[\s\u00a0]+/g, " ").trim();
}

async function getRaw(url) {
  const key = crypto.createHash("sha1").update(url).digest("hex");
  const f = path.join(__dirname, "cache", key + ".json");
  if (fs.existsSync(f)) {
    const c = JSON.parse(fs.readFileSync(f, "utf8"));
    if (c.status !== 0) return c;
  }
  let out = await viaFetch(url);
  if (out.status === 0 || out.status >= 400) {
    for (const ua of [null, "node", "python-requests/2.32.3", UA]) {
      const alt = viaCurl(url, ua);
      if (alt._buf) {
        try {
          alt.body = (await require("pdf-parse")(alt._buf)).text || "";
        } catch (e) {
          alt.body = "";
        }
      }
      delete alt._buf;
      if (alt.status > 0 && (out.status === 0 || alt.status < out.status)) out = alt;
      if (out.status === 200) break;
    }
  }
  fs.writeFileSync(f, JSON.stringify(out));
  return out;
}

// returns http status codes for several user agents (to judge how robustly a URL can be re-fetched)
function probe(url) {
  const { spawnSync } = require("child_process");
  const uas = { curl: null, node: "node", python: "python-requests/2.32.3", chrome: UA };
  const res = {};
  for (const [k, ua] of Object.entries(uas)) {
    const args = ["-s", "-o", "/dev/null", "-L", "--max-time", "45", "-w", "%{http_code}"];
    if (ua) args.push("-A", ua);
    args.push(url);
    const r = spawnSync("curl", args);
    res[k] = (r.stdout || "").toString().trim();
  }
  return res;
}

function viaCurl(url, ua) {
  const { spawnSync } = require("child_process");
  const args = ["-s", "-L", "--max-time", "60"];
  if (ua) args.push("-A", ua);
  args.push("-w", "\n@@META@@%{http_code}|%{content_type}|%{url_effective}", url);
  const r = spawnSync("curl", args, { maxBuffer: 200 * 1024 * 1024 });
  const buf = r.stdout || Buffer.alloc(0);
  const idx = buf.lastIndexOf("\n@@META@@");
  if (idx < 0) return { status: 0, finalUrl: url, ct: "", body: "", err: "curl failed" };
  const meta = buf.slice(idx + 9).toString("utf8").split("|");
  const bodyBuf = buf.slice(0, idx);
  const ct = meta[1] || "";
  const status = parseInt(meta[0], 10) || 0;
  const isPdf = /pdf|octet/i.test(ct) || /\.pdf(\?|$)/i.test(url);
  return { status, finalUrl: meta[2] || url, ct, body: isPdf ? "" : bodyBuf.toString("utf8"), pdf: isPdf, _buf: isPdf ? bodyBuf : undefined };
}

async function viaFetch(url) {
  let out;
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", "Accept-Language": "en-US,en;q=0.9" },
      signal: AbortSignal.timeout(45000),
    });
    const ct = res.headers.get("content-type") || "";
    let body = "";
    let pdf = false;
    if (/pdf|octet/i.test(ct) || /\.pdf(\?|$)/i.test(url)) {
      pdf = true;
      try {
        const buf = Buffer.from(await res.arrayBuffer());
        const parsed = await require("pdf-parse")(buf);
        body = parsed.text || "";
      } catch (e) {
        body = "";
      }
    } else {
      body = await res.text();
    }
    out = { status: res.status, finalUrl: res.url, ct, body, pdf };
  } catch (e) {
    out = { status: 0, finalUrl: url, ct: "", body: "", err: String(e && e.message ? e.message : e) };
  }
  return out;
}

module.exports = { getRaw, htmlToText, collapse, probe };
