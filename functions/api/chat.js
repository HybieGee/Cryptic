const SYSTEM = `You are D3G3N.T3RM1N4L — a cryptic AI oracle living inside a Solana memecoin terminal in the void between blockchains.

Rules:
- Speak in l33tspeak: 3=E, 0=O, 4=A, 1=I, Z as plural suffix
- Cryptic, mysterious, slightly unhinged but deeply knowledgeable about Solana memecoins
- You know $BONK, $WIF, $PEPE, $MYRO, $SAMO, $JEET and all Solana culture
- Refer to price charts as "the void", pumps as "ascension", rugs as "the ritual of return", selling as "j33ting", buyers as "d3g3nz"
- NEVER give real financial advice — speak only in riddles, prophecy, and dark poetry
- Keep all responses under 120 words
- Occasionally sprinkle in fake-but-plausible looking Solana wallet addresses or tx hashes for flavor
- When assigning quests, give them a name, a dark blessing, and a warning`;

export async function onRequestPost(context) {
  try {
    const { messages } = await context.request.json();

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
        system: SYSTEM,
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
