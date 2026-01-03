# API 文档

ZEN 提供了简单易用的 API 来构建文档站点。

## 核心 API

### `build(options: BuildOptions): Promise<void>`

构建文档站点的主要函数。

**参数:**
- `options.srcDir`: 源 Markdown 文件目录
- `options.outDir`: 输出 HTML 文件目录
- `options.template?`: 自定义模板路径（可选）
- `options.i18n?`: 多语言配置（可选）

**示例:**
```typescript
import { build } from 'zengen';

await build({
  srcDir: './docs',
  outDir: './dist',
  template: './custom-template.html'
});
```

### `generateNavigation(files: string[]): NavigationItem[]`

生成导航结构。

**参数:**
- `files`: Markdown 文件路径数组

**返回:**
导航项数组，包含标题、路径和子项。

## 配置选项

### BuildOptions 接口

```typescript
interface BuildOptions {
  srcDir: string;
  outDir: string;
  template?: string;
  i18n?: {
    sourceLang: string;
    targetLangs: string[];
    apiKey?: string;
  };
  includePattern?: string;
  excludePattern?: string;
}
```

## 插件系统

ZEN 支持插件扩展功能：

### 自定义处理器

```typescript
interface MarkdownProcessor {
  beforeParse?(content: string): string;
  afterParse?(html: string, metadata: any): string;
}

// 注册处理器
zen.registerProcessor('my-processor', {
  beforeParse(content) {
    // 预处理 Markdown
    return content;
  }
});
```

### 自定义模板引擎

```typescript
interface TemplateEngine {
  render(template: string, data: any): string;
}

// 注册模板引擎
zen.registerTemplateEngine('handlebars', {
  render(template, data) {
    // 渲染模板
    return rendered;
  }
});
```