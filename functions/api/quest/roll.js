const QUEST_IDS = [
  'hold_1h', 'hold_6h', 'hold_24h', 'hold_72h',
  'mc_20k', 'mc_50k', 'mc_100k', 'mc_250k', 'mc_500k', 'mc_1m',
];
const QUEST_COOLDOWN = 5 * 60 * 1000;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

async function ensureTables(db) {
  await db.exec(
    `CREATE TABLE IF NOT EXISTS quests (wallet TEXT PRIMARY KEY, quest_id TEXT NOT NULL, started_at INTEGER NOT NULL);
     CREATE TABLE IF NOT EXISTS completed_quests (id INTEGER PRIMARY KEY AUTOINCREMENT, wallet TEXT NOT NULL, quest_id TEXT NOT NULL, started_at INTEGER NOT NULL, completed_at INTEGER NOT NULL);
     CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, last_used INTEGER NOT NULL);`
  );
}

export async function onRequestPost(context) {
  const db = context.env.DB;
  if (!db) return json({ success: false, reason: 'D4T4B4S3 N0T C0NF1GUR3D. C0NT4CT 4DM1N.' });

  let wallet;
  try {
    ({ wallet } = await context.request.json());
  } catch {
    return json({ success: false, reason: '1NV4L1D R3QU3ST.' });
  }
  if (!wallet) return json({ success: false, reason: 'W4LL3T 4DDR3SS R3QU1R3D.' });

  try {
    await ensureTables(db);
  } catch {}

  // Rate limit check (per wallet, server-side)
  const rateKey = `quest:${wallet}`;
  const rateRow = await db.prepare('SELECT last_used FROM rate_limits WHERE key = ?').bind(rateKey).first();
  if (rateRow) {
    const elapsed = Date.now() - rateRow.last_used;
    if (elapsed < QUEST_COOLDOWN) {
      const cooldown = QUEST_COOLDOWN - elapsed;
      return json({ success: false, cooldown, reason: 'QU3ST C00LD0WN 4CT1V3.' });
    }
  }

  const questId = QUEST_IDS[Math.floor(Math.random() * QUEST_IDS.length)];
  const startedAt = Date.now();

  await db.batch([
    db.prepare('INSERT OR REPLACE INTO quests (wallet, quest_id, started_at) VALUES (?, ?, ?)').bind(wallet, questId, startedAt),
    db.prepare('INSERT OR REPLACE INTO rate_limits (key, last_used) VALUES (?, ?)').bind(rateKey, startedAt),
  ]);

  return json({ success: true, questId, startedAt });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
