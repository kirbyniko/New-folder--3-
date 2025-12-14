import type { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  console.log('TEST-LOCAL: Handler executed!');
  console.log('Query params:', event.queryStringParameters);
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    },
    body: JSON.stringify({ test: 'success', params: event.queryStringParameters })
  };
};
