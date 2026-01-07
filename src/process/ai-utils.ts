import { AIMetadata } from '../types';
import * as crypto from 'crypto';
import {
  getCachedMetadata as getCachedMetadataFromStore,
  cacheMetadata as cacheMetadataToStore,
  removeOrphanEntries as removeOrphanEntriesFromStore,
} from '../metadata';

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
