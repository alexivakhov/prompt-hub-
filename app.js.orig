/* ============================================================
   NEUMORPHIC PROMPT HUB — app.js
   Core logic: CRUD operations, clipboard, search, persistence.
   Data is synced to chrome.storage.sync with local fallback.
   ============================================================ */

'use strict';

/* ── Utility: Generate a unique ID ── */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* ── Utility: Format date for display ── */
function formatDate(timestamp) {
  const d = new Date(timestamp);
  const day = d.getDate().toString().padStart(2, '0');
  const mon = (d.getMonth() + 1).toString().padStart(2, '0');
  return `${day}.${mon}.${d.getFullYear()}`;
}

/* ============================================================
   STATE
   ============================================================ */
let state = {
  prompts: [],          // Array of prompt objects
  categories: [],       // Array of category strings
  currentView: 'all',   // 'all' | 'favorites' | 'categories' | 'trash'
  selectedId: null,      // Currently selected prompt ID
  selectedCategory: null, // For category sub-filter
  searchQuery: ''        // Current search text
};

/* ── Default data for first-time run ── */
const DEFAULT_CATEGORIES = ['General'];

const DEFAULT_PROMPTS = [
  {
    id: generateId(),
    title: 'Explain Like I\'m 5',
    body: 'Explain the following concept in simple terms, as if you were explaining it to a 5-year-old child. Use analogies and examples that are easy to understand.\n\nConcept: [YOUR TOPIC]',
    category: 'General',
    favorite: false,
    trashed: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: generateId(),
    title: 'Code Review Assistant',
    body: 'Review the following code for potential bugs, performance issues, and best practice violations. Provide specific suggestions for improvement with code examples.\n\n```\n[PASTE YOUR CODE]\n```',
    category: 'General',
    favorite: true,
    trashed: false,
    createdAt: Date.now() - 1000,
    updatedAt: Date.now() - 1000
  }
];

/* ============================================================
   STORAGE — chrome.storage.sync (primary) + local (fallback)
   ============================================================ */

/**
 * Load data with migration strategy:
 * 1. Try chrome.storage.sync first (cross-device data).
 * 2. Fall back to chrome.storage.local (offline / legacy data).
 * 3. If neither has data, seed defaults (first-time run).
 */
async function loadData() {
  // Helper: wrap chrome.storage.*.get in a Promise
  function getFrom(area) {
    return new Promise((resolve) => {
      area.get(['prompts', 'categories'], (result) => resolve(result));
    });
  }

  // 1. Try sync storage first
  const syncResult = await getFrom(chrome.storage.sync);
  if (syncResult.prompts && syncResult.categories) {
    state.prompts = syncResult.prompts;
    state.categories = syncResult.categories;
    // Mirror to local for offline access
    chrome.storage.local.set({ prompts: state.prompts, categories: state.categories });
    return;
  }

  // 2. Fall back to local storage
  const localResult = await getFrom(chrome.storage.local);
  if (localResult.prompts && localResult.categories) {
    state.prompts = localResult.prompts;
    state.categories = localResult.categories;
    // Migrate local data up to sync
    saveTo(chrome.storage.sync);
    return;
  }

  // 3. First-time run — seed defaults
  state.prompts = DEFAULT_PROMPTS;
  state.categories = DEFAULT_CATEGORIES;
  saveData();
}

/** Write data to a specific storage area. */
function saveTo(area) {
  try {
    area.set({ prompts: state.prompts, categories: state.categories });
  } catch (_) {
    // Silently ignore (e.g., sync quota exceeded)
  }
}

/** Persist current state to both local and sync storage. */
function saveData() {
  const payload = { prompts: state.prompts, categories: state.categories };
  chrome.storage.local.set(payload);
  // Write to sync; silently catch quota errors
  try {
    chrome.storage.sync.set(payload);
  } catch (_) { /* sync unavailable or quota exceeded */ }
}


/* ============================================================
   DOM REFERENCES
   ============================================================ */
const $navBtns          = document.querySelectorAll('.nav-btn');
const $btnNewPrompt     = document.getElementById('btnNewPrompt');
const $searchInput      = document.getElementById('searchInput');
const $listTitle        = document.getElementById('listTitle');
const $listCount        = document.getElementById('listCount');
const $categoryList     = document.getElementById('categoryList');
const $promptList       = document.getElementById('promptList');
const $emptyState       = document.getElementById('emptyState');
const $editorForm       = document.getElementById('editorForm');
const $promptTitle      = document.getElementById('promptTitle');
const $promptCategory   = document.getElementById('promptCategory');
const $promptBody       = document.getElementById('promptBody');
const $btnFavorite      = document.getElementById('btnFavorite');
const $btnCopy          = document.getElementById('btnCopy');
const $copyLabel        = document.getElementById('copyLabel');
const $btnSave          = document.getElementById('btnSave');
const $btnDelete        = document.getElementById('btnDelete');
const $trashActions     = document.getElementById('trashActions');
const $btnRestore       = document.getElementById('btnRestore');
const $btnPermanentDelete = document.getElementById('btnPermanentDelete');
const $btnAddCategory   = document.getElementById('btnAddCategory');
const $categoryModal    = document.getElementById('categoryModal');
const $newCategoryInput = document.getElementById('newCategoryInput');
const $btnCancelCategory = document.getElementById('btnCancelCategory');
const $btnConfirmCategory = document.getElementById('btnConfirmCategory');

