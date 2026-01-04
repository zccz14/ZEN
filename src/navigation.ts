import { NavigationItem, FileInfo } from './types';
import * as path from 'path';

export class NavigationGenerator {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  /**
   * 更新 baseUrl
   */
  setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl;
  }

  /**
   * 从文件信息生成导航结构
   */
  generate(files: FileInfo[]): NavigationItem[] {
    // 按路径排序
    const sortedFiles = [...files].sort((a, b) => a.relativePath.localeCompare(b.relativePath));

    // 构建树形结构
    const root: NavigationItem[] = [];

    for (const file of sortedFiles) {
      this.addFileToNavigation(root, file);
    }

    return root;
  }

  /**
   * 将文件添加到导航树中
   */
  private addFileToNavigation(navigation: NavigationItem[], file: FileInfo): void {
    const parts = file.relativePath.split('/');
    let currentLevel = navigation;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLastPart = i === parts.length - 1;
      const isMarkdownFile = part.endsWith('.md');

      // 如果是 Markdown 文件，移除扩展名
      const displayName = isMarkdownFile ? part.replace(/\.md$/, '') : part;

      // 生成标题（对于 Markdown 文件优先使用提取的标题）
      const title =
        isMarkdownFile && file.metadata?.title
          ? file.metadata.title
          : this.formatTitle(displayName);

      // 生成路径
      const rawPath = isMarkdownFile
        ? `/${file.relativePath.replace(/\.md$/, '.html')}`
        : `/${parts.slice(0, i + 1).join('/')}`;
      const itemPath = this.generatePath(rawPath);

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
          const formattedTitle = this.formatTitle(displayName);
          dirItem = currentLevel.find(
            item => item.title === formattedTitle && item.children !== undefined
          );
        }

        if (!dirItem) {
          dirItem = {
            title: this.formatTitle(displayName),
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
  }

  /**
   * 生成带 baseUrl 的路径
   */
  private generatePath(path: string): string {
    if (!this.baseUrl) {
      return path;
    }

    // 确保 baseUrl 不以斜杠结尾，路径以斜杠开头
    const cleanBaseUrl = this.baseUrl.replace(/\/$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;

    return `${cleanBaseUrl}${cleanPath}`;
  }

  /**
   * 格式化标题（将连字符/下划线转换为空格并首字母大写）
   */
  private formatTitle(name: string): string {
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
   * 生成扁平化导航（所有页面在同一层级）
   */
  generateFlat(files: FileInfo[]): NavigationItem[] {
    return files
      .map(file => {
        const title = file.metadata?.title || this.formatTitle(file.name); // 优先使用提取的标题
        const rawPath = `/${file.relativePath.replace(/\.md$/, '.html')}`;
        const itemPath = this.generatePath(rawPath);

        return {
          title,
          path: itemPath,
        };
      })
      .sort((a, b) => a.title.localeCompare(b.title));
  }

  /**
   * 生成面包屑导航
   */
  generateBreadcrumbs(filePath: string, navigation: NavigationItem[]): NavigationItem[] {
    const parts = filePath.split('/').filter(part => part);
    const breadcrumbs: NavigationItem[] = [];
    let currentNav = navigation;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const searchPath = `/${parts.slice(0, i + 1).join('/')}`;

      // 在当前层级查找匹配的导航项
      const foundItem = this.findNavigationItem(currentNav, searchPath);

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
   * 在导航树中查找项目
   */
  private findNavigationItem(
    navigation: NavigationItem[],
    searchPath: string
  ): NavigationItem | null {
    for (const item of navigation) {
      if (item.path === searchPath) {
        return item;
      }

      if (item.children) {
        const found = this.findNavigationItem(item.children, searchPath);
        if (found) {
          return found;
        }
      }
    }

    return null;
  }

  /**
   * 生成站点地图 XML
   */
  generateSitemap(files: FileInfo[], baseUrl?: string): string {
    const effectiveBaseUrl = baseUrl || this.baseUrl || 'https://example.com';
    const urls = files
      .map(file => {
        const path = `/${file.relativePath.replace(/\.md$/, '.html')}`;
        const lastmod = new Date().toISOString().split('T')[0];

        return `  <url>
    <loc>${effectiveBaseUrl}${path}</loc>
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
   * 生成 JSON 格式的导航数据（用于前端动态加载）
   */
  generateJsonNavigation(files: FileInfo[]): string {
    const navigation = this.generate(files);
    return JSON.stringify(navigation, null, 2);
  }
}
