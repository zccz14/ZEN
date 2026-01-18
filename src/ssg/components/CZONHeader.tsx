import React from 'react';
import { IRenderContext } from '../../types';
import { DarkModeSwitch } from './DarkModeSwitch';
import { LanguageSwitch } from './LanguageSwitch';

export const CZONHeader: React.FC<{
  ctx: IRenderContext;
  lang?: string;
  file?: IRenderContext['site']['files'][0];
}> = props => {
  return (
    <header className="czon-header py-4 border-b flex justify-between items-center px-6">
      <h1 className="text-2xl font-bold">
        <a href="index.html">CZON</a>
      </h1>
      <div className="flex items-center gap-4">
        <DarkModeSwitch />
        {props.lang && <LanguageSwitch ctx={props.ctx} lang={props.lang} file={props.file} />}
      </div>
    </header>
  );
};
