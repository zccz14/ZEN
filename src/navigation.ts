import { NavigationItem, FileInfo } from './types';
import * as path from 'path';

export class NavigationGenerator {
  /**
   * 从文件信息生成导航结构
   */
  generate(files: FileInfo[]): NavigationItem[] {
    // 按路径排序
    const sortedFiles = [...files].sort((a, b) =>
      a.relativePath.localeCompare(b.relativePath)
    );

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

      // 生成标题（使用文件名或 metadata 中的标题）
      const title = file.metadata?.title || this.formatTitle(displayName);

      // 生成路径
      const itemPath = isMarkdownFile
        ? `/${file.relativePath.replace(/\.md$/, '.html')}`
        : `/${parts.slice(0, i + 1).join('/')}`;

      if (isLastPart) {
        // 添加文件节点
        currentLevel.push({
          title,
          path: itemPath
        });
      } else {
        // 查找或创建目录节点
        let dirItem = currentLevel.find(item =>
          item.title === displayName && !item.path.endsWith('.html')
        );

        if (!dirItem) {
          dirItem = {
            title: this.formatTitle(displayName),
            path: itemPath,
            children: []
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
    return files.map(file => {
      const title = file.metadata?.title || this.formatTitle(file.name);
      const itemPath = `/${file.relativePath.replace(/\.md$/, '.html')}`;

      return {
        title,
        path: itemPath
      };
    }).sort((a, b) => a.title.localeCompare(b.title));
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
          path: foundItem.path
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
  private findNavigationItem(navigation: NavigationItem[], searchPath: string): NavigationItem | null {
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
  generateSitemap(files: FileInfo[], baseUrl: string = 'https://example.com'): string {
    const urls = files.map(file => {
      const path = `/${file.relativePath.replace(/\.md$/, '.html')}`;
      const lastmod = file.metadata?.last_modified || file.metadata?.date || new Date().toISOString().split('T')[0];

      return `  <url>
    <loc>${baseUrl}${path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    }).join('\n');

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