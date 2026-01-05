import { ScannedFile, ZenConfig } from './types';
import { findMarkdownEntries } from './findEntries';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

export class Scanner {
  private config: ZenConfig;

  constructor(config: ZenConfig = {}) {
    this.config = config;
  }

  /**
   * 计算文件内容的 sha256 hash
   */
  private async calculateFileHash(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return crypto.createHash('sha256').update(content).digest('hex');
    } catch (error) {
      console.warn(`⚠️ Failed to calculate hash for ${filePath}:`, error);
      return '';
    }
  }

  /**
   * 扫描目录并生成文件列表
   */
  async scanDirectory(dirPath: string): Promise<ScannedFile[]> {
    // 使用新的findMarkdownEntries函数获取所有.md文件
    const markdownFiles = await findMarkdownEntries(dirPath);

    const files: ScannedFile[] = [];

    for (const relativePath of markdownFiles) {
      const fullPath = path.join(dirPath, relativePath);

      try {
        // 检查文件是否存在
        await fs.access(fullPath);

        const ext = path.extname(relativePath);
        const name = path.basename(relativePath, ext);
        const hash = await this.calculateFileHash(fullPath);

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
   * 保存扫描结果到文件
   */
  async saveScanResult(files: ScannedFile[], outputPath: string): Promise<void> {
    // 确保输出目录存在
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    // 将扫描结果保存为 JSON
    const scanResult = {
      timestamp: new Date().toISOString(),
      files,
    };

    await fs.writeFile(outputPath, JSON.stringify(scanResult, null, 2), 'utf-8');
  }

  /**
   * 从文件加载扫描结果
   */
  async loadScanResult(inputPath: string): Promise<ScannedFile[]> {
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
   */
  async isScanResultOutdated(scanResultPath: string, dirPath: string): Promise<boolean> {
    try {
      // 检查扫描结果文件是否存在
      await fs.access(scanResultPath);

      // 读取扫描结果的时间戳
      const content = await fs.readFile(scanResultPath, 'utf-8');
      const scanResult = JSON.parse(content);
      const scanTime = new Date(scanResult.timestamp).getTime();

      // 获取当前的Markdown文件列表
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
}
