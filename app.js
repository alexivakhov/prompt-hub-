/* ============================================================
   PROMPT HUB — app.js (v2.0 · Hybrid Modern)
   Keeps the existing data model; rewires to the new UI.
   ============================================================ */

'use strict';

/* ── Utils ── */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function formatRelative(ts) {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return min + 'm ago';
  const h = Math.floor(min / 60);
  if (h < 24) return h + 'h ago';
  const d = Math.floor(h / 24);
  if (d < 7) return d + 'd ago';
  const date = new Date(ts);
  return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
}
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* Palette used for category colors (stable hash) */
const CAT_COLORS = [
  '#0A84FF', '#10B981', '#F59E0B', '#A855F7', '#EC4899',
  '#14B8A6', '#F97316', '#6366F1', '#EAB308', '#06B6D4',
];
function colorFor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return CAT_COLORS[h % CAT_COLORS.length];
}

/* ============================================================
   STATE
   ============================================================ */
let state = {
  prompts: [],
  categories: [],
  currentView: 'all',
  selectedId: null,
  selectedCategory: null,
  searchQuery: '',
  theme: 'light',
};

let currentTemplate = '';

const DEFAULT_CATEGORIES = ['Dev', 'Writing', 'Learning'];
const DEFAULT_PROMPTS = [
  {
    id: generateId(),
    title: 'Explain Like I\'m 5',
    body: 'Explain the following concept in simple terms, as if you were explaining it to a 5-year-old child. Use analogies and examples that are easy to understand.\n\nConcept: {{topic}}',
    category: 'Learning',
    favorite: false, trashed: false,
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now() - 3600000,
  },
  {
    id: generateId(),
    title: 'Code Review Assistant',
    body: 'Review the following code for potential bugs, performance issues, and best practice violations. Provide specific suggestions for improvement with code examples.\n\nLanguage: {{language}}\n\nCode:\n```\n{{paste_code}}\n```\n\nFocus on: {{priorities}}',
    category: 'Dev',
    favorite: true, trashed: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

/* ============================================================
   STORAGE — chrome.storage (with localStorage fallback for dev)
   ============================================================ */
const hasChrome = typeof chrome !== 'undefined' && chrome.storage;

function getFromArea(area) {
  return new Promise((resolve) => {
    area.get(['prompts', 'categories', 'theme'], resolve);
  });
}

async function loadData() {
  if (!hasChrome) {
    try {
      const data = JSON.parse(localStorage.getItem('promptHub') || 'null');
      if (data && data.prompts && data.categories) {
        state.prompts = data.prompts;
        state.categories = data.categories;
        state.theme = data.theme || 'light';
        return;
      }
    } catch (_) {}
    state.prompts = DEFAULT_PROMPTS;
    state.categories = DEFAULT_CATEGORIES;
    saveData();
    return;
  }

  const sync  = await getFromArea(chrome.storage.sync);
  const local = await getFromArea(chrome.storage.local);

  const hasSync  = sync.prompts  && sync.categories;
  const hasLocal = local.prompts && local.categories;

  if (hasSync && hasLocal) {
    const sMax = Math.max(0, ...sync.prompts.map(p => p.updatedAt || 0));
    const lMax = Math.max(0, ...local.prompts.map(p => p.updatedAt || 0));
    const src = lMax >= sMax ? local : sync;
    state.prompts = src.prompts;
    state.categories = src.categories;
    state.theme = local.theme || sync.theme || 'light';
    return;
  }
  if (hasLocal) {
    state.prompts = local.prompts;
    state.categories = local.categories;
    state.theme = local.theme || 'light';
    return;
  }
  if (hasSync) {
    state.prompts = sync.prompts;
    state.categories = sync.categories;
    state.theme = sync.theme || 'light';
    chrome.storage.local.set({ prompts: state.prompts, categories: state.categories, theme: state.theme });
    return;
  }
  state.prompts = DEFAULT_PROMPTS;
  state.categories = DEFAULT_CATEGORIES;
  saveData();
}

function saveData() {
  const payload = { prompts: state.prompts, categories: state.categories, theme: state.theme };
  if (!hasChrome) {
    try { localStorage.setItem('promptHub', JSON.stringify(payload)); } catch (_) {}
    return;
  }
  chrome.storage.local.set(payload);
  try {
    const bytes = new Blob([JSON.stringify(payload)]).size;
    if (bytes < 8192) chrome.storage.sync.set(payload);
  } catch (_) {}
}

/* ============================================================
   DOM REFS
   ============================================================ */
const $ = (id) => document.getElementById(id);

const refs = {
  navs: document.querySelectorAll('.icon-nav .icon-btn[data-view]'),
  listTitle: $('listTitle'),
  listCount: $('listCount'),
  searchInput: $('searchInput'),
  categoryList: $('categoryList'),
  promptList: $('promptList'),

  emptyState: $('emptyState'),
  editorForm: $('editorForm'),
  catPill: $('catPill'),
  catDot: $('catDot'),
  catLabel: $('catLabel'),
  metaInfo: $('metaInfo'),
  btnFavorite: $('btnFavorite'),
  btnChangeCat: $('btnChangeCat'),
  promptTitle: $('promptTitle'),
  promptBody: $('promptBody'),
  bodyMeta: $('bodyMeta'),

  btnListNew: $('btnListNew'),
  btnCopy: $('btnCopy'),
  copyLabel: $('copyLabel'),
  btnSave: $('btnSave'),
  btnDelete: $('btnDelete'),
  trashActions: $('trashActions'),
  btnRestore: $('btnRestore'),
  btnPermanentDelete: $('btnPermanentDelete'),

  btnImport: $('btnImport'),
  btnExport: $('btnExport'),
  btnTheme: $('btnTheme'),
  importFile: $('importFile'),

  catMenu: $('catMenu'),
  catModal: $('categoryModal'),
  newCategoryInput: $('newCategoryInput'),
  btnCancelCategory: $('btnCancelCategory'),
  btnConfirmCategory: $('btnConfirmCategory'),

  varModal: $('variableModal'),
  varInputs: $('varInputs'),
  btnCancelVar: $('btnCancelVar'),
  btnConfirmVar: $('btnConfirmVar'),

  toast: $('toast'),
};

/* ============================================================
   THEME
   ============================================================ */
function applyTheme(t) {
  document.documentElement.classList.remove('theme-light', 'theme-dark');
  document.documentElement.classList.add('theme-' + t);
  state.theme = t;
}
function toggleTheme() {
  applyTheme(state.theme === 'dark' ? 'light' : 'dark');
  saveData();
}

/* ============================================================
   TOAST
   ============================================================ */
let toastTimer;
function showToast(msg) {
  refs.toast.textContent = msg;
  refs.toast.classList.remove('hidden');
  requestAnimationFrame(() => refs.toast.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    refs.toast.classList.remove('show');
    setTimeout(() => refs.toast.classList.add('hidden'), 250);
  }, 1600);
}

/* ============================================================
   RENDER
   ============================================================ */
function getFilteredPrompts() {
  let list = state.prompts;
  switch (state.currentView) {
    case 'all':       list = list.filter(p => !p.trashed); break;
    case 'favorites': list = list.filter(p => !p.trashed && p.favorite); break;
    case 'categories':
      list = list.filter(p => !p.trashed);
      if (state.selectedCategory) list = list.filter(p => p.category === state.selectedCategory);
      break;
    case 'trash':     list = list.filter(p => p.trashed); break;
  }
  if (state.searchQuery.trim()) {
    const q = state.searchQuery.toLowerCase();
    list = list.filter(p =>
      (p.title || '').toLowerCase().includes(q) ||
      (p.body  || '').toLowerCase().includes(q)
    );
  }
  list.sort((a, b) => b.updatedAt - a.updatedAt);
  return list;
}

function renderList() {
  const filtered = getFilteredPrompts();
  const titles = {
    all: 'All prompts',
    favorites: 'Favorites',
    categories: state.selectedCategory || 'Categories',
    trash: 'Trash',
  };
  refs.listTitle.textContent = titles[state.currentView];
  refs.listCount.textContent = filtered.length;

  // Category sub-list
  if (state.currentView === 'categories') {
    refs.categoryList.classList.remove('hidden');
    renderCategorySubList();
  } else {
    refs.categoryList.classList.add('hidden');
  }

  refs.promptList.innerHTML = '';
  if (filtered.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'list-empty';
    empty.textContent = state.currentView === 'trash' ? 'Trash is empty' : 'No prompts found';
    refs.promptList.appendChild(empty);
    return;
  }

  filtered.forEach(p => {
    const li = document.createElement('li');
    li.className = 'prompt-item';
    if (p.id === state.selectedId) li.classList.add('selected');
    li.innerHTML = `
      <div class="item-top">
        <span class="dot" style="background:${colorFor(p.category)}"></span>
        <span class="item-cat">${escapeHtml(p.category || 'Misc')}</span>
        ${p.favorite ? `
          <span class="item-fav">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77 5.82 21.02 7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </span>` : ''}
        <span class="item-date">${formatRelative(p.updatedAt)}</span>
      </div>
      <div class="item-title">${escapeHtml(p.title || 'Untitled')}</div>
    `;
    li.addEventListener('click', () => selectPrompt(p.id));
    refs.promptList.appendChild(li);
  });
}

function renderCategorySubList() {
  refs.categoryList.innerHTML = '';
  const activePrompts = state.prompts.filter(p => !p.trashed);

  const all = document.createElement('button');
  all.className = 'cat-item' + (!state.selectedCategory ? ' active' : '');
  all.innerHTML = `<span class="dot" style="background:var(--text-faint)"></span><span class="label">All</span><span class="count">${activePrompts.length}</span>`;
  all.addEventListener('click', () => { state.selectedCategory = null; renderList(); });
  refs.categoryList.appendChild(all);

  state.categories.forEach(cat => {
    const wrap = document.createElement('div');
    wrap.className = 'cat-item-wrap' + (state.selectedCategory === cat ? ' active' : '');
    const count = activePrompts.filter(p => p.category === cat).length;
    wrap.innerHTML = `
      <button class="cat-item-main">
        <span class="dot" style="background:${colorFor(cat)}"></span>
        <span class="label">${escapeHtml(cat)}</span>
        <span class="count">${count}</span>
      </button>
      <button class="cat-item-del" title="Delete category" aria-label="Delete ${escapeHtml(cat)}">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
        </svg>
      </button>
    `;
    wrap.querySelector('.cat-item-main').addEventListener('click', () => { state.selectedCategory = cat; renderList(); });
    wrap.querySelector('.cat-item-del').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteCategory(cat);
    });
    refs.categoryList.appendChild(wrap);
  });
}

