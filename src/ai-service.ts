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
import { completeMessages } from './services/openai';

/**
 * AI 服务配置（简化版）
 * 所有 AI 配置现在通过环境变量在 services/openai.ts 中管理
 * 保留接口以保持类型兼容性
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

  constructor() {
    // AI 配置现在在 services/openai.ts 中通过环境变量统一管理
    // 这里提供默认值以保持类型兼容性
    this.config = {
      apiKey: '', // 由 services/openai.ts 管理
      baseUrl: '', // 由 services/openai.ts 管理
      model: 'gpt-3.5-turbo', // 默认模型，可由环境变量覆盖
      temperature: 0, // 总是设置为 0，提取内容不需要随机性
      maxTokens: 500, // 默认值
    };
  }

  /**
   * 获取配置
   */
  getConfig(): AIConfig {
    return this.config;
  }

  /**
   * AI 总是启用
   */
  isEnabled(): boolean {
    return true;
  }

  /**
   * 根据文件 hash 获取缓存的 metadata
   */
  async getCachedMetadata(fileHash: string, filePath: string): Promise<AIMetadata | null> {
    return getCachedMetadataFromStore(fileHash, filePath);
  }

  /**
   * 缓存 metadata 到 .zen/meta.json
   */
  async cacheMetadata(fileHash: string, filePath: string, metadata: AIMetadata): Promise<void> {
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
