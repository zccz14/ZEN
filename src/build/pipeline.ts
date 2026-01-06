import { BuildOptions, MultiLangBuildOptions, FileInfo, NavigationItem, ScannedFile } from '../types';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as chokidar from 'chokidar';
import express from 'express';
import * as http from 'http';

// 导入新模块的函数
import { scanMarkdownFiles, saveScanResult, isScanOutdated } from '../scan/files';
import { generateNavigation } from '../scan/navigation';
import { convertScannedFiles } from '../process/markdown';
import { batchProcessAI } from '../process/ai';
import { batchRenderAndSave } from '../process/template';
import { batchTranslateFiles } from '../translate/index';
import { calculateFileHash } from '../process/ai-utils';

/**
 * 简单的函数组合工具
 */
function compose<T>(...fns: Array<(arg: T) => T | Promise<T>>): (arg: T) => Promise<T> {
  return async (arg: T) => {
    let result = arg;
    for (const fn of fns) {
      result = await fn(result);
    }
    return result;
  };
}

/**
 * 验证构建配置
 */
export async function validateConfig(options: BuildOptions): Promise<BuildOptions> {
  const { srcDir, outDir, verbose = false } = options;

  // 验证源目录
  try {
    await fs.access(srcDir);
  } catch (error) {
    throw new Error(`Source directory does not exist: ${srcDir}`);
  }

  // 确保输出目录存在
  await fs.mkdir(outDir, { recursive: true });

  if (verbose) {
    console.log(`🚀 Starting ZEN build...`);
    console.log(`📁 Source: ${srcDir}`);
    console.log(`📁 Output: ${outDir}`);
    console.log(`🔗 Base URL: ${options.baseUrl || '(not set)'}`);
    if (options.langs && options.langs.length > 0) {
      console.log(`🌐 Target languages: ${options.langs.join(', ')}`);
    }
    console.log(`🔍 Verbose mode enabled`);
  }

  return options;
}

/**
 * 清理输出目录
 */
export async function cleanOutputDir(outDir: string): Promise<void> {
  try {
    const files = await fs.readdir(outDir);
    const deletePromises = files.map(async (file) => {
      const filePath = path.join(outDir, file);
      const stats = await fs.stat(filePath);
      if (stats.isDirectory()) {
        await fs.rm(filePath, { recursive: true });
      } else {
        await fs.unlink(filePath);
      }
    });
    await Promise.all(deletePromises);
    console.log(`🧹 Cleaned output directory: ${outDir}`);
  } catch (error) {
    // 如果目录不存在或为空，忽略错误
    if ((error as any).code !== 'ENOENT') {
      throw error;
    }
  }
}

/**
 * 确保 .zen/.gitignore 文件存在且内容正确
 */
export async function ensureZenGitignore(outDir: string, verbose = false): Promise<void> {
  const zenDir = path.dirname(outDir); // .zen 目录
  const zenGitignorePath = path.join(zenDir, '.gitignore');
  const gitignoreContent = 'dist\n';

  try {
    // 检查 .gitignore 文件是否存在
    await fs.access(zenGitignorePath);

    // 如果存在，检查内容是否正确
    const existingContent = await fs.readFile(zenGitignorePath, 'utf-8');
    if (existingContent.trim() !== 'dist') {
      if (verbose) console.log(`📝 Updating .zen/.gitignore content...`);
      await fs.writeFile(zenGitignorePath, gitignoreContent, 'utf-8');
    }
  } catch (error) {
    // 文件不存在，创建它
    if (verbose) console.log(`📝 Creating .zen/.gitignore file...`);
    await fs.writeFile(zenGitignorePath, gitignoreContent, 'utf-8');
  }
}

/**
 * 扫描源文件
 */
