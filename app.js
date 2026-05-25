/* ═══════════════════════════════════════════════
   LesMichels — app.js
═══════════════════════════════════════════════ */

// ──────────────────────────────────────────────
// Pseudo utilisateur
// ──────────────────────────────────────────────
let currentPseudo = sessionStorage.getItem('lesmichels_pseudo') || null;

function setupPseudoModal() {
  const modal  = document.getElementById('modal-pseudo');
  const input  = document.getElementById('pseudo-input');
  const btn    = document.getElementById('pseudo-confirm');

  if (currentPseudo) {
    modal.classList.add('hidden');
    return;
  }

  const confirm = () => {
    const val = input.value.trim();
    if (!val) return;
    currentPseudo = val;
    sessionStorage.setItem('lesmichels_pseudo', val);
    modal.classList.add('hidden');
  };

  btn.addEventListener('click', confirm);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') confirm(); });
  setTimeout(() => input.focus(), 100);
}

setupPseudoModal();

// ──────────────────────────────────────────────
// Firebase — références
// ──────────────────────────────────────────────
const _dbBingo = window._db.ref('bingo');

// ──────────────────────────────────────────────
// État global Bingo
// ──────────────────────────────────────────────
const AVAILABLE_FONTS = [
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Impact', value: 'Impact, fantasy' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Courier New', value: '"Courier New", monospace' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
  { label: 'Space Mono', value: '"Space Mono", monospace' },
];

function defaultTheme(name) {
  return {
    id: uid(),
    name,
    elements: [],
    grids: [],
    activeGridId: null,
    cellFontScale: 1,
    cellFont: AVAILABLE_FONTS[0].value,
  };
}

function defaultGrid(name) {
  return { id: uid(), name, gridSize: 4, grid: [] };
}

function migrateState(raw) {
  if (!raw) return null;

  // Ancien format v1 : { elements, grids, activeGridId }
  if (raw.elements && raw.grids && !raw.themes) {
    const theme = defaultTheme('Soirée 1');
    theme.elements = raw.elements || [];
    theme.grids    = raw.grids || [];
    theme.activeGridId = raw.activeGridId || null;
    return { themes: [theme], activeThemeId: theme.id };
  }

  if (!raw.themes || raw.themes.length === 0) return null;
  return raw;
}

let state = initState();
let _bingoRemoteUpdate = false;

function initState() {
  return { themes: [], activeThemeId: null };
}

function activeTheme() {
  if (!state.themes || state.themes.length === 0) return null;
  return state.themes.find(t => t.id === state.activeThemeId) || null;
}

function activeGrid() {
  const t = activeTheme();
  if (!t) return null;
  return t.grids.find(g => g.id === t.activeGridId) || t.grids[0] || null;
}

// ──────────────────────────────────────────────
// Utilitaires
// ──────────────────────────────────────────────
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Sérialise l'état pour Firebase (supprime les undefined, convertit les tableaux)
function sanitizeForFirebase(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function saveState() {
  if (_bingoRemoteUpdate) return;
  _dbBingo.set(sanitizeForFirebase(state)).catch(e => console.warn('Bingo save error:', e));
}

// ──────────────────────────────────────────────
// Éléments DOM
// ──────────────────────────────────────────────
const inputEl          = document.getElementById('new-element-input');
const btnAdd           = document.getElementById('btn-add-element');
const listActive       = document.getElementById('elements-list');
const listArchived     = document.getElementById('elements-archived');
const elementCount     = document.getElementById('element-count');
const tabBtns          = document.querySelectorAll('.tab-btn');
const gridEl           = document.getElementById('bingo-grid');
const bingoMsg         = document.getElementById('bingo-message');
const sizeDisplay      = document.getElementById('grid-size-display');
const btnSizeMinus     = document.getElementById('btn-size-minus');
const btnSizePlus      = document.getElementById('btn-size-plus');
const btnGenerate      = document.getElementById('btn-generate');
const btnManual        = document.getElementById('btn-manual');
const btnReset         = document.getElementById('btn-reset');
const gridError        = document.getElementById('grid-error');
const gridsList        = document.getElementById('grids-list');
const btnNewGrid       = document.getElementById('btn-new-grid');
const themesList       = document.getElementById('themes-list');
const btnNewTheme      = document.getElementById('btn-new-theme');
const btnFontMinus       = document.getElementById('btn-font-minus');
const btnFontPlus        = document.getElementById('btn-font-plus');
const fontScaleInput     = document.getElementById('font-scale-input');
const fontFamilySelect   = document.getElementById('font-family-select');
const gridWrapper        = document.getElementById('grid-wrapper');
const btnArchivedThemes     = document.getElementById('btn-archived-themes');
const modalArchivedThemes   = document.getElementById('modal-archived-themes');
const btnCloseArchivedModal = document.getElementById('btn-close-archived-modal');
const archivedThemesList    = document.getElementById('archived-themes-list');

// ──────────────────────────────────────────────
// Rendu : liste d'éléments
// ──────────────────────────────────────────────
function renderElements() {
  const t = activeTheme();
  if (!t) {
    listActive.innerHTML = '';
    listArchived.innerHTML = '';
    elementCount.textContent = '0';
    return;
  }
  const active   = t.elements.filter(e => !e.archived);
  const archived = t.elements.filter(e => e.archived);

  elementCount.textContent = active.length;

  listActive.innerHTML = '';
  active.forEach(el => {
    listActive.appendChild(buildElementItem(el, false));
  });

  listArchived.innerHTML = '';
  archived.forEach(el => {
    listArchived.appendChild(buildElementItem(el, true));
  });
}

function buildElementItem(el, isArchived) {
  const li = document.createElement('li');

  // En mode manuel, griser les éléments déjà placés sur la grille
  const g = activeGrid();
  const isPlaced = manualMode && g && g.grid.some(cell => cell.elementId === el.id);
  li.className = 'element-item' + (isArchived ? ' archived' : '') + (isPlaced ? ' placed' : '');
  li.dataset.id = el.id;

  const span = document.createElement('span');
  span.className = 'element-text';
  span.textContent = el.text;
  li.appendChild(span);

  if (!isArchived) {
    li.draggable = true;
    li.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', el.id);
      li.classList.add('dragging');
    });
    li.addEventListener('dragend', () => li.classList.remove('dragging'));

    const btnEdit = document.createElement('button');
    btnEdit.className = 'elem-btn edit';
    btnEdit.title = 'Modifier';
    btnEdit.textContent = '✏';
    btnEdit.addEventListener('click', () => startEditElement(el.id, span));
    li.appendChild(btnEdit);

    const btnArch = document.createElement('button');
    btnArch.className = 'elem-btn archive';
    btnArch.title = 'Archiver';
    btnArch.textContent = '📦';
    btnArch.addEventListener('click', () => archiveElement(el.id));
    li.appendChild(btnArch);
  } else {
    const btnRestore = document.createElement('button');
    btnRestore.className = 'elem-btn restore';
    btnRestore.title = 'Restaurer';
    btnRestore.textContent = '↩';
    btnRestore.addEventListener('click', () => restoreElement(el.id));
    li.appendChild(btnRestore);
  }

  const btnDel = document.createElement('button');
  btnDel.className = 'elem-btn delete';
  btnDel.title = 'Supprimer';
  btnDel.textContent = '✕';
  btnDel.addEventListener('click', () => deleteElement(el.id));
  li.appendChild(btnDel);

  return li;
}

function startEditElement(id, span) {
  const t = activeTheme();
  if (!t) return;
  const el = t.elements.find(e => e.id === id);
  if (!el) return;

  const input = document.createElement('input');
  input.className = 'element-edit-input';
  input.value = el.text;
  input.maxLength = 80;

  const commit = () => {
    const newText = input.value.trim();
    if (newText) el.text = newText;
    saveState();
    renderElements();
    renderGrid();
  };

  input.addEventListener('blur', commit);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') input.blur();
    if (e.key === 'Escape') { input.value = el.text; input.blur(); }
  });

  span.replaceWith(input);
  input.focus();
  input.select();
}

// ──────────────────────────────────────────────
// Actions sur les éléments
// ──────────────────────────────────────────────
function addElement() {
  const text = inputEl.value.trim();
  if (!text) return;

  const t = activeTheme();
  if (!t) return;
  t.elements.push({ id: uid(), text, archived: false });
  inputEl.value = '';
  saveState();
  renderElements();
  renderGrid();
}

