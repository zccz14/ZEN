# API 文档

ZEN 提供了简单易用的 API 来构建文档站点。

## 核心 API

### `ZenBuilder` 类

主要的文档构建器类。

```typescript
import { ZenBuilder } from 'zengen';

const builder = new ZenBuilder(config);
```

#### 构造函数

```typescript
constructor(config: ZenConfig = {})
```

**参数:**

- `config`: 可选的配置对象

#### `build(options: BuildOptions): Promise<void>`

构建文档站点的主要方法。

**参数:**

- `options.srcDir`: 源 Markdown 文件目录
- `options.outDir`: 输出 HTML 文件目录
- `options.template?`: 自定义模板路径（可选）
- `options.watch?`: 是否监听文件变化（可选）
- `options.verbose?`: 是否显示详细日志（可选）
- `options.serve?`: 是否启动开发服务器（需要 `watch: true`）（可选）
- `options.port?`: 开发服务器端口（默认: 3000）（可选）
- `options.host?`: 开发服务器主机（默认: 'localhost'）（可选）
- `options.baseUrl?`: 站点基础 URL（可选）

**示例:**

```typescript
import { ZenBuilder } from 'zengen';

const builder = new ZenBuilder();

await builder.build({
  srcDir: './docs',
  outDir: './dist',
  template: './custom-template.html',
  verbose: true,
});
```

#### `watch(options: BuildOptions): Promise<void>`

监听文件变化并自动重建。

**参数:** 与 `build` 方法相同

**示例:**

```typescript
await builder.watch({
  srcDir: './docs',
  outDir: './dist',
  serve: true,
  port: 8080,
});
```

## 配置选项

### `BuildOptions` 接口

```typescript
interface BuildOptions {
  srcDir: string;
  outDir: string;
  template?: string;
  watch?: boolean;
  verbose?: boolean;
  serve?: boolean;
  port?: number;
  host?: string;
  baseUrl?: string;
}
```

### `ZenConfig` 接口

```typescript
interface ZenConfig {
  srcDir?: string;
  outDir?: string;
  template?: string;
  baseUrl?: string;
  i18n?: {
    sourceLang: string;
    targetLangs: string[];
    apiKey?: string;
  };
  processors?: MarkdownProcessor[];
  includePattern?: string;
  excludePattern?: string;
}
```

## 其他组件

### `MarkdownConverter`

Markdown 转换器，支持自定义处理器。

```typescript
import { MarkdownConverter } from 'zengen';

const converter = new MarkdownConverter(processors);
const html = await converter.convert(markdownContent, fileInfo);
```

### `TemplateEngine`

模板引擎，用于渲染 HTML 模板。

```typescript
import { TemplateEngine } from 'zengen';

const engine = new TemplateEngine();
const html = engine.render(templateContent, data);
```

### `NavigationGenerator`

导航生成器，自动生成站点导航结构。

```typescript
import { NavigationGenerator } from 'zengen';

const generator = new NavigationGenerator(baseUrl);
const navigation = generator.generate(files, currentPath);
```

## 插件系统

ZEN 支持通过处理器扩展功能：

### `MarkdownProcessor` 接口

```typescript
interface MarkdownProcessor {
  beforeParse?(content: string, fileInfo: FileInfo): string | Promise<string>;
  afterParse?(html: string, fileInfo: FileInfo): string | Promise<string>;
}
```

**示例:**

```typescript
const myProcessor: MarkdownProcessor = {
  beforeParse(content, fileInfo) {
    // 预处理 Markdown 内容
    return content.replace(/TODO:/g, '**TODO:**');
  },

  afterParse(html, fileInfo) {
    // 后处理 HTML 内容
    return html.replace(/<h2>/g, '<h2 class="custom">');
  },
};

const builder = new ZenBuilder({
  processors: [myProcessor],
});
```

## 类型定义

### `FileInfo`

```typescript
interface FileInfo {
  path: string;
  relativePath: string;
  name: string;
  ext: string;
  content: string;
  html?: string;
  metadata?: Record<string, any>;
}
```

### `NavigationItem`

```typescript
interface NavigationItem {
  title: string;
  path: string;
  children?: NavigationItem[];
}
```

### `TemplateData`

```typescript
interface TemplateData {
  title: string;
  content: string;
  navigation: NavigationItem[];
  metadata?: Record<string, any>;
  currentPath?: string;
}
```

## 使用示例

### 基本使用

```typescript
import { ZenBuilder } from 'zengen';

async function buildDocumentation() {
  const builder = new ZenBuilder();

  await builder.build({
    srcDir: './my-docs',
    outDir: './public',
    verbose: true,
  });

  console.log('Documentation built successfully!');
}
```

### 开发模式

```typescript
import { ZenBuilder } from 'zengen';

async function startDevServer() {
  const builder = new ZenBuilder();

  await builder.watch({
    srcDir: './docs',
    outDir: './dist',
    serve: true,
    port: 3000,
    verbose: true,
  });

  console.log('Dev server started at http://localhost:3000');
}
```

### 自定义处理器

````typescript
import { ZenBuilder } from 'zengen';

const codeBlockProcessor = {
  beforeParse(content, fileInfo) {
    // 为代码块添加行号
    return content.replace(/```(\w+)\n([\s\S]*?)```/g, (match, lang, code) => {
      const lines = code.split('\n');
      const numberedCode = lines.map((line, i) => `${i + 1}. ${line}`).join('\n');
      return `\`\`\`${lang}\n${numberedCode}\n\`\`\``;
    });
  },
};

const builder = new ZenBuilder({
  processors: [codeBlockProcessor],
});
````
