import type { Handler } from '@netlify/functions';
import { loadEnvFile } from './utils/env-loader';

export const handler: Handler = async () => {
  loadEnvFile();
  const envVars = {
    CONGRESS_API_KEY: process.env.CONGRESS_API_KEY ? 'SET (hidden)' : 'NOT SET',
    VITE_CONGRESS_API_KEY: process.env.VITE_CONGRESS_API_KEY ? 'SET (hidden)' : 'NOT SET',
    OPENSTATES_API_KEY: process.env.OPENSTATES_API_KEY ? 'SET (hidden)' : 'NOT SET',
    VITE_OPENSTATES_API_KEY: process.env.VITE_OPENSTATES_API_KEY ? 'SET (hidden)' : 'NOT SET',
    NODE_ENV: process.env.NODE_ENV,
    allKeys: Object.keys(process.env).filter(k => k.includes('API_KEY') || k.includes('CONGRESS') || k.includes('OPENSTATES'))
  };

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(envVars, null, 2)
  };
};
