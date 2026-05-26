/* ═══════════════════════════════════════════════
   LesMichels — app.js
═══════════════════════════════════════════════ */

// ──────────────────────────────────────────────
// Authentification Firebase Google
// ──────────────────────────────────────────────
let currentUser = null;
let currentPseudo = null;

const _auth = firebase.auth();

function setupAuth() {
  const modalAuth    = document.getElementById('modal-auth');
  const btnGoogle    = document.getElementById('btn-google-signin');
  const userBadge    = document.getElementById('user-badge');
  const userAvatar   = document.getElementById('user-avatar');
  const userName     = document.getElementById('user-name');
  const btnSignout   = document.getElementById('btn-signout');

  btnGoogle.addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    _auth.signInWithPopup(provider).catch(err => {
      console.error('Erreur connexion Google:', err);
      alert('Erreur lors de la connexion. Réessaie.');
    });
  });

  btnSignout.addEventListener('click', () => {
    _auth.signOut();
  });

  _auth.onAuthStateChanged(user => {
    if (user) {
      currentUser  = user;
      currentPseudo = user.displayName || user.email;
      modalAuth.classList.add('hidden');
      userBadge.classList.remove('hidden');
      userAvatar.src = user.photoURL || '';
      userAvatar.style.display = user.photoURL ? 'block' : 'none';
      userName.textContent = user.displayName || user.email;
    } else {
      currentUser   = null;
      currentPseudo = null;
      modalAuth.classList.remove('hidden');
      userBadge.classList.add('hidden');
    }
  });
}

setupAuth();

// ──────────────────────────────────────────────
// Firebase — références
// ──────────────────────────────────────────────
const _dbBingo = window._db.ref('bingo');

// ──────────────────────────────────────────────
// État global Bingo
// ──────────────────────────────────────────────

// La taille de texte est locale (par navigateur), pas partagée via Firebase
const _LOCAL_FONT_SCALE_KEY = 'lesmichels_bingo_fontscale';
let _localFontScale = parseFloat(localStorage.getItem(_LOCAL_FONT_SCALE_KEY)) || 1;

function saveLocalFontScale(scale) {
  _localFontScale = Math.max(0.5, Math.min(3, scale));
  localStorage.setItem(_LOCAL_FONT_SCALE_KEY, _localFontScale);
}

// IDs des grilles sélectionnées (affichées simultanément, max 3, local non partagé)
// Stocké par thème : { [themeId]: [gridId, ...] }
const _LOCAL_SELECTED_GRIDS_KEY = 'lesmichels_bingo_selectedgrids_v2';
let _selectedGridIds = [];
let _selectedGridsByTheme = {};

