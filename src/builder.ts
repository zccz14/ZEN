import {
  BuildOptions,
  FileInfo,
  NavigationItem,
  ZenConfig,
  ScannedFile,
  MultiLangBuildOptions,
} from './types';
import { MarkdownConverter } from './markdown';
import { TemplateEngine } from './template';
import { NavigationGenerator } from './navigation';
import { GitIgnoreProcessor } from './gitignore';
import { Scanner } from './scanner';
import { AIProcessor } from './ai-processor';
import { TranslationService } from './translation-service';
import { AIService } from './ai-service';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as chokidar from 'chokidar';
import express from 'express';
import * as http from 'http';

export class ZenBuilder {
  private markdownConverter: MarkdownConverter;
  private templateEngine: TemplateEngine;
  private navigationGenerator: NavigationGenerator;
  private scanner: Scanner;
  private aiProcessor: AIProcessor;
  private translationService: TranslationService;
  private config: ZenConfig = {};

  constructor(config: ZenConfig = {}) {
    this.config = config;

    // 创建 AI 处理器
    this.aiProcessor = new AIProcessor(config);

    // 创建翻译服务
    this.translationService = new TranslationService(config.ai);

    // 获取现有的 processors 或创建空数组
    const existingProcessors = config.processors || [];

    // 如果 AI 处理器启用，将其添加到 processors 列表的开头
    const processors = this.aiProcessor.isEnabled()
      ? [this.aiProcessor, ...existingProcessors]
      : existingProcessors;

    this.markdownConverter = new MarkdownConverter(processors);
    this.templateEngine = new TemplateEngine();
    this.navigationGenerator = new NavigationGenerator(config.baseUrl);
    this.scanner = new Scanner(config);
  }

