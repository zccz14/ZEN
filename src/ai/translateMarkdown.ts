import { completeMessages, OpenAIMessage } from '../services/openai';

/**
 * 将 markdown 翻译为指定的语言
 * @param content Markdown 内容
 * @param sourceLang 源语言代码（例如：zh-Hans, en-US）
 * @param targetLang 目标语言代码（例如：zh-Hans, en-US）
 * @returns Promise<string> 翻译后的 Markdown 内容
 */
export async function translateMarkdown(
  content: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  const prompt = `请将以下${sourceLang}文本翻译成${targetLang}。保持Markdown格式不变，只翻译文本内容：

${content}

翻译结果（保持原格式）：`;

  const messages: OpenAIMessage[] = [
    {
      role: 'system',
      content: '你是一个专业的翻译助手，擅长将文档翻译成不同语言，同时保持原有的格式和结构。',
    },
    {
      role: 'user',
      content: prompt,
    },
  ];

  const response = await completeMessages(messages);
  const translatedContent = response.choices[0]?.message?.content?.trim() || '';

  if (!translatedContent) {
    throw new Error('Empty translation response');
  }

  return translatedContent;
}