function _loadSelectedGridsByTheme() {
  try {
    const raw = localStorage.getItem(_LOCAL_SELECTED_GRIDS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveLocalSelectedGrids(ids) {
  _selectedGridIds = ids.slice(0, 3);
  const themeId = state && state.activeThemeId;
  if (themeId) _selectedGridsByTheme[themeId] = _selectedGridIds.slice();
  localStorage.setItem(_LOCAL_SELECTED_GRIDS_KEY, JSON.stringify(_selectedGridsByTheme));
}

function loadLocalSelectedGridsForTheme(themeId) {
  return (_selectedGridsByTheme[themeId] || []).slice();
}

_selectedGridsByTheme = _loadSelectedGridsByTheme();

function defaultTheme(name) {
  return {
    id: uid(),
    name,
    elements: [],
    grids: [],
    activeGridId: null,
    locked: false,
  };
}

function defaultGrid(name) {
  return { id: uid(), name, gridSize: 4, grid: [], archived: false, hidden: false, title: '' };
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

  // Supprimer cellFont/cellFontScale des thèmes (désormais local)
  raw.themes.forEach(t => {
    delete t.cellFont;
    delete t.cellFontScale;
    if (t.locked === undefined) t.locked = false;
    if (t.grids) {
      t.grids.forEach(g => {
        if (g.archived === undefined) g.archived = false;
        if (g.hidden === undefined) g.hidden = false;
        if (g.title === undefined) g.title = '';
        if (g.locked === undefined) g.locked = false;
      });
    }
  });

  return raw;
}

let state = initState();
let _bingoRemoteUpdate = false;
let _firebaseReady = false;

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
  if (t.activeGridId) return t.grids.find(g => g.id === t.activeGridId) || null;
  return _selectedGridIds.length > 0
    ? t.grids.find(g => g.id === _selectedGridIds[0]) || null
    : null;
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
  if (_bingoRemoteUpdate || !_firebaseReady) return;
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
const bingoMsg         = document.getElementById('bingo-message');
const sizeDisplay      = document.getElementById('grid-size-display');
const btnSizeMinus     = document.getElementById('btn-size-minus');
const btnSizePlus      = document.getElementById('btn-size-plus');
const btnGenerate      = document.getElementById('btn-generate');
const btnReset         = document.getElementById('btn-reset');
const btnScreenshot    = document.getElementById('btn-screenshot-bingo');
const gridError        = document.getElementById('grid-error');
const gridsList        = document.getElementById('grids-list');
const btnNewGrid       = document.getElementById('btn-new-grid');
const themesList       = document.getElementById('themes-list');
const btnNewTheme      = document.getElementById('btn-new-theme');
const btnFontMinus       = document.getElementById('btn-font-minus');
const btnFontPlus        = document.getElementById('btn-font-plus');
const fontScaleInput     = document.getElementById('font-scale-input');
const gridWrapper        = document.getElementById('grid-wrapper');
const btnArchivedThemes     = document.getElementById('btn-archived-themes');
const modalArchivedThemes   = document.getElementById('modal-archived-themes');
const btnCloseArchivedModal = document.getElementById('btn-close-archived-modal');
const archivedThemesList    = document.getElementById('archived-themes-list');
const btnArchivedGrids      = document.getElementById('btn-archived-grids');
const modalArchivedGrids    = document.getElementById('modal-archived-grids');
const btnCloseArchivedGridsModal = document.getElementById('btn-close-archived-grids-modal');
const archivedGridsList     = document.getElementById('archived-grids-list');
const chkLockGenerate          = document.getElementById('chk-lock-generate');
const btnCollapsePanel         = document.getElementById('btn-collapse-panel');
const panelElements            = document.getElementById('panel-elements');
const panelElementsBody        = document.getElementById('panel-elements-body');
const bingoLayout              = document.getElementById('bingo-layout');
const btnCollapseControlPanel  = document.getElementById('btn-collapse-control-panel');
const bingoControlPanel        = document.getElementById('bingo-control-panel');
const bingoControlPanelBody    = document.getElementById('bingo-control-panel-body');
// Modales renommage
const modalRenameTheme      = document.getElementById('modal-rename-theme');
const renameThemeInput      = document.getElementById('rename-theme-input');
const btnConfirmRenameTheme = document.getElementById('btn-confirm-rename-theme');
const btnCancelRenameTheme  = document.getElementById('btn-cancel-rename-theme');
const btnCloseRenameThemeModal = document.getElementById('btn-close-rename-theme-modal');
const modalRenameGrid       = document.getElementById('modal-rename-grid');
const renameGridInput       = document.getElementById('rename-grid-input');
const btnConfirmRenameGrid  = document.getElementById('btn-confirm-rename-grid');
const btnCancelRenameGrid   = document.getElementById('btn-cancel-rename-grid');
const btnCloseRenameGridModal = document.getElementById('btn-close-rename-grid-modal');
let _renameThemeId = null;
let _renameGridId  = null;

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

    span.title = 'Double-clic pour modifier';
    span.style.cursor = 'text';
    span.addEventListener('dblclick', e => { e.stopPropagation(); startEditElement(el.id, span); });

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

    const btnDel = document.createElement('button');
    btnDel.className = 'elem-btn delete';
    btnDel.title = 'Supprimer';
    btnDel.textContent = '✕';
    btnDel.addEventListener('click', () => deleteElement(el.id));
    li.appendChild(btnDel);
  }

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
  _selectedGridIds = loadLocalSelectedGridsForTheme(id);
  if (_selectedGridIds.length === 0) {
    const t = state.themes.find(th => th.id === id);
    if (t) {
      const firstGrid = t.grids.find(g => !g.archived);
      if (firstGrid) _selectedGridIds = [firstGrid.id];
    }
  }
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

function duplicateTheme(id) {
  const src = state.themes.find(t => t.id === id);
  if (!src) return;
  const copy = JSON.parse(JSON.stringify(src));
  copy.id = uid();
  copy.name = src.name + ' (copie)';
  copy.archived = false;
  copy.grids = copy.grids.map(g => ({ ...g, id: uid() }));
  copy.activeGridId = copy.grids.find(g => !g.archived)?.id || null;
  state.themes.push(copy);
  state.activeThemeId = copy.id;
  saveState();
  renderThemesList();
  renderElements();
  renderGridsList();
  renderGrid();
}

function renderThemesList() {
  themesList.innerHTML = '';
  const activeThemes = state.themes.filter(t => !t.archived);

  if (activeThemes.length === 0) {
    const msg = document.createElement('span');
    msg.className = 'themes-empty-msg';
    msg.textContent = 'Aucun thème — crée-en un !';
    themesList.appendChild(msg);
    return;
  }

  activeThemes.forEach(t => {
    const item = document.createElement('div');
    item.className = 'theme-tab' + (t.id === state.activeThemeId ? ' active' : '');
    item.dataset.id = t.id;
    item.draggable = true;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'theme-tab-name';
    nameSpan.textContent = t.name;
    item.appendChild(nameSpan);

    item.addEventListener('click', () => switchTheme(t.id));

    item.addEventListener('dblclick', e => {
      e.stopPropagation();
      openCtxMenuTheme(t.id, e);
    });

    // Drag & drop pour réordonner les thèmes
    item.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', t.id);
      item.classList.add('dragging');
    });
    item.addEventListener('dragend', () => item.classList.remove('dragging'));
    item.addEventListener('dragover', e => { e.preventDefault(); item.classList.add('drag-over-tab'); });
    item.addEventListener('dragleave', () => item.classList.remove('drag-over-tab'));
    item.addEventListener('drop', e => {
      e.preventDefault();
      item.classList.remove('drag-over-tab');
      const srcId = e.dataTransfer.getData('text/plain');
      if (srcId === t.id) return;
      const srcIdx = state.themes.findIndex(x => x.id === srcId);
      const dstIdx = state.themes.findIndex(x => x.id === t.id);
      if (srcIdx === -1 || dstIdx === -1) return;
      const [moved] = state.themes.splice(srcIdx, 1);
      state.themes.splice(dstIdx, 0, moved);
      saveState();
      renderThemesList();
    });

    themesList.appendChild(item);
  });
}

