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
  ai = Option.Boolean('--ai', { description: 'Enable AI metadata extraction' });
  lang = Option.Array('--lang', { description: 'Target languages for translation (e.g., en-US, ja-JP)' });

  static usage = Command.Usage({
    description: 'Build documentation site from Markdown files in current directory',
    details: `
      This command builds a documentation site from Markdown files in the current directory.
      The output will be placed in the .zen/dist directory.

      Examples:
        $ zengen build
        $ zengen build --watch
        $ zengen build --watch --serve
        $ zengen build --watch --serve --port 8080
        $ zengen build --config zen.config.json
        $ zengen build --clean
        $ zengen build --ai (requires OPENAI_API_KEY environment variable)
        $ zengen build --lang en-US --lang ja-JP (translate to English and Japanese)
    `,
  });

  async execute() {
    try {
      // 加载配置文件
      const config = await this.loadConfig(this.config);

      // 强制使用当前目录作为 src 目录，输出到 .zen/dist 目录
      const currentDir = process.cwd();
      const outDir = this.getOutDir();

      // 处理 AI 配置：如果指定了 --ai 参数，启用 AI；否则使用配置中的设置
      const aiConfig = {
        ...config.ai,
        enabled: this.ai ? true : config.ai?.enabled,
      };

      // 处理语言配置：命令行参数优先于配置文件
      const targetLangs = this.lang && this.lang.length > 0 ? this.lang : config.i18n?.targetLangs;
      const i18nConfig = targetLangs && targetLangs.length > 0 ? {
        ...config.i18n,
        sourceLang: config.i18n?.sourceLang || 'zh-Hans', // 默认源语言为中文
        targetLangs,
      } : undefined;

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
        langs: this.lang,
      };

      // 创建最终的配置，包含 AI 和 i18n 设置
      const finalConfig = {
        ...config,
        ai: aiConfig.enabled ? aiConfig : undefined,
        i18n: i18nConfig,
      };

      const builder = new ZenBuilder(finalConfig);

      // 验证配置
      const errors = builder.validateConfig(finalConfig);
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
cli.register(BuildCommand);

// 运行 CLI
cli.runExit(process.argv.slice(2), {
  ...Cli.defaultContext,
  stdin: process.stdin,
  stdout: process.stdout,
  stderr: process.stderr,
});
