import { readFile } from 'fs/promises';
import { extractMetadataFromMarkdown } from '../ai/extractMetadataFromMarkdown';
import { MetaData } from '../metadata';
import { AIMetadata } from '../types';
import { cacheMetadata, getCachedMetadata, logTokenUsage } from './ai-utils';

/**
 * 调用 AI 模型提取文档 metadata
 * @param content 文档内容
 * @param filePath 文件路径
 * @param config AI 配置（可选）
 * @returns 提取的 metadata，如果失败则返回 null
 */
async function callAIForMetadata(content: string, filePath: string): Promise<AIMetadata | null> {
  // API key 检查现在在 services/openai.ts 中处理
  // 如果 API key 不存在，completeMessages 函数会抛出错误

  try {
    const metadata = await extractMetadataFromMarkdown(content);

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
async function batchCallAI(
  files: Array<{ content: string; path: string; hash: string }>
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
      const metadata = await callAIForMetadata(file.content, file.path);
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
 * 运行 AI 元数据提取
 */
export async function runAIMetadataExtraction(): Promise<void> {
  const { files } = MetaData;

  if (MetaData.options.verbose) console.log(`🤖 Running AI metadata extraction...`);
  console.log(`🤖 Processing ${files.length} files with AI...`);

  for (const file of files) {
    try {
      if (file.metadata) {
        console.info(`ℹ️ Skipping ${file.path}, already has metadata`);
        continue;
      }
      const content = await readFile(file.path, 'utf-8');
      file.metadata = await extractMetadataFromMarkdown(content);
      console.log(`✅ Extracted AI metadata for ${file.path}`, file.metadata.tokens_used);
    } catch (error) {
      console.error(`⚠️ Failed to process file ${file.path}:`, error);
    }
  }

  console.log(`✅ AI processing completed for ${files.length} files`);
}
