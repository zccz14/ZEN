---
name: article-summarizer
description: 'Guide for generating multi-style article summaries from Markdown files in a repository. Use when user requests article summarization, multi-perspective analysis, or content summarization with different writing styles. Triggers on keywords: article summary, markdown summary, multi-style summary, SUMMARY directory, git ls-files, 7 styles.'
---

# 文章总结器

## 概述

本skill指导代理从仓库中的Markdown文章生成全面的多风格摘要。它提供一个结构化工作流程：清空SUMMARY目录、通过git命令识别目标Markdown文件、读取所有.md文件（排除.czon）、并以7种不同写作风格生成摘要，附带正确的引用规则。

## 工作流程

### 1. 准备SUMMARY目录

首先，确保SUMMARY目录存在并清空之前的内容：

```bash
mkdir -p SUMMARY
rm -rf SUMMARY/*
```

### 2. 识别目标Markdown文件

使用以下git命令列出仓库中的所有Markdown文件（已跟踪和未跟踪），排除.czon目录中的文件：

```bash
git ls-files --others --cached --exclude-standard -z -x ".czon" | tr '\0' '\n' | grep -v ".czon" | grep ".md$"
```

将输出捕获为文件路径列表。验证每个文件存在且可读。

### 3. 读取和处理Markdown内容

对于每个Markdown文件：

- 使用`Read`工具读取完整内容
- 提取元数据：标题（第一个H1）、修改日期（git log）、字数统计
- 解析结构：标题、链接、代码块
- 注意指向其他Markdown文件的内部链接

### 4. 生成多风格摘要

在`SUMMARY/`目录中为7种风格创建单独的摘要文件。每个摘要必须严格基于Markdown文件的事实内容，不得虚构。

**风格指南：**

1. **客观中立风格**（基于事实，保持简洁，就像名片和履历一样）
   - 呈现关键事实、日期、角色、成就
   - 避免主观语言；坚持可验证的信息
   - 格式：项目符号或简短段落

2. **客观批判风格**（基于事实的批判，反思视角）
   - 基于证据识别优势和劣势
   - 提出改进领域或替代方法
   - 保持专业语气；避免人身攻击

3. **赞扬鼓励风格**（基于事实的积极强化）
   - 突出成功、创新元素、有价值的贡献
   - 以建设性的方式构建为"哪些做得好以及为什么"
   - 为未来工作提供激励视角

4. **幽默调侃风格**（轻松愉快，面向普通受众）
   - 用通俗语言解释复杂概念（"说人话"）
   - 使用温和的幽默、类比、相关例子
   - 跳过过于技术性或敏感、可能被误解的内容
   - 目标：引发会心一笑，而非嘲笑

5. **文艺感性风格**（叙事性，引发共鸣，故事驱动）
   - 创造生动的意象，情感共鸣
   - 将事实编织成引人入胜的叙事弧线
   - 旨在激发共情和连接

6. **心理分析风格**（例如，基于证据的MBTI分析）
   - 分配心理特质（如INTJ、ENFP），并提供明确推理
   - 为每个特质维度提供内容中的具体例子
   - 确保分析基于可观察的模式

7. **历史时间跨度风格**（按时间发展视角）
   - 沿时间线组织内容
   - 展示演变、转折点、随时间趋势
   - 在更广泛的历史或项目叙事中情境化

### 5. 输出格式规则

- **文件命名**: `SUMMARY/neutral.md`, `SUMMARY/critical.md`, `SUMMARY/praise.md`, `SUMMARY/humorous.md`, `SUMMARY/literary.md`, `SUMMARY/psychological.md`, `SUMMARY/historical.md`
- **头部**: 每个文件必须以以下内容开头：
  ```
  # [风格名称] 摘要
  *由AI生成于YYYY-MM-DD HH:MM UTC*
  *内容为AI生成，仅供参考*
  ```
- **引用链接**: 当引用源Markdown文件时：
  - 使用相对路径链接到具体文件：`../path/to/file.md`
  - 锚文本应该是文章的标题（第一个H1），而不是文件名
  - 确保链接有效（如有需要，使用`Read`工具测试）
  - 永远不要链接到目录——始终链接到具体的.md文件
- **权重分配**: 给予最近修改的文章更高的权重（使用git时间戳）
- **事实核查**: 跨文件交叉引用以确保一致性

### 6. 质量保证

生成所有摘要后：

- 验证没有摘要与事实源材料相矛盾
- 检查所有内部链接是否正确解析
- 确保每种风格保持其独特的语调
- 确认SUMMARY目录恰好包含7个文件

## 常见陷阱

- **虚构**: 绝不添加源Markdown文件中不存在的信息
- **链接错误**: 从SUMMARY目录链接时始终使用`../`前缀
- **风格混杂**: 保持每个摘要严格在其指定的语调范围内
- **新近度偏差**: 虽然近期文章获得更高权重，但不要忽略较旧的有价值内容
- **过度解读**: 在心理分析中，仅基于明确的证据得出结论

## 示例用户请求

- "以7种不同风格总结所有Markdown文章"
- "生成我们文档的多视角分析"
- "为我们的知识库创建文章摘要"
- "生成我们内容的幽默和严肃版本"
