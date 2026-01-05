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
  metadata?: { title: string }; // 简化，只保留标题
  currentPath?: string;
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
  processors?: MarkdownProcessor[];
  includePattern?: string;
  excludePattern?: string;
}
