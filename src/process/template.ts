import * as fs from 'fs/promises';
import * as path from 'path';
import { LANGUAGE_NAMES } from '../languages';
import { MetaData } from '../metadata';
import { ZEN_DIST_DIR, ZEN_SRC_DIR } from '../paths';
import { MetaDataStore } from '../types';
import { convertMarkdownToHtml } from '../utils/convertMarkdownToHtml';
import { parseFrontmatter } from '../utils/frontmatter';

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
      const langName = LANGUAGE_NAMES[lang] || lang;
      const isCurrent = lang === templateData.lang;
      const activeClass = isCurrent ? 'active' : '';

      const link = path.join('..', lang, templateData.file.hash + '.html');

      return `<li class="lang-item ${activeClass}">
        <a href="${link}" class="lang-link">${langName}</a>
      </li>`;
    })
    .join('');

  return `<div class="language-switcher">
    <ul class="lang-list">${items}</ul>
  </div>`;
}

const generateTagsHtml = (tags: string[]): string => {
  return `<ul class="tags-list">${tags
    .map(tag => `<li class="tag-item">${tag}</li>`)
    .join('')}</ul>`;
};

/**
 * 生成导航 HTML
 * @param navigation 导航树
 * @param currentPath 当前路径（可选，用于高亮当前页面）
 * @returns 导航 HTML 字符串
 */
async function generateNavigationHtml(data: TemplateData): Promise<string> {
  const {
    files,
    options: { baseUrl = '/' },
  } = MetaData;

  const navigation = await Promise.all(
    files.map(async file => {
      const content = await fs.readFile(
        path.join(ZEN_SRC_DIR, data.lang, file.hash + '.md'),
        'utf-8'
      );
      const { frontmatter } = parseFrontmatter(content);
      const title = frontmatter.title || file.metadata?.title || file.path; // 优先使用提取的标题

      // 使用相对链接
      const link = file.hash + '.html';

      return {
        title,
        link,
        isActive: data.file.hash === file.hash,
      };
    })
  );

  return `<ul class="nav-list">${navigation
    .map(item => {
      const activeClass = item.isActive ? 'active' : '';

      let html = `<li class="nav-item">`;
      html += `<a href="${item.link}" class="nav-link ${activeClass}">${item.title}</a>`;

      html += `</li>`;
      return html;
    })
    .join('')}</ul>`;
}

const replaceInnerLinks = (data: TemplateData, markdownContent: string): string => {
  let content = markdownContent;
  for (const link of data.file.links) {
    if (URL.canParse(link)) continue; // 跳过绝对 URL

    const targetPath = path.resolve('/', path.dirname(data.file.path), link).slice(1);

    const targetFile = MetaData.files.find(f => f.path === targetPath);

    if (!targetFile) {
      console.warn(`⚠️ Link target not found for ${link} in file ${data.file.path}`);
      continue;
    }
    // 替换链接 (使用相对链接)
    const targetLink = path.join(targetFile.hash + '.html');

    // 全局替换链接
    const linksRegex = new RegExp(`\\]\\(${link.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`, 'g');
    content = content.replace(linksRegex, `](${targetLink})`);
  }
  return content;
};

interface TemplateData {
  file: MetaDataStore['files'][0];
  content: string;
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
  const markdownContent = data.content;
  const { frontmatter, body } = parseFrontmatter(markdownContent);

  const htmlContent = convertMarkdownToHtml(replaceInnerLinks(data, body));

  let result = template;

  // 替换导航
  const navigationHtml = await generateNavigationHtml(data);
  result = result.replace(/{{navigation}}/g, navigationHtml);

  // 替换其他变量 - 使用全局替换
  result = result.replace(/{{title}}/g, frontmatter.title || 'Untitled');
  result = result.replace(/{{content}}/g, htmlContent);

  // 替换元数据变量
  if (frontmatter) {
    result = result.replace(/{{summary}}/g, frontmatter.summary || '');
    result = result.replace(/{{tags}}/g, generateTagsHtml(frontmatter.tags || []));
    result = result.replace(/{{inferred_date}}/g, frontmatter.inferred_date || '--');
    result = result.replace(/{{inferred_lang}}/g, frontmatter.inferred_lang || '--');
  }

  // 替换语言相关变量
  result = result.replace(/{{lang}}/g, data.lang || '');
  if (langs && langs.length > 1 && data.lang) {
    const langSwitcher = generateLanguageSwitcher(data);
    result = result.replace(/{{language_switcher}}/g, langSwitcher);
  }

  return result;
}

const renderRedirectTemplate = async (from: string, to: string): Promise<void> => {
  const {
    options: { baseUrl = '/' },
  } = MetaData;
  const toURL = path.join(baseUrl, to);
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="refresh" content="0; url=${toURL}">
    <title>Redirecting...</title>
</head>
<body>
    <p>Redirecting to <a href="${toURL}">${toURL}</a></p>
</body>
</html>`;
  const targetPath = path.join(ZEN_DIST_DIR, from);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, html, 'utf-8');
};

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
      const content = await fs.readFile(path.join(ZEN_SRC_DIR, lang, file.hash + '.md'), 'utf-8');
      try {
        const html = await renderTemplate(layoutTemplate, {
          file,
          content,
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

  for (const lang of langs || []) {
    await renderRedirectTemplate(
      path.join(lang, 'index.html'),
      path.join(lang, files[0].hash + '.html')
    );
  }
  await renderRedirectTemplate('index.html', path.join(langs?.[0] || 'en-US', 'index.html'));
}
