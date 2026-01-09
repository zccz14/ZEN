import { completeMessages, OpenAIMessage } from '../services/openai';
import { AIMetadata } from '../types';

/**
 * 从 markdown 内容中提取 metadata
 * @param content Markdown 内容
 * @returns Promise<AIMetadata> 提取的元数据，失败时抛出错误
 */
export async function extractMetadataFromMarkdown(content: string): Promise<AIMetadata> {
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
  const maxContentLength = Infinity; // 可根据需要调整长度限制
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
1. title: 文档的标题（简洁明了，不超过 30 个字）
2. slug: URL 友好别名（使用小写字母、数字和连字符，仅包含英文和数字）
3. tags: 关键词列表（3-8 个关键词，使用中文或英文）
4. description: 文档的简短描述，微摘要（用一句话概括本文核心价值，不超过 100 字符），用于 SEO meta description，社交卡片短描述
5. summary: 文档中型摘要（用一段话总结文章，包含关键论点和结论，控制在 300 字以内），用于 邮件推送内容，newsletter 介绍
6. inferred_date: 文档中隐含的创建日期（如果有的话，格式：YYYY-MM-DD，没有就留空字符串）
7. inferred_lang: 文档使用的语言代码（例如：zh-Hans 表示简体中文，en-US 表示美式英语）
8. key_points: 文章的关键要点列表（5-10 个要点，简洁明了）
9. audience: 目标读者描述（简短描述，50 字以内）
10. short_summary: 文档的超短摘要（用 2-3 句话概括文章主要内容，突出核心观点），用于文章列表页摘要，RSS feed 描述


请严格按照以下 JSON 格式返回，不要包含任何其他文本：
{
  "title": "文档标题",
  "description": "用一句话概括本文核心价值，不超过 100 字符",
  "summary": "中型摘要，用一段话总结文章，包含关键论点和结论",
  "short_summary": "超短摘要，用 2-3 句话概括文章主要内容，突出核心观点",
  "slug": "URL 友好别名",
  "tags": ["关键词1", "关键词2", "关键词3"],
  "inferred_date": "2023-01-01",
  "inferred_lang": "zh-Hans",
  "key_points": ["要点1", "要点2", "要点3"],
  "audience": "目标读者描述"
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
      description: metadata.description?.trim() || '',
      short_summary: metadata.short_summary?.trim() || '',
      audience: metadata.audience?.trim() || '',
      key_points: Array.isArray(metadata.key_points)
        ? metadata.key_points.map((point: string) => point.trim()).filter(Boolean)
        : [],
      summary: metadata.summary?.trim() || '',
      slug: metadata.slug?.trim() || '',
      tags: Array.isArray(metadata.tags)
        ? metadata.tags.map((tag: string) => tag.trim()).filter(Boolean)
        : [],
      inferred_date: metadata.inferred_date?.trim() || undefined,
      inferred_lang: metadata.inferred_lang?.trim() || 'zh-Hans',
    };
  } catch (error) {
    console.error('❌ Failed to parse AI response:', error, 'Response:', responseContent);
    throw error;
  }
}