// ──────────────────────────────────────────────
// Export PNG de la grille bingo
// ──────────────────────────────────────────────
function renderGridToCanvas(t, g) {
  const n = g.gridSize;
  const cellSize = 120;
  const gap = 3;
  const titleH = g.title ? 32 : 0;
  const headerH = 44;
  const totalW = n * cellSize + (n - 1) * gap;
  const totalH = titleH + headerH + n * cellSize + (n - 1) * gap;

  const canvas = document.createElement('canvas');
  canvas.width = totalW;
  canvas.height = totalH;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#18181c';
  ctx.fillRect(0, 0, totalW, totalH);

  // Titre personnalisé (au dessus)
  let offsetY = 0;
  if (g.title) {
    ctx.fillStyle = '#e8c547';
    ctx.font = 'bold 15px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(g.title, totalW / 2, titleH / 2);
    offsetY = titleH;
  }

  // Sous-titre : "ThèmeName — GridName"
  ctx.fillStyle = '#e8e8f0';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${t.name}  —  ${g.name}`, 8, offsetY + headerH / 2);

  const { indices: bingoIdx } = getBingoResult(n, g.grid);
  const scale = _localFontScale;

  for (let i = 0; i < n * n; i++) {
    const row = Math.floor(i / n);
    const col = i % n;
    const x = col * (cellSize + gap);
    const y = offsetY + headerH + row * (cellSize + gap);
    const cell = g.grid[i];
    const el = cell && cell.elementId ? t.elements.find(e => e.id === cell.elementId) : null;

    if (bingoIdx.has(i)) {
      ctx.fillStyle = '#4caf7d';
    } else if (cell && cell.checked) {
      ctx.fillStyle = '#2d6a4f';
    } else if (el) {
      ctx.fillStyle = '#23232e';
    } else {
      ctx.fillStyle = '#1a1a22';
    }
    ctx.fillRect(x, y, cellSize, cellSize);

    ctx.strokeStyle = '#333344';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);

    if (!el) continue;

    ctx.fillStyle = (bingoIdx.has(i) || (cell && cell.checked)) ? '#fff' : '#d0d0e8';
    const lenText = el.text.length;
    let basePx;
    if (lenText <= 6)       basePx = 20;
    else if (lenText <= 12) basePx = 16;
    else if (lenText <= 22) basePx = 13;
    else if (lenText <= 40) basePx = 11;
    else                    basePx = 9;
    const fontSize = Math.max(8, Math.round(basePx * scale));
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Word-wrap avec respect de la hauteur de cellule
    const maxW = cellSize - 14;
    const words = el.text.split(' ');
    const lines = [];
    let line = '';
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);

    const lineH = fontSize + 4;
    const totalTextH = lines.length * lineH;
    const startY = y + (cellSize - totalTextH) / 2;
    lines.forEach((l, li) => {
      ctx.fillText(l, x + cellSize / 2, startY + li * lineH);
    });
  }

  return canvas;
}

function getVisibleGrids() {
  const t = activeTheme();
  if (!t) return [];
  const activeGrids = t.grids.filter(x => !x.archived);
  if (activeGrids.length === 0) return [];

  // Nettoyer les ids sélectionnés qui n'existent plus
  _selectedGridIds = _selectedGridIds.filter(id => activeGrids.some(x => x.id === id));

  // Retourner dans l'ordre de _selectedGridIds, filtré par grilles existantes
  return _selectedGridIds.map(id => activeGrids.find(x => x.id === id)).filter(Boolean);
}


let _audioCtx = null;
function _getAudioCtx() {
  if (!_audioCtx || _audioCtx.state === 'closed') {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (_audioCtx.state === 'suspended') {
    _audioCtx.resume();
  }
  return _audioCtx;
}

function playCaptureSound() {
  try {
    const ctx = _getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
  } catch (e) {}
}

function copyGridToClipboard(grids) {
  const t = activeTheme();
  if (!t || grids.length === 0) return;
  let canvas;
  if (grids.length === 1) {
    canvas = renderGridToCanvas(t, grids[0]);
  } else {
    const canvases = grids.map(gx => renderGridToCanvas(t, gx));
    const gap = 12;
    const totalW = canvases.reduce((s, c) => s + c.width, 0) + gap * (canvases.length - 1);
    const totalH = Math.max(...canvases.map(c => c.height));
    canvas = document.createElement('canvas');
    canvas.width = totalW;
    canvas.height = totalH;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0e0e10';
    ctx.fillRect(0, 0, totalW, totalH);
    let xOff = 0;
    canvases.forEach(c => { ctx.drawImage(c, xOff, 0); xOff += c.width + gap; });
  }
  canvas.toBlob(blob => {
    if (!blob) return;
    navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).then(() => {
      playCaptureSound();
    }).catch(err => {
      console.warn('Clipboard write failed:', err);
    });
  }, 'image/png');
}

function bingoScreenshot() {
  copyGridToClipboard(getVisibleGrids());
}

function bingoScreenshotOne(gId) {
  const t = activeTheme();
  if (!t) return;
  const g = t.grids.find(x => x.id === gId);
  if (!g) return;
  copyGridToClipboard([g]);
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

function openRenameThemeModal(id) {
  const t = state.themes.find(t => t.id === id);
  if (!t) return;
  _renameThemeId = id;
  renameThemeInput.value = t.name;
  modalRenameTheme.classList.remove('hidden');
  setTimeout(() => { renameThemeInput.focus(); renameThemeInput.select(); }, 50);
}

function closeRenameThemeModal() {
  modalRenameTheme.classList.add('hidden');
  _renameThemeId = null;
}

function confirmRenameTheme() {
  if (!_renameThemeId) return;
  renameTheme(_renameThemeId, renameThemeInput.value);
  closeRenameThemeModal();
}

// ──────────────────────────────────────────────
// Grilles (dans le thème actif)
// ──────────────────────────────────────────────
const MIN_SIZE = 3;
const MAX_SIZE = 5;

function createGrid(name) {
  const t = activeTheme();
  const g = defaultGrid(name);
  const n = g.gridSize;
  g.grid  = Array.from({ length: n * n }, () => ({ elementId: null, checked: false }));
  t.grids.push(g);
  t.activeGridId = g.id;
  // Sélectionner automatiquement la nouvelle grille
  if (!_selectedGridIds.includes(g.id)) {
    if (_selectedGridIds.length >= 3) _selectedGridIds.pop();
    _selectedGridIds.unshift(g.id);
    saveLocalSelectedGrids(_selectedGridIds);
  }
  saveState();
  renderGridsList();
  renderGrid();
}

function getGlobalCheckedElementIds(t) {
  const checked = new Set();
  t.grids.filter(gx => !gx.archived).forEach(gx => {
    gx.grid.forEach(c => { if (c.checked && c.elementId) checked.add(c.elementId); });
  });
  return checked;
}

function switchGrid(id) {
  const t = activeTheme();
  if (!t) return;
  t.activeGridId = id;
  // Ajouter à la sélection si pas déjà dedans (max 3)
  if (!_selectedGridIds.includes(id)) {
    if (_selectedGridIds.length >= 3) _selectedGridIds.pop();
    _selectedGridIds.unshift(id);
    saveLocalSelectedGrids(_selectedGridIds);
  }
  saveState();
  renderGridsList();
  renderGrid();
}

function deleteGrid(id) {
  const t = activeTheme();
  if (!t) return;
  t.grids = t.grids.filter(g => g.id !== id);
  if (t.activeGridId === id) {
    const remaining = t.grids.filter(g => !g.archived);
    t.activeGridId = remaining.length > 0 ? remaining[0].id : null;
  }
  saveState();
  renderGridsList();
  renderGrid();
}

function renameGrid(id, newName) {
  const t = activeTheme();
  const g = t?.grids.find(g => g.id === id);
  if (g && newName.trim()) { g.name = newName.trim(); g.title = newName.trim(); }
  saveState();
  renderGridsList();
  renderGrid();
}

function duplicateGrid(id) {
  const t = activeTheme();
  if (!t) return;
  const src = t.grids.find(g => g.id === id);
  if (!src) return;
  const copy = JSON.parse(JSON.stringify(src));
  copy.id = uid();
  copy.name = src.name + ' (copie)';
  copy.archived = false;
  copy.hidden = false;
  t.grids.push(copy);
  t.activeGridId = copy.id;
  saveState();
  renderGridsList();
  renderGrid();
}

function toggleHideGrid(id) {
  const t = activeTheme();
  if (!t) return;
  const g = t.grids.find(g => g.id === id);
  if (!g) return;
  g.hidden = !g.hidden;
  saveState();
  renderGridsList();
  renderGrid();
}

function renderGridsList() {
  gridsList.innerHTML = '';
  const t = activeTheme();
  if (!t) return;
  const activeGrids = t.grids.filter(g => !g.archived);

  // Nettoyer les ids sélectionnés obsolètes (grilles supprimées/archivées)
  _selectedGridIds = _selectedGridIds.filter(id => activeGrids.some(x => x.id === id));

  activeGrids.forEach(g => {
    const isSelected = _selectedGridIds.includes(g.id);
    const isActive = g.id === t.activeGridId;
    const item = document.createElement('div');
    item.className = 'grid-tab' + (isActive && isSelected ? ' active' : '') + (isSelected ? ' grid-tab-selected' : '');
    item.dataset.id = g.id;
    item.draggable = true;
    item.title = isSelected ? 'Cliquer pour masquer cette grille' : 'Cliquer pour afficher cette grille (max 3)';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'grid-tab-name';
    nameSpan.textContent = g.name;
    item.appendChild(nameSpan);

    // Drag & drop pour réordonner
    item.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', g.id);
      item.classList.add('dragging');
    });
    item.addEventListener('dragend', () => item.classList.remove('dragging'));
    item.addEventListener('dragover', e => { e.preventDefault(); item.classList.add('drag-over-tab'); });
    item.addEventListener('dragleave', () => item.classList.remove('drag-over-tab'));
    item.addEventListener('drop', e => {
      e.preventDefault();
      item.classList.remove('drag-over-tab');
      const srcId = e.dataTransfer.getData('text/plain');
      if (srcId === g.id) return;
      const tNow = activeTheme();
      if (!tNow) return;
      const srcIdx = tNow.grids.findIndex(x => x.id === srcId);
      const dstIdx = tNow.grids.findIndex(x => x.id === g.id);
      if (srcIdx === -1 || dstIdx === -1) return;
      const [moved] = tNow.grids.splice(srcIdx, 1);
      tNow.grids.splice(dstIdx, 0, moved);
      saveState();
      renderGridsList();
      renderGrid();
    });

    let _clickTimer = null;
    item.addEventListener('click', e => {
      if (_clickTimer) { clearTimeout(_clickTimer); _clickTimer = null; return; }
      _clickTimer = setTimeout(() => {
        _clickTimer = null;
        const tNow = activeTheme();
        if (!tNow) return;
        const nowSelected = _selectedGridIds.includes(g.id);
        if (nowSelected) {
          _selectedGridIds = _selectedGridIds.filter(id => id !== g.id);
          if (tNow.activeGridId === g.id) {
            tNow.activeGridId = _selectedGridIds.length > 0 ? _selectedGridIds[0] : null;
          }
        } else {
          if (_selectedGridIds.length >= 3) return;
          _selectedGridIds.push(g.id);
          tNow.activeGridId = g.id;
        }
        saveLocalSelectedGrids(_selectedGridIds);
        saveState();
        renderGridsList();
        renderGrid();
      }, 220);
    });

    item.addEventListener('dblclick', e => {
      e.stopPropagation();
      if (_clickTimer) { clearTimeout(_clickTimer); _clickTimer = null; }
      openCtxMenuGrid(g.id, e);
    });

    gridsList.appendChild(item);
  });
}

function openRenameGridModal(id) {
  const t = activeTheme();
  if (!t) return;
  const g = t.grids.find(g => g.id === id);
  if (!g) return;
  _renameGridId = id;
  renameGridInput.value = g.name;
  modalRenameGrid.classList.remove('hidden');
  setTimeout(() => { renameGridInput.focus(); renameGridInput.select(); }, 50);
}

function closeRenameGridModal() {
  modalRenameGrid.classList.add('hidden');
  _renameGridId = null;
}

function confirmRenameGrid() {
  if (!_renameGridId) return;
  renameGrid(_renameGridId, renameGridInput.value);
  closeRenameGridModal();
}

function archiveGrid(id) {
  const t = activeTheme();
  if (!t) return;
  const g = t.grids.find(g => g.id === id);
  if (!g) return;
  g.archived = true;
  if (t.activeGridId === id) {
    const remaining = t.grids.filter(x => !x.archived);
    t.activeGridId = remaining.length > 0 ? remaining[0].id : null;
  }
  saveState();
  renderGridsList();
  renderGrid();
}

function renderArchivedGridsModal() {
  archivedGridsList.innerHTML = '';
  const t = activeTheme();
  if (!t) {
    archivedGridsList.innerHTML = '<p class="archived-empty">Aucun thème actif.</p>';
    return;
  }
  const archived = t.grids.filter(g => g.archived);
  if (archived.length === 0) {
    archivedGridsList.innerHTML = '<p class="archived-empty">Aucune grille archivée.</p>';
    return;
  }
  archived.forEach(g => {
    const item = document.createElement('div');
    item.className = 'archived-theme-item';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'archived-theme-name';
    nameSpan.textContent = g.name;
    item.appendChild(nameSpan);

    const btnRestore = document.createElement('button');
    btnRestore.className = 'archived-theme-btn restore';
    btnRestore.textContent = '↩ Restaurer';
    btnRestore.addEventListener('click', () => {
      g.archived = false;
      saveState();
      renderGridsList();
      renderArchivedGridsModal();
    });
    item.appendChild(btnRestore);

    const btnDel = document.createElement('button');
    btnDel.className = 'archived-theme-btn del';
    btnDel.textContent = '✕ Supprimer';
    btnDel.addEventListener('click', () => {
      deleteGrid(g.id);
      renderArchivedGridsModal();
    });
    item.appendChild(btnDel);

    archivedGridsList.appendChild(item);
  });
}

// ──────────────────────────────────────────────
// Grille — actions
// ──────────────────────────────────────────────
function generateOneGrid(t, g) {
  if (g.locked) return false;
  const n = g.gridSize;
  const cellCount = n * n;
  const active = t.elements.filter(e => !e.archived);
  if (active.length < cellCount) return false;
  const pool = shuffle(active).slice(0, cellCount);
  // Utiliser les cases cochées de toutes les grilles (état partagé)
  const globalChecked = getGlobalCheckedElementIds(t);
  g.grid = Array.from({ length: cellCount }, (_, i) => ({
    elementId: pool[i] ? pool[i].id : null,
    checked: pool[i] ? globalChecked.has(pool[i].id) : false,
  }));
  return true;
}

function generateGrid() {
  const t0 = activeTheme();
  if (t0 && t0.locked) return;
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

  generateOneGrid(t, g);
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


function changeFontScale(delta) {
  saveLocalFontScale(_localFontScale + delta);
  applyFontScale();
}

function applyFontScale() {
  const scale = _localFontScale;
  const pct = Math.round(scale * 100);
  fontScaleInput.value = pct;

  const t = activeTheme();
  if (!t) return;
  gridWrapper.querySelectorAll('.bingo-cell:not(.empty)').forEach(div => {
    const idx = parseInt(div.dataset.index);
    if (isNaN(idx)) return;
    const gridId = div.closest('[data-grid-id]')?.dataset.gridId;
    const g = gridId ? t.grids.find(x => x.id === gridId) : activeGrid();
    if (!g) return;
    const cell = g.grid[idx];
    if (!cell || !cell.elementId) return;
    const el = t.elements.find(e => e.id === cell.elementId);
    if (el) div.style.fontSize = getCellFontSize(el.text, scale);
  });
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

// Mode placement manuel supprimé
const manualMode = false;

function buildSingleGrid(t, g, isActive) {
  const n = g.gridSize;
  const scale = _localFontScale;
  const { indices: bingoIndices, lines: bingoLines } = getBingoResult(n, g.grid);

  const wrapper = document.createElement('div');
  wrapper.className = 'grid-view-wrapper';
  wrapper.dataset.gridId = g.id;

  // Titre de grille éditable (synchronisé avec le nom de l'onglet)
  const titleRow = document.createElement('div');
  titleRow.className = 'grid-view-title-row';
  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.className = 'grid-view-title-input';
  titleInput.placeholder = g.name;
  titleInput.value = g.title || g.name;
  titleInput.maxLength = 60;
  titleInput.addEventListener('input', () => {
    const tNow = activeTheme();
    if (!tNow) return;
    const gNow = tNow.grids.find(x => x.id === g.id);
    if (!gNow) return;
    const val = titleInput.value.trim();
    gNow.title = val;
    gNow.name = val || gNow.name;
    // Mettre à jour l'onglet en live sans re-render complet
    const tabEl = gridsList.querySelector(`.grid-tab[data-id="${g.id}"] .grid-tab-name`);
    if (tabEl && val) tabEl.textContent = val;
  });
  titleInput.addEventListener('change', () => {
    const tNow = activeTheme();
    if (!tNow) return;
    const gNow = tNow.grids.find(x => x.id === g.id);
    if (!gNow) return;
    const val = titleInput.value.trim();
    if (val) { gNow.title = val; gNow.name = val; }
    saveState();
    renderGridsList();
  });
  titleRow.appendChild(titleInput);
  wrapper.appendChild(titleRow);

  // Contrôles par grille (ordre : Bloquer | Générer | Reset | Capture)
  const subCtrl = document.createElement('div');
  subCtrl.className = 'subgrid-controls';

  const globalLocked = !!t.locked;
  const gridLocked = g.locked || globalLocked;

  const lblLock = document.createElement('label');
  lblLock.className = 'subgrid-lock-label';
  lblLock.title = 'Bloquer la génération et le reset de cette grille';
  const chkLock = document.createElement('input');
  chkLock.type = 'checkbox';
  chkLock.checked = gridLocked;
  chkLock.disabled = globalLocked;
  chkLock.addEventListener('change', () => {
    const tNow = activeTheme();
    if (!tNow || tNow.locked) return;
    const gNow = tNow.grids.find(x => x.id === g.id);
    if (gNow) { gNow.locked = chkLock.checked; saveState(); renderGrid(); }
  });
  lblLock.appendChild(chkLock);
  lblLock.appendChild(document.createTextNode('🔒'));
  subCtrl.appendChild(lblLock);

  const btnSubGen = document.createElement('button');
  btnSubGen.className = 'btn-action btn-subgrid' + (gridLocked ? ' btn-disabled' : '');
  btnSubGen.disabled = gridLocked || manualMode;
  btnSubGen.textContent = '🎲';
  btnSubGen.title = 'Générer cette grille';
  btnSubGen.addEventListener('click', () => {
    const tNow = activeTheme();
    if (!tNow || tNow.locked) return;
    const gNow = tNow.grids.find(x => x.id === g.id);
    if (!gNow || gNow.locked) return;
    const ok = generateOneGrid(tNow, gNow);
    if (!ok) {
      gridError.textContent = `⚠ Pas assez d'éléments actifs pour générer.`;
      gridError.classList.remove('hidden');
      return;
    }
    gridError.classList.add('hidden');
    saveState();
    renderGrid();
  });
  subCtrl.appendChild(btnSubGen);


  const btnSubCapture = document.createElement('button');
  btnSubCapture.className = 'btn-action btn-screenshot-bingo btn-subgrid';
  btnSubCapture.textContent = '📷';
  btnSubCapture.title = 'Copier cette grille dans le presse-papier';
  btnSubCapture.addEventListener('click', () => bingoScreenshotOne(g.id));
  subCtrl.appendChild(btnSubCapture);

  wrapper.appendChild(subCtrl);

  const gridEl = document.createElement('div');
  gridEl.className = 'bingo-grid';
  gridEl.style.gridTemplateColumns = `repeat(${n}, 1fr)`;

  g.grid.forEach((cell, i) => {
    const div = document.createElement('div');
    div.className = 'bingo-cell';
    div.dataset.index = i;

    if (manualMode && isActive) {
      div.classList.add('manual-target');
      div.addEventListener('dragover', e => { e.preventDefault(); div.classList.add('drag-over'); });
      div.addEventListener('dragleave', () => div.classList.remove('drag-over'));
      div.addEventListener('drop', e => {
        e.preventDefault();
        div.classList.remove('drag-over');
        const elId = e.dataTransfer.getData('text/plain');
        const targetIdx = parseInt(div.dataset.index);
        if (elId && !isNaN(targetIdx)) {
          const prevChecked = g.grid[targetIdx]?.checked || false;
          g.grid[targetIdx] = { elementId: elId, checked: prevChecked };
          saveState();
          renderGrid();
          renderElements();
        }
      });
    }

    if (!cell.elementId) {
      div.classList.add('empty');
      div.textContent = (manualMode && isActive) ? '+ Dépose ici' : '—';
    } else {
      const el = t.elements.find(e => e.id === cell.elementId);
      const cellText = el ? el.text : '?';
      div.textContent = cellText;
      div.style.fontSize = getCellFontSize(cellText, scale);

      if (cell.checked)        div.classList.add('checked');
      if (bingoIndices.has(i)) div.classList.add('bingo-line');

      if (!manualMode || !isActive) {
        div.addEventListener('click', () => {
          if (!cell.elementId) return;
          const newChecked = !cell.checked;
          // Appliquer le même état à toutes les grilles non-archivées contenant cet élément
          const tNow = activeTheme();
          if (tNow) {
            tNow.grids.filter(gx => !gx.archived).forEach(gx => {
              const matchCell = gx.grid.find(c => c.elementId === cell.elementId);
              if (matchCell) matchCell.checked = newChecked;
            });
          }
          saveState();
          renderGrid();
        });
      } else {
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

  wrapper.appendChild(gridEl);

  // Message bingo individuel sous cette grille
  if (bingoLines.length > 0) {
    const msg = document.createElement('div');
    msg.className = 'bingo-message bingo-message-inline';
    const count = bingoLines.length;
    msg.innerHTML = count === 1
      ? `🎉 BINGO ! Tu as complété une ligne !`
      : `🎉 BINGO x${count} ! Tu as complété ${count} lignes !`;
    wrapper.appendChild(msg);
  }

  return { wrapper, bingoLines };
}

function renderGrid() {
  const t = activeTheme();
  const g = activeGrid();

  gridWrapper.innerHTML = '';

  if (!t) {
    gridWrapper.innerHTML = '<div class="no-grid-msg">Crée un thème pour commencer.</div>';
    sizeDisplay.textContent = '—';
    bingoMsg.classList.add('hidden');
    btnGenerate.disabled = true;
    btnGenerate.classList.add('btn-disabled');
    btnReset.disabled = false;
    btnReset.classList.remove('btn-disabled');
    chkLockGenerate.checked = false;
    return;
  }

  const hasAnyGrid = t.grids.some(x => !x.archived);
  if (!g && !hasAnyGrid) {
    gridWrapper.innerHTML = '<div class="no-grid-msg">Crée une grille pour commencer.</div>';
    sizeDisplay.textContent = '—';
    bingoMsg.classList.add('hidden');
    btnGenerate.disabled = false;
    btnGenerate.classList.remove('btn-disabled');
    btnReset.disabled = false;
    btnReset.classList.remove('btn-disabled');
    return;
  }

  const n = (g || t.grids.find(x => !x.archived)).gridSize;
  sizeDisplay.textContent = `${n}×${n}`;

  // Synchroniser le checkbox avec l'état Firebase du thème
  const locked = !!t.locked;
  chkLockGenerate.checked = locked;

  const activeCount = t.elements.filter(e => !e.archived).length;
  const enoughElements = activeCount >= n * n;
  btnGenerate.disabled = !enoughElements || locked;
  btnGenerate.classList.toggle('btn-disabled', !enoughElements || locked);
  btnReset.disabled = locked;
  btnReset.classList.toggle('btn-disabled', locked);
  if (enoughElements) gridError.classList.add('hidden');

  const gridsToShow = getVisibleGrids();

  if (gridsToShow.length === 0) {
    gridWrapper.innerHTML = '<div class="no-grid-msg">Aucune grille sélectionnée — clique sur un onglet pour afficher une grille.</div>';
    gridWrapper.className = 'grid-wrapper';
    bingoMsg.classList.add('hidden');
    return;
  }

  gridWrapper.className = `grid-wrapper grid-views-${gridsToShow.length}`;

  // Le message global est désormais remplacé par des messages individuels par grille
  bingoMsg.classList.add('hidden');

  gridsToShow.forEach(gridItem => {
    const isActive = gridItem.id === g.id;
    const { wrapper } = buildSingleGrid(t, gridItem, isActive);
    gridWrapper.appendChild(wrapper);
  });

  applyFontScale();
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
  const n = state.themes.length + 1;
  newThemeNameInput.value = `Thème ${n}`;
  modalNewTheme.classList.remove('hidden');
  setTimeout(() => { newThemeNameInput.focus(); newThemeNameInput.select(); }, 50);
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
  const pct = Math.max(50, Math.min(300, parseInt(fontScaleInput.value) || 100));
  saveLocalFontScale(pct / 100);
  applyFontScale();
});

chkLockGenerate.addEventListener('change', () => {
  const t = activeTheme();
  if (t) {
    t.locked = chkLockGenerate.checked;
    saveState();
  }
  renderGrid();
});

btnCollapsePanel.addEventListener('click', () => {
  const collapsed = panelElements.classList.toggle('panel-collapsed');
  bingoLayout.classList.toggle('panel-hidden', collapsed);
  btnCollapsePanel.textContent = collapsed ? '▶' : '◀';
  btnCollapsePanel.title = collapsed ? 'Ouvrir le panneau' : 'Réduire le panneau';
});

btnCollapseControlPanel.addEventListener('click', () => {
  const collapsed = bingoControlPanel.classList.toggle('panel-ctrl-collapsed');
  btnCollapseControlPanel.textContent = collapsed ? '▼' : '▲';
  btnCollapseControlPanel.title = collapsed ? 'Déployer le panneau de contrôle' : 'Rétracter le panneau de contrôle';
});

// ──────────────────────────────────────────────
// Menu contextuel — Thèmes
// ──────────────────────────────────────────────
const ctxMenuTheme  = document.getElementById('ctx-menu-theme');
const ctxThemeRename    = document.getElementById('ctx-theme-rename');
const ctxThemeDuplicate = document.getElementById('ctx-theme-duplicate');
const ctxThemeArchive   = document.getElementById('ctx-theme-archive');
let _ctxThemeId = null;

function openCtxMenuTheme(id, e) {
  _ctxThemeId = id;
  positionCtxMenu(ctxMenuTheme, e);
  ctxMenuTheme.classList.remove('hidden');
}

function closeCtxMenuTheme() {
  ctxMenuTheme.classList.add('hidden');
  _ctxThemeId = null;
}

ctxThemeRename.addEventListener('click', () => {
  if (_ctxThemeId) openRenameThemeModal(_ctxThemeId);
  closeCtxMenuTheme();
});
ctxThemeDuplicate.addEventListener('click', () => {
  if (_ctxThemeId) duplicateTheme(_ctxThemeId);
  closeCtxMenuTheme();
});
ctxThemeArchive.addEventListener('click', () => {
  if (_ctxThemeId) archiveTheme(_ctxThemeId);
  closeCtxMenuTheme();
});

// ──────────────────────────────────────────────
// Menu contextuel — Grilles
// ──────────────────────────────────────────────
const ctxMenuGrid    = document.getElementById('ctx-menu-grid');
const ctxGridRename    = document.getElementById('ctx-grid-rename');
const ctxGridDuplicate = document.getElementById('ctx-grid-duplicate');
const ctxGridArchive   = document.getElementById('ctx-grid-archive');
let _ctxGridId = null;

function openCtxMenuGrid(id, e) {
  _ctxGridId = id;
  positionCtxMenu(ctxMenuGrid, e);
  ctxMenuGrid.classList.remove('hidden');
}

function closeCtxMenuGrid() {
  ctxMenuGrid.classList.add('hidden');
  _ctxGridId = null;
}

ctxGridRename.addEventListener('click', () => {
  if (_ctxGridId) openRenameGridModal(_ctxGridId);
  closeCtxMenuGrid();
});
ctxGridDuplicate.addEventListener('click', () => {
  if (_ctxGridId) duplicateGrid(_ctxGridId);
  closeCtxMenuGrid();
});
ctxGridArchive.addEventListener('click', () => {
  if (_ctxGridId) archiveGrid(_ctxGridId);
  closeCtxMenuGrid();
});

function positionCtxMenu(menu, e) {
  menu.style.left = e.pageX + 'px';
  menu.style.top  = e.pageY + 'px';
  // Ajuster si déborde à droite ou en bas
  requestAnimationFrame(() => {
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth - 8)  menu.style.left = (e.pageX - rect.width) + 'px';
    if (rect.bottom > window.innerHeight - 8) menu.style.top = (e.pageY - rect.height) + 'px';
  });
}

document.addEventListener('click', () => {
  closeCtxMenuTheme();
  closeCtxMenuGrid();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeCtxMenuTheme(); closeCtxMenuGrid(); }
});

