import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * 使用git命令查找所有Markdown文件
 * 使用git ls-files --others --cached --exclude-standard获取所有文件
 * 然后过滤掉.czon目录和只保留.md文件
 *
 * @param dirPath 要扫描的目录路径
 * @returns Promise<string[]> 返回Markdown文件的相对路径数组
 */
export const findMarkdownEntries = async (dirPath: string): Promise<string[]> => {
  try {
    // 使用git命令获取所有文件（包括已跟踪和未跟踪的文件）
    // 在指定的目录下执行git命令
    // 使用 -z 选项以空字符分隔文件名，方便处理文件名中包含特殊字符 (UTF-8) 的情况
    const { stdout } = await execAsync('git ls-files --others --cached --exclude-standard -z', {
      cwd: dirPath,
    });

    // 按行分割并过滤
    const files = stdout
      .split('\0') // 按空字符分割文件名
      .filter(line => line.trim() !== '') // 移除空行
      .filter(file => !file.startsWith('.czon')) // 过滤掉.czon目录下的文件
      .filter(file => file.endsWith('.md')); // 只保留.md文件

    return files;
  } catch (error) {
    console.error('Error finding markdown entries:', error);

    // 如果git命令失败，返回空数组
    // 这可以处理没有git仓库或git不可用的情况
    return [];
  }
};
