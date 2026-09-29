// ビルド結果（dist/）のコンテンツ品質チェック（仕様書 第11章 / docs/analysis/10-qa-plan.md）
//
//   npm run check:content   … NG表現・「無料」表記・内部リンク切れ・meta を検査（【要確認】は件数を報告のみ）
//   npm run check:release   … 上記に加え、【要確認】の残存・noindex・仮ドメインを「失敗」とする（本番公開判定用）
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const RELEASE = process.argv.includes('--release');
const DIST = 'dist';
const siteConfig = readFileSync('src/config/site.ts', 'utf8');
const FREE_CONSULTATION = /freeConsultation:\s*true/.test(siteConfig);

/** 絶対ルール 1・2・4 に反する表現（docs/analysis/04-copywriting.md §1-3, 09-legal-compliance.md §2） */
const NG = [
  '合格保証', '絶対合格', '必ず合格', '確実に合格', '100%合格', '合格率100', '逆転合格',
  'No.1', 'No1', 'ナンバーワン', '業界最高', '業界初', '日本一',
  '今すぐ申し込', '限定', '手遅れ', '最短で合格', '偏差値が必ず',
];

const files = [];
const walk = (d) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.html')) files.push(p);
  }
};
if (!existsSync(DIST)) { console.error('dist/ がありません。先に npm run build を実行してください。'); process.exit(1); }
walk(DIST);

const errors = [];
const warnings = [];
let tbdCount = 0;
const tbdPages = new Map();

const visibleText = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ');

const resolveInternal = (href) => {
  const path = href.split('#')[0].split('?')[0];
  if (!path || path === '/') return existsSync(join(DIST, 'index.html'));
  const clean = decodeURI(path).replace(/^\//, '');
  return (
    existsSync(join(DIST, clean)) && statSync(join(DIST, clean)).isFile() ||
    existsSync(join(DIST, clean, 'index.html'))
  );
};

for (const file of files) {
  const rel = '/' + relative(DIST, file).replace(/index\.html$/, '').replace(/\\/g, '/');
  const html = readFileSync(file, 'utf8');
  const text = visibleText(html);
  const head = html.slice(0, html.indexOf('</head>'));

  for (const w of NG) if (text.includes(w) || head.includes(w)) errors.push(`${rel}: NG表現「${w}」`);
  if (!FREE_CONSULTATION && (text.includes('無料') || head.includes('無料'))) {
    errors.push(`${rel}: 無料相談を実施しない設定なのに「無料」の表記があります`);
  }

  const n = (html.match(/【要確認/g) ?? []).length;
  if (n) { tbdCount += n; tbdPages.set(rel, n); }

  if (rel.startsWith('/404')) continue;
  if (!/<title>[^<]+<\/title>/.test(html)) errors.push(`${rel}: <title> がありません`);
  if (!/<meta name="description" content="[^"]+"/.test(html)) errors.push(`${rel}: meta description がありません`);
  if (!/<link rel="canonical"/.test(html)) errors.push(`${rel}: canonical がありません`);
  if (!/<meta property="og:image"/.test(html)) errors.push(`${rel}: og:image がありません`);
  const h1 = (html.match(/<h1[\s>]/g) ?? []).length;
  if (h1 !== 1) errors.push(`${rel}: h1 が ${h1} 個あります（1個にしてください）`);

  for (const m of html.matchAll(/href="(\/[^"]*)"/g)) {
    const href = m[1];
    if (href.startsWith('/api/') || href.startsWith('//')) continue;
    if (!resolveInternal(href)) errors.push(`${rel}: リンク切れ ${href}`);
  }
  for (const m of html.matchAll(/<img\b[^>]*>/g)) {
    if (!/\balt=/.test(m[0])) errors.push(`${rel}: alt のない画像 ${m[0].slice(0, 80)}`);
  }

  if (RELEASE) {
    const shouldIndex = !/(thanks|lp\/)/.test(rel);
    if (shouldIndex && /name="robots" content="noindex/.test(html) && !/^\/(cases|voices|column\/category)\//.test(rel)) {
      errors.push(`${rel}: 本番ビルドなのに noindex です（PUBLIC_SITE_ENV=production を設定してください）`);
    }
    if (/https:\/\/example\.com/.test(head)) errors.push(`${rel}: canonical/OGP が仮ドメイン（example.com）です。SITE_URL を設定してください`);
  }
}

if (tbdCount) {
  const list = [...tbdPages].sort((a, b) => b[1] - a[1]).map(([p, c]) => `    ${String(c).padStart(3)}  ${p}`).join('\n');
  const msg = `【要確認】が ${tbdCount} 箇所・${tbdPages.size} ページに残っています（src/config/site.ts などで事実確認後に置き換えてください）\n${list}`;
  (RELEASE ? errors : warnings).push(msg);
}

for (const w of warnings) console.warn(`⚠ ${w}`);
if (errors.length) {
  console.error(`\n✖ ${errors.length} 件の問題があります\n`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`✔ ${files.length} ページを検査しました（NG表現・「無料」表記・リンク・meta・h1・alt）${RELEASE ? '：本番公開可' : ''}`);
