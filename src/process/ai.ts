import { MarkdownProcessor, FileInfo } from '../types';
import type { AIConfig } from './ai-utils';
import {
  getCachedMetadata,
  cacheMetadata,
  cleanupAICache as cleanupCache,
  logTokenUsage,
} from './ai-utils';
import {
  callAIForMetadata,
  batchCallAI,
  createCachedAIClient,
} from './ai-client';

/**
 * 转义 HTML 特殊字符（纯函数）
 * @param text 要转义的文本
 * @returns 转义后的文本
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * 转义 JSON 字符串（纯函数）
 * @param text 要转义的文本
 * @returns 转义后的文本
 */
export function escapeJson(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

/**
 * 记录 metadata 信息
 * @param filePath 文件路径
 * @param metadata metadata 对象
 */
export function logMetadata(filePath: string, metadata: any): void {
  console.log(`📊 AI metadata for ${filePath}:`);
  console.log(`   Title: ${metadata.title}`);
  console.log(`   Summary: ${metadata.summary.substring(0, 50)}...`);
  console.log(`   Tags: ${metadata.tags.join(', ')}`);
  if (metadata.inferred_date) {
    console.log(`   Inferred Date: ${metadata.inferred_date}`);
  }
  console.log(`   Language: ${metadata.inferred_lang}`);
}

/**
 * 将 AI metadata 添加到 HTML 中（纯函数）
 * @param html 原始 HTML
 * @param metadata AI metadata
 * @returns 增强后的 HTML
 */
export function enhanceHtmlWithMetadata(html: string, metadata: any): string {
  if (!metadata) {
    return html;
  }

  // 在 head 部分添加 meta 标签
  const metaTags = `
<!-- AI Generated Metadata -->
<meta name="ai-title" content="${escapeHtml(metadata.title)}">
<meta name="ai-summary" content="${escapeHtml(metadata.summary)}">
<meta name="ai-tags" content="${escapeHtml(metadata.tags.join(', '))}">
${metadata.inferred_date ? `<meta name="ai-inferred-date" content="${metadata.inferred_date}">` : ''}
<meta name="ai-language" content="${metadata.inferred_lang}">
`;

  // 在 body 开始处添加结构化数据
  const structuredData = `
<!-- AI Structured Data -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "${escapeJson(metadata.title)}",
  "description": "${escapeJson(metadata.summary)}",
  "keywords": "${escapeJson(metadata.tags.join(', '))}",
  "inLanguage": "${metadata.inferred_lang}"
}
</script>
`;

  // 插入 meta 标签到 head
  const headEndIndex = html.indexOf('</head>');
  if (headEndIndex !== -1) {
    html = html.slice(0, headEndIndex) + metaTags + html.slice(headEndIndex);
  }

  // 插入结构化数据到 body 开始处
  const bodyStartIndex = html.indexOf('<body');
  if (bodyStartIndex !== -1) {
    const bodyTagEndIndex = html.indexOf('>', bodyStartIndex) + 1;
    html = html.slice(0, bodyTagEndIndex) + structuredData + html.slice(bodyTagEndIndex);
  }

  return html;
}

/**
 * 在解析前处理 - 提取 AI metadata
 * @param content 原始内容
 * @param fileInfo 文件信息
 * @param config AI 配置（可选）
 * @returns 处理后的内容（实际上内容不变，只是提取 metadata）
 */
export async function processWithAIBeforeParse(
  content: string,
  fileInfo: FileInfo,
  config?: AIConfig
): Promise<string> {
  if (!fileInfo.hash) {
    console.warn(`⚠️ Skipping AI processing for ${fileInfo.path}: file hash is missing`);
    return content;
  }

  try {
    // 检查缓存
    const cachedMetadata = await getCachedMetadata(fileInfo.hash, fileInfo.path);
    if (cachedMetadata) {
      fileInfo.aiMetadata = cachedMetadata;
      logMetadata(fileInfo.path, cachedMetadata);
      return content;
    }

    // 调用 AI 提取 metadata
    const metadata = await callAIForMetadata(content, fileInfo.path, config);
    if (metadata) {
      fileInfo.aiMetadata = metadata;

      // 缓存结果
      await cacheMetadata(fileInfo.hash, fileInfo.path, metadata);

      logMetadata(fileInfo.path, metadata);
    }
  } catch (error) {
    console.error(`❌ AI processor failed for ${fileInfo.path}:`, error);
  }

  return content;
}

/**
 * 在解析后处理 - 添加 AI 增强的 HTML 内容
 * @param html 原始 HTML
 * @param fileInfo 文件信息
 * @returns 增强后的 HTML
 */
export async function processWithAIAfterParse(
  html: string,
  fileInfo: FileInfo
): Promise<string> {
  if (!fileInfo.aiMetadata) {
    return html;
  }

  try {
    // 添加 AI metadata 到 HTML 中
    return enhanceHtmlWithMetadata(html, fileInfo.aiMetadata);
  } catch (error) {
    console.error(`❌ Failed to enhance HTML with AI metadata for ${fileInfo.path}:`, error);
    return html;
  }
}

/**
 * 批量处理文件
 * @param files 文件信息数组
 * @param config AI 配置（可选）
 */
export async function batchProcessAI(
  files: FileInfo[],
  config?: AIConfig
): Promise<Map<string, any>> {
  console.log(`🤖 Processing ${files.length} files with AI...`);

  const filesToProcess = files.filter(file => file.hash && !file.aiMetadata);
  if (filesToProcess.length === 0) {
    console.log('📚 All files already have AI metadata or no files to process');
    return new Map();
  }

  // 准备数据
  const fileData = filesToProcess.map(file => ({
    content: file.content,
    path: file.path,
    hash: file.hash!,
  }));

  // 批量处理
  const results = await batchCallAI(fileData, config);

  // 更新文件信息
  for (const file of filesToProcess) {
    const metadata = results.get(file.path);
    if (metadata) {
      file.aiMetadata = metadata;
    }
  }

  console.log(`✅ AI processing completed for ${results.size} files`);
  return results;
}

/**
 * 清理 AI 缓存
 * @param maxAgeDays 最大保留天数，默认 30 天
 */
export async function cleanupAICache(maxAgeDays: number = 30): Promise<void> {
  await cleanupCache(maxAgeDays);
}

/**
 * 获取 AI 配置信息
 * @param config AI 配置
 * @returns 配置信息字符串
 */
export function getAIConfigInfo(config: AIConfig): string {
  return `AI Processor Status: Enabled
Model: ${config.model}
Temperature: ${config.temperature}
Max Tokens: ${config.maxTokens}`;
}

/**
 * 创建 AI 处理器（高阶函数）
 * @param config AI 配置（可选）
 * @returns MarkdownProcessor 对象
 */
export function createAIProcessor(config?: AIConfig): MarkdownProcessor {
  const cachedAIClient = createCachedAIClient(
    {
      getCachedMetadata,
      cacheMetadata,
    },
    config
  );

  return {
    beforeParse: async (content: string, fileInfo: FileInfo) => {
      return processWithAIBeforeParse(content, fileInfo, config);
    },
    afterParse: async (html: string, fileInfo: FileInfo) => {
      return processWithAIAfterParse(html, fileInfo);
    },
  };
}

/**
 * 创建带批量处理功能的 AI 处理器（高阶函数）
 * @param config AI 配置（可选）
 * @returns 增强的 AI 处理器对象
 */
export function createEnhancedAIProcessor(config?: AIConfig) {
  const processor = createAIProcessor(config);

  return {
    ...processor,
    processBatch: (files: FileInfo[]) => batchProcessAI(files, config),
    cleanupCache: (maxAgeDays: number = 30) => cleanupAICache(maxAgeDays),
    getConfigInfo: () => getAIConfigInfo(config || {
      model: 'gpt-3.5-turbo',
      temperature: 0,
      maxTokens: 500,
      apiKey: '',
      baseUrl: '',
    }),
    isEnabled: () => true,
  };
}

/**
 * 创建 AI 处理器工厂（高阶函数）
 * @param defaultConfig 默认 AI 配置
 * @returns 工厂函数，可以创建配置特定的 AI 处理器
 */
export function createAIProcessorFactory(defaultConfig: AIConfig) {
  return (configOverrides?: Partial<AIConfig>) => {
    const config = { ...defaultConfig, ...configOverrides };
    return createEnhancedAIProcessor(config);
  };
}

/**
 * 组合多个 AI 处理器（函数组合）
 * @param processors AI 处理器数组
 * @returns 组合后的处理器函数
 */
export function composeAIProcessors(processors: Array<(fileInfo: FileInfo) => Promise<void>>) {
  return async (fileInfo: FileInfo) => {
    for (const processor of processors) {
      await processor(fileInfo);
    }
  };
}