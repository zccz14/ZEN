import { FileInfo } from './types';
import * as fs from 'fs/promises';
import * as path from 'path';
import { GitIgnoreProcessor } from './gitignore';

export interface ScanOptions {
  srcDir: string;
  scanDir?: string;
  includePattern?: string;
  excludePattern?: string;
  verbose?: boolean;
}

export interface ScanResult {
  files: FileInfo[];
  scanDir: string;
  timestamp: number;
}

export class FileScanner {
  /**
   * 扫描指定目录下的所有 Markdown 文件
   */
  async scan(options: ScanOptions): Promise<ScanResult> {
    const { srcDir, scanDir, verbose = false } = options;
    const files: FileInfo[] = [];

    // 创建 GitIgnoreProcessor 并加载 .gitignore 文件
    const gitignoreProcessor = new GitIgnoreProcessor(srcDir);
    await gitignoreProcessor.loadFromFile();

    // 扫描目录
    await this.scanDirectory(srcDir, srcDir, files, gitignoreProcessor, verbose, srcDir);

    // 确定扫描结果目录
    const finalScanDir = scanDir || path.join(srcDir, '.zen', 'src');

    // 确保扫描目录存在
    await fs.mkdir(finalScanDir, { recursive: true });

    // 保存扫描结果
    const scanResult: ScanResult = {
      files,
      scanDir: finalScanDir,
      timestamp: Date.now(),
    };

    await this.saveScanResult(scanResult, finalScanDir);

    if (verbose) {
      console.log(`📄 Scanned ${files.length} Markdown files`);
      console.log(`📁 Scan results saved to: ${finalScanDir}`);
    }

    return scanResult;
  }

  /**
   * 递归扫描目录
   */
  private async scanDirectory(
    currentPath: string,
    baseDir: string,
    files: FileInfo[],
    gitignoreProcessor: GitIgnoreProcessor,
    verbose: boolean,
    rootDir: string
  ): Promise<void> {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      // 检查是否应该被 .gitignore 忽略
      if (gitignoreProcessor.shouldIgnore(fullPath)) {
        if (verbose) console.log(`  Ignoring (gitignore): ${fullPath}`);
        continue;
      }

      // 忽略 .zen 目录（保持向后兼容）
      if (entry.name === '.zen') {
        if (verbose) console.log(`  Ignoring (.zen): ${fullPath}`);
        continue;
      }

      if (entry.isDirectory()) {
        await this.scanDirectory(fullPath, baseDir, files, gitignoreProcessor, verbose, rootDir);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        try {
          const content = await fs.readFile(fullPath, 'utf-8');
          const relativePath = path.relative(rootDir, fullPath);
          const ext = path.extname(entry.name);
          const name = path.basename(entry.name, ext);

          files.push({
            path: fullPath,
            relativePath,
            name,
            ext,
            content,
          });

          if (verbose) console.log(`  Found: ${relativePath}`);
        } catch (error) {
          console.error(`❌ Failed to read file ${fullPath}:`, error);
        }
      }
    }
  }

  /**
   * 保存扫描结果到文件
   */
  private async saveScanResult(scanResult: ScanResult, scanDir: string): Promise<void> {
    // 保存文件列表
    const filesJson = JSON.stringify(
      scanResult.files.map(file => ({
        path: file.path,
        relativePath: file.relativePath,
        name: file.name,
        ext: file.ext,
      })),
      null,
      2
    );

    await fs.writeFile(path.join(scanDir, 'files.json'), filesJson, 'utf-8');

    // 保存扫描元数据
    const metadata = {
      timestamp: scanResult.timestamp,
      scanDir: scanResult.scanDir,
      fileCount: scanResult.files.length,
    };

    await fs.writeFile(
      path.join(scanDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2),
      'utf-8'
    );

    // 复制文件内容到扫描目录（可选，用于增量构建）
    await this.copyFilesToScanDir(scanResult.files, scanDir);
  }

  /**
   * 将文件复制到扫描目录
   */
  private async copyFilesToScanDir(files: FileInfo[], scanDir: string): Promise<void> {
    for (const file of files) {
      try {
        const targetPath = path.join(scanDir, file.relativePath);
        const targetDir = path.dirname(targetPath);

        // 确保目标目录存在
        await fs.mkdir(targetDir, { recursive: true });

        // 复制文件内容
        await fs.writeFile(targetPath, file.content, 'utf-8');
      } catch (error) {
        console.error(`❌ Failed to copy file ${file.path}:`, error);
      }
    }
  }

  /**
   * 从扫描目录加载扫描结果
   */
  async loadScanResult(scanDir: string): Promise<ScanResult> {
    try {
      // 加载元数据
      const metadataContent = await fs.readFile(path.join(scanDir, 'metadata.json'), 'utf-8');
      const metadata = JSON.parse(metadataContent);

      // 加载文件列表
      const filesContent = await fs.readFile(path.join(scanDir, 'files.json'), 'utf-8');
      const fileEntries = JSON.parse(filesContent);

      // 从扫描目录读取文件内容
      const files: FileInfo[] = [];
      for (const entry of fileEntries) {
        try {
          const content = await fs.readFile(path.join(scanDir, entry.relativePath), 'utf-8');

          files.push({
            ...entry,
            content,
          });
        } catch (error) {
          console.error(`❌ Failed to load file ${entry.relativePath}:`, error);
        }
      }

      return {
        files,
        scanDir,
        timestamp: metadata.timestamp,
      };
    } catch (error) {
      throw new Error(`Failed to load scan result from ${scanDir}: ${error}`);
    }
  }

  /**
   * 清理扫描目录
   */
  async cleanScanDir(scanDir: string): Promise<void> {
    try {
      await fs.rm(scanDir, { recursive: true, force: true });
      console.log(`🧹 Cleaned scan directory: ${scanDir}`);
    } catch (error) {
      console.error(`❌ Failed to clean scan directory:`, error);
    }
  }
}
