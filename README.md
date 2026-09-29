# COMPASS 中学受験コンサルタント 公式Webサイト

中学受験に悩む保護者が「悩みの整理 → COMPASSの理解 → 不安解消 → 相談予約」まで迷わず進めるサイトです。
設計の根拠は [`docs/COMPASS-website-spec-v1.0.md`](docs/COMPASS-website-spec-v1.0.md)（各部署の分析は `docs/analysis/`）。

- **フレームワーク**：Astro（静的サイト生成・JSほぼゼロ）
- **ホスティング**：Cloudflare Pages（フォーム受付は Pages Functions）
- **フォーム**：自前フォーム → `/api/consultation` → Resend でメール送信（DBに個人情報を保存しない）＋ Turnstile
- **計測**：GTM → GA4（`dataLayer` イベント）、Search Console

## 開発

```bash
npm install
npm run dev            # http://localhost:4321
npm test               # 単体テスト → ビルド → コンテンツ検査 → E2E/アクセシビリティ
```

| コマンド | 内容 |
|---|---|
| `npm run check` | 型チェック（astro check） |
| `npm run test:unit` | フォーム受付処理の単体テスト（検証・スパム判定・ヘッダインジェクション・Origin） |
| `npm run check:content` | ビルド結果を検査：NG表現（合格保証・No.1 等）、「無料」表記、リンク切れ、title/description/canonical/OGP、h1、alt |
| `npm run check:release` | 上記＋【要確認】の残存・noindex・仮ドメインを**失敗**にする（本番公開判定） |
| `npm run test:e2e` | Playwright：CTA導線、フォーム（入力→確認→送信→完了）、メニュー、固定CTA、FAQ、404、axe（WCAG 2.2 AA） |
| `npm run images` | favicon PNG・OGP画像の再生成 |

## 公開前にやること（【要確認】の解消）

サイト内の **【要確認：…】** は、事業者への事実確認が済んでいない箇所です（staging では黄色でハイライト表示）。
**`npm run check:release` が通るまで本番公開しないでください。** 主な編集箇所：

| ファイル | 内容 |
|---|---|
| `src/config/site.ts` | 運営者情報、相談形式・所要時間・返信目安、**無料相談の有無（`freeConsultation`）**、中立性、LINE URL、SNS |
| `src/data/pricing.ts` | 料金・支払方法・キャンセル規定 |
| `src/data/faq.ts` | FAQ 30問の回答 |
| `src/data/consultants.ts` | 代表・コンサルタント（確認できた事実のみ）。写真は `public/` に置いてパスを指定 |
| `src/content/cases/*.md` | 支援事例（`consent: true` のもののみ公開。書式は同フォルダの README） |
| `src/content/voices/*.md` | お客様の声（同上） |
| `src/pages/privacy.astro` ほか法務ページ | 弁護士レビュー後に【要確認】を解消 |

- `freeConsultation: true` にすると、全CTAが「無料で相談してみる」系の文言に一括で切り替わります。`false` の間は「無料」という語がどこかに出るとビルド検査が失敗します。
- 支援事例・お客様の声が0件の間は、TOPの該当セクションは自動で非表示、一覧ページは noindex になります。

## コラムの追加

`src/content/columns/{slug}.md` を追加します（例は既存4記事）。frontmatter：

```yaml
title: 記事タイトル
description: 80〜120字の説明（meta description）
category: juku        # basics | juku | study | school | home-study | parents
grades: ['5年生']
publishedAt: 2026-10-01
updatedAt: 2026-11-01 # 実質的に見直したときだけ
service: juku          # 記事末で案内するサービス
author: representative
```

執筆ルール：[`docs/analysis/05-seo-content.md`](docs/analysis/05-seo-content.md) §10、表現のNG/OK：[`docs/analysis/09-legal-compliance.md`](docs/analysis/09-legal-compliance.md) §2。
> 将来、非エンジニアの方が管理画面から更新する場合は microCMS に移行します（仕様書 9-2。コンテンツ取得は `astro:content` 経由なのでページ側の変更は最小限）。

## デプロイ（Cloudflare Pages）

1. Cloudflare Pages でこのリポジトリを接続。ビルドコマンド `npm run build`、出力 `dist`
2. 環境変数（`.env.example` 参照）

   | 変数 | 用途 |
   |---|---|
   | `SITE_URL` | 本番ドメイン（canonical・OGP・sitemap） |
   | `PUBLIC_SITE_ENV` | `production` で index 許可・ハイライト非表示。プレビュー環境は未設定（＝noindex） |
   | `PUBLIC_GTM_ID` | GTM コンテナID |
   | `PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Turnstile（スパム対策） |
   | `RESEND_API_KEY` / `MAIL_FROM` / `MAIL_TO` | 通知・自動返信メール（送信ドメインに SPF/DKIM/DMARC を設定） |
   | `PUBLIC_TIMEREX_URL` | 日程調整ページ（完了ページ・自動返信に表示） |

3. WAF のレート制限ルールで `/api/*` への POST を制限（例：同一IP 10回/10分）
4. `public/_headers` の CSP は Report-Only。2週間違反がなければ `Content-Security-Policy` に切り替え

## 計測（GTM / GA4）

サイトは `dataLayer.push()` だけを行い、GA4 への送信は GTM で設定します（設計：[`docs/analysis/08-analytics-cv.md`](docs/analysis/08-analytics-cv.md)）。

| イベント | 発火 | 主なパラメータ |
|---|---|---|
| `generate_lead` ★キーイベント | 相談予約・問い合わせの送信完了（完了ページで1回だけ） | `lead_type`（booking / contact）, `consult_topic_category`, `child_grade_band` |
| `cta_click` | `data-cta` を持つリンク | `cta_location`, `cta_text`, `cta_variant`, `link_url` |
| `line_click` | `data-line` を持つリンク | `cta_location` |
| `form_start` / `form_step` / `form_error` | フォーム操作 | `form_id`, `step_number`, `error_field`（項目名のみ） |
| `faq_open` | FAQ を開いた | `faq_question` |
| `scroll_depth` | 25/50/75/90% | `percent_scrolled` |
| `section_view` / `pricing_view` | TOPの各セクション表示 | `section_id` |

全イベントに `page_type` が付きます。**入力値・氏名・メールアドレスは送信しません**（E2E テストで検証）。
同意管理：Consent Mode v2（既定：解析のみ許可・広告系は拒否）。バナーまたはフッターの「Cookieの設定」から解析を無効化できます。

Search Console：ドメインプロパティで登録し、`/sitemap-index.xml` を送信します。
