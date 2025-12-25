/**
 * Environment Loader for Cloudflare Workers
 * No-op version since Cloudflare uses env bindings directly
 */

export function loadEnvFile() {
  // Cloudflare Workers use environment bindings (context.env)
  // No need to load .env files
  console.log('[ENV] Using Cloudflare environment bindings');
}

