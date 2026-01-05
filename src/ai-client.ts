import { AIMetadata } from './types';
import { AIService, AIConfig } from './ai-service';

/**
 * OpenAI 兼容 API 响应接口
 */
interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * AI 客户端类 - 使用 fetch 调用 OpenAI 兼容 API
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

    if (!config.apiKey) {
      console.log(`⚠️ API key not configured for: ${filePath}`);
      return null;
    }

    try {
      console.log(`🤖 Extracting AI metadata for: ${filePath}`);

      const prompt = this.buildMetadataPrompt(content);
      const response = await this.callOpenAIAPI(prompt, config);

      if (!response) {
        console.warn(`⚠️ Failed to extract metadata for: ${filePath}`);
        return null;
      }

      const metadata = this.parseMetadataResponse(response.choices[0].message.content);

      // 添加 tokens 使用情况
      metadata.tokens_used = {
        prompt: response.usage.prompt_tokens,
        completion: response.usage.completion_tokens,
        total: response.usage.total_tokens,
      };

      // 打印 tokens 使用情况
      this.aiService.logTokenUsage(filePath, metadata.tokens_used);

      return metadata;
    } catch (error) {
      console.error(`❌ Failed to extract AI metadata for ${filePath}:`, error);
      return null;
    }
  }

  /**
   * 构建提取 metadata 的 prompt
   */
  private buildMetadataPrompt(content: string): string {
    // 限制内容长度以避免 token 超限
    const maxContentLength = 8000;
    const truncatedContent =
      content.length > maxContentLength
        ? content.substring(0, maxContentLength) + '... [内容已截断]'
        : content;

    return `请分析以下文档内容，提取以下信息并返回 JSON 格式：

文档内容：
"""
${truncatedContent}
"""

请提取：
1. title: 文档的标题（简洁明了，不超过 20 个字）
2. summary: 文档摘要（控制在 100 字以内，概括主要内容）
3. tags: 关键词列表（3-8 个关键词，使用中文或英文）
4. inferred_date: 文档中隐含的创建日期（如果有的话，格式：YYYY-MM-DD，没有就留空字符串）
5. inferred_lang: 文档使用的语言代码（例如：zh-Hans 表示简体中文，en-US 表示美式英语）

请严格按照以下 JSON 格式返回，不要包含任何其他文本：
{
  "title": "文档标题",
  "summary": "文档摘要...",
  "tags": ["关键词1", "关键词2", "关键词3"],
  "inferred_date": "2023-01-01",
  "inferred_lang": "zh-Hans"
}`;
  }

  /**
   * 调用 OpenAI 兼容 API
   */
  private async callOpenAIAPI(prompt: string, config: AIConfig): Promise<OpenAIResponse | null> {
    try {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            {
              role: 'system',
              content:
                '你是一个专业的文档分析助手，擅长从文档中提取结构化信息。请严格按照要求的 JSON 格式返回结果。',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: config.temperature,
          max_tokens: config.maxTokens,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ OpenAI API error (${response.status}):`, errorText);
        return null;
      }

      const data: OpenAIResponse = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Failed to call OpenAI API:', error);
      return null;
    }
  }

  /**
   * 解析 AI 返回的 metadata
   */
  private parseMetadataResponse(responseContent: string): AIMetadata {
    try {
      const metadata = JSON.parse(responseContent);

      // 验证和清理数据
      return {
        title: metadata.title?.trim() || '未命名文档',
        summary: metadata.summary?.trim() || '',
        tags: Array.isArray(metadata.tags)
          ? metadata.tags.map((tag: string) => tag.trim()).filter(Boolean)
          : [],
        inferred_date: metadata.inferred_date?.trim() || undefined,
        inferred_lang: metadata.inferred_lang?.trim() || 'zh-Hans',
      };
    } catch (error) {
      console.error('❌ Failed to parse AI response:', error, 'Response:', responseContent);

      // 返回默认值
      return {
        title: '解析失败',
        summary: 'AI 响应解析失败',
        tags: ['error'],
        inferred_lang: 'zh-Hans',
      };
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

    if (!config.apiKey) {
      console.log('⚠️ API key not configured');
      return results;
    }

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
