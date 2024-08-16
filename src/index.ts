import { Context, Schema, Service } from 'koishi'
import type { PipelineType } from '@xenova/transformers';
import { resolve } from 'path';

export const name = 'transformers'

declare module 'koishi' {
  interface Context {
    pipeline: Pipeline
  }
}
class Pipeline extends Service {
  pluginConfig: Pipeline.Config
  constructor(ctx: Context, config: Pipeline.Config) {
    super(ctx, 'pipeline', true)
    this.pluginConfig = config
  }

  async getInstance(task: PipelineType, model: string, progress_callback = null,) {
    // Dynamically import the Transformers.js library
    let { pipeline, env } = await import('@xenova/transformers');
    let absPath = resolve(this.pluginConfig.cacheDir);
    // NOTE: Uncomment this to change the cache directory
    this.ctx.logger.info('Pipeline service initialized cache dir:', absPath)
    env.cacheDir = absPath;
    return pipeline(task, model, { progress_callback });
  }
}

namespace Pipeline {
  export interface Config {
    cacheDir: string
  }

  export const Config: Schema<Config> = Schema.object({
    cacheDir: Schema.string().default('node_modules/@xenova/transformers/.cache').description('onnx 模型的缓存目录，填写绝对路径或相对于 koishi 根目录的路径'),
  })
}

export default Pipeline
