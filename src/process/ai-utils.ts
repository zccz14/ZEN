import { AIMetadata } from '../types';
import * as crypto from 'crypto';
import {
  getCachedMetadata as getCachedMetadataFromStore,
  cacheMetadata as cacheMetadataToStore,
  cleanupCache as cleanupCacheFromStore,
  removeOrphanEntries as removeOrphanEntriesFromStore,
} from '../metadata';

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
 * 获取默认 AI 配置
 * @returns 默认的 AI 配置
 */
export function getDefaultAIConfig(): AIConfig {
  // AI 配置现在在 services/openai.ts 中通过环境变量统一管理
  // 这里提供默认值以保持类型兼容性
  return {
    apiKey: '', // 由 services/openai.ts 管理
    baseUrl: '', // 由 services/openai.ts 管理
    model: 'gpt-3.5-turbo', // 默认模型，可由环境变量覆盖
    temperature: 0, // 总是设置为 0，提取内容不需要随机性
    maxTokens: 500, // 默认值
  };
}

/**
 * AI 总是启用
 * @returns 总是返回 true
 */
export function isAIEnabled(): boolean {
  return true;
}

/**
 * 根据文件 hash 获取缓存的 metadata
 * @param fileHash 文件哈希值
 * @param filePath 文件路径
 * @returns 缓存的 metadata，如果没有则返回 null
 */
export async function getCachedMetadata(
  fileHash: string,
  filePath: string
): Promise<AIMetadata | null> {
  return getCachedMetadataFromStore(fileHash, filePath);
}

/**
 * 缓存 metadata 到 .zen/meta.json
 * @param fileHash 文件哈希值
 * @param filePath 文件路径
 * @param metadata 要缓存的 metadata
 */
export async function cacheMetadata(
  fileHash: string,
  filePath: string,
  metadata: AIMetadata
): Promise<void> {
  return cacheMetadataToStore(fileHash, filePath, metadata);
}

/**
 * 清理过期的缓存
 * @param maxAgeDays 最大保留天数，默认 30 天
 */
export async function cleanupAICache(maxAgeDays: number = 30): Promise<void> {
  return cleanupCacheFromStore(maxAgeDays);
}

/**
 * 移除孤儿条目（文件已删除但缓存仍存在）
 * @param existingFilePaths 当前存在的文件路径列表
 */
export async function removeOrphanEntries(existingFilePaths: string[]): Promise<void> {
  return removeOrphanEntriesFromStore(existingFilePaths);
}

/**
 * 计算文件内容的 hash（纯函数）
 * @param content 文件内容
 * @returns 文件的 SHA256 哈希值
 */
export function calculateFileHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * 打印 tokens 使用情况
 * @param filePath 文件路径
 * @param tokensUsed tokens 使用情况
 */
export function logTokenUsage(filePath: string, tokensUsed: AIMetadata['tokens_used']): void {
  if (!tokensUsed) {
    return;
  }

  console.log(`🧮 Tokens usage for ${filePath}:`);
  console.log(`   Prompt: ${tokensUsed.prompt}`);
  console.log(`   Completion: ${tokensUsed.completion}`);
  console.log(`   Total: ${tokensUsed.total}`);
}

/**
 * 批量获取缓存的 metadata
 * @param fileHashes 文件哈希值和路径的数组
 * @returns 文件路径到 metadata 的映射
 */
export async function batchGetCachedMetadata(
  fileHashes: Array<{ hash: string; path: string }>
): Promise<Map<string, AIMetadata>> {
  const metadataMap = new Map<string, AIMetadata>();
  const promises = fileHashes.map(async ({ hash, path }) => {
    const metadata = await getCachedMetadata(hash, path);
    if (metadata) {
      metadataMap.set(path, metadata);
    }
  });

  await Promise.all(promises);
  return metadataMap;
}

/**
 * 批量缓存 metadata
 * @param metadataEntries metadata 条目数组
 */
export async function batchCacheMetadata(
  metadataEntries: Array<{ hash: string; path: string; metadata: AIMetadata }>
): Promise<void> {
  const promises = metadataEntries.map(({ hash, path, metadata }) =>
    cacheMetadata(hash, path, metadata)
  );
  await Promise.all(promises);
}

/**
 * 检查是否需要更新缓存
 * @param fileHash 文件哈希值
 * @param filePath 文件路径
 * @param maxAgeHours 最大缓存小时数，默认 24 小时
 * @returns 如果需要更新则返回 true，否则返回 false
 */
export async function shouldUpdateCache(
  fileHash: string,
  filePath: string,
  maxAgeHours: number = 24
): Promise<boolean> {
  const metadata = await getCachedMetadata(fileHash, filePath);
  if (!metadata) {
    return true; // 没有缓存，需要更新
  }

  // 检查缓存是否过期
  // 由于 AIMetadata 没有 timestamp 字段，我们总是返回 true 需要更新
  // 在实际应用中，可能需要修改 AIMetadata 类型或使用单独的缓存记录
  return true;
}

/**
 * 创建 AI 工具函数集合（高阶函数）
 * @param config AI 配置（可选）
 * @returns AI 工具函数集合
 */
export function createAITools(config: AIConfig = getDefaultAIConfig()) {
  return {
    getConfig: () => config,
    isEnabled: () => isAIEnabled(),
    getCachedMetadata,
    cacheMetadata,
    cleanupCache: cleanupAICache,
    removeOrphanEntries,
    calculateFileHash,
    logTokenUsage,
    batchGetCachedMetadata,
    batchCacheMetadata,
    shouldUpdateCache,
  };
}