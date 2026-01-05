import { marked } from 'marked';
import hljs from 'highlight.js';

// 配置 marked 使用 highlight.js 进行代码高亮
marked.setOptions({
  highlight: function (code: string, lang: string) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value;
      } catch (err) {
        console.warn(`Failed to highlight code with language ${lang}:`, err);
      }
    }
    return hljs.highlightAuto(code).value;
  },
  pedantic: false,
  gfm: true,
  breaks: false,
  sanitize: false,
  smartLists: true,
  smartypants: false,
  xhtml: false,
} as any);

/**
 * 将 Markdown 内容转换为 HTML
 * @param mdContent Markdown 内容字符串
 * @returns 转换后的 HTML 字符串
 */
export const convertMarkdownToHtml = (mdContent: string): string => {
  return marked.parse(mdContent) as string;
};
