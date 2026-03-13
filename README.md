# Neumorphic Prompt Hub

A Chrome Extension for managing AI prompts with a clean Neumorphic UI.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-34A853)
![License](https://img.shields.io/badge/License-MIT-blue)

## Screenshots

| List View | Editor View |
|-----------|-------------|
| 3-column layout with sidebar navigation, prompt list, and empty state | Full editor with title, category, body, and action buttons |

## Features

- **Sidebar Navigation** — All Prompts, Favorites, Categories (with sub-filter), Trash
- **Real-time Search** — filter prompts by title and body content
- **Editor Panel** — title field, category selector, large textarea, favorite toggle
- **Copy to Clipboard** — button turns green with "Copied!" feedback for 1 second
- **Soft Delete** — prompts move to Trash first, with Restore and Delete Forever options
- **Category Management** — create custom categories via modal dialog
- **Keyboard Shortcut** — `Ctrl/Cmd + S` to save the current prompt
- **Data Persistence** — all data stored via `chrome.storage.local`
- **First-run Seeding** — "General" category and sample prompts created automatically

## Tech Stack

- Pure HTML, CSS, and Vanilla JavaScript
- Chrome Extension Manifest V3
- No external dependencies

## File Structure

```
neumorphic-prompt-hub/
├── manifest.json       # Extension configuration (Manifest V3)
├── popup.html          # Main 3-column interface (800×550px)
├── style.css           # Neumorphic design system
├── app.js              # CRUD logic, clipboard, search, storage
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

## Design

The UI follows **Neumorphism** principles:

- **Background:** Soft grey (`#e0e0e0`)
- **Raised elements:** Double shadows — light (`-5px -5px 10px #ffffff`) and dark (`5px 5px 10px #bebebe`)
- **Pressed/active states:** Inset shadows for a "sunken" effect
- **Borders:** None — depth is created purely through shadows
- **Corners:** Soft radius (`12px–16px`)
- **Accent color:** `#6c63ff` (purple) for primary actions

## License

MIT License — feel free to use, modify, and distribute.
