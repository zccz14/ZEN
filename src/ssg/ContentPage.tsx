import React from 'react';
import { IRenderContext } from '../types';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { Navigator } from './components/Navigator';
import { TagList } from './components/TagList';

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

  return (
    <html lang={props.lang}>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      html[lang='ar-SA'] {
        direction: rtl;
      }

      body {
        font-family:
          -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        background: #f8f9fa;
        display: flex;
        align-items: stretch;
        min-height: 100vh;
      }

      .sidebar {
        width: 280px;
        background: #fff;
        border-right: 1px solid #e9ecef;
        padding: 2rem 1rem;
        overflow-y: auto;

        flex-shrink: 0;
      }

      .sidebar-header {
        margin-bottom: 2rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid #e9ecef;
      }

      .sidebar-header h1 {
        font-size: 1.5rem;
        font-weight: 600;
        color: #212529;
      }

      .sidebar-header p {
        color: #6c757d;
        font-size: 0.875rem;
        margin-top: 0.5rem;
      }

      .nav-list {
        list-style: none;
      }

      .nav-item {
        margin-bottom: 0.5rem;
      }

      .nav-link {
        display: block;
        padding: 0.5rem 1rem;
        color: #495057;
        text-decoration: none;
        border-radius: 4px;
        transition: all 0.2s;
      }

      .nav-link:hover {
        background: #e9ecef;
        color: #212529;
      }

      .nav-link.active {
        background: #007bff;
        color: white;
      }

      .nav-submenu {
        list-style: none;
        margin-left: 1rem;
        margin-top: 0.25rem;
      }

      blockquote {
        border-left: 4px solid #007bff;
        padding: 0.5rem 1rem;
        margin: 1rem 0;
        background: #f8f9fa;
        color: #495057;
      }

      .content {
        flex: 1;
        margin-inline-start: 80px;
        padding: 3rem 4rem;
        max-width: 900px;
      }

      .content-header {
        margin-bottom: 2rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid #e9ecef;
      }

      .content-header h1 {
        font-size: 2.5rem;
        font-weight: 700;
        color: #212529;
        margin-bottom: 0.5rem;
      }

      .content-header .meta {
        color: #6c757d;
        font-size: 0.875rem;
      }

      .content-body {
        font-size: 1.125rem;
        line-height: 1.8;
      }

      .content-body h1 {
        font-size: 2rem;
        margin: 2rem 0 1rem;
        color: #212529;
      }

      .content-body h2 {
        font-size: 1.75rem;
        margin: 1.75rem 0 0.875rem;
        color: #343a40;
      }

      .content-body h3 {
        font-size: 1.5rem;
        margin: 1.5rem 0 0.75rem;
        color: #495057;
      }

      .content-body p {
        margin: 1rem 0;
      }

      .content-body ul,
      .content-body ol {
        margin: 1rem 0 1rem 2rem;
      }

      .content-body li {
        margin: 0.5rem 0;
      }

      .content-body blockquote {
        border-left: 4px solid #007bff;
        padding: 0.5rem 1rem;
        margin: 1rem 0;
        background: #f8f9fa;
        color: #495057;
      }

      .content-body code {
        background: #f8f9fa;
        padding: 0.2rem 0.4rem;
        border-radius: 3px;
        font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
        font-size: 0.875em;
      }

      .content-body pre {
        background: #f8f9fa;
        padding: 1rem;
        border-radius: 6px;
        overflow-x: auto;
        margin: 1rem 0;
      }

      .content-body pre code {
        background: none;
        padding: 0;
      }

      .content-body table {
        width: 100%;
        border-collapse: collapse;
        margin: 1rem 0;
      }

      .content-body th,
      .content-body td {
        border: 1px solid #dee2e6;
        padding: 0.75rem;
        text-align: left;
      }

      .content-body th {
        background: #f8f9fa;
        font-weight: 600;
      }

      .content-body img {
        max-width: 100%;
        height: auto;
        border-radius: 6px;
        margin: 1rem 0;
      }

      .content-body a {
        color: #007bff;
        text-decoration: none;
      }

      .content-body a:hover {
        text-decoration: underline;
      }

      .footer {
        margin-top: 3rem;
        padding-top: 2rem;
        border-top: 1px solid #e9ecef;
        color: #6c757d;
        font-size: 0.875rem;
        text-align: center;
      }

      .language-switcher {
        margin-top: 2rem;
        text-align: center;
      }

      .lang-list {
        list-style: none;
        padding: 0;
        /* display: flex; */
        /* justify-content: center; */
        /* flex-wrap: wrap; */
        gap: 1rem;
      }

      .lang-item a {
        color: #495057;
        text-decoration: none;
        font-weight: 500;
      }
      .lang-item.active a {
        font-weight: 700;
        color: #007bff;
      }

      .tags-list {
        list-style: none;
        padding: 0;
        display: flex;
        gap: 0.5rem;
        margin-top: 0.5rem;
        flex-wrap: wrap;
      }

      .tag-item {
        background: #e9ecef;
        color: #495057;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.875rem;
      }

      @media (max-width: 768px) {
        body {
          flex-direction: column;
        }

        .sidebar {
          width: 100%;
          height: auto;
          position: static;
          border-right: none;
          border-bottom: 1px solid #e9ecef;
        }

        .content {
          margin-left: 0;
          padding: 2rem;
        }
      }
        
        
        `,
          }}
        ></style>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github.min.css"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css"
          integrity="sha384-GvrOXuhMATgEsSwCs4smul74iXGOixntILdUW9XmUC6+HX0sLNAK3q71HotJqlAn"
          crossOrigin="anonymous"
        />

        <script src="https://cdn.jsdelivr.net/npm/mermaid@11.4.0/dist/mermaid.min.js"></script>
        <style
          dangerouslySetInnerHTML={{
            __html: `
      /* Mermaid diagram styles */
      .mermaid-diagram {
        margin: 1.5rem 0;
        border: 1px solid #e9ecef;
        border-radius: 6px;
        overflow: hidden;
        background: #fff;
      }

      .mermaid-placeholder {
        padding: 2rem;
        background: #f8f9fa;
        min-height: 200px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      }

      .mermaid-loading {
        color: #6c757d;
        font-style: italic;
        font-size: 0.875rem;
      }

      .mermaid-error {
        color: #dc3545;
        padding: 1rem;
        background: #f8d7da;
        border-radius: 4px;
        font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
        font-size: 0.875rem;
        line-height: 1.5;
      }

      .mermaid-source {
        display: none;
      }

      /* Ensure Mermaid diagrams are responsive */
      .mermaid-diagram svg {
        max-width: 100%;
        height: auto;
        display: block;
        margin: 0 auto;
      }
        
        
        `,
          }}
        ></style>
      </head>
      <body>
        <nav className="sidebar">
          <Navigator ctx={props.ctx} file={props.file} />
          <hr />
          <div>
            <LanguageSwitcher ctx={props.ctx} lang={props.lang} file={props.file} />
          </div>
        </nav>

        <main className="content">
          <header className="content-header">
            <h2>{title}</h2>
            <blockquote>{summary}</blockquote>
            <div>📅 {date}</div>
            <div className="tags">
              <TagList tags={tags} />
            </div>
          </header>

          <hr />

          <article
            className="content-body"
            dangerouslySetInnerHTML={{ __html: props.content.body }}
          />

          <footer className="footer">
            <p>
              Generated by <strong>CZON</strong> •
              <a href="https://github.com/zccz14/CZON" target="_blank">
                View on GitHub
              </a>
            </p>
          </footer>
        </main>

        <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js"></script>
        <script dangerouslySetInnerHTML={{ __html: 'hljs.highlightAll();' }} />
        <script
          dangerouslySetInnerHTML={{
            __html: `
        
      (function () {
        // Wait for page to fully load
        window.addEventListener('load', function () {
          // Initialize Mermaid with default configuration
          if (typeof mermaid !== 'undefined') {
            mermaid.initialize({
              startOnLoad: false,
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
          }
        });
      })();
    
        
        
        `,
          }}
        ></script>
      </body>
    </html>
  );
};
