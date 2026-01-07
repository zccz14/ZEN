import * as crypto from 'crypto';
import * as fs from 'fs/promises';

/**
 * 计算文件内容的 SHA256 哈希值
 * @param filePath 文件路径
 * @returns 文件的哈希值，如果读取失败则返回空字符串
 */
export async function calculateFileHash(filePath: string): Promise<string> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch (error) {
    console.warn(`⚠️ Failed to calculate hash for ${filePath}:`, error);
    return '';
  }
}
