# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Manifest V3 Chrome extension for saving, organizing, and reusing AI prompts. Zero dependencies — pure vanilla JS, HTML, CSS. No build step, no package manager.

## Development

**Load the extension:** In Chrome, go to `chrome://extensions/` → Enable Developer mode → Load unpacked → select this directory.

**Reload after changes:** Click the refresh icon on the extension card, then reopen the popup. There are no tests or lint commands.

## Architecture

Everything lives in four files:

- **[manifest.json](manifest.json)** — Manifest V3; declares `storage` permission; entry point is `popup.html`.
- **[popup.html](popup.html)** — Full UI: 3-column layout (nav → prompt list → editor) plus modals for category management and template variable substitution.
- **[app.js](app.js)** — All logic in one file (~815 lines): state management, render functions, event handlers, clipboard, import/export, theme, storage.
- **[style.css](style.css)** — Flat design; light/dark theme via CSS custom properties; 3-column grid layout.

### State Shape

```js
{
  prompts: [{ id, title, body, category, favorite, trashed, createdAt, updatedAt }],
  categories: [string],
  currentView: 'all' | 'favorites' | 'categories' | 'trash',
  selectedId: string | null,
  selectedCategory: string | null,
  searchQuery: string,
  theme: 'light' | 'dark'
}
```

### Storage Strategy

On load, both `chrome.storage.local` and `chrome.storage.sync` are read; whichever has the more recent `updatedAt` wins. On save, both are always written (sync only if payload < 8 KB). Falls back to `localStorage` in non-Chrome environments.

### Template Variables

`app.js` extracts template variables with `/\{\{([^{}]+?)\}\}|\{([^{}]+?)\}/g` — supports both `{{var}}` and `{var}` syntax. When copying a prompt that contains variables, a modal opens to fill values before clipboard write.

### Category Colors

Category dot colors are assigned deterministically from a 10-color palette via a hash of the category name — stable across sessions without storing color data.

### Auto-save

Editing the title or body immediately updates state and storage silently. The "Save" button only provides UI feedback; the data is already saved.
