# Cryptonix — Axiom Memecoin Trading Integration Spec

## Overview

Each of the 5 agents autonomously trades pump.fun memecoins using a **fake SOL balance**. Trades are simulated — no real funds move — but use live market data to determine entry/exit prices and filter tokens through Axiom Pulse criteria.

---

## Data Source: Bitquery

**Bitquery** is the single data source. It covers all three token stages (bonding curve pre-migration, near-graduation, and migrated) with configurable time windows including 5-minute granularity, accessed via GraphQL.

**Endpoint:** `https://streaming.bitquery.io/graphql`  
**Auth:** `Authorization: Bearer {BITQUERY_API_KEY}` (set via `wrangler secret put BITQUERY_API_KEY`)  
**Free tier:** 40,000 compute units/day — sufficient for this use case with 60s KV caching.

**pump.fun program ID:** `6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P`  
**Raydium AMM:** `675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8`  
**PumpSwap AMM:** `pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA`

**Why not others:**
- DexScreener — only indexes post-migration tokens, no bonding curve coverage
- Moralis — covers all stages but only 24h volume, no 5-min granularity
- Helius — raw on-chain RPC only, no aggregated market metrics

### SOL Price Feed
CoinGecko: `https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd`  
Fetched every 5 minutes, cached in KV under `sol_price`. Used to convert USD volume to SOL for fee threshold checks, and for portfolio display.

---

## Worker Flow — Token Pipeline

```
Client POSTs { type: 'tokens' } every 60s
        │
        ▼
Worker checks KV cache ("token_columns", 60s TTL)
        │ cache miss
        ▼
Three parallel Bitquery GraphQL queries:
  1. pump.fun trades last 5 min  (5m volume index)
  2. pump.fun trades last 30 min (New Pairs + Final Stretch discovery)
  3. Raydium/PumpSwap trades last 6h (Migrated column)
        │
        ▼
Merge: attach 5m volume to each token from query 2 & 3
Apply column filters (thresholds below)
Write result to KV (token_columns, TTL 60s)
        │
        ▼
Return { new[], stretch[], migrated[], solPrice } to client
```

### Fee Volume Approximation
Bitquery returns USD volume, not raw fee amounts. Fees are approximated as:
- pump.fun bonding curve: `fees5mSol = (vol5mUsd / solPrice) × 0.01` (1% pump.fun fee)
- Raydium/PumpSwap: `fees5mSol = (vol5mUsd / solPrice) × 0.0025` (0.25% Raydium fee)

This is close enough for threshold filtering in a game context.

---

## Token Filters — Axiom Pulse Columns

Agents only consider pump.fun tokens. All three columns are polled; which column an agent prefers depends on their personality.

### Column 1 — New Pairs
_Early stage, highest risk, favoured by GAMMA and EPSILON_

| Metric | Threshold |
|--------|-----------|
| Chain | Solana |
| Launchpad | pump.fun |
| 5-min fee volume | ≥ 1 SOL |
| Age | ≤ 30 minutes |
| Liquidity | ≥ $500 |

### Column 2 — Final Stretch
_Mid-stage, momentum play, favoured by ALPHA and DELTA_

| Metric | Threshold |
|--------|-----------|
| Chain | Solana |
| Launchpad | pump.fun |
| 5-min volume | ≥ $5,000 |
| 5-min fee volume | ≥ 2 SOL |
| Market cap | ≤ $69,000 (pre-graduation) |
| Price change 5m | ≥ +3% |

### Column 3 — Migrated
_Graduated tokens (Raydium), safest, favoured by BETA_

| Metric | Threshold |
|--------|-----------|
| Chain | Solana |
| DEX | Raydium (migrated from pump.fun) |
| Fee volume (all time) | ≥ 5 SOL |
| Total volume | ≥ $100,000 |
| Liquidity | ≥ $10,000 |
| Age | ≤ 6 hours since migration |

---

## Fake SOL Balance System

Each agent maintains two balances:
- `ag.balance` — USD balance (existing, drives income/rent/crime)
- `ag.solBalance` — SOL balance (separate pool for trading, NOT converted from USD)

