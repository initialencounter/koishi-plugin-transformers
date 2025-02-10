import { readFileSync } from 'fs';
import { Context, Schema, Service, Session, h, Element, Dict } from 'koishi'
import type { } from '@koishijs/plugin-server'
import type { } from '@koishijs/plugin-http'
import { resolve } from 'path';
import type { } from '@koishijs/assets'
import Censor from '@koishijs/censor'
import { resizeImageBuffer, softmax, detectImageFormat } from './utils';
import * as ort from 'onnxruntime-node';
import { readFile } from 'fs/promises';
import type { } from 'koishi-plugin-adapter-onebot';

declare module 'koishi' {
  interface Context {
    'anti-nsfw': AntiNSFW
  }
}
class AntiNSFW extends Service {
  static inject = {
    optional: ['server', 'http', 'assets']
  }
  pluginConfig: AntiNSFW.Config
  ort: typeof ort
  session: typeof ort.InferenceSession
  constructor(ctx: Context, config: AntiNSFW.Config) {
    super(ctx, 'anti-nsfw')
    this.pluginConfig = config
    ctx.i18n.define('zh-CN', require('./locales/zh'))
    ctx.i18n.define('en-US', require('./locales/en'))
    ctx.on('ready', async () => {
      await this.init()
    })
    ctx.middleware(this.middleware.bind(this))
    this.applyRouter()
    this.applyCensorService()
  }
  private async init() {
    if (this.pluginConfig.runAs === 'client') {
      this.ctx.logger.info('客户端模式，无需加载模型')
      return
    }
    if (!this.pluginConfig.modelPath) {
      this.ctx.logger.warn('未配置模型路径')
      return
    }
    this.session = await ort.InferenceSession.create(this.pluginConfig.modelPath);
    if (!this.session) {
      this.ctx.logger.warn(`模型加载失败, 模型目录：${this.pluginConfig.modelPath}`)
    } else {
      this.ctx.logger.success(`模型加载成功, 模型目录：${this.pluginConfig.modelPath}`)
    }
  }

  async middleware(session: Session, next: () => any) {
    if (session.platform === 'onebot') {
      for (let i = 0; i < session.elements.length; i++) {
        if (session.elements[i].type === 'img') {
          const file = session.elements[i]?.attrs?.file
          if (!file) continue
          const img = await session.onebot._request('get_image', { file: session.elements[i].attrs.file })
          const mimeType = detectImageFormat(img.data.base64)
          const url = `data:${mimeType};base64,${img.data.base64}`
          session.elements[i].attrs.src = url
        }
      }
    }
    if (this.pluginConfig.runAs === 'server') {
      return next()
    }
    if (this.pluginConfig.nsfwChannel.includes(session.channelId)) {
      return next()
    }
    if (!this.session && this.pluginConfig.runAs === 'local') {
      this.ctx.logger.warn('The session is not ready yet. Please try again later.')
    }
    const scoreList: AntiNSFW.ClassifyResult[] = await this.classify(session)
    await this.parseResult(session, scoreList)
    return next()
  }

  async imageCensor(attrs: Dict): Promise<AntiNSFW.ClassifyResult> {
    let res = { sfw: 1, nsfw: 0 }
    if (!this.session) {
      return res
    }
    try {
      if (!attrs?.src) {
        return res
      }
      const url = (!attrs.src.startsWith('http') && this.ctx.assets) ? await this.ctx.assets.upload(attrs.src, '') : attrs.src
      const startTime = Date.now()

      let img: Buffer
      if (url.startsWith('file:///')) {
        img = await readFile(url.replace('file:///', ''))
      } else {
        img = Buffer.from(
          (await this.ctx.http('GET', url, {
            responseType: 'arraybuffer',
          })).data
        )
      }

      const feeds = await resizeImageBuffer(Buffer.from(img), 384, 384)
      res = await this.classifier(feeds)
      const endTime = Date.now()
      this.ctx.logger.info(`检测耗时：${endTime - startTime}ms`, res, url.slice(0, 100))
      return res
    } catch (e) {
      this.ctx.logger.error(e)
      return res
    }
  }

  async classify(session: Session): Promise<AntiNSFW.ClassifyResult[]> {
    let scoreList: AntiNSFW.ClassifyResult[] = []
    if (this.pluginConfig.runAs === 'client') {
      const attrs = session.elements.map(element => {
        if (element.type === 'img') {
          return element.attrs
        }
      })
      scoreList = (await this.ctx.http('POST', this.pluginConfig.endpoint, { data: { attrs } })).data
    } else {
      for (const img of session.elements) {
        if (img.type !== 'img') continue
        const res = await this.imageCensor(img.attrs)
        scoreList.push(res)
      }
    }
    return scoreList
  }

