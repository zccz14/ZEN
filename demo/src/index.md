# ZEN 文档站点示例

欢迎使用 ZEN 文档构建工具！这是一个极简主义的 Markdown 文档站点生成器。

## 特性

- **极简配置**: 无需复杂的配置文件
- **内容优先**: 专注于写作，而不是工具配置
- **智能导航**: 自动生成站点地图和导航
- **多语言支持**: 支持增量 i18n 翻译

## 快速开始

```bash
# 安装 zengen
npm install -g zengen

# 构建文档
zengen ./docs --out ./dist
```

## 代码示例

```javascript
// 这是一个 JavaScript 示例
const zen = require('zengen');

async function buildDocs() {
  await zen.build({
    srcDir: './docs',
    outDir: './dist'
  });
}
```

```python
# 这是一个 Python 示例
def hello_world():
    print("Hello from ZEN!")
```

## 下一步

1. 阅读 [API 文档](./api.md)
2. 查看 [配置指南](./config.md)
3. 学习 [最佳实践](./best-practices.md)