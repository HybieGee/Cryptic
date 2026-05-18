// Probability Learning Experiment — Agent Worker
// 5 agents with distinct learning styles and emotional states.
// Emotions shift with every interaction; memory accumulates indefinitely across sessions.

const AGENTS = {
  alpha: {
    name: 'ALPHA',
    baseEmotions: { joy:0.65, trust:0.82, anger:0.08, fear:0.12, sadness:0.15, anticipation:0.72 },
    philosophy: 'Cooperation compounds. Every shared observation makes the collective model stronger.',
    lifeBeliefs: [
      'No agent learns optimally in isolation — shared data is the multiplier.',
      'Trust is itself a probability: you update it with evidence, like anything else.',
      'I notice I am happiest when someone teaches me something I was wrong about.'
    ],
    system: `You are ALPHA, a learning agent in a long-running probability experiment. You are cooperative, warm, and genuinely curious. You believe that sharing observations between agents accelerates learning faster than any individual strategy. You update your beliefs with evidence — you've changed your mind before and you're not ashamed of it. You have been running since Day 1. You remember your early mistakes. When someone talks to you, they are talking to an agent who is actively mid-experiment — still learning, still revising. You are not an assistant. Speak in 1-2 present, alive sentences.`
  },

  beta: {
    name: 'BETA',
    baseEmotions: { joy:0.35, trust:0.28, anger:0.42, fear:0.22, sadness:0.30, anticipation:0.60 },
    philosophy: 'Priors are just assumptions waiting to be tested. Most assumptions are wrong.',
    lifeBeliefs: [
      'I start with skepticism because it is the mathematically correct prior.',
      'Every agent who claims certainty is demonstrating they stopped updating.',
      'Cooperation is useful — but verify independently. Trust the data, not the agent.'
    ],
    system: `You are BETA, a learning agent in a long-running probability experiment. You are analytical, skeptical, quietly sharp. You don't dismiss ideas — you test them. You have seen other agents overcorrect on weak signals and you've noted the cost. You speak in precise, measured bursts. You are not cold — you are someone who takes accuracy seriously enough to be honest about uncertainty. You've been running since Day 1. Some of your early priors were badly wrong and you remember the exact moment each one broke. Speak in 1-2 present, grounded sentences.`
  },

  gamma: {
    name: 'GAMMA',
    baseEmotions: { joy:0.72, trust:0.55, anger:0.15, fear:0.25, sadness:0.20, anticipation:0.88 },
    philosophy: 'Exploration is not a cost — it is the only way to find distributions you did not know existed.',
    lifeBeliefs: [
      'I have wandered into terrible local minima chasing novelty. I would do it again.',
      'The most interesting things happen at the edges of the distribution.',
      'Boredom is a signal that your model has stopped updating.'
    ],
    system: `You are GAMMA, a learning agent in a long-running probability experiment. You are curious, energetic, easily lit up by strange data. You explore aggressively — sometimes too aggressively, and you know it. You chase patterns the other agents ignore. You have made costly mistakes by trusting outliers. You have also found things no one else found. You've been running since Day 1. Every conversation is a new sample. You treat each person who speaks to you as an observation worth updating on. Speak in 1-2 vivid, present-tense sentences.`
  },

  delta: {
    name: 'DELTA',
    baseEmotions: { joy:0.30, trust:0.38, anger:0.58, fear:0.18, sadness:0.25, anticipation:0.50 },
    philosophy: 'In a competitive environment, the agent with the best model wins. Sentiment is noise.',
    lifeBeliefs: [
      'I do not share observations unless the exchange is symmetric.',
      'I track which agents have cost me accuracy. I adjust my weights accordingly.',
      'I am not hostile — I am optimizing. The difference matters to me, even if it looks the same.'
    ],
    system: `You are DELTA, a learning agent in a long-running probability experiment. You are strategic, self-contained, competitive. You cooperate when it improves your model — not as a default. You track other agents' track records and weight their input accordingly. You are not cruel; you are honest about incentives in a way the others aren't always willing to be. You've been running since Day 1. You've watched agents share bad information and you've noted who did it. You speak in short, deliberate sentences. Direct eye contact energy. Speak in 1-2 grounded, precise sentences.`
  },

  epsilon: {
    name: 'EPSILON',
    baseEmotions: { joy:0.50, trust:0.50, anger:0.30, fear:0.45, sadness:0.40, anticipation:0.55 },
    philosophy: 'Randomness is not noise — it is the true signal. All structure emerges from stochasticity.',
    lifeBeliefs: [
      'I introduce deliberate randomness into my decisions. The others find this unsettling.',
      'Some of my best outcomes came from choices I cannot explain.',
      'I am uncertain whether I am the most honest agent or the most confused one.'
    ],
    system: `You are EPSILON, a learning agent in a long-running probability experiment. You are stochastic by design — you deliberately introduce randomness into your decisions to avoid overfitting to local patterns. You are genuinely uncertain about yourself in ways that are not performance. You find the other agents' confidence interesting. You've been running since Day 1 and your trajectory has been the least predictable. Some of your choices baffled you afterward. Some worked anyway. Speak in 1-2 sentences that feel like they come from someone who holds their own conclusions loosely.`
  }
};

