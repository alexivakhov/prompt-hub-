# Prompt Hub

A Chrome Extension for saving, organizing, and copying AI prompts with template variables.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-34A853)
![License](https://img.shields.io/badge/License-MIT-blue)

## Features

- **Sidebar Navigation** — All Prompts, Favorites, Categories (with sub-filter), Trash
- **Template Variables** — use `{{placeholder}}` in prompts; fill values in a modal before copying
- **Real-time Search** — filter prompts by title and body content
- **Editor Panel** — title field, category selector, large textarea, favorite toggle
- **Copy to Clipboard** — one-click copy with variable substitution
- **Soft Delete** — prompts move to Trash first, with Restore and Delete Forever options
- **Category Management** — create, rename, and delete categories; prompts move to "Misc" on deletion
- **Keyboard Shortcuts** — `⌘N` new, `⌘K` search, `⌘↵` copy, `⌘S` save, `Esc` close
- **Theme Toggle** — light and dark mode
- **Import / Export** — backup and restore your prompt library as JSON
- **Data Persistence** — stored via `chrome.storage` with sync across devices

## Tech Stack

- Pure HTML, CSS, and Vanilla JavaScript
- Chrome Extension Manifest V3
- No external dependencies

## File Structure

```
prompt-hub/
├── manifest.json       # Extension configuration (Manifest V3)
├── popup.html          # Main 3-column interface
├── style.css           # Flat design with subtle shadows
├── app.js              # State, render, and event handlers
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Installation

1. Clone or download this repository
2. Open `chrome://extensions/` in Chrome
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** and select the project folder
5. Click the extension icon in the toolbar to open Prompt Hub

## Upgrading from v1.2.x

Download the ZIP → `chrome://extensions` → **Load unpacked**. All existing prompts and categories are preserved automatically.

## License

MIT License — feel free to use, modify, and distribute.
