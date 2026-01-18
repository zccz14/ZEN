import React from 'react';

const style = `
.dark-mode-switch-container {
  position: relative;
  display: inline-block;
}

.dark-mode-switch-trigger {
  transition: all 0.2s ease;
  cursor: pointer;
}

.dark-mode-switch-trigger:hover {
  box-shadow: 0 2px 4px var(--shadow-color);
  background: var(--tag-bg);
}

.dark-mode-icon {
  width: 1.25rem;
  height: 1.25rem;
  transition: all 0.2s ease;
}

[data-theme="light"] .icon-sun { display: block; }
[data-theme="light"] .icon-moon { display: none; }
[data-theme="light"] .icon-auto { display: none; }

[data-theme="dark"] .icon-sun { display: none; }
[data-theme="dark"] .icon-moon { display: block; }
[data-theme="dark"] .icon-auto { display: none; }

[data-theme="auto"] .icon-sun { display: none; }
[data-theme="auto"] .icon-moon { display: none; }
[data-theme="auto"] .icon-auto { display: block; }
`;

export const DarkModeSwitch: React.FC = () => {
  return (
    <div className="dark-mode-switch-container relative inline-block">
      <style>{style}</style>
      <input id="theme-toggle" type="checkbox" className="hidden" aria-hidden="true" />
      <label
        htmlFor="theme-toggle"
        className="dark-mode-switch-trigger p-2 rounded-full flex items-center justify-center transition-colors"
        aria-label="Toggle theme"
        role="button"
        tabIndex={0}
      >
        <svg
          className="dark-mode-icon icon-sun"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
        <svg
          className="dark-mode-icon icon-moon"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
        <svg
          className="dark-mode-icon icon-auto"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      </label>
      <script>{`
(function() {
  const STORAGE_KEY = 'theme';
  const toggle = document.getElementById('theme-toggle');
  const html = document.documentElement;
  const label = document.querySelector('label[for="theme-toggle"]');

  function updateHljsTheme(isDark) {
    const link = document.getElementById('hljs-css');
    if (link) {
      const url = isDark
        ? "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github-dark.min.css"
        : "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github.min.css";
      link.href = url;
    }
  }

  function updateMermaidTheme(isDark) {
    if (typeof mermaid !== 'undefined') {
      document.querySelectorAll('.mermaid').forEach(el => {
        const pre = el;
        const content = pre.getAttribute('data-mermaid-content');
        if (content) {
          pre.style.visibility = 'visible';
          pre.textContent = decodeURIComponent(content);
          delete pre.dataset.processed;
        }
      });
      runMermaid();
    }
  }
  window.updateMermaidTheme = updateMermaidTheme;

  function applyTheme(theme) {
    localStorage.setItem(STORAGE_KEY, theme);
    html.setAttribute('data-theme', theme);
    
    let isDark;
    if (theme === 'auto') {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    } else {
      isDark = theme === 'dark';
    }
    
    if (isDark) {
      html.classList.add('dark');
      if (toggle) toggle.checked = true;
    } else {
      html.classList.remove('dark');
      if (toggle) toggle.checked = false;
    }
    
    updateHljsTheme(isDark);
    updateMermaidTheme(isDark);
  }

  function cycleTheme() {
    const current = html.getAttribute('data-theme') || 'auto';
    const next = current === 'light' ? 'dark' : current === 'dark' ? 'auto' : 'light';
    applyTheme(next);
  }

  function initTheme() {
    const saved = localStorage.getItem(STORAGE_KEY);
    const theme = saved || 'auto';
    applyTheme(theme);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheme);
  } else {
    initTheme();
  }

  document.addEventListener('click', function(e) {
    if (label && label.contains(e.target)) {
      e.preventDefault();
      cycleTheme();
    }
  });

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
    if (html.getAttribute('data-theme') === 'auto') {
      if (e.matches) {
        html.classList.add('dark');
      } else {
        html.classList.remove('dark');
      }
      updateHljsTheme(e.matches);
      updateMermaidTheme(e.matches);
    }
  });
})();
      `}</script>
    </div>
  );
};