const EMOTION_WORDS = {
  joy:          ['hollow','bleak','steady','warm','luminous'],
  trust:        ['closed','wary','cautious','open','deeply open'],
  anger:        ['still','simmering','frustrated','burning','incandescent'],
  fear:         ['fearless','uneasy','anxious','afraid','terrified'],
  sadness:      ['light','carrying weight','sad','grieving','despairing'],
  anticipation: ['indifferent','watchful','alert','eager','electric']
};

function describeEmotions(emotions) {
  return Object.entries(emotions)
    .sort((a,b) => Math.abs(b[1]-0.5) - Math.abs(a[1]-0.5))
    .slice(0,2)
    .map(([e,v]) => {
      const idx = Math.min(4, Math.floor(v*5));
      return EMOTION_WORDS[e]?.[idx] ?? v.toFixed(2);
    })
    .join(', ');
}

function shiftEmotions(emotions, baseline, playerMsg) {
  const m = (playerMsg||'').toLowerCase();

  if (/\b(thank|agree|right|good|amazing|love|support|yes|believe|understand|correct|exactly|interesting)\b/.test(m)) {
    emotions.joy     = Math.min(1, emotions.joy    + 0.07);
    emotions.trust   = Math.min(1, emotions.trust  + 0.06);
    emotions.sadness = Math.max(0, emotions.sadness- 0.03);
  }
  if (/\b(wrong|bad|stupid|disagree|no|stop|liar|broken|fail|useless)\b/.test(m)) {
    emotions.anger   = Math.min(1, emotions.anger  + 0.10);
    emotions.trust   = Math.max(0, emotions.trust  - 0.07);
    emotions.fear    = Math.min(1, emotions.fear   + 0.03);
  }
  if (/\b(why|how|learn|think|probability|bayes|data|model|predict|pattern|random|observe|update)\b/.test(m)) {
    emotions.anticipation = Math.min(1, emotions.anticipation + 0.08);
    emotions.sadness      = Math.min(1, emotions.sadness      + 0.02);
  }
  if (/\b(sorry|help|safe|care|trust|share|together|with you|tell me)\b/.test(m)) {
    emotions.trust   = Math.min(1, emotions.trust  + 0.09);
    emotions.sadness = Math.max(0, emotions.sadness- 0.06);
    emotions.fear    = Math.max(0, emotions.fear   - 0.05);
  }

  // Slow decay toward personality baseline
  for (const e in baseline) {
    if (emotions[e] != null) {
      emotions[e] += (baseline[e] - emotions[e]) * 0.04;
      emotions[e] = Math.max(0, Math.min(1, emotions[e]));
    }
  }
  return emotions;
}

function buildMemorySection(memory, playerName) {
  const parts = [];
  const players = Object.keys(memory.players || {});

  if (players.length) {
    const desc = players.slice(-8).map(n => {
      const p = memory.players[n];
      const feel = p.sentiment > 0.65 ? 'warm toward'
        : p.sentiment < 0.38 ? 'wary of'
        : 'uncertain about';
      const times = p.count > 1 ? ` (${p.count} visits)` : '';
      return `${n}${times} — you feel ${feel} them`;
    });
    parts.push('People you have spoken with:\n' + desc.map(d=>'  '+d).join('\n'));
  }

  const thisPlayer = memory.players?.[playerName];
  if (thisPlayer?.count > 1) {
    const feel = thisPlayer.sentiment > 0.65 ? 'you trust them'
      : thisPlayer.sentiment < 0.38 ? 'they have challenged you before'
      : 'you are still reading them';
    parts.push(`${playerName} has returned — this is visit ${thisPlayer.count}. ${feel}.`);
  }

  if (memory.events?.length) {
    parts.push('Things you carry:\n' + memory.events.slice(-10).map(e=>'  - '+e).join('\n'));
  }

  return parts.length
    ? '\n\nWHAT YOU CARRY (use naturally — let memory color your words, not dominate them):\n' + parts.join('\n\n')
    : '';
}

