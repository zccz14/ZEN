import React from 'react';
import { IRenderContext } from '../types';
import { ContentPage } from './ContentPage';
import { IndexPage } from './IndexPage';
import { RedirectPage } from './RedirectPage';
import { RootPage } from './RootPage';

export const App = (props: IRenderContext) => {
  if (props.path === '/index.html') {
    return <RootPage ctx={props} />;
  }

  // 每个语言的首页
  for (const lang of props.site.options.langs || []) {
    if (props.path === `/${lang}/index.html`) {
      return <IndexPage ctx={props} lang={lang} />;
    }

    const categories = [...new Set(props.site.files.map(f => f.category))];
    // 渲染分类页面
    for (const category of categories) {
      if (props.path === `/${lang}/categories_${category}.html`) {
        return <IndexPage ctx={props} lang={lang} category={category} />;
      }
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