  /**
   * 构建文档站点
   */
  async build(options: BuildOptions): Promise<void> {
    const startTime = Date.now();
    const { srcDir, outDir, template, verbose = false, baseUrl, langs } = options;

    if (verbose) {
      console.log(`🚀 Starting ZEN build...`);
      console.log(`📁 Source: ${srcDir}`);
      console.log(`📁 Output: ${outDir}`);
      console.log(`🔗 Base URL: ${baseUrl || '(not set)'}`);
      if (langs && langs.length > 0) {
        console.log(`🌐 Target languages: ${langs.join(', ')}`);
      }
      console.log(`🔍 Verbose mode enabled`);
    }

    // 验证源目录
    try {
      await fs.access(srcDir);
    } catch (error) {
      throw new Error(`Source directory does not exist: ${srcDir}`);
    }

    // 确保输出目录存在
    await fs.mkdir(outDir, { recursive: true });

    // 确保 .zen/.gitignore 文件存在且内容正确
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

    // 扫描阶段：生成文件列表
    if (verbose) console.log(`🔍 Scanning source directory...`);
    const scannedFiles = await this.scanner.scanDirectory(srcDir);

    if (scannedFiles.length === 0) {
      console.warn(`⚠️ No Markdown files found in ${srcDir}`);
      return;
    }

    if (verbose) console.log(`✅ Found ${scannedFiles.length} Markdown files`);

    // 清理 meta.json 中的孤儿条目（文件已删除但缓存仍存在）
    if (this.aiProcessor.isEnabled()) {
      if (verbose) console.log(`🧹 Cleaning orphan entries in meta.json...`);
      const aiService = new AIService();
      const existingFilePaths = scannedFiles.map(file => file.path);
      await aiService.removeOrphanEntries(existingFilePaths);
    }

    // 保存扫描结果到 .zen/dist 目录
    const zenDistDir = path.join(path.dirname(outDir), 'dist');
    const scanResultPath = path.join(zenDistDir, 'scan-result.json');
    if (verbose) console.log(`💾 Saving scan result to ${scanResultPath}...`);
    await this.scanner.saveScanResult(scannedFiles, scanResultPath);

    // 构建阶段：读取文件内容并转换
    if (verbose) console.log(`📄 Reading and converting Markdown files...`);
    const files = await this.markdownConverter.convertScannedFiles(scannedFiles, srcDir);

    if (files.length === 0) {
      console.warn(`⚠️ Failed to read any Markdown files`);
      return;
    }

    // AI 批量处理（如果启用）
    if (this.aiProcessor.isEnabled()) {
      if (verbose) console.log(`🤖 Running AI metadata extraction...`);
      await this.aiProcessor.processBatch(files);
    }

    // 存储母语文件到 .zen/src
    if (verbose) console.log(`💾 Storing native language files...`);
    await this.storeNativeFiles(files, verbose);

    // 处理翻译（如果指定了目标语言）
    if (langs && langs.length > 0 && this.translationService.isEnabled()) {
      if (verbose) console.log(`🌐 Processing translations...`);
      await this.processTranslations(files, langs, verbose);
    }

    // 更新导航生成器的 baseUrl（优先使用命令行参数）
    if (baseUrl !== undefined) {
      if (verbose) console.log(`🔗 Using baseUrl: ${baseUrl}`);
      this.navigationGenerator.setBaseUrl(baseUrl);
    } else if (this.config.baseUrl) {
      if (verbose) console.log(`🔗 Using config baseUrl: ${this.config.baseUrl}`);
      this.navigationGenerator.setBaseUrl(this.config.baseUrl);
    }

    // 生成导航
    if (verbose) console.log(`🗺️ Generating navigation...`);
    const navigation = this.navigationGenerator.generate(files);

    // 处理每个文件
    if (verbose) console.log(`⚡ Processing files...`);
    let processedCount = 0;

    for (const file of files) {
      try {
        // 生成模板数据
        const templateData = this.templateEngine.generateTemplateData(file, navigation);

        // 渲染模板
        const html = await this.templateEngine.render(templateData, template);

        // 生成输出路径
        const outputPath = this.templateEngine.getOutputPath(file, outDir);

        // 保存文件
        await this.templateEngine.saveToFile(html, outputPath);

        processedCount++;

        if (verbose && processedCount % 10 === 0) {
          console.log(`  Processed ${processedCount}/${files.length} files...`);
        }
      } catch (error) {
        console.error(`❌ Failed to process ${file.path}:`, error);
      }
    }

    // 生成站点地图
    if (verbose) console.log(`🗺️ Generating sitemap...`);
    await this.generateSitemap(files, outDir);

    // 生成导航 JSON 文件
    if (verbose) console.log(`📊 Generating navigation data...`);
    await this.generateNavigationJson(files, outDir);

    // 复制静态资源（如果存在）
    await this.copyStaticAssets(srcDir, outDir);

    // 确保每个目录都有 index.html
    if (verbose) console.log(`📁 Ensuring index.html in all directories...`);
    await this.ensureDirectoryIndexHtml(outDir);

    const duration = Date.now() - startTime;
    if (verbose) {
      console.log(`🎉 Build completed!`);
      console.log(`   Files processed: ${processedCount}/${files.length}`);
      console.log(`   Duration: ${duration}ms`);
      console.log(`   Output directory: ${outDir}`);
    } else {
      console.log(`✅ Built ${processedCount} files to ${outDir} in ${duration}ms`);
    }
  }

