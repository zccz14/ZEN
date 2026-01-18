#!/usr/bin/env node

import { Cli, Command, Option } from 'clipanion';
import { config } from 'dotenv';
import * as path from 'path';
import { buildSite } from './build/pipeline';
import { CZON_VERSION } from './version';

// 加载 .env 文件中的环境变量
config();

// Build 命令
class BuildCommand extends Command {
  static paths = [['build']];

  verbose = Option.Boolean('-v,--verbose');
  lang = Option.Array('--lang', {
    description: 'Target languages for translation (e.g., en-US, ja-JP)',
  });
  baseUrl = Option.String('--baseUrl', {
    description:
      'Base URL for sitemap generation (e.g., https://yoursite.com). If not provided, sitemap will not be generated.',
  });

  static usage = Command.Usage({
    description: 'Build documentation site from Markdown files in current directory',
    details: `
      This command builds a documentation site from Markdown files in the current directory.
      The output will be placed in the .czon/dist directory.

      Examples:
        $ czon build
        $ czon build --lang en-US --lang ja-JP (translate to English and Japanese)
        $ czon build --baseUrl https://yoursite.com (generate sitemap.xml)
    `,
  });

  async execute() {
    try {
      await buildSite({
        verbose: this.verbose,
        langs: this.lang,
        baseUrl: this.baseUrl,
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
  binaryName: 'czon',
  binaryLabel: 'CZON - A minimalist Markdown documentation site builder',
  binaryVersion: CZON_VERSION,
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
