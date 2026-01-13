import { join } from 'node:path';
import React, { useState, useRef, useEffect } from 'react';
import { LANGUAGE_NAMES } from '../../languages';
import { IRenderContext } from '../../types';

export const LanguageSwitch: React.FC<{
  ctx: IRenderContext;
  lang: string;
  file?: IRenderContext['site']['files'][0];
}> = props => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  // 获取当前语言名称
  const currentLangName = LANGUAGE_NAMES[props.lang] || props.lang;

  // 获取所有支持的语言
  const languages = props.ctx.site.options.langs || [];

  // 处理点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 处理键盘导航
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setIsOpen(true);
        setFocusedIndex(0);
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setFocusedIndex(-1);
        buttonRef.current?.focus();
        break;

      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev =>
          prev < languages.length - 1 ? prev + 1 : 0
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev =>
          prev > 0 ? prev - 1 : languages.length - 1
        );
        break;

      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < languages.length) {
          const lang = languages[focusedIndex];
          if (lang !== props.lang) {
            const target = props.file ? `${props.file.metadata!.slug}.html` : 'index.html';
            const link = join('..', lang, target);
            window.location.href = link;
          }
        }
        break;

      case 'Tab':
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
    }
  };

  // 生成语言链接
  const getLanguageLink = (lang: string) => {
    const target = props.file ? `${props.file.metadata!.slug}.html` : 'index.html';
    return join('..', lang, target);
  };

  // 处理语言选择
  const handleLanguageSelect = (lang: string) => {
    if (lang !== props.lang) {
      const link = getLanguageLink(lang);
      window.location.href = link;
    }
  };

  return (
    <div
      className="relative inline-block"
      ref={dropdownRef}
      onKeyDown={handleKeyDown}
    >
      {/* 当前语言按钮 */}
      <button
        ref={buttonRef}
        type="button"
        className="language-switch-button px-4 py-2 border border-gray-300 rounded-md flex items-center gap-2 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Language switcher. Current language: ${currentLangName}`}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <span className="text-sm font-medium">{currentLangName}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 w-96 max-h-96 overflow-y-auto bg-white border border-gray-300 rounded-md shadow-lg z-50"
          role="menu"
          aria-label="Available languages"
        >
          <div className="p-4">
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {languages.map((lang, index) => {
                const langName = LANGUAGE_NAMES[lang] || lang;
                const isActive = lang === props.lang;
                const isFocused = index === focusedIndex;

                return (
                  <a
                    key={lang}
                    href={getLanguageLink(lang)}
                    className={`
                      language-option block px-3 py-2 rounded text-sm text-center
                      ${isActive
                        ? 'bg-blue-100 text-blue-700 font-semibold'
                        : 'text-gray-700 hover:bg-gray-100'
                      }
                      ${isFocused ? 'ring-2 ring-blue-500' : ''}
                      transition-colors focus:outline-none
                    `}
                    role="menuitem"
                    aria-current={isActive ? 'page' : undefined}
                    tabIndex={-1}
                    onClick={(e) => {
                      e.preventDefault();
                      handleLanguageSelect(lang);
                    }}
                    onMouseEnter={() => setFocusedIndex(index)}
                  >
                    {langName}
                  </a>
                );
              })}
            </div>

            {/* 语言数量提示 */}
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                {languages.length} languages available
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};