/**
 * サイト全体の設定値。
 *
 * 【要確認】の値は事業者への事実確認が済むまで仮置きのプレースホルダです。
 * `npm run check:release` は、ビルド結果に【要確認】が1つでも残っていると失敗します
 * （＝確認前の情報を本番公開しないための安全装置）。
 */

/** 事実確認前の値を示すプレースホルダ */
export const tbd = (label: string) => `【要確認：${label}】`;

export const SITE_ENV = import.meta.env.PUBLIC_SITE_ENV ?? 'staging';
export const IS_PRODUCTION = SITE_ENV === 'production';

export const site = {
  name: 'COMPASS 中学受験コンサルタント',
  shortName: 'COMPASS',
  tagline: '中学受験のセカンドオピニオン',
  description:
    '塾選び・成績・志望校・転塾・家庭学習など、中学受験の悩みを塾とは別の第三者の立場から整理し、ご家庭に合った進め方をご提案する相談サービスです。',
  target: '幼児〜小学6年生の保護者の方',

  /**
   * 無料相談（初回無料）を実施しているか。
   * false の間はサイト全体で「無料」という語を使わない（check:content が検出して失敗させる）。
   */
  freeConsultation: false,

  operator: {
    name: tbd('運営会社名／屋号'),
    representative: tbd('代表者名'),
    address: tbd('所在地（公開可能な住所）'),
    email: tbd('連絡先メールアドレス'),
    tel: tbd('電話番号（公開可否）'),
    hours: tbd('受付時間'),
    established: tbd('設立・開業年'),
    business: '中学受験に関する相談・コンサルティング',
  },

  consultation: {
    /** 相談形式（例：オンライン（Zoom）） */
    format: tbd('相談形式（オンライン／対面）'),
    /** 1回の所要時間（例：60分） */
    duration: tbd('1回の所要時間'),
    /** 返信までの目安（例：2営業日以内） */
    replyWithin: tbd('返信までの目安'),
    /** 対応エリア */
    area: tbd('対応エリア'),
    /** 対面相談を実施する場合 true（フォームに「相談形式」欄が出る） */
    inPerson: false,
  },

  /** 中立性（紹介料・提携がないこと）の確認状況。USP「第三者」の根拠 */
  neutralityNote: tbd('塾・家庭教師・教材会社からの紹介料や提携がないこと'),

  /** 勧誘方針（運用として約束できる場合のみ文言を確定） */
  noHardSellNote: `しつこい勧誘はいたしません${tbd('運用として約束できるか')}`,

  /** LINE公式アカウント（空文字の間はLINE導線を表示しない） */
  lineUrl: '',

  /** SNS（未開設の間は空配列） */
  sns: [] as { label: string; url: string }[],

  /** 日程調整ツール（TimeRex 等）のURL。環境変数で設定 */
  bookingUrl: import.meta.env.PUBLIC_TIMEREX_URL ?? '',
} as const;

/** CTA文言。無料相談の有無で一括切替（仕様書 5-4） */
export const cta = site.freeConsultation
  ? {
      primary: '無料で相談してみる',
      short: '無料相談を予約する',
      mid: '無料相談でできることを見る',
      topic: (t: string) => `${t}について無料で相談する`,
    }
  : {
      primary: '中学受験について相談する',
      short: '相談を予約する',
      mid: '相談内容と料金を見る',
      topic: (t: string) => `${t}について相談する`,
    };

export const CONSULTATION_PATH = '/consultation/';
