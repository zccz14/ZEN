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
    /* Critical CSS for initial render */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    html {
      font-size: 16px;
      scroll-behavior: smooth;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1e293b;
      background: #f8fafc;
      display: flex;
      min-height: 100vh;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    .sidebar {
      width: 280px;
      background: #ffffff;
      border-right: 1px solid #e2e8f0;
      padding: 2rem 1rem;
      overflow-y: auto;
      position: fixed;
      height: 100vh;
      left: 0;
      top: 0;
      z-index: 10;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    }

    .content {
      flex: 1;
      margin-left: 280px;
      padding: 3rem 4rem;
      max-width: 900px;
      min-height: 100vh;
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
        border-bottom: 1px solid #e2e8f0;
        padding: 1.5rem 1rem;
      }

      .content {
        margin-left: 0;
        padding: 2rem;
      }
    }
  </style>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github.min.css">
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <nav class="sidebar">
    <div class="sidebar-header">
      <h1>ZEN Documentation</h1>
      <p>A minimalist Markdown documentation site builder</p>
    </div>
    {{navigation}}
    <div class="sidebar-footer">
      <div class="theme-toggle">
        <button class="theme-toggle-btn" aria-label="Toggle dark mode">
          <svg class="theme-icon-light" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 12C10.2091 12 12 10.2091 12 8C12 5.79086 10.2091 4 8 4C5.79086 4 4 5.79086 4 8C4 10.2091 5.79086 12 8 12Z" fill="currentColor"/>
            <path d="M8 2V3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M8 13V14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M2 8H3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M13 8H14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M3.51465 3.51465L4.22183 4.22183" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M11.7782 11.7782L12.4854 12.4854" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M3.51465 12.4854L4.22183 11.7782" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M11.7782 4.22183L12.4854 3.51465" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <svg class="theme-icon-dark" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 8C14 11.3137 11.3137 14 8 14C4.68629 14 2 11.3137 2 8C2 4.68629 4.68629 2 8 2C11.3137 2 14 4.68629 14 8Z" fill="currentColor"/>
          </svg>
        </button>
      </div>
    </div>
  </nav>

  <main class="content">
    <header class="content-header">
      <h1>{{title}}</h1>
      <div class="meta">
        <span class="last-updated">Last updated: <time datetime="{{metadata.lastUpdated}}">{{metadata.lastUpdated}}</time></span>
        <span class="reading-time">Reading time: {{metadata.readingTime}} min</span>
      </div>
    </header>

    <article class="content-body">
      {{{content}}}
    </article>

    <div class="content-navigation">
      <div class="prev-next">
        <a href="{{prevLink}}" class="nav-btn prev-btn" {{prevLinkDisabled}}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 12L6 8L10 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Previous</span>
        </a>
        <a href="{{nextLink}}" class="nav-btn next-btn" {{nextLinkDisabled}}>
          <span>Next</span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 12L10 8L6 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </a>
      </div>
    </div>

    <footer class="footer">
      <div class="footer-content">
        <p>Generated by <strong>ZEN</strong> • <a href="https://github.com/zccz14/ZEN" target="_blank" rel="noopener">View on GitHub</a></p>
        <p class="footer-meta">Version {{metadata.version}} • Built on {{metadata.buildDate}}</p>
      </div>
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

    // 替换元数据变量
    if (data.metadata) {
      result = result.replace(/{{metadata\.lastUpdated}}/g, data.metadata.lastUpdated || '');
      result = result.replace(
        /{{metadata\.readingTime}}/g,
        data.metadata.readingTime?.toString() || ''
      );
      result = result.replace(/{{metadata\.version}}/g, data.metadata.version || '');
      result = result.replace(/{{metadata\.buildDate}}/g, data.metadata.buildDate || '');
    }

    // 替换导航链接
    result = result.replace(/{{prevLink}}/g, data.prevLink || '');
    result = result.replace(/{{nextLink}}/g, data.nextLink || '');

    // 处理条件变量（如果链接不存在，添加disabled属性）
    result = result.replace(/{{prevLinkDisabled}}/g, data.prevLink ? '' : 'disabled');
    result = result.replace(/{{nextLinkDisabled}}/g, data.nextLink ? '' : 'disabled');

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
    const now = new Date();
    const defaultMetadata = {
      title: fileInfo.name,
      lastUpdated: now.toISOString().split('T')[0], // YYYY-MM-DD格式
      readingTime: Math.ceil((fileInfo.content.length || 0) / 1000), // 粗略估计：每1000字符约1分钟
      version: '1.0.0',
      buildDate: now.toLocaleDateString('zh-CN'),
    };

    return {
      title: fileInfo.metadata?.title || fileInfo.name, // 优先使用提取的标题，如果没有则使用文件名
      content: fileInfo.html || '',
      navigation,
      metadata: { ...defaultMetadata, ...fileInfo.metadata },
      currentPath: `/${fileInfo.relativePath.replace(/\.md$/, '.html')}`,
      prevLink: '',
      nextLink: '',
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
