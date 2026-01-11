import { BinaryLike } from 'crypto';
import { writeFile as _writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import { MetaData } from '../metadata';

/**
 * Ensure directory exists and write data to file
 * @param path - file path
 * @param data - file content
 */
export const writeFile = async (path: string, data: BinaryLike): Promise<void> => {
  await mkdir(dirname(path), { recursive: true });
  await _writeFile(path, data, 'utf-8');
  if (MetaData.options.verbose) console.log(`✅ Wrote file: ${path}`);
};
