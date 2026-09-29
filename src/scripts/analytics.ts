/**
 * 計測（仕様書 第10章 / docs/analysis/08-analytics-cv.md）
 * - dataLayer に push し、GTM 側で GA4 イベントに変換する
 * - 個人情報（フォーム入力値・学校名・塾名）は絶対に送らない
 */
export function track(event: string, params: Record<string, unknown> = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params, page_type: document.body.dataset.pageType });
}

function init() {
  // CTA / LINE / 電話のクリック
  document.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLAnchorElement>('[data-cta], [data-line], a[href^="tel:"]');
    if (!el) return;
    const text = (el.textContent ?? '').trim().slice(0, 40);
    if (el.dataset.cta) {
      track('cta_click', { cta_location: el.dataset.cta, cta_text: text, cta_variant: el.dataset.variant ?? 'default', link_url: el.getAttribute('href') });
    } else if (el.dataset.line) {
      track('line_click', { cta_location: el.dataset.line, cta_text: text });
    } else {
      track('tel_click', { cta_location: el.dataset.location ?? 'body' });
    }
  });

  // FAQ 展開
  document.addEventListener(
    'toggle',
    (e) => {
      const d = e.target as HTMLDetailsElement;
      if (d.matches?.('[data-faq]') && d.open) track('faq_open', { faq_question: d.dataset.faq });
    },
    true,
  );

  // スクロール深度 25/50/75/90
  const marks = [25, 50, 75, 90];
  const sent = new Set<number>();
  const onScroll = () => {
    const h = document.documentElement.scrollHeight - window.innerHeight;
    if (h <= 0) return;
    const pct = (window.scrollY / h) * 100;
    for (const m of marks) if (pct >= m && !sent.has(m)) { sent.add(m); track('scroll_depth', { percent_scrolled: m }); }
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  // セクション表示（50%以上・1秒以上）
  const timers = new Map<Element, number>();
  const seen = new Set<string>();
  const io = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        const id = (en.target as HTMLElement).dataset.section!;
        if (en.isIntersecting) {
          timers.set(en.target, window.setTimeout(() => {
            if (!seen.has(id)) { seen.add(id); track('section_view', { section_id: id }); }
            if (id === 'pricing') track('pricing_view', {});
          }, 1000));
        } else {
          clearTimeout(timers.get(en.target));
        }
      }
    },
    { threshold: 0.5 },
  );
  document.querySelectorAll('[data-section]').forEach((s) => io.observe(s));
}

init();
