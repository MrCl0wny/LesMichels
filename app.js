/* ═══════════════════════════════════════════════
   LesMichels — app.js
   Bingo TV — logique principale
═══════════════════════════════════════════════ */

// ──────────────────────────────────────────────
// État global — chargé depuis localStorage
// ──────────────────────────────────────────────
const STORAGE_KEY = 'lesmichels_bingo';

let state = loadState() || {
  elements: [],      // { id, text, archived }
  gridSize: 4,       // N pour une grille N×N
  grid: [],          // tableau de { elementId | null, checked }
};

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

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

// ──────────────────────────────────────────────
// Éléments DOM
// ──────────────────────────────────────────────
const inputEl        = document.getElementById('new-element-input');
const btnAdd         = document.getElementById('btn-add-element');
const listActive     = document.getElementById('elements-list');
const listArchived   = document.getElementById('elements-archived');
const elementCount   = document.getElementById('element-count');
const tabBtns        = document.querySelectorAll('.tab-btn');
const gridEl         = document.getElementById('bingo-grid');
const bingoMsg       = document.getElementById('bingo-message');
const sizeDisplay    = document.getElementById('grid-size-display');
const btnSizeMinus   = document.getElementById('btn-size-minus');
const btnSizePlus    = document.getElementById('btn-size-plus');
const btnGenerate    = document.getElementById('btn-generate');
const btnReset       = document.getElementById('btn-reset');

// ──────────────────────────────────────────────
// Rendu : liste d'éléments
// ──────────────────────────────────────────────
function renderElements() {
  const active   = state.elements.filter(e => !e.archived);
  const archived = state.elements.filter(e => e.archived);

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
  li.className = 'element-item' + (isArchived ? ' archived' : '');
  li.dataset.id = el.id;

  const span = document.createElement('span');
  span.className = 'element-text';
  span.textContent = el.text;

  li.appendChild(span);

  if (!isArchived) {
    // Bouton archiver
    const btnArch = document.createElement('button');
    btnArch.className = 'elem-btn archive';
    btnArch.title = 'Archiver';
    btnArch.textContent = '📦';
    btnArch.addEventListener('click', () => archiveElement(el.id));
    li.appendChild(btnArch);
  } else {
    // Bouton restaurer
    const btnRestore = document.createElement('button');
    btnRestore.className = 'elem-btn restore';
    btnRestore.title = 'Restaurer';
    btnRestore.textContent = '↩';
    btnRestore.addEventListener('click', () => restoreElement(el.id));
    li.appendChild(btnRestore);
  }

  // Bouton supprimer
  const btnDel = document.createElement('button');
  btnDel.className = 'elem-btn delete';
  btnDel.title = 'Supprimer';
  btnDel.textContent = '✕';
  btnDel.addEventListener('click', () => deleteElement(el.id));
  li.appendChild(btnDel);

  return li;
}

// ──────────────────────────────────────────────
// Actions sur les éléments
// ──────────────────────────────────────────────
function addElement() {
  const text = inputEl.value.trim();
  if (!text) return;

  state.elements.push({ id: uid(), text, archived: false });
  inputEl.value = '';
  saveState();
  renderElements();
}

function deleteElement(id) {
  state.elements = state.elements.filter(e => e.id !== id);
  // Retirer de la grille si présent
  state.grid = state.grid.map(cell =>
    cell.elementId === id ? { elementId: null, checked: false } : cell
  );
  saveState();
  renderElements();
  renderGrid();
}

function archiveElement(id) {
  const el = state.elements.find(e => e.id === id);
  if (el) el.archived = true;
  saveState();
  renderElements();
}

function restoreElement(id) {
  const el = state.elements.find(e => e.id === id);
  if (el) el.archived = false;
  saveState();
  renderElements();
}

// ──────────────────────────────────────────────
// Grille
// ──────────────────────────────────────────────
const MIN_SIZE = 2;
const MAX_SIZE = 8;

