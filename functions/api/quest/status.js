function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

export async function onRequest(context) {
  const db = context.env.DB;
  if (!db) return json({ quest: null });

  const wallet = new URL(context.request.url).searchParams.get('wallet');
  if (!wallet) return json({ quest: null });

  try {
    const row = await db.prepare('SELECT quest_id, started_at FROM quests WHERE wallet = ?').bind(wallet).first();
    return json({ quest: row ? { questId: row.quest_id, startedAt: row.started_at } : null });
  } catch {
    return json({ quest: null });
  }
}
