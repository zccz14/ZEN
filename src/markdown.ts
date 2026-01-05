import { FileInfo, MarkdownProcessor, ScannedFile } from './types';
import { findMarkdownEntries } from './findEntries';
import { convertMarkdownToHtml } from './utils/convertMarkdownToHtml';
import * as fs from 'fs/promises';
import * as path from 'path';

export class MarkdownConverter {
  private processors: MarkdownProcessor[] = [];

  constructor(processors: MarkdownProcessor[] = []) {
    this.processors = processors;
  }

  /**
   * 添加处理器
   */
  addProcessor(processor: MarkdownProcessor): void {
    this.processors.push(processor);
  }

  /**
   * 从内容中提取标题
   */
  private extractTitle(content: string): string {
    // 查找第一个一级标题
    const h1Match = content.match(/^#\s+(.+)$/m);
    if (h1Match) {
      return h1Match[1].trim();
    }

    // 如果没有一级标题，查找第一个二级标题
    const h2Match = content.match(/^##\s+(.+)$/m);
    if (h2Match) {
      return h2Match[1].trim();
    }

    return 'Untitled';
  }

  /**
   * 转换 Markdown 文件
   */
  async convert(fileInfo: FileInfo): Promise<FileInfo> {
    let content = fileInfo.content;

    // 应用前置处理器
    for (const processor of this.processors) {
      if (processor.beforeParse) {
        content = await processor.beforeParse(content, fileInfo);
      }
    }

    // 转换 Markdown 为 HTML
    let html = convertMarkdownToHtml(content);

    // 应用后置处理器
    for (const processor of this.processors) {
      if (processor.afterParse) {
        html = await processor.afterParse(html, fileInfo);
      }
    }

    // 提取标题
    const title = this.extractTitle(content);

    return {
      ...fileInfo,
      content,
      html,
      metadata: { title }, // 只保留标题作为 metadata
    };
  }

  /**
   * 批量转换文件
   */
  async convertFiles(files: FileInfo[]): Promise<FileInfo[]> {
    const results: FileInfo[] = [];

    for (const file of files) {
      try {
        const result = await this.convert(file);
        results.push(result);
      } catch (error) {
        console.error(`Failed to convert file ${file.path}:`, error);
        // 即使转换失败，也保留原始文件信息
        results.push(file);
      }
    }

    return results;
  }

  /**
   * 从文件路径读取并转换
   */
  async convertFromPath(filePath: string, baseDir: string = ''): Promise<FileInfo> {
    const content = await fs.readFile(filePath, 'utf-8');
    const relativePath = baseDir ? path.relative(baseDir, filePath) : filePath;
    const ext = path.extname(filePath);
    const name = path.basename(filePath, ext);

    const fileInfo: FileInfo = {
      path: relativePath,
      name,
      ext,
      content,
    };

    return this.convert(fileInfo);
  }

  /**
   * 从目录读取所有 Markdown 文件并转换
   * 使用新的findMarkdownEntries函数获取文件列表
   */
  async convertDirectory(dirPath: string): Promise<FileInfo[]> {
    // 使用新的findMarkdownEntries函数获取文件列表
    const markdownFiles = await findMarkdownEntries(dirPath);

    const scannedFiles: ScannedFile[] = [];

    for (const relativePath of markdownFiles) {
      const ext = path.extname(relativePath);
      const name = path.basename(relativePath, ext);

      scannedFiles.push({
        path: relativePath,
        name,
        ext,
      });
    }

    // 使用新的方法转换扫描的文件
    return this.convertScannedFiles(scannedFiles, dirPath);
  }

  /**
   * 从扫描的文件列表读取内容并转换
   */
  async convertScannedFiles(
    scannedFiles: ScannedFile[],
    baseDir: string = ''
  ): Promise<FileInfo[]> {
    const files: FileInfo[] = [];

    for (const scannedFile of scannedFiles) {
      try {
        // 构建绝对路径
        const absolutePath = baseDir ? path.join(baseDir, scannedFile.path) : scannedFile.path;
        const content = await fs.readFile(absolutePath, 'utf-8');
        files.push({
          path: scannedFile.path,
          name: scannedFile.name,
          ext: scannedFile.ext,
          content,
          hash: scannedFile.hash, // 复制 hash 字段
        });
      } catch (error) {
        console.warn(`⚠️ Failed to read file ${scannedFile.path}:`, error);
      }
    }

    return this.convertFiles(files);
  }
}
