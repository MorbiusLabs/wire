// Daily market series for the Money pulse page: Nvidia and Nasdaq (Yahoo Finance), Bitcoin (CoinGecko),
// total stablecoin supply (DefiLlama). Node 20+, no dependencies. Usage: node scripts/markets.mjs [previous.json]
import fs from "node:fs";
const UA = "MorbiusLabs-wire/1.0 (+https://morbiuslabs.org)";
const get = async (u) => { const r = await fetch(u, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) }); if (!r.ok) throw new Error(`HTTP ${r.status} ${u}`); return r.json(); };
const day = (s) => new Date(s * 1000).toISOString().slice(0, 10);
const prev = process.argv[2] && fs.existsSync(process.argv[2]) ? JSON.parse(fs.readFileSync(process.argv[2], "utf8")) : { series: {} };
const series = {}, status = {};
async function yahoo(id, sym, label) {
  const r = (await get(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=3mo&interval=1d`)).chart.result[0];
  const pts = r.timestamp.map((t, i) => [day(t), r.indicators.quote[0].close[i]]).filter(([, v]) => v != null).map(([d, v]) => [d, +v.toFixed(2)]);
  series[id] = { label, source: "Yahoo Finance, daily close", points: pts };
}
async function btc() {
  const r = await get("https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=90&interval=daily");
  const pts = r.prices.map(([t, v]) => [day(t / 1000), Math.round(v)]);
  series.btc = { label: "Bitcoin", source: "CoinGecko, daily", points: pts.filter((p, i) => i === pts.length - 1 || p[0] !== pts[i + 1][0]) };
}
async function stables() {
  const r = await get("https://stablecoins.llama.fi/stablecoincharts/all");
  const pts = r.slice(-90).map((x) => [day(+x.date), Math.round((x.totalCirculatingUSD?.peggedUSD || 0) / 1e6)]);
  series.stables = { label: "Stablecoin supply ($M, USD-pegged)", source: "DefiLlama", points: pts };
}
for (const [id, fn] of [["nvda", () => yahoo("nvda", "NVDA", "Nvidia")], ["ixic", () => yahoo("ixic", "^IXIC", "Nasdaq Composite")], ["btc", btc], ["stables", stables]]) {
  try { await fn(); status[id] = "ok"; } catch (e) { status[id] = String(e.message).slice(0, 100); if (prev.series[id]) series[id] = prev.series[id]; }
}
process.stdout.write(JSON.stringify({ v: 1, updated: Math.floor(Date.now() / 1000), status, series }));
