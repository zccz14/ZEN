import { AIMetadata } from './types';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * AI 服务配置
 */
export interface AIConfig {
  enabled: boolean;
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

/**
 * 单个文件的元数据缓存项
 */
export interface FileMetaData {
  hash: string;
  path: string;
  metadata: AIMetadata;
  lastUpdated: string;
}

/**
 * .zen/meta.json 文件结构
 */
export interface MetaDataStore {
  version: string;
  timestamp: string;
  files: FileMetaData[];
}

/**
 * AI 服务类
 */
export class AIService {
  private config: AIConfig;
  private metaDataPath: string;

  constructor(config: Partial<AIConfig> = {}) {
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
      temperature: 0, // 总是设置为 0，提取内容不需要随机性
      maxTokens: config.maxTokens || 500,
    };

    this.metaDataPath = path.join(process.cwd(), '.zen', 'meta.json');
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
    const enabled = this.config.enabled && this.config.apiKey !== '';
    if (!enabled && this.config.enabled) {
      console.warn(
        '⚠️ AI is enabled but API key is missing. Please set OPENAI_API_KEY environment variable.'
      );
    }
    return enabled;
  }

  /**
   * 加载 .zen/meta.json 文件
   */
  async loadMetaData(): Promise<MetaDataStore> {
    try {
      await fs.access(this.metaDataPath);
      const content = await fs.readFile(this.metaDataPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      // 如果文件不存在，返回空结构
      return {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        files: [],
      };
    }
  }

  /**
   * 保存 .zen/meta.json 文件
   */
  async saveMetaData(metaData: MetaDataStore): Promise<void> {
    // 确保 .zen 目录存在
    const zenDir = path.dirname(this.metaDataPath);
    await fs.mkdir(zenDir, { recursive: true });

    // 更新时间戳
    metaData.timestamp = new Date().toISOString();

    // 保存文件
    await fs.writeFile(this.metaDataPath, JSON.stringify(metaData, null, 2), 'utf-8');
  }

  /**
   * 根据文件 hash 获取缓存的 metadata
   */
  async getCachedMetadata(fileHash: string, filePath: string): Promise<AIMetadata | null> {
    if (!this.isEnabled()) {
      return null;
    }

    try {
      const metaData = await this.loadMetaData();
      const cachedFile = metaData.files.find(f => f.hash === fileHash);

      if (cachedFile) {
        if (cachedFile.path === filePath) {
          // 完全匹配：hash 和 path 都相同
          console.log(`📚 Using cached AI metadata for: ${filePath}`);
          return cachedFile.metadata;
        } else {
          // 文件移动情况：hash 相同但 path 不同
          // 更新缓存中的 path 为最新路径
          console.log(`🔄 File moved detected: ${cachedFile.path} -> ${filePath}`);
          await this.cacheMetadata(fileHash, filePath, cachedFile.metadata);
          return cachedFile.metadata;
        }
      }
    } catch (error) {
      console.warn(`⚠️ Failed to load cached metadata:`, error);
    }

    return null;
  }

  /**
   * 缓存 metadata 到 .zen/meta.json
   */
  async cacheMetadata(fileHash: string, filePath: string, metadata: AIMetadata): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    try {
      const metaData = await this.loadMetaData();

      // 查找是否已存在相同 hash 的缓存（文件移动情况）
      const sameHashIndex = metaData.files.findIndex(f => f.hash === fileHash);

      // 查找是否已存在相同 path 但不同 hash 的缓存（文件内容更新情况）
      const samePathIndex = metaData.files.findIndex(
        f => f.path === filePath && f.hash !== fileHash
      );

      if (sameHashIndex >= 0) {
        // 文件移动情况：相同 hash 但 path 可能不同
        // 更新现有缓存项的 path 和 metadata
        metaData.files[sameHashIndex] = {
          hash: fileHash,
          path: filePath,
          metadata,
          lastUpdated: new Date().toISOString(),
        };

        // 如果存在相同 path 但不同 hash 的旧缓存项，删除它
        if (samePathIndex >= 0 && samePathIndex !== sameHashIndex) {
          metaData.files.splice(samePathIndex, 1);
        }
      } else if (samePathIndex >= 0) {
        // 文件内容更新情况：相同 path 但 hash 不同
        // 删除旧的缓存项，添加新的
        metaData.files.splice(samePathIndex, 1);
        metaData.files.push({
          hash: fileHash,
          path: filePath,
          metadata,
          lastUpdated: new Date().toISOString(),
        });
      } else {
        // 全新的文件，添加新缓存
        metaData.files.push({
          hash: fileHash,
          path: filePath,
          metadata,
          lastUpdated: new Date().toISOString(),
        });
      }

      await this.saveMetaData(metaData);
      console.log(`💾 Cached AI metadata for: ${filePath}`);
    } catch (error) {
      console.warn(`⚠️ Failed to cache metadata:`, error);
    }
  }

  /**
   * 清理过期的缓存
   */
  async cleanupCache(maxAgeDays: number = 30): Promise<void> {
    try {
      const metaData = await this.loadMetaData();
      const cutoffTime = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
      const originalCount = metaData.files.length;

      // 过滤掉过期的缓存
      metaData.files = metaData.files.filter(fileData => {
        const fileTime = new Date(fileData.lastUpdated).getTime();
        return fileTime >= cutoffTime;
      });

      const cleanedCount = originalCount - metaData.files.length;
      if (cleanedCount > 0) {
        await this.saveMetaData(metaData);
        console.log(`🧹 Cleaned ${cleanedCount} expired AI metadata entries`);
      }
    } catch (error) {
      console.warn(`⚠️ Failed to cleanup cache:`, error);
    }
  }

  /**
   * 移除孤儿条目（文件已删除但缓存仍存在）
   * @param existingFilePaths 当前存在的文件路径列表
   */
  async removeOrphanEntries(existingFilePaths: string[]): Promise<void> {
    try {
      const metaData = await this.loadMetaData();
      const originalCount = metaData.files.length;

      // 创建现有文件路径的 Set 用于快速查找
      const existingPathsSet = new Set(existingFilePaths);

      // 过滤掉文件已经不存在的缓存条目
      metaData.files = metaData.files.filter(fileData => {
        return existingPathsSet.has(fileData.path);
      });

      const removedCount = originalCount - metaData.files.length;
      if (removedCount > 0) {
        await this.saveMetaData(metaData);
        console.log(`🗑️ Removed ${removedCount} orphan AI metadata entries`);
      }
    } catch (error) {
      console.warn(`⚠️ Failed to remove orphan entries:`, error);
    }
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