btnGenerate.addEventListener('click', () => {
  if (manualMode) return;
  const t = activeTheme();
  if (!t || t.locked) return;
  if (!activeGrid()) createGrid('Grille 1');
  const grids = getVisibleGrids();
  const n = activeGrid()?.gridSize || 4;
  const cellCount = n * n;
  const active = t.elements.filter(e => !e.archived);
  if (active.length < cellCount) {
    gridError.textContent = `⚠ Il faut au moins ${cellCount} éléments actifs pour générer une grille ${n}×${n} (${active.length}/${cellCount}).`;
    gridError.classList.remove('hidden');
    return;
  }
  gridError.classList.add('hidden');
  grids.forEach(gx => generateOneGrid(t, gx));
  saveState();
  renderGrid();
});


btnReset.addEventListener('click', () => {
  const t = activeTheme();
  if (!t || t.locked) return;
  if (!confirm('Décocher toutes les cases de toutes les grilles ?')) return;
  t.grids.filter(gx => !gx.archived).forEach(gx => { if (!gx.locked) gx.grid = gx.grid.map(c => ({ ...c, checked: false })); });
  saveState();
  renderGrid();
});
btnScreenshot.addEventListener('click', bingoScreenshot);

// Modal nouvelle grille
const modalNewGrid       = document.getElementById('modal-new-grid');
const newGridNameInput   = document.getElementById('new-grid-name-input');
const btnConfirmNewGrid  = document.getElementById('btn-confirm-new-grid');
const btnCancelNewGrid   = document.getElementById('btn-cancel-new-grid');
const btnCloseNewGridModal = document.getElementById('btn-close-new-grid-modal');

