import React from 'react';
import { IRenderContext } from '../types';
import { ContentPage } from './ContentPage';
import { RedirectPage } from './RedirectPage';
import { RootPage } from './RootPage';

export const App = (props: IRenderContext) => {
  if (props.path === '/index.html') {
    return <RootPage ctx={props} />;
  }

  // 每个语言的首页
  for (const lang of props.site.options.langs || []) {
    if (props.path === `/${lang}/index.html`) {
      const firstPage = props.site.files.find(f => f.metadata?.slug);
      return <RedirectPage from={props.path} to={`/${lang}/${firstPage!.metadata!.slug}.html`} />;
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
    }
    // 渲染文章页面
    for (const file of props.site.files) {
      if (props.path === `/${lang}/${file.metadata?.slug}.html`) {
        const theContent = props.contents.find(c => c.lang === lang && c.hash === file.hash);
        if (!theContent) return <RedirectPage from={props.path} to={`/index.html`} />;
        return <ContentPage ctx={props} file={file} lang={lang} content={theContent!} />;
      }
    }
  }

  return <RedirectPage from={props.path} to={`/index.html`} />;
};
