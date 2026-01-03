export interface BuildOptions {
  srcDir: string;
  outDir: string;
  template?: string;
  watch?: boolean;
  verbose?: boolean;
}

export interface FileInfo {
  path: string;
  relativePath: string;
  name: string;
  ext: string;
  content: string;
  html?: string;
  metadata?: Record<string, any>;
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
  metadata?: Record<string, any>;
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
  i18n?: {
    sourceLang: string;
    targetLangs: string[];
    apiKey?: string;
  };
  processors?: MarkdownProcessor[];
  includePattern?: string;
  excludePattern?: string;
}