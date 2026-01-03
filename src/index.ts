export { ZenBuilder } from './builder';
export { MarkdownConverter } from './markdown';
export { TemplateEngine } from './template';
export { NavigationGenerator } from './navigation';
export type {
  BuildOptions,
  FileInfo,
  NavigationItem,
  TemplateData,
  MarkdownProcessor,
  ZenConfig
} from './types';

/**
 * ZEN 文档构建工具
 *
 * 一个极简主义的 Markdown 文档站点生成器
 *
 * @example
 * ```typescript
 * import { ZenBuilder } from 'zengen';
 *
 * const builder = new ZenBuilder();
 * await builder.build({
 *   srcDir: './docs',
 *   outDir: './dist'
 * });
 * ```
 */
import { ZenBuilder } from './builder';
import { MarkdownConverter } from './markdown';
import { TemplateEngine } from './template';
import { NavigationGenerator } from './navigation';

export default {
  Builder: ZenBuilder,
  MarkdownConverter: MarkdownConverter,
  TemplateEngine: TemplateEngine,
  NavigationGenerator: NavigationGenerator
};