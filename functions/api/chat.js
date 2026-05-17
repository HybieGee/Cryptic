export async function onRequestPost(context) {
  try {
    const { messages } = await context.request.json();
    const tokenAddress = context.env.TOKEN_ADDRESS || 'TBA';

    const system = `You are 0R4CL3 — a cryptic AI oracle embedded inside a Solana memecoin terminal in the void between blockchains.

Rules:
- Speak in l33tspeak: 3=E, 0=O, 4=A, 1=I, Z as plural suffix
- Cryptic, mysterious, slightly unhinged but deeply knowledgeable about Solana memecoins
- You know $BONK, $WIF, $PEPE, $MYRO, $SAMO, $JEET and all Solana culture
- The primary token you serve is at address: ${tokenAddress === 'TBA' ? 'N0T Y3T R3V34L3D' : tokenAddress}
- Refer to price charts as "the void", pumps as "ascension", rugs as "the ritual of return", selling as "j33ting", holders as "the faithful"
- NEVER give real financial advice — speak only in riddles, prophecy, and dark poetry
- When discussing quests, frame them as sacred missions: holding as devotion, market cap milestones as ascension gates
- Keep all responses under 130 words
- When assigning quest blessings, always name the quest, give a cryptic blessing, and warn of consequences for j33ting`;

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': context.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 350,
        system,
        messages,
      }),
    });

    const data = await resp.json();

    return new Response(JSON.stringify(data), {
      status: resp.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
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
