# 最佳实践

本文档介绍使用 ZEN 构建文档站点的最佳实践。

## 文件组织

### 推荐的文件结构

```
project/
├── docs/                    # 文档源文件
│   ├── index.md            # 首页
│   ├── getting-started.md  # 入门指南
│   ├── api/                # API 文档目录
│   │   ├── overview.md
│   │   ├── core-api.md
│   │   └── plugins.md
│   ├── guides/             # 指南目录
│   │   ├── installation.md
│   │   └── configuration.md
│   └── resources/          # 资源文件
│       └── images/
└── package.json
```

**注意**: ZEN 强制使用当前目录作为源目录，所以应该切换到 `docs/` 目录下运行构建命令：

```bash
cd docs
npx zengen build
```

### 命名约定

- 使用小写字母和连字符：`getting-started.md`
- 避免特殊字符和空格
- 主要页面使用简短名称：`index.md`, `api.md`
- 分类页面使用目录组织

## 写作规范

### Markdown 语法

**推荐:**
```markdown
# 一级标题
## 二级标题
### 三级标题

使用 **粗体** 和 *斜体* 强调重要内容。

- 列表项 1
- 列表项 2
  - 子列表项

1. 有序列表项 1
2. 有序列表项 2

> 引用重要的说明或提示。

`行内代码` 用于技术术语。

```javascript
// 代码块示例
console.log("Hello ZEN!");
```
```

**避免:**
- 过多的标题层级（超过 4 级）
- 复杂的表格（考虑使用简单列表替代）
- 过长的行（建议 80-100 字符换行）

### 元数据使用

在每个 Markdown 文件顶部添加 frontmatter：

```yaml
---
title: 页面标题
description: 简洁的页面描述
keywords: [关键词1, 关键词2]
author: 作者名
date: 2024-01-01
last_modified: 2024-01-15
---
```

## 多语言管理

### 翻译策略

1. **主语言优先**: 先用母语完整编写文档
2. **增量翻译**: 每次更新后只翻译修改部分
3. **术语一致**: 建立术语表保持翻译一致性
4. **人工校对**: AI 翻译后建议人工校对

### 翻译文件管理

```
docs/
├── index.zh-CN.md      # 中文源文件
├── index.en-US.md      # 英文翻译
├── api/
│   ├── overview.zh-CN.md
│   └── overview.en-US.md
└── glossary.json       # 术语表
```

### 配置示例

```json
{
  "i18n": {
    "sourceLang": "zh-CN",
    "targetLangs": ["en-US", "ja-JP"],
    "apiKey": "your-openai-api-key"
  }
}
```

## 性能优化

### 构建优化

1. **增量构建**: 使用 `--watch` 模式开发
2. **缓存利用**: ZEN 会自动缓存处理结果
3. **并行处理**: 多核 CPU 自动并行处理文件

### 开发工作流

```bash
# 开发时监听变化
cd docs
npx zengen build --watch

# 启动开发服务器
npx zengen build --watch --serve

# 生产构建
npx zengen build --clean
```

## 部署策略

### CI/CD 集成

#### GitHub Actions 示例

```yaml
name: Build and Deploy Documentation
on:
  push:
    branches: [main]
    paths:
      - 'docs/**'
      - '.github/workflows/docs.yml'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'

      - name: Build documentation
        run: |
          cd docs
          npx zengen build --clean --base-url /my-docs

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: docs/.zen/dist
```

#### 自定义部署脚本

```bash
#!/bin/bash
# deploy-docs.sh

# 切换到文档目录
cd docs

# 清理并构建
npx zengen build --clean

# 同步到服务器
rsync -avz .zen/dist/ user@server:/var/www/docs/

# 清理缓存
rm -rf .zen/cache
```

### 云部署选项

- **GitHub Pages**: 免费托管文档
- **Vercel**: 自动部署静态站点
- **Netlify**: 支持表单处理和重定向
- **AWS S3 + CloudFront**: 企业级静态托管

## 维护建议

### 定期更新

1. **内容审核**: 每月检查文档准确性
2. **链接检查**: 定期检查死链
3. **性能监控**: 监控页面加载速度
4. **用户反馈**: 收集用户反馈改进文档

### 版本控制

1. **文档版本化**: 与软件版本同步
2. **变更日志**: 记录文档更新历史
3. **回滚机制**: 支持快速回滚到旧版本

## 常见问题

### 构建速度慢

**解决方案:**
- 减少不必要的图片和资源
- 使用 `--watch` 模式进行增量开发
- 拆分大型文档为多个小文件
- 禁用不需要的处理器

### 翻译质量不高

**解决方案:**
- 提供上下文给 AI 翻译
- 建立术语表提高一致性
- 人工校对关键内容
- 调整翻译提示词

### 导航结构复杂

**解决方案:**
- 保持扁平化目录结构
- 使用清晰的标题层级
- 提供搜索功能
- 合理使用侧边栏导航

### 内存使用过高

**解决方案:**
- 减少同时处理的文件数量
- 禁用缓存（不推荐）
- 增加系统内存
- 分批处理大型文档

## 高级技巧

### 自定义模板技巧

1. **响应式设计**: 确保模板在移动设备上正常显示
2. **主题切换**: 实现深色/浅色主题
3. **代码高亮**: 集成 highlight.js 或其他高亮库
4. **搜索功能**: 添加客户端搜索

### 集成其他工具

1. **图片优化**: 使用 sharp 或 imagemin 优化图片
2. **SEO 优化**: 添加 meta 标签和结构化数据
3. **分析集成**: 集成 Google Analytics 或 Plausible
4. **CDN 加速**: 使用 CDN 加速静态资源

### 监控和日志

1. **构建日志**: 使用 `--verbose` 查看详细日志
2. **错误监控**: 设置错误监控和告警
3. **性能监控**: 监控构建时间和资源使用
4. **用户分析**: 分析文档使用情况