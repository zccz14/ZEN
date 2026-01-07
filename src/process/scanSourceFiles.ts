import { readFile } from 'fs/promises';
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
  const markdownFiles = await findMarkdownEntries(INPUT_DIR);
  const hashes = new Set<string>();

  for (const relativePath of markdownFiles) {
    const fullPath = path.join(INPUT_DIR, relativePath);

    try {
      // 检查文件是否存在

      const content = await readFile(fullPath, 'utf-8'); // 确保文件可读

      const hash = sha256(content);
      const links = extractLinksFromMarkdown(content);
      console.info(`  - Found file: ${relativePath} (hash: ${hash})`);
      console.info(`    Links: ${links.join(', ') || 'None'}`);

      hashes.add(hash);

      const metaWithSameHash = MetaData.files.find(f => f.hash === hash);
      if (metaWithSameHash) {
        metaWithSameHash.path = relativePath;
        metaWithSameHash.links = links;
      } else {
        // 如果没有相同哈希的元数据，则添加一个新的占位符
        MetaData.files.push({
          hash,
          path: relativePath,
          links,
        });
      }
    } catch (error) {
      console.warn(`⚠️ File not found or inaccessible: ${fullPath}`, error);
    }
  }
  // 移除不再存在的文件元数据
  MetaData.files = MetaData.files.filter(f => hashes.has(f.hash));

  console.log(`✅ Found ${MetaData.files.length} Markdown files`);

  if (MetaData.files.length === 0) {
    console.warn(`⚠️ No Markdown files found in ${INPUT_DIR}`);
  }
}
