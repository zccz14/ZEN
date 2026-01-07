import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { findMarkdownEntries } from '../findEntries';
import { ScannedFile } from '../types';

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

/**
 * 扫描目录并获取所有 Markdown 文件
 * @param dirPath 要扫描的目录路径
 * @returns 扫描到的文件列表
 */
export async function scanMarkdownFiles(dirPath: string): Promise<ScannedFile[]> {
  const markdownFiles = await findMarkdownEntries(dirPath);
  const files: ScannedFile[] = [];

  for (const relativePath of markdownFiles) {
    const fullPath = path.join(dirPath, relativePath);

    try {
      // 检查文件是否存在
      await fs.access(fullPath);

      const ext = path.extname(relativePath);
      const name = path.basename(relativePath, ext);
      const hash = await calculateFileHash(fullPath);

      files.push({
        path: relativePath, // 只保存相对路径
        name,
        ext,
        hash,
      });
    } catch (error) {
      console.warn(`⚠️ File not found or inaccessible: ${fullPath}`, error);
    }
  }

  return files;
}

/**
 * 从文件加载扫描结果
 * @param inputPath 输入文件路径
 * @returns 加载的文件列表，如果加载失败则返回空数组
 */
export async function loadScanResult(inputPath: string): Promise<ScannedFile[]> {
  try {
    const content = await fs.readFile(inputPath, 'utf-8');
    const scanResult = JSON.parse(content);
    return scanResult.files || [];
  } catch (error) {
    console.warn(`⚠️ Failed to load scan result from ${inputPath}:`, error);
    return [];
  }
}

/**
 * 检查扫描结果是否过期
 * @param scanResultPath 扫描结果文件路径
 * @param dirPath 要检查的目录路径
 * @returns 如果扫描结果过期则返回 true，否则返回 false
 */
export async function isScanOutdated(scanResultPath: string, dirPath: string): Promise<boolean> {
  try {
    // 检查扫描结果文件是否存在
    await fs.access(scanResultPath);

    // 读取扫描结果的时间戳
    const content = await fs.readFile(scanResultPath, 'utf-8');
    const scanResult = JSON.parse(content);
    const scanTime = new Date(scanResult.timestamp).getTime();

    // 获取当前的 Markdown 文件列表
    const currentFiles = await findMarkdownEntries(dirPath);

    // 检查每个文件是否比扫描时间更新
    for (const relativePath of currentFiles) {
      const fullPath = path.join(dirPath, relativePath);

      try {
        const stats = await fs.stat(fullPath);
        if (stats.mtime.getTime() > scanTime) {
          return true; // 文件已更新，扫描结果过期
        }
      } catch (error) {
        // 如果文件无法访问，继续检查下一个
        console.warn(`⚠️ Cannot access file for timestamp check: ${fullPath}`, error);
      }
    }

    return false; // 所有文件都没有更新
  } catch (error) {
    // 如果扫描结果文件不存在或读取失败，视为过期
    return true;
  }
}
