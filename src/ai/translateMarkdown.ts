import { LANGUAGE_NAMES } from '../languages';
import { completeMessages, OpenAIMessage } from '../services/openai';

/**

 * @param content Markdown 内容
 * @param targetLang 目标语言代码（例如：zh-Hans, en-US）
 * @returns Promise<string> 翻译后的 Markdown 内容
 */
export async function translateMarkdown(filePath: string, content: string, targetLang: string) {
  const langName = LANGUAGE_NAMES[targetLang];
  const lang = `${langName} (${targetLang})`;
  const messages: OpenAIMessage[] = [
    {
      role: 'system',
      content: [
        `你是一名专业的翻译人员，精通多种语言之间的翻译。`,
        `将以下 Markdown 内容翻译成 ${lang}`,
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
        '保留原有的 Markdown 格式，包括标题、列表、代码块、链接和图片。',
        '不要更改任何非文本元素或其格式。',
        '确保技术术语和代码片段保持不变。',
        '提供自然流畅的翻译，适合熟悉该主题的读者阅读。',
        `面对术语或短语时，挑选 ${lang} 中最常用和易懂的表达方式，避免保留原语言短语，避免短语级别的翻译遗漏。`,
      ].join('\n'),
    },
    {
      role: 'user',
      content: content,
    },
  ];

  return completeMessages(messages, {
    task_id: `translate-markdown:${filePath}-${targetLang}`,
  });
}
