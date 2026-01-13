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

  const relatedContents = props.ctx.site.files.filter(
    f => f.category === category && f.hash !== props.file.hash
  );
  return (
    <html lang={props.lang} style={{ background: 'black', overflow: 'hidden' }}>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        <meta name="description" content={`tags: ${tags.join(', ')}`} />
        <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4" defer></script>
        <style>{style}</style>
      </head>
      <body>
        <PageLayout
          header={<CZONHeader ctx={props.ctx} lang={props.lang} file={props.file} />}
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
                {relatedContents.length > 0 && (
                  <>
                    <h2>See Also</h2>
                    <ul>
                      {relatedContents.map(f => {
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
                  </>
                )}
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
        <script>{`
        // 异步加载CSS函数
        function loadCSS(href, id) {
          return new Promise((resolve) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            if (id) link.id = id;
            link.onload = resolve;
            document.head.appendChild(link);
          });
        }
        
        // 页面主要内容加载完成后加载非关键CSS
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', loadNonCriticalCSS);
        } else {
          loadNonCriticalCSS();
        }
        
        function loadNonCriticalCSS() {
          // 延迟一点，确保首屏渲染完成
          setTimeout(() => {
            loadCSS("https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css", 'katex-css');
            loadCSS("https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github.min.css", 'hljs-css');
          }, 300);
        }
        
        `}</script>
        <script
          id="embla-lib"
          src="https://unpkg.com/embla-carousel/embla-carousel.umd.js"
          defer
        ></script>
        <script
          id="embla-autoplay-lib"
          src="https://unpkg.com/embla-carousel-autoplay/embla-carousel-autoplay.umd.js"
          defer
        ></script>
        <script>
          {`
          Promise.all([
            new Promise(resolve => {document.getElementById('embla-lib').addEventListener('load', resolve)}),
            new Promise(resolve => {document.getElementById('embla-autoplay-lib').addEventListener('load', resolve)}),
          ]).then(() => {
            console.log('Embla Carousel and Autoplay loaded');
            renderEmblaCarousels();
          });

          function renderEmblaCarousels() {
            // Detect image groups, make them carousels automatically
            Map.groupBy(document.querySelectorAll('img'), x => x.parentNode).entries().forEach(([container, images]) => {
                const outer = document.createElement('div');
                outer.classList.add('embla');
                container.appendChild(outer);
                
                const inner = document.createElement('div');
                inner.classList.add('embla__container');
                outer.appendChild(inner);

                images.forEach(img => {
                    container.removeChild(img);

                    const slide = document.createElement('div');
                    slide.classList.add('embla__slide');
                    
                    slide.appendChild(img);
                    inner.appendChild(slide);
                });

                EmblaCarousel(outer, { loop: true }, [EmblaCarouselAutoplay()]);
            });

          }
            `}
        </script>
      </body>
    </html>
  );
};
