import React from 'react';
import { IRenderContext } from '../types';
import { toSortedBy } from '../utils/sortBy';
import { ContentMeta } from './components/ContentMeta';
import { CZONFooter } from './components/CZONFooter';
import { CZONHeader } from './components/CZONHeader';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { PageLayout } from './layouts/PageLayout';
import { style } from './style';

export const IndexPage: React.FC<{
  ctx: IRenderContext;
  lang: string;
  category?: string;
}> = props => {
  const contents = toSortedBy(
    props.ctx.site.files.filter(
      f => f.metadata && (!props.category || f.category === props.category)
    ),
    [
      // 无日期的排前面
      [x => (x.metadata?.inferred_date ? 1 : 0), 'asc'],
      // 日期降序
      [x => x.metadata?.inferred_date || '', 'desc'],
    ]
  );

  const allCategories = Array.from(
    new Set(
      ([undefined] as Array<string | undefined>).concat(props.ctx.site.files.map(f => f.category))
    )
  );

  return (
    <html>
      <head>
        <meta charSet="UTF-8" />
        <title>Index of {props.lang}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content={`Index page for language ${props.lang}`} />
        <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4" defer></script>
        <style>{style}</style>
      </head>
      <body>
        <PageLayout
          header={<CZONHeader ctx={props.ctx} />}
          navigator={undefined}
          main={
            <div className="p-6 max-w-3xl mx-auto">
              <div>
                <span className="font-bold"></span>
                {/* Categories Filter: 前端根据 searchParams 中的 category 字段来确定是否显示 */}
                <div className="mb-6 gap-6 flex flex-wrap">
                  {allCategories.map(category => {
                    const title = category || 'All';
                    const link = category ? `categories_${category}.html` : 'index.html';
                    const isActive = category === props.category;
                    return (
                      <span key={title}>
                        {isActive ? (
                          <span className="font-bold">{title}</span>
                        ) : (
                          <a href={link}>{title}</a>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div>
                {contents.map(file => {
                  const metadata = file.metadata!;
                  return (
                    <div className="mb-6" key={file.hash}>
                      <ContentMeta ctx={props.ctx} file={file} lang={props.lang} />
                    </div>
                  );
                })}
              </div>
              <footer>
                <LanguageSwitcher ctx={props.ctx} lang={props.lang} />
                <CZONFooter />
              </footer>
            </div>
          }
          footer={null}
        />
      </body>
    </html>
  );

  // TODO: 渲染多语言首页列表
  // return (
  //   <div>
  //     {props.site.files.map(file => (
  //       <div key={file.metadata?.slug}>
  //         <h2>{file.metadata?.title}</h2>
  //         <p>{file.metadata?.short_summary}</p>
  //         <a href={`${file.metadata?.slug}.html`}>阅读更多</a>
  //       </div>
  //     ))}
  //   </div>
  // );
};