function showEditor(prompt) {
  refs.emptyState.classList.add('hidden');
  refs.editorForm.classList.remove('hidden');

  refs.promptTitle.value = prompt.title || '';
  refs.promptBody.value = prompt.body || '';
  refs.catDot.style.background = colorFor(prompt.category);
  refs.catLabel.textContent = prompt.category || 'Misc';
  refs.catPill.style.color = colorFor(prompt.category);
  refs.catPill.style.background = colorFor(prompt.category) + '1A'; // ~10% alpha
  refs.metaInfo.textContent = '· Updated ' + formatRelative(prompt.updatedAt);
  refs.btnFavorite.classList.toggle('fav-active', !!prompt.favorite);

  updateBodyMeta();

  const trashed = !!prompt.trashed;
  // Toggle normal vs trash action rows
  document.querySelector('.actions:not(#trashActions)').classList.toggle('hidden', trashed);
  refs.trashActions.classList.toggle('hidden', !trashed);
}

function hideEditor() {
  refs.emptyState.classList.remove('hidden');
  refs.editorForm.classList.add('hidden');
  state.selectedId = null;
}

function updateBodyMeta() {
  const t = refs.promptBody.value;
  refs.bodyMeta.textContent = t.length + ' chars';
}

/* ============================================================
   ACTIONS
   ============================================================ */