/* Data portability */
const $btnExport    = document.getElementById('btnExport');
const $btnImport    = document.getElementById('btnImport');
const $importFile   = document.getElementById('importFile');


/* ============================================================
   RENDERING
   ============================================================ */

/**
 * Get the filtered list of prompts based on the current view,
 * selected category, and search query.
 */
function getFilteredPrompts() {
  let list = state.prompts;

  // Filter by view
  switch (state.currentView) {
    case 'all':
      list = list.filter(p => !p.trashed);
      break;
    case 'favorites':
      list = list.filter(p => !p.trashed && p.favorite);
      break;
    case 'categories':
      list = list.filter(p => !p.trashed);
      if (state.selectedCategory) {
        list = list.filter(p => p.category === state.selectedCategory);
      }
      break;
    case 'trash':
      list = list.filter(p => p.trashed);
      break;
  }

  // Apply search filter (case-insensitive title match)
  if (state.searchQuery.trim()) {
    const q = state.searchQuery.toLowerCase();
    list = list.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.body.toLowerCase().includes(q)
    );
  }

  // Sort: newest first
  list.sort((a, b) => b.updatedAt - a.updatedAt);

  return list;
}

/** Render the prompt list in the center panel. */
function renderList() {
  const filtered = getFilteredPrompts();

  // Update header
  const viewLabels = {
    all: 'All Prompts',
    favorites: 'Favorites',
    categories: state.selectedCategory || 'Categories',
    trash: 'Trash'
  };
  $listTitle.textContent = viewLabels[state.currentView];
  $listCount.textContent = filtered.length;

  // Show/hide category sub-list
  if (state.currentView === 'categories') {
    $categoryList.classList.remove('hidden');
    renderCategorySubList();
  } else {
    $categoryList.classList.add('hidden');
  }

  // Clear and rebuild prompt list
  $promptList.innerHTML = '';

  if (filtered.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'list-empty';
    empty.textContent = state.currentView === 'trash'
      ? 'Trash is empty'
      : 'No prompts found';
    $promptList.appendChild(empty);
    return;
  }

  filtered.forEach(prompt => {
    const li = document.createElement('li');
    li.className = 'prompt-item fade-in';
    if (prompt.id === state.selectedId) li.classList.add('selected');

    li.innerHTML = `
      <div class="item-title">${escapeHtml(prompt.title || 'Untitled')}</div>
      <div class="item-meta">
        ${prompt.favorite ? '<span class="fav-indicator">★</span>' : ''}
        <span>${prompt.category}</span>
        <span>· ${formatDate(prompt.updatedAt)}</span>
      </div>
    `;

    li.addEventListener('click', () => selectPrompt(prompt.id));
    $promptList.appendChild(li);
  });
}

/** Render category sub-list buttons (visible in Categories view). */
function renderCategorySubList() {
  $categoryList.innerHTML = '';

  // "All" option
  const allBtn = document.createElement('button');
  allBtn.className = 'cat-item' + (!state.selectedCategory ? ' active' : '');
  const allCount = state.prompts.filter(p => !p.trashed).length;
  allBtn.innerHTML = `<span>All</span><span class="cat-count">${allCount}</span>`;
  allBtn.addEventListener('click', () => {
    state.selectedCategory = null;
    renderList();
  });
  $categoryList.appendChild(allBtn);

  // Each category
  state.categories.forEach(cat => {
    const count = state.prompts.filter(p => !p.trashed && p.category === cat).length;
    const btn = document.createElement('button');
    btn.className = 'cat-item' + (state.selectedCategory === cat ? ' active' : '');
    btn.innerHTML = `<span>${escapeHtml(cat)}</span><span class="cat-count">${count}</span>`;
    btn.addEventListener('click', () => {
      state.selectedCategory = cat;
      renderList();
    });
    $categoryList.appendChild(btn);
  });
}

/** Populate the category <select> dropdown in the editor. */
function renderCategorySelect(selectedCat) {
  $promptCategory.innerHTML = '';
  state.categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    if (cat === selectedCat) opt.selected = true;
    $promptCategory.appendChild(opt);
  });
}

