import { parse, stringify } from 'yaml';

export const parseFrontmatter = (content: string): { frontmatter: any; body: string } => {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
  const match = content.match(frontmatterRegex);
  if (match) {
    const frontmatterContent = match[1];
    const body = content.slice(match[0].length).trim();
    return { frontmatter: parse(frontmatterContent.trim()), body };
  }
  return { frontmatter: {}, body: content };
};

export const updateFrontmatter = (content: string, newFrontmatter: any): string => {
  const { body } = parseFrontmatter(content);
  const frontmatterContent = `---\n${stringify(newFrontmatter, { defaultStringType: 'QUOTE_DOUBLE' })}---\n\n`;
  return frontmatterContent + body;
};
