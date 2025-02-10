# koishi-plugin-anti-nsfw

[![npm](https://img.shields.io/npm/v/koishi-plugin-anti-nsfw?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-anti-nsfw)

反NSFW和图片审核服务

## 介绍

该插件会在你的 Koishi 中运行一个 [onnx](https://huggingface.co/AdamCodd/vit-base-nsfw-detector)，使用中间件接收图片
预测收到的图片是否为 `NSFW` 图片，并撤回 `NSFW` 图片

预测的准确率为 [0.9654](https://huggingface.co/AdamCodd/vit-base-nsfw-detector)

## 配置

### 下载模型

<details>
<summary>点我查看👈</summary>

前往 huggingface [下载模型](https://huggingface.co/AdamCodd/vit-base-nsfw-detector)

同时，我将模型上传到了魔塔社区，如果访问不了 huggingface 可以从[这里👈](https://modelscope.cn/models/initialencounter/vit-base-nsfw-detector/files)下载

打开 onnx 目录，随便下载一个，报错到 Koishi 可以读取到的目录。

- model.onnx (精度最好，但体积太大了，没必要)
- model_quantized.onnx (推荐下载)

</details>

### 配置插件

- modelPath 填写 onnx 模型路径

# 运行模式

## 将插件作为后端（只提供API，不能主动检测NSFW图片）

运行模式 runAs 选为 server
填写模型的路径和名称，其他都一样启动就行

## 将插件作为客户端（请求服务器，本地无需运行模型）

选择 runAs 为 client
填写endpoint

## 本地运行插件（直接在本地运行模型，不提供API）

# 本地化配置

前往[本地化](/locales/services/anti-nsfw)

# 更新日志

<details>
<summary>点我查看👈</summary>
- v0.0.6 (2025-02-10)
  - 修复日志输出
- v0.0.5 (2025-02-10)
  - 本地化支持
  - 将 NSFW 图片转为聊天记录，并发送到指定的频道
- v0.0.4 (2025-02-09)
  - 直接使用 onnxruntime 推理
  - 实现 censor 服务
- v0.0.3
</details>
