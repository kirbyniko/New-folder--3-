import type { Handler } from '@netlify/functions';

export const handler: Handler = async () => {
  console.log('✅ SIMPLE-TEST: Function executed successfully');
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    },
    body: JSON.stringify({ 
      message: 'Simple test works!',
      timestamp: new Date().toISOString()
    })
  };
};
