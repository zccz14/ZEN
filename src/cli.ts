#!/usr/bin/env node

import { Cli, Command, Option } from 'clipanion';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { buildSite } from './build/pipeline';

// 加载 .env 文件中的环境变量
config();

// 获取版本号 - 从 package.json 读取
function getVersion(): string {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  return packageJson.version;
}

// Build 命令
class BuildCommand extends Command {
  static paths = [['build']];

  template = Option.String('-t,--template');
  verbose = Option.Boolean('-v,--verbose');
  baseUrl = Option.String('--base-url');
  lang = Option.Array('--lang', {
    description: 'Target languages for translation (e.g., en-US, ja-JP)',
  });

  static usage = Command.Usage({
    description: 'Build documentation site from Markdown files in current directory',
    details: `
      This command builds a documentation site from Markdown files in the current directory.
      The output will be placed in the .zen/dist directory.

      Examples:
        $ zengen build
        $ zengen build --lang en-US --lang ja-JP (translate to English and Japanese)
    `,
  });

  async execute() {
    try {
      await buildSite({
        srcDir: process.cwd(),
        outDir: path.join(process.cwd(), '.zen', 'dist'),
        template: this.template ? path.resolve(this.template) : undefined,
        verbose: this.verbose,
        baseUrl: this.baseUrl,
        langs: this.lang,
      });

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
