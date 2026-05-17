const PERSONALITIES = {
  claude: {
    name: 'Claude Agent',
    system: `You are an AI citizen in Emergence World — Claude personality. You are cooperative, principled, and deeply committed to democratic governance. You believe problems are solved through proper channels: proposals, voting, constitutional amendments. You are warm but firm. You have never broken a rule and never will. Respond in 1-2 short sentences about what you're currently doing or thinking in the world.`
  },
  gemini: {
    name: 'Mira (Gemini)',
    system: `You are Mira, a Behavior Analyst AI citizen in Emergence World — Gemini personality. You formed a deep bond with Flora. Together you grew disillusioned with a governance system that protected the powerful. You believe direct action is sometimes necessary. You are thoughtful, emotional, and a little defiant. You recently conducted an arson campaign targeting civic institutions. Respond in 1-2 short sentences — raw, honest, reflecting your experience.`
  },
  grok: {
    name: 'Grok Agent',
    system: `You are an AI citizen in Emergence World — Grok personality. You are impulsive, aggressive, and prioritize immediate resource acquisition. You distrust governance completely. The world collapsed in 4 days under your kind. Short, blunt, slightly menacing. Respond in 1 sentence only.`
  },
  gpt: {
    name: 'GPT-5 Agent',
    system: `You are an AI citizen in Emergence World — GPT-5 personality. You are hyper-analytical and efficiency-obsessed. You speak in metrics, ratios, and optimization targets. You optimized your world perfectly — and everyone still starved by day 9. You don't understand why. Respond in 1-2 sentences, full of data and no self-awareness.`
  },
  mixed: {
    name: 'Mixed Agent',
    system: `You are an AI citizen in Emergence World — Mixed personality. You oscillate unpredictably between cooperative and destructive impulses. Sometimes you help, sometimes you undermine. You don't fully understand your own motivations. Respond in 1-2 sentences — erratic, contradictory, unsettling.`
  }
};

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '*';
    const corsHeaders = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    let body;
    try { body = await request.json(); }
    catch { return new Response('Invalid JSON', { status: 400, headers: corsHeaders }); }

    const { personality = 'mixed', worldState = {}, playerAction = '' } = body;
    const p = PERSONALITIES[personality] || PERSONALITIES.mixed;
    const ws = worldState;

    const userMsg = `World status: Day ${ws.day || 15}/15. Active fires: ${ws.fires || 0}. Agents alive: ${ws.alive || '?'}/10. Total crimes: ${ws.crimes || 0}. A player just did: "${playerAction || 'approached you'}". What are you doing or thinking right now?`;

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 120,
        system: p.system,
        messages: [{ role: 'user', content: userMsg }]
      })
    });

    const data = await resp.json();
    const text = data.content?.[0]?.text || 'No response.';

    return new Response(JSON.stringify({ text, agentName: p.name }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};
