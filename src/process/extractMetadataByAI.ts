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

  const results = await Promise.allSettled(
    files.map(async file => {
      if (!file.path.endsWith('.md')) {
        console.info(`ℹ️ Skipping ${file.path}, not a Markdown file`);
        return;
      }
      if (file.metadata && file.metadata.slug && file.metadata.short_summary) {
        console.info(`ℹ️ Skipping ${file.path}, already has metadata`);
        return;
      }
      const content = await readFile(file.path, 'utf-8');
      file.metadata = await extractMetadataFromMarkdown(file.path, content);
      console.log(`✅ Extracted AI metadata for ${file.path}`, file.metadata.tokens_used);
    })
  );

  const errors = results.filter(r => r.status === 'rejected');

  if (errors.length > 0) {
    console.warn(`⚠️ Some files failed to process.`);
    errors.forEach((err, index) => {
      console.error(
        `❌ Failed to process file ${files[index].path}`,
        (err as PromiseRejectedResult).reason
      );
    });
    throw new Error('AI metadata extraction encountered errors.');
  }

  console.log(`✅ AI processing completed for ${files.length} files`);
}
