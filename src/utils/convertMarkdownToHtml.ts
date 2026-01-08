import hljs from 'highlight.js';
import { marked } from 'marked';
import markedKatex from 'marked-katex-extension';

// 辅助函数：转义 HTML 特殊字符
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
marked.use(markedKatex({ throwOnError: false, nonStandard: true } as any));

/**
 * 将 Markdown 内容转换为 HTML
 * @param mdContent Markdown 内容字符串
 * @returns 转换后的 HTML 字符串
 */
export const convertMarkdownToHtml = (mdContent: string): string => {
  // 创建自定义渲染器
  const renderer = new marked.Renderer();
  const originalCodeRenderer = renderer.code;

  // 重写代码块渲染器以支持 Mermaid - 使用 any 类型绕过类型检查
  (renderer as any).code = function (code: any, language?: string, isEscaped?: boolean) {
    // 在 marked 17+ 中，code 参数是一个对象，包含 text 和 lang 属性
    const codeText = typeof code === 'string' ? code : code?.text || '';
    // 语言信息在 code.lang 中，而不是 language 参数
    const lang = code?.lang || language;

    // 检测 Mermaid 代码块
    if (lang === 'mermaid') {
      // 生成唯一的 ID 用于图表容器
      const chartId = 'mermaid-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      return `
<div class="mermaid-diagram" data-mermaid-id="${chartId}">
  <pre class="mermaid">${escapeHtml(codeText)}</pre>
</div>
`;
    }

    // 其他代码块使用原有高亮逻辑
    return (originalCodeRenderer as any).call(this, code, language, isEscaped);
  };

  // 使用 marked.parse 的同步版本
  // marked 17+ 默认返回 Promise，但我们可以使用 marked.parseSync 或 marked.parse 的同步模式
  // 这里我们使用 marked.parse 并假设它是同步的（对于简单情况）
  try {
    // 尝试同步解析
    const result = marked.parse(mdContent, {
      renderer,
      highlight: function (code: string, lang: string) {
        // 跳过 Mermaid 代码块的高亮
        if (lang === 'mermaid') {
          return code;
        }

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
      async: false, // 强制同步模式
    } as any);

    // 如果结果是 Promise，等待它（虽然我们设置了 async: false）
    if (result && typeof result.then === 'function') {
      // 这不应该发生，但如果发生了，返回一个占位符
      console.warn('marked.parse returned a Promise despite async: false');
      return '<!-- Markdown conversion in progress -->';
    }

    return result as unknown as string;
  } catch (error) {
    console.error('Error converting Markdown to HTML:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return `<div class="error">Error converting Markdown: ${errorMessage}</div>`;
  }
};
