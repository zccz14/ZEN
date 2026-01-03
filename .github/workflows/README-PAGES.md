# GitHub Pages 部署配置

此目录包含 ZEN 项目文档站点的 GitHub Pages 部署配置。

## 工作流程

### `pages.yml`

此工作流程会自动构建 ZEN 项目的文档站点并部署到 GitHub Pages。

**触发条件：**
- 推送到 `main` 分支（当 `demo/src/`、`package.json` 或工作流程文件发生变化时）
- 针对 `main` 分支的 Pull Request
- 手动触发

**工作流程步骤：**

1. **检出代码**：从远程分支检出代码，确保代码同步
2. **设置 Node.js**：配置 Node.js 20.x 环境
3. **安装依赖**：使用 `npm ci` 安装项目依赖
4. **构建 zengen**：构建本地 zengen 包
5. **安装 zengen**：将本地构建的 zengen 安装为全局工具
6. **测试 zengen CLI**：验证 CLI 工具正常工作
7. **构建文档站点**：使用 `zengen build demo/src --out docs-dist` 构建文档，包含自动回退机制
7. **配置 Pages**：设置 GitHub Pages
8. **上传制品**：将构建的文档站点上传为 Pages 制品
9. **部署到 GitHub Pages**：自动部署到 GitHub Pages

## 访问文档站点

部署成功后，文档站点将可通过以下 URL 访问：

```
https://[用户名].github.io/[仓库名]/
```

## 自定义配置

### 自定义域名

如果需要使用自定义域名，可以在构建步骤后添加 CNAME 文件：

```yaml
# 创建 CNAME 文件（如果需要自定义域名）
echo "docs.example.com" > docs-dist/CNAME
```

### 构建选项

当前使用的构建命令：

```bash
zengen build demo/src --out docs-dist --clean --verbose
```

可用的选项：
- `--clean`：在构建前清理输出目录
- `--verbose`：显示详细输出
- `--watch`：监听模式（不适用于 CI/CD）
- `--template`：指定自定义模板文件
- `--config`：指定配置文件

### 环境变量

工作流程使用以下环境变量：
- `GITHUB_TOKEN`：自动提供的 GitHub 令牌
- `NODE_VERSION`：Node.js 版本（默认为 20.x）

## 故障排除

### 构建失败

1. **检查 Node.js 版本**：确保使用支持的 Node.js 版本
2. **验证依赖安装**：确保 `npm ci` 成功执行
3. **检查构建输出**：查看 `zengen build` 的详细输出
4. **CLI 输出目录问题**：如果 `--out` 参数未生效，构建可能输出到 `dist` 目录而不是指定目录。工作流程包含自动检测和修复机制。

### 部署失败

1. **检查权限**：确保工作流程有正确的 Pages 写入权限
2. **验证制品**：确保 `docs-dist` 目录包含有效的 HTML 文件
3. **查看日志**：检查 GitHub Actions 日志获取详细错误信息

### 文档未更新

1. **检查触发条件**：确保修改了 `demo/src/` 目录下的文件
2. **等待部署完成**：GitHub Pages 部署可能需要几分钟
3. **清除浏览器缓存**：浏览器可能缓存了旧版本

## 手动触发

可以通过 GitHub Actions 界面手动触发部署：

1. 进入仓库的 "Actions" 标签页
2. 选择 "Deploy to GitHub Pages" 工作流程
3. 点击 "Run workflow" 按钮
4. 选择分支并运行

## 相关文件

- `demo/src/`：文档源文件（Markdown 格式）
- `package.json`：项目配置和依赖
- `src/cli.ts`：zengen CLI 工具实现
- `src/builder.ts`：文档构建器实现