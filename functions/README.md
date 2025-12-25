// Cloudflare Pages Functions - API Routes
// Each file in /functions becomes an API endpoint
// Example: /functions/api/state-events.ts → https://civitracker.pages.dev/api/state-events

/**
 * MIGRATION NOTES:
 * 
 * Netlify Functions → Cloudflare Workers API differences:
 * 
 * 1. Handler signature:
 *    Netlify: export const handler = async (event) => { ... }
 *    Cloudflare: export async function onRequest(context) { ... }
 * 
 * 2. Request object:
 *    Netlify: event.queryStringParameters, event.body
 *    Cloudflare: context.request (standard Fetch API)
 * 
 * 3. Response format:
 *    Netlify: { statusCode, headers, body }
 *    Cloudflare: new Response(body, { status, headers })
 * 
 * 4. Environment variables:
 *    Netlify: process.env.VAR_NAME
 *    Cloudflare: context.env.VAR_NAME
 * 
 * 5. Imports:
 *    - Can't use Node.js-specific modules directly
 *    - Use Cloudflare Workers-compatible alternatives
 *    - Most npm packages work if they're web-compatible
 */

export {};