function deleteElement(id) {
  const t = activeTheme();
  if (!t) return;
  t.elements = t.elements.filter(e => e.id !== id);
  t.grids.forEach(g => {
    g.grid = g.grid.map(cell =>
      cell.elementId === id ? { elementId: null, checked: false } : cell
    );
  });
  saveState();
  renderElements();
  renderGrid();
}

function archiveElement(id) {
  const t = activeTheme();
  if (!t) return;
  const el = t.elements.find(e => e.id === id);
  if (el) el.archived = true;
  saveState();
  renderElements();
}

function restoreElement(id) {
  const t = activeTheme();
  if (!t) return;
  const el = t.elements.find(e => e.id === id);
  if (el) el.archived = false;
  saveState();
  renderElements();
}

// ──────────────────────────────────────────────
// Thèmes
// ──────────────────────────────────────────────
function createTheme(name) {
  const t = defaultTheme(name);
  state.themes.push(t);
  state.activeThemeId = t.id;
  saveState();
  renderThemesList();
  renderElements();
  renderGridsList();
  renderGrid();
}

function switchTheme(id) {
  state.activeThemeId = id;
  saveState();
  renderThemesList();
  renderElements();
  renderGridsList();
  renderGrid();
}

function deleteTheme(id) {
  state.themes = state.themes.filter(t => t.id !== id);
  if (state.activeThemeId === id) {
    const remaining = state.themes.filter(t => !t.archived);
    state.activeThemeId = remaining.length > 0 ? remaining[0].id : (state.themes[0]?.id || null);
  }
  saveState();
  renderThemesList();
  renderElements();
  renderGridsList();
  renderGrid();
}

function archiveTheme(id) {
  const t = state.themes.find(t => t.id === id);
  if (!t) return;
  t.archived = !t.archived;
  if (t.archived && state.activeThemeId === id) {
    const remaining = state.themes.filter(x => !x.archived);
    state.activeThemeId = remaining.length > 0 ? remaining[0].id : null;
  }
  saveState();
  renderThemesList();
  renderElements();
  renderGridsList();
  renderGrid();
}

function renameTheme(id, newName) {
  const t = state.themes.find(t => t.id === id);
  if (t && newName.trim()) t.name = newName.trim();
  saveState();
  renderThemesList();
}

function renderThemesList() {
  themesList.innerHTML = '';
  const activeThemes = state.themes.filter(t => !t.archived);

  if (activeThemes.length === 0) {
    const msg = document.createElement('span');
    msg.className = 'themes-empty-msg';
    msg.textContent = 'Aucun thème actif — crée-en un !';
    themesList.appendChild(msg);
    return;
  }

  activeThemes.forEach(t => {
    const item = document.createElement('div');
    item.className = 'theme-tab' + (t.id === state.activeThemeId ? ' active' : '');
    item.dataset.id = t.id;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'theme-tab-name';
    nameSpan.textContent = t.name;
    nameSpan.title = 'Double-cliquer pour renommer';
    nameSpan.addEventListener('dblclick', e => { e.stopPropagation(); startRenameTheme(t.id, nameSpan); });
    item.appendChild(nameSpan);

    const btnRename = document.createElement('button');
    btnRename.className = 'theme-tab-btn rename';
    btnRename.title = 'Renommer';
    btnRename.textContent = '✏';
    btnRename.addEventListener('click', e => { e.stopPropagation(); startRenameTheme(t.id, nameSpan); });
    item.appendChild(btnRename);

    const btnArch = document.createElement('button');
    btnArch.className = 'theme-tab-btn';
    btnArch.title = 'Archiver';
    btnArch.textContent = '📦';
    btnArch.addEventListener('click', e => { e.stopPropagation(); archiveTheme(t.id); });
    item.appendChild(btnArch);

    const btnDel = document.createElement('button');
    btnDel.className = 'theme-tab-btn del';
    btnDel.title = 'Supprimer ce thème';
    btnDel.textContent = '✕';
    btnDel.style.display = state.themes.filter(x => !x.archived).length > 1 ? '' : 'none';
    btnDel.addEventListener('click', e => { e.stopPropagation(); deleteTheme(t.id); });
    item.appendChild(btnDel);

    item.addEventListener('click', () => switchTheme(t.id));
    themesList.appendChild(item);
  });
}

function renderArchivedThemesModal() {
  archivedThemesList.innerHTML = '';
  const archived = state.themes.filter(t => t.archived);
  if (archived.length === 0) {
    archivedThemesList.innerHTML = '<p class="archived-empty">Aucun thème archivé.</p>';
    return;
  }
  archived.forEach(t => {
    const item = document.createElement('div');
    item.className = 'archived-theme-item';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'archived-theme-name';
    nameSpan.textContent = t.name;
    item.appendChild(nameSpan);

    const btnRestore = document.createElement('button');
    btnRestore.className = 'archived-theme-btn restore';
    btnRestore.title = 'Restaurer';
    btnRestore.textContent = '↩ Restaurer';
    btnRestore.addEventListener('click', () => {
      archiveTheme(t.id);
      renderArchivedThemesModal();
    });
    item.appendChild(btnRestore);

    const btnDel = document.createElement('button');
    btnDel.className = 'archived-theme-btn del';
    btnDel.title = 'Supprimer définitivement';
    btnDel.textContent = '✕ Supprimer';
    btnDel.addEventListener('click', () => {
      deleteTheme(t.id);
      renderArchivedThemesModal();
    });
    item.appendChild(btnDel);

    archivedThemesList.appendChild(item);
  });
}

function startRenameTheme(id, nameSpan) {
  const t = state.themes.find(t => t.id === id);
  if (!t) return;

  const input = document.createElement('input');
  input.className = 'theme-tab-rename';
  input.value = t.name;
  input.maxLength = 40;

  const commit = () => renameTheme(id, input.value);

  input.addEventListener('blur', commit);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') input.blur();
    if (e.key === 'Escape') { input.value = t.name; input.blur(); }
  });

  nameSpan.replaceWith(input);
  input.focus();
  input.select();
}

// ──────────────────────────────────────────────
// Grilles (dans le thème actif)
// ──────────────────────────────────────────────
const MIN_SIZE = 3;
const MAX_SIZE = 8;

function createGrid(name) {
  const t = activeTheme();
  const g = defaultGrid(name);
  const n = g.gridSize;
  g.grid  = Array.from({ length: n * n }, () => ({ elementId: null, checked: false }));
  t.grids.push(g);
  t.activeGridId = g.id;
  saveState();
  renderGridsList();
  renderGrid();
}

function switchGrid(id) {
  activeTheme().activeGridId = id;
  saveState();
  renderGridsList();
  renderGrid();
}

function deleteGrid(id) {
  const t = activeTheme();
  if (!t) return;
  t.grids = t.grids.filter(g => g.id !== id);
  if (t.activeGridId === id) {
    t.activeGridId = t.grids.length > 0 ? t.grids[0].id : null;
  }
  saveState();
  renderGridsList();
  renderGrid();
}

function renameGrid(id, newName) {
  const t = activeTheme();
  const g = t.grids.find(g => g.id === id);
  if (g && newName.trim()) g.name = newName.trim();
  saveState();
  renderGridsList();
}

function renderGridsList() {
  gridsList.innerHTML = '';
  const t = activeTheme();
  if (!t) return;
  t.grids.forEach(g => {
    const item = document.createElement('div');
    item.className = 'grid-tab' + (g.id === t.activeGridId ? ' active' : '');
    item.dataset.id = g.id;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'grid-tab-name';
    nameSpan.textContent = g.name;
    nameSpan.title = 'Double-cliquer pour renommer';
    nameSpan.addEventListener('dblclick', e => { e.stopPropagation(); startRenameGrid(g.id, nameSpan); });
    item.appendChild(nameSpan);

    const btnRenameGrid = document.createElement('button');
    btnRenameGrid.className = 'grid-tab-rename-btn';
    btnRenameGrid.title = 'Renommer';
    btnRenameGrid.textContent = '✏';
    btnRenameGrid.addEventListener('click', e => { e.stopPropagation(); startRenameGrid(g.id, nameSpan); });
    item.appendChild(btnRenameGrid);

    const btnDel = document.createElement('button');
    btnDel.className = 'grid-tab-del';
    btnDel.title = 'Supprimer cette grille';
    btnDel.textContent = '✕';
    btnDel.addEventListener('click', e => { e.stopPropagation(); deleteGrid(g.id); });
    item.appendChild(btnDel);

    item.addEventListener('click', () => switchGrid(g.id));
    gridsList.appendChild(item);
  });
}

