import * as fs from 'fs/promises';
import * as path from 'path';
import { translateMarkdown } from '../ai/translateMarkdown';
import { loadMetaData, MetaData, saveMetaData } from '../metadata';
import { INPUT_DIR, ZEN_DIR, ZEN_DIST_DIR, ZEN_SRC_DIR } from '../paths';
import { runAIMetadataExtraction } from '../process/ai-client';
import { renderTemplates } from '../process/template';
import { scanMarkdownFiles } from '../scan/files';
import { BuildOptions, ScannedFile } from '../types';

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
async function scanSourceFiles(): Promise<{ scannedFiles: ScannedFile[] }> {
  const verbose = MetaData.options.verbose;

  if (verbose) console.log(`🔍 Scanning source directory...`);
  const scannedFiles = await scanMarkdownFiles(INPUT_DIR);

  if (scannedFiles.length === 0) {
    console.warn(`⚠️ No Markdown files found in ${INPUT_DIR}`);
    return { scannedFiles: [] };
  }

  if (verbose) console.log(`✅ Found ${scannedFiles.length} Markdown files`);

  if (scannedFiles.length === 0) {
    console.warn(`⚠️ No Markdown files found in ${INPUT_DIR}`);
  }

  return { scannedFiles };
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
      if (!file.metadata.inferred_lang) throw new Error(`Missing inferred language`);
      const filePath = path.join(ZEN_SRC_DIR, file.metadata.inferred_lang, file.hash);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.copyFile(path.join(INPUT_DIR, file.path), filePath);
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

  for (const file of files) {
    if (verbose) console.info(`📄 Processing file for translation: ${file.path}`);
    for (const lang of langs) {
      if (verbose) console.log(`🌐 Translating to ${lang}...`);
      // 存储翻译文件到 .zen/src/{lang}
      const targetPath = path.join(ZEN_SRC_DIR, lang, file.hash + '.md');

      try {
        const content = await fs.readFile(path.join(INPUT_DIR, file.path), 'utf-8');
        if (file.metadata.inferred_lang === lang) {
          if (verbose)
            console.log(`ℹ️ Skipping translation for ${file.path}, already in target language`);
          continue;
        } else {
          // 翻译
          // 先检查是否已经有翻译文件存在

          const exists = await fs.access(targetPath).then(
            () => true,
            () => false
          );
          if (exists) {
            if (verbose) console.log(`ℹ️ Translation already exists for ${file.path} in ${lang}`);
            continue;
          }
        }

        const translatedContent = await translateMarkdown(content, '', lang);

        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        await fs.writeFile(targetPath, translatedContent, 'utf-8');

        if (verbose) console.log(`✅ Translated file saved: ${targetPath}`);
      } catch (error) {
        console.error(`❌ Failed to translate to ${lang}:`, error);
      }
    }
  }
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
  await fs.writeFile(path.join(ZEN_DIR, '.gitignore'), 'dist\n', 'utf-8');

  // 扫描源文件
  await scanSourceFiles();

  // 运行 AI 元数据提取
  await runAIMetadataExtraction();

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
