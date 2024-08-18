import { readFileSync } from 'fs'
import { Context, Schema } from 'koishi'
import { } from 'koishi-plugin-transformers';
import { resolve } from 'path'
import type { Tensor, FeatureExtractionPipeline } from '@xenova/transformers'

export const name = 'embedsort'
export const inject = {
  required: ['transformers']
}

export const usage = readFileSync(resolve(__dirname, "../readme.md")).toString('utf-8')
export interface Config {
  cacheDir: string
  model: string
  embedTexts: string
  query_prefix: string
  randSort: number
}
export const Config: Schema<Config> = Schema.object({
  cacheDir: Schema.string().default('node_modules\\@xenova\\transformers\\.cache').description('缓存目录'),
  model: Schema.string().default('Xenova/bge-large-zh-v1.5').description('模型名称'),
  embedTexts: Schema.string().description('嵌入文本的路径, txt格式，内容以换行符分开').required(true),
  query_prefix: Schema.string().default('用以下句子来搜索相关段落：').description('查询前缀'),
  randSort: Schema.number().role('slider').min(0).max(1).step(0.01).default(0).description('随机回复概率，如需关闭可设置为 0'),
})

export function apply(ctx: Context, config: Config) {
  let extractor: FeatureExtractionPipeline = null
  let embedTexts = null
  let embeddings = null
  ctx.on('ready', async () => {
    // @ts-ignore
    extractor = await ctx.transformers.getPipeline('feature-extraction', config.model, config.cacheDir)
    if (!extractor) {
      ctx.logger(name).warn(`模型加载失败, 名称：${config.model}, 缓存目录：${config.cacheDir}`)
    } else {
      ctx.logger(name).success('模型加载成功')
    }
    embedTexts = readFileSync(config.embedTexts).toString('utf-8').split('\n')
    embeddings = await extractor(embedTexts, { pooling: 'mean', normalize: true })
  })
  ctx.middleware(async (session, next) => {
    if (!embeddings) {
      return next()
    }
    if (config.randSort === 0 || Math.random() < config.randSort) {
      return next()
    }
    session.send(await embedsort(embeddings, extractor, embedTexts, config, session.content))
    return next()
  })
  ctx.command('embedsort <query:text>', '根据嵌入向量排序').action(async ({ session }, text) => {
    return await embedsort(embeddings, extractor, embedTexts, config, text)
  })
}

async function embedsort(
  embeddings: Tensor,
  extractor: FeatureExtractionPipeline,
  embedTexts: string[], config: Config,
  text: string) {
  if (!embeddings) {
    return '模型未加载'
  }
  let query_embeddings = await extractor(config.query_prefix + text, { pooling: 'mean', normalize: true })
  const scores = embeddings.tolist().map(
    (embedding, i) => ({
      id: i,
      score: cosSim(query_embeddings.data as number[], embedding),
      text: embedTexts[i],
    })
  ).sort((a, b) => b.score - a.score);
  return scores[0].text

}

function cosSim(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error("两个向量的长度必须相同");
  }

  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));

  if (magnitudeA === 0 || magnitudeB === 0) {
    throw new Error("向量的模不能为零");
  }

  return dotProduct / (magnitudeA * magnitudeB);
}
