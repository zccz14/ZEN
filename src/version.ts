import { readFileSync } from 'fs';
import path from 'path';

// 获取版本号 - 从 package.json 读取
function getVersion(): string {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  return packageJson.version;
}

export const CZON_VERSION = getVersion();
