import { join } from 'node:path';
import React, { useState, useEffect } from 'react';
import { LANGUAGE_NAMES } from '../../languages';
import { IRenderContext } from '../../types';

export const LanguageSwitch: React.FC<{
  ctx: IRenderContext;
  lang: string;
  file?: IRenderContext['site']['files'][0];
}> = props => {
  // 生成唯一的 modal ID，避免多个实例冲突
  const [modalId] = useState(() => `language-modal-${Math.random().toString(36).substr(2, 9)}`);

  // 获取当前语言名称
  const currentLangName = LANGUAGE_NAMES[props.lang] || props.lang;

  // 获取所有支持的语言
  const languages = props.ctx.site.options.langs || [];

  // 生成语言链接（纯静态，无状态）
  const getLanguageLink = (lang: string) => {
    const target = props.file ? `${props.file.metadata!.slug}.html` : 'index.html';
    return join('..', lang, target);
  };

  // ESC 键支持：按下 ESC 键关闭弹窗
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const toggle = document.getElementById(modalId) as HTMLInputElement;
        if (toggle?.checked) {
          toggle.click();
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [modalId]);

  return (
    <div className="language-switch-container relative inline-block">
      {/* 隐藏的 checkbox 作为弹窗状态控制器 */}
      <input
        type="checkbox"
        id={modalId}
        className="language-modal-toggle sr-only"
        aria-hidden="true"
      />

      {/* 触发按钮 - 使用 label 关联到 checkbox */}
      <label
        htmlFor={modalId}
        className="language-switch-trigger px-4 py-2 border border-gray-300 rounded-md flex items-center gap-2 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-pointer"
        role="button"
        aria-label={`Language switcher. Current language: ${currentLangName}`}
        aria-haspopup="dialog"
        aria-expanded="false"
        aria-controls={`${modalId}-content`}
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

      {/* 模态覆盖层 - 点击可关闭弹窗 */}
      <label
        htmlFor={modalId}
        className="language-modal-overlay fixed inset-0 bg-black bg-opacity-50 z-40 cursor-pointer"
        aria-hidden="true"
      ></label>

      {/* 模态弹窗 */}
      <div
        id={`${modalId}-content`}
        className="language-modal fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${modalId}-title`}
      >
        <div className="language-modal-content bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* 弹窗头部 */}
          <div className="language-modal-header p-4 border-b flex justify-between items-center">
            <h2 id={`${modalId}-title`} className="text-lg font-semibold">
              Select Language
            </h2>
            <label
              htmlFor={modalId}
              className="language-modal-close p-2 rounded-full hover:bg-gray-100 cursor-pointer"
              aria-label="Close language selector"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </label>
          </div>

          {/* 弹窗内容 */}
          <div className="language-modal-body p-4 overflow-y-auto">
            <div className="language-switch-grid grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {languages.map(lang => {
                const langName = LANGUAGE_NAMES[lang] || lang;
                const isActive = lang === props.lang;

                return (
                  <a
                    key={lang}
                    href={getLanguageLink(lang)}
                    onClick={() => {
                      // 选择语言后关闭弹窗
                      const toggle = document.getElementById(modalId) as HTMLInputElement;
                      if (toggle) toggle.click();
                    }}
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
          </div>

          {/* 弹窗底部 */}
          <div className="language-modal-footer p-4 border-t">
            <p className="language-switch-count text-xs text-gray-500 text-center">
              {languages.length} languages available
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