function generateGrid() {
  const n = state.gridSize;
  const cellCount = n * n;

  const active = state.elements.filter(e => !e.archived);
  const pool   = shuffle(active).slice(0, cellCount);

  state.grid = Array.from({ length: cellCount }, (_, i) => ({
    elementId: pool[i] ? pool[i].id : null,
    checked: false,
  }));

  saveState();
  renderGrid();
}

function resetGrid() {
  state.grid = state.grid.map(cell => ({ ...cell, checked: false }));
  saveState();
  renderGrid();
}

function toggleCell(index) {
  const cell = state.grid[index];
  if (!cell || !cell.elementId) return;
  cell.checked = !cell.checked;
  saveState();
  renderGrid();
}

function renderGrid() {
  const n = state.gridSize;
  sizeDisplay.textContent = `${n}×${n}`;

  // Recalcule les bingos
  const bingoIndices = getBingoIndices(n, state.grid);

  gridEl.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
  gridEl.innerHTML = '';

  state.grid.forEach((cell, i) => {
    const div = document.createElement('div');
    div.className = 'bingo-cell';

    if (!cell.elementId) {
      div.classList.add('empty');
      div.textContent = '—';
    } else {
      const el = state.elements.find(e => e.id === cell.elementId);
      div.textContent = el ? el.text : '?';

      if (cell.checked)      div.classList.add('checked');
      if (bingoIndices.has(i)) div.classList.add('bingo-line');

      div.addEventListener('click', () => toggleCell(i));
    }

    gridEl.appendChild(div);
  });

  // Message bingo
  if (bingoIndices.size > 0) {
    bingoMsg.classList.remove('hidden');
  } else {
    bingoMsg.classList.add('hidden');
  }
}

// ──────────────────────────────────────────────
// Détection des bingos (lignes, colonnes, diagonales)
// ──────────────────────────────────────────────
function getBingoIndices(n, grid) {
  const result = new Set();

  const isChecked = (r, c) => {
    const cell = grid[r * n + c];
    return cell && cell.elementId && cell.checked;
  };

  // Lignes
  for (let r = 0; r < n; r++) {
    if (Array.from({ length: n }, (_, c) => isChecked(r, c)).every(Boolean)) {
      for (let c = 0; c < n; c++) result.add(r * n + c);
    }
  }

  // Colonnes
  for (let c = 0; c < n; c++) {
    if (Array.from({ length: n }, (_, r) => isChecked(r, c)).every(Boolean)) {
      for (let r = 0; r < n; r++) result.add(r * n + c);
    }
  }

  // Diagonale principale (↘)
  if (Array.from({ length: n }, (_, i) => isChecked(i, i)).every(Boolean)) {
    for (let i = 0; i < n; i++) result.add(i * n + i);
  }

  // Diagonale secondaire (↙)
  if (Array.from({ length: n }, (_, i) => isChecked(i, n - 1 - i)).every(Boolean)) {
    for (let i = 0; i < n; i++) result.add(i * n + (n - 1 - i));
  }

  return result;
}

// ──────────────────────────────────────────────
// Taille de grille
// ──────────────────────────────────────────────
function changeSize(delta) {
  const newSize = state.gridSize + delta;
  if (newSize < MIN_SIZE || newSize > MAX_SIZE) return;

  state.gridSize = newSize;
  const cellCount = newSize * newSize;

  // Adapter la grille existante
  if (state.grid.length < cellCount) {
    while (state.grid.length < cellCount) {
      state.grid.push({ elementId: null, checked: false });
    }
  } else {
    state.grid = state.grid.slice(0, cellCount);
  }

  saveState();
  renderGrid();
}

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

btnGenerate.addEventListener('click', generateGrid);
btnReset.addEventListener('click', resetGrid);

// ──────────────────────────────────────────────
// Initialisation
// ──────────────────────────────────────────────
function init() {
  // Si la grille est vide ou de mauvaise taille, on initialise
  const expectedSize = state.gridSize * state.gridSize;
  if (!state.grid || state.grid.length !== expectedSize) {
    state.grid = Array.from({ length: expectedSize }, () => ({
      elementId: null,
      checked: false,
    }));
  }

  renderElements();
  renderGrid();
}

init();
