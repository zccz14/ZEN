import { AIMetadata } from '../types';
import { extractMetadataFromMarkdown } from '../ai/extractMetadataFromMarkdown';
import type { AIConfig } from './ai-utils';
import {
  getCachedMetadata,
  cacheMetadata,
  logTokenUsage,
} from './ai-utils';

/**
 * 调用 AI 模型提取文档 metadata
 * @param content 文档内容
 * @param filePath 文件路径
 * @param config AI 配置（可选）
 * @returns 提取的 metadata，如果失败则返回 null
 */
export async function callAIForMetadata(
  content: string,
  filePath: string,
  config?: AIConfig
): Promise<AIMetadata | null> {
  // API key 检查现在在 services/openai.ts 中处理
  // 如果 API key 不存在，completeMessages 函数会抛出错误

  try {
    const metadata = await extractMetadataFromMarkdown(content, filePath);

    // 打印 tokens 使用情况
    if (metadata.tokens_used) {
      logTokenUsage(filePath, metadata.tokens_used);
    }

    return metadata;
  } catch (error) {
    console.error(`❌ Failed to extract AI metadata for ${filePath}:`, error);
    return null;
  }
}

/**
 * 批量调用 AI 处理文件
 * @param files 文件数组，包含内容、路径和哈希值
 * @param config AI 配置（可选）
 * @returns 文件路径到 metadata 的映射
 */
export async function batchCallAI(
  files: Array<{ content: string; path: string; hash: string }>,
  config?: AIConfig
): Promise<Map<string, AIMetadata>> {
  const results = new Map<string, AIMetadata>();

  // API key 检查现在在 services/openai.ts 中处理
  // 如果 API key 不存在，completeMessages 函数会抛出错误

  console.log(`🤖 Processing ${files.length} files with AI...`);

  for (const file of files) {
    try {
      // 检查缓存
      const cachedMetadata = await getCachedMetadata(file.hash, file.path);
      if (cachedMetadata) {
        results.set(file.path, cachedMetadata);
        continue;
      }

      // 调用 AI 提取 metadata
      const metadata = await callAIForMetadata(file.content, file.path, config);
      if (metadata) {
        results.set(file.path, metadata);

        // 缓存结果
        await cacheMetadata(file.hash, file.path, metadata);
      }
    } catch (error) {
      console.error(`❌ Failed to process file ${file.path}:`, error);
    }
  }

  return results;
}

/**
 * 并行批量调用 AI 处理文件（性能优化版本）
 * @param files 文件数组，包含内容、路径和哈希值
 * @param config AI 配置（可选）
 * @param concurrency 并发数（默认 3）
 * @returns 文件路径到 metadata 的映射
 */
export async function batchCallAIParallel(
  files: Array<{ content: string; path: string; hash: string }>,
  config?: AIConfig,
  concurrency: number = 3
): Promise<Map<string, AIMetadata>> {
  const results = new Map<string, AIMetadata>();
  const queue = [...files];

  console.log(`🤖 Processing ${files.length} files with AI (parallel, concurrency: ${concurrency})...`);

  async function processBatch(batch: Array<{ content: string; path: string; hash: string }>) {
    const batchResults = new Map<string, AIMetadata>();
    const batchPromises = batch.map(async (file) => {
      try {
        // 检查缓存
        const cachedMetadata = await getCachedMetadata(file.hash, file.path);
        if (cachedMetadata) {
          batchResults.set(file.path, cachedMetadata);
          return;
        }

        // 调用 AI 提取 metadata
        const metadata = await callAIForMetadata(file.content, file.path, config);
        if (metadata) {
          batchResults.set(file.path, metadata);

          // 缓存结果
          await cacheMetadata(file.hash, file.path, metadata);
        }
      } catch (error) {
        console.error(`❌ Failed to process file ${file.path}:`, error);
      }
    });

    await Promise.all(batchPromises);
    return batchResults;
  }

  while (queue.length > 0) {
    const batch = queue.splice(0, concurrency);
    const batchResults = await processBatch(batch);
    batchResults.forEach((metadata, path) => results.set(path, metadata));
  }

  return results;
}

/**
 * 智能批量处理文件（根据文件大小和数量自动选择策略）
 * @param files 文件数组，包含内容、路径和哈希值
 * @param config AI 配置（可选）
 * @returns 文件路径到 metadata 的映射
 */
export async function smartBatchCallAI(
  files: Array<{ content: string; path: string; hash: string }>,
  config?: AIConfig
): Promise<Map<string, AIMetadata>> {
  // 根据文件数量和总大小选择处理策略
  const totalSize = files.reduce((sum, file) => sum + file.content.length, 0);
  const avgSize = totalSize / files.length;

  if (files.length <= 5 || avgSize > 10000) {
    // 文件数量少或平均文件大，使用串行处理
    return batchCallAI(files, config);
  } else {
    // 文件数量多且平均文件小，使用并行处理
    const concurrency = Math.min(5, Math.ceil(files.length / 3));
    return batchCallAIParallel(files, config, concurrency);
  }
}

/**
 * 创建 AI 客户端函数集合（高阶函数）
 * @param config AI 配置（可选）
 * @returns AI 客户端函数集合
 */
export function createAIClient(config?: AIConfig) {
  return {
    extractMetadata: (content: string, filePath: string) =>
      callAIForMetadata(content, filePath, config),
    processFiles: (files: Array<{ content: string; path: string; hash: string }>) =>
      batchCallAI(files, config),
    processFilesParallel: (
      files: Array<{ content: string; path: string; hash: string }>,
      concurrency: number = 3
    ) => batchCallAIParallel(files, config, concurrency),
    processFilesSmart: (files: Array<{ content: string; path: string; hash: string }>) =>
      smartBatchCallAI(files, config),
  };
}

/**
 * 创建带缓存的 AI 客户端（高阶函数）
 * @param cacheFunctions 缓存函数集合
 * @param config AI 配置（可选）
 * @returns 带缓存的 AI 客户端函数
 */
export function createCachedAIClient(
  cacheFunctions: {
    getCachedMetadata: (hash: string, path: string) => Promise<AIMetadata | null>;
    cacheMetadata: (hash: string, path: string, metadata: AIMetadata) => Promise<void>;
  },
  config?: AIConfig
) {
  return {
    extractMetadata: async (content: string, filePath: string, fileHash?: string) => {
      // 如果有文件哈希，先检查缓存
      if (fileHash) {
        const cached = await cacheFunctions.getCachedMetadata(fileHash, filePath);
        if (cached) {
          return cached;
        }
      }

      // 调用 AI 提取 metadata
      const metadata = await callAIForMetadata(content, filePath, config);

      // 如果有文件哈希，缓存结果
      if (metadata && fileHash) {
        await cacheFunctions.cacheMetadata(fileHash, filePath, metadata);
      }

      return metadata;
    },
    processFiles: async (files: Array<{ content: string; path: string; hash: string }>) => {
      const results = new Map<string, AIMetadata>();

      for (const file of files) {
        const metadata = await cacheFunctions.getCachedMetadata(file.hash, file.path);
        if (metadata) {
          results.set(file.path, metadata);
        } else {
          const newMetadata = await callAIForMetadata(file.content, file.path, config);
          if (newMetadata) {
            results.set(file.path, newMetadata);
            await cacheFunctions.cacheMetadata(file.hash, file.path, newMetadata);
          }
        }
      }

      return results;
    },
  };
}