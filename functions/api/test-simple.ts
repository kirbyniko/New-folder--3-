// Simple test function - no dependencies
export async function onRequest() {
  return new Response(JSON.stringify({
    status: 'ok',
    message: 'Cloudflare Pages Functions working!',
    timestamp: new Date().toISOString()
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