function openNewGridModal() {
  const t = activeTheme();
  if (!t) return;
  const count = t.grids.filter(g => !g.archived).length + 1;
  newGridNameInput.value = `Grille ${count}`;
  modalNewGrid.classList.remove('hidden');
  setTimeout(() => { newGridNameInput.focus(); newGridNameInput.select(); }, 50);
}

function closeNewGridModal() {
  modalNewGrid.classList.add('hidden');
}

function confirmNewGrid() {
  const name = newGridNameInput.value.trim();
  if (!name) return;
  closeNewGridModal();
  createGrid(name);
}

btnConfirmNewGrid.addEventListener('click', confirmNewGrid);
btnCancelNewGrid.addEventListener('click', closeNewGridModal);
btnCloseNewGridModal.addEventListener('click', closeNewGridModal);
modalNewGrid.addEventListener('click', e => { if (e.target === modalNewGrid) closeNewGridModal(); });
newGridNameInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') confirmNewGrid();
  if (e.key === 'Escape') closeNewGridModal();
});

btnNewGrid.addEventListener('click', () => {
  if (!activeTheme()) return;
  openNewGridModal();
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

btnArchivedGrids.addEventListener('click', () => {
  renderArchivedGridsModal();
  modalArchivedGrids.classList.remove('hidden');
});

btnCloseArchivedGridsModal.addEventListener('click', () => {
  modalArchivedGrids.classList.add('hidden');
});

modalArchivedGrids.addEventListener('click', e => {
  if (e.target === modalArchivedGrids) modalArchivedGrids.classList.add('hidden');
});

// Modales renommage thème
btnConfirmRenameTheme.addEventListener('click', confirmRenameTheme);
btnCancelRenameTheme.addEventListener('click', closeRenameThemeModal);
btnCloseRenameThemeModal.addEventListener('click', closeRenameThemeModal);
modalRenameTheme.addEventListener('click', e => { if (e.target === modalRenameTheme) closeRenameThemeModal(); });
renameThemeInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') confirmRenameTheme();
  if (e.key === 'Escape') closeRenameThemeModal();
});