  async parseResult(session: Session, scoreList: AntiNSFW.ClassifyResult[]) {
    let infoText = `【${session.channelId} | ${session.userId}】：\n`
    let probabilityText = ''
    const nsfwImage: [string, string][] = []
    for (let i = 0; i < scoreList.length; i++) {
      const res = scoreList[i]
      infoText += `第 ${i + 1} 张图片：${res.nsfw > res.sfw ? 'NSFW' : 'SFW'}(${res.nsfw.toFixed(2)})\n`
      if (res.nsfw > this.pluginConfig.score) {
        nsfwImage.push([session.elements[i].attrs.src, res.nsfw.toFixed(2)])
        probabilityText += `(${i + 1}) ${res.nsfw.toFixed(2)} `
      }
    }
    this.ctx.logger.info(infoText)
    if (this.pluginConfig.censorsList.length) await this.sendToCensors(session, nsfwImage)
    if (!probabilityText) return
    const resText = session.text('services.anti-nsfw.messages.nsfw', [probabilityText, this.pluginConfig.atNsfwAuthor ? h.at(session.userId) : ''])
    if (this.pluginConfig.deleteNsfw) session.bot.deleteMessage(session.channelId, session.messageId)
    if (this.pluginConfig.sendDetectInfo) session.send((this.pluginConfig.quoteSourceMessage ? h.quote(session.messageId) : '') + resText)
  }

  async sendToCensors(session: Session, nsfwImage: [string, string][]) {
    const result = h('figure')
    const attrs: Dict = {
      userId: session.userId,
      nickname: session.author.name || session.username,
    };
    const channelName = (await session.bot.getChannel(session.channelId)).name
    for (const [src, score] of nsfwImage) {
      result.children.push(
        h('img', { src, attrs }),
        h("message", attrs, session.text('services.anti-nsfw.messages.censorInfo', [score, `@${session.author.name}(${session.author.id}) | ${channelName}`])),
      )
    }
    for (const censor of this.pluginConfig.censorsList) {
      const { channelId, platform, selfId, guildId } = censor
      const bot = this.ctx.bots[`${platform}:${selfId}`]
      bot.sendMessage(channelId, result, guildId)
    }
  }
  /**
   *
   * @param imageData 384 * 384 * 4 的图片 Buffer 数据
   * @returns
   */
  async classifier(imageData: Buffer): Promise<AntiNSFW.ClassifyResult> {
    const pixel_values = this.bufferToTensor(imageData)
    const feeds = { pixel_values };
    const res = await this.session.run(feeds)
    const output = softmax(res.logits.data)
    return {
      sfw: output[0],
      nsfw: output[1]
    }
  }

  /**
   *
   * @param imageData 384 * 384 * 3 的图片 Buffer 数据
   * @returns
   */
  bufferToTensor(imageData: Buffer): ort.Tensor {
    const width = 384;
    const height = 384;
    const inputData = new Float32Array(1 * 3 * width * height);
    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        const pixelIndex = (i * width + j) * 3; // 每个像素有 3 个值（RGB），jimp 输出是 RGBA，如果使用jimp处理图像，这里需要改为 4
        const r = imageData[pixelIndex] / 255.0;     // R
        const g = imageData[pixelIndex + 1] / 255.0; // G
        const b = imageData[pixelIndex + 2] / 255.0; // B

        // 将数据填充到 inputData 中，布局为 [1, 3, 640, 640]
        inputData[i * width + j] = r;               // R 通道
        inputData[width * height + i * width + j] = g; // G 通道
        inputData[2 * width * height + i * width + j] = b; // B 通道
      }
    }
    return new ort.Tensor("float32", inputData, [1, 3, 384, 384]);
  }

  private applyRouter() {
    if (!this.ctx.server) {
      this.ctx.logger.info('未实现 Server 服务，跳过路由注册')
      return
    }
    if (this.pluginConfig.runAs !== 'server') {
      this.ctx.logger.info('非 Server 模式，跳过路由注册')
      return
    }
    this.ctx.server.post(this.pluginConfig.implServerPath, async (ctx2) => {
      if (!this.session) {
        ctx2.status = 500
        ctx2.body = 'The session is not ready yet. Please try again later.'
      }
      const attrsArray = ctx2.request.body['attrs']
      let results: AntiNSFW.ClassifyResult[] = []
      for (const attrs of attrsArray) {
        const res = await this.imageCensor(attrs)
        results.push(res)
      }
      ctx2.status = 200
      ctx2.body = results
    })
  }
  private applyCensorService() {
    if (this.pluginConfig.runAs === 'client') {
      this.ctx.logger.info('客户端模式，无需实现 Censor 服务')
      return
    }
    this.ctx.plugin(Censor)
    this.ctx.get('censor').intercept({
      async img(attrs) {
        const res: AntiNSFW.ClassifyResult = await this.imageCensor(attrs)
        if (res.nsfw > this.pluginConfig.score) return ''
        return Element('img', attrs)
      }
    })
  }
}

