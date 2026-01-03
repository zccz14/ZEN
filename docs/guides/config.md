# 配置指南

ZEN 的设计理念是极简主义，因此配置非常简单。

## 命令行使用

### 基本命令

```bash
# 构建文档（推荐使用方式）
npx zengen build

# 实时预览（监听文件变化）
npx zengen build --watch

# 启动开发服务器（需要 --watch）
npx zengen build --watch --serve

# 自定义端口
npx zengen build --watch --serve --port 8080

# 使用配置文件
npx zengen build --config zen.config.json

# 清理输出目录
npx zengen build --clean

# 显示详细日志
npx zengen build --verbose

# 设置基础 URL
npx zengen build --base-url /my-docs

# 查看帮助
npx zengen
```

**重要说明：**
- ZEN 强制使用当前目录作为源目录，输出到 `.zen/dist` 目录
- 不再支持通过命令行参数指定源目录和输出目录
- 使用 `--watch` 模式时，修改文件会自动重建

### 命令行选项

| 选项 | 简写 | 描述 | 默认值 |
|------|------|------|--------|
| `--watch` | `-w` | 监听文件变化并自动重建 | `false` |
| `--serve` | `-s` | 启动开发服务器（需要 `--watch`） | `false` |
| `--port` | `-p` | 开发服务器端口 | `3000` |
| `--host` | | 开发服务器主机 | `localhost` |
| `--template` | `-t` | 自定义模板文件路径 | 内置模板 |
| `--config` | `-c` | 配置文件路径 | 无 |
| `--verbose` | `-v` | 显示详细日志 | `false` |
| `--clean` | | 清理输出目录 | `false` |
| `--base-url` | | 站点基础 URL | 无 |
| `--help` | `-h` | 显示帮助信息 | 无 |

## 配置文件

### 配置文件格式

在项目根目录创建 `zen.config.json` 文件：

```json
{
  "template": "./custom-template.html",
  "baseUrl": "/my-docs",
  "i18n": {
    "sourceLang": "zh-CN",
    "targetLangs": ["en-US", "ja-JP"],
    "apiKey": "your-openai-api-key"
  },
  "includePattern": "**/*.md",
  "excludePattern": "**/_*.md"
}
```

### 配置项说明

#### `template`
- **类型**: `string`
- **描述**: 自定义模板文件路径
- **示例**: `"./templates/custom.html"`

#### `baseUrl`
- **类型**: `string`
- **描述**: 站点基础 URL，用于生成绝对路径
- **示例**: `"/docs"`, `"/my-project"`

#### `i18n`
- **类型**: `object`
- **描述**: 多语言翻译配置
- **字段**:
  - `sourceLang`: 源语言代码（如 `"zh-CN"`）
  - `targetLangs`: 目标语言代码数组（如 `["en-US", "ja-JP"]`）
  - `apiKey`: OpenAI API 密钥（可选，从环境变量读取）

#### `includePattern`
- **类型**: `string`
- **描述**: 包含的文件模式（glob 语法）
- **默认**: `"**/*.md"`
- **示例**: `"**/*.{md,markdown}"`

#### `excludePattern`
- **类型**: `string`
- **描述**: 排除的文件模式（glob 语法）
- **默认**: 无
- **示例**: `"**/_*.md"`, `"**/node_modules/**"`

## 模板配置

### 默认模板

ZEN 使用内置的极简模板，包含：
- 响应式布局
- 代码高亮（使用 highlight.js）
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

**可用模板变量:**

| 变量 | 描述 |
|------|------|
| `{{title}}` | 页面标题 |
| `{{content}}` | 转换后的 HTML 内容 |
| `{{navigation}}` | 导航菜单 HTML |
| `{{metadata}}` | 页面元数据（JSON 字符串） |
| `{{currentPath}}` | 当前页面路径 |

### 模板位置

1. **命令行指定**: `--template ./my-template.html`
2. **配置文件指定**: `"template": "./my-template.html"`
3. **默认模板**: 内置模板

## 多语言配置

### 基本配置

```json
{
  "i18n": {
    "sourceLang": "zh-CN",
    "targetLangs": ["en-US", "ja-JP"],
    "apiKey": "sk-..."
  }
}
```

### 环境变量

也可以使用环境变量配置 API 密钥：

```bash
export OPENAI_API_KEY="sk-..."
npx zengen build
```

### 翻译文件结构

```
docs/
├── index.md           # 源文件（中文）
├── index.en-US.md     # 英文翻译（自动生成）
└── index.ja-JP.md     # 日文翻译（自动生成）
```

### 翻译流程

1. **首次构建**: 翻译所有内容
2. **增量更新**: 只翻译新增或修改的内容
3. **手动更新**: 可以直接编辑翻译文件

## 文件处理配置

### 文件过滤

```json
{
  "includePattern": "**/*.{md,markdown}",
  "excludePattern": "**/{_*,node_modules}/**"
}
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

通过 API 使用自定义处理器，配置文件不支持直接配置处理器。

## 开发服务器配置

### 基本配置

```bash
# 启动开发服务器
npx zengen build --watch --serve

# 自定义端口和主机
npx zengen build --watch --serve --port 8080 --host 0.0.0.0
```

### 服务器特性

- 自动重载：文件变化时自动刷新浏览器
- 静态文件服务：提供构建的文档站点
- 实时预览：即时查看修改效果

## 环境配置

### Node.js 版本

- **最低版本**: Node.js 16.x
- **推荐版本**: Node.js 18.x 或更高

### 内存要求

- 小型项目：~100MB
- 大型项目：~500MB（包含翻译）

### 网络要求

- 使用 AI 翻译时需要网络连接
- 纯本地构建无需网络

## 最佳实践

### 配置文件管理

1. **版本控制**: 将 `zen.config.json` 加入版本控制
2. **环境变量**: 敏感信息（如 API 密钥）使用环境变量
3. **模板分离**: 自定义模板单独存放

### 性能优化

1. **增量构建**: 使用 `--watch` 模式开发
2. **文件组织**: 合理组织文档结构
3. **缓存利用**: ZEN 会自动缓存处理结果

### 错误处理

1. **详细日志**: 使用 `--verbose` 查看详细错误信息
2. **配置验证**: ZEN 会自动验证配置
3. **错误恢复**: 构建失败时会保留上次成功的结果