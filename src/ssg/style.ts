export const style = `

      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
      }

      html[lang='ar-SA'] {
        direction: rtl;
      }

      body {
        color: #333;
        background: #f8f9fa;
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

      a {
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

      .language-switch-trigger:focus {
        outline: 2px solid #3b82f6;
        outline-offset: 2px;
      }

      .language-switch-icon {
        transition: transform 0.2s ease;
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

      /* Pure CSS modal using checkbox + label pattern */
      /* Hide the checkbox */
      .language-modal-toggle {
        display: none;
      }

      /* Modal overlay - hidden by default */
      .language-modal-overlay {
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.3s ease, visibility 0.3s ease;
      }

      /* Modal dialog - hidden by default */
      .language-modal {
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.3s ease, visibility 0.3s ease;
      }

      /* Modal content animation */
      .language-modal-content {
        transform: scale(0.95);
        transition: transform 0.3s ease;
      }

      /* When checkbox is checked, show modal */
      .language-modal-toggle:checked ~ .language-modal-overlay,
      .language-modal-toggle:checked ~ .language-modal {
        opacity: 1;
        visibility: visible;
      }

      .language-modal-toggle:checked ~ .language-modal .language-modal-content {
        transform: scale(1);
      }

      /* Rotate icon when modal is open */
      .language-modal-toggle:checked ~ .language-switch-trigger .language-switch-icon {
        transform: rotate(180deg);
      }

      /* Modal header styling */
      .language-modal-header {
        background: #fff;
      }

      /* Modal body styling */
      .language-modal-body {
        max-height: 60vh;
      }

      /* Modal close button */
      .language-modal-close {
        transition: background-color 0.2s ease;
      }

      .language-modal-close:hover {
        background-color: #f3f4f6;
      }

      .language-modal-close:focus {
        outline: 2px solid #3b82f6;
        outline-offset: 2px;
      }


      /* Mobile responsiveness for language modal */
      /* Small screens: full-screen modal */
      @media (max-width: 640px) {
        .language-modal-content {
          margin: 0;
          border-radius: 0;
          max-height: 100vh;
          max-width: 100vw;
        }

        .language-modal {
          padding: 0;
        }

        .language-switch-grid {
          grid-template-columns: repeat(2, 1fr);
        }

        .language-switch-trigger {
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
        }

        .language-switch-option {
          padding: 0.5rem 0.75rem;
          font-size: 0.8125rem;
        }
      }

      /* Medium screens: moderate modal */
      @media (min-width: 641px) and (max-width: 1024px) {
        .language-modal-content {
          max-width: 90vw;
        }

        .language-switch-grid {
          grid-template-columns: repeat(3, 1fr);
        }
      }

      /* Large screens: standard modal */
      @media (min-width: 1025px) {
        .language-modal-content {
          max-width: 4xl;
        }

        .language-switch-grid {
          grid-template-columns: repeat(4, 1fr);
        }
      }

      /* Extra large screens: more columns */
      @media (min-width: 1280px) {
        .language-switch-grid {
          grid-template-columns: repeat(5, 1fr);
        }
      }

      /* Scrollbar styling for modal body */
      .language-modal-body::-webkit-scrollbar {
        width: 8px;
      }

      .language-modal-body::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 4px;
      }

      .language-modal-body::-webkit-scrollbar-thumb {
        background: #c1c1c1;
        border-radius: 4px;
      }

      .language-modal-body::-webkit-scrollbar-thumb:hover {
        background: #a8a8a8;
      }

      /* Browser compatibility fallback for older browsers */
      /* Simple display toggle for browsers that don't support :checked properly */
      @supports not selector(:checked) {
        .language-modal-overlay,
        .language-modal {
          display: none;
        }

        .language-modal-toggle:checked ~ .language-modal-overlay,
        .language-modal-toggle:checked ~ .language-modal {
          display: block;
        }
      }

.embla {
  overflow: hidden;
}
.embla__container {
  display: flex;
}
.embla__slide {
  flex: 0 0 100%;
  min-width: 0;
}
        `;
