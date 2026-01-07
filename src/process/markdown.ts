import * as fs from 'fs/promises';
import * as path from 'path';
import { FileInfo, MarkdownProcessor, ScannedFile } from '../types';
import { convertMarkdownToHtml } from '../utils/convertMarkdownToHtml';

/**
 * 从内容中提取标题（纯函数）
 * @param content Markdown 内容
 * @returns 提取的标题，如果没有找到则返回 'Untitled'
 */
function extractTitle(content: string): string {
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
async function applyProcessors(
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
async function processMarkdownFile(
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