function startRenameGrid(id, nameSpan) {
  const t = activeTheme();
  const g = t.grids.find(g => g.id === id);
  if (!g) return;

  const input = document.createElement('input');
  input.className = 'grid-tab-rename';
  input.value = g.name;
  input.maxLength = 40;

  const commit = () => renameGrid(id, input.value);

  input.addEventListener('blur', commit);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') input.blur();
    if (e.key === 'Escape') { input.value = g.name; input.blur(); }
  });

  nameSpan.replaceWith(input);
  input.focus();
  input.select();
}

// ──────────────────────────────────────────────
// Grille — actions
// ──────────────────────────────────────────────
function generateGrid() {
  const t = activeTheme();
  const g = activeGrid();
  if (!g) return;
  const n = g.gridSize;
  const cellCount = n * n;

  const active = t.elements.filter(e => !e.archived);
  if (active.length < cellCount) {
    gridError.textContent = `⚠ Il faut au moins ${cellCount} éléments actifs pour générer une grille ${n}×${n} (${active.length}/${cellCount}).`;
    gridError.classList.remove('hidden');
    return;
  }
  gridError.classList.add('hidden');

  const pool = shuffle(active).slice(0, cellCount);
  g.grid = Array.from({ length: cellCount }, (_, i) => ({
    elementId: pool[i] ? pool[i].id : null,
    checked: false,
  }));

  saveState();
  renderGrid();
}

function resetGrid() {
  const g = activeGrid();
  if (!g) return;
  g.grid = g.grid.map(cell => ({ ...cell, checked: false }));
  saveState();
  renderGrid();
}

function toggleCell(index) {
  const g = activeGrid();
  if (!g) return;
  const cell = g.grid[index];
  if (!cell || !cell.elementId) return;
  cell.checked = !cell.checked;
  saveState();
  renderGrid();
}

function changeSize(delta) {
  const g = activeGrid();
  if (!g) return;
  const newSize = g.gridSize + delta;
  if (newSize < MIN_SIZE || newSize > MAX_SIZE) return;

  g.gridSize = newSize;
  const cellCount = newSize * newSize;

  if (g.grid.length < cellCount) {
    while (g.grid.length < cellCount) {
      g.grid.push({ elementId: null, checked: false });
    }
  } else {
    g.grid = g.grid.slice(0, cellCount);
  }

  saveState();
  renderGrid();
}

function applyGridScale() {
  // La hauteur est fixée à 60vh via CSS — rien à faire ici
}

function changeFontScale(delta) {
  const t = activeTheme();
  if (!t) return;
  t.cellFontScale = Math.max(0.5, Math.min(3, (t.cellFontScale || 1) + delta));
  saveState();
  applyFontScale();
}

function applyFontScale() {
  const t = activeTheme();
  if (!t) return;
  const scale = t.cellFontScale || 1;
  const pct = Math.round(scale * 100);
  fontScaleInput.value = pct;

  const g = activeGrid();
  if (!g) return;
  const cells = gridEl.querySelectorAll('.bingo-cell:not(.empty)');
  cells.forEach(div => {
    const idx = parseInt(div.dataset.index);
    if (isNaN(idx)) return;
    const cell = g.grid[idx];
    if (!cell || !cell.elementId) return;
    const el = t.elements.find(e => e.id === cell.elementId);
    if (el) div.style.fontSize = getCellFontSize(el.text, scale);
  });
}

function applyFont() {
  const t = activeTheme();
  if (!t) return;
  const font = t.cellFont || AVAILABLE_FONTS[0].value;
  fontFamilySelect.value = font;
  gridEl.querySelectorAll('.bingo-cell').forEach(div => {
    div.style.fontFamily = font;
  });
}

function changeFont(value) {
  const t = activeTheme();
  if (!t) return;
  t.cellFont = value;
  saveState();
  applyFont();
}

function getCellFontSize(text, scale) {
  const len = text.length;
  let base;
  if (len <= 6)  base = 1.4;
  else if (len <= 12) base = 1.1;
  else if (len <= 22) base = 0.85;
  else if (len <= 40) base = 0.7;
  else base = 0.58;
  return (base * scale).toFixed(2) + 'rem';
}

// ──────────────────────────────────────────────
// Mode placement manuel
// ──────────────────────────────────────────────
let manualMode = false;

function enterManualMode() {
  manualMode = true;
  btnManual.classList.add('active');
  btnGenerate.disabled = false;
  gridError.classList.add('hidden');
  renderGrid();
  renderElements();
}

function exitManualMode() {
  manualMode = false;
  btnManual.classList.remove('active');
  renderGrid();
  renderElements();
}

function renderGrid() {
  const t = activeTheme();
  const g = activeGrid();

  if (!t) {
    gridEl.innerHTML = '<div class="no-grid-msg">Crée un thème pour commencer.</div>';
    sizeDisplay.textContent = '—';
    bingoMsg.classList.add('hidden');
    btnGenerate.disabled = true;
    btnGenerate.classList.add('btn-disabled');
    return;
  }

  if (!g) {
    gridEl.innerHTML = '<div class="no-grid-msg">Crée une grille pour commencer.</div>';
    sizeDisplay.textContent = '—';
    bingoMsg.classList.add('hidden');
    btnGenerate.disabled = false;
    btnGenerate.classList.remove('btn-disabled');
    applyGridScale();
    return;
  }

  const n = g.gridSize;
  sizeDisplay.textContent = `${n}×${n}`;

  const activeCount = t.elements.filter(e => !e.archived).length;
  const enoughElements = activeCount >= n * n;
  btnGenerate.disabled = !enoughElements || manualMode;
  btnGenerate.classList.toggle('btn-disabled', !enoughElements || manualMode);
  if (enoughElements) gridError.classList.add('hidden');

  const { indices: bingoIndices, lines: bingoLines } = getBingoResult(n, g.grid);

  const scale = t.cellFontScale || 1;

  gridEl.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
  gridEl.innerHTML = '';

  g.grid.forEach((cell, i) => {
    const div = document.createElement('div');
    div.className = 'bingo-cell';
    div.dataset.index = i;

    if (manualMode) {
      div.classList.add('manual-target');
      div.addEventListener('dragover', e => { e.preventDefault(); div.classList.add('drag-over'); });
      div.addEventListener('dragleave', () => div.classList.remove('drag-over'));
      div.addEventListener('drop', e => {
        e.preventDefault();
        div.classList.remove('drag-over');
        const elId = e.dataTransfer.getData('text/plain');
        const targetIdx = parseInt(div.dataset.index);
        if (elId && !isNaN(targetIdx)) {
          g.grid[targetIdx] = { elementId: elId, checked: false };
          saveState();
          renderGrid();
          renderElements();
        }
      });
    }

    if (!cell.elementId) {
      div.classList.add('empty');
      div.textContent = manualMode ? '+ Dépose ici' : '—';
    } else {
      const el = t.elements.find(e => e.id === cell.elementId);
      const cellText = el ? el.text : '?';
      div.textContent = cellText;
      div.style.fontSize = getCellFontSize(cellText, scale);

      if (cell.checked)        div.classList.add('checked');
      if (bingoIndices.has(i)) div.classList.add('bingo-line');

      if (!manualMode) {
        div.addEventListener('click', () => toggleCell(i));
      } else {
        // En mode manuel, clic vide la case
        div.addEventListener('click', () => {
          g.grid[i] = { elementId: null, checked: false };
          saveState();
          renderGrid();
          renderElements();
        });
        div.title = 'Cliquer pour vider la case';
      }
    }

    gridEl.appendChild(div);
  });

  // Message bingo
  if (bingoLines.length > 0) {
    const count = bingoLines.length;
    if (count === 1) {
      bingoMsg.innerHTML = `🎉 BINGO ! Tu as complété une ligne !`;
    } else {
      bingoMsg.innerHTML = `🎉 BINGO x${count} ! Tu as complété ${count} lignes !`;
    }
    bingoMsg.classList.remove('hidden');
  } else {
    bingoMsg.classList.add('hidden');
  }

  applyGridScale();
  applyFontScale();
  applyFont();
}

