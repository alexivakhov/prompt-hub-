/* ============================================================
   NEUMORPHIC PROMPT HUB — app.js (v1.2.0)
   Added Template Variables support via Modal.
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

let currentTemplate = ''; // Template for variables processing

/* ── Default data for first-time run ── */
const DEFAULT_CATEGORIES = ['General'];

const DEFAULT_PROMPTS = [
  {
    id: generateId(),
    title: 'Explain Like I\'m 5',
    body: 'Explain the following concept in simple terms, as if you were explaining it to a 5-year-old child. Use analogies and examples that are easy to understand.\n\nConcept: {YOUR TOPIC}',
    category: 'General',
    favorite: false,
    trashed: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: generateId(),
    title: 'Code Review Assistant',
    body: 'Review the following code for potential bugs, performance issues, and best practice violations. Provide specific suggestions for improvement with code examples.\n\n```\n{PASTE YOUR CODE}\n```',
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

async function loadData() {
  function getFrom(area) {
    return new Promise((resolve) => {
      area.get(['prompts', 'categories'], (result) => resolve(result));
    });
  }

  const syncResult = await getFrom(chrome.storage.sync);
  if (syncResult.prompts && syncResult.categories) {
    state.prompts = syncResult.prompts;
    state.categories = syncResult.categories;
    chrome.storage.local.set({ prompts: state.prompts, categories: state.categories });
    return;
  }

  const localResult = await getFrom(chrome.storage.local);
  if (localResult.prompts && localResult.categories) {
    state.prompts = localResult.prompts;
    state.categories = localResult.categories;
    saveTo(chrome.storage.sync);
    return;
  }

  state.prompts = DEFAULT_PROMPTS;
  state.categories = DEFAULT_CATEGORIES;
  saveData();
}

function saveTo(area) {
  try {
    area.set({ prompts: state.prompts, categories: state.categories });
  } catch (_) {}
}

function saveData() {
  const payload = { prompts: state.prompts, categories: state.categories };
  chrome.storage.local.set(payload);
  try {
    chrome.storage.sync.set(payload);
  } catch (_) {}
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

const $btnExport    = document.getElementById('btnExport');
const $btnImport    = document.getElementById('btnImport');
const $importFile   = document.getElementById('importFile');

// Variables Modal
const $varModal = document.getElementById('variableModal');
const $varInputs = document.getElementById('varInputs');
const $btnCancelVar = document.getElementById('btnCancelVar');
const $btnConfirmVar = document.getElementById('btnConfirmVar');


/* ============================================================
   RENDERING
   ============================================================ */

function getFilteredPrompts() {
  let list = state.prompts;
  switch (state.currentView) {
    case 'all': list = list.filter(p => !p.trashed); break;
    case 'favorites': list = list.filter(p => !p.trashed && p.favorite); break;
    case 'categories':
      list = list.filter(p => !p.trashed);
      if (state.selectedCategory) list = list.filter(p => p.category === state.selectedCategory);
      break;
    case 'trash': list = list.filter(p => p.trashed); break;
  }
  if (state.searchQuery.trim()) {
    const q = state.searchQuery.toLowerCase();
    list = list.filter(p => p.title.toLowerCase().includes(q) || p.body.toLowerCase().includes(q));
  }
  list.sort((a, b) => b.updatedAt - a.updatedAt);
  return list;
}

function renderList() {
  const filtered = getFilteredPrompts();
  const viewLabels = { all: 'All Prompts', favorites: 'Favorites', categories: state.selectedCategory || 'Categories', trash: 'Trash' };
  $listTitle.textContent = viewLabels[state.currentView];
  $listCount.textContent = filtered.length;

  if (state.currentView === 'categories') {
    $categoryList.classList.remove('hidden');
    renderCategorySubList();
  } else {
    $categoryList.classList.add('hidden');
  }

  $promptList.innerHTML = '';
  if (filtered.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'list-empty';
    empty.textContent = state.currentView === 'trash' ? 'Trash is empty' : 'No prompts found';
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

function renderCategorySubList() {
  $categoryList.innerHTML = '';
  const allBtn = document.createElement('button');
  allBtn.className = 'cat-item' + (!state.selectedCategory ? ' active' : '');
  allBtn.innerHTML = `<span>All</span><span class="cat-count">${state.prompts.filter(p => !p.trashed).length}</span>`;
  allBtn.addEventListener('click', () => { state.selectedCategory = null; renderList(); });
  $categoryList.appendChild(allBtn);

  state.categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'cat-item' + (state.selectedCategory === cat ? ' active' : '');
    btn.innerHTML = `<span>${escapeHtml(cat)}</span><span class="cat-count">${state.prompts.filter(p => !p.trashed && p.category === cat).length}</span>`;
    btn.addEventListener('click', () => { state.selectedCategory = cat; renderList(); });
    $categoryList.appendChild(btn);
  });
}

function renderCategorySelect(selectedCat) {
  $promptCategory.innerHTML = '';
  state.categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat; opt.textContent = cat;
    if (cat === selectedCat) opt.selected = true;
    $promptCategory.appendChild(opt);
  });
}

function showEditor(prompt) {
  $emptyState.classList.add('hidden');
  $editorForm.classList.remove('hidden');
  $promptTitle.value = prompt.title;
  $promptBody.value = prompt.body;
  renderCategorySelect(prompt.category);
  $btnFavorite.classList.toggle('active', prompt.favorite);
  const isTrashed = prompt.trashed;
  $btnCopy.parentElement.style.display = isTrashed ? 'none' : '';
  $trashActions.classList.toggle('hidden', !isTrashed);
  $btnSave.style.display = isTrashed ? 'none' : '';
  $btnDelete.style.display = isTrashed ? 'none' : '';
}

function hideEditor() {
  $emptyState.classList.remove('hidden');
  $editorForm.classList.add('hidden');
  state.selectedId = null;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ============================================================
   ACTIONS
   ============================================================ */

function selectPrompt(id) {
  state.selectedId = id;
  const prompt = state.prompts.find(p => p.id === id);
  if (prompt) showEditor(prompt);
  renderList();
}

function createNewPrompt() {
  const newPrompt = { id: generateId(), title: '', body: '', category: state.categories[0] || 'General', favorite: false, trashed: false, createdAt: Date.now(), updatedAt: Date.now() };
  state.prompts.push(newPrompt);
  state.selectedId = newPrompt.id;
  if (state.currentView === 'trash') switchView('all');
  saveData(); renderList(); showEditor(newPrompt);
  $promptTitle.focus();
}

function saveCurrentPrompt() {
  if (!state.selectedId) return;
  const prompt = state.prompts.find(p => p.id === state.selectedId);
  if (!prompt) return;
  prompt.title = $promptTitle.value.trim() || 'Untitled';
  prompt.body = $promptBody.value;
  prompt.category = $promptCategory.value;
  prompt.updatedAt = Date.now();
  saveData(); renderList();
  $btnSave.classList.add('success-flash');
  setTimeout(() => $btnSave.classList.remove('success-flash'), 800);
}

function trashCurrentPrompt() {
  if (!state.selectedId) return;
  const prompt = state.prompts.find(p => p.id === state.selectedId);
  if (!prompt) return;
  prompt.trashed = true; prompt.updatedAt = Date.now();
  hideEditor(); saveData(); renderList();
}

function restoreCurrentPrompt() {
  if (!state.selectedId) return;
  const prompt = state.prompts.find(p => p.id === state.selectedId);
  if (!prompt) return;
  prompt.trashed = false; prompt.updatedAt = Date.now();
  hideEditor(); saveData(); renderList();
}

function permanentlyDeletePrompt() {
  if (!state.selectedId) return;
  state.prompts = state.prompts.filter(p => p.id !== state.selectedId);
  hideEditor(); saveData(); renderList();
}

function toggleFavorite() {
  if (!state.selectedId) return;
  const prompt = state.prompts.find(p => p.id === state.selectedId);
  if (!prompt) return;
  prompt.favorite = !prompt.favorite;
  $btnFavorite.classList.toggle('active', prompt.favorite);
  saveData(); renderList();
}

/* ── TEMPLATE VARIABLES ── */
function extractVariables(text) {
  // Support both {{var}} and {var}
  const regex = /\{\{?(.+?)\}?\}/g;
  const matches = []; let match;
  while ((match = regex.exec(text)) !== null) {
    const varName = match[1].trim();
    if (!matches.includes(varName)) matches.push(varName);
  }
  return matches;
}

function openVariableModal(text) {
  const vars = extractVariables(text);
  if (vars.length === 0) { performCopy(text); return; }
  currentTemplate = text;
  $varInputs.innerHTML = '';
  vars.forEach(v => {
    const div = document.createElement('div');
    div.className = 'modal-row';
    div.innerHTML = `<label>${v}</label><textarea class="modal-input var-field" data-var="${v}" placeholder="Enter value for ${v}..."></textarea>`;
    $varInputs.appendChild(div);
  });
  $varModal.classList.remove('hidden');
  const firstInput = $varInputs.querySelector('.var-field');
  if (firstInput) firstInput.focus();
}

async function performCopy(text) {
  try {
    await navigator.clipboard.writeText(text);
    $copyLabel.textContent = 'Copied!';
    $btnCopy.classList.add('copied');
    setTimeout(() => { $copyLabel.textContent = 'Copy'; $btnCopy.classList.remove('copied'); }, 1000);
  } catch (err) {
    // Fallback
    const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); document.body.removeChild(t);
    $copyLabel.textContent = 'Copied!'; $btnCopy.classList.add('copied');
    setTimeout(() => { $copyLabel.textContent = 'Copy'; $btnCopy.classList.remove('copied'); }, 1000);
  }
}

$btnConfirmVar.onclick = () => {
  let result = currentTemplate;
  $varInputs.querySelectorAll('.var-field').forEach(input => {
    const name = input.getAttribute('data-var');
    const val = input.value || `{${name}}`; // Fallback to single brace if empty
    
    // Replace all occurrences of {{name}} and {name}
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\{\\{?${escapedName}\\}?\\}`, 'g');
    result = result.replace(re, val);
  });
  performCopy(result);
  $varModal.classList.add('hidden');
};

$btnCancelVar.onclick = () => $varModal.classList.add('hidden');

async function handleCopy() {
  if (!state.selectedId) return;
  const prompt = state.prompts.find(p => p.id === state.selectedId);
  if (!prompt) return;
  openVariableModal(prompt.body);
}

function switchView(view) {
  state.currentView = view; state.selectedCategory = null;
  $navBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));
  hideEditor(); renderList();
}

function openCategoryModal() { $newCategoryInput.value = ''; $categoryModal.classList.remove('hidden'); $newCategoryInput.focus(); }
function closeCategoryModal() { $categoryModal.classList.add('hidden'); }

function confirmNewCategory() {
  const name = $newCategoryInput.value.trim();
  if (!name) return;
  if (state.categories.some(c => c.toLowerCase() === name.toLowerCase())) return;
  state.categories.push(name); saveData();
  if (state.selectedId) renderCategorySelect(name);
  closeCategoryModal(); renderList();
}

function exportData() {
  const payload = { version: '1.2.0', exportedAt: new Date().toISOString(), categories: state.categories, prompts: state.prompts };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `prompt-hub-backup-${Date.now()}.json`; a.click();
}

function importData(file) {
  if (!file) return;
  const r = new FileReader();
  r.onload = (e) => {
    try {
      const d = JSON.parse(e.target.result);
      if (!Array.isArray(d.prompts) || !Array.isArray(d.categories)) return;
      if (!confirm('Replace all data with this backup?')) return;
      state.prompts = d.prompts; state.categories = d.categories;
      saveData(); hideEditor(); renderList();
    } catch (_) { alert('Invalid backup file'); }
  };
  r.readAsText(file);
}

// Event Listeners
$navBtns.forEach(btn => btn.addEventListener('click', () => switchView(btn.dataset.view)));
$btnNewPrompt.addEventListener('click', createNewPrompt);
$searchInput.addEventListener('input', (e) => { state.searchQuery = e.target.value; renderList(); });
$btnFavorite.addEventListener('click', toggleFavorite);
$btnCopy.addEventListener('click', handleCopy);
$btnSave.addEventListener('click', saveCurrentPrompt);
$btnDelete.addEventListener('click', trashCurrentPrompt);
$btnRestore.addEventListener('click', restoreCurrentPrompt);
$btnPermanentDelete.addEventListener('click', permanentlyDeletePrompt);
$btnAddCategory.addEventListener('click', openCategoryModal);
$btnCancelCategory.addEventListener('click', closeCategoryModal);
$btnConfirmCategory.addEventListener('click', confirmNewCategory);
$newCategoryInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') confirmNewCategory(); if (e.key === 'Escape') closeCategoryModal(); });
$categoryModal.addEventListener('click', (e) => { if (e.target === $categoryModal) closeCategoryModal(); });
$btnExport.addEventListener('click', exportData);
$btnImport.addEventListener('click', () => $importFile.click());
$importFile.addEventListener('change', (e) => { importData(e.target.files[0]); e.target.value = ''; });
document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveCurrentPrompt(); } });

(async function init() { await loadData(); renderList(); })();
