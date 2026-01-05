# 高级用法

深入介绍 ZEN 的高级功能和配置选项。

## 自定义模板

ZEN 支持自定义 HTML 模板：

```bash
zengen build --src ./docs --out ./dist --template ./custom-template.html
```

## 配置选项

可以在 `.zenrc` 文件中配置：

```json
{
  "srcDir": "./docs",
  "outDir": "./dist",
  "template": "./template.html",
  "baseUrl": "https://example.com",
  "i18n": {
    "sourceLang": "zh-Hans",
    "targetLangs": ["en-US", "ja-JP"]
  }
}
```

## 插件系统

ZEN 支持插件扩展功能：

```typescript
interface MarkdownProcessor {
  beforeParse?(content: string, fileInfo: FileInfo): string | Promise<string>;
  afterParse?(html: string, fileInfo: FileInfo): string | Promise<string>;
}
```