// ──────────────────────────────────────────────
// Détection des bingos
// ──────────────────────────────────────────────
function getBingoResult(n, grid) {
  const indices = new Set();
  const lines = [];

  const isChecked = (r, c) => {
    const cell = grid[r * n + c];
    return cell && cell.elementId && cell.checked;
  };

  for (let r = 0; r < n; r++) {
    if (Array.from({ length: n }, (_, c) => isChecked(r, c)).every(Boolean)) {
      for (let c = 0; c < n; c++) indices.add(r * n + c);
      lines.push(`Ligne ${r + 1}`);
    }
  }

  for (let c = 0; c < n; c++) {
    if (Array.from({ length: n }, (_, r) => isChecked(r, c)).every(Boolean)) {
      for (let r = 0; r < n; r++) indices.add(r * n + c);
      lines.push(`Colonne ${c + 1}`);
    }
  }

  if (Array.from({ length: n }, (_, i) => isChecked(i, i)).every(Boolean)) {
    for (let i = 0; i < n; i++) indices.add(i * n + i);
    lines.push('Diagonale ↘');
  }

  if (Array.from({ length: n }, (_, i) => isChecked(i, n - 1 - i)).every(Boolean)) {
    for (let i = 0; i < n; i++) indices.add(i * n + (n - 1 - i));
    lines.push('Diagonale ↙');
  }

  return { indices, lines };
}

// ──────────────────────────────────────────────
// Modale : nouveau thème
// ──────────────────────────────────────────────
const modalNewTheme        = document.getElementById('modal-new-theme');
const newThemeNameInput    = document.getElementById('new-theme-name-input');
const btnConfirmNewTheme   = document.getElementById('btn-confirm-new-theme');
const btnCancelNewTheme    = document.getElementById('btn-cancel-new-theme');
const btnCloseNewThemeModal = document.getElementById('btn-close-new-theme-modal');

function openNewThemeModal() {
  newThemeNameInput.value = '';
  modalNewTheme.classList.remove('hidden');
  setTimeout(() => newThemeNameInput.focus(), 50);
}

function closeNewThemeModal() {
  modalNewTheme.classList.add('hidden');
}

function confirmNewTheme() {
  const name = newThemeNameInput.value.trim();
  if (!name) return;
  closeNewThemeModal();
  createTheme(name);
}

btnConfirmNewTheme.addEventListener('click', confirmNewTheme);
btnCancelNewTheme.addEventListener('click', closeNewThemeModal);
btnCloseNewThemeModal.addEventListener('click', closeNewThemeModal);
modalNewTheme.addEventListener('click', e => { if (e.target === modalNewTheme) closeNewThemeModal(); });
newThemeNameInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') confirmNewTheme();
  if (e.key === 'Escape') closeNewThemeModal();
});

// ──────────────────────────────────────────────
// Onglets actifs / archivés
// ──────────────────────────────────────────────
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const tab = btn.dataset.tab;
    if (tab === 'active') {
      listActive.classList.remove('hidden');
      listArchived.classList.add('hidden');
    } else {
      listActive.classList.add('hidden');
      listArchived.classList.remove('hidden');
    }
  });
});

// ──────────────────────────────────────────────
// Écouteurs d'événements
// ──────────────────────────────────────────────
btnAdd.addEventListener('click', addElement);
inputEl.addEventListener('keydown', e => { if (e.key === 'Enter') addElement(); });

btnSizeMinus.addEventListener('click', () => changeSize(-1));
btnSizePlus.addEventListener('click',  () => changeSize(+1));

btnFontMinus.addEventListener('click', () => changeFontScale(-0.1));
btnFontPlus.addEventListener('click',  () => changeFontScale(+0.1));
fontScaleInput.addEventListener('change', () => {
  const t = activeTheme();
  if (!t) return;
  const pct = Math.max(50, Math.min(300, parseInt(fontScaleInput.value) || 100));
  t.cellFontScale = pct / 100;
  saveState();
  applyFontScale();
});

fontFamilySelect.addEventListener('change', () => changeFont(fontFamilySelect.value));

btnGenerate.addEventListener('click', () => {
  if (manualMode) return;
  if (!activeTheme()) return;
  if (!activeGrid()) createGrid('Grille 1');
  generateGrid();
});

btnManual.addEventListener('click', () => {
  if (manualMode) {
    exitManualMode();
  } else {
    const t = activeTheme();
    if (!t) return;
    if (!activeGrid()) {
      const g = defaultGrid('Grille 1');
      g.grid = Array.from({ length: 16 }, () => ({ elementId: null, checked: false }));
      t.grids.push(g);
      t.activeGridId = g.id;
      saveState();
      renderGridsList();
    }
    enterManualMode();
  }
});

btnReset.addEventListener('click', resetGrid);

btnNewGrid.addEventListener('click', () => {
  const t = activeTheme();
  if (!t) return;
  const count = t.grids.length + 1;
  createGrid(`Grille ${count}`);
});

btnNewTheme.addEventListener('click', () => {
  openNewThemeModal();
});

btnArchivedThemes.addEventListener('click', () => {
  renderArchivedThemesModal();
  modalArchivedThemes.classList.remove('hidden');
});

btnCloseArchivedModal.addEventListener('click', () => {
  modalArchivedThemes.classList.add('hidden');
});

modalArchivedThemes.addEventListener('click', e => {
  if (e.target === modalArchivedThemes) modalArchivedThemes.classList.add('hidden');
});

// ──────────────────────────────────────────────
// Initialisation
// ──────────────────────────────────────────────────────────────────────────────
// Navigation multi-pages
// ──────────────────────────────────────────────────────────────────────────────
(function setupNav() {
  const navBtns = document.querySelectorAll('.nav-btn[data-page]');
  const pages   = document.querySelectorAll('.page');
  const logoTag = document.querySelector('.logo-tag');

  const pageLabels = { bingo: 'Bingo', tierlist: 'Tier List' };

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('disabled')) return;
      const target = btn.dataset.page;
      navBtns.forEach(b => b.classList.toggle('active', b.dataset.page === target));
      pages.forEach(p => p.classList.toggle('active', p.id === `page-${target}`));
      if (logoTag) logoTag.textContent = pageLabels[target] || target;
    });
  });
})();

// ══════════════════════════════════════════════════════════════════════════════
// TIER LIST — logique complète
// ══════════════════════════════════════════════════════════════════════════════

// ──────────────────────────────────────────────
// État Tier List
// ──────────────────────────────────────────────
const TL_DEFAULT_TIERS = [
  { label: 'S', color: '#e85b47' },
  { label: 'A', color: '#e8a047' },
  { label: 'B', color: '#e8d447' },
  { label: 'C', color: '#6ac96a' },
  { label: 'D', color: '#5b9de8' },
];

const TL_PRESET_COLORS = [
  '#e85b47', // rouge
  '#e8733a', // orange-rouge
  '#e8a047', // orange
  '#e8c547', // jaune-or
  '#e8d447', // jaune
  '#b5d44a', // jaune-vert
  '#6ac96a', // vert
  '#3db88b', // vert-teal
  '#3db8c8', // cyan
  '#5b9de8', // bleu
  '#7b5be8', // violet
  '#c05be8', // mauve
  '#e85bb8', // rose
  '#e85b7b', // rose-rouge
  '#888888', // gris
  '#444455', // gris sombre
];

// ── État ──────────────────────────────────────────────────────────────────────
const _TL_STORAGE_KEY = 'lesmichels_tierlist';

