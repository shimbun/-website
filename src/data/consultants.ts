import { tbd } from '../config/site';

export type Consultant = {
  slug: string;
  name: string;
  role: string;
  /** public/ 以下の画像パス。未入手の間は空文字（イニシャル表示） */
  photo: string;
  message: string;
  career: string[];
  specialties: string[];
  qualifications: string[];
  values: string;
};

/**
 * コンサルタント。**確認できた事実のみ掲載**（仕様書 7-2）。
 * 公開前にすべての【要確認】を実データに置き換えること。
 */
export const consultants: Consultant[] = [
  {
    slug: 'representative',
    name: tbd('代表者氏名'),
    role: '代表コンサルタント',
    photo: '',
    message: tbd('代表メッセージ（200〜400字）'),
    career: [tbd('経歴（塾講師歴・家庭教師歴など、事実確認済みのもの）')],
    specialties: [tbd('得意な相談テーマ')],
    qualifications: [tbd('保有資格（該当がある場合のみ）')],
    values: tbd('相談で大切にしていること'),
  },
];
