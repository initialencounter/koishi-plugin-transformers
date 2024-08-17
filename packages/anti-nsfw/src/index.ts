import { readFileSync } from 'fs';
import { Context, Schema, h } from 'koishi'
import { } from 'koishi-plugin-transformers';
import { resolve } from 'path';
export const name = 'anti-nsfw'
export const inject = {
  required: ['transformers']
}

export const usage = readFileSync(resolve(__dirname, "../readme.md")).toString('utf-8')
export interface Config {
  cacheDir: string
  model: string
  score: number
  nsfw_channel: string[]
}
export const Config: Schema<Config> = Schema.object({
  cacheDir: Schema.string().default('node_modules\\@xenova\\transformers\\.cache').description('缓存目录'),
  model: Schema.string().default('AdamCodd/vit-base-nsfw-detector').description('模型名称'),
  score: Schema.number().role('slider').min(0).max(1).step(0.01).default(0.8).description('允许的 nsfw 值，调为 1 则不再撤回，调为 0 则 100% 撤回'),
  nsfw_channel: Schema.array(Schema.string()).default([]).description('允许发送 nsfw 图片的频道')
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

  ctx.middleware(async (session, next) => {
    if (config.nsfw_channel.includes(session.channelId)) {
      return next()
    }
    for (let message of session.elements) {
      if (message.type === "img") {
        if (!classifier) {
          ctx.logger(name).warn('The classifier is not ready yet. Please try again later.')
        }
        let start = Date.now()
        // @ts-ignore
        let res = await classifier(message.attrs.src)
        let end = Date.now()
        ctx.logger(name).info(`Time taken: ${end - start}ms`)
        for (let i = 0; i < res.length; i++) {
          ctx.logger(name).info(`【${session.channelId} | ${session.userId}】：[${res[i].label} | ${res[i].score}]`)
          if (res[i].label === 'nsfw' && res[i].score > 0.8) {
            session.bot.deleteMessage(session.channelId, session.messageId)
            return `图片中可能包含 NSFW 内容，概率${res[i].score}，请勿发送此类图片。` + h.at(session.userId)
          }
        }
      }
    }
    return next()
  })
}
