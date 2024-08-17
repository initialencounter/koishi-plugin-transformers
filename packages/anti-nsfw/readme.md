# koishi-plugin-anti-nsfw

[![npm](https://img.shields.io/npm/v/koishi-plugin-anti-nsfw?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-anti-nsfw)

anti nsfw

撤回群友发送的 nsfw 图片

## 注意事项

该插件会增加 300MB 左右的内存占用

## 使用方法

如果你的机器无法访问 huggingface，请安装下面的步骤来配置插件



### 创建文件夹

找一个存放模型的目录，例如 `C:\Users\29115\Desktop\anti-nsfw`

在这个目录新建文件夹 `AdamCodd`

在 `AdamCodd` 新建文件夹 `vit-base-nsfw-detector`

在 `vit-base-nsfw-detector` 新建文件夹 `onnx`

### 放置模型

我将模型上传到了魔塔社区，如果访问不了下面的链接可以从这里下载 `https://modelscope.cn/models/initialencounter/vit-base-nsfw-detector/files`

将 https://huggingface.co/AdamCodd/vit-base-nsfw-detector/tree/main/onnx 仓库的 `model_quantized.onnx` 模型放到 `onnx` 文件夹下面

将 https://huggingface.co/AdamCodd/vit-base-nsfw-detector/tree/main/onnx 仓库的 `preprocessor_config.json` 和 `config.json` 放到  `vit-base-nsfw-detector` 文件夹下面

### 配置模型缓存路径

在 `anti-nsfw` 插件的 `cacheDir` 项填写 `C:\Users\29115\Desktop\anti-nsfw`

启用 `transformers` 插件和 `anti-nsfw` 插件
