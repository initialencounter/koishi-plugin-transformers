import { Context } from 'koishi'
import Transformers from 'koishi-plugin-transformers'
import type { ImageClassificationPipeline, RawImage } from '@xenova/transformers';
import { readFileSync } from 'fs';

const app = new Context();

app.plugin(Transformers);


(async () => {
  await app.start()
  app.inject(['transformers'], async () => {
    // @ts-ignore
    const classifier: ImageClassificationPipeline = await app.transformers.getPipeline(
      'image-classification',
      'AdamCodd/vit-base-nsfw-detector',
      'C:\\Users\\29115\\Desktop\\.cache'
    )
    let start = Date.now()
    let res = await classifier(['C:\\Users\\29115\\dev\\koi\\2022-12-24\\external\\transformers\\test\\test2.jpg'])
    let end = Date.now()
    console.log(`Time taken: ${end - start}ms`)
    console.log(res)
  })
})()

