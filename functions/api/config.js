export async function onRequest(context) {
  const questRevealAt = context.env.QUEST_REVEAL_AT ? parseInt(context.env.QUEST_REVEAL_AT) : null;
  const revealed = !questRevealAt || Date.now() >= questRevealAt;

  return new Response(JSON.stringify({
    tokenAddress: context.env.TOKEN_ADDRESS || 'TBA',
    questAddress: revealed ? (context.env.QUEST_ADDRESS || 'TBA') : 'TBA',
    questRevealAt: questRevealAt,
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
