import * as fs from 'fs/promises';
import * as path from 'path';
import { GitIgnoreProcessor } from './gitignore';

export interface ScanOptions {
  srcDir: string;
  includePattern?: string;
  excludePattern?: string;
  verbose?: boolean;
}

/**
 * 扫描指定目录下的所有 Markdown 文件，返回文件路径列表
 * 这个函数专门用于构建前的文件扫描阶段
 */
export async function scan(options: ScanOptions): Promise<string[]> {
  const { srcDir, verbose = false } = options;
  const filePaths: string[] = [];

  // 创建 GitIgnoreProcessor 并加载 .gitignore 文件
  const gitignoreProcessor = new GitIgnoreProcessor(srcDir);
  await gitignoreProcessor.loadFromFile();

  // 扫描目录
  await scanDirectory(srcDir, srcDir, filePaths, gitignoreProcessor, verbose, srcDir);

  if (verbose) {
    console.log(`📄 Scanned ${filePaths.length} Markdown files`);
  }

  return filePaths;
}

/**
 * 递归扫描目录，只收集文件路径
 */
async function scanDirectory(
  currentPath: string,
  baseDir: string,
  filePaths: string[],
  gitignoreProcessor: GitIgnoreProcessor,
  verbose: boolean,
  rootDir: string
): Promise<void> {
  const entries = await fs.readdir(currentPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(currentPath, entry.name);

    // 检查是否应该被 .gitignore 忽略
    if (gitignoreProcessor.shouldIgnore(fullPath)) {
      if (verbose) console.log(`  Ignoring (gitignore): ${fullPath}`);
      continue;
    }

    // 忽略 .zen 目录（保持向后兼容）
    if (entry.name === '.zen') {
      if (verbose) console.log(`  Ignoring (.zen): ${fullPath}`);
      continue;
    }

    if (entry.isDirectory()) {
      await scanDirectory(fullPath, baseDir, filePaths, gitignoreProcessor, verbose, rootDir);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      try {
        const relativePath = path.relative(rootDir, fullPath);
        filePaths.push(fullPath);

        if (verbose) console.log(`  Found: ${relativePath}`);
      } catch (error) {
        console.error(`❌ Failed to process file ${fullPath}:`, error);
      }
    }
  }
}
