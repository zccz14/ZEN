# 配置指南

ZEN 的设计理念是极简主义，因此配置非常简单。

## 基本配置

### 命令行参数

```bash
zengen <src-dir> --out <dist-dir> [options]
```

**可用选项:**
- `--out, -o`: 输出目录（必需）
- `--template, -t`: 自定义模板文件
- `--watch, -w`: 监听文件变化并自动重建
- `--verbose, -v`: 显示详细日志
- `--help, -h`: 显示帮助信息

### 配置文件

在项目根目录创建 `zen.config.js` 文件：

```javascript
module.exports = {
  srcDir: './docs',
  outDir: './dist',
  template: './template.html',
  i18n: {
    sourceLang: 'zh-CN',
    targetLangs: ['en-US', 'ja-JP']
  },
  plugins: [
    'zen-plugin-sitemap',
    'zen-plugin-search'
  ]
};
```

## 模板配置

### 默认模板

ZEN 使用内置的极简模板，包含：
- 响应式布局
- 代码高亮
- 导航菜单
- 深色/浅色主题切换

### 自定义模板

创建自定义模板文件 `custom-template.html`：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{title}}</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <nav class="sidebar">
    {{navigation}}
  </nav>
  <main class="content">
    {{content}}
  </main>
  <footer>
    <p>由 ZEN 生成</p>
  </footer>
</body>
</html>
```

**可用变量:**
- `{{title}}`: 页面标题
- `{{content}}`: 转换后的 HTML 内容
- `{{navigation}}`: 导航菜单 HTML
- `{{metadata}}`: 页面元数据（JSON 字符串）

## 多语言配置

### 基本配置

```javascript
// zen.config.js
module.exports = {
  i18n: {
    sourceLang: 'zh-CN',      // 源语言
    targetLangs: ['en-US'],   // 目标语言
    apiKey: process.env.OPENAI_API_KEY, // AI 翻译 API 密钥
    provider: 'openai'        // 翻译服务提供商
  }
};
```

### 翻译文件结构

```
docs/
├── index.md           # 源文件
├── index.en-US.md     # 英文翻译
└── index.ja-JP.md     # 日文翻译
```

### 增量翻译

ZEN 支持增量翻译，只会翻译新增或修改的内容：

```bash
# 首次构建，翻译所有内容
zengen ./docs --out ./dist

# 修改部分内容后，只翻译修改的部分
zengen ./docs --out ./dist --incremental
```

## 高级配置

### 文件过滤

```javascript
module.exports = {
  includePattern: '**/*.md',      // 包含的文件模式
  excludePattern: '**/_*.md',     // 排除的文件模式
  ignoreHidden: true              // 忽略隐藏文件
};
```

### 元数据提取

在 Markdown 文件顶部添加 YAML frontmatter：

```yaml
---
title: 页面标题
description: 页面描述
author: 作者名
date: 2024-01-01
tags: [文档, 教程]
---
```

### 自定义处理器

```javascript
module.exports = {
  processors: [
    {
      name: 'my-processor',
      beforeParse(content) {
        // 预处理逻辑
        return content;
      }
    }
  ]
};
```