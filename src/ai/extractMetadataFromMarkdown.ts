import { AIMetadata } from '../types';
import { completeMessages, OpenAIMessage, OpenAIResponse } from '../services/openai';

/**
 * 从 markdown 内容中提取 metadata
 * @param content Markdown 内容
 * @param filePath 文件路径（用于日志）
 * @returns Promise<AIMetadata> 提取的元数据，失败时抛出错误
 */
export async function extractMetadataFromMarkdown(
  content: string,
  filePath: string
): Promise<AIMetadata> {
  console.log(`🤖 Extracting AI metadata for: ${filePath}`);

  const prompt = buildMetadataPrompt(content);
  const messages: OpenAIMessage[] = [
    {
      role: 'system',
      content:
        '你是一个专业的文档分析助手，擅长从文档中提取结构化信息。请严格按照要求的 JSON 格式返回结果。',
    },
    {
      role: 'user',
      content: prompt,
    },
  ];

  const response = await completeMessages(messages, {
    response_format: { type: 'json_object' },
  });

  const metadata = parseMetadataResponse(response.choices[0].message.content);

  // 添加 tokens 使用情况
  metadata.tokens_used = {
    prompt: response.usage.prompt_tokens,
    completion: response.usage.completion_tokens,
    total: response.usage.total_tokens,
  };

  return metadata;
}

/**
 * 构建提取 metadata 的 prompt
 */
function buildMetadataPrompt(content: string): string {
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
 * 解析 AI 返回的 metadata
 */
function parseMetadataResponse(responseContent: string): AIMetadata {
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
