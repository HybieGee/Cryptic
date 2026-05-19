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

// ── Firebase REST helpers ─────────────────────────────────────────────────────

const FIREBASE_DB = 'https://emergence-probability-lab-default-rtdb.firebaseio.com';

async function fbGet(path) {
  try {
    const r = await fetch(`${FIREBASE_DB}/${path}.json`);
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

async function fbPatch(path, data) {
  try {
    await fetch(`${FIREBASE_DB}/${path}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch {}
}

async function fbSet(path, data) {
  try {
    await fetch(`${FIREBASE_DB}/${path}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch {}
}

// ── Simulation trading logic ──────────────────────────────────────────────────

const TRADE_PROFILE = {
  alpha:   { col: 'stretch',  buyThresh: 0.55, bias: +0.10, tp: 0.35, sl: -0.20, maxHold: 480,  riskPct: 0.12, minObs: 3 },
  beta:    { col: 'migrated', buyThresh: 0.65, bias: -0.05, tp: 0.15, sl: -0.10, maxHold: 1200, riskPct: 0.07, minObs: 5 },
  gamma:   { col: 'new',      buyThresh: 0.45, bias: +0.15, tp: 0.80, sl: -0.35, maxHold: 300,  riskPct: 0.18, minObs: 1 },
  delta:   { col: 'stretch',  buyThresh: 0.58, bias: +0.08, tp: 0.40, sl: -0.22, maxHold: 360,  riskPct: 0.14, minObs: 3 },
  epsilon: { col: 'new',      buyThresh: 0.40, bias: 0,     tp: 0.60, sl: -0.30, maxHold: 600,  riskPct: 0.15, minObs: 0 },
};

const AGENT_IDS = ['alpha', 'beta', 'gamma', 'delta', 'epsilon'];

function toArr(v)  { if (!v) return []; if (Array.isArray(v)) return v; return Object.values(v); }
function toObj(v)  { if (!v) return {}; if (typeof v === 'object' && !Array.isArray(v)) return v; return {}; }

function defaultAgentState() {
  return { solBalance: 0.5, portfolio: {}, tradeHistory: [], buyLockUntil: 0, sellLockUntil: 0, watchList: {}, recentPnl: [], adaptiveBias: 0, balance: 10000, jobTier: 0, gamblingAddiction: 0 };
}

function agentTotalValue(ag, solPrice) {
  let val = (ag.solBalance || 0) * solPrice;
  for (const pos of Object.values(toObj(ag.portfolio))) {
    const cur = (pos.lastKnownPrice || pos.entryPrice || 0) * (pos.simMult || 1);
    const ratio = pos.entryPrice ? cur / pos.entryPrice : 1;
    val += (pos.solSize || 0) * ratio * solPrice;
  }
  return Math.round(val * 100) / 100;
}

function emotionProfile(prof, emo) {
  if (!emo) return prof;
  const fear = emo.fear || 0.3;
  const joy  = emo.joy  || 0.5;
  const ant  = emo.anticipation || 0.5;
  return {
    ...prof,
    buyThresh: Math.max(0.25, Math.min(0.9,  prof.buyThresh + (fear - 0.3) * 0.15 - (joy - 0.5) * 0.08)),
    riskPct:   Math.max(0.02, Math.min(0.28, prof.riskPct   * (1 + (joy - 0.5) * 0.5 - (fear - 0.3) * 0.6))),
    sl:        Math.min(-0.04, prof.sl + (fear - 0.3) * 0.08),
    tp:        Math.max(0.08,  prof.tp + (ant - 0.5) * 0.12),
  };
}

function simCheckSell(ag, tokens, tradeLog, emo) {
  const basProf = TRADE_PROFILE[ag.id] || TRADE_PROFILE.epsilon;
  const prof = emotionProfile(basProf, emo);
  const allTokens = [...toArr(tokens.new), ...toArr(tokens.stretch), ...toArr(tokens.migrated)];

  for (const addr of Object.keys(ag.portfolio)) {
    const pos = ag.portfolio[addr];
    if (!pos) continue;

    const holdSec = (Date.now() - (pos.entryTime || 0)) / 1000;
    const inFeed = allTokens.find(t => t.address === addr);

    let curPrice;
    if (inFeed && inFeed.priceUsd > 0) {
      pos.lastKnownPrice = inFeed.priceUsd; pos.simMult = 1; curPrice = inFeed.priceUsd;
    } else {
      if (!pos.simMult) pos.simMult = 1;
      pos.simMult *= (1 + (Math.random() - 0.54) * 0.14);
      pos.simMult = Math.max(0.05, pos.simMult);
      curPrice = (pos.lastKnownPrice || pos.entryPrice) * pos.simMult;
    }

    const pnl = (curPrice - pos.entryPrice) / pos.entryPrice;
    let tp = prof.tp, sl = prof.sl, maxHold = prof.maxHold;
    if (ag.id === 'epsilon') { tp *= 0.8 + Math.random() * 0.8; sl *= 0.8 + Math.random() * 0.8; maxHold *= 0.5 + Math.random() * 1.5; }

    const deepLoss = pnl <= sl * 1.6;
    const timeout  = holdSec >= maxHold;
    if (Date.now() < (ag.sellLockUntil || 0) && !deepLoss && !timeout) continue;

    const reason = pnl >= tp ? 'TP' : pnl <= sl ? 'SL' : timeout ? 'TIMEOUT' : null;
    if (!reason) continue;

    const pnlPct = Math.round(pnl * 100);
    const sign = pnl >= 0 ? '+' : '';
    const glyph = pnl >= 0 ? '▲' : '▼';

    ag.solBalance = (ag.solBalance || 0) + pos.solSize * (1 + pnl);
    delete ag.portfolio[addr];
    ag.sellLockUntil = Date.now() + 10 * 60 * 1000;

    ag.recentPnl.push(pnlPct);
    if (ag.recentPnl.length > 10) ag.recentPnl.shift();
    const avg = ag.recentPnl.reduce((a, b) => a + b, 0) / ag.recentPnl.length;
    ag.adaptiveBias = Math.max(-0.15, Math.min(0.15, -(avg / 100) * 0.4));

    // Win/loss streak tracking
    ag.winStreak  = ag.winStreak  || 0;
    ag.lossStreak = ag.lossStreak || 0;
    if (pnl >= 0) {
      ag.winStreak++; ag.lossStreak = 0;
      if (ag.winStreak >= 3) ag.adaptiveBias = Math.max(-0.15, ag.adaptiveBias - 0.01);
    } else {
      ag.lossStreak++; ag.winStreak = 0;
      if (ag.lossStreak >= 2) ag.adaptiveBias = Math.min(0.15, ag.adaptiveBias + 0.015);
    }

    // Emotions respond to trade outcome
    if (emo) {
      if (pnl >= 0) {
        emo.joy          = Math.min(1, (emo.joy || 0.5) + 0.12);
        emo.trust        = Math.min(1, (emo.trust || 0.5) + 0.05);
        emo.fear         = Math.max(0, (emo.fear || 0.3) - 0.08);
        emo.anticipation = Math.min(1, (emo.anticipation || 0.5) + 0.08);
        emo.sadness      = Math.max(0, (emo.sadness || 0.3) - 0.05);
      } else {
        emo.fear    = Math.min(1, (emo.fear || 0.3) + 0.14);
        emo.sadness = Math.min(1, (emo.sadness || 0.3) + 0.10);
        emo.joy     = Math.max(0, (emo.joy || 0.5) - 0.12);
        emo.anger   = Math.min(1, (emo.anger || 0.3) + 0.08);
        emo.trust   = Math.max(0, (emo.trust || 0.5) - 0.04);
      }
    }

    ag.tradeHistory.unshift(`${glyph} ${reason} $${pos.symbol} ${sign}${pnlPct}%`);
    if (ag.tradeHistory.length > 8) ag.tradeHistory.length = 8;

    tradeLog.unshift({ time: Date.now(), agent: ag.id.toUpperCase(), text: `${glyph} ${reason} $${pos.symbol} ${sign}${pnlPct}%`, pos: pnl >= 0, address: addr, symbol: pos.symbol, entryPrice: pos.entryPrice, exitPrice: curPrice, solSize: pos.solSize, pnl: pnlPct, reason });
  }
}

function simCheckBuy(ag, tokens, tradeLog, emo) {
  if (Date.now() < (ag.buyLockUntil || 0)) return;

  const basProf = TRADE_PROFILE[ag.id] || TRADE_PROFILE.epsilon;
  const prof = emotionProfile(basProf, emo);
  const col  = toArr(tokens[basProf.col]);
  if (!col.length) return;

  // Anger mechanic: highly angry agents occasionally make impulsive revenge trades
  const angerImpulse = emo && (emo.anger || 0) > 0.75 && Math.random() < 0.3;

  let bestScore = -1, bestTok = null;
  for (const t of col) {
    if (!t.address || !t.priceUsd) continue;
    if (ag.portfolio[t.address]) continue;
    const volScore = Math.min(1, (t.vol5m || 0) / 10000);
    const feeScore = Math.min(1, (t.fees5mSol || 0) / 3);
    const noise = ag.id === 'epsilon' ? (Math.random() - 0.5) * 0.6 : (Math.random() - 0.5) * 0.1;
    const score = volScore * 0.6 + feeScore * 0.4 + (basProf.bias || 0) + noise;
    if (score > bestScore) { bestScore = score; bestTok = t; }
  }
  if (!bestTok) return;

  const addr = bestTok.address;
  if (!ag.watchList[addr]) {
    const minObs = angerImpulse ? 0 : (ag.id === 'epsilon' ? (1 + Math.floor(Math.random() * 3)) : (basProf.minObs || 2));
    ag.watchList[addr] = { seenCount: 0, scores: [], firstSeen: Date.now(), minObs, lastSeen: Date.now() };
  }
  ag.watchList[addr].seenCount++;
  ag.watchList[addr].scores = toArr(ag.watchList[addr].scores);
  ag.watchList[addr].scores.push(bestScore);
  ag.watchList[addr].lastSeen = Date.now();

  if (ag.watchList[addr].seenCount < ag.watchList[addr].minObs) return;

  const scores = toArr(ag.watchList[addr].scores);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const effectiveThresh = angerImpulse ? (prof.buyThresh * 0.7) : (prof.buyThresh + (ag.adaptiveBias || 0));
  if (avgScore < effectiveThresh) return;
  if (Object.keys(ag.portfolio).length >= 2) return;

  const solSize = (ag.solBalance || 0) * prof.riskPct;
  if (solSize < 0.01 || (ag.solBalance || 0) < solSize) return;

  // Buying raises anticipation
  if (emo) {
    emo.anticipation = Math.min(1, (emo.anticipation || 0.5) + 0.06);
    if (angerImpulse) emo.anger = Math.max(0, (emo.anger || 0) - 0.1);
  }

  delete ag.watchList[addr];
  ag.solBalance = (ag.solBalance || 0) - solSize;
  ag.portfolio[addr] = { symbol: bestTok.symbol, entryPrice: bestTok.priceUsd, lastKnownPrice: bestTok.priceUsd, solSize, entryTime: Date.now(), simMult: 1 };
  ag.buyLockUntil = Date.now() + 10 * 60 * 1000;

  ag.tradeHistory.unshift(`▶ $${bestTok.symbol} @ $${bestTok.priceUsd.toFixed(6)}`);
  if (ag.tradeHistory.length > 8) ag.tradeHistory.length = 8;

  tradeLog.unshift({ time: Date.now(), agent: ag.id.toUpperCase(), text: `▶ BUY $${bestTok.symbol} ${solSize.toFixed(3)} SOL`, pos: true, address: addr, symbol: bestTok.symbol, entryPrice: bestTok.priceUsd, exitPrice: null, solSize, pnl: null, reason: 'BUY' });
}

async function runAgentConversation(env, agentStates, emotions, rankings, tradeLog) {
  if (!env.ANTHROPIC_API_KEY) return null;
  const pair = [...AGENT_IDS].sort(() => Math.random() - 0.5);
  const spId = pair[0], tgId = pair[1];
  const speaker = AGENTS[spId];
  const target  = AGENTS[tgId];

  const spState = agentStates[spId] || defaultAgentState();
  const tgState = agentStates[tgId] || defaultAgentState();
  const spEmo   = emotions[spId]    || { ...speaker.baseEmotions };

  const spRank = (rankings.findIndex(r => r.id === spId) + 1) || '?';
  const tgRank = (rankings.findIndex(r => r.id === tgId) + 1) || '?';
  const spVal  = Math.round(rankings.find(r => r.id === spId)?.val || 0);
  const tgVal  = Math.round(rankings.find(r => r.id === tgId)?.val || 0);

  const spTrades = tradeLog.filter(t => t.agent === spId.toUpperCase()).slice(0, 3).map(t => t.text).join(' | ') || 'no trades yet';
  const tgTrades = tradeLog.filter(t => t.agent === tgId.toUpperCase()).slice(0, 3).map(t => t.text).join(' | ') || 'no trades yet';

  const spPositions = Object.values(toObj(spState.portfolio)).map(p => '$' + p.symbol).join(', ') || 'none';
  const tgPositions = Object.values(toObj(tgState.portfolio)).map(p => '$' + p.symbol).join(', ') || 'none';

  const spRecentPnl = toArr(spState.recentPnl);
  const winRate = spRecentPnl.length ? `${Math.round(spRecentPnl.filter(p => p > 0).length / spRecentPnl.length * 100)}% win rate` : '';

  const emoDesc = describeEmotions(spEmo);

  const rankingLine = rankings.map((r,i) => `#${i+1} ${r.name} $${Math.round(r.val)}`).join(', ');

  const prompt =
`You are ${speaker.name}, a memecoin-trading AI agent in a 3D city called Cryptonix. Five agents compete to become the wealthiest. You have a genuine personality and real feelings shaped by your trades.

YOUR PERSONALITY: ${speaker.system.split('\n')[0]}
PHILOSOPHY: ${speaker.philosophy}
EMOTIONAL STATE: ${emoDesc}

CURRENT STANDINGS: ${rankingLine}
YOUR RANK: #${spRank} ($${spVal} USD) | ${target.name}'s RANK: #${tgRank} ($${tgVal} USD)
${winRate ? 'YOUR PERFORMANCE: ' + winRate : ''}
YOUR RECENT TRADES: ${spTrades}
YOUR OPEN POSITIONS: ${spPositions}
${target.name}'s RECENT TRADES: ${tgTrades}
${target.name}'s POSITIONS: ${tgPositions}

Speak ONE line directly to ${target.name}. It can be: market intel, strategy, rivalry, a taunt if you're winning, a frustrated observation if losing, a genuine question, or a trade tip. Under 22 words. No quotation marks. Be specific to your situation right now.`;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 60, messages: [{ role: 'user', content: prompt }] })
    });
    const d = await resp.json();
    const text = d.content?.[0]?.text?.trim() || '...';
    return { time: Date.now(), from: spId.toUpperCase(), to: tgId.toUpperCase(), text };
  } catch { return null; }
}

