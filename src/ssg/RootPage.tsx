import React from 'react';
import { LANGUAGE_NAMES } from '../languages';
import { IRenderContext } from '../types';

// /index.html 的根页面
// 需要实现多语言选择，自动重定向到用户浏览器语言对应的首页
// 需要对 SEO 友好，提供适当的 meta 标签
export const RootPage: React.FC<{ ctx: IRenderContext }> = props => {
  const mapUserLangToSupported: Record<string, string> = {};

  for (const lang of props.ctx.site.options.langs || []) {
    mapUserLangToSupported[lang] = lang;
    const langPrefix = lang.split('-')[0];
    if (!mapUserLangToSupported[langPrefix]) {
      mapUserLangToSupported[langPrefix] = lang;
    }
  }

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>CZON Multilingual Site Navigator</title>
        <meta name="description" content="Select your preferred language to explore our content." />
        {props.ctx.site.options.langs!.map(lang => (
          <link rel="alternate" hrefLang={lang} href={`${lang}/index.html`} />
        ))}
        <link
          rel="alternate"
          hrefLang="x-default"
          href={`${props.ctx.site.options.langs![0]}/index.html`}
        />
      </head>
      <body>
        <h1>Welcome to CZON Multilingual Site</h1>
        <p>Please select your preferred language if automatic redirection does not work:</p>
        <ul>
          {props.ctx.site.options.langs?.map(lang => (
            <li key={lang}>
              <a href={`/${lang}/index.html`}>({LANGUAGE_NAMES[lang] || lang})</a>
            </li>
          ))}
        </ul>
        <script>
          {`
          // 自动重定向到用户浏览器语言对应的首页
          (function() {
            const mapUserLangToSupported = ${JSON.stringify(mapUserLangToSupported)};
            for (const lang of navigator.languages) {
              if (mapUserLangToSupported[lang]) {
                window.location.href = mapUserLangToSupported[lang] + '/index.html';
                return;
              }
            }
            window.location.href = '${props.ctx.site.options.langs![0]}/index.html'; // 默认语言
          })();
          
          `}
        </script>
      </body>
    </html>
  );
};