export async function scanSourceFiles(options: BuildOptions): Promise<BuildOptions & { scannedFiles: ScannedFile[] }> {
  const { srcDir, verbose = false } = options;

  if (verbose) console.log(`🔍 Scanning source directory...`);
  const scannedFiles = await scanMarkdownFiles(srcDir);

  if (scannedFiles.length === 0) {
    console.warn(`⚠️ No Markdown files found in ${srcDir}`);
    return { ...options, scannedFiles: [] };
  }

  if (verbose) console.log(`✅ Found ${scannedFiles.length} Markdown files`);

  // 保存扫描结果到 .zen/dist 目录
  const zenDistDir = path.join(path.dirname(options.outDir), 'dist');
  const scanResultPath = path.join(zenDistDir, 'scan-result.json');
  if (verbose) console.log(`💾 Saving scan result to ${scanResultPath}...`);
  await saveScanResult(scannedFiles, scanResultPath);

  return { ...options, scannedFiles };
}

/**
 * 处理 Markdown 文件
 */
export async function processMarkdownFilesStep(
  options: BuildOptions & { scannedFiles: ScannedFile[] }
): Promise<BuildOptions & { files: FileInfo[] }> {
  const { srcDir, scannedFiles, verbose = false } = options;

  if (verbose) console.log(`📄 Reading and converting Markdown files...`);
  const files = await convertScannedFiles(scannedFiles, srcDir);

  if (files.length === 0) {
    console.warn(`⚠️ Failed to read any Markdown files`);
    return { ...options, files: [] };
  }

  return { ...options, files };
}

/**
 * 运行 AI 元数据提取
 */
export async function runAIMetadataExtraction(
  options: BuildOptions & { files: FileInfo[] }
): Promise<BuildOptions & { files: FileInfo[] }> {
  const { files, verbose = false } = options;

  if (verbose) console.log(`🤖 Running AI metadata extraction...`);
  const metadataMap = await batchProcessAI(files);

  // 将 AI 元数据添加到文件信息中
  const updatedFiles = files.map(file => ({
    ...file,
    aiMetadata: metadataMap.get(file.path) || file.aiMetadata
  }));

  return { ...options, files: updatedFiles };
}

/**
 * 存储母语文件到 .zen/src
 */
