import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { AIMetadata, FileInfo } from './types';
import { AIService } from './ai-service';
import { completeMessages, OpenAIMessage } from './services/openai';
import { translateMarkdown } from './ai/translateMarkdown';

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
 * 翻译服务配置
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
 * 翻译服务类
 */
export class TranslationService {
  private config: TranslationConfig;
  private aiService: AIService;
  private translationCachePath: string;

  constructor(config: Partial<TranslationConfig> = {}) {
    // 从环境变量读取配置
    const apiKey = process.env.OPENAI_API_KEY || '';
    const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

    // 配置优先级：构造函数参数 > 环境变量 > 默认值
    const model = config.model || process.env.OPENAI_MODEL || 'gpt-3.5-turbo';

    this.config = {
      enabled: config.enabled ?? apiKey !== '',
      apiKey,
      baseUrl,
      model,
      temperature: 0, // 总是设置为 0，翻译不需要随机性
      maxTokens: config.maxTokens || 2000,
    };

    this.aiService = new AIService();
    this.translationCachePath = path.join(process.cwd(), '.zen', 'translations.json');
  }

  /**
   * 检查是否启用翻译功能
   */
  isEnabled(): boolean {
    const enabled = this.config.enabled && this.config.apiKey !== '';
    if (!enabled && this.config.enabled) {
      console.warn(
        '⚠️ Translation is enabled but API key is missing. Please set OPENAI_API_KEY environment variable.'
      );
    }
    return enabled;
  }

  /**
   * 加载翻译缓存
   */
  async loadTranslationCache(): Promise<TranslationCache[]> {
    try {
      await fs.access(this.translationCachePath);
      const content = await fs.readFile(this.translationCachePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      // 如果文件不存在，返回空数组
      return [];
    }
  }

  /**
   * 保存翻译缓存
   */
  async saveTranslationCache(cache: TranslationCache[]): Promise<void> {
    // 确保 .zen 目录存在
    const zenDir = path.dirname(this.translationCachePath);
    await fs.mkdir(zenDir, { recursive: true });

    // 保存文件
    await fs.writeFile(this.translationCachePath, JSON.stringify(cache, null, 2), 'utf-8');
  }

  /**
   * 获取缓存的翻译
   */
  async getCachedTranslation(
    sourceHash: string,
    sourceLang: string,
    targetLang: string
  ): Promise<string | null> {
    if (!this.isEnabled()) {
      return null;
    }

    try {
      const cache = await this.loadTranslationCache();
      const cachedTranslation = cache.find(
        item =>
          item.sourceHash === sourceHash &&
          item.sourceLang === sourceLang &&
          item.targetLang === targetLang
      );

      if (cachedTranslation) {
        console.log(
          `📚 Using cached translation for ${sourceHash} (${sourceLang} → ${targetLang})`
        );
        return cachedTranslation.translatedContent;
      }
    } catch (error) {
      console.warn(`⚠️ Failed to load translation cache:`, error);
    }

    return null;
  }

  /**
   * 缓存翻译结果
   */
  async cacheTranslation(
    sourceHash: string,
    sourceLang: string,
    targetLang: string,
    translatedContent: string
  ): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    try {
      const cache = await this.loadTranslationCache();

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

      await this.saveTranslationCache(cache);
      console.log(`💾 Cached translation for ${sourceHash} (${sourceLang} → ${targetLang})`);
    } catch (error) {
      console.warn(`⚠️ Failed to cache translation:`, error);
    }
  }

  /**
   * 使用AI翻译内容
   */
  async translateWithAI(content: string, sourceLang: string, targetLang: string): Promise<string> {
    if (!this.isEnabled()) {
      throw new Error('Translation service is not enabled');
    }

    return translateMarkdown(content, sourceLang, targetLang);
  }

  /**
   * 翻译文件
   */
  async translateFile(fileInfo: FileInfo, sourceLang: string, targetLang: string): Promise<string> {
    const sourceHash = fileInfo.hash || this.aiService.calculateFileHash(fileInfo.content);

    // 检查缓存
    const cachedTranslation = await this.getCachedTranslation(sourceHash, sourceLang, targetLang);
    if (cachedTranslation) {
      return cachedTranslation;
    }

    // 如果目标语言与源语言相同，直接返回原内容
    if (sourceLang === targetLang) {
      console.log(`📝 Skipping translation (same language): ${sourceLang} → ${targetLang}`);
      await this.cacheTranslation(sourceHash, sourceLang, targetLang, fileInfo.content);
      return fileInfo.content;
    }

    // 使用AI翻译
    console.log(`🌐 Translating from ${sourceLang} to ${targetLang}...`);
    const translatedContent = await this.translateWithAI(fileInfo.content, sourceLang, targetLang);

    // 缓存结果
    await this.cacheTranslation(sourceHash, sourceLang, targetLang, translatedContent);

    return translatedContent;
  }

  /**
   * 生成翻译后的文件路径
   */
  getTranslatedFilePath(originalPath: string, targetLang: string, nativeHash: string): string {
    const zenSrcDir = path.join(process.cwd(), '.zen', 'src');
    const langDir = path.join(zenSrcDir, targetLang);
    const fileName = `${nativeHash}.md`;
    return path.join(langDir, fileName);
  }

  /**
   * 确保翻译文件存在
   */
  async ensureTranslatedFile(
    fileInfo: FileInfo,
    sourceLang: string,
    targetLang: string,
    nativeHash: string
  ): Promise<string> {
    const translatedFilePath = this.getTranslatedFilePath(fileInfo.path, targetLang, nativeHash);

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
      const translatedContent = await this.translateFile(fileInfo, sourceLang, targetLang);

      // 确保目录存在
      const dirPath = path.dirname(translatedFilePath);
      await fs.mkdir(dirPath, { recursive: true });

      // 保存翻译文件
      await fs.writeFile(translatedFilePath, translatedContent, 'utf-8');

      return translatedContent;
    }
  }

  /**
   * 清理过期的翻译缓存
   */
  async cleanupCache(maxAgeDays: number = 30): Promise<void> {
    try {
      const cache = await this.loadTranslationCache();
      const cutoffTime = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
      const originalCount = cache.length;

      // 过滤掉过期的缓存
      const filteredCache = cache.filter(item => {
        const itemTime = new Date(item.lastUpdated).getTime();
        return itemTime >= cutoffTime;
      });

      const cleanedCount = originalCount - filteredCache.length;
      if (cleanedCount > 0) {
        await this.saveTranslationCache(filteredCache);
        console.log(`🧹 Cleaned ${cleanedCount} expired translation cache entries`);
      }
    } catch (error) {
      console.warn(`⚠️ Failed to cleanup translation cache:`, error);
    }
  }
}