function selectPrompt(id) {
  state.selectedId = id;
  const p = state.prompts.find(p => p.id === id);
  if (p) showEditor(p);
  renderList();
}

function createNewPrompt() {
  const p = {
    id: generateId(),
    title: '', body: '',
    category: state.categories[0] || 'Misc',
    favorite: false, trashed: false,
    createdAt: Date.now(), updatedAt: Date.now(),
  };
  state.prompts.push(p);
  state.selectedId = p.id;
  if (state.currentView === 'trash') switchView('all');
  saveData();
  renderList();
  showEditor(p);
  refs.promptTitle.focus();
}

function saveCurrentPrompt(silent) {
  if (!state.selectedId) return;
  const p = state.prompts.find(p => p.id === state.selectedId);
  if (!p) return;
  p.title = refs.promptTitle.value.trim() || 'Untitled';
  p.body = refs.promptBody.value;
  p.updatedAt = Date.now();
  saveData();
  renderList();
  if (!silent) {
    refs.btnSave.classList.add('save-flash');
    setTimeout(() => refs.btnSave.classList.remove('save-flash'), 700);
    showToast('Saved');
  }
  refs.metaInfo.textContent = '· Updated ' + formatRelative(p.updatedAt);
}

function trashCurrent() {
  if (!state.selectedId) return;
  const p = state.prompts.find(p => p.id === state.selectedId);
  if (!p) return;
  p.trashed = true; p.updatedAt = Date.now();
  hideEditor(); saveData(); renderList();
  showToast('Moved to trash');
}