/** Show the editor panel with the given prompt's data. */
function showEditor(prompt) {
  $emptyState.classList.add('hidden');
  $editorForm.classList.remove('hidden');

  $promptTitle.value = prompt.title;
  $promptBody.value = prompt.body;
  renderCategorySelect(prompt.category);

  // Favorite button state
  $btnFavorite.classList.toggle('active', prompt.favorite);

  // Show/hide trash-specific vs. normal actions
  const isTrashed = prompt.trashed;
  $btnCopy.parentElement.style.display = isTrashed ? 'none' : '';
  $trashActions.classList.toggle('hidden', !isTrashed);

  // Hide normal save/delete for trashed items
  $btnSave.style.display = isTrashed ? 'none' : '';
  $btnDelete.style.display = isTrashed ? 'none' : '';
}

/** Hide editor and show empty state. */
function hideEditor() {
  $emptyState.classList.remove('hidden');
  $editorForm.classList.add('hidden');
  state.selectedId = null;
}

/** Escape HTML to prevent XSS in rendered content. */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}


/* ============================================================
   ACTIONS
   ============================================================ */

/** Select a prompt by ID and display it in the editor. */
function selectPrompt(id) {
  state.selectedId = id;
  const prompt = state.prompts.find(p => p.id === id);
  if (prompt) {
    showEditor(prompt);
  }
  renderList();
}

/** Create a new blank prompt and select it. */
function createNewPrompt() {
  const newPrompt = {
    id: generateId(),
    title: '',
    body: '',
    category: state.categories[0] || 'General',
    favorite: false,
    trashed: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  state.prompts.push(newPrompt);
  state.selectedId = newPrompt.id;

  // Switch to "All" view so user can see the new prompt
  if (state.currentView === 'trash') {
    switchView('all');
  }

  saveData();
  renderList();
  showEditor(newPrompt);

  // Focus the title field for immediate typing
  $promptTitle.focus();
}

/** Save the currently selected prompt from editor fields. */
function saveCurrentPrompt() {
  if (!state.selectedId) return;

  const prompt = state.prompts.find(p => p.id === state.selectedId);
  if (!prompt) return;

  prompt.title = $promptTitle.value.trim() || 'Untitled';
  prompt.body = $promptBody.value;
  prompt.category = $promptCategory.value;
  prompt.updatedAt = Date.now();

  saveData();
  renderList();

  // Visual feedback: briefly highlight save button
  $btnSave.style.color = 'var(--success)';
  setTimeout(() => { $btnSave.style.color = ''; }, 800);
}

/** Move the selected prompt to trash (soft delete). */
function trashCurrentPrompt() {
  if (!state.selectedId) return;

  const prompt = state.prompts.find(p => p.id === state.selectedId);
  if (!prompt) return;

  prompt.trashed = true;
  prompt.updatedAt = Date.now();

  hideEditor();
  saveData();
  renderList();
}

/** Restore a trashed prompt. */
function restoreCurrentPrompt() {
  if (!state.selectedId) return;

  const prompt = state.prompts.find(p => p.id === state.selectedId);
  if (!prompt) return;

  prompt.trashed = false;
  prompt.updatedAt = Date.now();

  hideEditor();
  saveData();
  renderList();
}

/** Permanently delete a prompt from storage. */
function permanentlyDeletePrompt() {
  if (!state.selectedId) return;

  state.prompts = state.prompts.filter(p => p.id !== state.selectedId);

  hideEditor();
  saveData();
  renderList();
}

/** Toggle favorite status for the selected prompt. */
function toggleFavorite() {
  if (!state.selectedId) return;

  const prompt = state.prompts.find(p => p.id === state.selectedId);
  if (!prompt) return;

  prompt.favorite = !prompt.favorite;
  $btnFavorite.classList.toggle('active', prompt.favorite);

  saveData();
  renderList();
}

/** Copy the prompt body to the clipboard. Shows a "Copied!" tooltip. */
async function copyToClipboard() {
  if (!state.selectedId) return;

  const prompt = state.prompts.find(p => p.id === state.selectedId);
  if (!prompt) return;

  try {
    await navigator.clipboard.writeText(prompt.body);

    // Visual feedback: change button text and color for 1 second
    $copyLabel.textContent = 'Copied!';
    $btnCopy.classList.add('copied');

    setTimeout(() => {
      $copyLabel.textContent = 'Copy';
      $btnCopy.classList.remove('copied');
    }, 1000);
  } catch (err) {
    // Fallback: older clipboard method
    const textarea = document.createElement('textarea');
    textarea.value = prompt.body;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);

    $copyLabel.textContent = 'Copied!';
    $btnCopy.classList.add('copied');
    setTimeout(() => {
      $copyLabel.textContent = 'Copy';
      $btnCopy.classList.remove('copied');
    }, 1000);
  }
}

