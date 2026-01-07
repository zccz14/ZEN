import { AIMetadata } from './types';
import * as fs from 'fs/promises';
import * as path from 'path';

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
 * 全局 MetaDataStore 单例
 */
export const MetaData: MetaDataStore = {
  version: '1.0.0',
  timestamp: new Date().toISOString(),
  files: [],
};

/**
 * 获取 meta.json 文件路径
 */
function getMetaDataPath(): string {
  return path.join(process.cwd(), '.zen', 'meta.json');
}

/**
 * 从文件中读取数据，覆盖 store，但是要保持它仍然是同一个对象
 */
export async function loadMetaData(): Promise<void> {
  const metaDataPath = getMetaDataPath();

  try {
    await fs.access(metaDataPath);
    const content = await fs.readFile(metaDataPath, 'utf-8');
    const newData = JSON.parse(content);

    // 使用 Object.assign 保持同一个对象引用
    Object.assign(MetaData, newData);
  } catch (error) {
    // 如果文件不存在，初始化默认值
    MetaData.version = '1.0.0';
    MetaData.timestamp = new Date().toISOString();
    MetaData.files = [];
  }
}

/**
 * 将 MetaData 写入 store
 */
export async function saveMetaData(): Promise<void> {
  const metaDataPath = getMetaDataPath();

  // 确保 .zen 目录存在
  const zenDir = path.dirname(metaDataPath);
  await fs.mkdir(zenDir, { recursive: true });

  // 更新时间戳
  MetaData.timestamp = new Date().toISOString();

  // 保存文件
  await fs.writeFile(metaDataPath, JSON.stringify(MetaData, null, 2), 'utf-8');
}

/**
 * 根据文件 hash 获取缓存的 metadata
 */
export async function getCachedMetadata(
  fileHash: string,
  filePath: string
): Promise<AIMetadata | null> {
  try {
    const cachedFile = MetaData.files.find(f => f.hash === fileHash);

    if (cachedFile) {
      if (cachedFile.path === filePath) {
        // 完全匹配：hash 和 path 都相同
        console.log(`📚 Using cached AI metadata for: ${filePath}`);
        return cachedFile.metadata;
      } else {
        // 文件移动情况：hash 相同但 path 不同
        // 更新缓存中的 path 为最新路径
        console.log(`🔄 File moved detected: ${cachedFile.path} -> ${filePath}`);
        await cacheMetadata(fileHash, filePath, cachedFile.metadata);
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
export async function cacheMetadata(
  fileHash: string,
  filePath: string,
  metadata: AIMetadata
): Promise<void> {
  try {
    // 查找是否已存在相同 hash 的缓存（文件移动情况）
    const sameHashIndex = MetaData.files.findIndex(f => f.hash === fileHash);

    // 查找是否已存在相同 path 但不同 hash 的缓存（文件内容更新情况）
    const samePathIndex = MetaData.files.findIndex(f => f.path === filePath && f.hash !== fileHash);

    if (sameHashIndex >= 0) {
      // 文件移动情况：相同 hash 但 path 可能不同
      // 更新现有缓存项的 path 和 metadata
      MetaData.files[sameHashIndex] = {
        hash: fileHash,
        path: filePath,
        metadata,
        lastUpdated: new Date().toISOString(),
      };

      // 如果存在相同 path 但不同 hash 的旧缓存项，删除它
      if (samePathIndex >= 0 && samePathIndex !== sameHashIndex) {
        MetaData.files.splice(samePathIndex, 1);
      }
    } else if (samePathIndex >= 0) {
      // 文件内容更新情况：相同 path 但 hash 不同
      // 删除旧的缓存项，添加新的
      MetaData.files.splice(samePathIndex, 1);
      MetaData.files.push({
        hash: fileHash,
        path: filePath,
        metadata,
        lastUpdated: new Date().toISOString(),
      });
    } else {
      // 全新的文件，添加新缓存
      MetaData.files.push({
        hash: fileHash,
        path: filePath,
        metadata,
        lastUpdated: new Date().toISOString(),
      });
    }

    console.log(`💾 Cached AI metadata for: ${filePath}`);
  } catch (error) {
    console.warn(`⚠️ Failed to cache metadata:`, error);
  }
}

/**
 * 清理过期的缓存
 */
export async function cleanupCache(maxAgeDays: number = 30): Promise<void> {
  try {
    const cutoffTime = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
    const originalCount = MetaData.files.length;

    // 过滤掉过期的缓存
    MetaData.files = MetaData.files.filter(fileData => {
      const fileTime = new Date(fileData.lastUpdated).getTime();
      return fileTime >= cutoffTime;
    });

    const cleanedCount = originalCount - MetaData.files.length;
    if (cleanedCount > 0) {
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
export async function removeOrphanEntries(existingFilePaths: string[]): Promise<void> {
  try {
    const originalCount = MetaData.files.length;

    // 创建现有文件路径的 Set 用于快速查找
    const existingPathsSet = new Set(existingFilePaths);

    // 过滤掉文件已经不存在的缓存条目
    MetaData.files = MetaData.files.filter(fileData => {
      return existingPathsSet.has(fileData.path);
    });

    const removedCount = originalCount - MetaData.files.length;
    if (removedCount > 0) {
      console.log(`🗑️ Removed ${removedCount} orphan AI metadata entries`);
    }
  } catch (error) {
    console.warn(`⚠️ Failed to remove orphan entries:`, error);
  }
}
