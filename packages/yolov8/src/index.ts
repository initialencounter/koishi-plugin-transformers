import { Context, Schema, Service } from 'koishi'
import type Jimp from 'jimp';
import { } from '@initencounter/jimp';
import * as ort from 'onnxruntime-node';
import { readFile } from 'fs/promises';
export const name = 'yolov8'

declare module 'cordis' {
  interface Context {
    yolov8: Yolov8Service
  }
}

declare module 'koishi' {
  interface Context {
    yolov8: Yolov8Service
  }
}

class Yolov8Service extends Service {
  static inject = {
    required: ['jimp'],
    optional: ['server', 'http']
  }
  classifier: ort.InferenceSession
  localConfig: Yolov8Service.Config
  constructor(ctx: Context, config: Yolov8Service.Config) {
    super(ctx, 'yolov8')
    this.localConfig = config
    ctx.on('ready', async () => {
      this.classifier = await ort.InferenceSession.create(config.onnxModelPath)
      ctx.logger(name).info('Model loaded')
    })
  }
  /**
   *
   * @param img base64 图片或者图片路径
   * @returns
   */
  public async predict(img: string) {
    let yoloClasses = this.config.yoloClasses
    let image = await imagePrepare(img, this.ctx)
    return predict(yoloClasses, this.classifier, image)
  }
}

namespace Yolov8Service {
  export interface Config {
    onnxModelPath: string
    yoloClasses: string[]
  }

  export const Config: Schema<Config> = Schema.object({
    onnxModelPath: Schema.string().default('best.onnx').description('onnx 模型路径'),
    yoloClasses: Schema.array(Schema.string()).default(
      ["9A", "3480", "CAO", "3481", "UN spec", "Blur", "9", "3091"]).description('yolo 类别'),
  })
}

export default Yolov8Service

async function imagePrepare(img: string, ctx: Context) {
  let imgBuffer: Buffer
  if (img.startsWith('file://')) {
    img = img.replace('file://', '')
    imgBuffer = await readFile(img)
  }
  if (img.startsWith('http')) {
    imgBuffer = Buffer.from(await ctx.http.get(img, { responseType: 'arraybuffer' }))
  }
  if (img.startsWith('data:image')) {
    imgBuffer = Buffer.from(img.split(',')[1], 'base64')
  }
  return await ctx.jimp.read(imgBuffer)
}

async function predict(yoloClasses: string[], session: ort.InferenceSession, image: Jimp) {
  const rowImageWidth = image.bitmap.width;
  const rowImageHeight = image.bitmap.height;
  const width = 640;
  const height = 640
  // 调整图片大小至 640x640
  image.resize(640, 640);
  // 获取图片的像素数据
  const imageData = image.bitmap.data; // 这是一个 Buffer，包含 RGBA 数据

  // 将图片数据转换为 Float32Array
  const inputData = new Float32Array(1 * 3 * 640 * 640);

  for (let i = 0; i < height; i++) {
    for (let j = 0; j < width; j++) {
      const pixelIndex = (i * width + j) * 4; // 每个像素有 4 个值（RGBA）
      const r = imageData[pixelIndex] / 255.0;     // R
      const g = imageData[pixelIndex + 1] / 255.0; // G
      const b = imageData[pixelIndex + 2] / 255.0; // B

      // 将数据填充到 inputData 中，布局为 [1, 3, 640, 640]
      inputData[i * width + j] = r;               // R 通道
      inputData[width * height + i * width + j] = g; // G 通道
      inputData[2 * width * height + i * width + j] = b; // B 通道
    }
  }

  const inputTensor = new ort.Tensor("float32", inputData, [1, 3, 640, 640]);
  const feeds = { "images": inputTensor };

  let res = await session.run(feeds)
  return process_output(res['output0']['data'], rowImageWidth, rowImageHeight, yoloClasses)
}

type BoundingBox = [number, number, number, number, string, number];

