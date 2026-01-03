# 最佳实践

本文档介绍使用 ZEN 构建文档站点的最佳实践。

## 文件组织

### 推荐的文件结构

```
project/
├── docs/                    # 文档源文件
│   ├── getting-started.md   # 入门指南
│   ├── api/                 # API 文档目录
│   │   ├── overview.md
│   │   ├── core-api.md
│   │   └── plugins.md
│   ├── guides/              # 指南目录
│   │   ├── installation.md
│   │   └── configuration.md
│   └── resources/           # 资源文件
│       └── images/
├── zen.config.js            # ZEN 配置文件
└── package.json
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

## 性能优化

### 构建优化

1. **增量构建**: 使用 `--watch` 模式开发
2. **缓存利用**: ZEN 会自动缓存处理结果
3. **并行处理**: 多核 CPU 自动并行处理文件

### 输出优化

1. **压缩 HTML**: 生产环境启用 HTML 压缩
2. **资源优化**: 图片压缩和 CSS/JS 合并
3. **CDN 部署**: 静态文件使用 CDN 加速

## 部署策略

### 本地预览

```bash
# 开发时监听变化
zengen ./docs --out ./dist --watch

# 启动本地服务器
npx serve ./dist
```

### CI/CD 集成

```yaml
# GitHub Actions 示例
name: Build and Deploy
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx zengen ./docs --out ./dist
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

### 云部署

- **Vercel**: 自动部署静态站点
- **Netlify**: 支持表单处理和重定向
- **GitHub Pages**: 免费托管文档
- **AWS S3**: 企业级静态托管

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
- 使用 `--incremental` 模式
- 拆分大型文档为多个小文件

### 翻译质量不高

**解决方案:**
- 提供上下文给 AI 翻译
- 建立术语表提高一致性
- 人工校对关键内容

### 导航结构复杂

**解决方案:**
- 保持扁平化目录结构
- 使用清晰的标题层级
- 提供搜索功能