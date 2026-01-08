/**
 * 单个文件的元数据缓存项
 */
export interface FileMetaData {
  hash: string;
  path: string;
  links: string[];
  metadata?: AIMetadata;
}

/**
 * .zen/meta.json 文件结构
 */
export interface MetaDataStore {
  version: string;
  options: BuildOptions;
  files: FileMetaData[];
}

export interface BuildOptions {
  template?: string;
  verbose?: boolean;
  langs?: string[]; // 目标语言数组
}

export interface AIMetadata {
  title: string; // AI 提取的标题
  summary: string; // AI 提取的摘要，控制在 100字以内
  tags: string[]; // AI 提取的关键字
  inferred_date?: string; // 正文中隐含的文档创建日期，没有就留空
  inferred_lang: string; // 文章使用的语言，例如 zh-Hans 或者 en-US
  tokens_used?: {
    prompt: number;
    completion: number;
    total: number;
  }; // tokens 使用情况
}
