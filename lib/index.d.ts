import { Context, Schema, Service } from 'koishi';
import type { RawImage, AllTasks, PipelineType, PretrainedOptions, env } from '@xenova/transformers';
export declare const name = "transformers";
declare module 'koishi' {
    interface Context {
        transformers: Transformers;
    }
}
declare class Transformers extends Service {
    pipeline: <T extends PipelineType>(task: T, model?: string, pretrainedOptions?: PretrainedOptions) => Promise<AllTasks[T]>;
    env: typeof env;
    RawImage: typeof RawImage;
    constructor(ctx: Context);
    newRawImage(img: Uint8Array, width: number, height: number, channels: 1 | 2 | 3 | 4): Promise<RawImage>;
    getPipeline(task: PipelineType, model: string, cacheDir: string, pretrainedOptions?: PretrainedOptions): Promise<import("@xenova/transformers").TextClassificationPipeline | import("@xenova/transformers").TokenClassificationPipeline | import("@xenova/transformers").QuestionAnsweringPipeline | import("@xenova/transformers").FillMaskPipeline | import("@xenova/transformers").SummarizationPipeline | import("@xenova/transformers").TranslationPipeline | import("@xenova/transformers").Text2TextGenerationPipeline | import("@xenova/transformers").TextGenerationPipeline | import("@xenova/transformers").ZeroShotClassificationPipeline | import("@xenova/transformers").AudioClassificationPipeline | import("@xenova/transformers").ZeroShotAudioClassificationPipeline | import("@xenova/transformers").AutomaticSpeechRecognitionPipeline | import("@xenova/transformers").TextToAudioPipeline | import("@xenova/transformers").ImageToTextPipeline | import("@xenova/transformers").ImageClassificationPipeline | import("@xenova/transformers").ImageSegmentationPipeline | import("@xenova/transformers").ZeroShotImageClassificationPipeline | import("@xenova/transformers").ObjectDetectionPipeline | import("@xenova/transformers").ZeroShotObjectDetectionPipeline | import("@xenova/transformers").DocumentQuestionAnsweringPipeline | import("@xenova/transformers").ImageToImagePipeline | import("@xenova/transformers").DepthEstimationPipeline | import("@xenova/transformers").FeatureExtractionPipeline | import("@xenova/transformers").ImageFeatureExtractionPipeline>;
}
declare namespace Transformers {
    const usage: string;
    interface Config {
    }
    const Config: Schema<Config>;
}
export default Transformers;
