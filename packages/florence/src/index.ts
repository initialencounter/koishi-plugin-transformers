import { readFileSync } from 'fs'
import { Context, Schema, Session, h } from 'koishi'
import { } from 'koishi-plugin-transformers'
import { } from '@initencounter/jimp'
import type { RawImage } from '@huggingface/transformers'
import { resolve } from 'path'

export const name = 'florence'
export const inject = {
  required: ['transformers', 'jimp']
}

export const usage = readFileSync(resolve(__dirname, "../readme.md")).toString('utf-8')
export interface Config {
  cacheDir: string
  model: string
  dtype: 'fp32' | 'q8'
  max_new_tokens: number
}
export const Config: Schema<Config> = Schema.object({
  cacheDir: Schema.string().default('').description('缓存目录'),
  model: Schema.string().default('onnx-community/Florence-2-base-ft').description('模型名称'),
  dtype: Schema.union([
    Schema.const('fp32'),
    Schema.const('q8'),
  ]).default('fp32').description('模型精度'),
  max_new_tokens: Schema.number().default(100).description('最大生成长度')
})

export function apply(ctx: Context, config: Config) {
  let model = null
  let processor = null
  let tokenizer = null
  ctx.on('ready', async () => {
    model = await ctx.transformers.getFlorence2ForConditionalGeneration(config.model, config.cacheDir, { dtype: config.dtype })
    processor = await ctx.transformers.getAutoProcessor(config.model, config.cacheDir)
    tokenizer = await ctx.transformers.getAutoTokenizer(config.model, config.cacheDir)
    if (!model) {
      ctx.logger(name).warn(`模型加载失败, 名称：${config.model}, 缓存目录：${config.cacheDir}, 精度：${config.dtype}`)
    } else {
      ctx.logger(name).success('模型加载成功')
    }
  })

  ctx.command('florence <text:text>', '使用 florence 进行对话').action(async ({ session }, text) => {
    if (!model) {
      return '模型加载失败，请稍后再试'
    }
    // vision input
    const image = await selectImage(ctx, session)
    if (!image) {
      return '未找到图片'
    }
    const task = text ?? '<MORE_DETAILED_CAPTION>'
    let result = await handleTask(task, image)
    return h.quote(session.messageId) + result
  })

  ctx.middleware(async (session, next) => {
    if (!session.content.startsWith('florence')) {
      return next()
    }
    if (!model) {
      return next()
    }
    const image = await selectImage(ctx, session)
    if (!image) {
      return '未找到图片'
    }
    const task = session.content.replace('florence', '') ?? '<MORE_DETAILED_CAPTION>'
    let result = await handleTask(task, image)
    return h.quote(session.messageId) + result
  })

  async function handleTask(task: string, image: RawImage) {
    // vision input
    const vision_inputs = await processor(image)

    const prompts = processor.construct_prompts(task)
    const text_inputs = tokenizer(prompts)

    // Generate text
    const generated_ids = await model.generate({
      ...text_inputs,
      ...vision_inputs,
      max_new_tokens: 100,
    })

    const generated_text = tokenizer.batch_decode(generated_ids, { skip_special_tokens: false })[0]
    const result = processor.post_process_generation(generated_text, task, image.size)
    return result
  }
}


async function selectImage(ctx: Context, session: Session): Promise<RawImage> {
  let image: RawImage = null
  let imgH = selectImageH(session.elements)
  if (!imgH) {
    imgH = selectImageH(session.quote.elements)
  }
  if (!imgH) {
    return image
  }
  let imgURL = imgH.attrs.src
  if (imgURL.startsWith('http')) {
    image = await ctx.transformers.newRawImageFromURL(imgURL)
  }

  if (imgURL.startsWith('file://')) {
    imgURL = imgURL.replace('file://', '')
    let imgBuffer = readFileSync(imgURL)
    let mimeType = imgURL.split('.').pop()
    if (!['jpg', 'jpeg', 'png'].includes(mimeType)) {
      return null
    }
    image = await RawImageFromBuffer(ctx, mimeType, imgBuffer)
  }

  if (imgURL.startsWith('data:image')) {
    let imgBase64 = imgURL.split(',')[1]
    const imgBuffer = Buffer.from(imgBase64, 'base64')
    image = await RawImageFromBuffer(ctx, imgBase64, imgBuffer)
  }

  return image
}

async function RawImageFromBuffer(ctx: Context, imgBase64: string, imgBuffer: Buffer) {
  // bug only support 4 channels
  // const channels = getChannelCount(imgBase64, imgBuffer)
  const jimp = await ctx.jimp.read(imgBuffer)
  const imgUint8Array = new Uint8Array(jimp.bitmap.data)
  const width = jimp.bitmap.width
  const height = jimp.bitmap.height
  return await ctx.transformers.newRawImage(imgUint8Array, width, height, 4)
}

function selectImageH(elements: h[]): h {
  for (let i = 0; i < elements.length; i++) {
    if (['img'].includes(elements[i].attrs.type)) {
      return elements[i]
    }
  }
  return null
}
