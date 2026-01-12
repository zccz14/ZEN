import { join } from 'node:path';
import React from 'react';
import { LANGUAGE_NAMES } from '../../languages';
import { IRenderContext } from '../../types';

export const LanguageSwitcher: React.FC<{
  ctx: IRenderContext;
  lang: string;
  file?: IRenderContext['site']['files'][0];
}> = props => {
  return (
    <div aria-label="Language switcher" className="text-center my-4">
      <ul className="lang-list grid grid-cols-2 md:grid-cols-4 gap-2 list-none p-0 m-0">
        {props.ctx.site.options.langs?.map(lang => {
          const isActive = lang === props.lang;
          const langName = LANGUAGE_NAMES[lang] || lang;
          const target = props.file ? `${props.file.metadata!.slug}.html` : 'index.html';
          const link = join('..', lang, target);
          return (
            <li className={`lang-item ${isActive ? 'font-bold' : ''}`} key={lang}>
              {isActive ? (
                langName
              ) : (
                <a href={link} className="lang-link">
                  {langName}
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