let tlState = (() => {
  try {
    const raw = localStorage.getItem(_TL_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { tierlists: [], activeTierlistId: null };
})();

function tlSave() {
  try {
    localStorage.setItem(_TL_STORAGE_KEY, JSON.stringify(tlState));
  } catch (e) {
    console.warn('TL save error (localStorage plein ?):', e);
  }
}

function tlActiveTierlist() {
  return tlState.tierlists.find(tl => tl.id === tlState.activeTierlistId) || null;
}

function tlDefaultTierlist(name) {
  return {
    id: uid(),
    name,
    archived: false,
    showLabels: true,
    imgSize: 80,
    tiers: TL_DEFAULT_TIERS.map(t => ({ id: uid(), label: t.label, color: t.color, items: [] })),
    unplaced: [],
    images: [],
  };
}

// ── DOM refs ──────────────────────────────────────────────────────────────────
const tlBtnNew            = document.getElementById('tl-btn-new');
const tlList              = document.getElementById('tl-list');
const tlBtnShowArchived   = document.getElementById('tl-btn-show-archived');
const tlEmptyState        = document.getElementById('tl-empty-state');
const tlEditor            = document.getElementById('tl-editor');
const tlTitleDisplay      = document.getElementById('tl-title-display');
const tlBtnRenameTl       = document.getElementById('tl-btn-rename-tl');
const tlShowLabelsToggle  = document.getElementById('tl-show-labels-toggle');
const tlImgSizeSlider     = document.getElementById('tl-img-size-slider');
const tlBtnAddTier        = document.getElementById('tl-btn-add-tier');
const tlBtnImportImages   = document.getElementById('tl-btn-import-images');
const tlFileInput         = document.getElementById('tl-file-input');
const tlBtnExport         = document.getElementById('tl-btn-export');
const tlTiersZone         = document.getElementById('tl-tiers-zone');
const tlUnplacedZone      = document.getElementById('tl-unplaced-zone');
const tlUnplacedCount     = document.getElementById('tl-unplaced-count');

// Modals
const tlModalNew          = document.getElementById('tl-modal-new');
const tlModalNewTitle     = document.getElementById('tl-modal-new-title');
const tlModalNewInput     = document.getElementById('tl-modal-new-input');
const tlModalNewConfirm   = document.getElementById('tl-modal-new-confirm');
const tlModalNewCancel    = document.getElementById('tl-modal-new-cancel');
const tlModalNewClose     = document.getElementById('tl-modal-new-close');

const tlModalTier         = document.getElementById('tl-modal-tier');
const tlModalTierLabel    = document.getElementById('tl-modal-tier-label');
const tlModalTierColor    = document.getElementById('tl-modal-tier-color');
const tlModalTierConfirm  = document.getElementById('tl-modal-tier-confirm');
const tlModalTierCancel   = document.getElementById('tl-modal-tier-cancel');
const tlModalTierClose    = document.getElementById('tl-modal-tier-close');

const tlModalArchived     = document.getElementById('tl-modal-archived');
const tlModalArchivedClose= document.getElementById('tl-modal-archived-close');
const tlArchivedList      = document.getElementById('tl-archived-list');

const tlModalImgName      = document.getElementById('tl-modal-imgname');
const tlModalImgNameInput = document.getElementById('tl-modal-imgname-input');
const tlModalImgNameConfirm = document.getElementById('tl-modal-imgname-confirm');
const tlModalImgNameCancel  = document.getElementById('tl-modal-imgname-cancel');
const tlModalImgNameClose   = document.getElementById('tl-modal-imgname-close');

// ── Drag state ────────────────────────────────────────────────────────────────
let tlDragImgId = null;

// ── Rendu principal ───────────────────────────────────────────────────────────
function tlRender() {
  tlRenderList();
  const tl = tlActiveTierlist();
  if (!tl || tl.archived) {
    tlEmptyState.classList.remove('hidden');
    tlEditor.classList.add('hidden');
    return;
  }
  tlEmptyState.classList.add('hidden');
  tlEditor.classList.remove('hidden');

  tlTitleDisplay.textContent = tl.name;
  tlShowLabelsToggle.checked = !!tl.showLabels;
  tlImgSizeSlider.value = tl.imgSize || 80;

  tlRenderTiers(tl);
  tlRenderUnplaced(tl);
}

function tlRenderList() {
  tlList.innerHTML = '';
  const active = tlState.tierlists.filter(tl => !tl.archived);
  if (active.length === 0) {
    const msg = document.createElement('div');
    msg.className = 'tl-list-empty';
    msg.style.cssText = 'color:var(--text-faint);font-style:italic;font-size:0.82rem;padding:8px 4px;';
    msg.textContent = 'Aucune tier list';
    tlList.appendChild(msg);
    return;
  }
  active.forEach(tl => {
    const item = document.createElement('div');
    item.className = 'tl-list-item' + (tl.id === tlState.activeTierlistId ? ' active' : '');
    item.dataset.id = tl.id;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'tl-list-item-name';
    nameSpan.textContent = tl.name;
    nameSpan.title = tl.name;
    item.appendChild(nameSpan);

    const btnCopy = document.createElement('button');
    btnCopy.className = 'tl-list-item-btn copy';
    btnCopy.title = 'Copier';
    btnCopy.textContent = '⎘';
    btnCopy.addEventListener('click', e => { e.stopPropagation(); tlCopy(tl.id); });
    item.appendChild(btnCopy);

    const btnArch = document.createElement('button');
    btnArch.className = 'tl-list-item-btn';
    btnArch.title = 'Archiver';
    btnArch.textContent = '📦';
    btnArch.addEventListener('click', e => { e.stopPropagation(); tlArchive(tl.id); });
    item.appendChild(btnArch);

    const btnDel = document.createElement('button');
    btnDel.className = 'tl-list-item-btn del';
    btnDel.title = 'Supprimer';
    btnDel.textContent = '✕';
    btnDel.addEventListener('click', e => { e.stopPropagation(); tlDelete(tl.id); });
    item.appendChild(btnDel);

    item.addEventListener('click', () => tlSwitch(tl.id));
    tlList.appendChild(item);
  });
}

function tlRenderTiers(tl) {
  tlTiersZone.innerHTML = '';
  const imgSize = tl.imgSize || 80;

  tl.tiers.forEach((tier, tierIdx) => {
    const row = document.createElement('div');
    row.className = 'tl-tier-row';
    row.dataset.tierId = tier.id;

    // Cellule label
    const labelCell = document.createElement('div');
    labelCell.className = 'tl-tier-label-cell';
    labelCell.style.background = tier.color;

    const labelText = document.createElement('span');
    labelText.className = 'tl-tier-label-text';
    labelText.textContent = tier.label;
    labelCell.appendChild(labelText);

    // Contrôles du tier (au hover)
    const controls = document.createElement('div');
    controls.className = 'tl-tier-controls';

    const btnEdit = document.createElement('button');
    btnEdit.className = 'tl-tier-ctrl-btn';
    btnEdit.title = 'Modifier';
    btnEdit.textContent = '✏';
    btnEdit.addEventListener('click', e => { e.stopPropagation(); tlEditTier(tl, tier); });
    controls.appendChild(btnEdit);

    const btnUp = document.createElement('button');
    btnUp.className = 'tl-tier-ctrl-btn';
    btnUp.title = 'Monter';
    btnUp.textContent = '▲';
    btnUp.disabled = tierIdx === 0;
    btnUp.addEventListener('click', e => { e.stopPropagation(); tlMoveTier(tl, tierIdx, -1); });
    controls.appendChild(btnUp);

    const btnDown = document.createElement('button');
    btnDown.className = 'tl-tier-ctrl-btn';
    btnDown.title = 'Descendre';
    btnDown.textContent = '▼';
    btnDown.disabled = tierIdx === tl.tiers.length - 1;
    btnDown.addEventListener('click', e => { e.stopPropagation(); tlMoveTier(tl, tierIdx, +1); });
    controls.appendChild(btnDown);

    const btnDel = document.createElement('button');
    btnDel.className = 'tl-tier-ctrl-btn';
    btnDel.title = 'Supprimer ce tier';
    btnDel.textContent = '✕';
    btnDel.addEventListener('click', e => { e.stopPropagation(); tlDeleteTier(tl, tier.id); });
    controls.appendChild(btnDel);

    labelCell.appendChild(controls);
    row.appendChild(labelCell);

    // Zone images
    const imgsDiv = document.createElement('div');
    imgsDiv.className = 'tl-tier-images';
    imgsDiv.dataset.dropzone = tier.id;
    imgsDiv.addEventListener('dragover', tlDragOver);
    imgsDiv.addEventListener('drop', e => tlDrop(e, tier.id));
    imgsDiv.addEventListener('dragleave', tlDragLeave);

    if (tier.items.length === 0) {
      const hint = document.createElement('span');
      hint.className = 'tl-tier-images-empty';
      hint.textContent = 'Dépose des images ici';
      imgsDiv.appendChild(hint);
    } else {
      tier.items.forEach(itemId => {
        const img = tlFindImage(tl, itemId);
        if (img) imgsDiv.appendChild(tlBuildImgCard(tl, img, imgSize));
      });
    }

    row.appendChild(imgsDiv);
    tlTiersZone.appendChild(row);
  });
}

function tlRenderUnplaced(tl) {
  tlUnplacedZone.innerHTML = '';
  const imgSize = tl.imgSize || 80;

  if (tl.unplaced.length === 0) {
    const hint = document.createElement('div');
    hint.className = 'tl-unplaced-hint';
    hint.textContent = 'Dépose des images ici ou importe-en';
    tlUnplacedZone.appendChild(hint);
  } else {
    tl.unplaced.forEach(imgId => {
      const img = tlFindImage(tl, imgId);
      if (img) tlUnplacedZone.appendChild(tlBuildImgCard(tl, img, imgSize));
    });
  }
  tlUnplacedCount.textContent = tl.unplaced.length;
}

function tlBuildImgCard(tl, img, size) {
  const card = document.createElement('div');
  card.className = 'tl-img-card';
  card.draggable = true;
  card.dataset.imgId = img.id;

  card.addEventListener('dragstart', e => {
    tlDragImgId = img.id;
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => card.classList.add('dragging'), 0);
  });
  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
    tlDragImgId = null;
  });

  const imgEl = document.createElement('img');
  imgEl.src = img.src;
  imgEl.style.width = size + 'px';
  imgEl.style.height = size + 'px';
  imgEl.draggable = false;
  card.appendChild(imgEl);

  if (tl.showLabels) {
    const label = document.createElement('div');
    label.className = 'tl-img-label';
    label.style.width = size + 'px';
    label.textContent = img.name;
    label.title = 'Double-clic pour renommer';
    label.addEventListener('dblclick', e => { e.stopPropagation(); tlOpenRenameImg(tl, img); });
    card.appendChild(label);
  }

  const actions = document.createElement('div');
  actions.className = 'tl-img-card-actions';

  const btnRename = document.createElement('button');
  btnRename.className = 'tl-img-action-btn rename';
  btnRename.title = 'Renommer';
  btnRename.textContent = '✏';
  btnRename.addEventListener('click', e => { e.stopPropagation(); tlOpenRenameImg(tl, img); });
  actions.appendChild(btnRename);

  const btnDel = document.createElement('button');
  btnDel.className = 'tl-img-action-btn';
  btnDel.title = 'Supprimer cette image';
  btnDel.textContent = '✕';
  btnDel.addEventListener('click', e => { e.stopPropagation(); tlDeleteImage(tl, img.id); });
  actions.appendChild(btnDel);

  card.appendChild(actions);
  return card;
}

