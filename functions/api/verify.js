const DURATIONS = { hold_1h: 3600000, hold_6h: 21600000, hold_24h: 86400000, hold_72h: 259200000 };
const MC_TARGETS = { mc_20k: 20000, mc_50k: 50000, mc_100k: 100000, mc_250k: 250000, mc_500k: 500000, mc_1m: 1000000 };

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

function fmtUsd(n) {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

export async function onRequestPost(context) {
  try {
    const { wallet, questId, questStarted } = await context.request.json();
    const questAddress = context.env.QUEST_ADDRESS;

    if (!questAddress || questAddress === 'TBA') {
      return json({ success: false, reason: 'QU3ST T0K3N N0T Y3T C0NF1GUR3D BY TH3 0R4CL3.' });
    }
    if (!wallet) {
      return json({ success: false, reason: 'N0 W4LL3T 4DDR3SS PR0V1D3D.' });
    }

    // Check on-chain token balance via Solana public RPC
    const rpcResp = await fetch('https://api.mainnet-beta.solana.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTokenAccountsByOwner',
        params: [wallet, { mint: questAddress }, { encoding: 'jsonParsed' }],
      }),
    });
    const rpcData = await rpcResp.json();
    const accounts = rpcData.result?.value || [];
    const balance = accounts.reduce((sum, acc) => {
      return sum + (acc.account.data.parsed.info.tokenAmount.uiAmount || 0);
    }, 0);

    if (balance <= 0) {
      return json({ success: false, reason: 'Y0U H0LD N0 QU3ST T0K3NZ. 4CQU1R3 TH3M F1RST, D3G3N.' });
    }

    // Time quest
    if (questId in DURATIONS) {
      const required = DURATIONS[questId];
      const elapsed = Date.now() - questStarted;
      if (elapsed < required) {
        const left = required - elapsed;
        const fmtLeft = left >= 3600000
          ? `${Math.ceil(left / 3600000)}H`
          : left >= 60000
          ? `${Math.ceil(left / 60000)}M`
          : `${Math.ceil(left / 1000)}S`;
        return json({ success: false, reason: `T1M3 QU3ST N0T C0MPL3T3. ${fmtLeft} R3M41N1NG. D0 N0T J33T.` });
      }
      return json({ success: true, balance });
    }

    // Market cap quest
    if (questId in MC_TARGETS) {
      const required = MC_TARGETS[questId];
      const dexResp = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${questAddress}`, {
        headers: { Accept: 'application/json' },
      });
      const dexData = await dexResp.json();
      const pair = dexData.pairs?.find(p => p.chainId === 'solana') || dexData.pairs?.[0];
      const mc = pair?.marketCap || 0;
      if (mc < required) {
        return json({
          success: false,
          reason: `M4RK3T C4P N0T TH3R3 Y3T. CURR3NT: ${fmtUsd(mc)} // T4RG3T: ${fmtUsd(required)}. H0LD. W41T.`,
        });
      }
      return json({ success: true, balance });
    }

    return json({ success: false, reason: 'UNKN0WN QU3ST TYP3. H0W D1D Y0U G3T H3R3?' });
  } catch (err) {
    return json({ success: false, reason: `3RR0R: ${err.message}` }, 500);
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
