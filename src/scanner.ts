import { ScannedFile, ZenConfig } from './types';
import { GitIgnoreProcessor } from './gitignore';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as minimatch from 'minimatch';

export class Scanner {
  private config: ZenConfig;

  constructor(config: ZenConfig = {}) {
    this.config = config;
  }

  /**
   * 扫描目录并生成文件列表
   */
  async scanDirectory(dirPath: string): Promise<ScannedFile[]> {
    const files: ScannedFile[] = [];

    // 创建 GitIgnoreProcessor 并加载 .gitignore 文件
    const gitignoreProcessor = new GitIgnoreProcessor(dirPath);
    await gitignoreProcessor.loadFromFile();

    // 获取 include/exclude 模式
    const includePattern = this.config.includePattern || '**/*.md';
    const excludePattern = this.config.excludePattern;

    async function scanDirectory(currentPath: string) {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);

        // 检查是否应该被 .gitignore 忽略
        if (gitignoreProcessor.shouldIgnore(fullPath)) {
          continue;
        }

        // 忽略 .zen 目录（保持向后兼容）
        if (entry.name === '.zen') {
          continue;
        }

        if (entry.isDirectory()) {
          await scanDirectory(fullPath);
        } else if (entry.isFile()) {
          const relativePath = path.relative(dirPath, fullPath);

          // 应用 include 模式
          if (!minimatch.match([relativePath], includePattern).length) {
            continue;
          }

          // 应用 exclude 模式
          if (excludePattern && minimatch.match([relativePath], excludePattern).length > 0) {
            continue;
          }

          const ext = path.extname(entry.name);
          const name = path.basename(entry.name, ext);

          files.push({
            path: fullPath,
            relativePath,
            name,
            ext,
          });
        }
      }
    }

    await scanDirectory(dirPath);
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

      // 检查源目录中是否有文件比扫描时间更新
      const gitignoreProcessor = new GitIgnoreProcessor(dirPath);
      await gitignoreProcessor.loadFromFile();

      let isOutdated = false;

      async function checkDirectory(currentPath: string) {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name);

          // 检查是否应该被 .gitignore 忽略
          if (gitignoreProcessor.shouldIgnore(fullPath)) {
            continue;
          }

          // 忽略 .zen 目录
          if (entry.name === '.zen') {
            continue;
          }

          if (entry.isDirectory()) {
            await checkDirectory(fullPath);
          } else if (entry.isFile()) {
            // 检查文件修改时间
            const stats = await fs.stat(fullPath);
            if (stats.mtime.getTime() > scanTime) {
              isOutdated = true;
              return; // 提前退出
            }
          }

          if (isOutdated) {
            break;
          }
        }
      }

      await checkDirectory(dirPath);
      return isOutdated;
    } catch (error) {
      // 如果扫描结果文件不存在或读取失败，视为过期
      return true;
    }
  }
}
