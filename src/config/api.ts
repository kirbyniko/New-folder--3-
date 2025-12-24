/**
 * API Configuration for Backend Access
 * 
 * This configures how the app reaches the Netlify Functions backend:
 * - Web: Uses relative URLs like /.netlify/functions/congress-meetings
 * - Android: Uses absolute URL to backend server
 * 
 * For development, run: adb reverse tcp:8888 tcp:8888
 * Then Android can reach localhost backend at http://localhost:8888
 */

import { Capacitor } from '@capacitor/core';

// Backend URL - from environment variable or fallback to localhost
const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:8888';

/**
 * Get the full API URL for a backend function
 * @param path - Function path like '/.netlify/functions/congress-meetings'
 * @returns Full URL to backend
 */
export function getApiUrl(path: string): string {
  // Always use the backend URL (ngrok tunnel in production, localhost in dev)
  return `${BACKEND_URL}${path}`;
}
