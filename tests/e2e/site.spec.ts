import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = [
  '/', '/about/', '/services/', '/services/juku/', '/price/', '/flow/', '/consultants/', '/cases/', '/voices/',
  '/column/', '/column/switching-juku/', '/faq/', '/consultation/', '/contact/', '/company/', '/privacy/', '/terms/', '/tokushoho/',
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.setItem('compass_consent', 'granted'); } catch {} });
});

test('TOP：3秒で分かるファーストビューと主CTA', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('誰に相談していますか');
  const cta = page.locator('[data-cta="fv"]');
  await expect(cta).toBeVisible();
  await expect(cta).toHaveText(/中学受験について相談する/);
  await expect(cta).toHaveAttribute('href', '/consultation/');
  await expect(cta).toBeInViewport();
});

test('全ページ：主CTAから相談予約ページへ到達できる', async ({ page }) => {
  for (const path of PAGES.filter((p) => !p.startsWith('/consultation') && !['/privacy/', '/terms/', '/tokushoho/', '/company/', '/contact/'].includes(p))) {
    await page.goto(path);
    const count = await page.locator('a[data-cta][href^="/consultation/"]').count();
    expect(count, `${path} にCTAがない`).toBeGreaterThan(0);
  }
});

test('「無料」を表示しない（無料相談なし設定）', async ({ page }) => {
  for (const path of PAGES) {
    await page.goto(path);
    await expect(page.locator('body')).not.toContainText('無料');
  }
});

test.describe('アクセシビリティ（axe / WCAG 2.2 AA）', () => {
  for (const path of PAGES) {
    test(path, async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .exclude('mark.tbd') // staging 用の要確認ハイライトは対象外
        .analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' ')}`)).toEqual([]);
    });
  }
});

test('FAQ：質問を開閉できる', async ({ page }) => {
  await page.goto('/faq/');
  const first = page.locator('details[data-faq]').first();
  await first.locator('summary').click();
  await expect(first).toHaveAttribute('open', '');
  await expect(page.locator('details[data-faq]')).toHaveCount(30);
});

test('404 ページ', async ({ page }) => {
  const res = await page.goto('/no-such-page/');
  expect(res?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('見つかりませんでした');
});

test.describe('スマホ専用', () => {
  test.skip(({ isMobile }) => !isMobile, 'mobile only');

  test('メニューの開閉（Escで閉じる）', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /MENU/ }).click();
    const drawer = page.getByRole('dialog', { name: 'メニュー' });
    await expect(drawer).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
  });

  test('下部固定CTA：FV通過後に表示、フォームページでは出ない', async ({ page }) => {
    await page.goto('/');
    const bar = page.locator('[data-sticky-cta]');
    await expect(bar).toHaveAttribute('data-visible', 'false');
    await page.mouse.wheel(0, 1500);
    await expect(bar).toHaveAttribute('data-visible', 'true');
    await page.goto('/consultation/');
    await expect(page.locator('[data-sticky-cta]')).toHaveCount(0);
  });
});

test.describe('相談予約フォーム', () => {
  test('未入力で送るとエラー要約が出る', async ({ page }) => {
    await page.goto('/consultation/');
    await page.getByRole('button', { name: '入力内容を確認する' }).click();
    const summary = page.locator('[data-error-summary]');
    await expect(summary).toBeVisible();
    await expect(summary.locator('li')).toHaveCount(5);
  });

  test('?topic= でテーマが事前選択される', async ({ page }) => {
    await page.goto('/consultation/?topic=juku');
    await expect(page.locator('input[name="topics"][value="juku"]')).toBeChecked();
  });

  test('入力 → 確認 → 送信 → 完了（generate_lead を1回だけ送る）', async ({ page }) => {
    let posted: string | null = null;
    await page.route('**/api/consultation', async (route) => {
      posted = route.request().postData();
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    });
    await page.goto('/consultation/');
    await page.getByLabel(/保護者の方のお名前/).fill('山田 花子');
    await page.getByLabel(/メールアドレス/).fill('hanako@example.com');
    await page.locator('label.choice', { hasText: '小5' }).click();
    await page.locator('label.choice', { hasText: '塾選び・転塾' }).click();
    await page.locator('input[name="consent"]').check();
    await page.getByRole('button', { name: '入力内容を確認する' }).click();

    const confirm = page.locator('[data-confirm-list]');
    await expect(confirm).toContainText('山田 花子');
    await expect(confirm).toContainText('塾選び・転塾');
    await page.waitForTimeout(3100); // サーバ側の送信時間チェックと同じ条件
    await page.getByRole('button', { name: 'この内容で申し込む' }).click();

    await page.waitForURL('**/consultation/thanks/');
    expect(posted).toContain('hanako@example.com');
    const leads = await page.evaluate(() => (window.dataLayer ?? []).filter((e: any) => e.event === 'generate_lead'));
    expect(leads).toHaveLength(1);
    expect(JSON.stringify(leads)).not.toContain('hanako'); // 個人情報を計測に送らない
    await page.reload();
    const again = await page.evaluate(() => (window.dataLayer ?? []).filter((e: any) => e.event === 'generate_lead'));
    expect(again).toHaveLength(0);
  });

  test('送信失敗時はエラーを表示し再送できる', async ({ page }) => {
    await page.route('**/api/consultation', (route) => route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ ok: false, message: '送信できませんでした。' }) }));
    await page.goto('/consultation/');
    await page.getByLabel(/保護者の方のお名前/).fill('山田 花子');
    await page.getByLabel(/メールアドレス/).fill('hanako@example.com');
    await page.locator('label.choice', { hasText: '小4' }).click();
    await page.locator('label.choice', { hasText: '成績・勉強方法' }).click();
    await page.locator('input[name="consent"]').check();
    await page.getByRole('button', { name: '入力内容を確認する' }).click();
    await page.getByRole('button', { name: 'この内容で申し込む' }).click();
    await expect(page.locator('[data-submit-error]')).toContainText('送信できませんでした');
    await expect(page.getByRole('button', { name: 'この内容で申し込む' })).toBeEnabled();
  });
});