namespace AntiNSFW {
  export const name = 'anti-nsfw'
  export const usage = readFileSync(resolve(__dirname, "../readme.md")).toString('utf-8')
  export interface Feeds { pixel_values: any }
  export interface ClassifyResult {
    sfw: number
    nsfw: number
  }
  export interface Config {
    implServerPath?: string
    modelPath?: string
    score?: number
    nsfwChannel?: string[]
    runAs: 'client' | 'server' | 'local'
    endpoint?: string
    deleteNsfw?: boolean
    sendDetectInfo?: boolean
    quoteSourceMessage?: boolean
    atNsfwAuthor?: boolean
    censorsList?: Rule[]
  }
  export interface Rule {
    platform: string
    channelId: string
    selfId?: string
    guildId?: string
  }

  export const Rule: Schema<Rule> = Schema.object({
    platform: Schema.string().description('平台名称。').required(),
    channelId: Schema.string().description('频道 ID。').required(),
    guildId: Schema.string().description('群组 ID。（可不填）'),
    selfId: Schema.string().description('机器人 ID。'),
  })

  export const Config: Schema<Config> = Schema.intersect([
    Schema.object({
      runAs: Schema.union(['local', 'client', 'server',]).default('local').description('运行模式'),
    }),
    Schema.union([
      Schema.object({
        runAs: Schema.const('local'),
        modelPath: Schema.string().required().default('models/AdamCodd/vit-base-nsfw-detector/onnx/model_quantized.onnx').description('onnx 模型路径'),
        score: Schema.number().role('slider').min(0).max(1).step(0.01).default(0.8).description('nsfw 判定概率，超过这个值则视为 nsfw'),
        nsfwChannel: Schema.array(Schema.string()).default([]).description('允许发送 nsfw 图片的频道'),
        deleteNsfw: Schema.boolean().default(true).description('是否撤回 nsfw 图片'),
        quoteSourceMessage: Schema.boolean().default(true).description('是否引用原消息'),
        atNsfwAuthor: Schema.boolean().default(true).description('是否 @ 发送 nsfw 图片的用户'),
        sendDetectInfo: Schema.boolean().default(true).description('是否发送检测信息'),
        censorsList: Schema.array(Rule).default([]).description('审查人列表, 可通过 `inspect` 命令获取'),
      }),
      Schema.object({
        runAs: Schema.const('server'),
        modelPath: Schema.string().required().default('models/AdamCodd/vit-base-nsfw-detector/onnx/model_quantized.onnx').description('onnx 模型路径'),
        implServerPath: Schema.string().default('/nsfw-detect').description('服务端路径'),
      }),
      Schema.object({
        runAs: Schema.const('client'),
        endpoint: Schema.string().default('http://127.0.0.1:5141/nsfw-detect').description('服务端地址'),
        score: Schema.number().role('slider').min(0).max(1).step(0.01).default(0.8).description('nsfw 判定概率，超过这个值则视为 nsfw'),
        nsfwChannel: Schema.array(Schema.string()).default([]).description('允许发送 nsfw 图片的频道'),
        deleteNsfw: Schema.boolean().default(true).description('是否撤回 nsfw 图片'),
        quoteSourceMessage: Schema.boolean().default(true).description('是否引用原消息'),
        atNsfwAuthor: Schema.boolean().default(true).description('是否 @ 发送 nsfw 图片的用户'),
        sendDetectInfo: Schema.boolean().default(true).description('是否发送检测信息'),
        censorsList: Schema.array(Rule).default([]).description('审查人列表, 可通过 `inspect` 命令获取'),
      }),
    ]),
  ])
}


export default AntiNSFW
