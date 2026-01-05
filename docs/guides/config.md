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

| 选项         | 简写 | 描述                             | 默认值      |
| ------------ | ---- | -------------------------------- | ----------- |
| `--watch`    | `-w` | 监听文件变化并自动重建           | `false`     |
| `--serve`    | `-s` | 启动开发服务器（需要 `--watch`） | `false`     |
| `--port`     | `-p` | 开发服务器端口                   | `3000`      |
| `--host`     |      | 开发服务器主机                   | `localhost` |
| `--verbose`  | `-v` | 显示详细日志                     | `false`     |
| `--clean`    |      | 清理输出目录                     | `false`     |
| `--base-url` |      | 站点基础 URL                     | 无          |
| `--help`     | `-h` | 显示帮助信息                     | 无          |

