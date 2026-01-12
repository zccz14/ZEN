import React from 'react';
import { IRenderContext } from '../types';
import { ContentMeta } from './components/ContentMeta';
import { CZONFooter } from './components/CZONFooter';
import { CZONHeader } from './components/CZONHeader';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { Navigator } from './components/Navigator';
import { PageLayout } from './layouts/PageLayout';
import { style } from './style';

export const ContentPage: React.FC<{
  ctx: IRenderContext;
  file: IRenderContext['site']['files'][0];
  lang: string;
  content: IRenderContext['contents'][0];
}> = props => {
  const frontmatter = props.content.frontmatter || {};
  const title = frontmatter.title;
  const summary = frontmatter.summary;
  const date = frontmatter.date || '--';
  const tags = frontmatter.tags || [];
  const category = props.file.category;

  return (
    <html lang={props.lang} style={{ background: 'black', overflow: 'hidden' }}>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        <meta name="description" content={`tags: ${tags.join(', ')}`} />
        <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4" defer></script>
        <link
          rel="preload"
          as="style"
          href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github.min.css"
        />
        <link
          rel="preload"
          as="style"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css"
          integrity="sha384-GvrOXuhMATgEsSwCs4smul74iXGOixntILdUW9XmUC6+HX0sLNAK3q71HotJqlAn"
          crossOrigin="anonymous"
        />
        <style>{style}</style>
      </head>
      <body>
        <PageLayout
          header={<CZONHeader ctx={props.ctx} />}
          navigator={
            <nav className="sidebar">
              <Navigator ctx={props.ctx} file={props.file} lang={props.lang} />
            </nav>
          }
          main={
            <main className="content">
              <ContentMeta ctx={props.ctx} file={props.file} lang={props.lang} />

              <div className="content-body">
                <article dangerouslySetInnerHTML={{ __html: props.content.body }} />
                {/* 阅读同类文章 */}
                <h2>See Also</h2>
                <ul>
                  {props.ctx.site.files
                    .filter(f => f.category === category && f.hash !== props.file.hash)
                    .map(f => {
                      const theContent = props.ctx.contents.find(
                        c => c.lang === props.lang && c.hash === f.hash
                      );
                      return (
                        <li key={f.hash}>
                          <a href={`${f.metadata?.slug}.html`}>{theContent?.frontmatter.title}</a>
                        </li>
                      );
                    })}
                </ul>
              </div>
              <footer className="footer">
                <LanguageSwitcher ctx={props.ctx} lang={props.lang} file={props.file} />
                <CZONFooter />
              </footer>
            </main>
          }
          footer={null}
        />

        <script
          id="hljs-lib"
          src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js"
          defer
        ></script>
        <script>{`
        document.getElementById('hljs-lib').addEventListener('load', () => {
            console.log('Highlight.js loaded');
            hljs.highlightAll();
        });
        `}</script>
        <script
          id="mermaid-lib"
          src="https://cdn.jsdelivr.net/npm/mermaid@11.4.0/dist/mermaid.min.js"
          defer
        ></script>
        <script>{`
        document.getElementById('mermaid-lib').addEventListener('load', () => {
            console.log('Mermaid loaded');
            mermaid.initialize({
              startOnLoad: true,
              theme: 'default',
              securityLevel: 'strict',
              flowchart: {
                useMaxWidth: true,
                htmlLabels: true,
                curve: 'basis',
              },
              sequence: {
                useMaxWidth: true,
                diagramMarginX: 50,
                diagramMarginY: 10,
                actorMargin: 50,
              },
              gantt: {
                useMaxWidth: true,
                barHeight: 20,
                barGap: 4,
              },
            });
        });
        `}</script>
      </body>
    </html>
  );
};
