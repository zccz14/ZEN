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
        baseUrl: this.baseUrl || config.baseUrl
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
        this.context.stdout.write('⚠️ Warning: --serve option requires --watch option, ignoring --serve\n');
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

// Clean 命令
class CleanCommand extends BaseCommand {
  static paths = [['clean']];

  static usage = Command.Usage({
    description: 'Clean .zen/dist output directory',
    details: `
      This command removes the .zen/dist directory and all its contents.

      Example:
        $ zengen clean
    `,
  });

  async execute() {
    try {
      const builder = new ZenBuilder();
      const outDir = this.getOutDir();
      await builder.clean(outDir);
      this.context.stdout.write('✅ Clean completed successfully\n');
      return 0;
    } catch (error) {
      this.context.stderr.write(`❌ Clean failed: ${error}\n`);
      return 1;
    }
  }
}

// Init 命令
class InitCommand extends BaseCommand {
  static paths = [['init']];

  dir = Option.String('-d,--dir', '.');

  static usage = Command.Usage({
    description: 'Initialize a new ZEN project',
    details: `
      This command initializes a new ZEN project with example documentation,
      configuration files, and directory structure.

      Example:
        $ zengen init
        $ zengen init --dir ./my-docs
    `,
  });

  async execute() {
    try {
      const targetDir = path.resolve(this.dir);

      // 创建目录结构
      await fs.mkdir(path.join(targetDir, 'static'), { recursive: true });

      // 创建示例文档
      const exampleDoc = `# Welcome to ZEN

This is an example documentation page generated by ZEN.

## Getting Started

1. Write your documentation in Markdown format in current directory
2. Run \`zengen build\`
3. Open the generated HTML files in your browser at .zen/dist

## Features

- **Minimal configuration**: Focus on writing, not configuration
- **Smart navigation**: Automatic navigation generation
- **Beautiful templates**: Clean, responsive design
- **Code highlighting**: Syntax highlighting for code blocks

## Example Code

\`\`\`javascript
// This is a JavaScript example
console.log('Hello ZEN!');
\`\`\`

---

*Happy documenting!*`;

      await fs.writeFile(
        path.join(targetDir, 'index.md'),
        exampleDoc,
        'utf-8'
      );

      // 创建配置文件
      const config = {
        template: undefined,
        i18n: {
          sourceLang: 'en-US',
          targetLangs: ['zh-CN', 'ja-JP']
        }
      };

      await fs.writeFile(
        path.join(targetDir, 'zen.config.json'),
        JSON.stringify(config, null, 2),
        'utf-8'
      );

      // 创建 package.json 脚本（如果不存在）
      const packageJsonPath = path.join(targetDir, 'package.json');
      try {
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

        if (!packageJson.scripts) {
          packageJson.scripts = {};
        }

        packageJson.scripts.build = 'zengen build';
        packageJson.scripts['build:watch'] = 'zengen build --watch';
        packageJson.scripts['build:serve'] = 'zengen build --watch --serve';
        packageJson.scripts.clean = 'zengen clean';

        await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf-8');
      } catch (error) {
        // package.json 不存在，创建简单的版本
        const simplePackageJson = {
          name: 'zen-docs',
          version: '1.0.0',
          scripts: {
            build: 'zengen build',
            'build:watch': 'zengen build --watch',
            'build:serve': 'zengen build --watch --serve',
            clean: 'zengen clean'
          }
        };

        await fs.writeFile(
          packageJsonPath,
          JSON.stringify(simplePackageJson, null, 2),
          'utf-8'
        );
      }

      this.context.stdout.write(`
🎉 ZEN project initialized successfully!

Next steps:
1. Add your Markdown files to the current directory
2. Run 'npm run build' to generate the site (output will be in .zen/dist)
3. Run 'npm run build:watch' for development with auto-reload
4. Run 'npm run build:serve' for development with auto-reload and HTTP server

Project structure:
${targetDir}/
├── index.md        # Example document (in current directory)
├── static/         # Static assets (images, CSS, JS)
├── zen.config.json # Configuration file
└── package.json    # npm scripts

For more information, visit: https://github.com/zccz14/ZEN
      `);

      return 0;
    } catch (error) {
      this.context.stderr.write(`❌ Initialization failed: ${error}\n`);
      return 1;
    }
  }
}

// Info 命令
class InfoCommand extends BaseCommand {
  static paths = [['info']];

  static usage = Command.Usage({
    description: 'Show information about ZEN',
    details: `
      This command displays information about ZEN, including version,
      features, and available commands.

      Example:
        $ zengen info
    `,
  });

  async execute() {
    const version = getVersion();
    this.context.stdout.write(`
🤖 ZEN - A minimalist Markdown documentation site builder

Version: ${version}
Description: Build beautiful documentation sites from Markdown files

Features:
  • Minimal configuration required
  • Smart navigation generation
  • Beautiful, responsive templates
  • Code syntax highlighting
  • Watch mode for development
  • Sitemap generation
  • Static asset support

Commands:
  build     Build documentation site
  clean     Clean output directory
  init      Initialize new project
  info      Show this information

Examples:
  $ zengen build
  $ zengen build --watch
  $ zengen build --watch --serve
  $ zengen build --watch --serve --port 8080
  $ zengen init --dir ./my-docs
  $ zengen clean

For more help, run: zengen --help
    `);

    return 0;
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
cli.register(CleanCommand);
cli.register(InitCommand);
cli.register(InfoCommand);

// 运行 CLI
cli.runExit(process.argv.slice(2), {
  ...Cli.defaultContext,
  stdin: process.stdin,
  stdout: process.stdout,
  stderr: process.stderr,
});