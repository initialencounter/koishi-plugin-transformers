import { readFileSync } from 'fs'
import { Context, Schema } from 'koishi'
import { } from 'koishi-plugin-transformers';
import { resolve } from 'path'

export const name = ''
export const inject = {
  required: ['transformers']
}

export const usage = readFileSync(resolve(__dirname, "../readme.md")).toString('utf-8')
export interface Config {
  cacheDir: string
  model: string
}
export const Config: Schema<Config> = Schema.object({
  cacheDir: Schema.string().default('').description('缓存目录'),
  model: Schema.string().default('').description('模型名称'),
})

export function apply(ctx: Context, config: Config) {
  let classifier = null
  ctx.on('ready', async () => {
    classifier = await ctx.transformers.getPipeline('image-classification', config.model, config.cacheDir)
    if (!classifier) {
      ctx.logger(name).warn(`模型加载失败, 名称：${config.model}, 缓存目录：${config.cacheDir}`)
    } else {
      ctx.logger(name).success('模型加载成功')
    }
  })
}