// https://github.com/ricin9/esp32cam-ws object_detection.js

/**
 * Function used to convert RAW output from YOLOv8 to an array of detected objects.
 * Each object contain the bounding box of this object, the type of object and the probability
 * @param output Raw output of YOLOv8 network
 * @param img_width Width of original image
 * @param img_height Height of original image
 * @returns Array of detected objects in a format [[x1,y1,x2,y2,object_type,probability],..]
 */
function process_output(output: number[], img_width: number, img_height: number, yolo_classes: string[]) {
  let boxes = [];
  for (let index = 0; index < 8400; index++) {
    const [class_id, prob] = [...Array(80).keys()]
      .map((col) => [col, output[8400 * (col + 4) + index]])
      .reduce((accum, item) => (item[1] > accum[1] ? item : accum), [0, 0]);
    if (prob < 0.5) {
      continue;
    }
    const label = yolo_classes[class_id];
    const xc = output[index];
    const yc = output[8400 + index];
    const w = output[2 * 8400 + index];
    const h = output[3 * 8400 + index];
    const x1 = ((xc - w / 2) / 640) * img_width;
    const y1 = ((yc - h / 2) / 640) * img_height;
    const x2 = ((xc + w / 2) / 640) * img_width;
    const y2 = ((yc + h / 2) / 640) * img_height;
    boxes.push([x1, y1, x2, y2, label, prob]);
  }

  boxes = boxes.sort((box1, box2) => box2[5] - box1[5]);
  const result = [];
  while (boxes.length > 0) {
    result.push(boxes[0]);
    boxes = boxes.filter((box) => iou(boxes[0], box) < 0.7);
  }
  return result;
}

/**
 * Function calculates "Intersection-over-union" coefficient for specified two boxes
 * https://pyimagesearch.com/2016/11/07/intersection-over-union-iou-for-object-detection/.
 * @param box1 First box in format: [x1,y1,x2,y2,object_class,probability]
 * @param box2 Second box in format: [x1,y1,x2,y2,object_class,probability]
 * @returns Intersection over union ratio as a float number
 */
function iou(box1: BoundingBox, box2: BoundingBox) {
  return intersection(box1, box2) / union(box1, box2);
}

/**
 * Function calculates union area of two boxes.
 *     :param box1: First box in format [x1,y1,x2,y2,object_class,probability]
 *     :param box2: Second box in format [x1,y1,x2,y2,object_class,probability]
 *     :return: Area of the boxes union as a float number
 * @param box1 First box in format [x1,y1,x2,y2,object_class,probability]
 * @param box2 Second box in format [x1,y1,x2,y2,object_class,probability]
 * @returns Area of the boxes union as a float number
 */
function union(box1: BoundingBox, box2: BoundingBox) {
  const [box1_x1, box1_y1, box1_x2, box1_y2] = box1;
  const [box2_x1, box2_y1, box2_x2, box2_y2] = box2;
  const box1_area = (box1_x2 - box1_x1) * (box1_y2 - box1_y1);
  const box2_area = (box2_x2 - box2_x1) * (box2_y2 - box2_y1);
  return box1_area + box2_area - intersection(box1, box2);
}

/**
 * Function calculates intersection area of two boxes
 * @param box1 First box in format [x1,y1,x2,y2,object_class,probability]
 * @param box2 Second box in format [x1,y1,x2,y2,object_class,probability]
 * @returns Area of intersection of the boxes as a float number
 */
function intersection(box1: BoundingBox, box2: BoundingBox) {
  const [box1_x1, box1_y1, box1_x2, box1_y2] = box1;
  const [box2_x1, box2_y1, box2_x2, box2_y2] = box2;
  const x1 = Math.max(box1_x1, box2_x1);
  const y1 = Math.max(box1_y1, box2_y1);
  const x2 = Math.min(box1_x2, box2_x2);
  const y2 = Math.min(box1_y2, box2_y2);
  return (x2 - x1) * (y2 - y1);
}
