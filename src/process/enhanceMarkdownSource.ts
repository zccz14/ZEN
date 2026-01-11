import { readFile } from 'fs/promises';
import path from 'path';
import { MetaData } from '../metadata';
import { CZON_SRC_DIR, INPUT_DIR } from '../paths';
import { FileMetaData } from '../types';
import { updateFrontmatter } from '../utils/frontmatter';
import { writeFile } from '../utils/writeFile';

const replaceInnerLinks = (file: FileMetaData, markdownContent: string): string => {
  let content = markdownContent;
  for (const link of file.links) {
    if (URL.canParse(link)) continue; // 跳过绝对 URL

    const targetPath = path.resolve('/', path.dirname(file.path), link).slice(1);

    const targetFile = MetaData.files.find(f => f.path === targetPath);

    if (!targetFile) {
      console.warn(`⚠️ Link target not found for ${link} in file ${file.path}`);
      continue;
    }
    // 替换链接 (使用相对链接)
    const targetLink = `czon://${targetFile.hash}`;

    // 全局替换链接
    const linksRegex = new RegExp(`\\]\\(${link.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`, 'g');
    content = content.replace(linksRegex, `](${targetLink})`);
  }
  return content;
};

/**
 * 存储母语文件到 .czon/src
 */
export async function storeNativeFiles(): Promise<void> {
  const {
    options: { verbose },
    files,
  } = MetaData;
  for (const file of MetaData.files) {
    if (!file.path.endsWith('.md')) {
      if (verbose) console.info(`ℹ️ Skipping ${file.path}, not a Markdown file`);
    }
    try {
      if (!file.hash) throw new Error(`Missing hash`);
      if (!file.metadata?.inferred_lang) throw new Error(`Missing inferred language`);
      const filePath = path.join(CZON_SRC_DIR, file.metadata.inferred_lang, file.hash + '.md');
      const originalContent = await readFile(path.join(INPUT_DIR, file.path), 'utf-8');

      // 增强 YAML Frontmatter
      const enhancedContent = updateFrontmatter(originalContent, {
        title: file.metadata.title,
        summary: file.metadata.summary,
        tags: file.metadata.tags,
        date: file.metadata.inferred_date,
      });

      // 进行内链接替换, 将相对链接替换为基于 czon://hash 的链接
      const replacedContent = replaceInnerLinks(file, enhancedContent);

      await writeFile(filePath, replacedContent);
    } catch (error) {
      console.warn(`⚠️ Failed to store native file ${file.path}:`, error);
    }
  }

  if (verbose && files.length > 0) {
    console.log(`💾 Stored ${files.length} native language files to .czon/src`);
  }
}
