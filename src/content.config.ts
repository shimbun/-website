import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const categories = ['basics', 'juku', 'study', 'school', 'home-study', 'parents'] as const;
const grades = ['低学年', '4年生', '5年生', '6年生', '入試直前期'] as const;

/** コラム（SEOコンテンツ） */
const columns = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/columns' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.enum(categories),
    grades: z.array(z.enum(grades)).default([]),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    /** 関連サービスの slug（記事末の誘導ボックス） */
    service: z.string(),
    /** 執筆・監修者（src/data/consultants.ts の slug） */
    author: z.string().default('representative'),
    draft: z.boolean().default(false),
  }),
});

/**
 * 支援事例（課題→分析→提案→実行→結果）。
 * consent: true（ご本人の掲載許諾を取得済み）のものだけが公開される。
 */
const cases = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/cases' }),
  schema: z.object({
    title: z.string(),
    grade: z.string(),
    tags: z.array(z.string()).default([]),
    challenge: z.string(),
    analysis: z.string(),
    proposal: z.string(),
    action: z.string(),
    result: z.string(),
    consent: z.boolean(),
    publishedAt: z.coerce.date(),
  }),
});

/** お客様の声。consent: true のものだけが公開される */
const voices = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/voices' }),
  schema: z.object({
    grade: z.string(),
    gender: z.string().optional(),
    juku: z.string().optional(),
    worry: z.string(),
    consultation: z.string(),
    change: z.string(),
    /** 謝礼を提供した場合は true（ステマ規制対応で表示） */
    rewarded: z.boolean().default(false),
    consent: z.boolean(),
    publishedAt: z.coerce.date(),
  }),
});

export const collections = { columns, cases, voices };
