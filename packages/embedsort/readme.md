# koishi-plugin-embedsort

[![npm](https://img.shields.io/npm/v/koishi-plugin-embedsort?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-embedsort)

嵌入文本检索，设置一个嵌入文本，插件会根据输入的文本语义来检索最合适的文本进行回复

## 注意事项

该插件会增加 1.4GB 左右的内存占用

## 使用方法

如果你的机器无法访问 huggingface，请安装下面的步骤来配置插件

### 设置嵌入文本

将所有要检索的文本用换行分开保存到一个 .txt 文件

然后在 `embedTexts` 配置项填入 .txt 文件的路径


## 放置模型


我将模型上传到了魔塔社区，如果访问不了下面的链接可以从这里下载 `https://modelscope.cn/models/initialencounter/bge-large-zh-v1.5/files`

### 一键拉取模型（需要安装 git lfs）

```shell
git clone https://www.modelscope.cn/initialencounter/bge-base-zh-v1.5.git
```

拉取完成后直接填写只需要这样填写配置:

```json
{
  "model": "bge-base-zh-v1.5",
  "cacheDir": "仓库所在路径"
}
```

### 手动配置

找一个存放模型的目录，例如 `C:\Users\29115\Desktop\embedsort`

在这个目录新建文件夹 `Xenova`

在 `Xenova` 新建文件夹 `bge-large-zh-v1.5`

在 `bge-large-zh-v1.5` 新建文件夹 `onnx`

将 https://huggingface.co/Xenova/bge-large-zh-v1.5/tree/main/onnx 仓库的 `model_quantized.onnx` 模型放到 `onnx` 文件夹下面

将 https://huggingface.co/Xenova/bge-large-zh-v1.5/tree/main/onnx 仓库的

`quantize_config.json`
`configuration.json`
`special_tokens_map.json`
`tokenizer.json`
`tokenizer_config.json`
`vocab.txt`
`config.json`

放到 `bge-large-zh-v1.5` 文件夹下面

### 配置模型缓存路径

在 `embedsort` 插件的 `cacheDir` 项填写 `C:\Users\29115\Desktop\embedsort`

启用 `transformers` 插件和 `embedsort` 插件
