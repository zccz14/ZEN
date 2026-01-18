/**
 * 单个文件的元数据缓存项
 */
export interface FileMetaData {
  hash: string;
  path: string;
  links: string[];
  metadata?: AIMetadata;
  /**
   * AI 提取的类别标签
   */
  category?: string;
  /**
   * 记录翻译所用的(增强后)母语文件的哈希值
   */
  nativeMarkdownHash?: string;

  /**
   * 翻译信息
   * lang -> translation metadata 映射
   */
  translations?: Record<string, { content_length?: number; token_used?: any }>;
}

/**
 * .czon/meta.json 文件结构
 */
export interface MetaDataStore {
  version: string;
  options: BuildOptions;
  files: FileMetaData[];
}

export interface BuildOptions {
  verbose?: boolean;
  langs?: string[]; // 目标语言数组
}

export interface AIMetadata {
  title: string; // AI 提取的标题
  description: string; // AI 提取的简短描述，控制在 100字以内
  summary: string; // AI 提取的摘要，控制在 300字以内
  short_summary: string; // AI 提取的超短摘要，控制在 2-3 句话
  key_points: string[]; // 文章的关键要点列表
  audience: string; // 目标读者描述
  slug: string; // AI 提取的 URL 友好别名
  tags: string[]; // AI 提取的关键字
  inferred_date?: string; // 正文中隐含的文档创建日期，没有就留空
  inferred_lang: string; // 文章使用的语言，例如 zh-Hans 或者 en-US
  tokens_used?: {
    prompt: number;
    completion: number;
    total: number;
  }; // tokens 使用情况
}

/**
 * SSG 渲染上下文
 */
export interface IRenderContext {
  path: string;
  /**
   * 全站数据
   */
  site: MetaDataStore;
  /**
   * 全站文档列表
   */
  contents: Array<{
    lang: string;
    hash: string;
    /**
     * 渲染后的 HTML 内容
     */
    body: string;
    /**
     * YAML Frontmatter 数据
     */
    frontmatter: any;
  }>;
}
