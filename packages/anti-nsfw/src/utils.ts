
import sharp from 'sharp';

// import jimp from 'jimp';
// async function resizeImageBufferJimp(buffer: Buffer, width: number, height: number): Promise<Buffer> {
//   try {
//     const image = await jimp.read(buffer)
//     image.resize(width, height);
//     return image.bitmap.data
//   } catch (error) {
//     console.error('Error resizing image:', error);
//     throw error;
//   }
// }

async function resizeImageBufferSharp(buffer: Buffer, width: number, height: number): Promise<Buffer> {
  try {
    const image = sharp(buffer);
    return await image.resize(width, height)
      // .ensureAlpha() // 兼容 jimp 默认的 4 通道
      .raw()
      .toBuffer();
  } catch (error) {
    console.error('Error resizing image:', error);
    throw error;
  }
}

function detectImageFormat(base64Data: string): string | null {
  try {
    // 移除 Base64 前缀
    const buffer = Buffer.from(base64Data, 'base64').subarray(0, 24);

    // 预定义魔术数字
    const MAGIC_JPEG = Buffer.from([0xff, 0xd8, 0xff]);
    const MAGIC_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const MAGIC_GIF87a = Buffer.from('GIF87a', 'ascii');
    const MAGIC_GIF89a = Buffer.from('GIF89a', 'ascii');
    const MAGIC_RIFF = Buffer.from('RIFF', 'ascii');
    const MAGIC_WEBP = Buffer.from('WEBP', 'ascii');
    const MAGIC_BMP = Buffer.from('BM', 'ascii');
    const MAGIC_ICO = Buffer.from([0x00, 0x00, 0x01, 0x00]);
    const MAGIC_TIFF_II = Buffer.from([0x49, 0x49, 0x2a, 0x00]);
    const MAGIC_TIFF_MM = Buffer.from([0x4d, 0x4d, 0x00, 0x2a]);
    const MAGIC_FTYP = Buffer.from('ftyp', 'ascii');
    const MAGIC_AVIF = Buffer.from('avif', 'ascii');

    if (buffer.length >= 3 && buffer.subarray(0, 3).equals(MAGIC_JPEG)) {
      return 'image/jpeg';
    } else if (buffer.length >= 8 && buffer.subarray(0, 8).equals(MAGIC_PNG)) {
      return 'image/png';
    } else if (
      buffer.length >= 6 &&
      (buffer.subarray(0, 6).equals(MAGIC_GIF87a) || buffer.subarray(0, 6).equals(MAGIC_GIF89a))
    ) {
      return 'image/gif';
    } else if (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).equals(MAGIC_RIFF) &&
      buffer.subarray(8, 12).equals(MAGIC_WEBP)
    ) {
      return 'image/webp';
    } else if (buffer.length >= 2 && buffer.subarray(0, 2).equals(MAGIC_BMP)) {
      return 'image/bmp';
    } else if (buffer.length >= 4 && buffer.subarray(0, 4).equals(MAGIC_ICO)) {
      return 'image/x-icon';
    } else if (
      buffer.length >= 12 &&
      buffer.subarray(4, 8).equals(MAGIC_FTYP) &&
      buffer.subarray(8, 12).equals(MAGIC_AVIF)
    ) {
      return 'image/avif';
    } else if (
      buffer.length >= 4 &&
      (buffer.subarray(0, 4).equals(MAGIC_TIFF_II) || buffer.subarray(0, 4).equals(MAGIC_TIFF_MM))
    ) {
      return 'image/tiff';
    }

    return null;
  } catch (error) {
    return null;
  }
}

function softmax(arr: number[]): number[] {
  const expValues = arr.map(x => Math.exp(x));
  const sumExpValues = expValues.reduce((sum, val) => sum + val, 0);
  return expValues.map(val => val / sumExpValues);
}

const resizeImageBuffer = resizeImageBufferSharp;

export { softmax, resizeImageBuffer, detectImageFormat};
