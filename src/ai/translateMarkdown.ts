import { completeMessages, OpenAIMessage } from '../services/openai';

/**
 * 将 markdown 翻译为指定的语言
 * @param content Markdown 内容
 * @param targetLang 目标语言代码（例如：zh-Hans, en-US）
 * @returns Promise<string> 翻译后的 Markdown 内容
 */
export async function translateMarkdown(content: string, targetLang: string): Promise<string> {
  const messages: OpenAIMessage[] = [
    {
      role: 'system',
      content: `你是一个专业的翻译助手，擅长将文档翻译成不同语言，同时保持原有的格式和结构。请将用户输入翻译成 ${targetLang}，注意保持 Markdown 格式不变，链接不变，不要翻译代码，但是可以翻译代码中的注释。`,
    },
    {
      role: 'user',
      content: content,
    },
  ];

  const response = await completeMessages(messages);
  const translatedContent = response.choices[0]?.message?.content?.trim() || '';

  if (!translatedContent) {
    throw new Error('Empty translation response');
  }

  return translatedContent;
}
