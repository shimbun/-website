import { tbd, site } from '../config/site';

export type Plan = {
  id: string;
  name: string;
  summary: string;
  price: string;
  unit: string;
  duration: string;
  includes: string[];
  forWhom: string;
  featured?: boolean;
};

/**
 * 料金プラン。金額・所要時間はすべて事業者確認後に確定する（Rule 8：料金を隠さない）。
 * 表示は税込で統一する。
 */
export const plans: Plan[] = [
  {
    id: 'single',
    name: '単発相談',
    summary: '1回のご相談で、今の状況と進め方を整理します。テーマは6つの相談内容から自由にお選びいただけます。',
    price: tbd('単発相談の料金（税込）'),
    unit: '1回',
    duration: site.consultation.duration,
    includes: [
      '事前のヒアリング（フォームでの状況確認）',
      'ご相談（' + site.consultation.format + '）',
      tbd('相談後の提案書・メモの有無'),
    ],
    forWhom: 'まず一度、第三者の意見を聞いてみたい方',
    featured: true,
  },
  {
    id: 'continuous',
    name: '継続コンサルティング',
    summary: '定期的なご相談で、模試や学年の変わり目ごとに方針を見直します。',
    price: tbd('継続コンサルの料金（税込）'),
    unit: tbd('課金単位（月額／回数券など）'),
    duration: tbd('相談の頻度・期間'),
    includes: [
      '定期的なご相談',
      tbd('ご相談の合間の質問対応（メール・チャット等）の有無'),
      '模試結果などをもとにした計画の見直し',
    ],
    forWhom: '入試まで定期的に方針を確認したい方',
  },
];

export const pricingNotes = [
  '表示価格はすべて税込です。',
  `お支払い方法：${tbd('支払方法（銀行振込・クレジットカード等）')}`,
  `お支払い時期：${tbd('支払時期')}`,
  `キャンセル・日程変更：${tbd('キャンセル・日程変更の規定')}`,
  `追加料金：${tbd('追加料金の有無')}`,
];

export const getPlan = (id: string) => plans.find((p) => p.id === id)!;
