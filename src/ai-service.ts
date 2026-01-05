import { AIMetadata } from './types';
import * as crypto from 'crypto';
import {
  MetaData,
  loadMetaData,
  saveMetaData,
  getCachedMetadata as getCachedMetadataFromStore,
  cacheMetadata as cacheMetadataToStore,
  cleanupCache as cleanupCacheFromStore,
  removeOrphanEntries as removeOrphanEntriesFromStore,
} from './metadata';

/**
 * AI 服务配置
 */
export interface AIConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

/**
 * AI 服务类
 */
export class AIService {
  private config: AIConfig;

  constructor(config: Omit<Partial<AIConfig>, 'enabled'> = {}) {
    // 从环境变量读取配置
    const apiKey = process.env.OPENAI_API_KEY || '';
    const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

    // 配置优先级：构造函数参数 > 环境变量 > 默认值
    const model = config.model || process.env.OPENAI_MODEL || 'gpt-3.5-turbo';

    this.config = {
      apiKey,
      baseUrl,
      model,
      temperature: 0, // 总是设置为 0，提取内容不需要随机性
      maxTokens: config.maxTokens || 500,
    };
  }

  /**
   * 获取配置
   */
  getConfig(): AIConfig {
    return this.config;
  }

  /**
   * 检查是否启用 AI 功能
   */
  isEnabled(): boolean {
    // AI 总是启用，但如果没有 API key 会显示警告
    if (this.config.apiKey === '') {
      console.warn(
        '⚠️ AI is enabled but API key is missing. Please set OPENAI_API_KEY environment variable.'
      );
    }
    return true; // AI 总是启用
  }

  /**
   * 根据文件 hash 获取缓存的 metadata
   */
  async getCachedMetadata(fileHash: string, filePath: string): Promise<AIMetadata | null> {
    if (!this.isEnabled()) {
      return null;
    }

    return getCachedMetadataFromStore(fileHash, filePath);
  }

  /**
   * 缓存 metadata 到 .zen/meta.json
   */
  async cacheMetadata(fileHash: string, filePath: string, metadata: AIMetadata): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    return cacheMetadataToStore(fileHash, filePath, metadata);
  }

  /**
   * 清理过期的缓存
   */
  async cleanupCache(maxAgeDays: number = 30): Promise<void> {
    return cleanupCacheFromStore(maxAgeDays);
  }

  /**
   * 移除孤儿条目（文件已删除但缓存仍存在）
   * @param existingFilePaths 当前存在的文件路径列表
   */
  async removeOrphanEntries(existingFilePaths: string[]): Promise<void> {
    return removeOrphanEntriesFromStore(existingFilePaths);
  }

  /**
   * 计算文件内容的 hash
   */
  calculateFileHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * 打印 tokens 使用情况
   */
  logTokenUsage(filePath: string, tokensUsed: AIMetadata['tokens_used']): void {
    if (!tokensUsed) {
      return;
    }

    console.log(`🧮 Tokens usage for ${filePath}:`);
    console.log(`   Prompt: ${tokensUsed.prompt}`);
    console.log(`   Completion: ${tokensUsed.completion}`);
    console.log(`   Total: ${tokensUsed.total}`);
  }
}
