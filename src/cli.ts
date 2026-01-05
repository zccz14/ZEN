#!/usr/bin/env node

import { Cli, Command, Option } from 'clipanion';
import { ZenBuilder } from './builder';
import { ZenConfig } from './types';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as url from 'url';

// 获取版本号 - 从 package.json 读取
function getVersion(): string {
  try {
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fsSync.readFileSync(packageJsonPath, 'utf-8'));
    return packageJson.version;
  } catch {
    return '0.1.32';
  }
}

// 基础命令类
abstract class BaseCommand extends Command {
  protected async loadConfig(configPath?: string): Promise<ZenConfig> {
    if (!configPath) {
      return {};
    }

    try {
      const resolvedPath = path.resolve(configPath);
      const configContent = await fs.readFile(resolvedPath, 'utf-8');
      return JSON.parse(configContent);
    } catch (error) {
      this.context.stderr.write(`❌ Failed to load config file: ${error}\n`);
      throw error;
    }
  }

  protected getOutDir(): string {
    const currentDir = process.cwd();
    return path.join(currentDir, '.zen', 'dist');
  }
}

// Scan 命令
class ScanCommand extends BaseCommand {
  static paths = [['scan']];

  scanDir = Option.String('--scan-dir');
  verbose = Option.Boolean('-v,--verbose');
  config = Option.String('-c,--config');

  static usage = Command.Usage({
    description: 'Scan Markdown files in current directory and save to scan directory',
    details: `
      This command scans all Markdown files in the current directory and saves the results
      to a scan directory (default: .zen/src). This enables incremental builds and better
      build performance.

      Examples:
        $ zengen scan
        $ zengen scan --verbose
        $ zengen scan --scan-dir .zen/cache
        $ zengen scan --config zen.config.json
    `,
  });

  async execute() {
    try {
      // 加载配置文件
      const config = await this.loadConfig(this.config);

      // 强制使用当前目录作为 src 目录
      const currentDir = process.cwd();

      // 合并命令行参数和配置
      const scanOptions = {
        srcDir: currentDir,
        scanDir: this.scanDir || config.scanDir,
        verbose: this.verbose,
      };

      const builder = new ZenBuilder(config);

      // 执行扫描
      await builder.scan(scanOptions);

      return 0;
    } catch (error) {
      this.context.stderr.write(`❌ Scan failed: ${error}\n`);
      return 1;
    }
  }
}

// Build 命令
class BuildCommand extends BaseCommand {
  static paths = [['build']];

  template = Option.String('-t,--template');
  watch = Option.Boolean('-w,--watch');
  serve = Option.Boolean('-s,--serve');
  port = Option.String('-p,--port', '3000');
  host = Option.String('--host', 'localhost');
  verbose = Option.Boolean('-v,--verbose');
  config = Option.String('-c,--config');
  baseUrl = Option.String('--base-url');
  clean = Option.Boolean('--clean');

  static usage = Command.Usage({
    description: 'Build documentation site from Markdown files in current directory',
    details: `
      This command builds a documentation site from Markdown files in the current directory.
      The output will be placed in the .zen/dist directory.

      The build process now uses a scan directory (.zen/src by default) for better performance
      and incremental builds. You can run 'zengen scan' first to populate the scan directory.

      Examples:
        $ zengen build
        $ zengen build --watch
        $ zengen build --watch --serve
        $ zengen build --watch --serve --port 8080
        $ zengen build --config zen.config.json
        $ zengen build --clean
    `,
  });

  async execute() {
    try {
      // 加载配置文件
      const config = await this.loadConfig(this.config);

      // 强制使用当前目录作为 src 目录，输出到 .zen/dist 目录
      const currentDir = process.cwd();
      const outDir = this.getOutDir();

      // 合并命令行参数和配置
      const buildOptions = {
        srcDir: currentDir,
        outDir: outDir,
        template: this.template ? path.resolve(this.template) : undefined,
        watch: this.watch,
        serve: this.serve,
        port: parseInt(this.port, 10),
        host: this.host,
        verbose: this.verbose,
        baseUrl: this.baseUrl || config.baseUrl,
      };

      const builder = new ZenBuilder(config);

      // 验证配置
      const errors = builder.validateConfig(config);
      if (errors.length > 0) {
        this.context.stderr.write('❌ Configuration errors:\n');
        errors.forEach(error => this.context.stderr.write(`  - ${error}\n`));
        return 1;
      }

      // 警告 --serve 选项需要 --watch 选项
      if (this.serve && !this.watch) {
        this.context.stdout.write(
          '⚠️ Warning: --serve option requires --watch option, ignoring --serve\n'
        );
        buildOptions.serve = false;
      }

      // 清理输出目录
      if (this.clean) {
        await builder.clean(buildOptions.outDir);
      }

      // 构建或监听
      if (this.watch) {
        await builder.watch(buildOptions);
      } else {
        await builder.build(buildOptions);
      }

      return 0;
    } catch (error) {
      this.context.stderr.write(`❌ Build failed: ${error}\n`);
      return 1;
    }
  }
}

// 创建 CLI 应用
const cli = new Cli({
  binaryName: 'zengen',
  binaryLabel: 'ZEN - A minimalist Markdown documentation site builder',
  binaryVersion: getVersion(),
});

// 注册命令
cli.register(ScanCommand);
cli.register(BuildCommand);

// 运行 CLI
cli.runExit(process.argv.slice(2), {
  ...Cli.defaultContext,
  stdin: process.stdin,
  stdout: process.stdout,
  stderr: process.stderr,
});