function restoreCurrent() {
  if (!state.selectedId) return;
  const p = state.prompts.find(p => p.id === state.selectedId);
  if (!p) return;
  p.trashed = false; p.updatedAt = Date.now();
  hideEditor(); saveData(); renderList();
  showToast('Restored');
}

function permanentlyDelete() {
  if (!state.selectedId) return;
  state.prompts = state.prompts.filter(p => p.id !== state.selectedId);
  hideEditor(); saveData(); renderList();
  showToast('Deleted forever');
}

function toggleFavorite() {
  if (!state.selectedId) return;
  const p = state.prompts.find(p => p.id === state.selectedId);
  if (!p) return;
  p.favorite = !p.favorite;
  p.updatedAt = Date.now();
  refs.btnFavorite.classList.toggle('fav-active', p.favorite);
  saveData(); renderList();
}

/* Delete a category. Prompts in it become 'Misc'. */
function deleteCategory(cat) {
  const count = state.prompts.filter(p => p.category === cat && !p.trashed).length;
  const msg = count > 0
    ? `Delete category "${cat}"?\n\n${count} prompt${count > 1 ? 's' : ''} will be moved to "Misc".`
    : `Delete category "${cat}"?`;
  if (!confirm(msg)) return;

  state.categories = state.categories.filter(c => c !== cat);
  if (!state.categories.includes('Misc')) state.categories.push('Misc');

  state.prompts.forEach(p => {
    if (p.category === cat) p.category = 'Misc';
  });

  if (state.selectedCategory === cat) state.selectedCategory = null;

  saveData();
  renderList();
  closeCategoryMenu();

  if (state.selectedId) {
    const sel = state.prompts.find(p => p.id === state.selectedId);
    if (sel) showEditor(sel);
  }

  showToast('Category deleted');
}

/* ── Category menu (dropdown over toolbar) ── */
function openCategoryMenu() {
  const rect = refs.btnChangeCat.getBoundingClientRect();
  refs.catMenu.style.top = (rect.bottom + 6) + 'px';
  refs.catMenu.style.right = (window.innerWidth - rect.right) + 'px';
  refs.catMenu.style.left = 'auto';

  const p = state.prompts.find(p => p.id === state.selectedId);
  const current = p ? p.category : null;

  refs.catMenu.innerHTML = '';
  state.categories.forEach(cat => {
    const row = document.createElement('div');
    row.className = 'cat-menu-row';
    row.innerHTML = `
      <button class="cat-menu-item cat-menu-pick">
        <span class="dot" style="background:${colorFor(cat)}"></span>
        <span class="cat-name">${escapeHtml(cat)}</span>
        ${cat === current ? '<span class="cat-check">✓</span>' : ''}
      </button>
      <button class="cat-menu-del" title="Delete category" aria-label="Delete ${escapeHtml(cat)}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
        </svg>
      </button>
    `;
    row.querySelector('.cat-menu-pick').addEventListener('click', () => {
      if (!state.selectedId) return;
      const pr = state.prompts.find(p => p.id === state.selectedId);
      if (!pr) return;
      pr.category = cat;
      pr.updatedAt = Date.now();
      saveData(); renderList();
      showEditor(pr);
      closeCategoryMenu();
    });
    row.querySelector('.cat-menu-del').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteCategory(cat);
    });
    refs.catMenu.appendChild(row);
  });

  const divider = document.createElement('div');
  divider.className = 'cat-menu-divider';
  refs.catMenu.appendChild(divider);

  const add = document.createElement('button');
  add.className = 'cat-menu-item cat-menu-add';
  add.innerHTML = `<span style="width:8px;height:8px;display:inline-block;font-size:11px;">+</span> New category`;
  add.addEventListener('click', () => {
    closeCategoryMenu();
    openCategoryModal();
  });
  refs.catMenu.appendChild(add);

  refs.catMenu.classList.remove('hidden');
}

