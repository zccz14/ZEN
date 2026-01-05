export interface BuildOptions {
  srcDir: string;
  outDir: string;
  template?: string;
  watch?: boolean;
  verbose?: boolean;
  serve?: boolean;
  port?: number;
  host?: string;
  baseUrl?: string;
  langs?: string[]; // 目标语言数组
}

export interface ScannedFile {
  path: string; // 相对路径
  name: string;
  ext: string;
  hash?: string; // 文件内容的 sha256 hash
}

export interface FileInfo {
  path: string; // 相对路径
  name: string;
  ext: string;
  content: string;
  html?: string;
  metadata?: { title: string }; // 简化，只保留标题
  hash?: string; // 文件内容的 sha256 hash
  aiMetadata?: AIMetadata; // AI 提取的元数据
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

export interface NavigationItem {
  title: string;
  path: string;
  children?: NavigationItem[];
}

export interface TemplateData {
  title: string;
  content: string;
  navigation: NavigationItem[];
  metadata?: AIMetadata; // 使用完整的 AI 元数据
  currentPath?: string;
  lang?: string; // 当前语言
  availableLangs?: string[]; // 可用的语言列表
}

export interface MarkdownProcessor {
  beforeParse?(content: string, fileInfo: FileInfo): string | Promise<string>;
  afterParse?(html: string, fileInfo: FileInfo): string | Promise<string>;
}

export interface ZenConfig {
  srcDir?: string;
  outDir?: string;
  template?: string;
  baseUrl?: string;
  i18n?: {
    sourceLang: string;
    targetLangs: string[];
    apiKey?: string;
  };
  ai?: {
    enabled?: boolean;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
  processors?: MarkdownProcessor[];
  includePattern?: string;
  excludePattern?: string;
}

export interface MultiLangBuildOptions extends BuildOptions {
  langs: string[]; // 必须指定目标语言
  useMetaData?: boolean; // 是否使用 meta.json 中的元数据
  filterOrphans?: boolean; // 是否过滤孤儿文件
}
