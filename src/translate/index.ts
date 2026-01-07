import * as fs from 'fs/promises';
import * as path from 'path';
import { translateMarkdown } from '../ai/translateMarkdown';
import { calculateFileHash } from '../process/ai-utils';
import { FileInfo } from '../types';

/**
 * 翻译缓存项
 */
export interface TranslationCache {
  sourceHash: string; // 源文件hash
  sourceLang: string; // 源语言
  targetLang: string; // 目标语言
  translatedContent: string; // 翻译后的内容
  lastUpdated: string; // 最后更新时间
}

/**
 * 翻译服务配置（简化版）
 * 所有 AI 配置现在通过环境变量在 services/openai.ts 中管理
 * 保留完整接口以保持类型兼容性
 */
export interface TranslationConfig {
  enabled: boolean;
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

/**
 * 获取默认翻译配置
 * @returns 默认的翻译配置
 */
export function getDefaultTranslationConfig(): TranslationConfig {
  // AI 配置现在在 services/openai.ts 中通过环境变量统一管理
  // 翻译服务总是启用
  return {
    enabled: true, // 翻译服务总是启用
    apiKey: '', // 由 services/openai.ts 管理
    baseUrl: '', // 由 services/openai.ts 管理
    model: 'gpt-3.5-turbo', // 默认模型，可由环境变量覆盖
    temperature: 0, // 总是设置为 0，翻译不需要随机性
    maxTokens: 2000, // 默认值
  };
}

/**
 * 获取翻译缓存文件路径
 * @param cacheDir 缓存目录，默认为 .zen
 * @returns 翻译缓存文件路径
 */
export function getTranslationCachePath(cacheDir: string = '.zen'): string {
  return path.join(process.cwd(), cacheDir, 'translations.json');
}

/**
 * 加载翻译缓存
 * @param cachePath 缓存文件路径（可选）
 * @returns 翻译缓存数组
 */
export async function loadTranslationCache(cachePath?: string): Promise<TranslationCache[]> {
  const effectiveCachePath = cachePath || getTranslationCachePath();

  try {
    await fs.access(effectiveCachePath);
    const content = await fs.readFile(effectiveCachePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    // 如果文件不存在，返回空数组
    return [];
  }
}

/**
 * 保存翻译缓存
 * @param cache 翻译缓存数组
 * @param cachePath 缓存文件路径（可选）
 */
export async function saveTranslationCache(
  cache: TranslationCache[],
  cachePath?: string
): Promise<void> {
  const effectiveCachePath = cachePath || getTranslationCachePath();

  // 确保目录存在
  const cacheDir = path.dirname(effectiveCachePath);
  await fs.mkdir(cacheDir, { recursive: true });

  // 保存文件
  await fs.writeFile(effectiveCachePath, JSON.stringify(cache, null, 2), 'utf-8');
}

/**
 * 获取缓存的翻译
 * @param sourceHash 源文件哈希值
 * @param sourceLang 源语言
 * @param targetLang 目标语言
 * @param cachePath 缓存文件路径（可选）
 * @returns 缓存的翻译内容，如果没有则返回 null
 */
export async function getCachedTranslation(
  sourceHash: string,
  sourceLang: string,
  targetLang: string,
  cachePath?: string
): Promise<string | null> {
  try {
    const cache = await loadTranslationCache(cachePath);
    const cachedTranslation = cache.find(
      item =>
        item.sourceHash === sourceHash &&
        item.sourceLang === sourceLang &&
        item.targetLang === targetLang
    );

    if (cachedTranslation) {
      console.log(`📚 Using cached translation for ${sourceHash} (${sourceLang} → ${targetLang})`);
      return cachedTranslation.translatedContent;
    }
  } catch (error) {
    console.warn(`⚠️ Failed to load translation cache:`, error);
  }

  return null;
}

/**
 * 缓存翻译结果
 * @param sourceHash 源文件哈希值
 * @param sourceLang 源语言
 * @param targetLang 目标语言
 * @param translatedContent 翻译后的内容
 * @param cachePath 缓存文件路径（可选）
 */
export async function cacheTranslation(
  sourceHash: string,
  sourceLang: string,
  targetLang: string,
  translatedContent: string,
  cachePath?: string
): Promise<void> {
  try {
    const cache = await loadTranslationCache(cachePath);

    // 查找是否已存在相同翻译
    const existingIndex = cache.findIndex(
      item =>
        item.sourceHash === sourceHash &&
        item.sourceLang === sourceLang &&
        item.targetLang === targetLang
    );

    if (existingIndex >= 0) {
      // 更新现有缓存
      cache[existingIndex] = {
        sourceHash,
        sourceLang,
        targetLang,
        translatedContent,
        lastUpdated: new Date().toISOString(),
      };
    } else {
      // 添加新缓存
      cache.push({
        sourceHash,
        sourceLang,
        targetLang,
        translatedContent,
        lastUpdated: new Date().toISOString(),
      });
    }

    await saveTranslationCache(cache, cachePath);
    console.log(`💾 Cached translation for ${sourceHash} (${sourceLang} → ${targetLang})`);
  } catch (error) {
    console.warn(`⚠️ Failed to cache translation:`, error);
  }
}

/**
 * 使用AI翻译内容
 * @param content 要翻译的内容
 * @param sourceLang 源语言
 * @param targetLang 目标语言
 * @returns 翻译后的内容
 */
export async function translateMarkdownContent(
  content: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  return translateMarkdown(content, sourceLang, targetLang);
}

/**
 * 翻译文件
 * @param fileInfo 文件信息
 * @param sourceLang 源语言
 * @param targetLang 目标语言
 * @param cachePath 缓存文件路径（可选）
 * @returns 翻译后的内容
 */
export async function translateFile(
  fileInfo: FileInfo,
  sourceLang: string,
  targetLang: string,
  cachePath?: string
): Promise<string> {
  const sourceHash = fileInfo.hash || calculateFileHash(fileInfo.content);

  // 检查缓存
  const cachedTranslation = await getCachedTranslation(
    sourceHash,
    sourceLang,
    targetLang,
    cachePath
  );
  if (cachedTranslation) {
    return cachedTranslation;
  }

  // 如果目标语言与源语言相同，直接返回原内容
  if (sourceLang === targetLang) {
    console.log(`📝 Skipping translation (same language): ${sourceLang} → ${targetLang}`);
    await cacheTranslation(sourceHash, sourceLang, targetLang, fileInfo.content, cachePath);
    return fileInfo.content;
  }

  // 使用AI翻译
  console.log(`🌐 Translating from ${sourceLang} to ${targetLang}...`);
  const translatedContent = await translateMarkdownContent(
    fileInfo.content,
    sourceLang,
    targetLang
  );

  // 缓存结果
  await cacheTranslation(sourceHash, sourceLang, targetLang, translatedContent, cachePath);

  return translatedContent;
}

/**
 * 生成翻译后的文件路径
 * @param originalPath 原始文件路径
 * @param targetLang 目标语言
 * @param nativeHash 原生哈希值
 * @param baseDir 基础目录，默认为 .zen
 * @returns 翻译后的文件路径
 */
export function getTranslatedFilePath(
  originalPath: string,
  targetLang: string,
  nativeHash: string,
  baseDir: string = '.zen'
): string {
  const zenSrcDir = path.join(process.cwd(), baseDir, 'src');
  const langDir = path.join(zenSrcDir, targetLang);
  const fileName = `${nativeHash}.md`;
  return path.join(langDir, fileName);
}

/**
 * 确保翻译文件存在
 * @param fileInfo 文件信息
 * @param sourceLang 源语言
 * @param targetLang 目标语言
 * @param nativeHash 原生哈希值
 * @param cachePath 缓存文件路径（可选）
 * @param baseDir 基础目录，默认为 .zen
 * @returns 翻译后的内容
 */
export async function ensureTranslatedFile(
  fileInfo: FileInfo,
  sourceLang: string,
  targetLang: string,
  nativeHash: string,
  cachePath?: string,
  baseDir: string = '.zen'
): Promise<string> {
  const translatedFilePath = getTranslatedFilePath(fileInfo.path, targetLang, nativeHash, baseDir);

  try {
    // 检查文件是否已存在
    await fs.access(translatedFilePath);
    console.log(`📄 Translation file already exists: ${translatedFilePath}`);

    // 读取现有内容
    const existingContent = await fs.readFile(translatedFilePath, 'utf-8');
    return existingContent;
  } catch (error) {
    // 文件不存在，需要翻译
    console.log(`🔄 Creating translation file: ${translatedFilePath}`);

    // 翻译内容
    const translatedContent = await translateFile(fileInfo, sourceLang, targetLang, cachePath);

    // 确保目录存在
    const dirPath = path.dirname(translatedFilePath);
    await fs.mkdir(dirPath, { recursive: true });

    // 保存翻译文件
    await fs.writeFile(translatedFilePath, translatedContent, 'utf-8');

    return translatedContent;
  }
}

/**
 * 批量翻译文件
 * @param files 文件信息数组
 * @param sourceLang 源语言
 * @param targetLang 目标语言
 * @param cachePath 缓存文件路径（可选）
 * @returns 文件路径到翻译内容的映射
 */
export async function batchTranslateFiles(
  files: FileInfo[],
  sourceLang: string,
  targetLang: string,
  cachePath?: string
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  console.log(`🌐 Batch translating ${files.length} files from ${sourceLang} to ${targetLang}...`);

  for (const fileInfo of files) {
    try {
      const translatedContent = await translateFile(fileInfo, sourceLang, targetLang, cachePath);
      results.set(fileInfo.path, translatedContent);
      console.log(`✅ Translated: ${fileInfo.path}`);
    } catch (error) {
      console.error(`❌ Failed to translate ${fileInfo.path}:`, error);
      // 即使翻译失败，也保留原始内容
      results.set(fileInfo.path, fileInfo.content);
    }
  }

  return results;
}
