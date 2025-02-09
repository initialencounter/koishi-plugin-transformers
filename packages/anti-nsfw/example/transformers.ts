import jimp from 'jimp';

// Function to fetch and classify an image from a URL
async function classifyImage(path) {
  const { pipeline, env, RawImage } = await import('@huggingface/transformers');
  // Since we will download the model from HuggingFace Hub, we can skip the local model check
  env.allowLocalModels = true;
  env.allowRemoteModels = false;
  // pull model
  // git clone https://huggingface.co/AdamCodd/vit-base-nsfw-detector
  // git clone https://modelscope.cn/models/initialencounter/vit-base-nsfw-detector
  env.localModelPath = './models';

  // Load the image classification model
  const classifier = await pipeline('image-classification', 'AdamCodd/vit-base-nsfw-detector');
  try {
    let img = await jimp.read(path);
    img.resize(384, 384);
    const input = new RawImage(img.bitmap.data, img.bitmap.width, img.bitmap.height, 4); // Load the image
    const classificationResults = await classifier([input]); // Classify the image
    console.log('Predicted class: ', classificationResults);
  } catch (error) {
    console.error('Error classifying image:', error);
  }
}

// Example usage
classifyImage('test.jpg');

// node -r esbuild-register packages\anti-nsfw\example\transformers.ts
