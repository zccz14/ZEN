import * as fs from 'fs/promises';
import * as path from 'path';
import { minimatch } from 'minimatch';

/**
 * GitIgnore 处理器
 * 用于读取和解析 .gitignore 文件，并提供文件过滤功能
 */
export class GitIgnoreProcessor {
  private patterns: string[] = [];
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  /**
   * 从 .gitignore 文件加载模式
   */
  async loadFromFile(gitignorePath: string = '.gitignore'): Promise<void> {
    try {
      const fullPath = path.join(this.baseDir, gitignorePath);
      const content = await fs.readFile(fullPath, 'utf-8');
      this.parsePatterns(content);
    } catch (error) {
      // 如果 .gitignore 文件不存在，使用空模式
      console.debug(`No .gitignore file found at ${gitignorePath}, using empty patterns`);
    }
  }

  /**
   * 解析 .gitignore 内容为模式数组
   */
  private parsePatterns(content: string): void {
    const lines = content.split('\n');
    this.patterns = [];

    for (let line of lines) {
      line = line.trim();

      // 跳过空行和注释
      if (!line || line.startsWith('#')) {
        continue;
      }

      // 处理否定模式（以 ! 开头）
      if (line.startsWith('!')) {
        // 暂时不支持否定模式，可以后续扩展
        continue;
      }

      // 标准化模式
      let pattern = line;

      // 如果模式以 / 结尾，表示目录
      if (pattern.endsWith('/')) {
        pattern = pattern.slice(0, -1);
      }

      // 如果模式不以 * 开头，添加 **/ 前缀以匹配任意子目录
      if (!pattern.includes('*') && !pattern.startsWith('/')) {
        pattern = `**/${pattern}`;
      }

      // 如果模式以 / 开头，从根目录开始匹配
      if (pattern.startsWith('/')) {
        pattern = pattern.slice(1);
      }

      this.patterns.push(pattern);
    }

    console.debug(`Loaded ${this.patterns.length} patterns from .gitignore`);
  }

  /**
   * 检查文件是否应该被忽略
   * @param filePath 文件的绝对路径
   * @returns 如果应该被忽略返回 true
   */
  shouldIgnore(filePath: string): boolean {
    // 获取相对于 baseDir 的相对路径
    const relativePath = path.relative(this.baseDir, filePath);

    // 如果文件在 baseDir 之外，不应用规则
    if (relativePath.startsWith('..')) {
      return false;
    }

    // 标准化路径分隔符为 /
    const normalizedPath = relativePath.replace(/\\/g, '/');

    // 检查每个模式
    for (const pattern of this.patterns) {
      // 首先尝试直接匹配
      if (minimatch(normalizedPath, pattern, { dot: true })) {
        return true;
      }

      // 对于目录模式，检查文件是否在该目录下
      // 目录模式通常以 / 结尾或没有扩展名
      if (pattern.endsWith('/') || (!pattern.includes('.') && !pattern.includes('*'))) {
        const dirPattern = pattern.endsWith('/') ? pattern.slice(0, -1) : pattern;

        // 检查文件是否在目录中
        if (normalizedPath.startsWith(dirPattern + '/')) {
          return true;
        }

        // 检查是否就是目录本身
        if (normalizedPath === dirPattern) {
          return true;
        }
      }

      // 对于包含通配符的目录模式（如 **/node_modules, **/.vscode）
      // 提取目录名并检查
      if (pattern.includes('*')) {
        // 尝试提取目录名（最后一个非通配符部分）
        const parts = pattern.split('/');
        const lastPart = parts[parts.length - 1];

        // 如果最后一部分不包含通配符，可能是目录名
        // 注意：.vscode 以点开头，但仍然是目录名
        if (!lastPart.includes('*')) {
          // 检查是否是文件扩展名（包含点但不是以点开头的目录）
          const hasFileExtension = lastPart.includes('.') && !lastPart.startsWith('.');

          if (!hasFileExtension) {
            if (normalizedPath.startsWith(lastPart + '/')) {
              return true;
            }
            if (normalizedPath === lastPart) {
              return true;
            }
          }
        }
      }
    }

    return false;
  }

  /**
   * 获取所有忽略模式
   */
  getPatterns(): string[] {
    return [...this.patterns];
  }

  /**
   * 添加自定义忽略模式
   */
  addPattern(pattern: string): void {
    this.patterns.push(pattern);
  }

  /**
   * 清除所有模式
   */
  clearPatterns(): void {
    this.patterns = [];
  }
}

/**
 * 创建 GitIgnoreProcessor 实例并加载 .gitignore 文件
 */
export async function createGitIgnoreProcessor(baseDir: string): Promise<GitIgnoreProcessor> {
  const processor = new GitIgnoreProcessor(baseDir);
  await processor.loadFromFile();
  return processor;
}
