import * as ort from 'onnxruntime-node';
import jimp from 'jimp'

let modelPath = 'models/AdamCodd/vit-base-nsfw-detector/onnx/model_quantized_slimed.onnx';

async function classifyImage(url) {
  // Load the image classification model
  const classifier = await ort.InferenceSession.create(modelPath);
  try {
    const img = await imagePrepare(url); // Ensure the image is loaded
    const classificationResults = await classifier.run(img); // Classify the image
    const label = softmax(classificationResults.logits.data);
    console.log('Predicted class: ', `sfw: ${label[0]}, nsfw: ${label[1]}`);
  } catch (error) {
    console.error('Error classifying image:', error);
  }
}
function softmax(arr) {
  const expValues = arr.map(x => Math.exp(x));
  const sumExpValues = expValues.reduce((sum, val) => sum + val, 0);
  return expValues.map(val => val / sumExpValues);
}
async function imagePrepare(img) {
  const image = await jimp.read(img)
  const width = 384;
  const height = 384;
  // 调整图片大小至 640x640
  image.resize(width, width);
  // 获取图片的像素数据
  const imageData = image.bitmap.data; // 这是一个 Buffer，包含 RGBA 数据

  // 将图片数据转换为 Float32Array
  const inputData = new Float32Array(1 * 3 * width * height);

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
  const pixel_values = new ort.Tensor("float32", inputData, [1, 3, 384, 384]);
  const feeds = { pixel_values };
  return feeds;
}
classifyImage("D:\\40P\\(21).jpg");

// node -r esbuild-register packages\anti-nsfw\example\onnxruntime-node.ts