// Modales renommage grille
btnConfirmRenameGrid.addEventListener('click', confirmRenameGrid);
btnCancelRenameGrid.addEventListener('click', closeRenameGridModal);
btnCloseRenameGridModal.addEventListener('click', closeRenameGridModal);
modalRenameGrid.addEventListener('click', e => { if (e.target === modalRenameGrid) closeRenameGridModal(); });
renameGridInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') confirmRenameGrid();
  if (e.key === 'Escape') closeRenameGridModal();
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
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed.tierlists)) parsed.tierlists = [];
      const active = parsed.tierlists.find(t => t.id === parsed.activeTierlistId && !t.archived);
      if (!active) {
        const first = parsed.tierlists.find(t => !t.archived);
        parsed.activeTierlistId = first ? first.id : null;
      }
      return parsed;
    }
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
  _firebaseReady = true;
  const raw = snapshot.val();
  const migrated = migrateState(raw);
  state = migrated || initState();

  // Normaliser l'état
  if (!state.themes) state.themes = [];
  state.themes.forEach(t => {
    if (!t.elements) t.elements = [];
    if (!t.grids)    t.grids    = [];
    if (t.locked === undefined) t.locked = false;
    // Nettoyer les champs locaux qui n'ont pas leur place en Firebase
    delete t.cellFont;
    delete t.cellFontScale;
    t.grids.forEach(g => {
      if (g.archived === undefined) g.archived = false;
      if (g.hidden === undefined)   g.hidden   = false;
      if (g.title === undefined)    g.title    = '';
      if (g.locked === undefined)   g.locked   = false;
      const expected = g.gridSize * g.gridSize;
      if (!g.grid || g.grid.length !== expected) {
        g.grid = Array.from({ length: expected }, () => ({ elementId: null, checked: false }));
      }
    });
    const nonArchivedGrids = t.grids.filter(g => !g.archived);
    if (nonArchivedGrids.length === 0) {
      t.activeGridId = null;
    } else if (t.activeGridId && !nonArchivedGrids.find(g => g.id === t.activeGridId)) {
      // activeGridId pointe vers une grille qui n'existe plus, corriger
      t.activeGridId = nonArchivedGrids[0].id;
    }
    // Si activeGridId est null, on le laisse null (désélection volontaire)
  });
  if (state.themes.length > 0 && !state.themes.find(t => t.id === state.activeThemeId)) {
    const nonArchived = state.themes.filter(t => !t.archived);
    state.activeThemeId = nonArchived.length > 0 ? nonArchived[0].id : state.themes[0].id;
  }

  // Init affichage de la taille de texte locale
  fontScaleInput.value = Math.round(_localFontScale * 100);

  // Charger les grilles sélectionnées pour le thème actif
  // Le fallback vers la première grille ne s'applique que si aucune entrée n'a jamais été sauvegardée
  const _themeHasSavedSelection = state.activeThemeId in _selectedGridsByTheme;
  _selectedGridIds = loadLocalSelectedGridsForTheme(state.activeThemeId);
  if (_selectedGridIds.length === 0 && !_themeHasSavedSelection) {
    const t = activeTheme();
    if (t) {
      const firstGrid = t.grids.find(g => !g.archived);
      if (firstGrid) _selectedGridIds = [firstGrid.id];
    }
  }

  renderThemesList();
  renderElements();
  renderGridsList();
  renderGrid();
  _bingoRemoteUpdate = false;
});

// ── Tier List ─────────────────────────────────────────────────────────────────
tlRender();