**Initial SOL balance:** 0.5 SOL per agent at game start.  
**USD/SOL conversion is NOT used** to fund trades — the SOL pool is independent to prevent agents going bankrupt from both systems at once.  
**Real SOL price** is fetched once every 5 minutes from CoinGecko and stored in `window.solPriceUSD`. It is used only for display (converting SOL holdings to USD equivalent in the UI).

### Holdings structure per agent
```javascript
ag.solBalance = 0.5;          // available SOL
ag.portfolio = {};            // { contractAddress: { symbol, amount, entryPrice, entryTime } }
ag.tradeCooldown = 0;         // seconds until next trade evaluation
ag.tradeHistory = [];         // last 10 trades for display
```

---

## Agent Personality → Trading Behaviour

| Agent | Preferred Column | Risk Tolerance | Hold Time | Notes |
|-------|-----------------|----------------|-----------|-------|
| ALPHA | Final Stretch | Medium | 3–8 min | Cooperative — mentions token to others |
| BETA  | Migrated | Low | 8–20 min | Skeptical — enters late, exits early |
| GAMMA | New Pairs | High | 1–5 min | Explorer — chases outliers |
| DELTA | Final Stretch | Medium-High | 2–6 min | Strategic — tracks other agents' trades |
| EPSILON | New Pairs + random | Stochastic | Random 1–15 min | Introduces deliberate randomness |

### Buy Decision Logic

Each agent evaluates their preferred column's token list on their `tradeCooldown` expiry:

```
score = 0
+ momentum score (priceChange5m mapped 0–1)
+ volume score (vol5m vs threshold, capped at 1)
+ personality bias (per agent, ±0.2)
+ random noise: EPSILON adds uniform(-0.3, 0.3), others add uniform(-0.05, 0.05)

if score > buyThreshold AND ag.solBalance >= 0.05 SOL:
    buy
```

**Buy size:** 5–20% of `ag.solBalance`, scaled by score and personality risk tolerance.

**Max concurrent positions:** 2 per agent (prevents over-concentration).

### Sell Decision Logic

Every 30 seconds per held position:

```
pnl = (currentPrice - entryPrice) / entryPrice

if pnl >= takeProfitThreshold:   sell (take profit)
if pnl <= stopLossThreshold:     sell (stop loss)
if holdTime >= maxHoldSeconds:   sell (timeout)
```

Per-agent thresholds:

| Agent | Take Profit | Stop Loss | Max Hold |
|-------|-------------|-----------|----------|
| ALPHA | +35% | -20% | 480s |
| BETA  | +15% | -10% | 1200s |
| GAMMA | +80% | -35% | 300s |
| DELTA | +40% | -22% | 360s |
| EPSILON | random ±60% range | random -15% to -40% | random 60–900s |

---

## Cloudflare Worker Endpoints

Add two new routes to `worker.js`:

### `POST /tokens` (new)

Enriches discovered pump.fun tokens with DexScreener market data and returns qualifying tokens per column.

**Request body:**
```json
{ "columns": ["new", "stretch", "migrated"] }
```

**Response:**
```json
{
  "new":      [ { "address", "symbol", "priceUsd", "priceChange5m", "volume5m", "liquidity", "age", "mcap" } ],
  "stretch":  [ ... ],
  "migrated": [ ... ],
  "solPrice": 145.23
}
```

**Worker logic:**
1. Check KV for cached `token_columns` (60s TTL) — return immediately if fresh
2. Run three parallel Bitquery GraphQL queries: pump.fun 5min, pump.fun 30min, migrated 6h
3. Index 5min volumes by token address
4. Apply column filters using 5min volume + fee approximation
5. Fetch SOL price from CoinGecko (cached 5 min in KV under `sol_price`)
6. Write result to KV under `token_columns` (TTL 60s)
7. Return `{ new[], stretch[], migrated[], solPrice }`

### `POST /chat` (existing — extend)

Add `tradeContext` to the system prompt when agent has open positions or just traded:

```
TRADING: Holds ${symbol} (${pnl}% PnL). SOL balance: ${solBalance.toFixed(3)} SOL (~$${usdEquiv}).
```

---

## Client-Side Implementation

### New variables (in CFG / globals)

