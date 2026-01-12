import React from 'react';
import { IRenderContext } from '../../types';
import { TagList } from './TagList';

export const ContentMeta: React.FC<{
  ctx: IRenderContext;
  file: IRenderContext['site']['files'][0];
  showShortSummary?: boolean;
  showSummary?: boolean;
  lang: string;
}> = props => {
  const content = props.ctx.contents.find(c => c.hash === props.file.hash && c.lang === props.lang);
  const frontmatter = content?.frontmatter || {};
  const title = frontmatter.title;
  const summary = frontmatter.summary;
  const date = frontmatter.date || '--';
  const tags = frontmatter.tags || [];
  const category = props.file.category;

  return (
    <header className="content-header mb-4 pb-2 border-b">
      <h2 className="text-2xl font-bold mb-2">
        <a href={`${props.file.metadata?.slug}.html`}>{title}</a>
      </h2>
      <p className="font-semibold">{category}</p>
      <blockquote>{summary}</blockquote>
      <div>📅 {date}</div>
      <div className="tags">
        <TagList tags={tags} />
      </div>
    </header>
  );
};
