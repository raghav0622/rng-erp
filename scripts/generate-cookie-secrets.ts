/**
 * Generates secure random cookie secrets for next-firebase-auth-edge.
 * Run this script and add the output to your .env file:
 *
 * npx tsx scripts/generate-cookie-secrets.ts
 */

import { randomBytes } from 'crypto';

function generateSecret(): string {
  return randomBytes(32).toString('base64');
}

console.log('# Add these to your .env file:\n');
console.log(`COOKIE_SECRET_CURRENT=${generateSecret()}`);
console.log(`COOKIE_SECRET_PREVIOUS=${generateSecret()}`);
console.log('\nNote: Keep COOKIE_SECRET_PREVIOUS for rotating secrets safely.');