// ── Recherche d'image ─────────────────────────────────────────────────────────
function tlFindImage(tl, imgId) {
  return (tl.images || []).find(i => i.id === imgId) || null;
}

// ── Actions sur les tierlists ─────────────────────────────────────────────────
function tlCreate(name) {
  const tl = tlDefaultTierlist(name);
  tlState.tierlists.push(tl);
  tlState.activeTierlistId = tl.id;
  tlSave();
  tlRender();
}

function tlSwitch(id) {
  tlState.activeTierlistId = id;
  tlSave();
  tlRender();
}

function tlDelete(id) {
  tlState.tierlists = tlState.tierlists.filter(t => t.id !== id);
  if (tlState.activeTierlistId === id) {
    const remaining = tlState.tierlists.filter(t => !t.archived);
    tlState.activeTierlistId = remaining.length > 0 ? remaining[0].id : null;
  }
  tlSave();
  tlRender();
}

function tlArchive(id) {
  const tl = tlState.tierlists.find(t => t.id === id);
  if (!tl) return;
  tl.archived = true;
  if (tlState.activeTierlistId === id) {
    const remaining = tlState.tierlists.filter(t => !t.archived);
    tlState.activeTierlistId = remaining.length > 0 ? remaining[0].id : null;
  }
  tlSave();
  tlRender();
}

function tlUnarchive(id) {
  const tl = tlState.tierlists.find(t => t.id === id);
  if (tl) tl.archived = false;
  tlSave();
  tlRender();
  tlRenderArchivedModal();
}

function tlCopy(id) {
  const src = tlState.tierlists.find(t => t.id === id);
  if (!src) return;
  const copy = JSON.parse(JSON.stringify(src));
  copy.id = uid();
  copy.name = src.name + ' (copie)';
  copy.archived = false;
  // Remap image ids
  const idMap = {};
  copy.images = (copy.images || []).map(img => {
    const newId = uid();
    idMap[img.id] = newId;
    return { ...img, id: newId };
  });
  // Remap tier ids et items
  copy.tiers = copy.tiers.map(t => ({
    ...t,
    id: uid(),
    items: t.items.map(oid => idMap[oid] || oid),
  }));
  copy.unplaced = (copy.unplaced || []).map(oid => idMap[oid] || oid);
  tlState.tierlists.push(copy);
  tlState.activeTierlistId = copy.id;
  tlSave();
  tlRender();
}

function tlRename(id, newName) {
  const tl = tlState.tierlists.find(t => t.id === id);
  if (tl && newName.trim()) tl.name = newName.trim();
  tlSave();
  tlRender();
}

// ── Actions sur les tiers ─────────────────────────────────────────────────────
function tlAddTier(label, color) {
  const tl = tlActiveTierlist();
  if (!tl) return;
  tl.tiers.push({ id: uid(), label, color, items: [] });
  tlSave();
  tlRender();
}

function tlDeleteTier(tl, tierId) {
  const tier = tl.tiers.find(t => t.id === tierId);
  if (tier) {
    tier.items.forEach(imgId => {
      if (!tl.unplaced.includes(imgId)) tl.unplaced.push(imgId);
    });
  }
  tl.tiers = tl.tiers.filter(t => t.id !== tierId);
  tlSave();
  tlRender();
}

function tlMoveTier(tl, idx, delta) {
  const newIdx = idx + delta;
  if (newIdx < 0 || newIdx >= tl.tiers.length) return;
  [tl.tiers[idx], tl.tiers[newIdx]] = [tl.tiers[newIdx], tl.tiers[idx]];
  tlSave();
  tlRender();
}

function tlEditTier(tl, tier) {
  tlOpenTierModal({ mode: 'edit', tl, tier });
}

// ── Images ────────────────────────────────────────────────────────────────────
// tl.images = [{id, src, name}] — source de vérité pour les images
// tl.unplaced = [id, id, ...] — ids des images non placées dans un tier
// tier.items  = [id, id, ...] — ids des images dans ce tier

function tlImportImages(files) {
  const tl = tlActiveTierlist();
  if (!tl) return;
  if (!tl.images) tl.images = [];

  const processFile = (file) => new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = { id: uid(), src: e.target.result, name: file.name.replace(/\.[^.]+$/, '') };
      tl.images.push(img);
      tl.unplaced.push(img.id);
      resolve();
    };
    reader.readAsDataURL(file);
  });

  Promise.all(Array.from(files).map(processFile)).then(() => {
    tlSave();
    tlRender();
  });
}

function tlDeleteImage(tl, imgId) {
  tl.unplaced = tl.unplaced.filter(id => id !== imgId);
  tl.tiers.forEach(t => { t.items = t.items.filter(id => id !== imgId); });
  if (tl.images) tl.images = tl.images.filter(i => i.id !== imgId);
  tlSave();
  tlRender();
}

// ── Drag & drop ───────────────────────────────────────────────────────────────
function tlDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.classList.add('drag-over');
}

function tlDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

function tlDrop(e, targetZoneId) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  const imgId = tlDragImgId;
  if (!imgId) return;
  const tl = tlActiveTierlist();
  if (!tl) return;

  // Retirer de partout
  tl.unplaced = tl.unplaced.filter(id => id !== imgId);
  tl.tiers.forEach(t => { t.items = t.items.filter(id => id !== imgId); });

  if (targetZoneId === '__unplaced__') {
    tl.unplaced.push(imgId);
  } else {
    const tier = tl.tiers.find(t => t.id === targetZoneId);
    if (tier) tier.items.push(imgId);
  }

  tlSave();
  tlRender();
}

