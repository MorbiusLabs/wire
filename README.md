# wire

Primary-source feeds and daily market series behind [morbiuslabs.org/wire](https://morbiuslabs.org/wire/) and [morbiuslabs.org/data](https://morbiuslabs.org/data/).

Every 15 minutes a GitHub Actions job ([.github/workflows/wire.yml](.github/workflows/wire.yml)) runs two scripts and force-pushes the results to the single-commit `data` branch:

| File | Script | What it holds |
|---|---|---|
| [`wire.json`](https://github.com/MorbiusLabs/wire/blob/data/wire.json) | [scripts/wire.mjs](scripts/wire.mjs) | The latest items from official feeds: Federal Reserve press releases and speeches, ECB, Bank of England, BIS central bankers' speeches, SEC, CFTC, and OpenAI posts about money. Items about AI or crypto are flagged. |
| [`markets.json`](https://github.com/MorbiusLabs/wire/blob/data/markets.json) | [scripts/markets.mjs](scripts/markets.mjs) | 90 days of daily Nvidia and Nasdaq closes (Yahoo Finance), Bitcoin (CoinGecko) and total USD stablecoin supply (DefiLlama). |

Wire items are headlines and links only, not verified by us. A headline here is a lead, not a verdict. Our checks live in [receipts](https://github.com/MorbiusLabs/receipts).

If a feed fails, the previous items from that source are kept and the failure is recorded in the file's `sources` / `status` field.

Node 20, no dependencies. Run locally:

```bash
node scripts/wire.mjs > wire.json
node scripts/markets.mjs > markets.json
```

MIT licensed.
