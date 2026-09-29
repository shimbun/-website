export type ColumnCategory = { slug: string; name: string; description: string; service: string };

export const columnCategories: ColumnCategory[] = [
  { slug: 'basics', name: '受験の基礎知識', description: '中学受験を考え始めたご家庭が最初に知っておきたいこと。', service: 'strategy' },
  { slug: 'juku', name: '塾選び・転塾', description: '塾の選び方、今の塾が合っているかの見極め、転塾の判断について。', service: 'juku' },
  { slug: 'study', name: '成績・勉強法', description: '成績が伸びないときの原因の切り分け方、模試の見方、勉強法の見直し。', service: 'study' },
  { slug: 'school', name: '志望校・併願', description: '志望校の決め方、併願の組み方、志望校変更の考え方。', service: 'school-selection' },
  { slug: 'home-study', name: '家庭学習', description: '家庭学習の組み立て方、宿題との付き合い方、スケジュール管理。', service: 'home-study' },
  { slug: 'parents', name: '保護者の関わり方', description: '中学受験で親ができること、しすぎないこと。保護者自身の悩み。', service: 'continuous' },
];

export const getCategory = (slug: string) => columnCategories.find((c) => c.slug === slug);
