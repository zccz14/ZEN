import * as fs from 'fs/promises';
import * as path from 'path';
import { MetaData } from '../metadata';
import { ZEN_DIST_DIR, ZEN_SRC_DIR } from '../paths';
import { MetaDataStore, NavigationItem } from '../types';
import { convertMarkdownToHtml } from '../utils/convertMarkdownToHtml';

const langNames: Record<string, string> = {
  'zh-Hans': '简体中文',
  'en-US': 'English',
  'ja-JP': '日本語',
  'ko-KR': '한국어',
};
/**
 * 生成语言切换器 HTML
 * @param currentLang 当前语言
 * @param availableLangs 可用语言列表
 * @returns 语言切换器 HTML 字符串
 */
function generateLanguageSwitcher(templateData: TemplateData): string {
  const {
    options: { langs = [], baseUrl = '/' },
  } = MetaData;

  const items = langs
    .map(lang => {
      const langName = langNames[lang] || lang;
      const isCurrent = lang === templateData.lang;
      const activeClass = isCurrent ? 'active' : '';

      return `<li class="lang-item ${activeClass}">
        <a href="${path.join(baseUrl, lang, templateData.file.hash + '.html')}" class="lang-link">${langName}</a>
      </li>`;
    })
    .join('');

  return `<div class="language-switcher">
    <span class="lang-label">Language:</span>
    <ul class="lang-list">${items}</ul>
  </div>`;
}
function generateFlatNavigation(lang: string): NavigationItem[] {
  const {
    files,
    options: { baseUrl = '/' },
  } = MetaData;
  return files
    .map(file => {
      const title = file.metadata?.title || file.path; // 优先使用提取的标题

      return {
        title,
        path: path.join(baseUrl, lang, file.hash + '.html'),
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}
/**
 * 生成导航 HTML
 * @param navigation 导航树
 * @param currentPath 当前路径（可选，用于高亮当前页面）
 * @returns 导航 HTML 字符串
 */
function generateNavigationHtml(lang: string, currentPath?: string): string {
  const navigation = generateFlatNavigation(lang);

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

interface TemplateData {
  file: MetaDataStore['files'][0];
  lang: string;
}

/**
 * 简单的模板变量替换
 * @param template 模板字符串
 * @param data 模板数据
 * @returns 渲染后的 HTML 字符串
 */
async function renderTemplate(template: string, data: TemplateData): Promise<string> {
  const {
    options: { langs = [] },
  } = MetaData;
  const markdownContent = await fs.readFile(
    path.join(ZEN_SRC_DIR, data.lang, data.file.hash + '.md'),
    'utf-8'
  );

  const htmlContent = convertMarkdownToHtml(markdownContent);

  let result = template;

  // 替换导航
  const navigationHtml = generateNavigationHtml(data.lang, data.file.hash);
  result = result.replace('{{navigation}}', navigationHtml);

  // 替换其他变量 - 使用全局替换
  result = result.replace(/{{title}}/g, data.file.metadata.title || 'Untitled');
  result = result.replace(/{{content}}/g, htmlContent);

  // 替换元数据变量
  if (data.file.metadata) {
    result = result.replace(/{{summary}}/g, data.file.metadata.summary || '');
    result = result.replace(/{{tags}}/g, data.file.metadata.tags?.join(', ') || '');
    result = result.replace(/{{inferred_date}}/g, data.file.metadata.inferred_date || '');
    result = result.replace(/{{inferred_lang}}/g, data.file.metadata.inferred_lang || '');
  }

  // 替换语言相关变量
  result = result.replace(/{{lang}}/g, data.lang || '');
  if (langs && langs.length > 1 && data.lang) {
    const langSwitcher = generateLanguageSwitcher(data);
    result = result.replace('{{language_switcher}}', langSwitcher);
  }

  return result;
}

/**
 * 渲染模板并保存文件
 */
export async function renderTemplates(): Promise<void> {
  const {
    files,
    options: { langs, verbose },
  } = MetaData;

  if (verbose) console.log(`⚡ Processing files...`);
  const layoutTemplate = await fs.readFile(
    path.join(__dirname, '../../assets/templates/default/layout.html'),
    'utf-8'
  );

  for (const file of files) {
    for (const lang of langs || []) {
      console.info(`📄 Preparing file for language: ${file.path} [${file.hash}] [${lang}]`);
      const targetPath = path.join(ZEN_DIST_DIR, lang, file.hash + '.html');
      try {
        const html = await renderTemplate(layoutTemplate, {
          file,
          lang,
        });
        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        await fs.writeFile(targetPath, html, 'utf-8');
        if (verbose) console.log(`✅ Rendered: ${targetPath}`);
      } catch (error) {
        console.error(`❌ Failed to render ${file.path}:`, error);
      }
    }
  }
}
