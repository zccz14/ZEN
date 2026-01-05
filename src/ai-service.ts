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
 * .zen/meta.json 文件结构
 */
export interface MetaDataStore {
  version: string;
  timestamp: string;
  files: {
    [hash: string]: {
      path: string;
      metadata: AIMetadata;
      lastUpdated: string;
    };
  };
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
    return this.config.enabled && this.config.apiKey !== '';
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
        files: {},
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
      const cachedFile = metaData.files[fileHash];

      if (cachedFile && cachedFile.path === filePath) {
        console.log(`📚 Using cached AI metadata for: ${filePath}`);
        return cachedFile.metadata;
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
      metaData.files[fileHash] = {
        path: filePath,
        metadata,
        lastUpdated: new Date().toISOString(),
      };

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
      let cleanedCount = 0;

      for (const [hash, fileData] of Object.entries(metaData.files)) {
        const fileTime = new Date(fileData.lastUpdated).getTime();
        if (fileTime < cutoffTime) {
          delete metaData.files[hash];
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        await this.saveMetaData(metaData);
        console.log(`🧹 Cleaned ${cleanedCount} expired AI metadata entries`);
      }
    } catch (error) {
      console.warn(`⚠️ Failed to cleanup cache:`, error);
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
