import * as fs from 'fs/promises';
import * as path from 'path';
import { MetaData } from '../metadata';
import { CZON_DIST_DIR, CZON_DIST_RAW_CONTENT_DIR, CZON_SRC_DIR } from '../paths';
import { renderToHTML } from '../ssg';
import { IRenderContext } from '../types';
import { convertMarkdownToHtml } from '../utils/convertMarkdownToHtml';
import { parseFrontmatter } from '../utils/frontmatter';
import { writeFile } from '../utils/writeFile';

/**
 * 使用简单的爬虫抓取生成的站点页面
 */
export const spiderStaticSiteGenerator = async () => {
  const queue = ['/index.html', '/404.html'];

  // 将每个语言的首页加入队列
  for (const lang of MetaData.options.langs || []) {
    queue.push(`/${lang}/index.html`);
  }

  const isVisited = new Set<string>();
  const contents: IRenderContext['contents'] = [];

  // 预加载所有 Markdown 内容
  for (const file of MetaData.files) {
    if (!file.path.endsWith('.md')) continue;
    for (const lang of MetaData.options.langs || []) {
      const markdown = await fs.readFile(path.join(CZON_SRC_DIR, lang, file.hash + '.md'), 'utf-8');
      const { frontmatter, body } = parseFrontmatter(markdown);
      const markdownHtml = convertMarkdownToHtml(body);

      contents.push({
        lang,
        hash: file.hash,
        body: markdownHtml,
        frontmatter,
      });
    }
  }

  while (queue.length > 0) {
    const currentPath = queue.shift()!;
    if (isVisited.has(currentPath)) continue;
    isVisited.add(currentPath);

    let html = renderToHTML({
      path: currentPath,
      site: MetaData,
      contents,
    });

    // 内部链接: czon://hash 格式的链接替换为 /{lang}/{slug}.html
    html = html.replace(/href="([^"]+)"/g, (match, link) => {
      console.info(`🕷️ Processing link: ${link} in path: ${currentPath}`);

      if (link.startsWith('czon://')) {
        const hash = link.replace('czon://', '');
        console.info(`   🔗 Replacing internal link for hash: ${hash}`);
        const file = MetaData.files.find(f => f.hash === hash);
        if (!file || !file.metadata) {
          console.warn(`⚠️ Link target not found for hash ${hash} in path ${currentPath}`);
          return match;
        }
        const slug = file.metadata.slug;
        const targetPath = path.resolve('/', path.dirname(currentPath), `${slug}.html`);
        const href = path.relative(path.dirname(currentPath), targetPath);
        return `href="${href}"`;
      }
      return match;
    });
    // 替换 src 中的 czon://hash 链接
    html = html.replace(/src="([^"]+)"/g, (match, link) => {
      console.info(`🕷️ Processing src link: ${link} in path: ${currentPath}`);

      if (link.startsWith('czon://')) {
        const hash = link.replace('czon://', '');
        console.info(`   🔗 Replacing internal src link for hash: ${hash}`);
        const file = MetaData.files.find(f => f.hash === hash);
        if (!file) {
          console.warn(`⚠️ Src link target not found for hash ${hash} in path ${currentPath}`);
          return match;
        }
        const ext = path.extname(file.path);
        const targetPath = path.join(CZON_DIST_RAW_CONTENT_DIR, file.hash + ext);
        const href = path.relative(path.join(CZON_DIST_DIR, path.dirname(currentPath)), targetPath);
        return `src="${href}"`;
      }
      return match;
    });

    console.info(`🕷️ Crawled ${currentPath}`);

    await writeFile(path.join(CZON_DIST_DIR, currentPath), html);

    // 提取生成的 HTML 中的站内链接，加入爬取队列
    const linkRegex = /href="([^"]+)"/g;
    for (const match of html.matchAll(linkRegex)) {
      const link = match[1];
      if (URL.canParse(link)) continue; // 跳过绝对 URL
      const resolvedPath = path.resolve('/', path.dirname(currentPath), link);
      console.info(
        `   ➕ Found link: ${link} -> ${resolvedPath} (${isVisited.has(resolvedPath) ? 'visited' : 'new'})`
      );
      if (!isVisited.has(resolvedPath)) {
        queue.push(resolvedPath);
      }
    }
  }
};
