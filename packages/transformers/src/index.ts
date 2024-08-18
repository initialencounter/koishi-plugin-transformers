import { Context, Schema, Service } from 'koishi'
import type {
  RawImage, AllTasks, PipelineType, PretrainedOptions, env,
  Florence2ForConditionalGeneration,
  AutoProcessor,
  AutoTokenizer,
} from '@huggingface/transformers';
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
  Florence2ForConditionalGeneration: typeof Florence2ForConditionalGeneration
  AutoProcessor: typeof AutoProcessor
  AutoTokenizer: typeof AutoTokenizer
  constructor(ctx: Context) {
    super(ctx, 'transformers', true)
  }

  async init() {
    let { pipeline, env, RawImage,
      Florence2ForConditionalGeneration,
      AutoProcessor,
      AutoTokenizer,
    } = await import('@huggingface/transformers');
    this.pipeline = pipeline;
    this.env = env;
    this.RawImage = RawImage;
    this.Florence2ForConditionalGeneration = Florence2ForConditionalGeneration;
    this.AutoProcessor = AutoProcessor;
    this.AutoTokenizer = AutoTokenizer
  }

  async newRawImage(img: Uint8Array, width: number, height: number, channels: 1 | 2 | 3 | 4): Promise<RawImage> {
    if (!this.RawImage) {
      await this.init()
    }
    return new this.RawImage(img, width, height, channels)
  }

  async newRawImageFromURL(url: string): Promise<RawImage> {
    return await this.RawImage.fromURL(url);
  }

  async getPipeline(task: PipelineType, model: string, cacheDir: string, pretrainedOptions?: PretrainedOptions) {
    if (!this.pipeline) {
      await this.init()
    }
    console.log('getPipeline', task, model, cacheDir, pretrainedOptions)
    if (cacheDir) {
      let absPath = resolve(cacheDir);
      this.ctx.logger('transformers').info('Loading model from cache directory:', absPath);
      this.env.cacheDir = absPath;
    }
    try {
      let pipe = this.pipeline(task, model, pretrainedOptions);
      return pipe
    }
    catch (e) {
      return null;
    }
  }

  async getFlorence2ForConditionalGeneration(model: string, cacheDir: string, pretrainedOptions?: { dtype: 'fp32' | 'q8' }) {
    if (!this.Florence2ForConditionalGeneration) {
      await this.init()
    }
    if (cacheDir) {
      let absPath = resolve(cacheDir);
      this.ctx.logger('transformers').info('Loading model from cache directory:', absPath);
      this.env.cacheDir = absPath;
    }
    try {
      let pipe = this.Florence2ForConditionalGeneration.from_pretrained(model, pretrainedOptions);
      return pipe
    }
    catch (e) {
      return null;
    }
  }

  async getAutoProcessor(model: string, cacheDir: string) {
    if (!this.AutoProcessor) {
      await this.init()
    }
    if (cacheDir) {
      let absPath = resolve(cacheDir);
      this.ctx.logger('transformers').info('Loading model from cache directory:', absPath);
      this.env.cacheDir = absPath;
    }
    try {
      let pipe = this.AutoProcessor.from_pretrained(model);
      return pipe
    }
    catch (e) {
      return null;
    }
  }
  async getAutoTokenizer(model: string, cacheDir: string) {
    if (!this.AutoTokenizer) {
      await this.init()
    }
    if (cacheDir) {
      let absPath = resolve(cacheDir);
      this.ctx.logger('transformers').info('Loading model from cache directory:', absPath);
      this.env.cacheDir = absPath;
    }
    try {
      let pipe = this.AutoTokenizer.from_pretrained(model);
      return pipe
    }
    catch (e) {
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
