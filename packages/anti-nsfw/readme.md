# koishi-plugin-anti-nsfw

[![npm](https://img.shields.io/npm/v/koishi-plugin-anti-nsfw?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-anti-nsfw)

撤回 nsfw 图片

## 介绍

该插件会在你的 Koishi 中运行一个 [onnx](https://huggingface.co/AdamCodd/vit-base-nsfw-detector)，使用中间件接收图片
预测收到的图片是否为 `nsfw` 图片，并撤回 `nsfw` 图片

预测的准确率为 [0.9654](https://huggingface.co/AdamCodd/vit-base-nsfw-detector)

## 配置

### 下载模型

如果您的机器可以访问 huggingface， 则无需做此步骤

<details>
<summary>点我查看👈</summary>

前往 huggingface [下载模型](https://huggingface.co/AdamCodd/vit-base-nsfw-detector)

同时，我将模型上传到了魔塔社区，如果访问不了 huggingface 可以从[这里👈](https://modelscope.cn/models/initialencounter/vit-base-nsfw-detector/files)下载

#### 下载模型配置文件

找一个存放模型的目录 例如 `D:\models\AdamCodd\vit-base-nsfw-detector`

你需要下载这些文件，保存到 `vit-base-nsfw-detector` 文件夹

- config.json
- preprocessor_config.json

#### 下载 onnx

新建一个文件夹 命名为 `onnx`， 将以下模型放入 `onnx` 文件夹

- model_quantized.onnx


</details>

### 配置插件

如果您的机器可以访问 huggingface， 则无需做此步骤

<details>
<summary>点我查看👈</summary>

填写存放模型的路径 例如 `D:\models`

填写模型名称 `AdamCodd\vit-base-nsfw-detector`

启用 `transformers` 插件和 `anti-nsfw` 插件

</details>

# 运行模式

## 将插件作为后端（只提供API，不能主动检测NSFW图片）

运行模式 runAs 选为 server
填写模型的路径和名称，其他都一样启动就行

## 将插件作为客户端（请求服务器，本地无需运行模型）

选择 runAs 为 client
填写endpoint

## 本地运行插件（直接在本地运行模型，不提供API）
