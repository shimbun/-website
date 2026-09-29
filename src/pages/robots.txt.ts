import type { APIRoute } from 'astro';
import { IS_PRODUCTION } from '../config/site';

export const GET: APIRoute = ({ site }) => {
  const body = IS_PRODUCTION
    ? `User-agent: *\nAllow: /\nDisallow: /consultation/thanks/\nDisallow: /api/\n\nSitemap: ${new URL('/sitemap-index.xml', site).href}\n`
    : `# staging: インデックス禁止\nUser-agent: *\nDisallow: /\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
