import { Context } from 'koishi'
import { exit } from 'process'
import Pipeline from 'koishi-plugin-transformers'

const app = new Context()

app.plugin(Pipeline);


(async () => {
  await app.start()
  const classifier = await app.pipeline.getInstance('image-classification','AdamCodd/vit-base-nsfw-detector')
  let start = Date.now()
  // @ts-ignore
  let res = await classifier('https://v2.api-m.com/api/heisi?return=302')
  let end = Date.now()
  console.log(`Time taken: ${end - start}ms`)
  console.log(res)
})()