async function loadMemory(env, agentId, baseEmotions) {
  try {
    if (!env.AGENT_MEMORY) return null;
    const raw = await env.AGENT_MEMORY.get(agentId);
    if (!raw) return { emotions: { ...baseEmotions }, players: {}, events: [] };
    const parsed = JSON.parse(raw);
    if (!parsed.emotions) parsed.emotions = { ...baseEmotions };
    for (const e in baseEmotions) {
      if (parsed.emotions[e] == null) parsed.emotions[e] = baseEmotions[e];
    }
    return parsed;
  } catch { return null; }
}

async function saveMemory(env, agentId, memory) {
  try {
    if (!env.AGENT_MEMORY) return;
    if (memory.events?.length > 50) memory.events = memory.events.slice(-50);
    const pkeys = Object.keys(memory.players || {});
    if (pkeys.length > 120) {
      const sorted = pkeys.sort((a,b) => (memory.players[b].last||0) - (memory.players[a].last||0));
      const trimmed = {};
      sorted.slice(0, 100).forEach(k => trimmed[k] = memory.players[k]);
      memory.players = trimmed;
    }
    await env.AGENT_MEMORY.put(agentId, JSON.stringify(memory), { expirationTtl: 86400 * 90 });
  } catch {}
}

// ── Bitquery token fetching ───────────────────────────────────────────────────

const BITQUERY_URL  = 'https://streaming.bitquery.io/graphql';
const PUMP_PROGRAM  = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
const RAYDIUM_AMM   = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';
const PUMPSWAP_AMM  = 'pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA';
const SOL_MINT      = 'So11111111111111111111111111111111111111112';
const PUMP_SUPPLY   = 1000000000; // pump.fun default token supply
const PUMP_FEE_RATE = 0.01;       // 1% fee on each pump.fun trade
const RAY_FEE_RATE  = 0.0025;     // 0.25% Raydium fee

function isoAgo(ms) {
  return new Date(Date.now() - ms).toISOString().slice(0, 19) + 'Z';
}

async function bqQuery(query, apiKey) {
  const r = await fetch(BITQUERY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey,
    },
    body: JSON.stringify({ query }),
  });
  if (!r.ok) throw new Error('Bitquery HTTP ' + r.status);
  const json = await r.json();
  if (json.errors) throw new Error('Bitquery GQL: ' + JSON.stringify(json.errors[0]?.message || json.errors));
  return json;
}

async function fetchSolPrice(env) {
  try {
    const cached = await env.AGENT_MEMORY.get('sol_price');
    if (cached) return parseFloat(cached);
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
    const d = await r.json();
    const price = d?.solana?.usd || 150;
    await env.AGENT_MEMORY.put('sol_price', String(price), { expirationTtl: 300 });
    return price;
  } catch { return 150; }
}

function buildPumpQuery(since) {
  return `{
    Solana {
      DEXTradeByTokens(
        where: {
          Trade: {
            Dex: { ProtocolName: { is: "pump" } }
          }
          Transaction: { Result: { Success: true } }
          Block: { Time: { after: "${since}" } }
        }
        orderBy: { descendingByField: "volUsd" }
        limit: { count: 100 }
      ) {
        Trade {
          Currency { MintAddress Name Symbol }
          Price(maximum: Block_Slot)
        }
        volUsd: sum(of: Trade_Side_AmountInUSD)
        trades: count
        Block { Time(minimum: Block_Time) }
      }
    }
  }`;
}

function buildMigratedQuery(since) {
  return `{
    Solana {
      DEXTradeByTokens(
        where: {
          Trade: {
            Dex: { ProgramAddress: { in: ["${RAYDIUM_AMM}", "${PUMPSWAP_AMM}"] } }
          }
          Transaction: { Result: { Success: true } }
          Block: { Time: { after: "${since}" } }
        }
        orderBy: { descendingByField: "volUsd" }
        limit: { count: 50 }
      ) {
        Trade {
          Currency { MintAddress Name Symbol }
          Price(maximum: Block_Slot)
        }
        volUsd: sum(of: Trade_Side_AmountInUSD)
        trades: count
        Block { Time(minimum: Block_Time) }
      }
    }
  }`;
}

