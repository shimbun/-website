# 07 技術設計書（Agent 07：Web開発部）

- 対象：COMPASS 中学受験コンサルタント Webサイト（新規制作）
- リポジトリ：`shimbun/-website`
- 版：v0.1（設計ドラフト／実装前）
- 作成日：2026-09-29
- 前提資料：`docs/00-project-brief.md`

> 本書は技術設計のみを扱い、実装コードは含みません。料金・無料枠・仕様は2026年9月時点の一般的な情報に基づく概算であり、契約前に各サービス公式サイトで必ず最新情報を確認してください（本書では「要確認」と明記）。

---

## 0. 設計方針サマリー

| 観点 | 方針 |
|---|---|
| 最重要KPI | 相談予約・問い合わせ獲得。全技術判断は「CTAまでの到達速度と離脱の少なさ」で評価する |
| 構成 | **静的サイト生成（SSG）＋ヘッドレスCMS＋エッジ関数（フォームのみ）** |
| 推奨スタック | **Astro ＋ microCMS ＋ Cloudflare（Pages／Workers）＋ Turnstile ＋ TimeRex ＋ GTM/GA4** |
| 運用 | 非エンジニアはCMS管理画面だけで更新。公開ボタン → Webhook → 自動ビルド → 数分で反映 |
| 保守負担 | サーバ・DB・プラグイン更新が不要な構成にし、セキュリティ保守コストを最小化 |
| 月額目安 | 0〜6,000円程度（CMSプラン次第）＋ドメイン代＋予約ツール代 |

---

## 1. 技術選定の比較

### 1.1 候補一覧

