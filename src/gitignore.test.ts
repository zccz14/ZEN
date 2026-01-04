import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs/promises';
import * as path from 'path';
import { GitIgnoreProcessor, createGitIgnoreProcessor } from './gitignore.js';

describe('GitIgnoreProcessor', () => {
  let testDir: string;
  let gitignorePath: string;

  beforeEach(async () => {
    // 创建临时测试目录
    testDir = path.join(__dirname, 'test-temp');
    gitignorePath = path.join(testDir, '.gitignore');

    try {
      await fs.mkdir(testDir, { recursive: true });
    } catch (error) {
      // 目录可能已存在
    }
  });

  afterEach(async () => {
    // 清理测试目录
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // 忽略清理错误
    }
  });

  describe('constructor', () => {
    it('应该正确设置baseDir', () => {
      const processor = new GitIgnoreProcessor('/test/dir');
      assert.strictEqual(processor['baseDir'], '/test/dir');
    });

    it('应该初始化空模式数组', () => {
      const processor = new GitIgnoreProcessor('/test/dir');
      const patterns = processor.getPatterns();
      assert.deepStrictEqual(patterns, []);
    });
  });

  describe('loadFromFile', () => {
    it('应该从.gitignore文件加载模式', async () => {
      const gitignoreContent = `
# 注释行
node_modules/
*.log
dist/
.DS_Store
`;
      await fs.writeFile(gitignorePath, gitignoreContent);

      const processor = new GitIgnoreProcessor(testDir);
      await processor.loadFromFile('.gitignore');

      const patterns = processor.getPatterns();
      assert.deepStrictEqual(patterns, ['**/node_modules', '*.log', '**/dist', '**/.DS_Store']);
    });

    it('当.gitignore文件不存在时应该使用空模式', async () => {
      const processor = new GitIgnoreProcessor(testDir);
      await processor.loadFromFile('non-existent-file');

      const patterns = processor.getPatterns();
      assert.deepStrictEqual(patterns, []);
    });

    it('应该跳过空行和注释', async () => {
      const gitignoreContent = `
# 这是一个注释

node_modules/

# 另一个注释
*.log
`;
      await fs.writeFile(gitignorePath, gitignoreContent);

      const processor = new GitIgnoreProcessor(testDir);
      await processor.loadFromFile('.gitignore');

      const patterns = processor.getPatterns();
      assert.deepStrictEqual(patterns, ['**/node_modules', '*.log']);
    });

    it('应该跳过否定模式', async () => {
      const gitignoreContent = `
node_modules/
!node_modules/special/
*.log
`;
      await fs.writeFile(gitignorePath, gitignoreContent);

      const processor = new GitIgnoreProcessor(testDir);
      await processor.loadFromFile('.gitignore');

      const patterns = processor.getPatterns();
      assert.deepStrictEqual(patterns, ['**/node_modules', '*.log']);
    });
  });

  describe('parsePatterns', () => {
    it('应该正确处理目录模式', () => {
      const processor = new GitIgnoreProcessor(testDir);
      const content = `
node_modules/
dist/
`;
      processor['parsePatterns'](content);

      const patterns = processor.getPatterns();
      assert.deepStrictEqual(patterns, ['**/node_modules', '**/dist']);
    });

    it('应该正确处理文件扩展名模式', () => {
      const processor = new GitIgnoreProcessor(testDir);
      const content = `
*.log
*.tmp
`;
      processor['parsePatterns'](content);

      const patterns = processor.getPatterns();
      assert.deepStrictEqual(patterns, ['*.log', '*.tmp']);
    });

    it('应该处理以/开头的模式', () => {
      const processor = new GitIgnoreProcessor(testDir);
      const content = `
/node_modules
/dist
`;
      processor['parsePatterns'](content);

      const patterns = processor.getPatterns();
      assert.deepStrictEqual(patterns, ['node_modules', 'dist']);
    });

    it('应该处理包含通配符的模式', () => {
      const processor = new GitIgnoreProcessor(testDir);
      const content = `
**/node_modules
**/.vscode
`;
      processor['parsePatterns'](content);

      const patterns = processor.getPatterns();
      assert.deepStrictEqual(patterns, ['**/node_modules', '**/.vscode']);
    });
  });

  describe('shouldIgnore', () => {
    let processor: GitIgnoreProcessor;

    beforeEach(() => {
      processor = new GitIgnoreProcessor(testDir);
    });

    it('应该忽略匹配的文件', () => {
      processor.addPattern('**/*.log');
      processor.addPattern('**/node_modules');

      const logFile = path.join(testDir, 'app.log');
      const nodeModulesFile = path.join(testDir, 'node_modules', 'package.json');

      assert.strictEqual(processor.shouldIgnore(logFile), true);
      assert.strictEqual(processor.shouldIgnore(nodeModulesFile), true);
    });

    it('不应该忽略不匹配的文件', () => {
      processor.addPattern('**/*.log');
      processor.addPattern('**/node_modules');

      const textFile = path.join(testDir, 'readme.txt');
      const srcFile = path.join(testDir, 'src', 'index.ts');

      assert.strictEqual(processor.shouldIgnore(textFile), false);
      assert.strictEqual(processor.shouldIgnore(srcFile), false);
    });

    it('当文件在baseDir之外时不应该忽略', () => {
      processor.addPattern('**/*.log');

      const outsideFile = path.join('/outside', 'dir', 'app.log');
      assert.strictEqual(processor.shouldIgnore(outsideFile), false);
    });

    it('应该正确处理点文件', () => {
      processor.addPattern('**/.DS_Store');
      processor.addPattern('**/.vscode');

      const dsStoreFile = path.join(testDir, '.DS_Store');
      const vscodeFile = path.join(testDir, '.vscode', 'settings.json');

      assert.strictEqual(processor.shouldIgnore(dsStoreFile), true);
      assert.strictEqual(processor.shouldIgnore(vscodeFile), true);
    });

    it('应该正确处理目录模式', () => {
      processor.addPattern('node_modules/');
      processor.addPattern('dist/');

      const nodeModulesFile = path.join(testDir, 'node_modules', 'package.json');
      const distFile = path.join(testDir, 'dist', 'index.js');
      const srcFile = path.join(testDir, 'src', 'index.ts');

      assert.strictEqual(processor.shouldIgnore(nodeModulesFile), true);
      assert.strictEqual(processor.shouldIgnore(distFile), true);
      assert.strictEqual(processor.shouldIgnore(srcFile), false);
    });
  });

  describe('addPattern and clearPatterns', () => {
    it('应该能够添加自定义模式', () => {
      const processor = new GitIgnoreProcessor(testDir);

      processor.addPattern('custom-pattern');
      assert.deepStrictEqual(processor.getPatterns(), ['custom-pattern']);

      processor.addPattern('another-pattern');
      assert.deepStrictEqual(processor.getPatterns(), ['custom-pattern', 'another-pattern']);
    });

    it('应该能够清除所有模式', () => {
      const processor = new GitIgnoreProcessor(testDir);

      processor.addPattern('pattern1');
      processor.addPattern('pattern2');
      assert.strictEqual(processor.getPatterns().length, 2);

      processor.clearPatterns();
      assert.deepStrictEqual(processor.getPatterns(), []);
    });
  });

  describe('createGitIgnoreProcessor', () => {
    it('应该创建处理器并加载.gitignore文件', async () => {
      const gitignoreContent = `
node_modules/
*.log
`;
      await fs.writeFile(gitignorePath, gitignoreContent);

      const processor = await createGitIgnoreProcessor(testDir);
      const patterns = processor.getPatterns();

      assert.deepStrictEqual(patterns, ['**/node_modules', '*.log']);
    });
  });
});
