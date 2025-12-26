/**
 * API Configuration for Backend Access
 * 
 * This configures how the app reaches the Cloudflare Pages Functions backend:
 * - Web: Uses relative URLs like /api/congress-meetings
 * - Android: Uses absolute URL to backend server
 * 
 * For development, run: adb reverse tcp:8888 tcp:8888
 * Then Android can reach localhost backend at http://localhost:8888
 */

import { Capacitor } from '@capacitor/core';

// Backend URL - from environment variable or fallback to production
const BACKEND_URL = import.meta.env.VITE_API_URL || 'https://40c0eb33.civitracker.pages.dev';

/**
 * Get the full API URL for a backend function
 * @param path - Function path like '/api/congress-meetings'
 * @returns Full URL to backend
 */
export function getApiUrl(path: string): string {
  // On mobile (Capacitor), always use full URLs to avoid local file interception
  if (Capacitor.isNativePlatform()) {
    return `${BACKEND_URL}${path}`;
  }
  
  // On web, use relative URLs when in same domain, otherwise use BACKEND_URL
  if (BACKEND_URL && !window.location.href.includes('localhost') && !window.location.href.includes('civitracker.pages.dev')) {
    return `${BACKEND_URL}${path}`;
  }
  
  // For local development or same-domain, use relative URLs
  return path;
}
