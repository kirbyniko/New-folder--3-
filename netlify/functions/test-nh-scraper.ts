import type { Handler } from '@netlify/functions';

export const handler: Handler = async () => {
  console.log('🧪 Testing NH JSON fetch directly...');
  
  try {
    const url = 'https://www.gencourt.state.nh.us/house/schedule/CalendarWS.asmx/GetEvents';
    console.log('Fetching:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const text = await response.text();
    console.log('Response length:', text.length);
    console.log('Response preview:', text.substring(0, 200));
    
    // Try to parse
    let parsed = null;
    try {
      const json = JSON.parse(text);
      if (json && json.d) {
        const events = JSON.parse(json.d);
        parsed = { 
          method: 'direct',
          count: events.length,
          firstEvent: events[0]
        };
      }
    } catch {
      const match = text.match(/"d"\s*:\s*"([^"]+)"/);
      if (match) {
        const jsonString = match[1]
          .replace(/\\"/g, '"')
          .replace(/\\r/g, '\r')
          .replace(/\\n/g, '\n')
          .replace(/\\t/g, '\t');
        const events = JSON.parse(jsonString);
        parsed = {
          method: 'regex',
          count: events.length,
          firstEvent: events[0]
        };
      }
    }
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        url,
        responseStatus: response.status,
        responseLength: text.length,
        responsePreview: text.substring(0, 500),
        parsed
      }, null, 2)
    };
  } catch (error) {
    console.error('❌ Test failed:', error);
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }, null, 2)
    };
  }
};
