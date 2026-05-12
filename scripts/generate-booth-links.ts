import { booths } from '../lib/booths';
import { createBoothToken } from '../lib/tokens';

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const hqToken = process.env.HQ_TOKEN;
const secret = process.env.BOOTH_TOKEN_SECRET;

if (!secret) {
  throw new Error('BOOTH_TOKEN_SECRET is required.');
}

console.log('smartyouth booth edit URLs');
console.log(`Site: ${siteUrl}`);

if (hqToken) {
  console.log(`HQ: ${siteUrl}/hq?t=${encodeURIComponent(hqToken)}`);
  console.log(`Help: ${siteUrl}/help?t=${encodeURIComponent(hqToken)}`);
} else {
  console.log('HQ_TOKEN is not set; HQ URLs skipped.');
}

for (const booth of booths) {
  const token = createBoothToken(booth.boothNo, secret);
  console.log(`${booth.boothNo}\t${booth.name}\t${siteUrl}/booth/${booth.boothNo}?t=${encodeURIComponent(token)}`);
}
