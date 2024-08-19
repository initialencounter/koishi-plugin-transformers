# koishi-plugin-florence

[![npm](https://img.shields.io/npm/v/koishi-plugin-florence?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-florence)

Powerful vision foundation model running locally in your koishi.

在您的 Koishi 上本地运行强大的视觉基础模型。

## 介绍

[Florence-2](https://huggingface.co/microsoft/Florence-2-large) 是一款先进的视觉基础模型，它采用基于提示的方法来处理各种视觉和视觉语言任务。Florence-2可以解释简单的文本提示，执行如标注、对象检测和分割等任务。它利用我们的FLD-5B数据集，该数据集包含1.26亿张图像上的54亿个注释，来掌握多任务学习。该模型的序列到序列架构使其在零样本学习和微调设置中都表现出色，证明它是一个有竞争力的视觉基础模型。

## 插件功能

https://github.com/xenova/transformers.js/issues/815#issuecomment-2184090182

## 配置

### 修改 [transformers.js](https://github.com/xenova/transformers.js) 模块代码

transformers.js 存在无法加载 florence 的bug
你需要在 `@huggingface/transformers/dist/transformers.mjs` 删掉第7472行，并加上这段代码
```javascript
let modelType = MODEL_TYPE_MAPPING.get(modelName);
if (modelType === undefined){
  modelType = 'Florence2ForConditionalGeneration'
}
```

### 下载模型

如果您的机器可以访问 huggingface， 则无需做此步骤

<details>
<summary>点我查看👈</summary>
找一个存放模型的目录 例如 `D:\models\florence`

前往 huggingface [下载模型](https://huggingface.co/onnx-community/Florence-2-base-ft)

#### 下载模型配置文件

你需要下载这些文件，保存到存放模型的目录

- config.json
- preprocessor_config.json
- generation_config.json
- tokenizer.json
- tokenizer_config.json


#### 下载 onnx

新建一个文件夹 命名为 `onnx`， 将以下模型放入 `onnx` 文件夹
如果你选择的模型 dtype 为 fp32 你需要下载这些模型

- decoder_model_merged.onnx
- embed_tokens.onnx
- encoder_model.onnx
- vision_encoder.onnx

如果你选择的模型 dtype 为 q8 你需要下载这些模型

- decoder_model_merged_quantized.onnx
- embed_tokens_quantized.onnx
- encoder_model_quantized.onnx
- vision_encoder_quantized.onnx

</details>

### 配置插件

如果您的机器可以访问 huggingface， 则无需做此步骤

<details>
<summary>点我查看👈</summary>

填写存放模型的路径 例如 `D:\models`

填写模型名称 `florence`

选择下载的模型的精度

</details>
