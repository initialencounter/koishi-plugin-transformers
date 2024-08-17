import { Context, Schema, Service } from 'koishi'
import type { RawImage, AllTasks, PipelineType, PretrainedOptions, env } from '@xenova/transformers';
import { resolve } from 'path';
import { readFileSync } from 'fs';

export const name = 'transformers'

declare module 'koishi' {
  interface Context {
    transformers: Transformers
  }
}
class Transformers extends Service {
  pipeline: <T extends PipelineType>(
    task: T,
    model?: string,
    pretrainedOptions?: PretrainedOptions) => Promise<AllTasks[T]>
  env: typeof env
  RawImage: typeof RawImage
  constructor(ctx: Context) {
    super(ctx, 'transformers', true)
  }

  async init() {
    let { pipeline, env, RawImage } = await import('@xenova/transformers');
    this.pipeline = pipeline;
    this.env = env;
    this.RawImage = RawImage;
  }

  async newRawImage(img: Uint8Array, width: number, height: number, channels: 1 | 2 | 3 | 4): Promise<RawImage> {
    if (!this.RawImage) {
      await this.init()
    }
    return new this.RawImage(img, width, height, channels)
  }
  async getPipeline(task: PipelineType, model: string, cacheDir: string, pretrainedOptions?: PretrainedOptions) {
    if (!this.pipeline) {
      await this.init()
    }
    let absPath = resolve(cacheDir);
    // NOTE: Uncomment this to change the cache directory
    this.ctx.logger('transformers').info('Loading model from cache directory:', absPath);
    this.env.cacheDir = absPath;
    try {
      let pipe = this.pipeline(task, model, pretrainedOptions);
      this.ctx.logger('transformers').success('Pipeline service initialized:', absPath)
      return pipe
    }
    catch (e) {
      this.ctx.logger('transformers').error('load model failed:', absPath);
      return null;
    }
  }
}

namespace Transformers {
  export const usage = readFileSync(resolve(__dirname, "../readme.md")).toString('utf-8')
  export interface Config { }
  export const Config: Schema<Config> = Schema.object({})
}

export default Transformers
