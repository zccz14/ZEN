import { BuildOptions, FileInfo, NavigationItem, ZenConfig } from './types';
import { MarkdownConverter } from './markdown';
import { TemplateEngine } from './template';
import { NavigationGenerator } from './navigation';
import { GitIgnoreProcessor } from './gitignore';
import { FileScanner, ScanOptions as ScannerScanOptions } from './scanner';
import { scan, ScanOptions } from './scan';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as chokidar from 'chokidar';
import express from 'express';
import * as http from 'http';

export class ZenBuilder {
  private markdownConverter: MarkdownConverter;
  private templateEngine: TemplateEngine;
  private navigationGenerator: NavigationGenerator;
  private fileScanner: FileScanner;
  private config: ZenConfig = {};

  constructor(config: ZenConfig = {}) {
    this.config = config;
    this.markdownConverter = new MarkdownConverter(config.processors || []);
    this.templateEngine = new TemplateEngine();
    this.navigationGenerator = new NavigationGenerator(config.baseUrl);
    this.fileScanner = new FileScanner();
  }

  /**
   * 扫描源文件，返回文件列表
   */
  async scan(options: ScanOptions): Promise<FileInfo[]> {
    const { srcDir, verbose = false } = options;

    if (verbose) {
      console.log(`🔍 Starting ZEN scan...`);
      console.log(`📁 Source: ${srcDir}`);
      console.log(`🔍 Verbose mode enabled`);
    }

    // 验证源目录
    try {
      await fs.access(srcDir);
    } catch (error) {
      throw new Error(`Source directory does not exist: ${srcDir}`);
    }

    // 执行扫描 - 使用新的 scan() 函数获取文件路径列表
    const filePaths = await scan({
      srcDir,
      verbose,
    });

    // 在 verbose 模式下输出文件列表
    if (verbose && filePaths.length > 0) {
      console.log(`📋 File list (${filePaths.length} files):`);
      filePaths.forEach((filePath, index) => {
        const relativePath = path.relative(srcDir, filePath);
        console.log(`  ${index + 1}. ${relativePath}`);
      });
    }

    // 将文件路径转换为 FileInfo 对象
    const files: FileInfo[] = [];
    for (const filePath of filePaths) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const relativePath = path.relative(srcDir, filePath);
        const ext = path.extname(filePath);
        const name = path.basename(filePath, ext);

        files.push({
          path: filePath,
          relativePath,
          name,
          ext,
          content,
        });
      } catch (error) {
        console.error(`❌ Failed to read file ${filePath}:`, error);
      }
    }

    if (verbose) {
      console.log(`✅ Scan completed!`);
      console.log(`   Files scanned: ${files.length}`);
    } else {
      console.log(`✅ Scanned ${files.length} files`);
    }

    return files;
  }

  /**
   * 扫描源文件获取文件列表
   */
  private async scanFiles(srcDir: string, verbose: boolean): Promise<FileInfo[]> {
    // 使用新的 scan() 函数获取文件路径列表
    const filePaths = await scan({
      srcDir,
      verbose,
    });

    // 在 verbose 模式下输出文件列表
    if (verbose && filePaths.length > 0) {
      console.log(`📋 File list (${filePaths.length} files):`);
      filePaths.forEach((filePath, index) => {
        const relativePath = path.relative(srcDir, filePath);
        console.log(`  ${index + 1}. ${relativePath}`);
      });
    }

    // 将文件路径转换为 FileInfo 对象
    const files: FileInfo[] = [];
    for (const filePath of filePaths) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const relativePath = path.relative(srcDir, filePath);
        const ext = path.extname(filePath);
        const name = path.basename(filePath, ext);

        files.push({
          path: filePath,
          relativePath,
          name,
          ext,
          content,
        });
      } catch (error) {
        console.error(`❌ Failed to read file ${filePath}:`, error);
      }
    }

    return files;
  }

  /**
   * 构建文档站点
   */
  async build(options: BuildOptions): Promise<void> {
    const startTime = Date.now();
    const { srcDir, outDir, template, verbose = false, baseUrl } = options;

    if (verbose) {
      console.log(`🚀 Starting ZEN build...`);
      console.log(`📁 Source: ${srcDir}`);
      console.log(`📁 Output: ${outDir}`);
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

    // 扫描文件获取文件列表
    if (verbose) console.log(`📄 Scanning Markdown files...`);
    const rawFiles = await this.scanFiles(srcDir, verbose);

    if (rawFiles.length === 0) {
      console.warn(`⚠️ No Markdown files found in ${srcDir}`);
      return;
    }

    if (verbose) console.log(`✅ Found ${rawFiles.length} Markdown files`);

    // 转换 Markdown 文件
    if (verbose) console.log(`⚡ Converting Markdown files...`);
    const files = await this.markdownConverter.convertFiles(rawFiles);

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
        console.error(`❌ Failed to process ${file.relativePath}:`, error);
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
   * 验证配置
   */
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

    return errors;
  }
}
