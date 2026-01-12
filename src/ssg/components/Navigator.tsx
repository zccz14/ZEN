import React from 'react';
import { IRenderContext } from '../../types';
import { toSortedBy } from '../../utils/sortBy';

export const Navigator: React.FC<{
  ctx: IRenderContext;
  file: IRenderContext['site']['files'][0];
  lang: string;
}> = props => {
  const categories = [...new Set(props.ctx.site.files.map(f => f.category))];
  return (
    <ul className="nav-list">
      {categories.map(category => {
        const categoryKey = category || 'NO_CATEGORY';
        const filesInCategory = toSortedBy(
          props.ctx.site.files.filter(f => f.category === category && f.metadata),
          [
            // 无日期的排前面
            [x => (x.metadata?.inferred_date ? 1 : 0), 'asc'],
            // 日期降序
            [x => x.metadata?.inferred_date || '', 'desc'],
          ]
        );

        if (filesInCategory.length === 0) return null;

        return (
          <div key={categoryKey}>
            <li className="nav-item font-bold" key={categoryKey}>
              {category || '--'}
            </li>
            {filesInCategory.map(file => {
              const link = file.metadata!.slug + '.html';
              const isActive = props.file.hash === file.hash;
              const theContent = props.ctx.contents.find(
                c => c.lang === props.lang && c.hash === file.hash
              );
              const theTitle =
                theContent?.frontmatter?.title || file.metadata!.title || '(no title)';

              return (
                <li className="nav-item" key={file.hash}>
                  <a href={link} className={`nav-link ${isActive ? 'active' : ''}`}>
                    {theTitle}
                  </a>
                </li>
              );
            })}
          </div>
        );
      })}
    </ul>
  );
};
