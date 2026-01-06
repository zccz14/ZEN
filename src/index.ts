// 构建管道函数
export { buildSite, buildMultiLang, watchAndBuild, serveSite, buildPipeline } from './build/pipeline';

// 扫描模块函数
export { scanMarkdownFiles, saveScanResult, isScanOutdated, batchCalculateFileHashes } from './scan/files';
export { generateNavigation, generateBreadcrumbs, generateSitemapXml, generateNavigationJson } from './scan/navigation';

// 处理模块函数
export { processMarkdownFiles, processMarkdownFile, extractTitle, applyProcessors } from './process/markdown';
export { batchProcessAI, processWithAIBeforeParse, processWithAIAfterParse, enhanceHtmlWithMetadata, createAIProcessor } from './process/ai';
export { calculateFileHash, getCachedMetadata, cacheMetadata, cleanupAICache } from './process/ai-utils';
export { callAIForMetadata, batchCallAI } from './process/ai-client';
export { renderTemplate, renderTemplateWithData, generateTemplateData, getOutputPath, saveRenderedHtml, batchRenderAndSave } from './process/template';

// 翻译模块函数
export { translateMarkdownContent, translateFile, getCachedTranslation, cacheTranslation, batchTranslateFiles, createTranslationFunctions } from './translate/index';

// 类型定义
export type {
  BuildOptions,
  MultiLangBuildOptions,
  FileInfo,
  NavigationItem,
  TemplateData,
  MarkdownProcessor,
  ZenConfig,
  ScannedFile,
  AIMetadata,
} from './types';

/**
 * ZEN 文档构建工具
 *
 * 一个极简主义的 Markdown 文档站点生成器
 *
 * @example
 * ```typescript
 * import { buildSite } from 'zengen';
 *
 * await buildSite({
 *   srcDir: './docs',
 *   outDir: './dist'
 * });
 * ```
 *
 * @example
 * ```typescript
 * import { watchAndBuild, serveSite } from 'zengen';
 *
 * // 监听模式
 * await watchAndBuild({
 *   srcDir: './docs',
 *   outDir: './dist'
 * });
 *
 * // 开发服务器
 * await serveSite({
 *   srcDir: './docs',
 *   outDir: './dist',
 *   port: 3000
 * });
 * ```
 */

// 重新导入需要的函数用于默认导出
import { buildSite, buildMultiLang, watchAndBuild, serveSite } from './build/pipeline';
import { scanMarkdownFiles, saveScanResult, isScanOutdated } from './scan/files';
import { generateNavigation } from './scan/navigation';
import { processMarkdownFiles } from './process/markdown';
import { batchProcessAI } from './process/ai';
import { renderTemplate } from './process/template';
import { translateMarkdownContent, batchTranslateFiles } from './translate/index';

export default {
  // 构建函数
  buildSite,
  buildMultiLang,
  watchAndBuild,
  serveSite,

  // 工具函数集合
  scan: {
    scanMarkdownFiles,
    saveScanResult,
    isScanOutdated,
    generateNavigation,
  },

  process: {
    processMarkdownFiles,
    batchProcessAI,
    renderTemplate,
  },

  translate: {
    translateMarkdownContent,
    batchTranslateFiles,
  },
};
