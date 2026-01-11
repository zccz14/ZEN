import { access, readFile } from 'fs/promises';
import path from 'path';
import { translateMarkdown } from '../ai/translateMarkdown';
import { MetaData } from '../metadata';
import { CZON_SRC_DIR } from '../paths';
import { sha256 } from '../utils/sha256';
import { writeFile } from '../utils/writeFile';

/**
 * 处理翻译
 */
export async function processTranslations(): Promise<void> {
  const {
    files,
    options: { langs = [], verbose },
  } = MetaData;

  await Promise.all(
    files.flatMap(async file => {
      return Promise.all(
        langs.map(async lang => {
          if (verbose) console.info(`📄 Processing file for translation: ${file.path}`);
          if (!file.metadata) {
            console.warn(`⚠️ Missing metadata for file: ${file.path}, skipping translation.`);
            return;
          }
          if (verbose) console.log(`🌐 Translating to ${lang}...`);
          // 存储翻译文件到 .czon/src/{lang}
          const sourcePath = path.join(
            CZON_SRC_DIR,
            file.metadata.inferred_lang,
            file.hash + '.md'
          ); // 使用已经加强的母语文件路径
          const targetPath = path.join(CZON_SRC_DIR, lang, file.hash + '.md');

          try {
            const content = await readFile(sourcePath, 'utf-8');
            if (file.metadata.inferred_lang === lang) {
              if (verbose)
                console.log(`ℹ️ Skipping translation for ${file.path}, already in target language`);
              return;
            }

            const hash = sha256(content);

            const isTargetExists = await access(targetPath).then(
              () => true,
              () => false
            );

            if (hash === file.nativeMarkdownHash && isTargetExists) {
              if (verbose)
                console.info(`ℹ️ Content unchanged for ${file.path}, skipping translation.`);
              return;
            }

            const translatedContent = await translateMarkdown(content, lang);

            await writeFile(targetPath, translatedContent);

            // 存储已增强内容的哈希值
            file.nativeMarkdownHash = hash;

            if (verbose) console.log(`✅ Translated file saved: ${targetPath}`);
          } catch (error) {
            console.error(`❌ Failed to translate to ${lang}:`, error);
          }
        })
      );
    })
  );
}
