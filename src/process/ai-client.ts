import { extractMetadataFromMarkdown } from '../ai/extractMetadataFromMarkdown';
import { AIMetadata, FileInfo } from '../types';
import { cacheMetadata, getCachedMetadata, logTokenUsage } from './ai-utils';

/**
 * 调用 AI 模型提取文档 metadata
 * @param content 文档内容
 * @param filePath 文件路径
 * @param config AI 配置（可选）
 * @returns 提取的 metadata，如果失败则返回 null
 */
export async function callAIForMetadata(
  content: string,
  filePath: string
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
 * 批量处理文件
 * @param files 文件信息数组
 * @param config AI 配置（可选）
 */
export async function batchProcessAI(files: FileInfo[]): Promise<Map<string, any>> {
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
  const results = await batchCallAI(fileData);

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
