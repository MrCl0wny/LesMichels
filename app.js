/* ═══════════════════════════════════════════════
   LesMichels — app.js
   Bingo — logique principale
═══════════════════════════════════════════════ */

// ──────────────────────────────────────────────
// État global — chargé depuis localStorage
// ──────────────────────────────────────────────
const STORAGE_KEY = 'lesmichels_bingo_v2';

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

  // État vide ou corrompu : pas de thèmes du tout
  if (!raw.themes || raw.themes.length === 0) return null;

  return raw;
}

let state = (function () {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    // Essayer aussi l'ancien storage key
    const rawOld = !raw ? localStorage.getItem('lesmichels_bingo') : null;
    const parsed = raw ? JSON.parse(raw) : rawOld ? JSON.parse(rawOld) : null;
    return migrateState(parsed) || initState();
  } catch (e) {
    return initState();
  }
})();

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

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Sauvegarde impossible :', e);
  }
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
// ──────────────────────────────────────────────
function init() {
  AVAILABLE_FONTS.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.value;
    opt.textContent = f.label;
    opt.style.fontFamily = f.value;
    fontFamilySelect.appendChild(opt);
  });

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

  renderThemesList();
  renderElements();
  renderGridsList();
  renderGrid();
}

init();
