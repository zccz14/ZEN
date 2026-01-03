# GitHub CI/CD 配置指南

本文档描述了如何为 zengen 项目配置 GitHub Actions 进行可信发布。

## 概述

我们配置了三个 GitHub Actions workflows：

1. **CI** (`ci.yml`) - 代码质量检查和测试
2. **Version Management** (`version.yml`) - 版本管理和自动创建 Release
3. **Publish to npm** (`publish.yml`) - 可信发布到 npm registry

## 配置步骤

### 1. 设置 npm 认证令牌

由于 npm 经典令牌已被撤销，需要使用新的认证方式：

#### 选项 A: 使用细粒度访问令牌（推荐）
1. 登录 [npmjs.com](https://www.npmjs.com)
2. 进入 Account Settings → Access Tokens
3. 点击 "Create New Token"
4. 选择 "Automation" 类型
5. 配置权限：
   - 读取和写入包
   - 绕过 2FA（用于自动化工作流）
6. 设置有效期（最长 90 天）
7. 复制生成的令牌

#### 选项 B: 使用 OIDC 可信发布
1. 确保在 GitHub 仓库设置中启用了 OIDC
2. 配置 npm 以信任 GitHub Actions 的 OIDC 令牌

### 2. 配置 GitHub Actions 权限

确保仓库有以下权限设置：
- Settings → Actions → General
- Workflow permissions: 选择 "Read and write permissions"
- 确保启用了 OIDC 支持

**注意**：对于 npm OIDC 发布，不需要配置 `NPM_TOKEN` secret。GitHub Actions 会自动使用 OIDC 令牌进行认证。


## 工作流程

### CI 流程
1. 当有 push 到 main 分支或创建 PR 时触发
2. 在多个 Node.js 版本上运行测试
3. 执行代码质量检查
4. 构建包并验证

### 版本管理流程
1. 当 package.json 版本变更时触发
2. 自动创建 GitHub Release
3. 生成基于提交历史的 changelog

### 发布流程
1. 当创建 GitHub Release 时触发
2. 使用 OIDC 进行可信认证
3. 构建并发布到 npm
4. 生成来源证明（provenance）

## 手动发布

如果需要手动发布：

1. 更新 `package.json` 中的版本号
2. 提交并推送到 main 分支
3. 版本管理 workflow 会自动创建 Release
4. 发布 workflow 会自动发布到 npm

或者使用 workflow_dispatch：
1. 前往 Actions → Publish to npm
2. 点击 "Run workflow"
3. 选择分支并运行

## 安全注意事项

1. **令牌安全**：
   - 永远不要在代码中硬编码令牌
   - 使用 GitHub Secrets 存储敏感信息
   - 定期轮换令牌

2. **OIDC 优势**：
   - 消除长期令牌的管理
   - 自动化的短期会话令牌
   - 更好的安全审计

3. **来源证明**：
   - 使用 `--provenance` 标志发布
   - 验证包的构建环境和来源
   - 增加用户信任

## 故障排除

### 常见问题

1. **认证失败**：
   - 确保仓库启用了 OIDC 支持
   - 检查 workflow 中设置了 `permissions: id-token: write`
   - 验证 npm 版本是否支持 OIDC（需要 npm 9.0.0+）

2. **版本检测失败**：
   - 确保 `fetch-depth: 0` 以获取完整历史
   - 检查 package.json 格式是否正确

3. **构建失败**：
   - 检查 Node.js 版本兼容性
   - 验证 TypeScript 配置
   - 确保所有依赖项已安装

### 调试
- 查看 GitHub Actions 日志
- 启用调试日志：在仓库 Settings → Actions → Runner 中设置 secret `ACTIONS_STEP_DEBUG` 为 `true`

## 相关链接

- [npm 认证变更公告](https://github.blog/changelog/2025-12-09-npm-classic-tokens-revoked-session-based-auth-and-cli-token-management-now-available/)
- [GitHub Actions npm 发布文档](https://docs.github.com/en/actions/publishing-packages/publishing-nodejs-packages)
- [npm 可信发布文档](https://docs.npmjs.com/trusted-publishing-with-oidc)