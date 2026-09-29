// OGP画像・PNGアイコンを Chromium で生成する（node scripts/generate-images.mjs）
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const svg = readFileSync('public/favicon.svg', 'utf8');
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage();

for (const size of [32, 180, 192, 512]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  const name = size === 180 ? 'apple-touch-icon.png' : size === 32 ? 'favicon-32.png' : `icon-${size}.png`;
  await page.screenshot({ path: `public/${name}`, omitBackground: true });
}

await page.setViewportSize({ width: 1200, height: 630 });
await page.setContent(`<!doctype html><html lang="ja"><head><meta charset="utf-8"><style>
  body{margin:0;width:1200px;height:630px;background:#1E2F4D;color:#fff;font-family:"Hiragino Mincho ProN","Noto Serif CJK JP","IPAGothic",serif;position:relative;overflow:hidden}
  .ring{position:absolute;right:-120px;top:-60px;width:620px;height:620px;border-radius:50%;border:3px solid rgba(201,168,102,.35)}
  .ring2{position:absolute;right:-40px;top:20px;width:460px;height:460px;border-radius:50%;border:1px dashed rgba(201,168,102,.35)}
  .wrap{position:absolute;left:90px;top:120px}
  .label{display:inline-block;border:1px solid #C9A866;color:#C9A866;border-radius:999px;padding:6px 22px;font:700 24px "Noto Sans CJK JP",sans-serif;letter-spacing:.12em}
  h1{font-size:66px;line-height:1.45;margin:36px 0 18px;letter-spacing:.06em}
  p{color:#C9A866;font-size:32px;margin:0;letter-spacing:.06em}
  .brand{position:absolute;left:90px;bottom:64px;font:700 28px "Noto Sans CJK JP",sans-serif;letter-spacing:.2em;color:#E8ECF2;display:flex;align-items:center;gap:16px}
</style></head><body><div class="ring"></div><div class="ring2"></div>
<div class="wrap"><span class="label">中学受験のセカンドオピニオン</span><h1>中学受験、<br>誰に相談していますか？</h1><p>塾でも家族でもない、第三者という選択肢。</p></div>
<div class="brand">${svg.replace('<svg ', '<svg width="44" height="44" ')}COMPASS 中学受験コンサルタント</div></body></html>`);
await page.screenshot({ path: 'public/og/default.png' });
await browser.close();
console.log('images generated');
