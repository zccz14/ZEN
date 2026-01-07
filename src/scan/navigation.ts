import { MetaData } from '../metadata';
import { NavigationItem, FileInfo } from '../types';
import * as path from 'path';

/**
 * 格式化标题（将连字符/下划线转换为空格并首字母大写）
 * @param name 原始名称
 * @returns 格式化后的标题
 */
export function formatTitle(name: string): string {
  // 移除扩展名
  const baseName = name.replace(/\.[^/.]+$/, '');

  // 将连字符、下划线、点替换为空格
  const withSpaces = baseName.replace(/[-_.]/g, ' ');

  // 首字母大写每个单词
  return withSpaces
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * 生成带 baseUrl 的路径
 * @param rawPath 原始路径
 * @param baseUrl 基础URL（可选）
 * @returns 完整的URL路径
 */
export function generatePath(rawPath: string, baseUrl: string = ''): string {
  if (!baseUrl) {
    return rawPath;
  }

  // 确保 baseUrl 不以斜杠结尾，路径以斜杠开头
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  const cleanPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;

  return `${cleanBaseUrl}${cleanPath}`;
}

/**
 * 将文件添加到导航树中（纯函数）
 * @param navigation 当前导航层级
 * @param file 文件信息
 * @param baseUrl 基础URL
 * @returns 更新后的导航层级
 */
function addFileToNavigation(
  navigation: NavigationItem[],
  file: FileInfo,
  baseUrl: string = ''
): NavigationItem[] {
  const parts = file.path.split('/');
  let currentLevel = navigation;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const isLastPart = i === parts.length - 1;
    const isMarkdownFile = part.endsWith('.md');

    // 如果是 Markdown 文件，移除扩展名
    const displayName = isMarkdownFile ? part.replace(/\.md$/, '') : part;

    // 生成标题（对于 Markdown 文件优先使用提取的标题）
    const title =
      isMarkdownFile && file.metadata?.title ? file.metadata.title : formatTitle(displayName);

    // 生成路径
    const rawPath = isMarkdownFile
      ? `/${file.path.replace(/\.md$/, '.html')}`
      : `/${parts.slice(0, i + 1).join('/')}`;
    const itemPath = generatePath(rawPath, baseUrl);

    if (isLastPart) {
      // 添加文件节点
      currentLevel.push({
        title,
        path: itemPath,
      });
    } else {
      // 查找或创建目录节点
      // 首先尝试通过路径查找（最准确）
      let dirItem = currentLevel.find(item => item.path === itemPath);

      // 如果没找到，尝试通过格式化后的标题查找
      if (!dirItem) {
        const formattedTitle = formatTitle(displayName);
        dirItem = currentLevel.find(
          item => item.title === formattedTitle && item.children !== undefined
        );
      }

      if (!dirItem) {
        dirItem = {
          title: formatTitle(displayName),
          path: itemPath,
          children: [],
        };
        currentLevel.push(dirItem);
      }

      // 确保 children 存在
      if (!dirItem.children) {
        dirItem.children = [];
      }

      // 进入下一层
      currentLevel = dirItem.children;
    }
  }

  return navigation;
}

/**
 * 在导航树中查找项目（纯函数）
 * @param navigation 导航树
 * @param searchPath 要查找的路径
 * @returns 找到的导航项，如果没找到则返回 null
 */
function findNavigationItem(
  navigation: NavigationItem[],
  searchPath: string
): NavigationItem | null {
  for (const item of navigation) {
    if (item.path === searchPath) {
      return item;
    }

    if (item.children) {
      const found = findNavigationItem(item.children, searchPath);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

/**
 * 生成扁平化导航（所有页面在同一层级）
 * @param files 文件信息数组
 * @param baseUrl 基础URL（可选）
 * @returns 扁平化的导航项数组
 */
export function generateFlatNavigation(files: FileInfo[], baseUrl: string = ''): NavigationItem[] {
  return files
    .map(file => {
      const title = file.metadata?.title || formatTitle(file.name); // 优先使用提取的标题
      const rawPath = `/${file.path.replace(/\.md$/, '.html')}`;
      const itemPath = generatePath(rawPath, baseUrl);

      return {
        title,
        path: itemPath,
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * 生成面包屑导航
 * @param filePath 文件路径
 * @param navigation 导航树
 * @param baseUrl 基础URL（可选）
 * @returns 面包屑导航项数组
 */
export function generateBreadcrumbs(
  filePath: string,
  navigation: NavigationItem[],
  baseUrl: string = ''
): NavigationItem[] {
  const parts = filePath.split('/').filter(part => part);
  const breadcrumbs: NavigationItem[] = [];
  let currentNav = navigation;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const isLast = i === parts.length - 1;
    const searchPath = generatePath(`/${parts.slice(0, i + 1).join('/')}`, baseUrl);

    // 在当前层级查找匹配的导航项
    const foundItem = findNavigationItem(currentNav, searchPath);

    if (foundItem) {
      breadcrumbs.push({
        title: foundItem.title,
        path: foundItem.path,
      });

      if (foundItem.children && !isLast) {
        currentNav = foundItem.children;
      }
    }
  }

  return breadcrumbs;
}

/**
 * 生成站点地图 XML
 * @param files 文件信息数组
 * @param baseUrl 基础URL
 * @returns 站点地图 XML 字符串
 */
export function generateSitemapXml(
  files: FileInfo[],
  baseUrl: string = 'https://example.com'
): string {
  const urls = files
    .map(file => {
      const path = `/${file.path.replace(/\.md$/, '.html')}`;
      const lastmod = new Date().toISOString().split('T')[0];

      return `  <url>
    <loc>${baseUrl}${path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

/**
 * 生成 HTML 导航菜单
 * @param navigation 导航树
 * @param currentPath 当前路径（可选，用于高亮当前页面）
 * @returns HTML 字符串
 */
export function generateNavigationHtml(
  navigation: NavigationItem[],
  currentPath: string = ''
): string {
  function renderItems(items: NavigationItem[], level: number = 0): string {
    if (items.length === 0) {
      return '';
    }

    const indent = '  '.repeat(level);
    const html = items
      .map(item => {
        const isActive = currentPath === item.path;
        const activeClass = isActive ? ' class="active"' : '';
        const childrenHtml = item.children ? renderItems(item.children, level + 1) : '';

        return `${indent}<li class="nav-item">
${indent}  <a href="${item.path}"${activeClass} class="nav-link">${item.title}</a>
${childrenHtml ? `${indent}  <ul class="nav-submenu">\n${childrenHtml}${indent}  </ul>` : ''}
${indent}</li>`;
      })
      .join('\n');

    return html;
  }

  return `<ul class="nav-list">\n${renderItems(navigation)}\n</ul>`;
}
