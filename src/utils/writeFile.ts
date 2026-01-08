import { writeFile as _writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import { MetaData } from '../metadata';

export const writeFile = async (path: string, data: string): Promise<void> => {
  await mkdir(dirname(path), { recursive: true });
  await _writeFile(path, data, 'utf-8');
  if (MetaData.options.verbose) console.log(`✅ Wrote file: ${path}`);
};
