import { join } from 'node:path';
import React from 'react';
import { LANGUAGE_NAMES } from '../../languages';
import { IRenderContext } from '../../types';

const style = `
/* LanguageSwitch dropdown styles - Pure CSS version */
.language-switch-container {
  position: relative;
  display: inline-block;
}

.language-switch-trigger {
  transition: all 0.2s ease;
}

.language-switch-trigger:hover {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.language-switch-icon {
  transition: transform 0.2s ease;
}

.language-switch-dropdown {
  max-width: 80vw;
  inset-inline-start: auto;
  inset-inline-end: 0;
  margin-inline-start: 0;
  margin-inline-end: 0;

  opacity: 0;
  visibility: hidden;
  transform: translateY(-10px);
  transition:
    opacity 0.2s ease,
    visibility 0.2s ease,
    transform 0.2s ease;
}
#language-switch-toggle:checked ~ .language-switch-dropdown {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}
#language-switch-toggle:checked ~ .language-switch-trigger .language-switch-icon {
  transform: rotate(180deg);
}

.language-switch-option {
  transition: all 0.15s ease;
}

.language-switch-option:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.language-switch-option:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}
`;
export const LanguageSwitch: React.FC<{
  ctx: IRenderContext;
  lang: string;
  file?: IRenderContext['site']['files'][0];
}> = props => {
  // 获取当前语言名称
  const currentLangName = LANGUAGE_NAMES[props.lang] || props.lang;

  // 获取所有支持的语言
  const languages = props.ctx.site.options.langs || [];

  // 生成语言链接（纯静态，无状态）
  const getLanguageLink = (lang: string) => {
    const target = props.file ? `${props.file.metadata!.slug}.html` : 'index.html';
    return join('..', lang, target);
  };

  return (
    <div className="language-switch-container relative inline-block">
      <style>{style}</style>
      {/* 使用一个隐藏的 checkbox 记录状态 */}
      <input id="language-switch-toggle" type="checkbox" className="hidden" aria-hidden="true" />
      {/* 当前语言按钮 - 使用纯CSS :focus-within 实现下拉菜单 */}
      <label
        htmlFor="language-switch-toggle"
        className="language-switch-trigger px-4 py-2 border border-gray-300 rounded-md flex items-center gap-2 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
        aria-label={`Language switcher. Current language: ${currentLangName}`}
        aria-haspopup="true"
        aria-expanded="false"
        aria-controls="language-dropdown"
      >
        <span className="text-sm font-medium">{currentLangName}</span>
        <svg
          className="language-switch-icon w-4 h-4 transition-transform"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </label>

      {/* 下拉菜单 - 使用CSS :focus-within 控制显示 */}
      <div
        id="language-dropdown"
        className="language-switch-dropdown absolute top-full mt-1 w-96 md:w-2xl lg:w-3xl max-h-96 overflow-y-auto bg-white border border-gray-300 rounded-md shadow-lg z-50"
        role="menu"
        aria-label="Available languages"
      >
        <div className="p-4">
          <div className="language-switch-grid grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {languages.map(lang => {
              const langName = LANGUAGE_NAMES[lang] || lang;
              const isActive = lang === props.lang;

              return (
                <a
                  key={lang}
                  href={getLanguageLink(lang)}
                  className={`
                    language-switch-option block px-3 py-2 rounded text-sm text-center
                    ${
                      isActive
                        ? 'bg-blue-100 text-blue-700 font-semibold'
                        : 'text-gray-700 hover:bg-gray-100'
                    }
                    transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500
                  `}
                  role="menuitem"
                  aria-current={isActive ? 'page' : undefined}
                  lang={lang}
                >
                  {langName}
                </a>
              );
            })}
          </div>

          {/* 语言数量提示 */}
          <div className="language-switch-info mt-3 pt-3 border-t border-gray-200">
            <p className="language-switch-count text-xs text-gray-500 text-center">
              {languages.length} languages available
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
