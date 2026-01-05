import { AIMetadata } from './types';
import { AIService } from './ai-service';
import { completeMessages, OpenAIMessage, OpenAIResponse } from './services/openai';
import { extractMetadataFromMarkdown } from './ai/extractMetadataFromMarkdown';

/**
 * AI 客户端类 - 使用新的 OpenAI 服务
 */
export class AIClient {
  private aiService: AIService;

  constructor(aiService: AIService) {
    this.aiService = aiService;
  }

  /**
   * 调用 AI 模型提取文档 metadata
   */
  async extractMetadata(content: string, filePath: string): Promise<AIMetadata | null> {
    const config = this.aiService.getConfig();

    // API key 检查现在在 services/openai.ts 中处理
    // 如果 API key 不存在，completeMessages 函数会抛出错误

    try {
      const metadata = await extractMetadataFromMarkdown(content, filePath);

      // 打印 tokens 使用情况
      if (metadata.tokens_used) {
        this.aiService.logTokenUsage(filePath, metadata.tokens_used);
      }

      return metadata;
    } catch (error) {
      console.error(`❌ Failed to extract AI metadata for ${filePath}:`, error);
      return null;
    }
  }

  /**
   * 批量处理文件
   */
  async processFiles(
    files: Array<{ content: string; path: string; hash: string }>
  ): Promise<Map<string, AIMetadata>> {
    const results = new Map<string, AIMetadata>();
    const config = this.aiService.getConfig();

    // API key 检查现在在 services/openai.ts 中处理
    // 如果 API key 不存在，completeMessages 函数会抛出错误

    console.log(`🤖 Processing ${files.length} files with AI...`);

    for (const file of files) {
      try {
        // 检查缓存
        const cachedMetadata = await this.aiService.getCachedMetadata(file.hash, file.path);
        if (cachedMetadata) {
          results.set(file.path, cachedMetadata);
          continue;
        }

        // 调用 AI 提取 metadata
        const metadata = await this.extractMetadata(file.content, file.path);
        if (metadata) {
          results.set(file.path, metadata);

          // 缓存结果
          await this.aiService.cacheMetadata(file.hash, file.path, metadata);
        }
      } catch (error) {
        console.error(`❌ Failed to process file ${file.path}:`, error);
      }
    }

    return results;
  }
}
