import { MarkdownProcessor, FileInfo, ZenConfig } from './types';
import { AIService } from './ai-service';
import { AIClient } from './ai-client';

/**
 * AI 处理器 - 集成到 Markdown 处理流程中
 */
export class AIProcessor implements MarkdownProcessor {
  private aiService: AIService;
  private aiClient: AIClient;
  private enabled: boolean;

  constructor(config: ZenConfig = {}) {
    // 从配置和环境变量初始化 AI 服务
    const aiConfig = {
      model: config.ai?.model,
      temperature: config.ai?.temperature,
      maxTokens: config.ai?.maxTokens,
    };

    this.aiService = new AIService(aiConfig);
    this.aiClient = new AIClient(this.aiService);
    this.enabled = true; // AI 总是启用

    console.log('🤖 AI processor initialized');
    console.log(`   Model: ${this.aiService.getConfig().model}`);
    console.log(`   Base URL: ${this.aiService.getConfig().baseUrl}`);
  }

  /**
   * 在解析前处理 - 这里我们提取 AI metadata
   */
  async beforeParse(content: string, fileInfo: FileInfo): Promise<string> {
    if (!fileInfo.hash) {
      console.warn(`⚠️ Skipping AI processing for ${fileInfo.path}: file hash is missing`);
      return content;
    }

    try {
      // 检查缓存
      const cachedMetadata = await this.aiService.getCachedMetadata(fileInfo.hash, fileInfo.path);
      if (cachedMetadata) {
        fileInfo.aiMetadata = cachedMetadata;
        this.logMetadata(fileInfo.path, cachedMetadata);
        return content;
      }

      // 调用 AI 提取 metadata
      const metadata = await this.aiClient.extractMetadata(content, fileInfo.path);
      if (metadata) {
        fileInfo.aiMetadata = metadata;

        // 缓存结果
        await this.aiService.cacheMetadata(fileInfo.hash, fileInfo.path, metadata);

        this.logMetadata(fileInfo.path, metadata);
      }
    } catch (error) {
      console.error(`❌ AI processor failed for ${fileInfo.path}:`, error);
    }

    return content;
  }

  /**
   * 在解析后处理 - 这里可以添加 AI 增强的 HTML 内容
   */
  async afterParse(html: string, fileInfo: FileInfo): Promise<string> {
    if (!fileInfo.aiMetadata) {
      return html;
    }

    try {
      // 可以在这里添加 AI metadata 到 HTML 中
      // 例如：添加 meta 标签或结构化数据
      return this.enhanceHtmlWithMetadata(html, fileInfo);
    } catch (error) {
      console.error(`❌ Failed to enhance HTML with AI metadata for ${fileInfo.path}:`, error);
      return html;
    }
  }

  /**
   * 将 AI metadata 添加到 HTML 中
   */
  private enhanceHtmlWithMetadata(html: string, fileInfo: FileInfo): string {
    const metadata = fileInfo.aiMetadata;
    if (!metadata) {
      return html;
    }

    // 在 head 部分添加 meta 标签
    const metaTags = `
<!-- AI Generated Metadata -->
<meta name="ai-title" content="${this.escapeHtml(metadata.title)}">
<meta name="ai-summary" content="${this.escapeHtml(metadata.summary)}">
<meta name="ai-tags" content="${this.escapeHtml(metadata.tags.join(', '))}">
${metadata.inferred_date ? `<meta name="ai-inferred-date" content="${metadata.inferred_date}">` : ''}
<meta name="ai-language" content="${metadata.inferred_lang}">
`;

    // 在 body 开始处添加结构化数据
    const structuredData = `
<!-- AI Structured Data -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "${this.escapeJson(metadata.title)}",
  "description": "${this.escapeJson(metadata.summary)}",
  "keywords": "${this.escapeJson(metadata.tags.join(', '))}",
  "inLanguage": "${metadata.inferred_lang}"
}
</script>
`;

    // 插入 meta 标签到 head
    const headEndIndex = html.indexOf('</head>');
    if (headEndIndex !== -1) {
      html = html.slice(0, headEndIndex) + metaTags + html.slice(headEndIndex);
    }

    // 插入结构化数据到 body 开始处
    const bodyStartIndex = html.indexOf('<body');
    if (bodyStartIndex !== -1) {
      const bodyTagEndIndex = html.indexOf('>', bodyStartIndex) + 1;
      html = html.slice(0, bodyTagEndIndex) + structuredData + html.slice(bodyTagEndIndex);
    }

    return html;
  }

  /**
   * 转义 HTML 特殊字符
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * 转义 JSON 字符串
   */
  private escapeJson(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }

  /**
   * 记录 metadata 信息
   */
  private logMetadata(filePath: string, metadata: any): void {
    console.log(`📊 AI metadata for ${filePath}:`);
    console.log(`   Title: ${metadata.title}`);
    console.log(`   Summary: ${metadata.summary.substring(0, 50)}...`);
    console.log(`   Tags: ${metadata.tags.join(', ')}`);
    if (metadata.inferred_date) {
      console.log(`   Inferred Date: ${metadata.inferred_date}`);
    }
    console.log(`   Language: ${metadata.inferred_lang}`);
  }

  /**
   * 批量处理文件
   */
  async processBatch(files: FileInfo[]): Promise<void> {
    console.log(`🤖 Processing ${files.length} files with AI...`);

    const filesToProcess = files.filter(file => file.hash && !file.aiMetadata);
    if (filesToProcess.length === 0) {
      console.log('📚 All files already have AI metadata or no files to process');
      return;
    }

    // 准备数据
    const fileData = filesToProcess.map(file => ({
      content: file.content,
      path: file.path,
      hash: file.hash!,
    }));

    // 批量处理
    const results = await this.aiClient.processFiles(fileData);

    // 更新文件信息
    for (const file of filesToProcess) {
      const metadata = results.get(file.path);
      if (metadata) {
        file.aiMetadata = metadata;
      }
    }

    console.log(`✅ AI processing completed for ${results.size} files`);
  }

  /**
   * 清理缓存
   */
  async cleanupCache(maxAgeDays: number = 30): Promise<void> {
    await this.aiService.cleanupCache(maxAgeDays);
  }

  /**
   * 检查是否启用
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * 获取配置信息
   */
  getConfigInfo(): string {
    const config = this.aiService.getConfig();
    return `AI Processor Status: Enabled
API Key: ${config.apiKey ? 'Set' : 'Not set'}
Base URL: ${config.baseUrl}
Model: ${config.model}
Temperature: ${config.temperature}
Max Tokens: ${config.maxTokens}`;
  }
}
