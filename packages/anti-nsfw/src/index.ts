import { readFileSync } from 'fs';
import { Context, Schema, h } from 'koishi'
import { } from 'koishi-plugin-transformers';
import { } from '@initencounter/jimp'
import { } from '@koishijs/plugin-server'
import { } from '@koishijs/plugin-http'
import type { RawImage } from '@huggingface/transformers';
import { resolve } from 'path';
export const name = 'anti-nsfw'
export const inject = {
  required: ['transformers', 'jimp'],
  optional: ['server', 'http']
}

export const usage = readFileSync(resolve(__dirname, "../readme.md")).toString('utf-8')
export interface Config {
  implServerPath?: string
  cacheDir?: string
  model?: string
  score?: number
  nsfw_channel?: string[]
  runAs: 'client' | 'server' | 'local'
  endpoint?: string
}
export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    runAs: Schema.union(['client', 'server', 'local']).default('local').description('运行模式'),
  }),
  Schema.union([
    Schema.object({
      runAs: Schema.const('client'),
      endpoint: Schema.string().default('http://127.0.0.1:5141/nsfw-detect').description('服务端地址'),
      score: Schema.number().role('slider').min(0).max(1).step(0.01).default(0.8).description('允许的 nsfw 值，调为 1 则不再撤回，调为 0 则 100% 撤回'),
      nsfw_channel: Schema.array(Schema.string()).default([]).description('允许发送 nsfw 图片的频道'),
    }),
    Schema.object({
      runAs: Schema.const('server'),
      cacheDir: Schema.string().required().description('缓存目录'),
      model: Schema.string().default('AdamCodd/vit-base-nsfw-detector').description('模型名称'),
      implServerPath: Schema.string().default('/nsfw-detect').description('服务端路径'),
    }),
    Schema.object({
      runAs: Schema.const('local'),
      cacheDir: Schema.string().required().description('缓存目录'),
      model: Schema.string().default('AdamCodd/vit-base-nsfw-detector').description('模型名称'),
      score: Schema.number().role('slider').min(0).max(1).step(0.01).default(0.8).description('允许的 nsfw 值，调为 1 则不再撤回，调为 0 则 100% 撤回'),
      nsfw_channel: Schema.array(Schema.string()).default([]).description('允许发送 nsfw 图片的频道'),
    }),
  ]),

])

export function apply(ctx: Context, config: Config) {
  let classifier = null
  if (ctx.server && (config.runAs === 'server')) {
    ctx.server.post(config.implServerPath, async (ctx2) => {
      if (!classifier) {
        ctx2.status = 500
        ctx2.body = 'The classifier is not ready yet. Please try again later.'
      }
      let img = ctx2.request.body['img']
      img = await imagePrepare(img, ctx)
      let res = await classifier(img)
      ctx2.status = 200
      ctx2.body = res
    })
  };
  ctx.on('ready', async () => {
    if (config.runAs === 'client') {
      return
    }
    classifier = await ctx.transformers.getPipeline('image-classification', config.model, config.cacheDir)
    if (!classifier) {
      ctx.logger(name).warn(`模型加载失败, 名称：${config.model}, 缓存目录：${config.cacheDir}`)
    } else {
      ctx.logger(name).success('模型加载成功')
    }
  })

  ctx.middleware(async (session, next) => {
    if (config.runAs === 'server') {
      return next()
    }
    if (config.nsfw_channel.includes(session.channelId)) {
      return next()
    }
    for (let message of session.elements) {
      if (message.type === "img") {
        if (!classifier && config.runAs === 'local') {
          ctx.logger(name).warn('The classifier is not ready yet. Please try again later.')
        }
        let start = Date.now()
        let img = message.attrs.src
        if (img.startsWith('file://')) {
          img = img.replace('file://', '')
        }
        // @ts-ignore
        let res: any;
        if (config.runAs === 'client') {
          await ctx.http.post(config.endpoint, { img }, {
            headers: {
              'Content-Type': 'application/json'
            }
          })
        } else {
          img = await imagePrepare(img, ctx)
          res = await classifier(img)
        }
        let end = Date.now()
        ctx.logger(name).info(`Time taken: ${end - start}ms`)
        ctx.logger(name).info(`【${session.channelId} | ${session.userId}】：[${res[0].label} | ${res[0].score}]`)
        if (res[0].label === 'nsfw' && res[0].score > 0.8) {
          session.bot.deleteMessage(session.channelId, session.messageId)
          return `图片中可能包含 NSFW 内容，概率${res[0].score}，请勿发送此类图片。` + h.at(session.userId)
        }
      }
    }
    return next()
  })
}

async function imagePrepare(img: string, ctx: Context): Promise<string | RawImage> {
  let res: string | RawImage
  if (img.startsWith('data:image')) {
    let base64 = img.split(',')[1]
    const imgBuffer = Buffer.from(base64, 'base64')
    // const base64Header = img.split(',')[0]
    // const channels = getChannelCount(imgBuffer, base64Header)
    const jimp = await ctx.jimp.read(imgBuffer)
    const imgUint8Array = new Uint8Array(jimp.bitmap.data)
    const width = jimp.bitmap.width
    const height = jimp.bitmap.height
    // bug only support 4 channels
    res = await ctx.transformers.newRawImage(imgUint8Array, width, height, 4)
  }
  return res
}
export function getChannelCount(buffer: Buffer, base64Header: string): number {
  if (base64Header.includes('png')) {
    return getPngChannelCount(buffer)
  } else if (base64Header.includes('jpeg') || base64Header.includes('jpg')) {
    return getJpegChannelCount(buffer)
  }
  throw new Error('Unsupported image format')
}

function getPngChannelCount(buffer: Buffer): number {
  // PNG 文件头部的第25个字节是颜色类型
  const colorType = buffer[25];

  switch (colorType) {
    case 0: // Grayscale
      return 1;
    case 2: // RGB
      return 3;
    case 3: // Indexed-color
      return 1;
    case 4: // Grayscale with alpha
      return 2;
    case 6: // RGB with alpha
      return 4;
    default:
      throw new Error('Unsupported color type');
  }
}

function getJpegChannelCount(buffer: Buffer): number {
  let i = 0;
  while (i < buffer.length) {
    // 查找 JPEG 段标识符 (0xFF)
    if (buffer[i] === 0xFF) {
      const marker = buffer[i + 1];

      // SOF0 段标识符为 0xC0, 0xC1, 0xC2, 0xC3, etc.
      if (marker >= 0xC0 && marker <= 0xC3) {
        return buffer[i + 9]; // 第9字节是通道数
      }

      // 跳过段长度
      const segmentLength = buffer.readUInt16BE(i + 2);
      i += 2 + segmentLength;
    } else {
      i++;
    }
  }

  throw new Error('No SOF0 marker found in JPEG file');
}
