// Test: Use Neon HTTP API directly without the SDK
export async function onRequest(context: any) {
  const { env } = context;
  
  try {
    // Parse DATABASE_URL to get connection info
    const dbUrl = new URL(env.DATABASE_URL.replace('postgresql://', 'https://'));
    const auth = dbUrl.username + ':' + dbUrl.password;
    
    // Use Neon's HTTP SQL API
    const response = await fetch('https://console.neon.tech/api/v2/sql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(auth)
      },
      body: JSON.stringify({
        query: 'SELECT COUNT(*) as count FROM events WHERE date >= CURRENT_DATE'
      })
    });
    
    const data = await response.json();
    
    return new Response(JSON.stringify({
      test: 'http-api',
      result: data
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({
      error: error.message,
      dbUrlExists: !!env.DATABASE_URL
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
