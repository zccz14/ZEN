import { FileInfo, MarkdownProcessor, ScannedFile } from '../types';
import { findMarkdownEntries } from '../findEntries';
import { convertMarkdownToHtml } from '../utils/convertMarkdownToHtml';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * 从内容中提取标题（纯函数）
 * @param content Markdown 内容
 * @returns 提取的标题，如果没有找到则返回 'Untitled'
 */
export function extractTitle(content: string): string {
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
 * 应用处理器链到内容（纯函数 + 副作用）
 * @param content 原始内容
 * @param fileInfo 文件信息
 * @param processors 处理器数组
 * @param phase 处理阶段：'beforeParse' 或 'afterParse'
 * @returns 处理后的内容
 */
export async function applyProcessors(
  content: string,
  fileInfo: FileInfo,
  processors: MarkdownProcessor[],
  phase: 'beforeParse' | 'afterParse'
): Promise<string> {
  let result = content;

  for (const processor of processors) {
    const processorFn = phase === 'beforeParse' ? processor.beforeParse : processor.afterParse;
    if (processorFn) {
      result = await processorFn(result, fileInfo);
    }
  }

  return result;
}

/**
 * 转换单个 Markdown 文件
 * @param fileInfo 文件信息
 * @param processors 处理器数组（可选）
 * @returns 转换后的文件信息
 */
export async function processMarkdownFile(
  fileInfo: FileInfo,
  processors: MarkdownProcessor[] = []
): Promise<FileInfo> {
  let content = fileInfo.content;

  // 应用前置处理器
  content = await applyProcessors(content, fileInfo, processors, 'beforeParse');

  // 转换 Markdown 为 HTML
  let html = convertMarkdownToHtml(content);

  // 应用后置处理器
  html = await applyProcessors(html, fileInfo, processors, 'afterParse');

  // 提取标题
  const title = extractTitle(content);

  return {
    ...fileInfo,
    content,
    html,
    metadata: { title }, // 只保留标题作为 metadata
  };
}

/**
 * 批量转换 Markdown 文件
 * @param files 文件信息数组
 * @param processors 处理器数组（可选）
 * @returns 转换后的文件信息数组
 */
export async function processMarkdownFiles(
  files: FileInfo[],
  processors: MarkdownProcessor[] = []
): Promise<FileInfo[]> {
  const results: FileInfo[] = [];

  for (const file of files) {
    try {
      const result = await processMarkdownFile(file, processors);
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
 * @param filePath 文件路径
 * @param baseDir 基础目录（可选）
 * @param processors 处理器数组（可选）
 * @returns 转换后的文件信息
 */
export async function processMarkdownFromPath(
  filePath: string,
  baseDir: string = '',
  processors: MarkdownProcessor[] = []
): Promise<FileInfo> {
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

  return processMarkdownFile(fileInfo, processors);
}

/**
 * 从扫描的文件列表读取内容并转换
 * @param scannedFiles 扫描的文件列表
 * @param baseDir 基础目录（可选）
 * @param processors 处理器数组（可选）
 * @returns 转换后的文件信息数组
 */
export async function processScannedFiles(
  scannedFiles: ScannedFile[],
  baseDir: string = '',
  processors: MarkdownProcessor[] = []
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

  return processMarkdownFiles(files, processors);
}

/**
 * 从目录读取所有 Markdown 文件并转换
 * @param dirPath 目录路径
 * @param processors 处理器数组（可选）
 * @returns 转换后的文件信息数组
 */
export async function processMarkdownDirectory(
  dirPath: string,
  processors: MarkdownProcessor[] = []
): Promise<FileInfo[]> {
  // 使用 findMarkdownEntries 函数获取文件列表
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
  return processScannedFiles(scannedFiles, dirPath, processors);
}

/**
 * 创建 Markdown 处理器组合函数（高阶函数）
 * @param processors 处理器数组
 * @returns 一个函数，该函数接收 FileInfo 并返回处理后的 FileInfo
 */
export function createMarkdownProcessor(processors: MarkdownProcessor[] = []) {
  return async (fileInfo: FileInfo): Promise<FileInfo> => {
    return processMarkdownFile(fileInfo, processors);
  };
}

/**
 * 创建批量 Markdown 处理器组合函数（高阶函数）
 * @param processors 处理器数组
 * @returns 一个函数，该函数接收 FileInfo 数组并返回处理后的 FileInfo 数组
 */
export function createBatchMarkdownProcessor(processors: MarkdownProcessor[] = []) {
  return async (files: FileInfo[]): Promise<FileInfo[]> => {
    return processMarkdownFiles(files, processors);
  };
}

/**
 * 并行处理 Markdown 文件（性能优化版本）
 * @param files 文件信息数组
 * @param processors 处理器数组（可选）
 * @param concurrency 并发数（默认 5）
 * @returns 转换后的文件信息数组
 */
export async function processMarkdownFilesParallel(
  files: FileInfo[],
  processors: MarkdownProcessor[] = [],
  concurrency: number = 5
): Promise<FileInfo[]> {
  const results: FileInfo[] = [];
  const queue = [...files];

  async function processBatch(batch: FileInfo[]): Promise<FileInfo[]> {
    const batchResults = await Promise.all(
      batch.map(async (file) => {
        try {
          return await processMarkdownFile(file, processors);
        } catch (error) {
          console.error(`Failed to convert file ${file.path}:`, error);
          return file; // 返回原始文件信息
        }
      })
    );
    return batchResults;
  }

  while (queue.length > 0) {
    const batch = queue.splice(0, concurrency);
    const batchResults = await processBatch(batch);
    results.push(...batchResults);
  }

  return results;
}

/**
 * 从扫描的文件列表读取内容并转换
 * @param scannedFiles 扫描到的文件列表
 * @param baseDir 基础目录路径
 * @param processors Markdown 处理器数组
 * @returns 转换后的文件信息数组
 */
export async function convertScannedFiles(
  scannedFiles: ScannedFile[],
  baseDir: string = '',
  processors: MarkdownProcessor[] = []
): Promise<FileInfo[]> {
  const files: FileInfo[] = [];

  for (const scannedFile of scannedFiles) {
    try {
      // 构建绝对路径
      const absolutePath = baseDir ? path.join(baseDir, scannedFile.path) : scannedFile.path;
      const content = await fs.readFile(absolutePath, 'utf-8');

      // 创建 FileInfo 对象
      const fileInfo: FileInfo = {
        path: scannedFile.path,
        name: scannedFile.name,
        ext: scannedFile.ext,
        content: content,
        hash: scannedFile.hash,
        metadata: {
          title: extractTitle(content),
        },
      };

      // 转换文件
      const processedFile = await processMarkdownFile(fileInfo, processors);
      files.push(processedFile);
    } catch (error) {
      console.error(`Failed to read or convert file ${scannedFile.path}:`, error);
    }
  }

  return files;
}