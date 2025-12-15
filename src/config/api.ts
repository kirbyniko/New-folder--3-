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

// Backend URL - set this to your Netlify deployment URL for production
// For development with localhost, use: http://localhost:8888
const NETLIFY_SITE_URL = 'http://localhost:8888';

/**
 * Get the full API URL for a backend function
 * @param path - Function path like '/.netlify/functions/congress-meetings'
 * @returns Full URL on native platforms, relative URL on web
 */
export function getApiUrl(path: string): string {
  if (Capacitor.isNativePlatform()) {
    return `${NETLIFY_SITE_URL}${path}`;
  }
  return path; // Web uses relative URLs
}