  /**
   * 多语言构建：基于 meta.json 构建多语言版本
   */
  async buildMultiLang(options: MultiLangBuildOptions): Promise<void> {
    const startTime = Date.now();
    const {
      srcDir,
      outDir,
      template,
      verbose = false,
      baseUrl,
      langs,
      useMetaData = true,
      filterOrphans = true,
    } = options;

    if (!langs || langs.length === 0) {
      throw new Error('At least one language must be specified for multi-language build');
    }

    if (verbose) {
      console.log(`🚀 Starting ZEN multi-language build...`);
      console.log(`📁 Source: ${srcDir}`);
      console.log(`📁 Output: ${outDir}`);
      console.log(`🌐 Target languages: ${langs.join(', ')}`);
      console.log(`📊 Using meta.json: ${useMetaData}`);
      console.log(`🧹 Filter orphans: ${filterOrphans}`);
      console.log(`🔗 Base URL: ${baseUrl || '(not set)'}`);
      console.log(`🔍 Verbose mode enabled`);
    }

    // 验证源目录
    try {
      await fs.access(srcDir);
    } catch (error) {
      throw new Error(`Source directory does not exist: ${srcDir}`);
    }

    // 确保输出目录存在
    await fs.mkdir(outDir, { recursive: true });

    // 扫描阶段：生成文件列表（与普通构建保持一致）
    if (verbose) console.log(`🔍 Scanning source directory...`);
    const scannedFiles = await this.scanner.scanDirectory(srcDir);

    if (scannedFiles.length === 0) {
      console.warn(`⚠️ No Markdown files found in ${srcDir}`);
      return;
    }

    if (verbose) console.log(`✅ Found ${scannedFiles.length} Markdown files`);

    // 清理 meta.json 中的孤儿条目（文件已删除但缓存仍存在）
    if (this.aiProcessor.isEnabled()) {
      if (verbose) console.log(`🧹 Cleaning orphan entries in meta.json...`);
      const aiService = new AIService();
      const existingFilePaths = scannedFiles.map(file => file.path);
      await aiService.removeOrphanEntries(existingFilePaths);
    }

    // 构建阶段：读取文件内容并转换
    if (verbose) console.log(`📄 Reading and converting Markdown files...`);
    const files = await this.markdownConverter.convertScannedFiles(scannedFiles, srcDir);

    if (files.length === 0) {
      console.warn(`⚠️ Failed to read any Markdown files`);
      return;
    }

    // AI 批量处理（如果启用）- 更新 meta.json
    if (this.aiProcessor.isEnabled()) {
      if (verbose) console.log(`🤖 Running AI metadata extraction...`);
      await this.aiProcessor.processBatch(files);
    }

    // 存储母语文件到 .zen/src
    if (verbose) console.log(`💾 Storing native language files...`);
    await this.storeNativeFiles(files, verbose);

    // 使用扫描得到的 files 数组，而不是从 meta.json 重新加载
    // 这些 files 已经包含了最新的 AI 元数据
    let validFiles = files;

    if (verbose) {
      console.log(`✅ Using ${validFiles.length} scanned files for build`);
    }

    // 为每个语言构建
    let totalProcessed = 0;
    for (const lang of langs) {
      if (verbose) {
        console.log(`\n🌐 Building for language: ${lang}`);
      }

      const langProcessed = await this.buildForLanguage(
        validFiles,
        lang,
        srcDir,
        outDir,
        template,
        baseUrl,
        verbose,
        langs
      );

      totalProcessed += langProcessed;
    }

    // 生成语言索引页面
    if (verbose) {
      console.log(`\n📄 Generating language index...`);
    }
    await this.generateLanguageIndex(langs, outDir, verbose);

    const duration = Date.now() - startTime;
    console.log(`🎉 Multi-language build completed!`);
    console.log(`   Languages: ${langs.join(', ')}`);
    console.log(`   Total files built: ${totalProcessed}`);
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Output directory: ${outDir}`);
  }

  /**
   * 过滤有效的文件（移除 path 不存在的孤儿文件）
   */
  private async filterValidFiles(files: any[], srcDir: string, verbose?: boolean): Promise<any[]> {
    const validFiles: any[] = [];

    for (const file of files) {
      // 如果文件路径已经是绝对路径或包含目录，直接使用
      const filePath = file.path.startsWith('/') ? file.path : path.join(process.cwd(), file.path);
      try {
        await fs.access(filePath);
        validFiles.push(file);
      } catch (error) {
        // 文件不存在，跳过
        if (verbose) {
          console.log(`  ⚠️ Orphan file skipped: ${file.path} (path: ${filePath})`);
        }
      }
    }

    return validFiles;
  }

  /**
   * 为特定语言构建文件
   */
  private async buildForLanguage(
    files: FileInfo[],
    lang: string,
    srcDir: string,
    outDir: string,
    template?: string,
    baseUrl?: string,
    verbose?: boolean,
    allLangs?: string[]
  ): Promise<number> {
    const aiService = new AIService();
    const langDir = path.join(outDir, lang);
    await fs.mkdir(langDir, { recursive: true });

    let processedCount = 0;

    // 更新导航生成器的 baseUrl
    if (baseUrl !== undefined) {
      this.navigationGenerator.setBaseUrl(baseUrl);
    } else if (this.config.baseUrl) {
      this.navigationGenerator.setBaseUrl(this.config.baseUrl);
    }

    // 为当前语言生成导航
    const navigation = this.navigationGenerator.generate([]); // 暂时使用空导航

    for (const file of files) {
      try {
        let content: string;
        let filePath: string;
        // 确保 hash 存在，如果不存在则计算
        let finalHash = file.hash || aiService.calculateFileHash(file.content);
        let finalMetadata = file.aiMetadata;

        // 获取源语言
        const sourceLang = file.aiMetadata?.inferred_lang || 'zh-Hans';

        if (lang === sourceLang) {
          // 如果是源语言，读取原始文件
          filePath = file.path.startsWith('/') ? file.path : path.join(process.cwd(), file.path);
          content = await fs.readFile(filePath, 'utf-8');
        } else {
          // 如果是目标语言，尝试读取翻译文件
          const translationService = new TranslationService();
          try {
            // 确保翻译文件存在并获取内容
            content = await translationService.ensureTranslatedFile(
              file,
              sourceLang,
              lang,
              finalHash
            );

            // 翻译文件的路径
            filePath = translationService.getTranslatedFilePath(file.path, lang, finalHash);

            // 对于翻译文件，我们可以使用相同的 hash，或者生成新的 hash
            // 这里我们使用相同的 hash，因为翻译是基于原始内容的
          } catch (translationError) {
            console.warn(
              `⚠️ Failed to get translation for ${file.path} to ${lang}, using source file:`,
              translationError
            );
            // 如果翻译失败，回退到源文件
            filePath = file.path.startsWith('/') ? file.path : path.join(process.cwd(), file.path);
            content = await fs.readFile(filePath, 'utf-8');
          }
        }

        // 创建 FileInfo 对象（使用现有的 file 对象，但更新内容）
        const fileInfo: FileInfo = {
          ...file,
          content,
          hash: finalHash,
          aiMetadata: finalMetadata,
        };

        // 转换为 HTML
        const convertedFileInfo = await this.markdownConverter.convert(fileInfo);
        const html = convertedFileInfo.html || '';

        // 更新文件信息中的 HTML 内容
        const finalFileInfo: FileInfo = {
          ...fileInfo,
          html,
        };

        // 生成模板数据
        const templateData = this.templateEngine.generateTemplateData(
          finalFileInfo,
          navigation,
          lang,
          allLangs
        );

        // 渲染模板
        const renderedHtml = await this.templateEngine.render(templateData, template);

        // 生成输出路径
        const outputPath = this.templateEngine.getOutputPath(
          finalFileInfo,
          outDir,
          lang,
          file.hash
        );

        // 保存文件
        await this.templateEngine.saveToFile(renderedHtml, outputPath);

        processedCount++;

        if (verbose && processedCount % 5 === 0) {
          console.log(`  Processed ${processedCount}/${files.length} files for ${lang}...`);
        }
      } catch (error) {
        console.error(`❌ Failed to process ${file.path} for ${lang}:`, error);
      }
    }

    if (verbose) {
      console.log(`  ✅ Built ${processedCount} files for ${lang}`);
    }

    return processedCount;
  }

  /**
   * 生成语言索引页面
   */
  private async generateLanguageIndex(
    langs: string[],
    outDir: string,
    verbose?: boolean
  ): Promise<void> {
    try {
      const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ZEN Documentation - Language Selection</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
           line-height: 1.6; color: #333; background: #f8f9fa;
           display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    .container { text-align: center; padding: 3rem; max-width: 600px; }
    h1 { font-size: 2.5rem; margin-bottom: 1rem; color: #212529; }
    p { color: #6c757d; margin-bottom: 2rem; font-size: 1.125rem; }
    .lang-list { list-style: none; display: flex; flex-direction: column; gap: 1rem; }
    .lang-item { margin: 0; }
    .lang-link { display: block; padding: 1rem 2rem; background: #fff; border: 2px solid #007bff;
                color: #007bff; text-decoration: none; border-radius: 8px;
                font-size: 1.25rem; font-weight: 500; transition: all 0.2s; }
    .lang-link:hover { background: #007bff; color: white; transform: translateY(-2px);
                      box-shadow: 0 4px 12px rgba(0, 123, 255, 0.2); }
    .footer { margin-top: 3rem; color: #6c757d; font-size: 0.875rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>ZEN Documentation</h1>
    <p>Select your preferred language:</p>

    <ul class="lang-list">
      ${langs
        .map(lang => {
          const langNames: Record<string, string> = {
            'zh-Hans': '简体中文',
            'en-US': 'English',
            'ja-JP': '日本語',
            'ko-KR': '한국어',
          };
          const langName = langNames[lang] || lang;
          return `<li class="lang-item">
          <a href="${lang}/" class="lang-link">${langName}</a>
        </li>`;
        })
        .join('')}
    </ul>

    <div class="footer">
      <p>Generated by <strong>ZEN</strong> • <a href="https://github.com/zccz14/ZEN" target="_blank">View on GitHub</a></p>
    </div>
  </div>
</body>
</html>`;

      const indexPath = path.join(outDir, 'index.html');
      await fs.writeFile(indexPath, indexHtml, 'utf-8');

      if (verbose) {
        console.log(`  ✅ Generated language index at ${indexPath}`);
      }
    } catch (error) {
      console.warn(`⚠️ Failed to generate language index:`, error);
    }
  }

  /**
   * 监听文件变化并自动重建
   */
  async watch(options: BuildOptions): Promise<void> {
    const {
      srcDir,
      outDir,
      template,
      verbose = false,
      serve = false,
      port = 3000,
      host = 'localhost',
      baseUrl,
    } = options;

    console.log(`👀 Watching for changes in ${srcDir}...`);
    console.log(`Press Ctrl+C to stop watching`);

    // 初始构建
    await this.build(options);

    // 启动 HTTP 服务器（如果启用）
    let server: http.Server | null = null;
    if (serve) {
      server = await this.startHttpServer(outDir, port, host);
      console.log(`🌐 HTTP server started at http://${host}:${port}`);
    }

    // 创建 GitIgnoreProcessor 并加载 .gitignore 文件
    const gitignoreProcessor = new GitIgnoreProcessor(srcDir);
    await gitignoreProcessor.loadFromFile();

    // 获取 .gitignore 模式并转换为 chokidar 兼容的正则表达式
    const gitignorePatterns = gitignoreProcessor.getPatterns();
    const gitignoreRegexes = gitignorePatterns.map(pattern => {
      // 将 glob 模式转换为正则表达式
      // 注意：这是一个简化的转换，对于复杂的 glob 模式可能需要更复杂的处理
      const regexPattern = pattern
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.')
        .replace(/\*\*/g, '.*');
      return new RegExp(`(^|[\\/\\\\])${regexPattern}([\\/\\\\].*)?$`);
    });

    // 设置文件监听，忽略隐藏文件、.zen 目录和 .gitignore 中的文件
    const watcher = chokidar.watch(srcDir, {
      ignored: [
        /(^|[\/\\])\../, // 忽略隐藏文件
        /(^|[\/\\])\.zen($|[\/\\])/, // 忽略 .zen 目录
        ...gitignoreRegexes, // 忽略 .gitignore 中的文件
      ],
      persistent: true,
      ignoreInitial: true,
    });

    let isBuilding = false;
    let buildQueue: string[] = [];

    const debouncedBuild = async () => {
      if (isBuilding) {
        return;
      }

      isBuilding = true;
      const changedFiles = [...buildQueue];
      buildQueue = [];

      try {
        if (verbose) {
          console.log(`\n🔄 Rebuilding due to changes in: ${changedFiles.join(', ')}`);
        } else {
          console.log(`\n🔄 Rebuilding...`);
        }

        await this.build(options);
        console.log(`✅ Rebuild complete. Watching for changes...`);
      } catch (error) {
        console.error(`❌ Rebuild failed:`, error);
      } finally {
        isBuilding = false;

        // 如果队列中有新文件，立即处理
        if (buildQueue.length > 0) {
          setTimeout(debouncedBuild, 100);
        }
      }
    };

    watcher
      .on('add', (filePath: string) => {
        // 双重检查：确保文件是 .md 文件且不被 .gitignore 忽略
        if (filePath.endsWith('.md') && !gitignoreProcessor.shouldIgnore(filePath)) {
          if (verbose) console.log(`📄 File added: ${filePath}`);
          buildQueue.push(filePath);
          setTimeout(debouncedBuild, 300);
        }
      })
      .on('change', (filePath: string) => {
        // 双重检查：确保文件是 .md 文件且不被 .gitignore 忽略
        if (filePath.endsWith('.md') && !gitignoreProcessor.shouldIgnore(filePath)) {
          if (verbose) console.log(`📄 File changed: ${filePath}`);
          buildQueue.push(filePath);
          setTimeout(debouncedBuild, 300);
        }
      })
      .on('unlink', (filePath: string) => {
        // 双重检查：确保文件是 .md 文件且不被 .gitignore 忽略
        if (filePath.endsWith('.md') && !gitignoreProcessor.shouldIgnore(filePath)) {
          if (verbose) console.log(`📄 File removed: ${filePath}`);
          buildQueue.push(filePath);
          setTimeout(debouncedBuild, 300);
        }
      })
      .on('error', (error: unknown) => {
        console.error(`❌ Watcher error:`, error);
      });

    // 处理退出信号
    process.on('SIGINT', () => {
      console.log(`\n👋 Stopping watcher...`);
      watcher.close();

      // 关闭 HTTP 服务器（如果存在）
      if (server) {
        console.log(`🌐 Stopping HTTP server...`);
        server.close(() => {
          console.log(`✅ HTTP server stopped`);
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    });
  }

  /**
   * 启动 HTTP 服务器
   */
  private async startHttpServer(outDir: string, port: number, host: string): Promise<http.Server> {
    return new Promise((resolve, reject) => {
      const app = express();

      // 提供静态文件服务
      app.use(express.static(outDir));

      // 处理 SPA 路由 - 所有未找到的路径返回 index.html
      app.get('*', (req: express.Request, res: express.Response) => {
        res.sendFile(path.join(outDir, 'index.html'));
      });

      const server = app.listen(port, host, () => {
        resolve(server);
      });

      server.on('error', (error: Error) => {
        reject(error);
      });
    });
  }

  /**
   * 生成站点地图
   */
  private async generateSitemap(files: FileInfo[], outDir: string): Promise<void> {
    try {
      const sitemapXml = this.navigationGenerator.generateSitemap(files, this.config.baseUrl);
      const sitemapPath = path.join(outDir, 'sitemap.xml');
      await fs.writeFile(sitemapPath, sitemapXml, 'utf-8');
    } catch (error) {
      console.warn(`⚠️ Failed to generate sitemap:`, error);
    }
  }

  /**
   * 生成导航 JSON 文件
   */
  private async generateNavigationJson(files: FileInfo[], outDir: string): Promise<void> {
    try {
      const navigationJson = this.navigationGenerator.generateJsonNavigation(files);
      const navPath = path.join(outDir, 'navigation.json');
      await fs.writeFile(navPath, navigationJson, 'utf-8');
    } catch (error) {
      console.warn(`⚠️ Failed to generate navigation JSON:`, error);
    }
  }

  /**
   * 复制静态资源
   */
  private async copyStaticAssets(srcDir: string, outDir: string): Promise<void> {
    const staticDir = path.join(srcDir, 'static');

    try {
      await fs.access(staticDir);

      // 简单的递归复制
      async function copyDir(source: string, target: string) {
        await fs.mkdir(target, { recursive: true });
        const entries = await fs.readdir(source, { withFileTypes: true });

        for (const entry of entries) {
          const srcPath = path.join(source, entry.name);
          const destPath = path.join(target, entry.name);

          if (entry.isDirectory()) {
            await copyDir(srcPath, destPath);
          } else {
            await fs.copyFile(srcPath, destPath);
          }
        }
      }

      await copyDir(staticDir, path.join(outDir, 'static'));
    } catch (error) {
      // 静态目录不存在是正常的，忽略错误
    }
  }

  /**
   * 确保每个目录都有 index.html 文件
   * 为缺少 index.html 的目录创建重定向页面
   */
  private async ensureDirectoryIndexHtml(outDir: string): Promise<void> {
    try {
      // 递归遍历所有目录
      async function processDirectory(dirPath: string): Promise<void> {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        // 检查当前目录是否有 index.html
        const hasIndexHtml = entries.some(entry => entry.isFile() && entry.name === 'index.html');

        if (!hasIndexHtml) {
          // 查找当前目录下的第一个 .html 文件（不包括 index.html）
          const htmlFiles = entries
            .filter(
              entry => entry.isFile() && entry.name.endsWith('.html') && entry.name !== 'index.html'
            )
            .map(entry => entry.name)
            .sort();

          let redirectTarget: string;

          if (htmlFiles.length > 0) {
            // 重定向到第一个 .html 文件
            redirectTarget = htmlFiles[0];
          } else {
            // 如果没有 .html 文件，重定向到父目录
            const parentDir = path.dirname(dirPath);
            if (parentDir === dirPath) {
              // 已经是根目录，重定向到根目录的 index.html（如果存在）
              redirectTarget = 'index.html';
            } else {
              // 计算相对路径到父目录
              const relativePath = path.relative(dirPath, parentDir);
              redirectTarget = path.join(relativePath, 'index.html');
            }
          }

          // 创建重定向 HTML
          const redirectHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0; url=${redirectTarget}">
  <title>Redirecting...</title>
  <script>
    window.location.href = "${redirectTarget}";
  </script>
</head>
<body>
  <p>正在重定向到 <a href="${redirectTarget}">${redirectTarget}</a>...</p>
</body>
</html>`;

          await fs.writeFile(path.join(dirPath, 'index.html'), redirectHtml, 'utf-8');
        }

        // 递归处理子目录
        for (const entry of entries) {
          if (entry.isDirectory()) {
            await processDirectory(path.join(dirPath, entry.name));
          }
        }
      }

      await processDirectory(outDir);
    } catch (error) {
      console.warn(`⚠️ Failed to ensure index.html in directories:`, error);
    }
  }

  /**
   * 清理输出目录
   */
  async clean(outDir: string): Promise<void> {
    try {
      await fs.rm(outDir, { recursive: true, force: true });
      console.log(`🧹 Cleaned output directory: ${outDir}`);
    } catch (error) {
      console.error(`❌ Failed to clean output directory:`, error);
    }
  }

  /**
   * 存储母语文件到 .zen/src 目录
   */
  private async storeNativeFiles(files: FileInfo[], verbose: boolean): Promise<void> {
    const aiService = new AIService();

    for (const file of files) {
      try {
        // 获取源语言（从AI元数据或默认值）
        const sourceLang = file.aiMetadata?.inferred_lang || 'zh-Hans';
        const nativeHash = file.hash || aiService.calculateFileHash(file.content);

        if (verbose) {
          console.log(`📄 Storing native file: ${file.path} (${sourceLang})`);
        }

        // 生成母语文件路径
        const zenSrcDir = path.join(process.cwd(), '.zen', 'src');
        const sourceLangDir = path.join(zenSrcDir, sourceLang);
        const nativeFilePath = path.join(sourceLangDir, `${nativeHash}.md`);

        // 确保目录存在
        await fs.mkdir(sourceLangDir, { recursive: true });

        // 检查文件是否已存在
        try {
          await fs.access(nativeFilePath);
          if (verbose) {
            console.log(`  ✅ Native file already exists: ${nativeFilePath}`);
          }
        } catch (error) {
          // 文件不存在，保存母语文件
          await fs.writeFile(nativeFilePath, file.content, 'utf-8');
          if (verbose) {
            console.log(`  💾 Saved native file: ${nativeFilePath}`);
          }
        }
      } catch (error) {
        console.error(`❌ Failed to store native file for ${file.path}:`, error);
      }
    }
  }

  /**
   * 处理文件翻译
   */
  private async processTranslations(
    files: FileInfo[],
    targetLangs: string[],
    verbose: boolean
  ): Promise<void> {
    const aiService = new AIService();

    for (const file of files) {
      try {
        // 获取文件的AI元数据（包含inferred_lang）
        const sourceLang = file.aiMetadata?.inferred_lang || 'zh-Hans';
        const nativeHash = file.hash || aiService.calculateFileHash(file.content);

        if (verbose) {
          console.log(`📄 Processing translations for: ${file.path} (${sourceLang})`);
        }

        for (const targetLang of targetLangs) {
          try {
            // 确保翻译文件存在
            await this.translationService.ensureTranslatedFile(
              file,
              sourceLang,
              targetLang,
              nativeHash
            );

            if (verbose) {
              console.log(`  ✅ Translated to ${targetLang}`);
            }
          } catch (error) {
            console.error(`  ❌ Failed to translate to ${targetLang}:`, error);
          }
        }
      } catch (error) {
        console.error(`❌ Failed to process translations for ${file.path}:`, error);
      }
    }
  }

  validateConfig(config: ZenConfig): string[] {
    const errors: string[] = [];

    if (config.srcDir && !path.isAbsolute(config.srcDir)) {
      errors.push('srcDir must be an absolute path');
    }

    if (config.outDir && !path.isAbsolute(config.outDir)) {
      errors.push('outDir must be an absolute path');
    }

    if (config.i18n) {
      if (!config.i18n.sourceLang) {
        errors.push('i18n.sourceLang is required');
      }

      if (!config.i18n.targetLangs || config.i18n.targetLangs.length === 0) {
        errors.push('i18n.targetLangs must have at least one language');
      }
    }

    if (config.ai) {
      // AI 总是启用，检查 API key
      if (!process.env.OPENAI_API_KEY && !config.i18n?.apiKey) {
        errors.push('OPENAI_API_KEY environment variable is required for AI functionality');
      }

      if (
        config.ai.temperature !== undefined &&
        (config.ai.temperature < 0 || config.ai.temperature > 2)
      ) {
        errors.push('ai.temperature must be between 0 and 2');
      }

      if (config.ai.maxTokens !== undefined && config.ai.maxTokens < 1) {
        errors.push('ai.maxTokens must be greater than 0');
      }
    }

    return errors;
  }
}