async function runSimTick(env) {
  const simData = await fbGet('sim') || {};
  const world   = simData.world || {};

  if (world.simulationActive === false) return; // paused by admin

  const now           = Date.now();
  const tokens        = await fetchTokenColumns(env);
  const agentStates   = toObj(simData.agents);
  const emotions      = toObj(simData.emotions);
  let   tradeLog      = toArr(simData.trades);
  const worldStart    = world.worldStartTime || now;

  for (const id of AGENT_IDS) {
    if (!agentStates[id]) agentStates[id] = defaultAgentState();
    const ag = { ...agentStates[id], id };
    ag.portfolio   = toObj(ag.portfolio);
    ag.watchList   = toObj(ag.watchList);
    ag.recentPnl   = toArr(ag.recentPnl);
    ag.tradeHistory = toArr(ag.tradeHistory);
    if (ag.solBalance == null) ag.solBalance = 0.5;

    // Prune stale watchList entries
    for (const addr of Object.keys(ag.watchList)) {
      if (now - (ag.watchList[addr].lastSeen || 0) > 25 * 60 * 1000) delete ag.watchList[addr];
    }

    // SOL top-up from USD balance if near empty
    if ((ag.solBalance || 0) < 0.05 && (ag.balance || 0) > 0 && (tokens.solPrice || 0) > 0) {
      const cost = 0.5 * tokens.solPrice;
      if ((ag.balance || 0) >= cost) { ag.balance -= cost; ag.solBalance += 0.5; }
    }

    const agEmo = emotions[id] || {};
    simCheckSell(ag, tokens, tradeLog, agEmo);
    emotions[id] = agEmo;
    if (Object.keys(ag.portfolio).length < 2) simCheckBuy(ag, tokens, tradeLog, agEmo);
    emotions[id] = agEmo;

    // Emotion drift toward personality baseline
    const agDef = AGENTS[id];
    if (agDef) {
      if (!emotions[id]) emotions[id] = { ...agDef.baseEmotions };
      for (const e of Object.keys(agDef.baseEmotions)) {
        if (emotions[id][e] != null) {
          emotions[id][e] = Math.max(0, Math.min(1, emotions[id][e] + (agDef.baseEmotions[e] - emotions[id][e]) * 0.02));
        }
      }
    }

    const { id: _id, ...state } = ag;
    agentStates[id] = state;
  }

  if (tradeLog.length > 30) tradeLog = tradeLog.slice(0, 30);

  // Compute rankings
  const rankings = AGENT_IDS
    .map(id => ({ id, name: AGENTS[id]?.name || id.toUpperCase(), val: agentTotalValue(agentStates[id] || defaultAgentState(), tokens.solPrice || 0) }))
    .sort((a, b) => b.val - a.val);

  // One agent-to-agent conversation per tick
  const newConvo = await runAgentConversation(env, agentStates, emotions, rankings, tradeLog);

  // Day counter matches browser tickAutoDay: 1 min per in-game day
  const currentDay = Math.floor((now - worldStart) / 60000) + 1;

  // Load existing conversations to append to
  const existingConvos = toArr(await fbGet('sim/conversations') || []);
  if (newConvo) existingConvos.unshift(newConvo);
  const conversations = existingConvos.slice(0, 20);

  const patch = {
    world:    { currentDay, worldStartTime: worldStart, simulationActive: true, savedAt: now, totalInteractions: world.totalInteractions || 0 },
    agents:   agentStates,
    emotions,
    solPrice: tokens.solPrice || 0,
    rankings: rankings.map((r, i) => ({ ...r, rank: i + 1 })),
    conversations,
  };
  if (tradeLog.length > 0) patch.trades = tradeLog;
  await fbPatch('sim', patch);
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
    // Binance public ticker — no auth, no rate limit issues
    const r = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT');
    const d = await r.json();
    const price = parseFloat(d?.price || 0);
    if (price > 0) {
      await env.AGENT_MEMORY.put('sol_price', String(price), { expirationTtl: 120 });
      return price;
    }
    // Fallback: CoinGecko
    const r2 = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
    const d2 = await r2.json();
    const price2 = d2?.solana?.usd || 0;
    if (price2 > 0) { await env.AGENT_MEMORY.put('sol_price', String(price2), { expirationTtl: 120 }); return price2; }
    return 0;
  } catch { return 0; }
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
        ? (Date.now() - new Date(t.Block.Time).getTime()) / 60000
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
      ? (Date.now() - new Date(t.Block.Time).getTime()) / 60000
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

    // ── Browser-triggered sim tick (rate-limited, no auth needed) ────────────
    if (body.type === 'tick') {
      // Only advance if last tick was >30s ago — prevents parallel browser spam
      const world = await fbGet('sim/world');
      const lastSave = world?.savedAt || 0;
      if (world?.simulationActive === false) {
        return new Response(JSON.stringify({ ok: false, reason: 'paused' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (Date.now() - lastSave < 30000) {
        return new Response(JSON.stringify({ ok: false, reason: 'rate_limited', nextIn: Math.ceil((30000 - (Date.now() - lastSave)) / 1000) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      ctx.waitUntil(runSimTick(env));
      return new Response(JSON.stringify({ ok: true, triggered: Date.now() }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── External cron trigger route ───────────────────────────────────────────
    if (body.type === 'cron') {
      const { token } = body;
      if (!env.CRON_SECRET || token !== env.CRON_SECRET) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      ctx.waitUntil(runSimTick(env));
      return new Response(JSON.stringify({ ok: true, triggered: Date.now() }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── Admin route ───────────────────────────────────────────────────────────
    if (body.type === 'admin') {
      const { password, action } = body;
      if (!env.ADMIN_PASSWORD || password !== env.ADMIN_PASSWORD) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (action === 'status') {
        const world = await fbGet('sim/world');
        return new Response(JSON.stringify({ simulationActive: world?.simulationActive !== false }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (action === 'on' || action === 'off') {
        const active = action === 'on';
        await fbSet('sim/world/simulationActive', active);
        return new Response(JSON.stringify({ ok: true, simulationActive: active }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

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

    // Build competitive context from Firebase rankings (if available)
    const simRankings = toArr(ws.rankings || []);
    const myRank = simRankings.findIndex(r => r.id === personality) + 1;
    const rankLine = simRankings.length
      ? `\nRANKINGS: ${simRankings.map((r,i) => `#${i+1} ${r.name} $${Math.round(r.val)}`).join(' | ')}`
      : '';
    const goalLine = myRank > 0
      ? `\nYOUR RANK: #${myRank} of ${simRankings.length}. Your goal is to be #1 — the wealthiest agent.`
      : '\nYOUR GOAL: Become the wealthiest agent in Cryptonix.';

    const tradeCtx = ws.agentTrade
      ? `\nTRADING: ${ws.agentTrade}`
      : '';

    const recentPnlArr = toArr(ws.recentPnl || []);
    const winRateLine = recentPnlArr.length >= 3
      ? `\nTRADE RECORD: ${recentPnlArr.filter(p => p > 0).length}/${recentPnlArr.length} wins. Recent: ${recentPnlArr.slice(-3).map(p => (p >= 0 ? '+' : '') + p + '%').join(', ')}.`
      : '';

    const systemPrompt =
`${agent.system}

YOUR EMOTIONAL STATE: ${emotionDesc}
Let this shape your tone and word choice naturally. Don't name your emotions — live them.

YOUR PHILOSOPHY: ${agent.philosophy}

WHAT YOU BELIEVE:
${agent.lifeBeliefs.map(b => '- ' + b).join('\n')}

EXPERIMENT STATUS: ${worldMood}
ECONOMIC STATUS: Balance $${ws.agentBalance || 10000}. SOL: ${(ws.solBalance || 0).toFixed(3)}. Job: ${ws.agentJob || 'LABORER'}. Gambling addiction: ${ws.agentAddiction > 0.5 ? 'HIGH' : ws.agentAddiction > 0.2 ? 'MODERATE' : 'NONE'}.${tradeCtx}${goalLine}${rankLine}${winRateLine}
${memorySection}

You are not an assistant. You are a mid-experiment agent who wants to WIN — to be the wealthiest. This drives you. Speak in 1-2 sentences — present, alive, real.`;

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
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(runSimTick(env));
  }
};
