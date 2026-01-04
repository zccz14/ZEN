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

export interface FileInfo {
  path: string;
  relativePath: string;
  name: string;
  ext: string;
  content: string;
  html?: string;
  metadata?: {
    title: string;
    lastUpdated?: string;
    readingTime?: number;
    version?: string;
    buildDate?: string;
    [key: string]: any;
  };
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
  metadata?: {
    title: string;
    lastUpdated?: string;
    readingTime?: number;
    version?: string;
    buildDate?: string;
    [key: string]: any;
  };
  currentPath?: string;
  prevLink?: string;
  nextLink?: string;
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