function closeCategoryMenu() {
  refs.catMenu.classList.add('hidden');
}

/* ── Variables modal ── */
function extractVariables(text) {
  const regex = /\{\{([^{}]+?)\}\}/g;
  const matches = []; let m;
  while ((m = regex.exec(text)) !== null) {
    const name = m[1].trim();
    if (!matches.includes(name) && name.length < 80) matches.push(name);
  }
  return matches;
}

async function copyToClipboard(text) {
  try { await navigator.clipboard.writeText(text); }
  catch (_) {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta);
    ta.select(); document.execCommand('copy');
    document.body.removeChild(ta);
  }
}

function handleCopy() {
  if (!state.selectedId) return;
  const p = state.prompts.find(p => p.id === state.selectedId);
  if (!p) return;
  const vars = extractVariables(p.body || '');
  if (vars.length === 0) {
    performCopy(p.body || '');
    return;
  }
  openVariableModal(p.body, vars);
}

function openVariableModal(text, vars) {
  currentTemplate = text;
  refs.varInputs.innerHTML = '';
  vars.forEach(v => {
    const row = document.createElement('div');
    row.className = 'var-row';

    const label = document.createElement('label');
    const mono = document.createElement('span');
    mono.className = 'mono';
    mono.textContent = `{{${v}}}`;
    label.appendChild(mono);

    const ta = document.createElement('textarea');
    ta.className = 'var-field';
    ta.setAttribute('data-var', v);
    ta.placeholder = `Enter value for ${v}…`;

    row.appendChild(label);
    row.appendChild(ta);
    refs.varInputs.appendChild(row);
  });
  refs.varModal.classList.remove('hidden');
  setTimeout(() => {
    const first = refs.varInputs.querySelector('textarea');
    if (first) first.focus();
  }, 50);
}

refs.btnConfirmVar.addEventListener('click', () => {
  let result = currentTemplate;
  refs.varInputs.querySelectorAll('.var-field').forEach(inp => {
    const name = inp.getAttribute('data-var');
    const val  = inp.value || `{{${name}}}`;
    const esc  = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re   = new RegExp(`\\{\\{${esc}\\}\\}`, 'g');
    result = result.replace(re, val);
  });
  refs.varModal.classList.add('hidden');
  performCopy(result);
});
refs.btnCancelVar.addEventListener('click', () => refs.varModal.classList.add('hidden'));

async function performCopy(text) {
  await copyToClipboard(text);
  refs.copyLabel.textContent = 'Copied!';
  refs.btnCopy.classList.add('copied');
  setTimeout(() => {
    refs.copyLabel.textContent = 'Copy prompt';
    refs.btnCopy.classList.remove('copied');
  }, 1200);
}

/* ── Navigation ── */
function switchView(view) {
  state.currentView = view;
  state.selectedCategory = null;
  refs.navs.forEach(b => b.classList.toggle('active', b.dataset.view === view));
  hideEditor();
  renderList();
}

/* ── Category modal ── */
function openCategoryModal() {
  refs.newCategoryInput.value = '';
  refs.catModal.classList.remove('hidden');
  setTimeout(() => refs.newCategoryInput.focus(), 50);
}
function closeCategoryModal() { refs.catModal.classList.add('hidden'); }
function confirmNewCategory() {
  const name = refs.newCategoryInput.value.trim();
  if (!name) return;
  if (state.categories.some(c => c.toLowerCase() === name.toLowerCase())) {
    closeCategoryModal();
    return;
  }
  state.categories.push(name);
  // If editor has a prompt, assign new category
  if (state.selectedId) {
    const p = state.prompts.find(p => p.id === state.selectedId);
    if (p) { p.category = name; p.updatedAt = Date.now(); showEditor(p); }
  }
  saveData();
  renderList();
  closeCategoryModal();
}