| 案 | 構成 | 長所 | 短所 | 初期開発 | 月額運用コスト目安 |
|---|---|---|---|---|---|
| **A. Astro ＋ microCMS**（推奨） | 静的生成＋国産ヘッドレスCMS | 表示が最速クラス（JSほぼゼロ）／管理画面が日本語で非エンジニアに優しい／サーバ保守不要／セキュリティ面の攻撃面が小さい／SEO制御が自由 | 開発にエンジニアが必要／CMSのAPI数・メンバー数制限でプラン選定が必要／プレビュー機能は別途実装 | 中 | microCMS：無料（Hobby）〜数千円/月（要確認）＋ホスティング0円 |
| A'. Astro ＋ Decap CMS / Sveltia CMS | 静的生成＋Gitベースの無料CMS | CMS費用0円／コンテンツがGitに残り移行容易／ベンダーロックインなし | 編集者にGitHubアカウントが必要／OAuth設定が必要／画像管理・UIがmicroCMSより素朴／日本語UIは限定的 | 中 | 0円 |
| A''. Astro ＋ Sanity / Contentful | 静的生成＋海外ヘッドレスCMS | 高機能（リアルタイムプレビュー、柔軟なスキーマ） | 管理画面が英語中心／小規模事業にはオーバースペック／従量課金 | 中〜高 | 0円〜（要確認） |
| A'''. Astro ＋ Newt | 静的生成＋国産ヘッドレスCMS | 日本語UI、Astroとの相性良 | サービス提供状況・継続性を要確認（採用前に公式発表を必ず確認） | 中 | 要確認 |
| B. Next.js ＋ ヘッドレスCMS | React SSR/SSG/ISR | 大規模・会員機能・動的機能への拡張性／ISRで即時反映 | 本件の規模には過剰／クライアントJSが増えやすくLCP/INPで不利／保守（依存更新）負担が大きい | 高 | 0円〜（Vercel商用利用は有料プランが原則：要確認） |
| C. WordPress | PHP＋MySQL | 知名度が高く更新担当者が慣れている可能性／プラグイン豊富 | 本体・テーマ・プラグイン更新と脆弱性対応が常時必要／表示速度チューニングが必要／ホスティング費用が継続発生／プラグイン依存で品質がぶれる | 中 | サーバ1,000〜3,000円＋保守（外注なら月1〜3万円程度） |
| D. Studio / Wix / ペライチ等ノーコード | SaaS型 | エンジニア不要でデザイン変更まで可能／開発期間短い | 構造化データ・CSP・細かなSEO制御に制約／フォームや予約の自由度が低い／パフォーマンス上限がSaaS依存／移行時の持ち出しが困難 | 低 | 1,000〜4,000円程度＋有料プラン（要確認） |

### 1.2 評価マトリクス（5点満点）

| 観点（重み） | A Astro+microCMS | A' Astro+Decap | B Next.js | C WordPress | D Studio等 |
|---|---|---|---|---|---|
| 表示速度・CWV（×3） | 5 | 5 | 4 | 3 | 3 |
| SEO制御（×3） | 5 | 5 | 5 | 4 | 3 |
| 非エンジニアの更新しやすさ（×3） | 5 | 3 | 5 | 5 | 5 |
| セキュリティ・保守負担の少なさ（×3） | 5 | 5 | 4 | 2 | 4 |
| 運用コスト（×2） | 4 | 5 | 3 | 3 | 3 |
| 拡張性（フォーム・予約・LINE）（×2） | 5 | 5 | 5 | 4 | 3 |
| 移行容易性・ロックイン回避（×1） | 4 | 5 | 4 | 3 | 1 |
| **加重合計** | **80** | **76** | **73** | **62** | **61** |

### 1.3 推奨案と理由

**推奨：A. Astro ＋ microCMS ＋ Cloudflare**

1. **速度＝相談率**：スマホ最優先のため、JSを必要最小限にできるAstroの「アイランドアーキテクチャ」が最適。FVのCTAが即座に表示・操作可能になる。
2. **非エンジニア運用**：microCMSは日本語UI、リッチエディタ、画像アップロード、下書き・予約公開、権限管理を備え、コラム・事例・声・FAQの更新がWordPressに近い感覚で可能。
3. **保守コスト最小**：公開物は静的ファイルのみ。DB・PHP・プラグインの脆弱性対応が不要。
4. **ブランド品質**：デザインをテンプレートに縛られず、「信頼・誠実・高品質」のトーンを細部まで実装できる。
5. **将来性**：コンテンツはAPIで取得するため、将来フロントを差し替えてもCMSデータは流用可能。

**代替案**：CMS費用を完全に0円にしたい、かつ更新担当者がGitHubアカウント運用に抵抗がない場合は **A'（Astro＋Sveltia CMS/Decap CMS）**。フロント側コードは共通化できるよう、CMS取得層を抽象化（`src/lib/cms/`）しておく。

**microCMS プラン選定の注意**：無料プランはAPI数・メンバー数・転送量に上限がある（要確認）。本設計のコンテンツモデルは6〜8API必要なため、以下のいずれかで対応する。
- (a) 有料プラン（Team等）を契約する（推奨：予約公開・権限・プレビュー等の運用機能も充実）
- (b) 無料枠に収めるため「お知らせ」をコラムのカテゴリに統合、「コンサルタント」「FAQ」をオブジェクト形式や1つの「汎用コンテンツ」APIに統合する（運用の分かりやすさは低下）

---

## 2. ホスティング比較と推奨

| 項目 | **Cloudflare Pages / Workers**（推奨） | Vercel | Netlify |
|---|---|---|---|
| 無料枠 | 帯域無制限、ビルド回数上限あり（要確認）。**商用利用可** | Hobbyは**非商用のみ**（商用はPro：約20USD/人/月、要確認） | 無料枠あり（帯域・ビルド時間に上限、要確認） |
| 日本での速度 | 国内に多数のエッジ拠点、非常に高速 | 高速 | 高速（無料枠は拠点制限の可能性） |
| サーバレス関数 | Workers / Pages Functions（無料枠大） | Functions | Functions |
| フォーム | Workersで自前実装＋Turnstile（同社製）と親和性高 | 自前実装 | Netlify Forms（簡易、無料枠あり） |
| セキュリティ | WAF・DDoS防御・Bot対策標準、`_headers`でヘッダー設定 | `vercel.json`でヘッダー設定 | `_headers`でヘッダー設定 |
| DNS | Cloudflare DNSと統合（ドメイン移管／ネームサーバ変更で最適化） | 外部DNS可 | 外部DNS可 |
| Astro対応 | 公式アダプタあり | 公式アダプタあり | 公式アダプタあり |

**推奨：Cloudflare**
- 商用利用で0円運用が可能、Turnstile・WAF・Email Routingまで同一ダッシュボードで完結。
- 注：Cloudflareは静的サイトのホスティングを Pages から Workers（Static Assets）へ統合する方向にあるため、構築時点の公式推奨方式に従う（どちらでも本設計は成立）。
- CMS更新時の再ビルド：microCMSのWebhook → Cloudflareのデプロイフック（Deploy Hook）を叩いて自動ビルド。
- ビルドは GitHub 連携（`main` ブランチ push で本番、PRごとにプレビューURL自動生成）。

---

## 3. CMS設計（コンテンツモデル）

### 3.1 API一覧

| API ID | 名称 | 形式 | 主な表示先 |
|---|---|---|---|
| `columns` | コラム | リスト | /column/, /column/[slug]/, TOP |
| `column-categories` | コラムカテゴリ | リスト | コラム一覧フィルタ・パンくず |
| `cases` | 支援事例 | リスト | /cases/, /cases/[slug]/, TOP |
| `voices` | お客様の声 | リスト | /voice/, TOP, サービス詳細 |
| `faqs` | FAQ | リスト | /faq/, TOP, サービス詳細 |
| `consultants` | コンサルタント | リスト | /consultant/, 事例・コラム著者 |
| `news` | お知らせ | リスト | /news/, TOP |
| `site-settings` | サイト共通設定 | オブジェクト | 全ページ（CTA文言、LINE URL、予約URL、料金表示等） |

> 「サービス」「料金」は変更頻度が低く、表現の審査（誇大表現チェック）が必要なため、初期はコード管理（Markdown/Astroファイル）とする。更新頻度が高いと判明した場合にCMS化する。

### 3.2 共通フィールド（全リスト型API）

| フィールドID | 表示名 | 型 | 必須 | 備考 |
|---|---|---|---|---|
| `slug` | URLスラッグ | テキスト | ○ | 半角英数・ハイフン。未入力時はcontentIdを使用 |
| `seoTitle` | SEOタイトル | テキスト | | 未入力時は`title`を使用（32文字目安） |
| `seoDescription` | メタディスクリプション | テキストエリア | | 未入力時は本文先頭120字を自動抽出 |
| `ogImage` | OGP画像 | 画像 | | 1200×630。未入力時はサイト共通OGP |
| `noindex` | 検索除外 | 真偽値 | | 既定false |
| （システム） | 公開日・更新日 | 自動 | | `publishedAt` / `revisedAt` を構造化データに使用 |

### 3.3 コラム `columns`

| フィールドID | 表示名 | 型 | 必須 | 備考 |
|---|---|---|---|---|
| `title` | タイトル | テキスト | ○ | 40字以内推奨 |
| `lead` | リード文 | テキストエリア | ○ | 一覧・OGP説明に使用、120字 |
| `eyecatch` | アイキャッチ | 画像 | ○ | 16:9、altは`eyecatchAlt`で必須入力 |
| `eyecatchAlt` | 画像の代替テキスト | テキスト | ○ | アクセシビリティ |
| `category` | カテゴリ | コンテンツ参照（column-categories） | ○ | 例：塾選び／志望校選び／成績・学習法／家庭学習／模試・過去問／保護者の悩み |
| `tags` | タグ | 複数選択 | | 学年（年長〜小6）、テーマ |
| `body` | 本文 | リッチエディタ | ○ | 見出しはh2〜h4のみ許可。目次を自動生成 |
| `author` | 執筆・監修者 | コンテンツ参照（consultants） | ○ | E-E-A-T対策。記事末に著者ボックス表示 |
| `relatedColumns` | 関連コラム | 複数コンテンツ参照 | | 未設定時は同カテゴリから自動 |
| `relatedService` | 関連サービス | セレクト | | 記事末CTAの出し分け（戦略相談／成績学習相談…） |
| `showCta` | 記事内CTA表示 | 真偽値 | | 既定true |

### 3.4 コラムカテゴリ `column-categories`

| フィールドID | 表示名 | 型 | 必須 |
|---|---|---|---|
| `name` | カテゴリ名 | テキスト | ○ |
| `slug` | スラッグ | テキスト | ○ |
| `description` | 説明 | テキストエリア | |
| `order` | 表示順 | 数値 | |

### 3.5 支援事例 `cases`（課題→分析→提案→実行→結果）

| フィールドID | 表示名 | 型 | 必須 | 備考 |
|---|---|---|---|---|
| `title` | 事例タイトル | テキスト | ○ | 例：「塾の授業についていけず転塾を迷っていた小5のご家庭」 |
| `summary` | 概要 | テキストエリア | ○ | 一覧用 |
| `grade` | 相談時の学年 | セレクト | ○ | 年長〜小6 |
| `themes` | 相談テーマ | 複数選択 | ○ | 塾選び・転塾／志望校・併願校／成績・学習法／家庭学習／継続コンサル 等 |
| `service` | 利用サービス | セレクト | ○ | |
| `period` | 支援期間 | テキスト | | 例：「3か月」 |
| `challenge` | 課題 | リッチエディタ | ○ | |
| `analysis` | 分析 | リッチエディタ | ○ | |
| `proposal` | 提案 | リッチエディタ | ○ | |
| `action` | 実行 | リッチエディタ | ○ | |
| `result` | 結果 | リッチエディタ | ○ | 合否ではなく「状況の変化」を中心に記述 |
| `consultantComment` | 担当コンサルタントより | テキストエリア | | |
| `consultant` | 担当者 | コンテンツ参照（consultants） | | |
| `consentConfirmed` | 掲載許諾取得済み | 真偽値 | ○ | **trueでないとビルド時に除外**（事実性・許諾の担保） |
| `anonymized` | 個人特定情報を除去済み | 真偽値 | ○ | 同上 |
| `disclaimer` | 注記 | テキスト | | 既定：「個人が特定されないよう一部内容を変更しています。成果を保証するものではありません。」 |

### 3.6 お客様の声 `voices`

| フィールドID | 表示名 | 型 | 必須 | 備考 |
|---|---|---|---|---|
| `headline` | 見出し | テキスト | ○ | ご本人の言葉から抜粋 |
| `body` | 本文 | テキストエリア | ○ | 原文尊重、誇張編集禁止 |
| `attribute` | 属性表示 | テキスト | ○ | 例：「小5男子の保護者（東京都）」 |
| `grade` | 学年 | セレクト | | |
| `service` | 利用サービス | セレクト | | |
| `receivedAt` | 回答日 | 日付 | ○ | |
| `featured` | TOP掲載 | 真偽値 | | |
| `consentConfirmed` | 掲載許諾取得済み | 真偽値 | ○ | falseはビルド除外 |

> 構造化データ `Review` / `AggregateRating` は、自社サイト上の自己評価に対してGoogleのリッチリザルト対象外かつガイドライン違反リスクがあるため**付与しない**。

### 3.7 FAQ `faqs`

| フィールドID | 表示名 | 型 | 必須 | 備考 |
|---|---|---|---|---|
| `question` | 質問 | テキスト | ○ | |
| `answer` | 回答 | リッチエディタ（簡易） | ○ | |
| `category` | 分類 | セレクト | ○ | サービスについて／料金・お支払い／相談の進め方／オンライン相談／塾・家庭教師との関係／個人情報・その他 |
| `order` | 表示順 | 数値 | ○ | |
| `showOnTop` | TOP掲載 | 真偽値 | | TOPは5〜6問 |
| `relatedServices` | 関連サービス | 複数選択 | | サービス詳細ページに出し分け |

### 3.8 コンサルタント `consultants`

| フィールドID | 表示名 | 型 | 必須 | 備考 |
|---|---|---|---|---|
| `name` | 氏名 | テキスト | ○ | |
| `nameKana` / `nameEn` | ふりがな／英字 | テキスト | | |
| `role` | 肩書き | テキスト | ○ | |
| `photo` / `photoAlt` | 写真／代替テキスト | 画像／テキスト | ○ | |
| `message` | メッセージ | テキストエリア | ○ | |
| `profile` | 経歴 | リッチエディタ | ○ | **事実のみ記載**（年数・経歴は根拠確認済みのもの） |
| `specialties` | 得意領域 | 複数選択 | | |
| `qualifications` | 資格・実績 | 繰り返しフィールド | | 項目＋補足。検証可能な事実のみ |
| `order` | 表示順 | 数値 | | |
| `sns` | 外部リンク | 繰り返し | | `sameAs`に使用 |

### 3.9 お知らせ `news`

| フィールドID | 表示名 | 型 | 必須 |
|---|---|---|---|
| `title` | タイトル | テキスト | ○ |
| `type` | 種別 | セレクト（お知らせ／メディア掲載／セミナー／休業案内） | ○ |
| `body` | 本文 | リッチエディタ | ○ |
| `externalUrl` | 外部リンク | テキスト | |
| `pinned` | 固定表示 | 真偽値 | |

### 3.10 サイト共通設定 `site-settings`（オブジェクト）

| フィールドID | 用途 |
|---|---|
| `ctaPrimaryLabel` | 統一CTA文言（例：「中学受験について相談する」）※無料相談を実施しない限り「無料」は使用不可 |
| `ctaSubLabel` | CTA補足（例：「オンライン対応・全国から相談可」）※事実のみ |
| `bookingUrl` | 予約ツールURL（TimeRex等） |
| `lineAddFriendUrl` / `lineQrImage` | LINE友だち追加URL／QR |
| `businessHours` / `phone` / `email` | 連絡先（公開する場合のみ） |
| `announcementBar` | 全ページ上部の告知（任意、期間指定） |

### 3.11 運用ルール（CMS側）

- 権限：「編集者（下書き作成）」「公開者（公開権限）」を分け、事例・声は公開前に代表者承認（ダブルチェック）を推奨。
- 画像：アップロード上限（例：長辺2400px/2MB）をマニュアル化。配信時は自動で最適化（§9）。
- 下書きプレビュー：microCMSの画面プレビュー機能 → Cloudflare上のプレビュー用エンドポイント（SSR、`noindex`・Basic認証付き）で表示。
- 公開反映：公開・更新・削除時にWebhookで自動ビルド（2〜5分で反映）。予約公開にも対応。
- 表現チェックリスト（「絶対合格」等NGワード）を管理画面の入力説明欄に記載。

---

## 4. フォーム設計（相談予約・問い合わせ）

### 4.1 送信方式の比較

| 方式 | 長所 | 短所 | 月額 | 評価 |
|---|---|---|---|---|
| **Cloudflare Workers ＋ メールAPI（Resend / SendGrid / Amazon SES 等）＋ Turnstile**（推奨） | デザイン・項目・バリデーション完全自由／自動返信を独自ドメインから送信／データを第三者フォームSaaSに保存しない／GA4計測が正確 | 開発工数が中程度／メール到達率のためSPF・DKIM・DMARC設定が必要 | 0円〜（メールAPIの無料枠内、要確認） | ◎ |
| Formspree / Formrun / SSGform 等のフォームSaaS | 実装が早い／管理画面で履歴確認 | 無料枠の送信数制限／自動返信・項目の自由度はプラン依存／個人情報を第三者に預ける（委託先として明記要） | 0〜数千円 | ○（短納期時の代替） |
| Googleフォーム埋め込み | 無料・簡単 | デザイン不統一でブランド毀損／スマホUX低下／計測困難／信頼感低下 | 0円 | △（非推奨） |
| 予約ツールのフォームのみ（TimeRex等の質問項目） | 1ステップで完結 | 詳細ヒアリング項目に制約、ブランド表現に制約 | ツール料金 | ○（§5で併用） |

**推奨**：自前フォーム（Astroページ）＋ Cloudflare Workers（受付API）＋ Turnstile ＋ メール送信API。
- 通知メール（運営宛）と自動返信メール（相談者宛）を送信。
- 受付データの保管：原則メールのみ（DBに保持しない＝漏えいリスク最小）。案件管理が必要になれば、Googleスプレッドシート（サービスアカウント経由）またはCRMへの転送を追加検討。

### 4.2 フォーム項目（相談予約フォーム）

| 項目 | 型 | 必須 | 備考 |
|---|---|---|---|
| 保護者氏名 | text | ○ | `autocomplete="name"` |
| ふりがな | text | ○ | |
| メールアドレス | email | ○ | `autocomplete="email"`、確認用再入力は設けない（入力負担軽減、代わりに送信前確認画面で表示） |
| 電話番号 | tel | 任意 | `autocomplete="tel"`、`inputmode="tel"` |
| お子さまの学年 | select | ○ | 未就学／小1〜小6／その他 |
| 通塾状況 | select | 任意 | 通塾中（塾名任意）／未通塾／検討中 |
| ご相談テーマ | checkbox（複数） | ○ | 塾選び・転塾／志望校・併願校／成績・勉強法／家庭学習・学習計画／模試・過去問／受験するか迷っている／その他 |
| ご相談内容 | textarea | 任意 | 1,000字上限、プレースホルダで記入例 |
| 希望の相談方法 | radio | ○ | オンライン（Zoom等）／対面（実施する場合のみ）※事業形態により決定 |
| 連絡希望手段 | radio | 任意 | メール／電話／LINE |
| 当サイトを知ったきっかけ | select | 任意 | 検索／SNS／紹介／その他 |
| プライバシーポリシー同意 | checkbox | ○ | リンク付き。未同意では送信不可 |
| （hidden）流入情報 | hidden | | `utm_*`、ランディングページ、CTA設置位置（自動付与、個人情報ではない） |

- 画面構成：入力 → 確認 → 完了（完了ページは `/contact/thanks/`、GA4のコンバージョン計測用）。スマホで1画面スクロールに収まるよう、任意項目は「詳しく書く（任意）」で折りたたみも検討。
- 入力中の離脱防止：`sessionStorage` に一時保存（送信完了時に削除、個人情報のため`localStorage`は使わない）。

### 4.3 スパム対策（多層防御）

1. **Cloudflare Turnstile**（非表示／マネージドモード。reCAPTCHAより軽量、画像選択なし） → Worker側で必ずトークン検証。
2. ハニーポット項目（視覚的・支援技術から隠した空欄項目）。
3. 送信所要時間チェック（表示から3秒未満の送信は破棄）。
4. レート制限（同一IPで一定回数/時間を超えたら拒否：Cloudflare WAFのレートリミットルールまたはWorker側で実装）。
5. サーバ側バリデーション（全項目の型・長さ・形式を再検証、URL大量含有の本文は保留扱い）。
6. `Origin` / `Referer` ヘッダー検証（自ドメイン以外からのPOSTを拒否）。

### 4.4 自動返信メール

- 送信元：`no-reply@（独自ドメイン）` または `info@`（返信受付の可否で決定）。
- ドメイン認証：SPF・DKIM・DMARC（p=none から開始 → 運用確認後 quarantine）を必須設定。
- 本文構成：受付御礼／受付内容の控え（相談内容本文は要約せずそのまま）／今後の流れ（「◯営業日以内にご連絡」※運用可能な日数を事業者に確認）／日程調整リンク（§5の2段階案）／LINE案内／問い合わせ先／特商法上の事業者名・所在地（必要範囲）／「本メールに心当たりがない場合」の案内。
- 運営通知メール：件名に `[相談予約] 小5 / 塾選び・転塾` のように要点を入れ、見落としを防ぐ。

### 4.5 個人情報の取り扱い

- 通信：全ページHTTPS、HSTS有効化。
- 保存最小化：Worker・ログに個人情報を残さない（`console.log`禁止ルール、エラーログは項目名のみ）。
- 委託先の明記：メール送信API事業者、予約ツール、ホスティング（Cloudflare）をプライバシーポリシーに記載。海外事業者への提供に該当する場合は個人情報保護法に基づく情報提供（所在国・保護措置）を記載。
- 利用目的：相談対応・日程調整・サービス案内に限定し、フォーム直下に要約表示。
- 未成年情報：お子さまの氏名は取得しない（学年のみ）。
- 保管期間：メールボックス内の保管期間を社内ルール化（例：成約しない場合◯年で削除）。
- 開示・削除請求窓口をプライバシーポリシーに明記。

---

## 5. 予約システム連携

### 5.1 ツール比較

| ツール | 長所 | 短所 | 料金目安 |
|---|---|---|---|
| **TimeRex**（推奨） | 国産・日本語UI／Googleカレンダー・Outlook連携／Zoom・Google Meet URL自動発行／質問項目設定可／Webサイト埋め込み可／予約完了後のリダイレクト（有料プラン、要確認） | 高度な機能は有料 | 無料〜数千円/月（要確認） |
| Calendly | 世界標準・高機能／GA4連携 | UIの一部が英語／日本の保護者にはなじみが薄い／日本語表記の細部 | 無料〜（要確認） |
| Googleカレンダー予約スケジュール | Google Workspace利用なら追加費用なし／シンプル | デザイン・質問項目の自由度が低い／計測が困難／無料アカウントでは機能制限 | Workspace料金に含む（要確認） |
| Spir / Jicoo 等 | 国産・チーム調整に強い | 比較検討要 | 要確認 |

### 5.2 導線案

**案1：フォーム → 日程調整の2段階（推奨）**

```
[CTA] → /contact/（相談予約フォーム：お悩み・学年等をヒアリング）
      → 送信 → /contact/thanks/（完了ページ）
             ├─ 画面上に「続けて日程を選ぶ」ボタン（TimeRex、氏名・メールをURLパラメータで事前入力 ※対応可否要確認）
             └─ 自動返信メールにも同じ日程調整リンクを記載
      → TimeRexで日時確定 → 確定メール（オンライン会議URL付き）
      → 前日リマインド（TimeRex機能）
```

- 長所：相談内容を事前に把握でき、相談品質が上がる。日程調整まで進まなかった場合も「問い合わせ」としてリードが残り、運営側から個別フォローできる。
- 短所：ステップが1つ増える → 完了ページで日程調整を強く誘導し、離脱を計測（`booking_start` / `booking_complete`）して改善する。

**案2：日程調整を先に（1段階）**

```
[CTA] → /reserve/（TimeRex埋め込み。質問項目で学年・テーマを取得）→ 確定
```

- 長所：最短で予約確定。
- 短所：ヒアリング項目が限定的、ブランド表現の自由度が低い。

**運用提案**：両方を用意し、CTAの主導線は案1、「すでに相談内容が決まっている方」「2回目以降の方」向けに案2の直接予約リンクを併設。3か月後にGA4データで比較し最適化。

### 5.3 計測

- TimeRex予約完了後のリダイレクト先を `/reserve/complete/` に設定できるプランならそれを用いてGA4で `booking_complete` を計測。不可の場合は、iframe埋め込みのpostMessageイベント（提供有無要確認）または予約ツール側の予約件数を月次で突き合わせ。

---

## 6. LINE公式アカウント連携

### 6.1 設置方針

| 設置場所 | 形式 | 目的 |
|---|---|---|
| ヘッダー（スマホ：固定フッターCTAバー内の副ボタン） | 「LINEで相談する」ボタン | 気軽な接点 |
| TOP最終CTA・各サービス末尾 | 相談予約（主）＋LINE（副）の2ボタン | 主導線を相談予約に保ちつつ受け皿を増やす |
| コラム記事末 | LINE登録で「中学受験の相談チェックリスト」等（配布物は事実・内容確定後） | 未検討層の育成 |
| 完了ページ・自動返信メール | 友だち追加案内 | 相談後の連絡手段 |

- **デバイス出し分け**：スマホ＝友だち追加URL（`https://lin.ee/xxxx` または `https://line.me/R/ti/p/@xxxx`）でアプリ起動。PC＝QRコード画像＋ID表示（モーダルまたはインライン）。
- 公式の友だち追加ボタン画像・ガイドラインに準拠（ロゴの改変禁止）。
- 画像は`site-settings`で差し替え可能に。

### 6.2 計測パラメータ

- LINEアプリ内にUTMは引き継げないため、**サイト側でクリックを計測**：GA4イベント `line_click`（パラメータ：`cta_position`＝header/fv/footer/column_end/thanks、`page_type`、`device`）。
- LINE公式アカウントの「友だち追加経路」分析で、Web経由（URL/ボタン）・QRの比率を確認。設置位置別に友だち追加URLを分けられる機能がある場合は位置別URLを発行（要確認）。
- LINEから自サイトへ誘導するリッチメニュー・配信URLには `utm_source=line&utm_medium=social|message&utm_campaign=（配信名）` を付与するルールを定める。
- 将来：LINE上での予約・自動応答が必要になった場合、Messaging API＋外部ツール（Lステップ等）を検討（本フェーズでは対象外）。

---

## 7. GA4 / GTM / Search Console・同意管理

### 7.1 構成

- **GTM（Google タグ マネージャー）** 経由でGA4を配信（コード改修なしでタグ追加可能にするため）。GTMは`<head>`上部に非同期で読み込み、パフォーマンス影響を最小化。
- dataLayer 設計（サイト側でpushするイベント）：

| イベント名 | 発火条件 | 主なパラメータ | キーイベント（CV） |
|---|---|---|---|
| `cta_click` | 相談CTAクリック | `cta_position`, `cta_label`, `page_type` | |
| `form_start` | フォーム初回入力 | `form_id` | |
| `form_confirm` | 確認画面表示 | `form_id` | |
| `generate_lead` | 送信完了（thanks表示） | `form_id`, `consult_theme`, `grade` ※個人情報は送らない | ◎ |
| `booking_start` | 日程調整ボタンクリック | `from`（thanks/mail/direct） | |
| `booking_complete` | 予約完了ページ表示 | | ◎ |
| `line_click` | LINEボタン/QR表示 | `cta_position` | ○ |
| `tel_click` | 電話タップ（掲載時） | | ○ |
| `faq_open` | FAQ展開 | `question_id` | |
| `scroll` / `file_download` | GA4拡張計測 | | |

- ページ属性：`page_type`（top/service/case/column/faq/contact…）、`content_category` をdataLayerに出力し、コンテンツ別の相談貢献を分析。
- GA4設定：データ保持期間14か月、内部トラフィック除外（事業者IP）、クロスドメイン（予約ツールドメインを含められる場合）、Search Consoleリンク。
- **個人情報（氏名・メール・電話）をGA4に送らない**（Google規約違反）。URLクエリにも含めない。

### 7.2 Search Console

- ドメインプロパティで登録（DNS TXTレコードで所有権確認）。
- sitemap.xml を送信。公開直後にURL検査で主要ページのインデックス登録をリクエスト。
- 月次でクエリ・CTRを確認し、コラム企画とtitle/descriptionを改善。
- Bing Webmaster Tools も登録（Search Consoleからインポート可）。

### 7.3 同意管理（Cookie）方針

- 前提：日本の個人情報保護法・電気通信事業法の外部送信規律に対応する。外部送信規律の義務対象に該当するかは事業形態によるが、**該当有無にかかわらず「外部送信ポリシー」を公表**（送信先：Google（GA4/GTM）、Cloudflare（Turnstile）、予約ツール、LINE等、送信される情報、利用目的、オプトアウト方法）。
- バナー方式：**通知＋オプトアウト型の軽量バナー**（初回訪問時に画面下部へ小さく表示、「同意する／設定」）。EU居住者向けの本格的なオプトイン管理は、対象外と判断できれば不要。
- Google Consent Mode v2 を実装（`analytics_storage` 等のデフォルト値と、ユーザー選択の反映）。広告タグ（Google広告・Metaピクセル等）を導入する時点で、オプトイン型またはCMP（Cookiebot等）への切替を再検討。
- バナーはCLS・LCPを悪化させない実装（固定配置、FV要素に重ねない、JS数KB以内）。

---

## 8. SEO実装要件

| 項目 | 要件 |
|---|---|
| title | `ページ固有タイトル｜COMPASS 中学受験コンサルタント`（TOPはサービス説明を含む）。全ページ一意 |
| meta description | 全ページ一意、80〜120字。CMS未入力時は自動生成 |
| 見出し | h1は1ページ1つ。h2〜h3の階層を飛ばさない |
| canonical | 全ページに自己参照canonical。末尾スラッシュ統一（`trailingSlash: 'always'`）、`www`有無・`http`を301で正規化。一覧のページネーション2ページ目以降は自己参照 |
| OGP | `og:title` `og:description` `og:image`(1200×630) `og:url` `og:type`（TOP=website、記事=article） `og:site_name` `og:locale=ja_JP`、`twitter:card=summary_large_image` |
| 構造化データ（JSON-LD） | 全ページ：`Organization`（名称・ロゴ・URL・sameAs）、`WebSite`／パンくず：`BreadcrumbList`／コラム：`Article`（author=`Person`、datePublished/Modified、image）／FAQページ：`FAQPage`（※Googleのリッチリザルト表示対象は現在限定的だが、意味付けとして付与）／コンサルタント：`Person`／サービス：`Service`（provider、areaServed）。`Review`・`AggregateRating`の自己付与はしない |
| sitemap | `@astrojs/sitemap` で自動生成。`noindex`ページ（thanks、404、プレビュー）は除外。`lastmod`はCMSの更新日 |
| robots.txt | 本番：全許可＋sitemap記載。プレビュー環境：`Disallow: /` ＋ `X-Robots-Tag: noindex` ヘッダー（二重防御） |
| noindex対象 | `/contact/thanks/`、`/reserve/complete/`、404、検索結果・タグの薄いページ（必要に応じて） |
| パンくず | TOP以外の全ページに表示（視覚＋`BreadcrumbList`）。例：TOP > コラム > 塾選び > 記事名 |
| URL設計 | 英小文字・ハイフン。例：`/service/strategy/`、`/column/[slug]/`、`/cases/[slug]/` |
| 内部リンク | コラム→関連サービス→相談CTAの導線を記事テンプレートに組込み。関連記事自動表示 |
| 画像 | 意味のある画像はalt必須、装飾画像は`alt=""` |
| 404 | カスタム404（ステータスコード404を返す）。TOP・主要ページ・相談CTAへのリンク |
| リダイレクト | `_redirects` で管理（旧サイトがある場合は旧URL→新URLの301対応表を作成） |
| hreflang | 日本語のみのため不要 |
| favicon | `favicon.ico`、`icon.svg`、`apple-touch-icon.png`(180px)、`site.webmanifest` |

---

## 9. パフォーマンス目標と手段

### 9.1 目標値（モバイル、4G相当）

| 指標 | 目標 |
|---|---|
| Lighthouse Performance / Accessibility / Best Practices / SEO | すべて **90以上**（主要テンプレートで95以上を目指す） |
| LCP | **2.5秒未満**（目標2.0秒） |
| INP | **200ms未満** |
| CLS | **0.1未満**（目標0.05） |
| TTFB | 0.8秒未満（CDN配信で通常0.2秒前後） |
| ページ重量 | TOP：転送量1MB未満、JS 50KB（gzip）未満（GTM・計測除く） |

実ユーザー値（CrUX／Search Consoleのウェブに関する主な指標）で75パーセンタイルが「良好」であることを最終判定とする。

### 9.2 手段

- **画像**：Astro `<Image>`/`<Picture>` でAVIF/WebP生成、`srcset`/`sizes`、`width`/`height`明示（CLS防止）、FV画像は`fetchpriority="high"`かつ`loading="eager"`、それ以外は`loading="lazy"`。CMS画像はmicroCMSの画像API（imgix互換パラメータ）で幅・形式指定。
- **フォント**：日本語Webフォントは重いため、**本文はシステムフォント**（`"Hiragino Sans", "Noto Sans JP", "Yu Gothic", sans-serif`）を基本。見出し用にWebフォントを使う場合は、サブセット化（使用文字のみ）した`woff2`をセルフホスト、`font-display: swap`、主要1ウェイトのみ`preload`。
- **JS最小化**：Astroの静的HTMLを基本とし、インタラクティブ要素（ハンバーガーメニュー、FAQアコーディオン、フォーム）はバニラJSまたは`<details>`等のネイティブ要素で実装。UIフレームワークは原則不使用。
- **CSS**：ページ単位でスコープ・自動分割、クリティカルCSSのインライン化（Astroの既定挙動を活用）。
- **サードパーティ**：GTMは必要タグのみ。予約ツールiframe・地図・動画は操作時または表示時に遅延読込（ファサード方式）。
- **キャッシュ**：ハッシュ付きアセットは`Cache-Control: public, max-age=31536000, immutable`、HTMLは短期キャッシュ＋CDN再検証。
- **品質ゲート**：GitHub ActionsでLighthouse CI（主要5テンプレート）を実行し、閾値割れでPRを失敗扱いにする。

---

## 10. アクセシビリティ・セキュリティ要件

### 10.1 アクセシビリティ（目標：JIS X 8341-3:2016 / WCAG 2.2 レベルAA準拠を目指す）

- 色コントラスト：本文4.5:1以上、大きい文字・UI部品3:1以上。
- キーボード操作：全機能をTabで操作可能、フォーカスリングを消さない（デザインでカスタム）、「本文へスキップ」リンク。
- ランドマーク：`header`/`nav`/`main`/`footer`、ナビの`aria-label`、現在ページ`aria-current="page"`。
- ハンバーガーメニュー：`aria-expanded`・`aria-controls`、Escで閉じる、フォーカストラップ。
- FAQ：`<details>/<summary>`またはボタン＋`aria-expanded`。
- フォーム：全項目に`<label>`、必須は視覚（「必須」テキスト）と`aria-required`、エラーは項目直下にテキストで表示し`aria-describedby`で関連付け、送信時エラーはサマリーへフォーカス移動。色だけで状態を伝えない。
- タップ領域：最小44×44px（WCAG 2.2 最小24px、推奨44px）。固定フッターCTAが本文を隠さない。
- 文字サイズ：本文16px以上、ブラウザ拡大200%で崩れない。行間1.7〜1.9。
- 動き：`prefers-reduced-motion` でアニメーション停止。自動再生カルーセルは使用しない。
- 検証：axe-core（CI）、手動でVoiceOver（iOS）・TalkBack・キーボード操作チェック。

### 10.2 セキュリティ

- **HTTPS**：Cloudflareで常時HTTPS、HTTP→HTTPS 301、HSTS（`max-age=31536000; includeSubDomains`、動作確認後 preload検討）、TLS1.2以上。
- **セキュリティヘッダー**（`_headers` で全ページに付与）：

| ヘッダー | 値（方針） |
|---|---|
| `Content-Security-Policy` | `default-src 'self'`；`script-src` に自ドメイン・GTM/GA4・Turnstile・予約ツールのドメインを限定許可；`frame-src` にTurnstile・予約ツール・（地図/動画）；`img-src 'self' data:` ＋ microCMS画像ドメイン・GA；`connect-src` にGA4・自API；`form-action 'self'`；`frame-ancestors 'none'`；`base-uri 'self'`；`object-src 'none'`。**まず `Content-Security-Policy-Report-Only` で2週間運用し違反を確認後に本適用**。GTMの「カスタムHTMLタグ」は原則禁止（CSP緩和を避けるため） |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=()` 等、不要機能を無効化 |
| `X-Frame-Options` | `DENY`（CSPの`frame-ancestors`と併用） |
| `Cross-Origin-Opener-Policy` | `same-origin` |

- **フォームのバリデーション**：クライアント側（HTML5属性＋JSで即時フィードバック）とサーバ側（Workerでスキーマ検証：必須・型・文字数・メール形式・列挙値の許可リスト）の二重化。サーバ側を正とする。メールヘッダーインジェクション対策（改行文字の除去）、HTMLエスケープ、添付ファイルは受け付けない。
- **秘密情報**：APIキー（microCMS、メールAPI、Turnstileシークレット）はCloudflare/GitHubのシークレットに保存し、リポジトリにコミットしない。microCMSのAPIキーは読み取り専用・GETのみ許可。
- **アカウント保護**：GitHub・Cloudflare・microCMS・Google・LINE・予約ツールすべてで2要素認証必須、共有アカウント禁止（個人アカウント＋権限付与）。
- **依存関係**：Dependabot/Renovateで週次更新PR、`npm audit`をCIで実行。
- **外部リンク**：`target="_blank"`には`rel="noopener"`。
- **ドメイン**：メール送信ドメインにSPF/DKIM/DMARC、DNSSEC有効化（Cloudflare）。
- **バックアップ**：CMSデータを月次でエクスポート（GitHub Actionsで自動化し非公開リポジトリ/ストレージへ保存）。

---

## 11. ディレクトリ構成案とコンポーネント一覧

### 11.1 ディレクトリ構成

```
/
├─ docs/                          # 設計・分析・運用マニュアル
│   ├─ 00-project-brief.md
│   ├─ analysis/
│   └─ operations/                # CMS更新マニュアル（非エンジニア向け）
├─ public/
│   ├─ favicon.ico / icon.svg / apple-touch-icon.png / site.webmanifest
│   ├─ ogp/default.png
│   ├─ robots.txt                 # ※環境別に生成する場合は src/pages/robots.txt.ts
│   ├─ _headers                   # セキュリティ・キャッシュヘッダー
│   └─ _redirects
├─ functions/ または workers/      # Cloudflare 関数
│   ├─ api/contact.ts             # フォーム受付（Turnstile検証→バリデーション→メール送信）
│   └─ preview/[...].ts           # CMS下書きプレビュー（Basic認証・noindex）
├─ src/
│   ├─ pages/
│   │   ├─ index.astro                    # TOP
│   │   ├─ about/index.astro              # COMPASSとは
│   │   ├─ service/index.astro            # サービス一覧
│   │   ├─ service/[slug].astro           # 戦略相談／成績学習相談／志望校併願校／塾選び転塾／家庭学習／継続コンサル
│   │   ├─ price/index.astro              # 料金
│   │   ├─ consultant/index.astro
│   │   ├─ cases/index.astro, [slug].astro
│   │   ├─ voice/index.astro
│   │   ├─ column/index.astro, [slug].astro
│   │   ├─ column/category/[slug]/[...page].astro
│   │   ├─ news/index.astro, [slug].astro
│   │   ├─ faq/index.astro
│   │   ├─ flow/index.astro               # ご利用の流れ（TOP内のみでも可、サイトマップ設計に従う）
│   │   ├─ contact/index.astro, confirm（同一ページ内ステップでも可）, thanks.astro
│   │   ├─ reserve/index.astro, complete.astro
│   │   ├─ privacy/index.astro, external-transmission/index.astro（外部送信ポリシー）
│   │   ├─ terms/index.astro, tokushoho/index.astro
│   │   └─ 404.astro
│   ├─ layouts/
│   │   ├─ BaseLayout.astro       # head/SEO/GTM/ヘッダー/フッター
│   │   ├─ PageLayout.astro       # 下層共通（パンくず・ページタイトル）
│   │   └─ ArticleLayout.astro    # コラム・事例・お知らせ
│   ├─ components/
│   │   ├─ common/  seo/  layout/  cta/  sections/  content/  form/  ui/
│   ├─ content/                   # コード管理コンテンツ（サービス・料金・規約類のMarkdown）
│   ├─ lib/
│   │   ├─ cms/                   # microCMSクライアント（CMS差し替え可能な抽象層）
│   │   ├─ seo/                   # JSON-LD生成関数
│   │   ├─ analytics/             # dataLayer push ヘルパー
│   │   └─ validation/            # フォームスキーマ（クライアント/サーバ共通）
│   ├─ styles/                    # デザイントークン（色・余白・タイポ）、reset、global
│   ├─ assets/                    # 最適化対象画像・アイコンSVG
│   └─ config/site.ts             # サイト名・URL・CTA既定値・ナビ定義
├─ tests/                         # e2e（Playwright）、a11y（axe）
├─ .github/workflows/             # CI：型検査、lint、ビルド、Lighthouse CI、axe、CMSバックアップ
├─ astro.config.mjs
├─ package.json
└─ .env.example                   # 必要な環境変数名のみ（値は入れない）
```

### 11.2 コンポーネント一覧

| 分類 | コンポーネント | 概要 |
|---|---|---|
| seo | `SeoHead` | title/description/canonical/OGP/robots |
| seo | `JsonLd` | 構造化データ出力（Organization/Article/FAQPage/Breadcrumb 等） |
| seo | `Breadcrumbs` | 視覚パンくず＋JSON-LD |
| layout | `SiteHeader` / `GlobalNav` / `MobileMenu` | ヘッダー、PCナビ、スマホドロワー |
| layout | `SiteFooter` | フッターナビ、事業者情報、規約リンク |
| layout | `SkipLink` / `Container` / `Section` | アクセシビリティ・レイアウト基盤 |
| cta | `CtaButton` | 統一CTA（文言は`site-settings`／`config`から供給、計測属性内蔵） |
| cta | `CtaBlock` | 相談予約（主）＋LINE（副）の2ボタンセット |
| cta | `StickyCtaBar` | スマホ固定フッターCTA（スクロールで表示） |
| cta | `LineButton` / `LineQrModal` | デバイス出し分けLINE導線 |
| sections（TOP） | `HeroFv` | FV「中学受験、誰に相談していますか？」＋CTA |
| sections | `WorryList` | お悩みリスト |
| sections | `ThirdPartyValue` | 第三者だからできること |
| sections | `AboutSummary` | COMPASSとは |
| sections | `ServiceGrid` / `ServiceCard` | 相談できること・サービス一覧 |
| sections | `ReasonList` | 選ばれる理由（3〜5） |
| sections | `CaseTeaser` / `ConsultantTeaser` / `VoiceTeaser` | 事例・コンサルタント・声のダイジェスト |
| sections | `PriceTable` | 料金表（税込表記、注記） |
| sections | `FlowSteps` | 相談→ヒアリング→分析→戦略提案→継続支援 |
| sections | `FaqTeaser` | FAQ抜粋 |
| sections | `FinalCta` | 「一人で悩む前に、まずはご相談ください。」 |
| content | `ArticleCard` / `ArticleList` / `Pagination` / `CategoryTabs` | コラム・お知らせ一覧 |
| content | `ArticleBody` / `TableOfContents` / `AuthorBox` / `RelatedArticles` | 記事詳細 |
| content | `CaseStory` | 課題→分析→提案→実行→結果のステップ表示 |
| content | `VoiceCard` | お客様の声 |
| content | `ConsultantProfile` | プロフィール |
| content | `FaqAccordion` | FAQ（カテゴリ別、`<details>`ベース） |
| content | `Disclaimer` | 「成果を保証するものではありません」等の注記 |
| form | `ConsultForm` | 相談予約フォーム本体（入力→確認→送信） |
| form | `FormField` / `TextInput` / `Select` / `CheckboxGroup` / `RadioGroup` / `Textarea` | ラベル・エラー・説明を内包したアクセシブル部品 |
| form | `TurnstileWidget` / `Honeypot` / `ErrorSummary` | スパム対策・エラー集約 |
| form | `BookingEmbed` | 予約ツール遅延読込埋め込み |
| ui | `Button` / `Badge` / `Card` / `Icon` / `ResponsiveImage` / `Notice` | 基本UI |
| misc | `ConsentBanner` | Cookie通知・Consent Mode連携 |
| misc | `AnnouncementBar` | 告知バー |

---

## 12. 開発フェーズ計画（マイルストーン）

前提：仕様書v1.0のユーザー承認後に着手。1名のエンジニア想定、デザイン確定済みを前提に約6〜8週間。

| フェーズ | 期間目安 | 主な作業 | 完了条件（ゲート） |
|---|---|---|---|
| M0 準備 | 0.5週 | §13の確認事項の回答取得、各種アカウント作成（Cloudflare、microCMS、メールAPI、TimeRex、GA4/GTM、Search Console）、ドメイン・DNS方針決定 | アカウント・権限が揃い、2要素認証設定済み |
| M1 基盤構築 | 1週 | Astroプロジェクト、CI（lint/型/ビルド/Lighthouse/axe）、Cloudflare連携・プレビュー環境（noindex＋Basic認証）、デザイントークン、Base/Pageレイアウト、SEO基盤 | プレビューURLで空レイアウトが表示、CIが通る |
| M2 CMS構築 | 1週 | microCMSのAPI・フィールド作成（§3）、CMSクライアント、Webhook→自動デプロイ、下書きプレビュー | CMSで公開→数分で反映を確認 |
| M3 ページ実装 | 2〜3週 | TOP・下層全ページ・一覧/詳細テンプレート・404・規約類、構造化データ、sitemap/robots | 全ページがワイヤー・デザイン通り表示、コンテンツ仮投入 |
| M4 フォーム・予約・LINE | 1週 | フォームWorker、Turnstile、メール送信・自動返信、SPF/DKIM/DMARC、TimeRex連携、LINE導線 | テスト送信〜予約確定まで一気通貫で成功、スパムテスト合格 |
| M5 計測・同意管理 | 0.5週 | GTM・GA4イベント・キーイベント設定、Consent Mode、外部送信ポリシー、Search Console | GA4 DebugViewで全イベント確認 |
| M6 品質保証 | 1週 | 実機テスト（iOS Safari / Android Chrome / PC主要ブラウザ）、Lighthouse・CWV、アクセシビリティ、セキュリティヘッダー（CSP Report-Only）、表現チェック（絶対ルール1〜10）、リンク切れ | 全ページLighthouse各90+、チェックリスト全項目OK、ユーザー最終承認 |
| M7 公開 | 0.5週 | DNS切替、（旧サイトあれば）301設定、sitemap送信、インデックス登録リクエスト、CMS更新マニュアル・操作レクチャー | 本番公開、更新担当者が1人でコラムを公開できる |
| M8 公開後運用 | 公開後1〜3か月 | CSP本適用、GA4・Search Consoleの月次レポート、導線（案1/案2）比較、CWV実測確認、改善 | 月次改善サイクル定着 |

---

## 13. ユーザー確認事項

| # | 確認事項 | 設計への影響 |
|---|---|---|
| 1 | **ドメイン**：取得済みか／希望ドメイン名（例：`compass-xxx.jp`）／レジストラ | DNS・メール認証・Search Console登録 |
| 2 | **既存サイト・既存サーバ**の有無（旧URL一覧、WordPress等）／既存メール（`info@`等）の運用サーバ | 301リダイレクト、DNS移行方式、メール設定の衝突回避 |
| 3 | **予算**：初期制作費、月額運用費の上限（CMS有料プラン可否） | microCMS有料 vs 無料統合 vs Decap/Sveltia |
| 4 | **更新担当者**：人数、ITリテラシー、GitHubアカウント作成の可否、承認フロー（公開前チェック者） | CMS選定、権限設計、マニュアルの粒度 |
| 5 | **LINE公式アカウント**の有無（ID、友だち追加URL、QR、リッチメニュー運用有無） | LINE導線の設置可否・文言 |
| 6 | **予約ツール**の利用有無（TimeRex／Calendly／Googleカレンダー等）、利用中のカレンダー（Google/Outlook）、相談方法（オンライン／対面／電話） | 2段階導線の実装方式、完了計測 |
| 7 | **無料相談の実施有無**と初回相談の料金・所要時間 | CTA文言（「無料」使用可否）、料金ページ、特商法表記 |
| 8 | 問い合わせ受付メールアドレス・返信までの営業日数・営業時間 | 自動返信文面、通知先 |
| 9 | Google アカウント（GA4/GTM/Search Console の所有者）、Google Workspace利用有無 | 計測環境の所有権（制作者ではなく事業者名義で作成） |
| 10 | 事業者情報（屋号/法人名、所在地・電話の公開可否、代表者名） | 特商法表記、Organization構造化データ、フッター |
| 11 | 支払い方法（銀行振込・クレジットカード決済の要否） | 決済導入の要否（本設計では対象外、必要ならStripe等を追加検討） |
| 12 | 事例・お客様の声・コンサルタント経歴の**実データと掲載許諾**の有無 | 公開時のコンテンツ量、許諾フラグ運用 |
| 13 | 写真素材（コンサルタント写真の撮影予定、ストック写真の可否） | 画像最適化・alt・ブランドトーン |
| 14 | 広告出稿予定（Google広告・Meta広告等） | 同意管理をオプトイン型に強化するか |
| 15 | 公開希望時期 | マイルストーン確定 |

---

## 付録：環境変数（名称のみ、値はシークレット管理）

| 変数名 | 用途 |
|---|---|
| `MICROCMS_SERVICE_DOMAIN` / `MICROCMS_API_KEY` | CMS取得（読み取り専用キー） |
| `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | スパム対策 |
| `MAIL_API_KEY` / `MAIL_FROM` / `MAIL_TO_ADMIN` | フォーム通知・自動返信 |
| `PUBLIC_GTM_ID` | GTMコンテナID |
| `PUBLIC_BOOKING_URL` / `PUBLIC_LINE_URL` | 既定値（CMS未設定時のフォールバック） |
| `PREVIEW_BASIC_AUTH` / `PREVIEW_SECRET` | 下書きプレビュー保護 |
| `SITE_URL` / `DEPLOY_ENV` | canonical生成、環境別robots制御 |