export async function storeNativeFiles(
  files: FileInfo[],
  verbose = false
): Promise<void> {
  const zenSrcDir = path.join(process.cwd(), '.zen', 'src');

  for (const file of files) {
    const filePath = path.join(zenSrcDir, file.path);
    const dirPath = path.dirname(filePath);

    try {
      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(filePath, file.content, 'utf-8');
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
export async function processTranslations(
  files: FileInfo[],
  langs: string[],
  verbose = false
): Promise<Map<string, Map<string, string>>> {
  const translationResults = new Map<string, Map<string, string>>();

  for (const lang of langs) {
    if (verbose) console.log(`🌐 Translating to ${lang}...`);

    try {
      const translatedMap = await batchTranslateFiles(files, 'zh-Hans', lang);
      translationResults.set(lang, translatedMap);

      // 存储翻译文件到 .zen/src/{lang}
      const zenSrcLangDir = path.join(process.cwd(), '.zen', 'src', lang);

      for (const [filePath, translatedContent] of translatedMap) {
        const targetPath = path.join(zenSrcLangDir, filePath);
        const dirPath = path.dirname(targetPath);

        await fs.mkdir(dirPath, { recursive: true });
        await fs.writeFile(targetPath, translatedContent, 'utf-8');
      }

      if (verbose) {
        console.log(`✅ Translated ${translatedMap.size} files to ${lang}`);
      }
    } catch (error) {
      console.error(`❌ Failed to translate to ${lang}:`, error);
    }
  }

  return translationResults;
}

/**
 * 生成导航
 */
export async function generateNavigationStep(
  options: BuildOptions & { files: FileInfo[] }
): Promise<BuildOptions & { files: FileInfo[]; navigation: NavigationItem[] }> {
  const { files, baseUrl, verbose = false } = options;

  if (verbose) console.log(`🗺️ Generating navigation...`);
  const navigation = generateNavigation(files);

  return { ...options, files, navigation };
}

/**
 * 渲染模板并保存文件
 */
export async function renderTemplates(
  options: BuildOptions & { files: FileInfo[]; navigation: NavigationItem[] }
): Promise<BuildOptions> {
  const { files, navigation, outDir, template, langs, verbose = false } = options;

  if (verbose) console.log(`⚡ Processing files...`);

  // 处理母语文件
  await batchRenderAndSave(files, navigation, outDir, undefined, template);

  // 处理翻译文件（如果有）
  if (langs && langs.length > 0) {
    for (const lang of langs) {
      if (verbose) console.log(`🌐 Rendering ${lang} version...`);

      // 这里需要从 .zen/src/{lang} 读取翻译后的文件
      // 为了简化，我们暂时只渲染母语版本
      // 实际实现需要读取翻译文件并处理
    }
  }

  return options;
}

/**
 * 生成站点地图
 */
export async function generateSitemap(files: FileInfo[], outDir: string, baseUrl?: string): Promise<void> {
  const sitemapPath = path.join(outDir, 'sitemap.xml');

  const urls = files.map(file => {
    const urlPath = `/${file.path.replace(/\.md$/, '.html')}`;
    const fullUrl = baseUrl ? `${baseUrl}${urlPath}` : urlPath;
    return `  <url>
    <loc>${fullUrl}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </url>`;
  }).join('\n');

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  await fs.writeFile(sitemapPath, sitemapXml, 'utf-8');
  console.log(`🗺️ Generated sitemap: ${sitemapPath}`);
}

/**
 * 生成导航 JSON 文件
 */
export async function generateNavigationJson(files: FileInfo[], outDir: string): Promise<void> {
  const navigationJsonPath = path.join(outDir, 'navigation.json');
  const navigation = generateNavigation(files);

  await fs.writeFile(navigationJsonPath, JSON.stringify(navigation, null, 2), 'utf-8');
  console.log(`📊 Generated navigation data: ${navigationJsonPath}`);
}

/**
 * 复制静态资源
 */
export async function copyStaticAssets(srcDir: string, outDir: string): Promise<void> {
  const staticDir = path.join(srcDir, 'static');

  try {
    await fs.access(staticDir);
    const staticOutDir = path.join(outDir, 'static');

    // 递归复制目录
    async function copyDir(src: string, dest: string) {
      await fs.mkdir(dest, { recursive: true });
      const entries = await fs.readdir(src, { withFileTypes: true });

      for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
          await copyDir(srcPath, destPath);
        } else {
          await fs.copyFile(srcPath, destPath);
        }
      }
    }

    await copyDir(staticDir, staticOutDir);
    console.log(`📁 Copied static assets from ${staticDir} to ${staticOutDir}`);
  } catch (error) {
    // 静态目录不存在，忽略
  }
}

/**
 * 构建管道（函数组合）
 */
export async function buildPipeline(options: BuildOptions): Promise<void> {
  // 验证配置
  const validatedOptions = await validateConfig(options);

  // 清理输出目录
  await cleanOutputDir(validatedOptions.outDir);

  // 确保 .zen/.gitignore 文件
  await ensureZenGitignore(validatedOptions.outDir, validatedOptions.verbose);

  // 扫描源文件
  const scanResult = await scanSourceFiles(validatedOptions);
  if (scanResult.scannedFiles.length === 0) {
    console.warn(`⚠️ No Markdown files found in ${validatedOptions.srcDir}`);
    return;
  }

  // 处理 Markdown 文件
  const processResult = await processMarkdownFilesStep(scanResult);
  if (processResult.files.length === 0) {
    console.warn(`⚠️ Failed to read any Markdown files`);
    return;
  }

  // 运行 AI 元数据提取
  const aiResult = await runAIMetadataExtraction(processResult);

  // 存储母语文件
  await storeNativeFiles(aiResult.files, aiResult.verbose);

  // 处理翻译（如果指定了目标语言）
  if (aiResult.langs && aiResult.langs.length > 0) {
    await processTranslations(aiResult.files, aiResult.langs, aiResult.verbose);
  }

  // 生成导航
  const navigationResult = await generateNavigationStep(aiResult);

  // 渲染模板
  await renderTemplates(navigationResult);

  // 生成站点地图
  await generateSitemap(navigationResult.files, navigationResult.outDir, navigationResult.baseUrl);

  // 生成导航 JSON
  await generateNavigationJson(navigationResult.files, navigationResult.outDir);

  // 复制静态资源
  await copyStaticAssets(navigationResult.srcDir, navigationResult.outDir);
}

/**
 * 主构建函数
 */
export async function buildSite(options: BuildOptions): Promise<void> {
  const startTime = Date.now();

  try {
    await buildPipeline(options);

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    console.log(`🎉 Build completed in ${duration}s`);
  } catch (error) {
    console.error(`❌ Build failed:`, error);
    throw error;
  }
}

/**
 * 多语言构建
 */
export async function buildMultiLang(options: MultiLangBuildOptions): Promise<void> {
  // 多语言构建是 buildSite 的超集
  // 这里可以添加多语言特定的逻辑
  return buildSite(options);
}

/**
 * 监听模式构建
 */
export async function watchAndBuild(options: BuildOptions): Promise<void> {
  const { srcDir, verbose = false } = options;

  console.log(`👀 Watching for changes in ${srcDir}...`);

  const watcher = chokidar.watch(srcDir, {
    ignored: /(^|[\/\\])\../, // 忽略隐藏文件
    persistent: true,
    ignoreInitial: true,
  });

  let isBuilding = false;
  let buildQueue: Array<() => Promise<void>> = [];

  const debouncedBuild = async () => {
    if (isBuilding) {
      // 如果正在构建，将构建任务加入队列
      buildQueue.push(() => buildSite(options));
      return;
    }

    isBuilding = true;

    try {
      console.log(`🔄 Detected changes, rebuilding...`);
      await buildSite(options);
    } catch (error) {
      console.error(`❌ Build failed:`, error);
    } finally {
      isBuilding = false;

      // 处理队列中的下一个构建任务
      if (buildQueue.length > 0) {
        const nextBuild = buildQueue.shift();
        if (nextBuild) {
          setTimeout(nextBuild, 100); // 小延迟避免立即重建
        }
      }
    }
  };

  // 防抖函数
  let timeout: NodeJS.Timeout;
  const debounce = (fn: () => void, delay: number) => {
    clearTimeout(timeout);
    timeout = setTimeout(fn, delay);
  };

  watcher.on('all', (event, path) => {
    if (verbose) console.log(`📁 ${event}: ${path}`);
    debounce(debouncedBuild, 500); // 500ms 防抖
  });

  // 初始构建
  await buildSite(options);

  // 保持进程运行
  process.on('SIGINT', () => {
    watcher.close();
    process.exit(0);
  });
}

/**
 * 启动开发服务器
 */
export async function serveSite(options: BuildOptions & { port?: number; host?: string }): Promise<void> {
  const { outDir, port = 3000, host = 'localhost', verbose = false } = options;

  const app = express();

  // 提供静态文件
  app.use(express.static(outDir));

  // 处理 SPA 路由（所有未找到的文件返回 index.html）
  app.get('*', (req, res) => {
    const indexPath = path.join(outDir, 'index.html');
    res.sendFile(indexPath);
  });

  const server = http.createServer(app);

  server.listen(port, host, () => {
    console.log(`🚀 Server running at http://${host}:${port}`);
    console.log(`📁 Serving from: ${outDir}`);

    if (verbose) {
      console.log(`🔍 Verbose mode enabled`);
    }
  });

  // 优雅关闭
  process.on('SIGINT', () => {
    console.log(`\n👋 Shutting down server...`);
    server.close();
    process.exit(0);
  });
}