/** Switch the sidebar navigation view. */
function switchView(view) {
  state.currentView = view;
  state.selectedCategory = null;

  // Update active nav button
  $navBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });

  // Deselect current prompt when switching views
  hideEditor();
  renderList();
}

/** Open the "New Category" modal. */
function openCategoryModal() {
  $newCategoryInput.value = '';
  $categoryModal.classList.remove('hidden');
  $newCategoryInput.focus();
}

/** Close the "New Category" modal. */
function closeCategoryModal() {
  $categoryModal.classList.add('hidden');
}

/** Confirm creation of a new category. */
function confirmNewCategory() {
  const name = $newCategoryInput.value.trim();
  if (!name) return;

  // Prevent duplicate category names (case-insensitive)
  const exists = state.categories.some(
    c => c.toLowerCase() === name.toLowerCase()
  );
  if (exists) {
    $newCategoryInput.style.boxShadow =
      'var(--shadow-inset), 0 0 0 2px rgba(224, 85, 85, 0.3)';
    setTimeout(() => {
      $newCategoryInput.style.boxShadow = '';
    }, 1000);
    return;
  }

  state.categories.push(name);
  saveData();

  // Update the category selector to include the new one
  if (state.selectedId) {
    renderCategorySelect(name);
    $promptCategory.value = name;
  }

  closeCategoryModal();
  renderList();
}


/* ============================================================
   DATA PORTABILITY — Export / Import
   ============================================================ */

/**
 * Export the current state (prompts + categories) as a
 * formatted .json file download.
 */
function exportData() {
  const exportPayload = {
    version: '1.1.0',
    exportedAt: new Date().toISOString(),
    categories: state.categories,
    prompts: state.prompts
  };

  const json = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);

  // Create a temporary <a> to trigger the download
  const a = document.createElement('a');
  a.href = url;
  a.download = `prompt-hub-backup-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Import prompts from a .json file chosen by the user.
 * Shows a confirm dialog before overwriting current data.
 */
function importData(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);

      // Basic validation: must have prompts array and categories array
      if (!Array.isArray(data.prompts) || !Array.isArray(data.categories)) {
        alert('Invalid file format. Expected a Prompt Hub backup with "prompts" and "categories".');
        return;
      }

      const count = data.prompts.length;
      const ok = confirm(
        `This will replace all your current data with ${count} prompt(s) ` +
        `and ${data.categories.length} category/ies from the backup.\n\nContinue?`
      );
      if (!ok) return;

      // Overwrite state
      state.prompts = data.prompts;
      state.categories = data.categories;

      // Persist and re-render
      saveData();
      hideEditor();
      renderList();
    } catch (err) {
      alert('Could not parse the file. Make sure it is a valid JSON backup.');
    }
  };
  reader.readAsText(file);
}


/* ============================================================
   EVENT LISTENERS
   ============================================================ */

// Sidebar navigation
$navBtns.forEach(btn => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});

// New Prompt
$btnNewPrompt.addEventListener('click', createNewPrompt);

// Search input (real-time filtering)
$searchInput.addEventListener('input', (e) => {
  state.searchQuery = e.target.value;
  renderList();
});

// Editor actions
$btnFavorite.addEventListener('click', toggleFavorite);
$btnCopy.addEventListener('click', copyToClipboard);
$btnSave.addEventListener('click', saveCurrentPrompt);
$btnDelete.addEventListener('click', trashCurrentPrompt);
$btnRestore.addEventListener('click', restoreCurrentPrompt);
$btnPermanentDelete.addEventListener('click', permanentlyDeletePrompt);

// Category modal
$btnAddCategory.addEventListener('click', openCategoryModal);
$btnCancelCategory.addEventListener('click', closeCategoryModal);
$btnConfirmCategory.addEventListener('click', confirmNewCategory);

// Allow pressing Enter to confirm new category
$newCategoryInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') confirmNewCategory();
  if (e.key === 'Escape') closeCategoryModal();
});

// Close modal on overlay click
$categoryModal.addEventListener('click', (e) => {
  if (e.target === $categoryModal) closeCategoryModal();
});

// Data portability: Export / Import
$btnExport.addEventListener('click', exportData);
$btnImport.addEventListener('click', () => $importFile.click());
$importFile.addEventListener('change', (e) => {
  importData(e.target.files[0]);
  // Reset so the same file can be re-imported if needed
  e.target.value = '';
});

// Keyboard shortcut: Ctrl/Cmd + S to save
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    saveCurrentPrompt();
  }
});


/* ============================================================
   INITIALIZATION
   ============================================================ */
(async function init() {
  await loadData();
  renderList();
})();
