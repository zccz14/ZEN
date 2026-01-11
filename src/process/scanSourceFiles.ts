import { access, readFile } from 'fs/promises';
import path from 'path';
import { findMarkdownEntries } from '../findEntries';
import { MetaData } from '../metadata';
import { INPUT_DIR } from '../paths';
import { sha256 } from '../utils/sha256';

const extractLinksFromMarkdown = (content: string): string[] => {
  const linkRegex = /\[.*?\]\((.*?)\)/g;
  const links: string[] = [];
  let match;
  while ((match = linkRegex.exec(content)) !== null) {
    links.push(match[1]);
  }
  return links;
};

/**
 * 扫描源文件
 */
export async function scanSourceFiles(): Promise<void> {
  console.log(`🔍 Scanning source directory...`);

  const queue: string[] = [];
  const isVisited = new Set<string>();

  const markdownFiles = await findMarkdownEntries(INPUT_DIR);

  for (const filePath of markdownFiles) {
    queue.push(filePath);
  }

  const hashes = new Set<string>();

  while (queue.length > 0) {
    const relativePath = queue.shift()!;
    const fullPath = path.join(INPUT_DIR, relativePath);
    console.info(`🔍 Scanner Processing file: ${fullPath}`);

    // 防御项目外文件访问
    if (!fullPath.startsWith(INPUT_DIR)) {
      console.warn(`⚠️ Skipping file outside of input directory: ${fullPath}`);
      continue;
    }
    // 避免重复访问
    if (isVisited.has(fullPath)) continue;
    isVisited.add(fullPath);

    const isExists = await access(fullPath).then(
      () => true,
      () => false
    );

    if (!isExists) {
      console.warn(`⚠️ File does not exist: ${fullPath}, skipping.`);
      continue;
    }

    const contentBuffer = await readFile(fullPath);
    const hash = sha256(contentBuffer);
    hashes.add(hash);

    let meta = MetaData.files.find(f => f.hash === hash);
    if (!meta) {
      meta = { hash, path: relativePath, links: [] };
      MetaData.files.push(meta);
    }

    // 处理 Markdown 文件
    if (fullPath.endsWith('.md')) {
      const content = contentBuffer.toString('utf-8');

      const links = extractLinksFromMarkdown(content);
      console.info(`  - Found file: ${relativePath} (hash: ${hash})`);
      console.info(`    Links: ${links.join(', ') || 'None'}`);
      meta.links = links;

      for (const link of links) {
        if (URL.canParse(link)) continue;
        const resolvedPath = path.resolve(path.dirname(fullPath), link);
        const relativePath = path.relative(INPUT_DIR, resolvedPath);
        if (!isVisited.has(relativePath)) {
          queue.push(relativePath);
        }
      }
    }
  }

  // 移除不再存在的文件元数据
  MetaData.files = MetaData.files.filter(f => hashes.has(f.hash));
  // 按路径降序排序 (通常外层目录优先)
  MetaData.files.sort(
    (a, b) =>
      // 第一级按目录排序
      path.dirname(a.path).localeCompare(path.dirname(b.path)) ||
      // 第二级按文件名排序
      a.path.localeCompare(b.path)
  );

  console.log(`✅ Found ${MetaData.files.length} Markdown files`);

  if (MetaData.files.length === 0) {
    console.warn(`⚠️ No Markdown files found in ${INPUT_DIR}`);
  }
}
