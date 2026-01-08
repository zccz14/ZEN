import * as fs from 'fs/promises';
import * as path from 'path';
import { CZON_META_PATH } from './paths';
import { MetaDataStore } from './types';

/**
 * 全局 MetaDataStore 单例
 */
export const MetaData: MetaDataStore = {
  // 稍后覆盖
  version: '1.0.0',
  options: {},
  files: [],
};

/**
 * 从文件中读取数据，覆盖 store，但是要保持它仍然是同一个对象
 */
export async function loadMetaData(): Promise<void> {
  try {
    await fs.access(CZON_META_PATH);
    const content = await fs.readFile(CZON_META_PATH, 'utf-8');
    const newData = JSON.parse(content);

    // 使用 Object.assign 保持同一个对象引用
    Object.assign(MetaData, newData);
  } catch (error) {
    // 如果文件不存在，初始化默认值
    MetaData.version = '1.0.0';
    MetaData.files = [];
  }
}

/**
 * 将 MetaData 写入 store
 */
export async function saveMetaData(): Promise<void> {
  await fs.mkdir(path.dirname(CZON_META_PATH), { recursive: true });
  await fs.writeFile(CZON_META_PATH, JSON.stringify(MetaData, null, 2), 'utf-8');
}
