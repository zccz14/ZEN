import { LANGUAGE_NAMES } from '../languages';
import { completeMessages, OpenAIMessage } from '../services/openai';

/**

 * @param content Markdown 内容
 * @param targetLang 目标语言代码（例如：zh-Hans, en-US）
 * @returns Promise<string> 翻译后的 Markdown 内容
 */
export async function translateMarkdown(content: string, targetLang: string): Promise<string> {
  const langName = LANGUAGE_NAMES[targetLang];
  const lang = `${langName} (${targetLang})`;
  const messages: OpenAIMessage[] = [
    {
      role: 'system',
      content: [
        `You are a professional document translator.`,
        `Translate the following markdown content into ${lang}`,
        targetLang === 'ja-JP'
          ? [
              //
              '使用日语母语者自然的表达方式。',
              '采用适合技术/专业文档的礼貌、正式语体（丁寧体/です・ます体）',
              '确保语法和字符集完全符合日语规范。',
              '绝对禁止使用繁体中文汉字。',
              '所有日语汉字必须使用标准的 **日本常用汉字（Jōyō kanji）** 字形。',
              '特别检查以下字形示例，确保使用日文标准字形：',
              '1. “国” - 使用“国”而非“國”',
              '2. “学” - 使用“学”而非“學”',
              '3. “広” - 使用“広”而非“廣”',
              '4. “円” - 使用“円”而非“圓”',
              '5. “医” - 使用“医”而非“醫”',
              '6. “図” - 使用“図”而非“圖”',
              '7. “対” - 使用“対”而非“對”',
              '8. “声” - 使用“声”而非“聲”',
              '9. “芸” - 使用“芸”而非“藝”',
              '10. “験” - 使用“験”而非“驗”',
            ].join('\n')
          : ``,
        `Preserve the original markdown formatting, including headings, lists, code blocks, links, and images.`,
        `Do not change any non-text elements or their formatting.`,
        `Ensure that technical terms and code snippets remain unchanged.`,
        `Provide a natural and fluent translation suitable for readers familiar with the subject matter.`,
      ].join('\n'),
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