// Exposer les fonctions de drag globalement (utilisées dans le HTML via attributs)
window.tlDragOver  = tlDragOver;
window.tlDragLeave = tlDragLeave;
window.tlDrop      = tlDrop;

// ── Renommer image ────────────────────────────────────────────────────────────
let tlRenameImgContext = null;

function tlOpenRenameImg(tl, img) {
  tlRenameImgContext = { tl, img };
  tlModalImgNameInput.value = img.name;
  tlModalImgName.classList.remove('hidden');
  setTimeout(() => { tlModalImgNameInput.focus(); tlModalImgNameInput.select(); }, 50);
}

function tlConfirmRenameImg() {
  if (!tlRenameImgContext) return;
  const { img } = tlRenameImgContext;
  const newName = tlModalImgNameInput.value.trim();
  if (newName) img.name = newName;
  tlModalImgName.classList.add('hidden');
  tlRenameImgContext = null;
  tlSave();
  tlRender();
}

// ── Export PNG ────────────────────────────────────────────────────────────────
function tlExport() {
  const tl = tlActiveTierlist();
  if (!tl) return;

  const imgSize = tl.imgSize || 80;
  const labelW = 80;
  const padding = 6;
  const rowGap = 4;
  const imgGap = 4;
  const labelFontSize = Math.round(imgSize * 0.35);

  // Calcul de la hauteur de chaque tier
  const tierHeights = tl.tiers.map(tier => {
    if (tier.items.length === 0) return imgSize + padding * 2;
    const rows = Math.ceil(tier.items.length * (imgSize + imgGap) / (800 - labelW));
    return Math.max(imgSize + padding * 2, rows * (imgSize + imgGap) + padding * 2);
  });

  const totalHeight = tierHeights.reduce((a, b) => a + b + rowGap, 0) + 40;
  const totalWidth = 820;

  const canvas = document.createElement('canvas');
  canvas.width = totalWidth;
  canvas.height = totalHeight;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#18181c';
  ctx.fillRect(0, 0, totalWidth, totalHeight);

  // Titre
  ctx.fillStyle = '#e8e8f0';
  ctx.font = `bold 18px Arial`;
  ctx.fillText(tl.name, 12, 26);

  let y = 36;

  const loadImage = (src) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

  const drawTier = async (tier, tierH, yPos) => {
    // Label cell
    ctx.fillStyle = tier.color;
    ctx.fillRect(0, yPos, labelW, tierH);
    ctx.fillStyle = '#111';
    ctx.font = `bold ${labelFontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tier.label, labelW / 2, yPos + tierH / 2);

    // Images zone bg
    ctx.fillStyle = '#22222a';
    ctx.fillRect(labelW, yPos, totalWidth - labelW, tierH);

    // Draw images
    let x = labelW + padding;
    let rowY = yPos + padding;
    for (const imgId of tier.items) {
      const imgData = tl.images ? tl.images.find(i => i.id === imgId) : null;
      if (!imgData) continue;
      if (x + imgSize > totalWidth - padding) { x = labelW + padding; rowY += imgSize + imgGap; }
      const imgEl = await loadImage(imgData.src);
      if (imgEl) ctx.drawImage(imgEl, x, rowY, imgSize, imgSize);
      if (tl.showLabels) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(x, rowY + imgSize - 14, imgSize, 14);
        ctx.fillStyle = '#ccc';
        ctx.font = '9px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(imgData.name.slice(0, 14), x + imgSize / 2, rowY + imgSize - 7);
      }
      x += imgSize + imgGap;
    }
  };

  (async () => {
    for (let i = 0; i < tl.tiers.length; i++) {
      await drawTier(tl.tiers[i], tierHeights[i], y);
      y += tierHeights[i] + rowGap;
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    const link = document.createElement('a');
    link.download = (tl.name || 'tierlist').replace(/[^a-z0-9]/gi, '_') + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  })();
}

// ── Modal archivées ───────────────────────────────────────────────────────────
function tlRenderArchivedModal() {
  tlArchivedList.innerHTML = '';
  const archived = tlState.tierlists.filter(t => t.archived);
  if (archived.length === 0) {
    tlArchivedList.innerHTML = '<p class="archived-empty">Aucune tier list archivée.</p>';
    return;
  }
  archived.forEach(tl => {
    const item = document.createElement('div');
    item.className = 'archived-theme-item';

    const name = document.createElement('span');
    name.className = 'archived-theme-name';
    name.textContent = tl.name;
    item.appendChild(name);

    const btnRestore = document.createElement('button');
    btnRestore.className = 'archived-theme-btn restore';
    btnRestore.textContent = '↩ Restaurer';
    btnRestore.addEventListener('click', () => tlUnarchive(tl.id));
    item.appendChild(btnRestore);

    const btnDel = document.createElement('button');
    btnDel.className = 'archived-theme-btn del';
    btnDel.textContent = '✕ Supprimer';
    btnDel.addEventListener('click', () => { tlDelete(tl.id); tlRenderArchivedModal(); });
    item.appendChild(btnDel);

    tlArchivedList.appendChild(item);
  });
}

// ── Modal nouvelle tierlist ───────────────────────────────────────────────────
let tlModalNewMode = 'create'; // 'create' | 'rename'
let tlModalNewTargetId = null;

function tlOpenNewModal() {
  tlModalNewMode = 'create';
  tlModalNewTargetId = null;
  tlModalNewTitle.textContent = 'Nouvelle tier list';
  tlModalNewInput.value = '';
  tlModalNew.classList.remove('hidden');
  setTimeout(() => tlModalNewInput.focus(), 50);
}

function tlOpenRenameModal(id) {
  const tl = tlState.tierlists.find(t => t.id === id);
  if (!tl) return;
  tlModalNewMode = 'rename';
  tlModalNewTargetId = id;
  tlModalNewTitle.textContent = 'Renommer la tier list';
  tlModalNewInput.value = tl.name;
  tlModalNew.classList.remove('hidden');
  setTimeout(() => { tlModalNewInput.focus(); tlModalNewInput.select(); }, 50);
}

function tlConfirmNewModal() {
  const val = tlModalNewInput.value.trim();
  if (!val) return;
  tlModalNew.classList.add('hidden');
  if (tlModalNewMode === 'create') tlCreate(val);
  else if (tlModalNewMode === 'rename') tlRename(tlModalNewTargetId, val);
}

// ── Modal nouveau/modifier tier ───────────────────────────────────────────────
const tlModalTierTitle = document.getElementById('tl-modal-tier-title');
const tlColorSwatches  = document.getElementById('tl-color-swatches');

let tlTierModalCtx = null; // { mode: 'create' } | { mode: 'edit', tl, tier }
let tlTierSelectedColor = TL_PRESET_COLORS[0];

function tlInitSwatches() {
  tlColorSwatches.innerHTML = '';
  TL_PRESET_COLORS.forEach(color => {
    const sw = document.createElement('button');
    sw.className = 'tl-swatch';
    sw.type = 'button';
    sw.style.background = color;
    sw.dataset.color = color;
    sw.title = color;
    sw.addEventListener('click', () => tlSelectColor(color, sw));
    tlColorSwatches.appendChild(sw);
  });
}

function tlSelectColor(color, swatchEl) {
  tlTierSelectedColor = color;
  tlModalTierColor.value = color;
  tlColorSwatches.querySelectorAll('.tl-swatch').forEach(s => s.classList.remove('selected'));
  if (swatchEl) swatchEl.classList.add('selected');
  else tlColorSwatches.querySelectorAll('.tl-swatch').forEach(s => {
    if (s.dataset.color === color) s.classList.add('selected');
  });
}

function tlOpenTierModal(ctx = { mode: 'create' }) {
  tlTierModalCtx = ctx;
  if (ctx.mode === 'edit') {
    tlModalTierTitle.textContent = 'Modifier le tier';
    tlModalTierLabel.value = ctx.tier.label;
    document.getElementById('tl-modal-tier-confirm').textContent = 'Enregistrer';
    tlSelectColor(ctx.tier.color, null);
    tlModalTierColor.value = ctx.tier.color;
  } else {
    tlModalTierTitle.textContent = 'Nouveau tier';
    tlModalTierLabel.value = '';
    document.getElementById('tl-modal-tier-confirm').textContent = 'Ajouter';
    tlSelectColor(TL_PRESET_COLORS[0], null);
    tlModalTierColor.value = TL_PRESET_COLORS[0];
  }
  tlModalTier.classList.remove('hidden');
  setTimeout(() => { tlModalTierLabel.focus(); tlModalTierLabel.select(); }, 50);
}

function tlConfirmTierModal() {
  const label = tlModalTierLabel.value.trim();
  if (!label) return;
  const color = tlTierSelectedColor;
  tlModalTier.classList.add('hidden');
  if (tlTierModalCtx && tlTierModalCtx.mode === 'edit') {
    tlTierModalCtx.tier.label = label;
    tlTierModalCtx.tier.color = color;
    tlSave();
    tlRender();
  } else {
    tlAddTier(label, color);
  }
  tlTierModalCtx = null;
}

// ── Listeners ─────────────────────────────────────────────────────────────────
tlBtnNew.addEventListener('click', tlOpenNewModal);

tlModalNewConfirm.addEventListener('click', tlConfirmNewModal);
tlModalNewCancel.addEventListener('click', () => tlModalNew.classList.add('hidden'));
tlModalNewClose.addEventListener('click', () => tlModalNew.classList.add('hidden'));
tlModalNew.addEventListener('click', e => { if (e.target === tlModalNew) tlModalNew.classList.add('hidden'); });
tlModalNewInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') tlConfirmNewModal();
  if (e.key === 'Escape') tlModalNew.classList.add('hidden');
});

tlBtnRenameTl.addEventListener('click', () => {
  const tl = tlActiveTierlist();
  if (tl) tlOpenRenameModal(tl.id);
});

tlBtnAddTier.addEventListener('click', () => tlOpenTierModal({ mode: 'create' }));
tlModalTierConfirm.addEventListener('click', tlConfirmTierModal);
tlModalTierCancel.addEventListener('click', () => { tlModalTier.classList.add('hidden'); tlTierModalCtx = null; });
tlModalTierClose.addEventListener('click', () => { tlModalTier.classList.add('hidden'); tlTierModalCtx = null; });
tlModalTier.addEventListener('click', e => { if (e.target === tlModalTier) { tlModalTier.classList.add('hidden'); tlTierModalCtx = null; } });
tlModalTierLabel.addEventListener('keydown', e => {
  if (e.key === 'Enter') tlConfirmTierModal();
  if (e.key === 'Escape') { tlModalTier.classList.add('hidden'); tlTierModalCtx = null; }
});
tlModalTierColor.addEventListener('input', () => {
  tlTierSelectedColor = tlModalTierColor.value;
  tlColorSwatches.querySelectorAll('.tl-swatch').forEach(s => s.classList.remove('selected'));
});

// Init swatches au démarrage
tlInitSwatches();

tlBtnImportImages.addEventListener('click', () => tlFileInput.click());
tlFileInput.addEventListener('change', () => { if (tlFileInput.files.length) tlImportImages(tlFileInput.files); tlFileInput.value = ''; });

tlBtnExport.addEventListener('click', tlExport);

tlShowLabelsToggle.addEventListener('change', () => {
  const tl = tlActiveTierlist();
  if (!tl) return;
  tl.showLabels = tlShowLabelsToggle.checked;
  tlSave();
  tlRender();
});

tlImgSizeSlider.addEventListener('input', () => {
  const tl = tlActiveTierlist();
  if (!tl) return;
  tl.imgSize = parseInt(tlImgSizeSlider.value);
  tlSave();
  tlRender();
});

tlBtnShowArchived.addEventListener('click', () => {
  tlRenderArchivedModal();
  tlModalArchived.classList.remove('hidden');
});
tlModalArchivedClose.addEventListener('click', () => tlModalArchived.classList.add('hidden'));
tlModalArchived.addEventListener('click', e => { if (e.target === tlModalArchived) tlModalArchived.classList.add('hidden'); });

tlModalImgNameConfirm.addEventListener('click', tlConfirmRenameImg);
tlModalImgNameCancel.addEventListener('click', () => { tlModalImgName.classList.add('hidden'); tlRenameImgContext = null; });
tlModalImgNameClose.addEventListener('click', () => { tlModalImgName.classList.add('hidden'); tlRenameImgContext = null; });
tlModalImgName.addEventListener('click', e => { if (e.target === tlModalImgName) { tlModalImgName.classList.add('hidden'); tlRenameImgContext = null; } });
tlModalImgNameInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') tlConfirmRenameImg();
  if (e.key === 'Escape') { tlModalImgName.classList.add('hidden'); tlRenameImgContext = null; }
});

// Drag & drop global — images depuis le bureau
tlUnplacedZone.addEventListener('dragover', tlDragOver);
tlUnplacedZone.addEventListener('drop', e => {
  e.preventDefault();
  tlUnplacedZone.classList.remove('drag-over');
  // Si on drop des fichiers depuis le bureau
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    tlImportImages(e.dataTransfer.files);
    return;
  }
  tlDrop(e, '__unplaced__');
});
tlUnplacedZone.addEventListener('dragleave', tlDragLeave);

// ── Coller depuis le presse-papier ────────────────────────────────────────────
document.addEventListener('paste', e => {
  const tl = tlActiveTierlist();
  if (!tl) return;
  // Vérifier qu'on est sur la page tierlist
  const tlPage = document.getElementById('page-tierlist');
  if (!tlPage.classList.contains('active')) return;
  // Ignorer si on est dans un champ texte
  const tag = document.activeElement.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;

  const items = e.clipboardData && e.clipboardData.items;
  if (!items) return;
  const imageItems = Array.from(items).filter(it => it.type.startsWith('image/'));
  if (imageItems.length === 0) return;

  if (!tl.images) tl.images = [];
  const promises = imageItems.map(it => new Promise(resolve => {
    const file = it.getAsFile();
    if (!file) return resolve();
    const reader = new FileReader();
    reader.onload = ev => {
      const now = new Date();
      const name = `capture_${now.getHours()}h${String(now.getMinutes()).padStart(2,'0')}`;
      const img = { id: uid(), src: ev.target.result, name };
      tl.images.push(img);
      tl.unplaced.push(img.id);
      resolve();
    };
    reader.readAsDataURL(file);
  }));

  Promise.all(promises).then(() => { tlSave(); tlRender(); });
});

// ══════════════════════════════════════════════════════════════════════════════
// Initialisation Firebase temps réel
// ══════════════════════════════════════════════════════════════════════════════

// ── Bingo ─────────────────────────────────────────────────────────────────────
_dbBingo.on('value', snapshot => {
  _bingoRemoteUpdate = true;
  const raw = snapshot.val();
  const migrated = migrateState(raw);
  state = migrated || initState();

  // Normaliser l'état (comme dans init())
  if (!state.themes) state.themes = [];
  state.themes.forEach(t => {
    if (!t.elements) t.elements = [];
    if (!t.grids)    t.grids    = [];
    if (t.cellFontScale === undefined) t.cellFontScale = 1;
    if (!t.cellFont) t.cellFont = AVAILABLE_FONTS[0].value;
    t.grids.forEach(g => {
      const expected = g.gridSize * g.gridSize;
      if (!g.grid || g.grid.length !== expected) {
        g.grid = Array.from({ length: expected }, () => ({ elementId: null, checked: false }));
      }
    });
    if (t.grids.length > 0 && !t.grids.find(g => g.id === t.activeGridId)) {
      t.activeGridId = t.grids[0].id;
    }
  });
  if (state.themes.length > 0 && !state.themes.find(t => t.id === state.activeThemeId)) {
    const nonArchived = state.themes.filter(t => !t.archived);
    state.activeThemeId = nonArchived.length > 0 ? nonArchived[0].id : state.themes[0].id;
  }

  // Premier chargement : init les fonts
  const fontSelectEl = document.getElementById('font-family-select');
  if (fontSelectEl && fontSelectEl.options.length === 0) {
    AVAILABLE_FONTS.forEach(f => {
      const opt = document.createElement('option');
      opt.value = f.value;
      opt.textContent = f.label;
      opt.style.fontFamily = f.value;
      fontSelectEl.appendChild(opt);
    });
  }

  renderThemesList();
  renderElements();
  renderGridsList();
  renderGrid();
  _bingoRemoteUpdate = false;
});

// ── Tier List ─────────────────────────────────────────────────────────────────
tlRender();
