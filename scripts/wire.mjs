// Pulls primary-source feeds (central banks, regulators, AI labs) into one JSON file.
// Node 20+, no dependencies. Usage: node scripts/wire.mjs [previous.json] > wire.json
import fs from "node:fs";

const UA = "MorbiusLabs-wire/1.0 (+https://morbiuslabs.org)";
const SOURCES = [
  { id: "fed", name: "Federal Reserve", kind: "Central bank", url: "https://www.federalreserve.gov/feeds/press_all.xml" },
  { id: "fed-speech", name: "Federal Reserve speeches", kind: "Central bank", url: "https://www.federalreserve.gov/feeds/speeches.xml" },
  { id: "ecb", name: "European Central Bank", kind: "Central bank", url: "https://www.ecb.europa.eu/rss/press.html" },
  { id: "boe", name: "Bank of England", kind: "Central bank", url: "https://www.bankofengland.co.uk/rss/news" },
  { id: "bis", name: "BIS central bankers' speeches", kind: "Central bank", url: "https://www.bis.org/doclist/cbspeeches.rss" },
  { id: "sec", name: "SEC", kind: "Regulator", url: "https://www.sec.gov/news/pressreleases.rss" },
  { id: "openai", name: "OpenAI", kind: "AI lab", url: "https://openai.com/news/rss.xml", filter: true },
];
// AI x money keywords. Regulators: flag items about AI or crypto. AI labs: keep only items about money.
const AIK = /\b(ai|a\.i\.|artificial intelligence|machine learning|agentic|large language models?)\b/i;
const CRYPTO = /\b(crypto(currenc(y|ies)|-assets?)?|bitcoin|ether(eum)?|stablecoins?|tokeni[sz]\w*|digital (assets?|euro|pound|dollar|currenc(y|ies))|cbdcs?|blockchain|dlt)\b/i;
const MONEY = /\b(payments?|wallets?|banks?|banking|financ(e|ial)|commerce|checkout|fintech|money|trading|invest(ing|ment|ors?)?)\b/i;
const dec = (s) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&#039;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const tag = (xml, t) => { const m = xml.match(new RegExp(`<${t}(?:\\s[^>]*)?>([\\s\\S]*?)</${t}>`, "i")); return m ? dec(m[1]) : ""; };
const link = (xml) => { const a = xml.match(/<link[^>]*href="([^"]+)"/i); return a ? a[1] : tag(xml, "link"); };

async function pull(src) {
  const r = await fetch(src.url, { headers: { "User-Agent": UA, Accept: "application/rss+xml, application/xml, text/xml" }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`${src.id} HTTP ${r.status}`);
  const xml = await r.text();
  const items = xml.match(/<(item|entry)[\s>][\s\S]*?<\/(item|entry)>/gi) || [];
  return items.slice(0, 40).map((it) => {
    const title = tag(it, "title");
    const url = link(it).trim();
    const when = tag(it, "pubDate") || tag(it, "dc:date") || tag(it, "updated") || tag(it, "published");
    const t = Date.parse(when);
    const summary = (tag(it, "description") || tag(it, "summary")).slice(0, 280);
    const txt = title + " " + summary;
    const flag = src.filter ? MONEY.test(txt) || CRYPTO.test(txt) : AIK.test(txt) || CRYPTO.test(txt);
    return { src: src.id, source: src.name, kind: src.kind, title, url, ts: isNaN(t) ? null : Math.floor(t / 1000), summary, flag };
  }).filter((x) => x.title && /^https?:/.test(x.url) && x.ts && (!src.filter || x.flag));
}

const prev = process.argv[2] && fs.existsSync(process.argv[2]) ? JSON.parse(fs.readFileSync(process.argv[2], "utf8")) : { items: [] };
const status = {};
const fresh = [];
for (const s of SOURCES) {
  try { const got = await pull(s); fresh.push(...got); status[s.id] = { ok: true, n: got.length }; }
  catch (e) { status[s.id] = { ok: false, error: String(e.message || e).slice(0, 120) }; fresh.push(...prev.items.filter((x) => x.src === s.id)); }
}
const seen = new Set();
const items = fresh.filter((x) => (seen.has(x.url) ? false : seen.add(x.url)))
  .filter((x) => x.ts <= Date.now() / 1000 + 3600)
  .sort((a, b) => b.ts - a.ts).slice(0, 150);
process.stdout.write(JSON.stringify({ v: 1, updated: Math.floor(Date.now() / 1000), sources: SOURCES.map(({ id, name, kind, url }) => ({ id, name, kind, url, ...status[id] })), items }));
