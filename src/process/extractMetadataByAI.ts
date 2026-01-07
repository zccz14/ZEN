import { readFile } from 'fs/promises';
import { extractMetadataFromMarkdown } from '../ai/extractMetadataFromMarkdown';
import { MetaData } from '../metadata';

/**
 * 运行 AI 元数据提取
 */
export async function extractMetadataByAI(): Promise<void> {
  const { files } = MetaData;

  if (MetaData.options.verbose) console.log(`🤖 Running AI metadata extraction...`);
  console.log(`🤖 Processing ${files.length} files with AI...`);

  await Promise.all(
    files.map(async file => {
      try {
        if (file.metadata) {
          console.info(`ℹ️ Skipping ${file.path}, already has metadata`);
          return;
        }
        const content = await readFile(file.path, 'utf-8');
        file.metadata = await extractMetadataFromMarkdown(content);
        console.log(`✅ Extracted AI metadata for ${file.path}`, file.metadata.tokens_used);
      } catch (error) {
        console.error(`⚠️ Failed to process file ${file.path}:`, error);
      }
    })
  );

  console.log(`✅ AI processing completed for ${files.length} files`);
}
