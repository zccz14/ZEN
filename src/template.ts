import { TemplateData, NavigationItem, FileInfo } from './types';
import * as fs from 'fs/promises';
import * as path from 'path';

export class TemplateEngine {
  private defaultTemplate = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{title}}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f8f9fa;
      display: flex;
      min-height: 100vh;
    }

    .sidebar {
      width: 280px;
      background: #fff;
      border-right: 1px solid #e9ecef;
      padding: 2rem 1rem;
      overflow-y: auto;
      position: fixed;
      height: 100vh;
      left: 0;
      top: 0;
    }

    .sidebar-header {
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #e9ecef;
    }

    .sidebar-header h1 {
      font-size: 1.5rem;
      font-weight: 600;
      color: #212529;
    }

    .sidebar-header p {
      color: #6c757d;
      font-size: 0.875rem;
      margin-top: 0.5rem;
    }

    .nav-list {
      list-style: none;
    }

    .nav-item {
      margin-bottom: 0.5rem;
    }

    .nav-link {
      display: block;
      padding: 0.5rem 1rem;
      color: #495057;
      text-decoration: none;
      border-radius: 4px;
      transition: all 0.2s;
    }

    .nav-link:hover {
      background: #e9ecef;
      color: #212529;
    }

    .nav-link.active {
      background: #007bff;
      color: white;
    }

    .nav-submenu {
      list-style: none;
      margin-left: 1rem;
      margin-top: 0.25rem;
    }

    .content {
      flex: 1;
      margin-left: 280px;
      padding: 3rem 4rem;
      max-width: 900px;
    }

    .content-header {
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #e9ecef;
    }

    .content-header h1 {
      font-size: 2.5rem;
      font-weight: 700;
      color: #212529;
      margin-bottom: 0.5rem;
    }

    .content-header .meta {
      color: #6c757d;
      font-size: 0.875rem;
    }

    .content-body {
      font-size: 1.125rem;
      line-height: 1.8;
    }

    .content-body h1 {
      font-size: 2rem;
      margin: 2rem 0 1rem;
      color: #212529;
    }

    .content-body h2 {
      font-size: 1.75rem;
      margin: 1.75rem 0 0.875rem;
      color: #343a40;
    }

    .content-body h3 {
      font-size: 1.5rem;
      margin: 1.5rem 0 0.75rem;
      color: #495057;
    }

    .content-body p {
      margin: 1rem 0;
    }

    .content-body ul, .content-body ol {
      margin: 1rem 0 1rem 2rem;
    }

    .content-body li {
      margin: 0.5rem 0;
    }

    .content-body blockquote {
      border-left: 4px solid #007bff;
      padding: 0.5rem 1rem;
      margin: 1rem 0;
      background: #f8f9fa;
      color: #495057;
    }

    .content-body code {
      background: #f8f9fa;
      padding: 0.2rem 0.4rem;
      border-radius: 3px;
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 0.875em;
    }

    .content-body pre {
      background: #f8f9fa;
      padding: 1rem;
      border-radius: 6px;
      overflow-x: auto;
      margin: 1rem 0;
    }

    .content-body pre code {
      background: none;
      padding: 0;
    }

    .content-body table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
    }

    .content-body th, .content-body td {
      border: 1px solid #dee2e6;
      padding: 0.75rem;
      text-align: left;
    }

    .content-body th {
      background: #f8f9fa;
      font-weight: 600;
    }

    .content-body img {
      max-width: 100%;
      height: auto;
      border-radius: 6px;
      margin: 1rem 0;
    }

    .content-body a {
      color: #007bff;
      text-decoration: none;
    }

    .content-body a:hover {
      text-decoration: underline;
    }

    .footer {
      margin-top: 3rem;
      padding-top: 2rem;
      border-top: 1px solid #e9ecef;
      color: #6c757d;
      font-size: 0.875rem;
      text-align: center;
    }

    @media (max-width: 768px) {
      body {
        flex-direction: column;
      }

      .sidebar {
        width: 100%;
        height: auto;
        position: static;
        border-right: none;
        border-bottom: 1px solid #e9ecef;
      }

      .content {
        margin-left: 0;
        padding: 2rem;
      }
    }
  </style>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github.min.css">
</head>
<body>
  <nav class="sidebar">
    <div class="sidebar-header">
      <h1>ZEN Documentation</h1>
      <p>A minimalist Markdown documentation site builder</p>
    </div>
    {{navigation}}
  </nav>

  <main class="content">
    <header class="content-header">
      <h1>{{title}}</h1>
    </header>

    <article class="content-body">
      {{{content}}}
    </article>

    <footer class="footer">
      <p>Generated by <strong>ZEN</strong> • <a href="https://github.com/zccz14/ZEN" target="_blank">View on GitHub</a></p>
    </footer>
  </main>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js"></script>
  <script>hljs.highlightAll();</script>
</body>
</html>`;

  /**
   * 生成导航 HTML
   */
  private generateNavigationHtml(navigation: NavigationItem[], currentPath?: string): string {
    const renderItem = (item: NavigationItem): string => {
      const isActive = currentPath === item.path;
      const activeClass = isActive ? 'active' : '';

      let html = `<li class="nav-item">`;
      html += `<a href="${item.path}" class="nav-link ${activeClass}">${item.title}</a>`;

      if (item.children && item.children.length > 0) {
        html += `<ul class="nav-submenu">`;
        html += item.children.map(child => renderItem(child)).join('');
        html += `</ul>`;
      }

      html += `</li>`;
      return html;
    };

    return `<ul class="nav-list">${navigation.map(item => renderItem(item)).join('')}</ul>`;
  }

  /**
   * 简单的模板变量替换
   */
  private renderTemplate(template: string, data: TemplateData): string {
    let result = template;

    // 替换导航
    const navigationHtml = this.generateNavigationHtml(data.navigation, data.currentPath);
    result = result.replace('{{navigation}}', navigationHtml);

    // 替换其他变量 - 使用全局替换
    result = result.replace(/{{title}}/g, data.title || 'Untitled');
    result = result.replace(/{{{content}}}/g, data.content || '');

    return result;
  }

  /**
   * 渲染模板
   */
  async render(data: TemplateData, templatePath?: string): Promise<string> {
    let template = this.defaultTemplate;

    if (templatePath) {
      try {
        template = await fs.readFile(templatePath, 'utf-8');
      } catch (error) {
        console.warn(
          `Failed to load custom template from ${templatePath}, using default template:`,
          error
        );
      }
    }

    return this.renderTemplate(template, data);
  }

  /**
   * 从文件信息生成模板数据
   */
  generateTemplateData(fileInfo: FileInfo, navigation: NavigationItem[]): TemplateData {
    return {
      title: fileInfo.metadata?.title || fileInfo.name, // 优先使用提取的标题，如果没有则使用文件名
      content: fileInfo.html || '',
      navigation,
      metadata: fileInfo.metadata,
      currentPath: `/${fileInfo.relativePath.replace(/\.md$/, '.html')}`,
    };
  }

  /**
   * 生成输出文件路径
   */
  getOutputPath(fileInfo: FileInfo, outDir: string): string {
    const htmlFileName = `${fileInfo.name}.html`;
    const relativeDir = path.dirname(fileInfo.relativePath);
    return path.join(outDir, relativeDir, htmlFileName);
  }

  /**
   * 保存渲染结果到文件
   */
  async saveToFile(html: string, outputPath: string): Promise<void> {
    // 确保目录存在
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });

    // 写入文件
    await fs.writeFile(outputPath, html, 'utf-8');
  }
}
