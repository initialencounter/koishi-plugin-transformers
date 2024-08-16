import { Context, Schema, Service } from 'koishi';
import type { PipelineType } from '@xenova/transformers';
export declare const name = "transformers";
declare module 'koishi' {
    interface Context {
        pipeline: Pipeline;
    }
}
declare class Pipeline extends Service {
    pluginConfig: Pipeline.Config;
    constructor(ctx: Context, config: Pipeline.Config);
    getInstance(task: PipelineType, model: string, progress_callback?: any): Promise<import("@xenova/transformers").TextClassificationPipeline | import("@xenova/transformers").TokenClassificationPipeline | import("@xenova/transformers").QuestionAnsweringPipeline | import("@xenova/transformers").FillMaskPipeline | import("@xenova/transformers").SummarizationPipeline | import("@xenova/transformers").TranslationPipeline | import("@xenova/transformers").Text2TextGenerationPipeline | import("@xenova/transformers").TextGenerationPipeline | import("@xenova/transformers").ZeroShotClassificationPipeline | import("@xenova/transformers").AudioClassificationPipeline | import("@xenova/transformers").ZeroShotAudioClassificationPipeline | import("@xenova/transformers").AutomaticSpeechRecognitionPipeline | import("@xenova/transformers").TextToAudioPipeline | import("@xenova/transformers").ImageToTextPipeline | import("@xenova/transformers").ImageClassificationPipeline | import("@xenova/transformers").ImageSegmentationPipeline | import("@xenova/transformers").ZeroShotImageClassificationPipeline | import("@xenova/transformers").ObjectDetectionPipeline | import("@xenova/transformers").ZeroShotObjectDetectionPipeline | import("@xenova/transformers").DocumentQuestionAnsweringPipeline | import("@xenova/transformers").ImageToImagePipeline | import("@xenova/transformers").DepthEstimationPipeline | import("@xenova/transformers").FeatureExtractionPipeline | import("@xenova/transformers").ImageFeatureExtractionPipeline>;
}
declare namespace Pipeline {
    interface Config {
        cacheDir: string;
    }
    const Config: Schema<Config>;
}
export default Pipeline;