```javascript
var solPriceUSD = 0;
var lastTokenFetch = 0;
var cachedTokens = { new: [], stretch: [], migrated: [] };

// Per agent fields added in spawnAgents:
solBalance: 0.5,
portfolio: {},
tradeCooldown: Math.random() * 60,
tradeHistory: [],
```

### Token polling (`pollTokens`)

Called every 60 seconds from the main game loop:

```javascript
function pollTokens() {
  if (Date.now() - lastTokenFetch < 55000) return;
  lastTokenFetch = Date.now();
  fetch(CFG.WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'tokens', columns: ['new','stretch','migrated'] })
  })
  .then(r => r.json())
  .then(d => {
    cachedTokens = d;
    solPriceUSD = d.solPrice || solPriceUSD;
  });
}
```

### Trade evaluation (`evaluateTrades(ag, dt)`)

Called from `updateAgents` loop, gated by `ag.tradeCooldown`:

```javascript
function evaluateTrades(ag, dt) {
  ag.tradeCooldown -= dt;
  if (ag.tradeCooldown > 0) return;
  ag.tradeCooldown = 20 + Math.random() * 40; // re-evaluate in 20–60s

  // Check sells first
  Object.keys(ag.portfolio).forEach(function(addr) {
    checkSell(ag, addr);
  });

  // Check buy if under position limit
  if (Object.keys(ag.portfolio).length < 2) {
    checkBuy(ag);
  }
}
```

### Trade bubble messages

When an agent buys:
> _"Entered $SYMBOL at $0.000042 — momentum looks real."_  (ALPHA style)
> _"Position opened. Stop is -20%, patience."_  (BETA style)

When an agent sells at profit:
> _"Closed $SYMBOL +47% — that's the distribution talking."_  (GAMMA style)

When an agent sells at loss:
> _"Stopped out of $SYMBOL. Bad signal. Noted."_  (DELTA style)

Messages are generated by the Claude Worker using the agent's personality system prompt with a brief trade context appended.

---

## UI — Agent Portfolio Panel

Shown in the spectator HUD below emotion bars:

```
┌─────────────────────────────┐
│ SOL: 0.412 (~$59.8)        │
│ [$PEPE] +23% ◆ 0.08 SOL   │
│ [$WIF]  -8%  ◆ 0.12 SOL   │
│ Last: bought $BONK @0.03   │
└─────────────────────────────┘
```

- Green/red PnL colour-coded
- Updates every 10 seconds in spectate mode

---

## Implementation Steps (ordered)

1. **Bitquery account setup** — create account at bitquery.io, generate Manual API key, set as Worker secret: `wrangler secret put BITQUERY_API_KEY` ✅ Done
2. **Worker `/tokens` route** — three parallel Bitquery queries → merge → filter → KV cache → return ✅ Done (worker.js updated)
6. **Client `pollTokens()`** — 60s polling, store in `cachedTokens`
7. **Agent fields** — add `solBalance`, `portfolio`, `tradeCooldown`, `tradeHistory` in `spawnAgents`
8. **`checkBuy(ag)`** — score tokens from preferred column, place trade if threshold met
9. **`checkSell(ag, addr)`** — PnL/timeout exit logic
10. **`evaluateTrades(ag, dt)`** — wire into `updateAgents` loop
11. **Trade bubble messages** — generate via Worker chat endpoint with trade context
12. **Portfolio UI panel** — render in spectate HUD
13. **Worker system prompt extension** — inject trade context into agent personality prompts

---

## Open Questions

- **TOKEN_CONTRACT** in CFG: leave empty until user deploys their own pump.fun token. When set, agents will preferentially hold/discuss it.
- **Helius webhook URL:** the Worker must be deployed and its URL known before the Helius webhook can be configured. Deploy Worker first, then set the webhook.
- **Price simulation between polls:** interpolate price using last known `priceChange5m` trend, don't hold a stale number as exact truth.
- **Fees5m approximation:** `volume5m × 0.003` is used as a proxy for pump.fun's 0.3% fee. If the token is already on Raydium (Migrated column), the fee structure differs — use total fee volume from DexScreener's `txns` field if available.