/* ── Import / Export ── */
function exportData() {
  const payload = {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    categories: state.categories,
    prompts: state.prompts,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `prompt-hub-backup-${Date.now()}.json`;
  a.click();
  showToast('Exported');
}

function importData(file) {
  if (!file) return;
  const r = new FileReader();
  r.onload = (e) => {
    try {
      const d = JSON.parse(e.target.result);
      if (!Array.isArray(d.prompts) || !Array.isArray(d.categories)) {
        showToast('Invalid file'); return;
      }
      if (!confirm('Replace all current data with this backup?')) return;
      state.prompts = d.prompts;
      state.categories = d.categories;
      saveData(); hideEditor(); renderList();
      showToast('Imported');
    } catch (_) { showToast('Invalid file'); }
  };
  r.readAsText(file);
}

/* ============================================================
   EVENT WIRING
   ============================================================ */
refs.navs.forEach(btn => btn.addEventListener('click', () => switchView(btn.dataset.view)));
refs.searchInput.addEventListener('input', (e) => {
  state.searchQuery = e.target.value;
  renderList();
});

refs.btnListNew.addEventListener('click', createNewPrompt);
refs.btnCopy.addEventListener('click', handleCopy);
refs.btnSave.addEventListener('click', () => saveCurrentPrompt(false));
refs.btnDelete.addEventListener('click', trashCurrent);
refs.btnRestore.addEventListener('click', restoreCurrent);
refs.btnPermanentDelete.addEventListener('click', permanentlyDelete);
refs.btnFavorite.addEventListener('click', toggleFavorite);

refs.btnChangeCat.addEventListener('click', (e) => {
  e.stopPropagation();
  if (refs.catMenu.classList.contains('hidden')) openCategoryMenu();
  else closeCategoryMenu();
});
refs.catPill.addEventListener('click', (e) => {
  e.stopPropagation();
  refs.btnChangeCat.click();
});
document.addEventListener('click', (e) => {
  if (!refs.catMenu.contains(e.target) && e.target !== refs.btnChangeCat) {
    closeCategoryMenu();
  }
});

refs.promptTitle.addEventListener('input', () => {
  if (!state.selectedId) return;
  const p = state.prompts.find(p => p.id === state.selectedId);
  if (p) { p.title = refs.promptTitle.value.trim() || 'Untitled'; p.updatedAt = Date.now(); saveData(); renderList(); }
});
refs.promptBody.addEventListener('input', () => {
  updateBodyMeta();
  if (!state.selectedId) return;
  const p = state.prompts.find(p => p.id === state.selectedId);
  if (p) { p.body = refs.promptBody.value; p.updatedAt = Date.now(); saveData(); }
});

refs.btnImport.addEventListener('click', () => refs.importFile.click());
refs.btnExport.addEventListener('click', exportData);
refs.importFile.addEventListener('change', (e) => {
  importData(e.target.files[0]);
  e.target.value = '';
});

refs.btnTheme.addEventListener('click', toggleTheme);

refs.btnCancelCategory.addEventListener('click', closeCategoryModal);
refs.btnConfirmCategory.addEventListener('click', confirmNewCategory);
refs.newCategoryInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') confirmNewCategory();
  if (e.key === 'Escape') closeCategoryModal();
});
refs.catModal.addEventListener('click', (e) => {
  if (e.target === refs.catModal) closeCategoryModal();
});
refs.varModal.addEventListener('click', (e) => {
  if (e.target === refs.varModal) refs.varModal.classList.add('hidden');
});

/* Keyboard shortcuts */
document.addEventListener('keydown', (e) => {
  const cmd = e.ctrlKey || e.metaKey;
  if (cmd && e.key === 's') { e.preventDefault(); saveCurrentPrompt(false); }
  if (cmd && e.key === 'Enter') {
    if (!refs.editorForm.classList.contains('hidden')) { e.preventDefault(); handleCopy(); }
  }
  if (cmd && e.key === 'n') { e.preventDefault(); createNewPrompt(); }
  if (cmd && e.key === 'k') { e.preventDefault(); refs.searchInput.focus(); }
  if (e.key === 'Escape') {
    if (!refs.varModal.classList.contains('hidden')) refs.varModal.classList.add('hidden');
    else if (!refs.catModal.classList.contains('hidden')) closeCategoryModal();
    else closeCategoryMenu();
  }
});

/* ============================================================
   INIT
   ============================================================ */
(async function init() {
  await loadData();
  applyTheme(state.theme || 'light');
  renderList();
})();
