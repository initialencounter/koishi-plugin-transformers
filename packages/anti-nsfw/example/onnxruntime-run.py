
import onnxruntime as ort
import numpy as np
from PIL import Image

def softmax(x):
    e_x = np.exp(x - np.max(x))
    return e_x / e_x.sum()

def image_to_tensor(image_path):
    # 1. 打开图片并转换为RGB模式
    img = Image.open(image_path).convert("RGB")

    # 2. 调整尺寸为384x384
    img = img.resize((384, 384), Image.Resampling.LANCZOS)  # 高质量下采样

    # 3. 转换为numpy数组（形状：HWC格式[384, 384, 3]）
    img_array = np.array(img)

    # 4. 转换为CHW格式（通道优先）
    img_array = img_array.transpose(2, 0, 1)  # 现在形状是[3, 384, 384]

    # 5. 添加批次维度（NCHW格式）
    img_array = img_array[np.newaxis, ...]  # 形状变为[1, 3, 384, 384]

    # 6. 转换为float32并归一化到[0, 1]
    img_array = img_array.astype(np.float32) / 255.0

    return img_array


def createSession(model_path):
    # 创建ONNX推理会话
    session = ort.InferenceSession(model_path)
    return session


if __name__ == '__main__':
    try:
        model_path = 'C:/Users/29115/dev/koi/transformers/models/AdamCodd/vit-base-nsfw-detector/onnx/model_quantized_slimed.onnx'
        session = createSession(model_path)
        pixel_values = image_to_tensor('test.jpg')

        # 打印输入数据的形状，确认是否正确
        print(f"输入数据形状: {pixel_values.shape}")

        # 设置输入feeds
        input_name = 'pixel_values'
        feeds = {input_name: pixel_values}

        # 获取输出名称
        output_names = [output.name for output in session.get_outputs()]
        outputs = session.run(output_names, feeds)
        print("推理结果:")
        for i, output in enumerate(outputs):
            print(f"输出 {i}: 形状 {output.shape}")
            print(softmax(output))
    except Exception as e:
        print(f"推理出错: {e}")
