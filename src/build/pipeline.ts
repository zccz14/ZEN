import * as fs from 'fs/promises';
import * as path from 'path';
import { translateMarkdown } from '../ai/translateMarkdown';
import { findMarkdownEntries } from '../findEntries';
import { loadMetaData, MetaData, saveMetaData } from '../metadata';
import { INPUT_DIR, ZEN_DIR, ZEN_DIST_DIR, ZEN_SRC_DIR } from '../paths';
import { extractMetadataByAI } from '../process/extractMetadataByAI';
import { renderTemplates } from '../process/template';
import { calculateFileHash } from '../scan/files';
import { BuildOptions } from '../types';
import { updateFrontmatter } from '../utils/frontmatter';

/**
 * 验证构建配置
 */
async function validateConfig(options: BuildOptions): Promise<void> {
  const { verbose = false } = options;

  if (verbose) {
    console.log(`🚀 Starting ZEN build...`);
    console.log(`🔗 Base URL: ${options.baseUrl || '(not set)'}`);
    if (options.langs && options.langs.length > 0) {
      console.log(`🌐 Target languages: ${options.langs.join(', ')}`);
    }
    console.log(`🔍 Verbose mode enabled`);
  }

  MetaData.options = options;
}

/**
 * 扫描源文件
 */
async function scanSourceFiles(): Promise<void> {
  console.log(`🔍 Scanning source directory...`);
  const markdownFiles = await findMarkdownEntries(INPUT_DIR);
  const hashes = new Set<string>();

  for (const relativePath of markdownFiles) {
    const fullPath = path.join(INPUT_DIR, relativePath);

    try {
      // 检查文件是否存在
      await fs.access(fullPath);

      const hash = await calculateFileHash(fullPath);

      hashes.add(hash);

      const metaWithSameHash = MetaData.files.find(f => f.hash === hash);
      if (metaWithSameHash) {
        metaWithSameHash.path = relativePath;
      } else {
        // 如果没有相同哈希的元数据，则添加一个新的占位符
        MetaData.files.push({
          hash,
          path: relativePath,
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

/**
 * 存储母语文件到 .zen/src
 */
async function storeNativeFiles(): Promise<void> {
  const {
    options: { verbose },
    files,
  } = MetaData;
  for (const file of MetaData.files) {
    try {
      if (!file.hash) throw new Error(`Missing hash`);
      if (!file.metadata?.inferred_lang) throw new Error(`Missing inferred language`);
      const filePath = path.join(ZEN_SRC_DIR, file.metadata.inferred_lang, file.hash + '.md');
      const originalContent = await fs.readFile(path.join(INPUT_DIR, file.path), 'utf-8');

      const enhancedContent = updateFrontmatter(originalContent, {
        title: file.metadata.title,
        summary: file.metadata.summary,
        tags: file.metadata.tags,
        inferred_date: file.metadata.inferred_date,
        inferred_lang: file.metadata.inferred_lang,
      });
      await fs.mkdir(path.dirname(filePath), { recursive: true });

      await fs.writeFile(filePath, enhancedContent, 'utf-8');
    } catch (error) {
      console.warn(`⚠️ Failed to store native file ${file.path}:`, error);
    }
  }

  if (verbose && files.length > 0) {
    console.log(`💾 Stored ${files.length} native language files to .zen/src`);
  }
}

/**
 * 处理翻译
 */
async function processTranslations(): Promise<void> {
  const {
    files,
    options: { langs = [], verbose },
  } = MetaData;

  await Promise.all(
    files.flatMap(async file => {
      return Promise.all(
        langs.map(async lang => {
          if (verbose) console.info(`📄 Processing file for translation: ${file.path}`);
          if (!file.metadata) {
            console.warn(`⚠️ Missing metadata for file: ${file.path}, skipping translation.`);
            return;
          }
          if (verbose) console.log(`🌐 Translating to ${lang}...`);
          // 存储翻译文件到 .zen/src/{lang}
          const sourcePath = path.join(ZEN_SRC_DIR, file.metadata.inferred_lang, file.hash + '.md'); // 使用已经加强的母语文件路径
          const targetPath = path.join(ZEN_SRC_DIR, lang, file.hash + '.md');

          try {
            const content = await fs.readFile(sourcePath, 'utf-8');
            if (file.metadata.inferred_lang === lang) {
              if (verbose)
                console.log(`ℹ️ Skipping translation for ${file.path}, already in target language`);
              return;
            } else {
              // 翻译
              // 先检查是否已经有翻译文件存在

              const exists = await fs.access(targetPath).then(
                () => true,
                () => false
              );
              if (exists) {
                if (verbose)
                  console.log(`ℹ️ Translation already exists for ${file.path} in ${lang}`);
                return;
              }
            }

            const translatedContent = await translateMarkdown(content, lang);

            await fs.mkdir(path.dirname(targetPath), { recursive: true });
            await fs.writeFile(targetPath, translatedContent, 'utf-8');

            if (verbose) console.log(`✅ Translated file saved: ${targetPath}`);
          } catch (error) {
            console.error(`❌ Failed to translate to ${lang}:`, error);
          }
        })
      );
    })
  );
}

/**
 * 构建管道（函数组合）
 */
async function buildPipeline(options: BuildOptions): Promise<void> {
  // 验证配置
  await validateConfig(options);

  // 清理输出目录
  await fs.rm(ZEN_DIST_DIR, { recursive: true, force: true });

  // 确保 .zen/.gitignore 文件
  await fs.mkdir(ZEN_DIR, { recursive: true });
  await fs.writeFile(path.join(ZEN_DIR, '.gitignore'), 'dist\n', 'utf-8');

  // 扫描源文件
  await scanSourceFiles();

  // 运行 AI 元数据提取
  await extractMetadataByAI();

  // 存储母语文件
  await storeNativeFiles();

  // 处理翻译
  await processTranslations();

  // 渲染模板
  await renderTemplates();
}

/**
 * 主构建函数
 */
export async function buildSite(options: BuildOptions): Promise<void> {
  const startTime = Date.now();

  try {
    await loadMetaData();
    await buildPipeline(options);

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    console.log(`🎉 Build completed in ${duration}s`);
  } catch (error) {
    console.error(`❌ Build failed:`, error);
    throw error;
  } finally {
    await saveMetaData();
  }
}
