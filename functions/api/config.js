export async function onRequest(context) {
  return new Response(JSON.stringify({
    tokenAddress: context.env.TOKEN_ADDRESS || 'TBA',
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
