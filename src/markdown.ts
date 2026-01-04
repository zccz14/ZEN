import { marked } from 'marked';
import hljs from 'highlight.js';
import { FileInfo, MarkdownProcessor } from './types';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'yaml';
import { GitIgnoreProcessor } from './gitignore';

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

export class MarkdownConverter {
  private processors: MarkdownProcessor[] = [];

  constructor(processors: MarkdownProcessor[] = []) {
    this.processors = processors;
  }

  /**
   * 添加处理器
   */
  addProcessor(processor: MarkdownProcessor): void {
    this.processors.push(processor);
  }

  /**
   * 解析 YAML frontmatter
   */
  private parseFrontmatter(content: string): {
    metadata: Record<string, any>;
    content: string;
  } {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
    const match = content.match(frontmatterRegex);

    if (!match) {
      return { metadata: {}, content };
    }

    try {
      const metadata = yaml.parse(match[1]) || {};
      const remainingContent = content.slice(match[0].length);
      return { metadata, content: remainingContent };
    } catch (error) {
      console.warn('Failed to parse frontmatter:', error);
      return { metadata: {}, content };
    }
  }

  /**
   * 从内容中提取标题
   */
  private extractTitle(content: string): string {
    // 查找第一个一级标题
    const h1Match = content.match(/^#\s+(.+)$/m);
    if (h1Match) {
      return h1Match[1].trim();
    }

    // 如果没有一级标题，查找第一个二级标题
    const h2Match = content.match(/^##\s+(.+)$/m);
    if (h2Match) {
      return h2Match[1].trim();
    }

    return 'Untitled';
  }

  /**
   * 转换 Markdown 文件
   */
  async convert(fileInfo: FileInfo): Promise<FileInfo> {
    let { content, metadata } = this.parseFrontmatter(fileInfo.content);

    // 应用前置处理器
    for (const processor of this.processors) {
      if (processor.beforeParse) {
        content = await processor.beforeParse(content, fileInfo);
      }
    }

    // 转换 Markdown 为 HTML
    let html = marked.parse(content) as string;

    // 应用后置处理器
    for (const processor of this.processors) {
      if (processor.afterParse) {
        html = await processor.afterParse(html, fileInfo);
      }
    }

    // 提取标题（如果 metadata 中没有）
    if (!metadata.title) {
      metadata.title = this.extractTitle(content);
    }

    return {
      ...fileInfo,
      content,
      html,
      metadata,
    };
  }

  /**
   * 批量转换文件
   */
  async convertFiles(files: FileInfo[]): Promise<FileInfo[]> {
    const results: FileInfo[] = [];

    for (const file of files) {
      try {
        const result = await this.convert(file);
        results.push(result);
      } catch (error) {
        console.error(`Failed to convert file ${file.path}:`, error);
        // 即使转换失败，也保留原始文件信息
        results.push(file);
      }
    }

    return results;
  }

  /**
   * 从文件路径读取并转换
   */
  async convertFromPath(filePath: string, baseDir: string = ''): Promise<FileInfo> {
    const content = await fs.readFile(filePath, 'utf-8');
    const relativePath = baseDir ? path.relative(baseDir, filePath) : filePath;
    const ext = path.extname(filePath);
    const name = path.basename(filePath, ext);

    const fileInfo: FileInfo = {
      path: filePath,
      relativePath,
      name,
      ext,
      content,
    };

    return this.convert(fileInfo);
  }

  /**
   * 从目录读取所有 Markdown 文件并转换
   */
  async convertDirectory(dirPath: string): Promise<FileInfo[]> {
    const files: FileInfo[] = [];

    // 创建 GitIgnoreProcessor 并加载 .gitignore 文件
    const gitignoreProcessor = new GitIgnoreProcessor(dirPath);
    await gitignoreProcessor.loadFromFile();

    async function scanDirectory(currentPath: string) {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);

        // 检查是否应该被 .gitignore 忽略
        if (gitignoreProcessor.shouldIgnore(fullPath)) {
          continue;
        }

        // 忽略 .zen 目录（保持向后兼容）
        if (entry.name === '.zen') {
          continue;
        }

        if (entry.isDirectory()) {
          await scanDirectory(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          const content = await fs.readFile(fullPath, 'utf-8');
          const relativePath = path.relative(dirPath, fullPath);
          const ext = path.extname(entry.name);
          const name = path.basename(entry.name, ext);

          files.push({
            path: fullPath,
            relativePath,
            name,
            ext,
            content,
          });
        }
      }
    }

    await scanDirectory(dirPath);
    return this.convertFiles(files);
  }
}
