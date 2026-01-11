import { MetaData } from '../metadata';
import { completeMessages } from '../services/openai';

export const processExtractCategory = async (): Promise<void> => {
  // 如果所有文件都已经有 category，则跳过本阶段
  const allHaveCategory = MetaData.files.filter(f => f.metadata).every(file => file.category);
  if (allHaveCategory) {
    console.info('ℹ️ All files already have categories, skipping category extraction.');
    return;
  }
  // 这意味着，只要有一个新文件，就需要重新生成所有类别标签
  // 这倒也合理，因为类别标签是整体相关的

  // 如果是内容改动导致的呢？

  // 提取类别标签列表
  const categories = await completeMessages(
    [
      {
        role: 'system',
        content: [
          '你是一个专业的文档分类助手，擅长根据文档内容和关键词为文档分配合适的类别标签。',
          '你需要阅读所有的文档内容和关键词，然后生成一个类别标签列表。',
          '类别标签应简洁明了，一般有一个单词或者短语组成，使用英文。',
          '每个文档只能有一个类别标签。',
          '请确保类别标签之间没有重复，并且涵盖所有文档的主题。',
          '然后，为每个文档生成一个映射，指明该文档对应的类别标签。',
          '请检查每个分类中的文档数量不能过少（例如少于 2 个），如果有，请考虑合并到其他相关类别中。',
          '请以 JSON 格式返回类别标签列表。',
          '示例输出格式：',
          '{ "categories": ["tag1", "tag2", "tag3"], "mappings": { "hash1": "tag1", "hash2": "tag2" } }',
        ].join('\n'),
      },
      {
        role: 'user',
        content: JSON.stringify(MetaData.files.filter(f => f.metadata)),
      },
    ],
    { response_format: { type: 'json_object' }, task_id: 'extract-categories' }
  );

  const json = categories.choices[0].message.content;
  const parsed: {
    categories: string[];
    mappings: Record<string, string>;
  } = JSON.parse(json);

  for (const file of MetaData.files) {
    const hash = file.hash;
    if (parsed.mappings[hash]) {
      file.category = parsed.mappings[hash];
    }
  }

  console.info('✅ Extracted categories:', categories.choices[0].message.content);
};