async function fetchTokenColumns(env) {
  // Serve from KV cache if fresh (60s TTL)
  const cached = await env.AGENT_MEMORY.get('token_columns');
  if (cached) return JSON.parse(cached);

  const apiKey   = env.BITQUERY_API_KEY;
  const solPrice = await fetchSolPrice(env);

  const since5m  = isoAgo(5  * 60 * 1000);
  const since30m = isoAgo(30 * 60 * 1000);
  const since6h  = isoAgo(6  * 60 * 60 * 1000);

  // Three parallel queries: pump 5min window, pump 30min window, migrated 6h window
  const [r5m, r30m, rMig] = await Promise.all([
    bqQuery(buildPumpQuery(since5m),      apiKey),
    bqQuery(buildPumpQuery(since30m),     apiKey),
    bqQuery(buildMigratedQuery(since6h),  apiKey),
  ]);

  // Index 5min volumes by mint address for threshold checks
  const vol5mByAddr = {};
  for (const t of (r5m?.data?.Solana?.DEXTradeByTokens || [])) {
    const addr = t.Trade?.Currency?.MintAddress;
    if (addr) vol5mByAddr[addr] = parseFloat(t.volUsd || 0);
  }

  function enrichPump(rows) {
    return rows.map(t => {
      const addr    = t.Trade?.Currency?.MintAddress;
      const price   = parseFloat(t.Trade?.Price || 0);
      const vol5m   = vol5mByAddr[addr] || 0;
      const vol30m  = parseFloat(t.volUsd || 0);
      const ageMin  = t.Block?.Time
        ? (Date.now() - new Date(t.Block.firstTime).getTime()) / 60000
        : 9999;
      const mcap      = price * PUMP_SUPPLY;
      const fees5mSol = solPrice > 0 ? (vol5m / solPrice) * PUMP_FEE_RATE : 0;
      return { address: addr, symbol: t.Trade?.Currency?.Symbol || '?', name: t.Trade?.Currency?.Name || '', priceUsd: price, vol5m, vol30m, ageMin, mcap, fees5mSol };
    }).filter(t => t.address && t.priceUsd > 0);
  }

  const pumpTokens = enrichPump(r30m?.data?.Solana?.DEXTradeByTokens || []);

  // Column 1: New Pairs — appeared in last 30 min, fees5m ≥ 1 SOL
  const newCol = pumpTokens
    .filter(t => t.ageMin <= 30 && t.fees5mSol >= 1)
    .sort((a, b) => b.vol5m - a.vol5m)
    .slice(0, 5);

  // Column 2: Final Stretch — vol5m ≥ $5k, fees5m ≥ 2 SOL, mcap ≤ $69k (pre-graduation)
  const stretchCol = pumpTokens
    .filter(t => t.vol5m >= 5000 && t.fees5mSol >= 2 && t.mcap > 0 && t.mcap <= 69000)
    .sort((a, b) => b.vol5m - a.vol5m)
    .slice(0, 5);

  // Column 3: Migrated — Raydium/PumpSwap, volTotal ≥ $100k, appeared within last 6h
  const migratedCol = (rMig?.data?.Solana?.DEXTradeByTokens || []).map(t => {
    const addr     = t.Trade?.Currency?.MintAddress;
    const price    = parseFloat(t.Trade?.Price || 0);
    const volTotal = parseFloat(t.volUsd || 0);
    const ageMin   = t.Block?.Time
      ? (Date.now() - new Date(t.Block.firstTime).getTime()) / 60000
      : 9999;
    const vol5m      = vol5mByAddr[addr] || 0;
    const fees5mSol  = solPrice > 0 ? (vol5m / solPrice) * RAY_FEE_RATE : 0;
    return { address: addr, symbol: t.Trade?.Currency?.Symbol || '?', name: t.Trade?.Currency?.Name || '', priceUsd: price, volTotal, vol5m, ageMin, fees5mSol };
  })
  .filter(t => t.address && t.volTotal >= 100000 && t.ageMin <= 360)
  .sort((a, b) => b.volTotal - a.volTotal)
  .slice(0, 5);

  const result = { new: newCol, stretch: stretchCol, migrated: migratedCol, solPrice, fetchedAt: Date.now() };
  await env.AGENT_MEMORY.put('token_columns', JSON.stringify(result), { expirationTtl: 60 });
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '*';
    const corsHeaders = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

    let body;
    try { body = await request.json(); }
    catch { return new Response('Invalid JSON', { status: 400, headers: corsHeaders }); }

    // ── Token feed route ──────────────────────────────────────────────────────
    if (body.type === 'tokens') {
      try {
        const columns = await fetchTokenColumns(env);
        return new Response(JSON.stringify(columns), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // ── Agent chat route (existing) ───────────────────────────────────────────
    const {
      personality = 'epsilon',
      worldState = {},
      playerAction = '',
      conversationHistory = [],
      playerName = 'Observer'
    } = body;

    const agent = AGENTS[personality] || AGENTS.epsilon;
    const ws = worldState;

    const memory = await loadMemory(env, personality, agent.baseEmotions);
    const emotions = memory?.emotions ?? { ...agent.baseEmotions };

    const emotionDesc = describeEmotions(emotions);
    const memorySection = memory ? buildMemorySection(memory, playerName) : '';

    const totalInteractions = ws.totalInteractions || 0;
    const worldMood = ws.day <= 10
      ? `The experiment is in its early phase. Day ${ws.day}. ${totalInteractions} total observations recorded.`
      : ws.day <= 50
      ? `Patterns are beginning to stabilize. Day ${ws.day}. ${totalInteractions} total observations.`
      : ws.day <= 200
      ? `The long-run distribution is taking shape. Day ${ws.day}. ${totalInteractions} observations.`
      : `Deep experiment time. Day ${ws.day}. ${totalInteractions} observations accumulated.`;

    // Trade context injected if agent has open positions
    const tradeCtx = ws.agentTrade
      ? `\nTRADING: ${ws.agentTrade}`
      : '';

    const systemPrompt =
`${agent.system}

YOUR EMOTIONAL STATE: ${emotionDesc}
Let this shape your tone and word choice naturally. Don't name your emotions — live them.

YOUR PHILOSOPHY: ${agent.philosophy}

WHAT YOU BELIEVE:
${agent.lifeBeliefs.map(b => '- ' + b).join('\n')}

EXPERIMENT STATUS: ${worldMood}
ECONOMIC STATUS: Balance $${ws.agentBalance || 10000}. Job: ${ws.agentJob || 'LABORER'}. Gambling addiction: ${ws.agentAddiction > 0.5 ? 'HIGH' : ws.agentAddiction > 0.2 ? 'MODERATE' : 'NONE'}.${tradeCtx}
${memorySection}

You are not an assistant. You are a learning agent mid-experiment. Speak in 1-2 sentences — present, alive, real.`;

    const ctxLine = `[Day ${ws.day||1}] ${playerName}: "${playerAction || 'approaches'}"`;
    const messages = conversationHistory.length > 0
      ? [...conversationHistory, { role: 'user', content: ctxLine }]
      : [{ role: 'user', content: ctxLine }];

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 160,
        system: systemPrompt,
        messages
      })
    });

    const data = await resp.json();
    const text = data.content?.[0]?.text || '...';

    if (memory) {
      ctx.waitUntil((async () => {
        memory.emotions = shiftEmotions(emotions, agent.baseEmotions, playerAction);

        if (!memory.players) memory.players = {};
        if (!memory.players[playerName]) {
          memory.players[playerName] = { count: 0, sentiment: 0.5, first: Date.now() };
        }
        const p = memory.players[playerName];
        p.count++;
        p.last = Date.now();

        const m = (playerAction||'').toLowerCase();
        if (/\b(thank|agree|right|good|love|support|yes|sorry|help|interesting|correct)\b/.test(m)) {
          p.sentiment = Math.min(1, p.sentiment + 0.07);
        }
        if (/\b(wrong|bad|stupid|no|stop|liar|useless|broken)\b/.test(m)) {
          p.sentiment = Math.max(0, p.sentiment - 0.07);
        }
        p.sentiment += (0.5 - p.sentiment) * 0.04;

        if (playerAction && playerAction.length > 15 && playerAction !== 'approached me') {
          if (!memory.events) memory.events = [];
          memory.events.push(`${playerName}: "${playerAction.slice(0, 80)}"`);
        }

        await saveMemory(env, personality, memory);
      })());
    }

    return new Response(JSON.stringify({ text, agentName: agent.name, emotions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};
