/* ═══════════════════════════════════════════════
   LesMichels — app.js
═══════════════════════════════════════════════ */

// ──────────────────────────────────────────────
// Mode "fenêtre grille(s) solo" (ouvert via un bouton "nouvelle fenêtre")
// ──────────────────────────────────────────────
const _soloGridParams = new URLSearchParams(window.location.search);
const _soloGridIds = (_soloGridParams.get('openGrids') || _soloGridParams.get('openGrid') || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
let _soloGridApplied = false;

const _soloTierlistId = _soloGridParams.get('openTierlist') || null;
let _soloTierlistApplied = false;

// ──────────────────────────────────────────────
// Désactivation des bulles d'aide (tooltips title="...")
// Pour les réactiver : mettre DISABLE_TITLE_TOOLTIPS à false
// ──────────────────────────────────────────────
const DISABLE_TITLE_TOOLTIPS = true;
if (DISABLE_TITLE_TOOLTIPS) {
  const _titleDesc = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'title')
    || Object.getOwnPropertyDescriptor(Element.prototype, 'title');
  if (_titleDesc && _titleDesc.set) {
    Object.defineProperty(HTMLElement.prototype, 'title', {
      configurable: true,
      enumerable: _titleDesc.enumerable,
      get: _titleDesc.get,
      set() { /* bulles d'aide désactivées */ }
    });
  }
  // Vide aussi les title="..." déjà présents dans le HTML statique
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[title]').forEach(el => el.removeAttribute('title'));
  });
}

// ──────────────────────────────────────────────
// Icônes Lucide (remplacement progressif des emojis)
// Ré-appeler lucide.createIcons() après tout ajout dynamique de <i data-lucide>
// ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();
});

// ──────────────────────────────────────────────
// Audio singleton + effets Bingo
// ──────────────────────────────────────────────
function playBingoSound() {
  try {
    const ctx = _getAudioCtx();
    // Mélodie "ouverture de coffre" Zelda : E4 A4 C#5 E5 + accord final
    const sequence = [
      { freq: 329.63, dur: 0.10, t: 0.00 },  // E4
      { freq: 440.00, dur: 0.10, t: 0.10 },  // A4
      { freq: 554.37, dur: 0.10, t: 0.20 },  // C#5
      { freq: 659.25, dur: 0.50, t: 0.30 },  // E5 (tenu)
      // Accord final (E5 + A5 + C#6)
      { freq: 659.25, dur: 0.60, t: 0.85 },
      { freq: 880.00, dur: 0.60, t: 0.85 },
      { freq: 1108.73, dur: 0.60, t: 0.85 },
    ];
    sequence.forEach(({ freq, dur, t }) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'square';
      osc.frequency.value = freq;
      const start = ctx.currentTime + t;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.005, start + 0.01);
      gain.gain.setValueAtTime(0.005, start + dur - 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.start(start);
      osc.stop(start + dur);
    });
  } catch (e) { /* contexte audio non disponible */ }
}

function launchConfetti(targetEl, gridId) {
  const rect = targetEl ? targetEl.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
  const canvas = document.createElement('canvas');
  canvas.width  = Math.round(rect.width);
  canvas.height = Math.round(rect.height);
  canvas.style.cssText = `position:fixed;top:${rect.top}px;left:${rect.left}px;width:${rect.width}px;height:${rect.height}px;pointer-events:none;z-index:9999;`;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const colors = ['#f94144','#f3722c','#f9c74f','#90be6d','#43aa8b','#577590','#e07be5','#ffffff','#ff85e1'];

  // Chaque fusée explose en étoile de particules
  function makeFirework() {
    const x = canvas.width  * (0.10 + Math.random() * 0.80);
    const y = canvas.height * (0.05 + Math.random() * 0.60);
    const color  = colors[Math.floor(Math.random() * colors.length)];
    const color2 = colors[Math.floor(Math.random() * colors.length)];
    const count  = 20 + Math.floor(Math.random() * 15);
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.2;
      const speed = 2.5 + Math.random() * 5;
      // Alterner deux couleurs pour un effet bicolore
      const col = i % 2 === 0 ? color : color2;
      return { x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, color: col, life: 1, decay: 0.008 + Math.random() * 0.007, size: 2 + Math.random() * 2.5 };
    });
  }

  let particles = [];
  // 3 explosions immédiates au départ
  for (let i = 0; i < 3; i++) particles.push(...makeFirework());

  const totalDuration = 3000;
  const burstInterval = 600;
  let lastBurst = performance.now();
  const startTime = performance.now();

  function step(now) {
    const elapsed = now - startTime;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Nouvelles salves jusqu'à 2.4s pour laisser les dernières particules finir dans les 3s
    if (now - lastBurst > burstInterval && elapsed < 2400) {
      const count = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i++) particles.push(...makeFirework());
      lastBurst = now;
    }

    particles.forEach(p => {
      p.x  += p.vx;
      p.y  += p.vy;
      p.vy += 0.06;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life -= p.decay;
      const a = Math.max(0, p.life * p.life);
      ctx.globalAlpha = a;
      ctx.shadowBlur = 2;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    });
    ctx.shadowBlur = 0;

    particles = particles.filter(p => p.life > 0);

    if (elapsed < totalDuration || particles.length > 0) {
      requestAnimationFrame(step);
    } else {
      canvas.remove();
      _fireworksActiveByGrid[gridId] = false;
    }
  }
  _fireworksActiveByGrid[gridId] = true;
  requestAnimationFrame(step);
}

// Suivi du nombre de lignes bingo par grille pour ne déclencher qu'au changement
const _prevBingoLines = {};
let _bingoReadyForEffect = false; // évite le déclenchement au premier rendu (chargement)
const _fireworksActiveByGrid = {};

function triggerBingoEffectIfNew(gridId, lineCount) {
  const prev = _prevBingoLines[gridId] !== undefined ? _prevBingoLines[gridId] : lineCount;
  _prevBingoLines[gridId] = lineCount;
  if (_bingoReadyForEffect && lineCount > prev && lineCount > 0) {
    playBingoSound();
    if (!_fireworksActiveByGrid[gridId]) {
      const wrapperEl = document.querySelector(`.grid-view-wrapper[data-grid-id="${gridId}"]`);
      launchConfetti(wrapperEl, gridId);
    }
  }
}

function setBingoReadyForEffect() {
  _bingoReadyForEffect = true;
}

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
  const btnSignout   = document.getElementById('btn-signout');

  btnGoogle.addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    _auth.signInWithPopup(provider).catch(err => {
      console.error('Erreur connexion Google:', err);
      alert('Erreur lors de la connexion. Réessaie.');
    });
  });

  btnSignout.addEventListener('click', () => {
    document.getElementById('modal-confirm-signout').classList.remove('hidden');
  });

  const ALLOWED_UIDS = [
    'qvXEXn9zarMPaK0l9AH4PDtxsVG3',
    'VDpOI5BckhR7cmu3Bl7lzWj0wpH2',
    'KXEWIJplDrdqGnUSJA7Pvnr7aRx2'
  ];

  _auth.onAuthStateChanged(user => {
    if (user) {
      if (!ALLOWED_UIDS.includes(user.uid)) {
        _auth.signOut();
        modalAuth.classList.remove('hidden');
        document.getElementById('auth-error').textContent = 'Accès non autorisé !';
        return;
      }
      document.getElementById('auth-error').textContent = '';
      currentUser  = user;
      currentPseudo = user.displayName || user.email;
      modalAuth.classList.add('hidden');
      userBadge.classList.remove('hidden');
      loadUserPrefs();
    } else {
      currentUser   = null;
      currentPseudo = null;
      _prefsReady            = false;
      _localActiveFolderId   = null;
      _selectedGridsByFolder = {};
      _selectedGridIds = [];
      _localFontScale  = 1;
      _localGridHeight = 80;
      _tlLocalShowLabels       = null;
      _tlLocalImgSize          = null;
      _tlLocalActiveTierlistId = null;
      _tlLocalNoSelection      = false;
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
// Préférences utilisateur — Firebase par uid
// ──────────────────────────────────────────────
function _dbPrefs() {
  if (!currentUser) return null;
  return window._db.ref('users/' + currentUser.uid + '/prefs');
}

function saveUserPrefs(patch) {
  const ref = _dbPrefs();
  if (!ref) return;
  ref.update(patch).catch(e => console.warn('Prefs save error:', e));
}

function loadUserPrefs() {
  const ref = _dbPrefs();
  if (!ref) return;
  _prefsReady = false;
  ref.once('value').then(snap => {
    const prefs = snap.val() || {};
    if (prefs.fontScale        != null) _localFontScale        = prefs.fontScale;
    if (prefs.gridHeight       != null) _localGridHeight       = prefs.gridHeight;
    // Prefs dossiers (nouvelle structure)
    if (prefs.activeFolderId   != null) _localActiveFolderId   = prefs.activeFolderId;
    if (prefs.selectedGrids    != null) {
      try { _selectedGridsByFolder = typeof prefs.selectedGrids === 'object' ? prefs.selectedGrids : JSON.parse(prefs.selectedGrids); }
      catch { _selectedGridsByFolder = {}; }
    }
    // Migration prefs anciens formats vers nouvelle structure
    if (!prefs.activeFolderId && prefs.activeThemeId) {
      _localActiveFolderId = prefs.activeThemeId;
      saveUserPrefs({ activeFolderId: _localActiveFolderId, activeThemeId: null, activeSubthemeId: null });
    }
    // Soirée en cours : stockée dans state (Firebase partagé), pas dans les prefs
    // Prefs tierlist
    if (prefs.tlShowLabels        != null) _tlLocalShowLabels       = !!prefs.tlShowLabels;
    if (prefs.tlImgSize           != null) _tlLocalImgSize          = prefs.tlImgSize;
    if (prefs.tlActiveTierlistId  != null) _tlLocalActiveTierlistId = prefs.tlActiveTierlistId;
    if (prefs.tlNoSelection       != null) _tlLocalNoSelection      = !!prefs.tlNoSelection;
    // Page active
    if (prefs.activePage   != null && window._switchPage && _soloGridIds.length === 0 && !_soloTierlistId) _switchPage(prefs.activePage);
    _prefsReady = true;
    // Appliquer les prefs visuelles
    gridHeightInput.value = _localGridHeight;
    const ghDisp = document.getElementById('grid-height-display');
    if (ghDisp) ghDisp.textContent = _localGridHeight + '%';
    fontScaleInput.value = Math.round(_localFontScale * 100);
    const fsDisp = document.getElementById('font-scale-display');
    if (fsDisp) fsDisp.textContent = Math.round(_localFontScale * 100) + '%';
    // Re-render seulement si les données Bingo sont déjà chargées
    if (_firebaseReady) {
      _applyPrefsAndRender();
    }
  }).catch(e => console.warn('Prefs load error:', e));
}

function _applySoloGridModeIfNeeded() {
  if (_soloGridIds.length === 0) return;
  const firstFolder = findParentFolder(state.folders, _soloGridIds[0]);
  if (!firstFolder) return;
  const folderGridIds = new Set((firstFolder.grids || []).map(gx => gx.id));
  const validIds = _soloGridIds.filter(id => folderGridIds.has(id));
  if (validIds.length === 0) return;
  _localActiveFolderId = firstFolder.id;
  _selectedGridIds = validIds;
  firstFolder.activeGridId = validIds[0];
  if (!_soloGridApplied) {
    _soloGridApplied = true;
    const grids = (firstFolder.grids || []).filter(gx => validIds.includes(gx.id));
    document.title = (grids.length === 1
      ? (grids[0].title || grids[0].name || 'Grille')
      : `${grids.length} grilles`) + ' — LesMichels';
    document.body.classList.add('solo-grid-mode');
  }
}

function _applySoloTierlistModeIfNeeded() {
  if (!_soloTierlistId || _soloTierlistApplied) return;
  const tl = tlState.tierlists.find(t => t.id === _soloTierlistId && !t.archived);
  if (!tl) return;
  _soloTierlistApplied = true;
  _tlLocalActiveTierlistId = tl.id;
  _tlLocalNoSelection = false;
  if (window._switchPage) window._switchPage('tierlist');
  document.title = (tl.name || 'Tier list') + ' — LesMichels';
  document.body.classList.add('solo-tierlist-mode');
}

function _applyPrefsAndRender() {
  // Valider que le dossier actif existe toujours
  if (_localActiveFolderId) {
    const exists = findFolderById(state.folders, _localActiveFolderId);
    if (!exists || exists.archived) {
      const nonArchived = [];
      function collectNonArchived(folders) {
        if (!folders) return;
        for (let f of folders) {
          if (!f.archived) nonArchived.push(f);
          collectNonArchived(f.folders);
        }
      }
      collectNonArchived(state.folders);
      _localActiveFolderId = nonArchived.length > 0 ? nonArchived[0].id : (state.folders[0]?.id || null);
    }
  }
  // Charger les grilles sélectionnées pour le dossier actif
  const folder = activeFolder();
  if (folder) {
    const hasSavedSelection = folder.id in _selectedGridsByFolder;
    _selectedGridIds = loadLocalSelectedGridsForFolder(folder.id);
    // Sélectionner toutes les grilles non archivées s'il n'y a jamais eu de sélection sauvegardée
    if (_selectedGridIds.length === 0 && !hasSavedSelection) {
      _selectedGridIds = (folder.grids || []).filter(g => !g.archived).slice(0, 3).map(g => g.id);
    }
  }
  _applySoloGridModeIfNeeded();
  renderAllFolders();
  renderElements();
  renderGridsList();
  renderGrid();
  setTimeout(setBingoReadyForEffect, 0);
  renderCurrentEventButton();
  // Appliquer les prefs tierlist aux controls UI
  if (_tlLocalShowLabels !== null) tlShowLabelsToggle.checked = _tlLocalShowLabels;
  if (_tlLocalImgSize    !== null) tlImgSizeSlider.value       = _tlLocalImgSize;
  // Re-render la Tier List avec la bonne tierlist active
  if (typeof tlRender === 'function') tlRender();
}

// ──────────────────────────────────────────────
// État global Bingo
// ──────────────────────────────────────────────

// Préférences visuelles — stockées dans Firebase /users/{uid}/prefs
let _localFontScale  = 1;
let _localGridHeight = 80;

function _saveLocalActiveFolderId(id) { saveUserPrefs({ activeFolderId: id || null }); }

function saveLocalFontScale(scale) {
  _localFontScale = Math.max(0.5, Math.min(3, scale));
  saveUserPrefs({ fontScale: _localFontScale });
}

function saveLocalGridHeight(pct) {
  _localGridHeight = Math.max(20, Math.min(80, pct));
  saveUserPrefs({ gridHeight: _localGridHeight });
}

// IDs des grilles sélectionnées (affichées simultanément, max 3)
// Stocké par dossier : { [folderId]: [gridId, ...] }
let _selectedGridIds = [];
let _selectedGridsByFolder = {};
let _draggingGridWrapper = false;

const _EMPTY_SELECTION = '__empty__';

function saveLocalSelectedGrids(ids) {
  _selectedGridIds = ids.slice(0, 3);
  const folder = activeFolder();
  if (folder) {
    // Firebase supprime les tableaux vides — on stocke un marqueur pour distinguer
    // "pas de sélection sauvegardée" de "sélection vide intentionnelle"
    _selectedGridsByFolder[folder.id] = _selectedGridIds.length > 0 ? _selectedGridIds.slice() : [_EMPTY_SELECTION];
  }
  saveUserPrefs({ selectedGrids: _selectedGridsByFolder });
}

function loadLocalSelectedGridsForFolder(folderId) {
  const saved = _selectedGridsByFolder[folderId];
  if (!saved) return [];
  if (Array.isArray(saved) && saved.length === 1 && saved[0] === _EMPTY_SELECTION) return [];
  return saved.slice();
}

function defaultFolder(name, withGrid = false) {
  const folder = {
    id: uid(),
    name,
    archived: false,
    locked: false,
    elements: [],
    archivedElementIds: [],
    persistentCheckedIds: [],
    folders: [],      // sous-dossiers
    grids: [],        // grilles directes
    children: []      // références ordonnées
  };
  if (withGrid) {
    const g = defaultGrid('Grille');
    folder.grids = [g];
    folder.children = [{ type: 'grid', id: g.id }];
  }
  return folder;
}

function defaultGrid(name) {
  return { id: uid(), name, gridSize: 4, grid: [], archived: false, hidden: false, title: '', textColor: '' };
}

function migrateState(raw) {
  if (!raw) return null;

  // Si on a déjà des dossiers, c'est du nouveau format
  if (raw.folders) {
    return raw;
  }

  // Ancien format v1 : { elements, grids, activeGridId }
  if (raw.elements && raw.grids && !raw.themes) {
    const folder = defaultFolder('Soirée 1');
    folder.elements = raw.elements || [];
    const grids = raw.grids || [];
    folder.grids = grids;
    folder.children = grids.map(g => ({ type: 'grid', id: g.id }));
    return { folders: [folder], trash: [] };
  }

  if (!raw.themes || raw.themes.length === 0) return null;

  // Supprimer cellFont/cellFontScale des thèmes (désormais local)
  raw.themes.forEach(t => {
    delete t.cellFont;
    delete t.cellFontScale;
    if (t.locked === undefined) t.locked = false;

    // Migration : si le thème n'a pas encore de sous-thèmes, créer un sous-thème par défaut
    // avec les grilles existantes
    if (!t.subthemes || t.subthemes.length === 0) {
      const sub = defaultSubtheme('Principal');
      sub.grids = t.grids || [];
      sub.activeGridId = t.activeGridId || null;
      t.subthemes = [sub];
      t.activeSubthemeId = sub.id;
      t.grids = [];
      t.activeGridId = null;
    } else {
      t.subthemes.forEach(s => {
        if (s.archived === undefined) s.archived = false;
        if (!s.grids) s.grids = [];
        if (!s.activeGridId) s.activeGridId = null;
        if (!s.archivedElementIds) s.archivedElementIds = [];
        s.grids.forEach(g => {
          if (g.archived === undefined) g.archived = false;
          if (g.hidden === undefined) g.hidden = false;
          if (g.title === undefined) g.title = '';
          if (g.locked === undefined) g.locked = false;
          if (g.textColor === undefined) g.textColor = '';
        });
      });
    }

    // Normaliser les grilles dans chaque sous-thème
    t.subthemes.forEach(s => {
      s.grids.forEach(g => {
        if (g.archived === undefined) g.archived = false;
        if (g.hidden === undefined) g.hidden = false;
        if (g.title === undefined) g.title = '';
        if (g.locked === undefined) g.locked = false;
        if (g.textColor === undefined) g.textColor = '';
        // Migration : s'assurer que le tableau de cases est toujours de taille MAX_SIZE²
        // pour permettre la restauration des cases lors d'un ré-agrandissement
        if (!g.grid) g.grid = [];
        while (g.grid.length < 25) g.grid.push({ elementId: null, checked: false, color: null });
        g.grid.forEach(cell => {
          if (cell.color === undefined) cell.color = null;
        });
      });
    });
  });

  // Supprimer activeThemeId de Firebase (il est désormais local)
  delete raw.activeThemeId;

  // Migration : éléments archivés au niveau du thème → au niveau du sous-thème (principal)
  raw.themes.forEach(t => {
    if (t.elements && Array.isArray(t.elements)) {
      const archivedElemIds = t.elements
        .filter(el => el.archived === true)
        .map(el => el.id);

      if (archivedElemIds.length > 0 && t.subthemes && t.subthemes.length > 0) {
        // Migrer les archives vers le premier sous-thème (Principal)
        const firstSub = t.subthemes[0];
        if (!firstSub.archivedElementIds) firstSub.archivedElementIds = [];
        archivedElemIds.forEach(id => {
          if (!firstSub.archivedElementIds.includes(id)) {
            firstSub.archivedElementIds.push(id);
          }
        });
      }

      // Supprimer le flag archived des éléments (il est maintenant par sous-thème)
      t.elements.forEach(el => {
        delete el.archived;
      });
    }
  });

  // Initialiser la corbeille si absente
  if (!raw.trash) raw.trash = [];

  // ─────────────────────────────────────────────────────────────
  // MIGRATION v3→v4 : thèmes/sous-thèmes → dossiers imbriqués
  // ─────────────────────────────────────────────────────────────
  if (raw.themes && !raw.folders) {
    const newFolders = [];
    raw.themes.forEach(theme => {
      // Créer un dossier racine par thème
      const rootFolder = {
        id: theme.id,
        name: theme.name,
        archived: theme.archived || false,
        locked: theme.locked || false,
        elements: theme.elements || [],
        archivedElementIds: [],
        folders: [],      // sous-dossiers
        grids: [],        // grilles directes (vides au niveau racine)
        children: []      // références ordonnées des enfants
      };

      // Convertir les sous-thèmes en sous-dossiers
      if (theme.subthemes && theme.subthemes.length > 0) {
        rootFolder.folders = theme.subthemes.map(sub => {
          const subfolder = {
            id: sub.id,
            name: sub.name,
            archived: sub.archived || false,
            locked: false,
            elements: JSON.parse(JSON.stringify(theme.elements || [])),
            archivedElementIds: sub.archivedElementIds || [],
            folders: [],    // aucun sous-sous-dossier
            grids: sub.grids || [],
            children: (sub.grids || []).map(g => ({ type: 'grid', id: g.id }))
          };
          return subfolder;
        });
        rootFolder.children = rootFolder.folders.map(f => ({ type: 'folder', id: f.id }));
      }

      newFolders.push(rootFolder);
    });

    raw.folders = newFolders;
    delete raw.themes;
  }

  return raw;
}

let state = initState();
let _bingoRemoteUpdate = false;
let _firebaseReady = false;
let _prefsReady    = false;
// activeFolderId est chargé depuis Firebase /users/{uid}/prefs
let _localActiveFolderId   = null;

function initState() {
  return { folders: [], trash: [], currentEventFolderId: null, currentEventTierlistId: null };
}

// ──────────────────────────────────────────────
// Accesseurs et utilitaires dossiers
// ──────────────────────────────────────────────

function findFolderById(folders, id) {
  if (!folders) return null;
  for (let folder of folders) {
    if (folder.id === id) return folder;
    const found = findFolderById(folder.folders, id);
    if (found) return found;
  }
  return null;
}

function findParentFolder(folders, id) {
  if (!folders) return null;
  for (let folder of folders) {
    // Vérifier si id est un sous-dossier
    if (folder.folders && folder.folders.find(f => f.id === id)) return folder;
    // Vérifier si id est une grille directe
    if (folder.grids && folder.grids.find(g => g.id === id)) return folder;
    // Chercher récursivement
    const found = findParentFolder(folder.folders, id);
    if (found) return found;
  }
  return null;
}

function getFolderPath(folders, id) {
  const path = [];
  let current = findFolderById(folders, id);
  while (current) {
    path.unshift(current);
    current = findParentFolder(folders, current.id);
  }
  return path;
}

function activeFolder() {
  if (!state.folders) return null;
  return findFolderById(state.folders, _localActiveFolderId) || null;
}

function activeGrid() {
  const f = activeFolder();
  if (!f) return null;
  return _selectedGridIds.length > 0
    ? f.grids.find(g => g.id === _selectedGridIds[0]) || null
    : null;
}

// ──────────────────────────────────────────────
// Shims de compatibilité (ancienne API → dossiers)
// activeTheme() : dossier racine du dossier actif (remonte jusqu'à la racine)
// activeSubtheme() : le dossier actif lui-même (peut être sous-dossier)
// ──────────────────────────────────────────────
function _findRootFolder(folderId) {
  if (!folderId || !state.folders) return null;
  // Si c'est directement dans state.folders, c'est la racine
  const direct = state.folders.find(f => f.id === folderId);
  if (direct) return direct;
  // Sinon, chercher la racine qui contient ce dossier
  for (const root of state.folders) {
    if (findFolderById(root.folders, folderId)) return root;
  }
  return null;
}

function activeTheme() {
  // Dans la nouvelle structure, "thème" = dossier racine du dossier actif
  // Les éléments sont sur le dossier racine
  const f = activeFolder();
  if (!f) return null;
  return _findRootFolder(f.id) || f;
}

function activeSubtheme() {
  // "sous-thème" = le dossier actif lui-même (contient les grilles et archivedElementIds)
  return activeFolder();
}

function renderCurrentEventButton() {
  const btn = document.getElementById('btn-current-event');
  const lbl = document.getElementById('btn-current-event-label');
  if (!btn) return;

  // Priorité : tierlist active > bingo actif
  const ceTl = state.currentEventTierlistId;
  if (ceTl) {
    const tl = (typeof tlState !== 'undefined' ? tlState.tierlists || [] : []).find(t => t.id === ceTl && !t.archived);
    if (tl) {
      btn.style.display = 'flex';
      if (lbl) {
        // Remonter le chemin du dossier si la TL est dans un dossier
        const parts = ['Tier List'];
        if (tl.folderId && typeof tlState !== 'undefined') {
          const folderParts = [];
          let current = (tlState.folders || []).find(f => f.id === tl.folderId);
          while (current) {
            folderParts.unshift(current.name);
            current = (tlState.folders || []).find(f => f.id === current.parentId);
          }
          parts.push(...folderParts);
        }
        parts.push(tl.name);
        const fullPath = parts.join(' › ');
        lbl.textContent = fullPath;
        document.getElementById('btn-ce-navigate').title = 'Aller à la soirée en cours\n' + fullPath;
      }
      const onTlPage = document.getElementById('page-tierlist')?.classList.contains('active');
      const alreadyHere = onTlPage && _tlLocalActiveTierlistId === ceTl;
      btn.classList.toggle('ce-nav-disabled', alreadyHere);
      _updateTlCeSetBtn();
      return;
    }
    // TL introuvable ou archivée — nettoyer
    state.currentEventTierlistId = null;
    saveState();
  }

  const cef = state.currentEventFolderId;
  if (!cef) { btn.style.display = 'none'; _updateBingoCeSetBtn(); return; }
  const folder = findFolderById(state.folders, cef);
  if (!folder || folder.archived) { btn.style.display = 'none'; _updateBingoCeSetBtn(); return; }
  btn.style.display = 'flex';
  if (lbl) {
    const path = getFolderPath(state.folders, cef);
    const fullPath = 'Bingo › ' + path.map(f => f.name).join(' › ');
    lbl.textContent = fullPath;
    document.getElementById('btn-ce-navigate').title = 'Aller à la soirée en cours\n' + fullPath;
  }
  const onBingoPage = document.getElementById('page-bingo')?.classList.contains('active');
  const alreadyHereBingo = onBingoPage && _localActiveFolderId === cef;
  btn.classList.toggle('ce-nav-disabled', alreadyHereBingo);
  _updateBingoCeSetBtn();
}

function _updateBingoCeSetBtn() {
  const ceSet = document.getElementById('btn-ce-set');
  if (!ceSet) return;
  const isCurrentEvent = _localActiveFolderId && state.currentEventFolderId === _localActiveFolderId;
  ceSet.classList.toggle('ce-set-disabled', !!isCurrentEvent);
}

function _updateTlCeSetBtn() {
  const ceSet = document.getElementById('tl-btn-ce-set');
  if (!ceSet) return;
  const tl = (typeof tlActiveTierlist === 'function') ? tlActiveTierlist() : null;
  const isCurrentEvent = tl && state.currentEventTierlistId === tl.id;
  ceSet.classList.toggle('ce-set-disabled', !!isCurrentEvent);
}

function setCurrentEventFolder(id) {
  if (state.currentEventFolderId === id) {
    state.currentEventFolderId = null;
  } else {
    state.currentEventFolderId = id;
    state.currentEventTierlistId = null; // exclusif
  }
  saveState();
  renderCurrentEventButton();
  renderFoldersPanelTree();
}

let _pendingCurrentEventFolderId = null;

function confirmSetCurrentEventFolder(id) {
  // Retirer la soirée en cours ne nécessite pas de confirmation, seulement la définir
  if (state.currentEventFolderId === id) {
    setCurrentEventFolder(id);
    return;
  }
  _pendingCurrentEventFolderId = id;
  const folder = findFolderById(state.folders, id);
  const msg = document.getElementById('modal-current-event-msg');
  if (msg) msg.textContent = folder ? `Définir "${folder.name}" comme soirée en cours ?` : 'Définir ce dossier comme soirée en cours ?';
  document.getElementById('modal-confirm-current-event').classList.remove('hidden');
}

function setCurrentEventTierlist(id) {
  if (state.currentEventTierlistId === id) {
    state.currentEventTierlistId = null;
  } else {
    state.currentEventTierlistId = id;
    state.currentEventFolderId = null; // exclusif
  }
  saveState();
  renderCurrentEventButton();
  if (typeof renderFoldersPanelTree === 'function') renderFoldersPanelTree();
}

function defaultSubtheme(name, withGrid = false) {
  const sub = {
    id: uid(),
    name,
    archived: false,
    locked: false,
    elements: [],
    archivedElementIds: [],
    folders: [],
    grids: [],
    children: []
  };
  if (withGrid) {
    const g = defaultGrid('Grille');
    sub.grids = [g];
    sub.children = [{ type: 'grid', id: g.id }];
  }
  return sub;
}

// ──────────────────────────────────────────────
// CRUD Dossiers
// ──────────────────────────────────────────────

function createFolder(name, parentId = null) {
  const folder = defaultFolder(name, false);
  if (!parentId) {
    // Dossier racine
    if (!state.folders) state.folders = [];
    state.folders.push(folder);
    _localActiveFolderId = folder.folders[0]?.id || folder.id;
    _saveLocalActiveFolderId(_localActiveFolderId);
  } else {
    // Dossier enfant
    const parent = findFolderById(state.folders, parentId);
    if (!parent) return;
    if (!parent.folders) parent.folders = [];
    parent.folders.push(folder);
    if (!parent.children) parent.children = [];
    parent.children.push({ type: 'folder', id: folder.id });
    // Rester sur le parent pour voir le nouveau dossier apparaître dans la liste
    _localActiveFolderId = parentId;
    _saveLocalActiveFolderId(parentId);
  }
  const newActive = activeFolder();
  _selectedGridIds = newActive?.grids?.[0] ? [newActive.grids[0].id] : [];
  saveLocalSelectedGrids(_selectedGridIds);
  saveState();
  renderAllFolders();
  renderElements();
  renderGridsList();
  renderGrid();
}

function switchFolder(id) {
  if (_localActiveFolderId === id) {
    _localActiveFolderId = null;
    _saveLocalActiveFolderId(null);
    _selectedGridIds = [];
    renderAllFolders();
    renderElements();
    renderGridsList();
    renderGrid();
    return;
  }
  _localActiveFolderId = id;
  _saveLocalActiveFolderId(id);
  const hasSavedSelection = id in _selectedGridsByFolder;
  _selectedGridIds = loadLocalSelectedGridsForFolder(id);
  if (_selectedGridIds.length === 0 && !hasSavedSelection) {
    const f = findFolderById(state.folders, id);
    if (f) {
      _selectedGridIds = (f.grids || []).filter(g => !g.archived).slice(0, 3).map(g => g.id);
    }
  }
  renderAllFolders();
  renderElements();
  renderGridsList();
  renderGrid();
}

function deleteFolder(id) {
  const folder = findFolderById(state.folders, id);
  if (folder) trashPush({ type: 'folder', data: JSON.parse(JSON.stringify(folder)) });
  const parent = findParentFolder(state.folders, id);
  if (parent) {
    parent.folders = (parent.folders || []).filter(f => f.id !== id);
    parent.children = (parent.children || []).filter(c => c.id !== id);
  } else {
    state.folders = (state.folders || []).filter(f => f.id !== id);
  }
  if (_localActiveFolderId === id) {
    const all = [];
    function collect(folders) { if (!folders) return; for (const f of folders) { if (!f.archived) all.push(f); collect(f.folders); } }
    collect(state.folders);
    _localActiveFolderId = all[0]?.id || null;
    _saveLocalActiveFolderId(_localActiveFolderId);
    _selectedGridIds = [];
  }
  saveState();
  renderAllFolders();
  renderElements();
  renderGridsList();
  renderGrid();
}

function archiveFolder(id) {
  const folder = findFolderById(state.folders, id);
  if (!folder) return;
  folder.archived = !folder.archived;
  if (folder.archived) {
    function archiveAll(f) { f.archived = true; (f.grids || []).forEach(g => { g.archived = true; }); (f.folders || []).forEach(archiveAll); }
    archiveAll(folder);
    if (_localActiveFolderId === id || findFolderById([folder], _localActiveFolderId)) {
      const all = [];
      function collectNA(folders) { if (!folders) return; for (const f of folders) { if (!f.archived) all.push(f); collectNA(f.folders); } }
      collectNA(state.folders);
      _localActiveFolderId = all[0]?.id || null;
      _saveLocalActiveFolderId(_localActiveFolderId);
      _selectedGridIds = [];
    }
  }
  saveState();
  renderAllFolders();
  renderElements();
  renderGridsList();
  renderGrid();
}

function renameFolder(id, newName) {
  const folder = findFolderById(state.folders, id);
  if (folder && newName.trim()) folder.name = newName.trim();
  saveState();
  renderAllFolders();
}

function duplicateFolder(id, name) {
  const src = findFolderById(state.folders, id);
  if (!src) return;
  const copy = JSON.parse(JSON.stringify(src));
  function remapIds(f) {
    f.id = uid();
    f.archived = false;
    (f.grids || []).forEach(g => {
      g.id = uid();
      g.grid = Array.from({ length: MAX_SIZE * MAX_SIZE }, () => ({ elementId: null, checked: false, color: null }));
    });
    f.persistentCheckedIds = [];
    (f.elements || []).forEach(el => { el.checked = false; });
    (f.folders || []).forEach(remapIds);
    f.children = [...(f.grids || []).map(g => ({ type: 'grid', id: g.id })), ...(f.folders || []).map(sf => ({ type: 'folder', id: sf.id }))];
  }
  remapIds(copy);
  copy.name = name || src.name + ' (copie)';
  const parent = findParentFolder(state.folders, id);
  if (parent) {
    parent.folders.push(copy);
    parent.children.push({ type: 'folder', id: copy.id });
  } else {
    state.folders.push(copy);
  }
  _localActiveFolderId = copy.folders[0]?.id || copy.id;
  _saveLocalActiveFolderId(_localActiveFolderId);
  _selectedGridIds = [];
  saveState();
  renderAllFolders();
  renderElements();
  renderGridsList();
  renderGrid();
}

function moveFolder(id, targetParentId) {
  // Retrait de la position actuelle
  const folder = findFolderById(state.folders, id);
  if (!folder) return;
  // Empêcher de se déplacer dans soi-même ou un descendant
  if (targetParentId && findFolderById([folder], targetParentId)) return;
  const oldParent = findParentFolder(state.folders, id);
  if (oldParent) {
    oldParent.folders = (oldParent.folders || []).filter(f => f.id !== id);
    oldParent.children = (oldParent.children || []).filter(c => c.id !== id);
  } else {
    state.folders = (state.folders || []).filter(f => f.id !== id);
  }
  // Insertion dans la nouvelle destination
  if (targetParentId) {
    const newParent = findFolderById(state.folders, targetParentId);
    if (!newParent) return;
    if (!newParent.folders) newParent.folders = [];
    if (!newParent.children) newParent.children = [];
    newParent.folders.push(folder);
    newParent.children.push({ type: 'folder', id: folder.id });
  } else {
    if (!state.folders) state.folders = [];
    state.folders.push(folder);
  }
  saveState();
  renderAllFolders();
  renderElements();
  renderGridsList();
  renderGrid();
}

function reorderFolder(srcId, refId, position) {
  const folder = findFolderById(state.folders, srcId);
  if (!folder) return;
  const srcParent = findParentFolder(state.folders, srcId);
  const refParent = findParentFolder(state.folders, refId);
  // Les deux doivent avoir le même parent pour réordonner
  const srcList  = srcParent ? (srcParent.folders || []) : state.folders;
  const refList  = refParent ? (refParent.folders || []) : state.folders;
  if (srcList !== refList) {
    // Parents différents : on réordonne quand même en retirant du src et insérant au bon endroit dans refList
    if (srcParent) {
      srcParent.folders = (srcParent.folders || []).filter(f => f.id !== srcId);
      srcParent.children = (srcParent.children || []).filter(c => c.id !== srcId);
    } else {
      state.folders = state.folders.filter(f => f.id !== srcId);
    }
    const targetList = refParent ? (refParent.folders || (refParent.folders = [])) : state.folders;
    const refIdx = targetList.findIndex(f => f.id === refId);
    const insertAt = position === 'before' ? refIdx : refIdx + 1;
    targetList.splice(insertAt < 0 ? targetList.length : insertAt, 0, folder);
    if (refParent) {
      const cList = refParent.children || (refParent.children = []);
      const cRefIdx = cList.findIndex(c => c.id === refId);
      const cInsert = position === 'before' ? cRefIdx : cRefIdx + 1;
      cList.splice(cInsert < 0 ? cList.length : cInsert, 0, { type: 'folder', id: srcId });
    }
  } else {
    const list = srcList;
    const fromIdx = list.findIndex(f => f.id === srcId);
    let toIdx = list.findIndex(f => f.id === refId);
    if (fromIdx < 0 || toIdx < 0) return;
    list.splice(fromIdx, 1);
    toIdx = list.findIndex(f => f.id === refId);
    const insertAt = position === 'before' ? toIdx : toIdx + 1;
    list.splice(insertAt, 0, folder);
    // Sync children si présent
    const parentOfList = srcParent || refParent;
    if (parentOfList && parentOfList.children) {
      const cList = parentOfList.children;
      const ci = cList.findIndex(c => c.id === srcId);
      let ri = cList.findIndex(c => c.id === refId);
      if (ci >= 0 && ri >= 0) {
        const [item] = cList.splice(ci, 1);
        ri = cList.findIndex(c => c.id === refId);
        cList.splice(position === 'before' ? ri : ri + 1, 0, item);
      }
    }
  }
  saveState();
  renderAllFolders();
  renderElements();
  renderGridsList();
  renderGrid();
}

function importElements(sourceId, targetId) {
  const src = findFolderById(state.folders, sourceId);
  const dst = findFolderById(state.folders, targetId);
  if (!src || !dst) return;
  const srcElements = src.elements || [];
  if (srcElements.length === 0) return;
  if (!dst.elements) dst.elements = [];
  // Ajouter uniquement les éléments non déjà présents (comparaison par texte)
  const existingTexts = new Set(dst.elements.map(e => e.text.trim().toLowerCase()));
  let added = 0;
  srcElements.forEach(e => {
    if (!existingTexts.has(e.text.trim().toLowerCase())) {
      dst.elements.push({ id: uid(), text: e.text });
      added++;
    }
  });
  saveState();
  renderElements();
  return added;
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
  // activeThemeId et activeSubthemeId sont locaux → ne pas les écrire dans Firebase
  const toSave = sanitizeForFirebase(state);
  delete toSave.activeThemeId;
  _dbBingo.set(toSave).catch(e => console.warn('Bingo save error:', e));
}

// ──────────────────────────────────────────────
// Corbeille
// ──────────────────────────────────────────────
function trashPush(entry) {
  if (!state.trash) state.trash = [];
  state.trash.push({ ...entry, deletedAt: Date.now() });
}

function trashRestore(idx) {
  if (!state.trash) return;
  const entry = state.trash[idx];
  if (!entry) return;
  state.trash.splice(idx, 1);

  if (entry.type === 'folder' || entry.type === 'theme') {
    if (!state.folders) state.folders = [];
    state.folders.push(entry.data);
  } else if (entry.type === 'subtheme') {
    const parent = findFolderById(state.folders, entry.themeId);
    if (parent) {
      if (!parent.folders) parent.folders = [];
      parent.folders.push(entry.data);
    }
  } else if (entry.type === 'grid') {
    const folder = findFolderById(state.folders, entry.folderId || entry.themeId);
    if (folder) {
      if (!folder.grids) folder.grids = [];
      folder.grids.push(entry.data);
    }
  }

  saveState();
  renderAllFolders();
  renderGridsList();
  renderGrid();
  renderElements();
}

function trashEmpty() {
  state.trash = [];
  saveState();
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
const gridHeightInput    = document.getElementById('grid-height-input');
const fontScaleInput     = document.getElementById('font-scale-input');
const gridWrapper        = document.getElementById('grid-wrapper');
const chkLockGenerate          = document.getElementById('chk-lock-generate');
// chkLockGenerate est un <button> (icône verrou cliquable) — état stocké via aria-pressed
function _setLockGenerateChecked(locked) {
  chkLockGenerate.setAttribute('aria-pressed', locked ? 'true' : 'false');
  const icon = chkLockGenerate.querySelector('[data-lucide]');
  if (icon) icon.setAttribute('data-lucide', locked ? 'lock-keyhole' : 'lock-keyhole-open');
  if (window.lucide) lucide.createIcons();
}
function _isLockGenerateChecked() {
  return chkLockGenerate.getAttribute('aria-pressed') === 'true';
}
const panelElementsBody        = document.getElementById('panel-elements-body');
const bingoLayout              = document.getElementById('bingo-layout');
const bingoControlPanel        = document.getElementById('bingo-control-panel');
const bingoControlPanelBody    = document.getElementById('bingo-control-panel-body');
// Modales renommage — migré vers modal-rename-folder
const modalRenameTheme      = document.getElementById('modal-rename-folder');
const renameThemeInput      = document.getElementById('rename-folder-input');
const btnConfirmRenameTheme = document.getElementById('btn-confirm-rename-folder');
const btnCancelRenameTheme  = document.getElementById('btn-cancel-rename-folder');
const btnCloseRenameThemeModal = document.getElementById('btn-close-rename-folder-modal');
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
  const s = activeSubtheme();
  const folderNameEl = document.getElementById('cases-panel-folder-name');
  if (folderNameEl) {
    folderNameEl.textContent = s ? `(${s.name})` : (t ? `(${t.name})` : '');
  }
  if (!t || !s) {
    listActive.innerHTML = '';
    listArchived.innerHTML = '';
    elementCount.textContent = '0';
    return;
  }
  const archivedIds = s.archivedElementIds || [];
  const sElems = s.elements || [];
  const active   = sElems.filter(e => !archivedIds.includes(e.id)).sort((a, b) => a.text.localeCompare(b.text, undefined, { sensitivity: 'base' }));
  const archived = sElems.filter(e => archivedIds.includes(e.id)).sort((a, b) => a.text.localeCompare(b.text, undefined, { sensitivity: 'base' }));

  elementCount.textContent = active.length;

  // Mettre à jour les compteurs sur les onglets Actives / Archivées
  const tabActive   = document.querySelector('.tab-btn[data-tab="active"]');
  const tabArchived = document.querySelector('.tab-btn[data-tab="archived"]');
  if (tabActive)   tabActive.textContent   = `Actives (${active.length})`;
  if (tabArchived) tabArchived.textContent = `Archivées (${archived.length})`;

  listActive.innerHTML = '';
  active.forEach(el => {
    listActive.appendChild(buildElementItem(el, false));
  });

  listArchived.innerHTML = '';
  archived.forEach(el => {
    listArchived.appendChild(buildElementItem(el, true));
  });
  if (window.lucide) lucide.createIcons();
}

function buildElementItem(el, isArchived) {
  const li = document.createElement('li');

  // Vérifier si cet élément est coché : dans une grille OU directement sur l'élément
  const s = activeSubtheme();
  const isCheckedInGrid = s && (s.grids || []).filter(gx => !gx.archived).some(
    gx => gx.grid.some(c => c.elementId === el.id && c.checked)
  );
  const isChecked = isCheckedInGrid || (!!el.checked && !isArchived);

  // Vérifier si la case a une couleur rouge
  const hasRedColor = s && (s.grids || []).filter(gx => !gx.archived).some(
    gx => gx.grid.some(c => c.elementId === el.id && c.color === 'red')
  );

  li.className = 'element-item' + (isArchived ? ' archived' : '') + (isChecked ? ' elem-checked' : '') + (hasRedColor ? ' elem-red' : '');
  li.dataset.id = el.id;
  li.title = 'Clic gauche : renommer · Clic droit : ' + (isArchived ? 'restaurer, supprimer' : 'archiver, supprimer');

  // Poignée drag & drop si l'élément est absent d'au moins une grille visible non bloquée
  const _visGrids = getVisibleGrids ? getVisibleGrids() : [];
  const _t = activeTheme();
  const canDragToAny = !isArchived && _visGrids.some(gx => {
    const gLocked = gx.locked || (!!_t && _t.locked);
    return !gLocked && !gx.grid.some(c => c.elementId === el.id);
  });
  if (canDragToAny) {
    const handle = document.createElement('span');
    handle.className = 'elem-drag-handle';
    handle.innerHTML = '<i data-lucide="grip"></i>';
    handle.title = 'Glisser-déposer vers une case de la grille';
    handle.draggable = true;
    handle.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', el.id);
      e.dataTransfer.effectAllowed = 'copy';
      li.classList.add('elem-dragging');
      _isDraggingElement = true;
    });
    handle.addEventListener('dragend', () => {
      li.classList.remove('elem-dragging');
      _isDraggingElement = false;
    });
    handle.addEventListener('click', e => e.stopPropagation());
    li.appendChild(handle);
  }

  const span = document.createElement('span');
  span.className = 'element-text';
  span.textContent = el.text;
  span.style.cursor = 'text';
  li.appendChild(span);

  // Bouton "..." options
  const menuBtn = document.createElement('button');
  menuBtn.className = 'elem-menu-btn';
  menuBtn.innerHTML = '<i data-lucide="ellipsis-vertical"></i>';
  menuBtn.title = 'Options';
  menuBtn.addEventListener('click', e => {
    e.stopPropagation();
    if (!isArchived) {
      openCtxMenuElement(el.id, span, e, li);
    } else {
      openCtxMenuElementArchived(el.id, e, li);
    }
  });
  li.appendChild(menuBtn);

  // Clic gauche sur la ligne : renommer la case
  li.addEventListener('click', (e) => {
    e.stopPropagation();
    startEditElement(el.id, span, e);
  });

  if (!isArchived) {
    li.addEventListener('contextmenu', e => { e.preventDefault(); e.stopPropagation(); openCtxMenuElement(el.id, span, e, li); });
  } else {
    li.addEventListener('contextmenu', e => { e.preventDefault(); e.stopPropagation(); openCtxMenuElementArchived(el.id, e, li); });
  }

  return li;
}

function startEditElement(id, span, clickEvent) {
  const s = activeSubtheme();
  if (!s) return;
  const el = (s.elements || []).find(e => e.id === id);
  if (!el) return;

  const textarea = document.createElement('textarea');
  textarea.className = 'element-edit-input';
  textarea.textContent = el.text;
  textarea.maxLength = 80;

  const commit = () => {
    const newText = textarea.value.trim();
    if (newText) el.text = newText;
    saveState();
    renderElements();
    renderGrid();
  };

  textarea.addEventListener('blur', commit);
  textarea.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); textarea.blur(); }
    if (e.key === 'Escape') { textarea.value = el.text; textarea.blur(); }
  });

  const autoResize = () => {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  };
  textarea.addEventListener('input', autoResize);

  const rect = span.getBoundingClientRect();
  span.replaceWith(textarea);
  textarea.focus();
  autoResize();

  if (clickEvent) {
    const clickX = clickEvent.clientX - rect.left;
    const charWidth = rect.width / el.text.length;
    const position = Math.round(clickX / charWidth);
    textarea.setSelectionRange(position, position);
  } else {
    textarea.select();
  }
}

// ──────────────────────────────────────────────
// Actions sur les éléments
// ──────────────────────────────────────────────
function addElement() {
  const text = inputEl.value.trim();
  if (!text) return;

  const s = activeSubtheme();
  if (!s) return;
  if (!s.elements) s.elements = [];
  s.elements.push({ id: uid(), text });
  inputEl.value = '';
  saveState();
  renderElements();
  renderGrid();
}

function deleteElement(id) {
  const s = activeSubtheme();
  if (!s) return;
  s.elements = (s.elements || []).filter(e => e.id !== id);
  // Vider cet élément dans toutes les grilles du dossier actif
  (s.grids || []).forEach(g => {
    g.grid = g.grid.map(cell =>
      cell.elementId === id ? { elementId: null, checked: false, color: null } : cell
    );
  });
  saveState();
  renderElements();
  renderGrid();
}

function archiveElement(id) {
  const s = activeSubtheme();
  if (!s) return;
  if (!s.archivedElementIds) s.archivedElementIds = [];
  if (!s.archivedElementIds.includes(id)) {
    s.archivedElementIds.push(id);
  }
  // Vider les cases contenant cet élément dans toutes les grilles du sous-thème actif
  (s.grids || []).forEach(g => {
    g.grid = g.grid.map(cell =>
      cell.elementId === id ? { elementId: null, checked: false, color: null } : cell
    );
  });
  saveState();
  renderElements();
  renderGrid();
}

function restoreElement(id) {
  const s = activeSubtheme();
  if (!s) return;
  if (!s.archivedElementIds) s.archivedElementIds = [];
  s.archivedElementIds = s.archivedElementIds.filter(eid => eid !== id);
  saveState();
  renderElements();
  renderGrid();
}

function renderAllFolders() {
  renderFoldersPanelTree();
  renderGridsBreadcrumb();
  renderCurrentEventButton();
  const btnNewFolderBingo = document.getElementById('btn-new-folder-bingo');
  if (btnNewFolderBingo) btnNewFolderBingo.dataset.parentId = _localActiveFolderId || '';
  if (btnNewGrid) btnNewGrid.disabled = !_localActiveFolderId;
  if (window.lucide) lucide.createIcons();
}

// ──────────────────────────────────────────────
// Rendu : breadcrumb chemin complet dans ctrl-row-grids
// ──────────────────────────────────────────────
function renderGridsBreadcrumb() {
  const container = document.getElementById('grids-breadcrumb');
  if (!container) return;
  container.innerHTML = '';
  if (!_localActiveFolderId) return;
  const path = getFolderPath(state.folders, _localActiveFolderId);
  path.forEach((f, i) => {
    if (i > 0) {
      const sep = document.createElement('span');
      sep.className = 'grids-breadcrumb-sep';
      sep.textContent = '›';
      container.appendChild(sep);
    }
    const span = document.createElement('span');
    span.className = 'grids-breadcrumb-item' + (i === path.length - 1 ? ' last' : '');
    span.textContent = f.name;
    container.appendChild(span);
  });
}

function toggleGridSelection(gridId) {
  const s = activeSubtheme();
  if (!s) return;
  const nowSelected = _selectedGridIds.includes(gridId);
  if (nowSelected) {
    _selectedGridIds = _selectedGridIds.filter(id => id !== gridId);
    if (s.activeGridId === gridId) {
      s.activeGridId = _selectedGridIds.length > 0 ? _selectedGridIds[0] : null;
    }
  } else {
    if (_selectedGridIds.length >= 3) return;
    _selectedGridIds.push(gridId);
    s.activeGridId = gridId;
  }
  saveLocalSelectedGrids(_selectedGridIds);
  saveState();
  renderGridsList();
  renderGrid();
  renderFoldersPanelTree();
}

function renderFoldersPanelTree() {
  const container = document.getElementById('folders-panel-tree');
  if (!container) return;
  container.innerHTML = '';

  const roots = (state.folders || []).filter(f => !f.archived);
  if (roots.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'fp-empty';
    empty.textContent = 'Aucun dossier. Crée-en un !';
    container.appendChild(empty);
    return;
  }

  const activePath = getFolderPath(state.folders, _localActiveFolderId);
  const ancestorIds = new Set(activePath.slice(0, -1).map(f => f.id));

  function _renderFolder(f, parentEl, depth) {
    const wrapper = document.createElement('div');

    const isActive = f.id === _localActiveFolderId;
    const isAncestor = ancestorIds.has(f.id);
    const children = (f.folders || []).filter(sf => !sf.archived);
    const grids = (f.grids || []).filter(g => !g.archived);
    const hasChildren = children.length > 0 || grids.length > 0;

    // État collapse persisté dans l'élément DOM (non Firebase)
    const collapseKey = 'fp_collapsed_' + f.id;
    let collapsed = sessionStorage.getItem(collapseKey) !== '0';

    const row = document.createElement('div');
    row.className = 'fp-folder-row' + (isActive ? ' active' : '') + (isAncestor ? ' ancestor' : '');

    const arrow = document.createElement('span');
    arrow.className = 'fp-folder-arrow' + (collapsed ? ' collapsed' : '');
    arrow.innerHTML = '<i data-lucide="chevron-down"></i>';
    if (!hasChildren) arrow.style.visibility = 'hidden';

    const icon = document.createElement('span');
    icon.className = 'fp-folder-icon';
    icon.innerHTML = (hasChildren && !collapsed) ? '<i data-lucide="folder-open"></i>' : '<i data-lucide="folder-closed"></i>';

    const name = document.createElement('span');
    name.className = 'fp-folder-name';
    name.textContent = f.name;

    const dragHandle = document.createElement('span');
    dragHandle.className = 'fp-folder-drag-handle';
    dragHandle.innerHTML = '<i data-lucide="grip"></i>';
    dragHandle.title = 'Glisser pour déplacer';

    const ctxBtn = document.createElement('button');
    ctxBtn.className = 'fp-folder-ctx-btn';
    ctxBtn.innerHTML = '<i data-lucide="ellipsis-vertical"></i>';
    ctxBtn.title = 'Options';

    row.appendChild(dragHandle);
    row.appendChild(arrow);
    row.appendChild(icon);
    row.appendChild(name);
    row.appendChild(ctxBtn);

    // Drag & drop pour réordonner / déplacer
    row.draggable = false;
    row.dataset.folderId = f.id;
    dragHandle.addEventListener('mousedown', () => { row.draggable = true; });
    dragHandle.addEventListener('mouseleave', () => { if (!row.classList.contains('fp-folder-dragging')) row.draggable = false; });
    row.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', f.id);
      e.dataTransfer.effectAllowed = 'move';
      row.classList.add('fp-folder-dragging');
      setTimeout(() => row.classList.add('fp-folder-dragging'), 0);
    });
    row.addEventListener('dragend', () => {
      row.draggable = false;
      row.classList.remove('fp-folder-dragging');
      document.querySelectorAll('.fp-folder-drag-over, .fp-folder-drop-before, .fp-folder-drop-after, .fp-folder-drop-inside').forEach(el => {
        el.classList.remove('fp-folder-drag-over', 'fp-folder-drop-before', 'fp-folder-drop-after', 'fp-folder-drop-inside');
      });
    });
    row.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      document.querySelectorAll('.fp-folder-drop-before, .fp-folder-drop-after, .fp-folder-drop-inside').forEach(el => {
        el.classList.remove('fp-folder-drop-before', 'fp-folder-drop-after', 'fp-folder-drop-inside');
      });
      const rect = row.getBoundingClientRect();
      const ratio = (e.clientY - rect.top) / rect.height;
      if (ratio < 0.25) {
        row.classList.add('fp-folder-drop-before');
      } else if (ratio > 0.75) {
        row.classList.add('fp-folder-drop-after');
      } else {
        row.classList.add('fp-folder-drop-inside');
      }
    });
    row.addEventListener('dragleave', e => {
      if (!row.contains(e.relatedTarget)) {
        row.classList.remove('fp-folder-drop-before', 'fp-folder-drop-after', 'fp-folder-drop-inside');
      }
    });
    row.addEventListener('drop', e => {
      e.preventDefault();
      e.stopPropagation();
      const isBefore = row.classList.contains('fp-folder-drop-before');
      const isAfter  = row.classList.contains('fp-folder-drop-after');
      row.classList.remove('fp-folder-drop-before', 'fp-folder-drop-after', 'fp-folder-drop-inside');
      const srcId = e.dataTransfer.getData('text/plain');
      if (!srcId || srcId === f.id) return;
      if (isBefore || isAfter) {
        reorderFolder(srcId, f.id, isBefore ? 'before' : 'after');
      } else {
        moveFolder(srcId, f.id);
      }
    });

    const childrenEl = document.createElement('div');
    childrenEl.className = 'fp-children' + (collapsed ? ' collapsed' : '');
    childrenEl.style.paddingLeft = '14px';

    // Grilles du dossier
    grids.forEach(g => {
      const gRow = document.createElement('div');
      const gActive = f.id === _localActiveFolderId && _selectedGridIds.includes(g.id);
      gRow.className = 'fp-grid-row' + (gActive ? ' active' : '');
      gRow.style.paddingLeft = '14px';

      const gIcon = document.createElement('span');
      gIcon.className = 'fp-grid-icon';
      gIcon.innerHTML = '<i data-lucide="grid-3x3"></i>';

      const gName = document.createElement('span');
      gName.className = 'fp-grid-name';
      gName.textContent = g.name;

      const gCtx = document.createElement('button');
      gCtx.className = 'fp-grid-ctx-btn';
      gCtx.innerHTML = '<i data-lucide="ellipsis-vertical"></i>';
      gCtx.title = 'Options';

      gRow.appendChild(gIcon);
      gRow.appendChild(gName);
      gRow.appendChild(gCtx);

      gRow.addEventListener('click', e => {
        if (e.target === gCtx) return;
        // Activer le dossier parent si pas déjà actif
        if (_localActiveFolderId !== f.id) {
          _localActiveFolderId = f.id;
          _saveLocalActiveFolderId(f.id);
          _selectedGridIds = [g.id];
          saveLocalSelectedGrids(_selectedGridIds);
          const folder = activeFolder();
          if (folder) folder.activeGridId = g.id;
          saveState();
          renderAllFolders();
          renderElements();
          renderGridsList();
          renderGrid();
        } else {
          toggleGridSelection(g.id);
        }
      });
      const openGridMenu = (e, anchor) => {
        e.stopPropagation();
        const { addItem } = _tlMakeCtxMenu(anchor, e);
        addItem('pencil', 'Renommer',   false, () => openRenameGridModal(g.id));
        addItem('copy-plus', 'Dupliquer',  false, () => duplicateGrid(g.id));
        addItem('trash-2', 'Supprimer', true,  () => deleteGrid(g.id));
      };
      gCtx.addEventListener('click', e => openGridMenu(e, gRow));
      gRow.addEventListener('contextmenu', e => { e.preventDefault(); openGridMenu(e, null); });

      childrenEl.appendChild(gRow);
    });

    // Dossiers enfants (récursif)
    children.forEach(sf => _renderFolder(sf, childrenEl, depth + 1));

    // Toggle collapse
    const toggleCollapse = e => {
      e.stopPropagation();
      collapsed = !collapsed;
      sessionStorage.setItem(collapseKey, collapsed ? '1' : '0');
      arrow.classList.toggle('collapsed', collapsed);
      childrenEl.classList.toggle('collapsed', collapsed);
      icon.innerHTML = (hasChildren && !collapsed) ? '<i data-lucide="folder-open"></i>' : '<i data-lucide="folder-closed"></i>';
      if (window.lucide) lucide.createIcons();
    };
    arrow.addEventListener('click', toggleCollapse);

    row.addEventListener('click', e => {
      if (e.target === arrow || e.target === ctxBtn) return;
      switchFolder(f.id);
    });

    const openFolderMenu = (e, anchor) => {
      e.stopPropagation();
      const { addItem } = _tlMakeCtxMenu(anchor, e);
      addItem('folder-closed', 'Nouveau sous-dossier', false, () => openNewFolderModal(f.id));
      addItem('pencil', 'Renommer',             false, () => openRenameFolderModal(f.id));
      addItem('copy-plus', 'Dupliquer',            false, () => openDuplicateFolderModal(f.id));
      addItem('move', 'Déplacer',            false, () => openMoveFolderModal(f.id));
      const ceIsActive = state.currentEventFolderId === f.id;
      const ceLabel = ceIsActive ? 'Retirer soirée en cours' : 'Définir comme soirée en cours';
      addItem('party-popper', ceLabel,                  false, () => confirmSetCurrentEventFolder(f.id));

      addItem('package', 'Archiver',            true,  () => archiveFolder(f.id));
      addItem('trash-2', 'Supprimer',           true,  () => deleteFolder(f.id));
    };
    ctxBtn.addEventListener('click', e => openFolderMenu(e, row));
    row.addEventListener('contextmenu', e => { e.preventDefault(); openFolderMenu(e, null); });

    wrapper.appendChild(row);
    wrapper.appendChild(childrenEl);
    parentEl.appendChild(wrapper);
  }

  roots.forEach(f => _renderFolder(f, container, 0));
  if (window.lucide) lucide.createIcons();
}

function _initPanelPosition(panel, side) {
  if (panel.dataset.positioned) return;
  const ctrl = document.getElementById('bingo-control-panel');
  const ctrlBottom = ctrl ? ctrl.getBoundingClientRect().bottom + 12 : 80;
  const panelW = panel.offsetWidth || 300;
  const x = side === 'left' ? 12 : window.innerWidth - panelW - 12;
  panel.style.left = x + 'px';
  panel.style.top  = ctrlBottom + 'px';
  panel.dataset.positioned = '1';
}

function _makePanelDraggable(panel) {
  if (panel.dataset.draggable) return;
  panel.dataset.draggable = '1';
  const header = panel.querySelector('.folders-panel-header');
  if (!header) return;
  let ox = 0, oy = 0, startX = 0, startY = 0, dragging = false;

  header.addEventListener('mousedown', e => {
    if (e.target.closest('button, input, select')) return;
    dragging = true;
    startX = e.clientX; startY = e.clientY;
    ox = panel.offsetLeft; oy = panel.offsetTop;
    e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const nx = ox + e.clientX - startX;
    const ny = oy + e.clientY - startY;
    const maxX = window.innerWidth  - panel.offsetWidth;
    const maxY = window.innerHeight - panel.offsetHeight;
    panel.style.left = Math.max(0, Math.min(nx, maxX)) + 'px';
    panel.style.top  = Math.max(0, Math.min(ny, maxY)) + 'px';
  });
  document.addEventListener('mouseup', () => { dragging = false; });
}

function openFoldersPanel() {
  renderFoldersPanelTree();
  document.getElementById('folders-panel').classList.add('open');
}

function closeFoldersPanel() {
  document.getElementById('folders-panel').classList.remove('open');
}

function renderThemesList() {
  renderAllFolders();
}

// Sous-thèmes — délégation vers fonctions dossiers
function createSubtheme(name) { createFolder(name, _localActiveFolderId || null); }
function switchSubtheme(id) { switchFolder(id); }
function deleteSubtheme(id) { deleteFolder(id); }
function archiveSubtheme(id) { archiveFolder(id); }
function renameSubtheme(id, newName) { renameFolder(id, newName); }
function duplicateSubtheme(id) { openDuplicateFolderModal(id); }

function renderSubthemesList() {
  renderAllFolders();
}


// Modales renommage sous-thème
const modalRenameSubtheme      = document.getElementById('modal-rename-subtheme');
const renameSubthemeInput      = document.getElementById('rename-subtheme-input');
const btnConfirmRenameSubtheme = document.getElementById('btn-confirm-rename-subtheme');
const btnCancelRenameSubtheme  = document.getElementById('btn-cancel-rename-subtheme');
const btnCloseRenameSubthemeModal = document.getElementById('btn-close-rename-subtheme-modal');
let _renameSubthemeId = null;

function openRenameSubthemeModal(id) { openRenameFolderModal(id); }

function closeRenameSubthemeModal() { modalRenameSubtheme.classList.add('hidden'); _renameSubthemeId = null; }
function confirmRenameSubtheme() { if (!_renameSubthemeId) return; renameSubtheme(_renameSubthemeId, renameSubthemeInput.value); closeRenameSubthemeModal(); }

btnConfirmRenameSubtheme.addEventListener('click', confirmRenameSubtheme);
btnCancelRenameSubtheme.addEventListener('click', closeRenameSubthemeModal);
btnCloseRenameSubthemeModal.addEventListener('click', closeRenameSubthemeModal);
renameSubthemeInput.addEventListener('keydown', e => { if (e.key === 'Enter') confirmRenameSubtheme(); if (e.key === 'Escape') closeRenameSubthemeModal(); });

// Modale nouveau sous-thème — stubs legacy (la modale modal-new-subtheme est cachée)
const modalNewSubtheme        = document.getElementById('modal-new-subtheme');
const newSubthemeNameInput    = document.getElementById('new-subtheme-name-input') || { value: '' };
const btnConfirmNewSubtheme   = document.getElementById('btn-confirm-new-subtheme');
const btnCancelNewSubtheme    = document.getElementById('btn-cancel-new-subtheme');
const btnCloseNewSubthemeModal = document.getElementById('btn-close-new-subtheme-modal');

// Brancher le bouton "+ Dossier" sur la vraie modale
const _btnNewFolderBingo = document.getElementById('btn-new-folder-bingo');
if (_btnNewFolderBingo) {
  _btnNewFolderBingo.addEventListener('click', () => {
    const parentId = _btnNewFolderBingo.dataset.parentId || null;
    openNewFolderModal(parentId || null);
  });
}

// Bouton "+ Dossier" racine
const _btnNewRootFolder = document.getElementById('btn-new-root-folder');
if (_btnNewRootFolder) {
  _btnNewRootFolder.addEventListener('click', () => openNewFolderModal(null));
}
// Les sous-thèmes archivés sont désormais dans modal-archives-unified

// Menu contextuel sous-thème — redirigé vers menu dossier (ctx-menu-folder)
const ctxMenuSubtheme    = document.getElementById('ctx-menu-folder'); // alias
const ctxSubthemeRename    = document.getElementById('ctx-folder-rename');
const ctxSubthemeDuplicate = document.getElementById('ctx-folder-duplicate');
const ctxSubthemeArchive   = document.getElementById('ctx-folder-archive');
let _ctxSubthemeId = null;

function openCtxMenuSubtheme(id, e, anchorEl) { openCtxMenuFolder(id, e, anchorEl); }
function closeCtxMenuSubtheme() { closeCtxMenuFolder(); }

// ──────────────────────────────────────────────
// Export PNG de la grille bingo
// ──────────────────────────────────────────────
function renderGridToCanvas(t, g, cellSize = 120) {
  const n = g.gridSize;
  const gap = 3;
  const pathFontPx  = Math.max(10, Math.round(cellSize * 0.11));
  const nameFontPx  = Math.max(13, Math.round(cellSize * 0.15));
  const lineGap     = Math.round(cellSize * 0.04);
  const headerH     = pathFontPx + lineGap + nameFontPx + Math.round(cellSize * 0.1) * 2;
  const totalW = n * cellSize + (n - 1) * gap;
  const totalH = headerH + n * cellSize + (n - 1) * gap;

  const canvas = document.createElement('canvas');
  canvas.width = totalW;
  canvas.height = totalH;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#18181c';
  ctx.fillRect(0, 0, totalW, totalH);

  const padV = Math.round(cellSize * 0.1);
  // Ligne 1 : chemin du dossier (petit, à gauche)
  const path = getFolderPath(state.folders, _localActiveFolderId);
  const pathStr = path.map(f => f.name).join(' › ');
  ctx.fillStyle = '#9090a8';
  ctx.font = `${pathFontPx}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(pathStr, totalW / 2, padV);

  // Ligne 2 : nom de la grille (plus grand, centré, en jaune)
  ctx.fillStyle = '#e8c547';
  ctx.font = `bold ${nameFontPx}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(g.name, totalW / 2, padV + pathFontPx + lineGap);

  const { indices: bingoIdx } = getBingoResult(n, g.grid.slice(0, n * n));

  for (let i = 0; i < n * n; i++) {
    const row = Math.floor(i / n);
    const col = i % n;
    const x = col * (cellSize + gap);
    const y = headerH + row * (cellSize + gap);
    const cell = g.grid[i];
    const el = cell && cell.elementId ? (activeSubtheme()?.elements || []).find(e => e.id === cell.elementId) : null;

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
    let baseRatio;
    if (lenText <= 6)       baseRatio = 0.185;
    else if (lenText <= 12) baseRatio = 0.145;
    else if (lenText <= 22) baseRatio = 0.113;
    else if (lenText <= 40) baseRatio = 0.093;
    else                    baseRatio = 0.077;
    let fontSize = Math.max(7, Math.round(baseRatio * cellSize));
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Word-wrap — réduire la taille si le texte ne rentre pas
    const padding = cellSize * 0.1;
    const maxW = cellSize - padding * 2;
    const lineH = fontSize * 1.2;

    function wrapText(fs) {
      ctx.font = `bold ${fs}px Arial`;
      const words = el.text.split(' ');
      const result = [];
      let line = '';
      for (const word of words) {
        const test = line ? line + ' ' + word : word;
        if (ctx.measureText(test).width > maxW && line) { result.push(line); line = word; }
        else line = test;
      }
      if (line) result.push(line);
      return result;
    }

    let lines = wrapText(fontSize);
    // Réduire la taille si le texte dépasse la hauteur de cellule
    let fsFinal = fontSize;
    while (fsFinal > 8 && lines.length * fsFinal * 1.2 > cellSize - padding * 2) {
      fsFinal--;
      lines = wrapText(fsFinal);
    }
    if (fsFinal !== fontSize) ctx.font = `bold ${fsFinal}px Arial`;
    const lineHFinal = fsFinal * 1.2;

    const totalTextH = lines.length * lineHFinal;
    const startY = y + (cellSize - totalTextH) / 2;
    lines.forEach((l, li) => {
      ctx.fillText(l, x + cellSize / 2, startY + li * lineHFinal);
    });
  }

  return canvas;
}

function getVisibleGrids() {
  const s = activeSubtheme();
  if (!s) return [];
  const activeGrids = s.grids.filter(x => !x.archived);
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
  // Largeur cible : 600px par grille
  const TARGET_PER_GRID = 600;
  const outerGap = 16;
  const n = grids[0].gridSize;
  const gridGap = 3;
  const availPerGrid = TARGET_PER_GRID - gridGap * (n - 1);
  const cellSize = Math.floor(availPerGrid / n);

  let canvas;
  if (grids.length === 1) {
    canvas = renderGridToCanvas(t, grids[0], cellSize);
  } else {
    const canvases = grids.map(gx => renderGridToCanvas(t, gx, cellSize));
    const totalW = canvases.reduce((s, c) => s + c.width, 0) + outerGap * (canvases.length - 1);
    const totalH = Math.max(...canvases.map(c => c.height));
    canvas = document.createElement('canvas');
    canvas.width = totalW;
    canvas.height = totalH;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0e0e10';
    ctx.fillRect(0, 0, totalW, totalH);
    let xOff = 0;
    canvases.forEach(c => { ctx.drawImage(c, xOff, 0); xOff += c.width + outerGap; });
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
  const s = activeSubtheme();
  if (!s) return;
  const g = s.grids.find(x => x.id === gId);
  if (!g) return;
  copyGridToClipboard([g]);
}


// ──────────────────────────────────────────────
// Grilles (dans le thème actif)
// ──────────────────────────────────────────────
const MIN_SIZE = 3;
const MAX_SIZE = 5;

function createGrid(name) {
  const s = activeSubtheme();
  if (!s) return;
  const g = defaultGrid(name);
  // Initialiser toujours MAX_SIZE² cases pour permettre la restauration lors d'un ré-agrandissement
  g.grid  = Array.from({ length: MAX_SIZE * MAX_SIZE }, () => ({ elementId: null, checked: false, color: null }));
  s.grids.push(g);
  s.activeGridId = g.id;
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
  // Parcourir uniquement les grilles du sous-thème actif (validation par sous-thème)
  const checked = new Set();
  const s = activeSubtheme();
  if (!s) return checked;
  const archivedIds = (s && s.archivedElementIds) ? s.archivedElementIds : [];
  (s.grids || []).filter(gx => !gx.archived).forEach(gx => {
    gx.grid.forEach(c => {
      if (c.checked && c.elementId && !archivedIds.includes(c.elementId)) {
        checked.add(c.elementId);
      }
    });
  });
  // Inclure les IDs validés persistants (conservés même après vidage)
  (s.persistentCheckedIds || []).forEach(id => {
    if (!archivedIds.includes(id)) checked.add(id);
  });
  return checked;
}

function deleteGrid(id) {
  const s = activeSubtheme();
  if (!s) return;
  const t = activeTheme();
  const g = s.grids.find(g => g.id === id);
  if (g) trashPush({ type: 'grid', folderId: s.id, themeId: t?.id, subthemeId: s.id, data: JSON.parse(JSON.stringify(g)) });
  s.grids = s.grids.filter(g => g.id !== id);
  if (s.activeGridId === id) {
    const remaining = s.grids.filter(g => !g.archived);
    s.activeGridId = remaining.length > 0 ? remaining[0].id : null;
  }
  saveState();
  renderGridsList();
  renderGrid();
}

function renameGrid(id, newName) {
  const s = activeSubtheme();
  const g = s?.grids.find(g => g.id === id);
  if (g && newName.trim()) { g.name = newName.trim(); g.title = newName.trim(); }
  saveState();
  renderGridsList();
  renderGrid();
}

function duplicateGrid(id) {
  const s = activeSubtheme();
  if (!s) return;
  const src = s.grids.find(g => g.id === id);
  if (!src) return;
  const copy = JSON.parse(JSON.stringify(src));
  copy.id = uid();
  copy.name = src.name + ' (copie)';
  copy.archived = false;
  copy.hidden = false;
  s.grids.push(copy);
  s.activeGridId = copy.id;
  saveState();
  renderGridsList();
  renderGrid();
}

function renderGridsList() {
  renderGridsBreadcrumb();
  _updateBingoCeSetBtn();
  gridsList.innerHTML = '';
  const s = activeSubtheme();
  if (!s) return;
  const activeGrids = s.grids.filter(g => !g.archived);

  // Nettoyer les ids sélectionnés obsolètes (grilles supprimées/archivées)
  _selectedGridIds = _selectedGridIds.filter(id => activeGrids.some(x => x.id === id));

  activeGrids.forEach(g => {
    const isSelected = _selectedGridIds.includes(g.id);
    const isActive = g.id === s.activeGridId;
    const item = document.createElement('div');
    item.className = 'grid-tab' + (isSelected ? ' active' : '');
    item.dataset.id = g.id;
    item.draggable = true;
    item.title = (isSelected ? 'Clic gauche : masquer cette grille' : 'Clic gauche : afficher cette grille (max 3)') + '\nClic droit : renommer, dupliquer, archiver, supprimer\nGlisser-déposer : réordonner';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'grid-tab-name';
    nameSpan.textContent = g.name;
    item.appendChild(nameSpan);

    const ctxBtn = document.createElement('button');
    ctxBtn.className = 'grid-tab-ctx-btn';
    ctxBtn.innerHTML = '<i data-lucide="ellipsis-vertical"></i>';
    ctxBtn.title = 'Options';
    ctxBtn.addEventListener('click', e => {
      e.stopPropagation();
      if (_clickTimer) { clearTimeout(_clickTimer); _clickTimer = null; }
      openCtxMenuGrid(g.id, e, item);
    });
    item.appendChild(ctxBtn);

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
      const sNow = activeSubtheme();
      if (!sNow) return;
      const srcIdx = sNow.grids.findIndex(x => x.id === srcId);
      const dstIdx = sNow.grids.findIndex(x => x.id === g.id);
      if (srcIdx === -1 || dstIdx === -1) return;
      const [moved] = sNow.grids.splice(srcIdx, 1);
      sNow.grids.splice(dstIdx, 0, moved);
      saveState();
      renderGridsList();
      renderGrid();
    });

    let _clickTimer = null;
    item.addEventListener('click', e => {
      if (_clickTimer) { clearTimeout(_clickTimer); _clickTimer = null; return; }
      _clickTimer = setTimeout(() => {
        _clickTimer = null;
        const sNow = activeSubtheme();
        if (!sNow) return;
        const nowSelected = _selectedGridIds.includes(g.id);
        if (nowSelected) {
          _selectedGridIds = _selectedGridIds.filter(id => id !== g.id);
          if (sNow.activeGridId === g.id) {
            sNow.activeGridId = _selectedGridIds.length > 0 ? _selectedGridIds[0] : null;
          }
        } else {
          if (_selectedGridIds.length >= 3) return;
          _selectedGridIds.push(g.id);
          sNow.activeGridId = g.id;
        }
        saveLocalSelectedGrids(_selectedGridIds);
        saveState();
        renderGridsList();
        renderGrid();
      }, 220);
    });

    item.addEventListener('contextmenu', e => {
      e.preventDefault();
      e.stopPropagation();
      if (_clickTimer) { clearTimeout(_clickTimer); _clickTimer = null; }
      openCtxMenuGrid(g.id, e, item);
    });

    gridsList.appendChild(item);
  });
}

function openRenameGridModal(id) {
  const s = activeSubtheme();
  if (!s) return;
  const g = s.grids.find(g => g.id === id);
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


// ──────────────────────────────────────────────
// Grille — actions
// ──────────────────────────────────────────────
function generateOneGrid(t, g, fillOnlyEmpty = false) {
  if (g.locked) return false;
  const n = g.gridSize;
  const cellCount = n * n;
  const s = activeSubtheme();
  const archivedIds = (s && s.archivedElementIds) ? s.archivedElementIds : [];
  const sElems = (s && s.elements) ? s.elements : [];
  const active = sElems.filter(e => !archivedIds.includes(e.id));

  // S'assurer que le tableau est au moins de taille MAX_SIZE² pour préserver les cases cachées
  const maxCells = MAX_SIZE * MAX_SIZE;
  while (g.grid.length < maxCells) g.grid.push({ elementId: null, checked: false, color: null });

  if (fillOnlyEmpty) {
    // Ne remplir que les cases vides (elementId === null)
    const emptyIndices = [];
    const usedIds = new Set();

    for (let i = 0; i < cellCount; i++) {
      if (!g.grid[i]) {
        emptyIndices.push(i);
      } else if (g.grid[i].elementId === null) {
        emptyIndices.push(i);
      } else {
        // Vérifier que l'élément existe toujours
        const elemExists = sElems.some(el => el.id === g.grid[i].elementId);
        if (elemExists) {
          usedIds.add(g.grid[i].elementId);
        } else {
          // L'élément a été supprimé, marquer la case comme vide
          g.grid[i].elementId = null;
          emptyIndices.push(i);
        }
      }
    }

    if (emptyIndices.length === 0) return false;

    // Créer un pool d'éléments disponibles (non utilisés)
    const available = active.filter(e => !usedIds.has(e.id));
    if (available.length < emptyIndices.length) return false;

    const pool = shuffle(available).slice(0, emptyIndices.length);
    const globalChecked = getGlobalCheckedElementIds(s);

    // Remplir uniquement les cases vides
    emptyIndices.forEach((idx, poolIdx) => {
      g.grid[idx] = {
        elementId: pool[poolIdx] ? pool[poolIdx].id : null,
        checked: pool[poolIdx] ? globalChecked.has(pool[poolIdx].id) : false,
        color: null,
      };
    });
  } else {
    // Mode normal : remplacer toutes les cases visibles
    if (active.length < cellCount) return false;
    const pool = shuffle(active).slice(0, cellCount);
    const globalChecked = getGlobalCheckedElementIds(s);
    for (let i = 0; i < cellCount; i++) {
      g.grid[i] = {
        elementId: pool[i] ? pool[i].id : null,
        checked: pool[i] ? globalChecked.has(pool[i].id) : false,
        color: null,
      };
    }
  }
  return true;
}

function changeSize(delta) {
  const g = activeGrid();
  if (!g) return;
  const newSize = g.gridSize + delta;
  if (newSize < MIN_SIZE || newSize > MAX_SIZE) return;

  g.gridSize = newSize;
  // S'assurer que le tableau est toujours de taille MAX_SIZE² — on ne tronque jamais
  while (g.grid.length < MAX_SIZE * MAX_SIZE) {
    g.grid.push({ elementId: null, checked: false, color: null });
  }

  saveState();
  renderGrid();
}


function applyFontScale() {
  const scale = _localFontScale;
  const pct = Math.round(scale * 100);
  fontScaleInput.value = pct;
  const dispEl = document.getElementById('font-scale-display');
  if (dispEl) dispEl.textContent = pct + '%';

  const t = activeTheme();
  const s = activeSubtheme();
  if (!t || !s) return;
  gridWrapper.querySelectorAll('.bingo-cell:not(.empty)').forEach(div => {
    const idx = parseInt(div.dataset.index);
    if (isNaN(idx)) return;
    const gridId = div.closest('[data-grid-id]')?.dataset.gridId;
    const g = gridId ? s.grids.find(x => x.id === gridId) : activeGrid();
    if (!g) return;
    const cell = g.grid[idx];
    if (!cell || !cell.elementId) return;
    const el = (s && s.elements ? s.elements : []).find(e => e.id === cell.elementId);
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

let _clearCellCallback = null;
function openClearCellConfirm(label, callback) {
  _clearCellCallback = callback;
  document.getElementById('modal-clear-msg').textContent = `Vider la case ${label} ?`;
  document.getElementById('modal-confirm-clear').classList.remove('hidden');
}

function buildSingleGrid(t, g, isActive, totalGrids = 1) {
  const n = g.gridSize;
  const scale = _localFontScale;
  const s = activeSubtheme();
  const { indices: bingoIndices, lines: bingoLines } = getBingoResult(n, g.grid.slice(0, n * n));

  const wrapper = document.createElement('div');
  wrapper.className = 'grid-view-wrapper';
  wrapper.dataset.gridId = g.id;

  // Afficher le chemin du dossier actif
  const _activeFolderPath = getFolderPath(state.folders, _localActiveFolderId);
  const themeSubthemeRow = document.createElement('div');
  themeSubthemeRow.className = 'grid-view-theme-subtheme-row';
  themeSubthemeRow.textContent = _activeFolderPath.map(f => f.name).join(' › ') || t.name;
  wrapper.appendChild(themeSubthemeRow);

  // Titre de grille éditable (synchronisé avec le nom de l'onglet)
  const titleRow = document.createElement('div');
  titleRow.className = 'grid-view-title-row';
  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.className = 'grid-view-title-input';
  titleInput.placeholder = g.name;
  titleInput.value = g.title || g.name;
  titleInput.maxLength = 60;
  titleInput.title = 'Renommer la grille';
  titleInput.addEventListener('input', () => {
    const sNow = activeSubtheme();
    if (!sNow) return;
    const gNow = sNow.grids.find(x => x.id === g.id);
    if (!gNow) return;
    const val = titleInput.value.trim();
    gNow.title = val;
    gNow.name = val || gNow.name;
    // Mettre à jour l'onglet en live sans re-render complet
    const tabEl = gridsList.querySelector(`.grid-tab[data-id="${g.id}"] .grid-tab-name`);
    if (tabEl && val) tabEl.textContent = val;
  });
  titleInput.addEventListener('change', () => {
    const sNow = activeSubtheme();
    if (!sNow) return;
    const gNow = sNow.grids.find(x => x.id === g.id);
    if (!gNow) return;
    const val = titleInput.value.trim();
    if (val) { gNow.title = val; gNow.name = val; }
    saveState();
    renderGridsList();
  });
  titleRow.appendChild(titleInput);
  wrapper.appendChild(titleRow);

  // Contrôles par grille (ordre : Taille | Bloquer | Générer | Capture)
  const subCtrl = document.createElement('div');
  subCtrl.className = 'subgrid-controls';
  subCtrl.title = '';

  // Contrôle de taille propre à cette grille
  const sizeCtrl = document.createElement('div');
  sizeCtrl.className = 'subgrid-size-control';
  const btnSzMinus = document.createElement('button');
  btnSzMinus.className = 'size-btn size-btn-sm';
  btnSzMinus.textContent = '−';
  btnSzMinus.title = 'Réduire la grille';
  const szDisplay = document.createElement('span');
  szDisplay.className = 'subgrid-size-display';
  szDisplay.textContent = `${g.gridSize}×${g.gridSize}`;
  szDisplay.title = '';
  const btnSzPlus = document.createElement('button');
  btnSzPlus.className = 'size-btn size-btn-sm';
  btnSzPlus.textContent = '+';
  btnSzPlus.title = 'Agrandir la grille';

  const doResize = (delta) => {
    const tNow = activeTheme();
    const sNow = activeSubtheme();
    if (!tNow || !sNow) return;
    const gNow = sNow.grids.find(x => x.id === g.id);
    if (!gNow) return;
    const newSize = gNow.gridSize + delta;
    if (newSize < MIN_SIZE || newSize > MAX_SIZE) return;
    gNow.gridSize = newSize;
    const maxCells = MAX_SIZE * MAX_SIZE;
    // On s'assure que le tableau a toujours MAX_SIZE² cases pour pouvoir restaurer
    // les cases lors d'un ré-agrandissement — on ne tronque jamais
    while (gNow.grid.length < maxCells) gNow.grid.push({ elementId: null, checked: false });
    saveState();
    renderGrid();
  };

  const globalLocked = !!t.locked;
  const gridLocked = g.locked || globalLocked;

  btnSzMinus.addEventListener('click', () => doResize(-1));
  btnSzPlus.addEventListener('click', () => doResize(+1));
  sizeCtrl.appendChild(btnSzMinus);
  sizeCtrl.appendChild(szDisplay);
  sizeCtrl.appendChild(btnSzPlus);
  subCtrl.appendChild(sizeCtrl);

  const lblLock = document.createElement('button');
  lblLock.type = 'button';
  lblLock.className = 'subgrid-lock-label';
  lblLock.title = 'Bloquer la génération aléatoire de cette grille';
  lblLock.disabled = globalLocked;
  lblLock.setAttribute('aria-pressed', gridLocked ? 'true' : 'false');
  const lockIcon = document.createElement('i');
  lockIcon.setAttribute('data-lucide', gridLocked ? 'lock-keyhole' : 'lock-keyhole-open');
  lblLock.appendChild(lockIcon);
  lblLock.addEventListener('click', () => {
    const tNow = activeTheme();
    const sNow = activeSubtheme();
    if (!tNow || tNow.locked || !sNow) return;
    const gNow = sNow.grids.find(x => x.id === g.id);
    if (gNow) { gNow.locked = !gNow.locked; saveState(); renderGrid(); }
  });

  // Vérifier si assez d'éléments pour cette grille
  const sActive = activeSubtheme();
  const sArchivedIds = (sActive && sActive.archivedElementIds) ? sActive.archivedElementIds : [];
  const activeElemCount = (sActive && sActive.elements ? sActive.elements : []).filter(e => !sArchivedIds.includes(e.id)).length;
  const cellCount = g.gridSize * g.gridSize;
  const enoughForThis = activeElemCount >= cellCount;
  const genDisabled = gridLocked || !enoughForThis;

  const btnSubGen = document.createElement('button');
  btnSubGen.className = 'btn-action btn-subgrid btn-subgrid-gen' + (genDisabled ? ' btn-disabled' : '');
  btnSubGen.disabled = genDisabled;
  btnSubGen.innerHTML = '<i data-lucide="dices"></i>';
  btnSubGen.title = genDisabled && !gridLocked
    ? `Pas assez d'éléments (${activeElemCount}/${cellCount})`
    : 'Générer aléatoirement la grille (ou remplir les cases vides si cochée l\'option)';
  btnSubGen.addEventListener('click', () => {
    const tNow = activeTheme();
    const sNow = activeSubtheme();
    if (!tNow || tNow.locked || !sNow) return;
    const gNow = sNow.grids.find(x => x.id === g.id);
    if (!gNow || gNow.locked) return;
    const ok = generateOneGrid(tNow, gNow, false);
    if (!ok) {
      const n = gNow.gridSize;
      const cellCount = n * n;
      gridError.innerHTML = `<i data-lucide="triangle-alert"></i> Pas assez d'éléments actifs pour générer une grille ${n}×${n}.`;
      if (window.lucide) lucide.createIcons();
      gridError.classList.remove('hidden');
      return;
    }
    gridError.classList.add('hidden');
    saveState();
    renderGrid();
  });

  // Bouton "Générer cases vides" par grille
  const btnSubFillEmpty = document.createElement('button');
  btnSubFillEmpty.className = 'btn-action btn-subgrid btn-subgrid-fill-empty';
  btnSubFillEmpty.innerHTML = '<i data-lucide="dice-1"></i>';
  btnSubFillEmpty.title = 'Générer aléatoirement seulement les cases vides';

  // Vérifier si on peut remplir les cases vides
  const canFillEmpty = (() => {
    const usedIds = new Set();
    for (let i = 0; i < cellCount; i++) {
      if (g.grid[i] && g.grid[i].elementId) {
        const elemExists = (sActive && sActive.elements ? sActive.elements : []).some(el => el.id === g.grid[i].elementId);
        if (elemExists) usedIds.add(g.grid[i].elementId);
      }
    }
    const emptyCount = g.grid.slice(0, cellCount).filter(c => !c || !c.elementId).length;
    const availableCount = activeElemCount - usedIds.size;
    return !gridLocked && emptyCount > 0 && availableCount >= emptyCount;
  })();

  btnSubFillEmpty.disabled = !canFillEmpty;
  if (!canFillEmpty) btnSubFillEmpty.classList.add('btn-disabled');

  btnSubFillEmpty.addEventListener('click', () => {
    const tNow = activeTheme();
    const sNow = activeSubtheme();
    if (!tNow || tNow.locked || !sNow) return;
    const gNow = sNow.grids.find(x => x.id === g.id);
    if (!gNow || gNow.locked) return;
    const ok = generateOneGrid(tNow, gNow, true);
    if (!ok) {
      const n = gNow.gridSize;
      const cellCount = n * n;
      const usedIds = new Set();
      const deletedIds = new Set();

      for (let i = 0; i < cellCount; i++) {
        if (gNow.grid[i] && gNow.grid[i].elementId) {
          const elemExists = (sNow.elements || []).some(el => el.id === gNow.grid[i].elementId);
          if (elemExists) {
            usedIds.add(gNow.grid[i].elementId);
          } else {
            deletedIds.add(gNow.grid[i].elementId);
          }
        }
      }
      const emptyCount = gNow.grid.slice(0, cellCount).filter(c => !c || !c.elementId).length;
      const sNowArchivedIds = (sNow && sNow.archivedElementIds) ? sNow.archivedElementIds : [];
      const activeElemCount = (sNow.elements || []).filter(e => !sNowArchivedIds.includes(e.id)).length;
      const availableCount = activeElemCount - usedIds.size;
      let msg = `<i data-lucide="triangle-alert"></i> Impossible de remplir. Cases vides : ${emptyCount}, éléments disponibles : ${availableCount}.`;
      if (deletedIds.size > 0) {
        msg += ` (${deletedIds.size} éléments sur la grille ont été supprimés)`;
      }
      gridError.innerHTML = msg;
      if (window.lucide) lucide.createIcons();
      gridError.classList.remove('hidden');
      return;
    }
    gridError.classList.add('hidden');
    saveState();
    renderGrid();
  });

  const btnSubClear = document.createElement('button');
  btnSubClear.className = 'btn-action btn-subgrid btn-subgrid-clear' + (gridLocked ? ' btn-disabled' : '');
  btnSubClear.disabled = gridLocked;
  btnSubClear.innerHTML = '<i data-lucide="eraser"></i>';
  btnSubClear.title = gridLocked ? 'Grille bloquée' : 'Vider cette grille';
  btnSubClear.addEventListener('click', () => {
    const tNow = activeTheme();
    const sNow = activeSubtheme();
    if (!tNow || tNow.locked || !sNow) return;
    const gNow = sNow.grids.find(x => x.id === g.id);
    if (!gNow || gNow.locked) return;
    // Conserver les IDs validés avant de vider
    if (!sNow.persistentCheckedIds) sNow.persistentCheckedIds = [];
    gNow.grid.forEach(c => {
      if (c.checked && c.elementId && !sNow.persistentCheckedIds.includes(c.elementId)) {
        sNow.persistentCheckedIds.push(c.elementId);
      }
    });
    gNow.grid = gNow.grid.map(() => ({ elementId: null, checked: false }));
    saveState();
    renderGrid();
    renderElements();
  });

  // Cadre discret autour de Bloquer + Générer
  const lockGenGroup = document.createElement('div');
  lockGenGroup.className = 'subgrid-lock-gen-group';
  lockGenGroup.appendChild(lblLock);
  lockGenGroup.appendChild(btnSubGen);
  lockGenGroup.appendChild(btnSubFillEmpty);
  lockGenGroup.appendChild(btnSubClear);
  subCtrl.appendChild(lockGenGroup);


  const btnSubCapture = document.createElement('button');
  btnSubCapture.className = 'btn-action btn-screenshot-bingo btn-subgrid';
  btnSubCapture.innerHTML = '<i data-lucide="camera"></i>';
  btnSubCapture.title = 'Copier la grille dans le presse-papier';
  btnSubCapture.addEventListener('click', () => bingoScreenshotOne(g.id));
  subCtrl.appendChild(btnSubCapture);

  wrapper.appendChild(subCtrl);

  const gridEl = document.createElement('div');
  gridEl.className = 'bingo-grid';
  gridEl.title = '';
  gridEl.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
  // Réduire proportionnellement pour les multi-grilles (même ratio que le CSS de base 80→68→56)
  const heightFactor = totalGrids === 3 ? 0.70 : totalGrids === 2 ? 0.85 : 1;
  gridEl.style.maxWidth = `min(${Math.round(_localGridHeight * heightFactor)}vh, 100%)`;

  // On n'itère que sur les n×n premières cases (le tableau peut être plus grand
  // pour préserver les cases cachées lors d'une réduction temporaire de taille)
  const visibleCells = g.grid.slice(0, n * n);
  visibleCells.forEach((cell, i) => {
    const div = document.createElement('div');
    div.className = 'bingo-cell';
    div.dataset.index = i;

    // Drag & drop (actif si grille non bloquée)
    if (!gridLocked) {
      div.draggable = true;
      div.addEventListener('dragstart', e => {
        e.stopPropagation();
        e.dataTransfer.setData('text/plain', `cell:${g.id}:${i}`);
        div.classList.add('cell-dragging');
      });
      div.addEventListener('dragend', () => div.classList.remove('cell-dragging'));
      div.addEventListener('dragover', e => { if (_draggingGridWrapper) return; e.preventDefault(); div.classList.add('drag-over'); });
      div.addEventListener('dragleave', () => div.classList.remove('drag-over'));
      div.addEventListener('drop', e => {
        if (_draggingGridWrapper) return;
        e.preventDefault();
        div.classList.remove('drag-over');
        const data = e.dataTransfer.getData('text/plain');
        const targetIdx = parseInt(div.dataset.index);
        if (isNaN(targetIdx)) return;

        if (data.startsWith('cell:')) {
          // Swap intra-grille
          const parts = data.split(':');
          if (parts[1] !== g.id) return; // grilles différentes → ignorer
          const srcIdx = parseInt(parts[2]);
          if (isNaN(srcIdx) || srcIdx === targetIdx) return;
          const sNow = activeSubtheme();
          if (!sNow) return;
          const gNow = sNow.grids.find(x => x.id === g.id);
          if (!gNow || gNow.locked) return;
          [gNow.grid[srcIdx], gNow.grid[targetIdx]] = [gNow.grid[targetIdx], gNow.grid[srcIdx]];
          saveState();
          renderGrid();
          renderElements();
        } else {
          // Drop depuis le drawer
          const elId = data;
          if (!elId) return;
          const alreadyInGrid = g.grid.some(c => c.elementId === elId);
          if (alreadyInGrid) return;
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
      div.textContent = '—';
    } else {
      const el = (s && s.elements ? s.elements : []).find(e => e.id === cell.elementId);
      const cellText = el ? el.text : '?';
      div.textContent = cellText;
      div.style.fontSize = getCellFontSize(cellText, scale);
      if (cell.checked)        div.classList.add('checked');
      if (cell.color === 'red') div.classList.add('cell-red');
      if (bingoIndices.has(i)) div.classList.add('bingo-line');

      div.title = cell.checked ? 'Désactiver cette case' : 'Valider cette case' + (!gridLocked ? ' · Clic droit : vider' : '');
      div.addEventListener('click', () => {
        if (!cell.elementId) return;
        const newChecked = !cell.checked;
        const tNow = activeTheme();
        const sNow = activeSubtheme();
        if (tNow && sNow) {
          (sNow.grids || []).filter(gx => !gx.archived).forEach(gx => {
            const matchCell = gx.grid.find(c => c.elementId === cell.elementId);
            if (matchCell) matchCell.checked = newChecked;
          });
          const elObj = (sNow.elements || []).find(e => e.id === cell.elementId);
          if (elObj) elObj.checked = newChecked;
          // Synchroniser persistentCheckedIds
          if (!sNow.persistentCheckedIds) sNow.persistentCheckedIds = [];
          if (newChecked) {
            if (!sNow.persistentCheckedIds.includes(cell.elementId)) sNow.persistentCheckedIds.push(cell.elementId);
          } else {
            sNow.persistentCheckedIds = sNow.persistentCheckedIds.filter(id => id !== cell.elementId);
          }
        }
        saveState();
        renderGrid();
        renderElements();
      });

      if (!gridLocked) {
        div.addEventListener('contextmenu', e => {
          e.preventDefault();
          const el = (s && s.elements ? s.elements : []).find(x => x.id === cell.elementId);
          const label = el ? `« ${el.text} »` : 'cette case';
          openClearCellConfirm(label, () => {
            const sNow = activeSubtheme();
            if (!sNow) return;
            const gNow = sNow.grids.find(x => x.id === g.id);
            if (!gNow || gNow.locked) return;
            // Conserver la validation dans persistentCheckedIds avant de vider
            if (cell.checked && cell.elementId) {
              if (!sNow.persistentCheckedIds) sNow.persistentCheckedIds = [];
              if (!sNow.persistentCheckedIds.includes(cell.elementId)) sNow.persistentCheckedIds.push(cell.elementId);
            }
            gNow.grid[i] = { elementId: null, checked: false };
            saveState();
            renderGrid();
            renderElements();
          });
        });
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
      ? `<i data-lucide="party-popper"></i> BINGO ! Tu as complété une ligne !`
      : `<i data-lucide="party-popper"></i> BINGO x${count} ! Tu as complété ${count} lignes !`;
    wrapper.appendChild(msg);
  }

  return { wrapper, bingoLines };
}

function renderGrid() {
  const t = activeTheme();
  const s = activeSubtheme();
  const g = activeGrid();

  updateClearGridsButton();
  updateFillEmptyButtonState();
  updateOpenGridsWindowButton();
  gridWrapper.innerHTML = '';
  gridWrapper.style.justifyContent = '';
  gridWrapper.style.alignItems = '';
  gridWrapper.style.paddingTop = '';
  gridWrapper.style.gap = '';

  if (!t) {
    bingoLayout.classList.add('no-theme-layout');
    gridWrapper.style.justifyContent = 'center';
    gridWrapper.style.alignItems = 'center';
    gridWrapper.style.paddingTop = '80px';
    const btn = document.createElement('button');
    btn.className = 'btn-empty-state btn-empty-state-blue';
    btn.textContent = '+ Nouveau dossier';
    btn.addEventListener('click', () => openNewFolderModal(null));
    gridWrapper.appendChild(btn);
    sizeDisplay.textContent = '—';
    bingoMsg.classList.add('hidden');
    btnGenerate.disabled = true;
    btnGenerate.classList.add('btn-disabled');
    btnReset.disabled = false;
    btnReset.classList.remove('btn-disabled');
    _setLockGenerateChecked(false);
    return;
  }
  bingoLayout.classList.remove('no-theme-layout');

  if (!s) {
    gridWrapper.style.justifyContent = 'center';
    gridWrapper.style.alignItems = 'center';
    gridWrapper.style.paddingTop = '80px';
    const btn = document.createElement('button');
    btn.className = 'btn-empty-state btn-empty-state-blue';
    btn.textContent = '+ Nouveau dossier';
    btn.addEventListener('click', () => openNewFolderModal(_localActiveFolderId || null));
    gridWrapper.appendChild(btn);
    sizeDisplay.textContent = '—';
    bingoMsg.classList.add('hidden');
    btnGenerate.disabled = true;
    btnGenerate.classList.add('btn-disabled');
    btnReset.disabled = false;
    btnReset.classList.remove('btn-disabled');
    _setLockGenerateChecked(false);
    return;
  }

  const hasAnyGrid = s.grids.some(x => !x.archived);
  if (!hasAnyGrid || _selectedGridIds.length === 0) {
    gridWrapper.style.justifyContent = 'center';
    gridWrapper.style.alignItems = 'center';
    gridWrapper.style.paddingTop = '80px';
    gridWrapper.style.gap = '16px';
    const btnFolder = document.createElement('button');
    btnFolder.className = 'btn-empty-state btn-empty-state-blue';
    btnFolder.textContent = '+ Nouveau dossier';
    btnFolder.addEventListener('click', () => openNewFolderModal(_localActiveFolderId || null));
    const btn = document.createElement('button');
    btn.className = 'btn-empty-state';
    btn.textContent = '+ Nouvelle grille';
    btn.addEventListener('click', openNewGridModal);
    gridWrapper.appendChild(btnFolder);
    gridWrapper.appendChild(btn);
    sizeDisplay.textContent = '—';
    bingoMsg.classList.add('hidden');
    btnGenerate.disabled = true;
    btnGenerate.classList.add('btn-disabled');
    btnReset.disabled = false;
    btnReset.classList.remove('btn-disabled');
    return;
  }

  const n = (g || s.grids.find(x => !x.archived)).gridSize;
  sizeDisplay.textContent = `${n}×${n}`;

  // Synchroniser l'icône verrou avec l'état du thème
  const locked = !!t.locked;
  _setLockGenerateChecked(locked);

  const sArchivedIds = (s && s.archivedElementIds) ? s.archivedElementIds : [];
  const activeCount = (s.elements || []).filter(e => !sArchivedIds.includes(e.id)).length;
  const enoughElements = activeCount >= n * n;
  btnReset.disabled = locked;
  btnReset.classList.toggle('btn-disabled', locked);
  updateClearGridsButton();
  if (enoughElements) gridError.classList.add('hidden');

  const gridsToShow = getVisibleGrids();

  if (gridsToShow.length === 0) {
    gridWrapper.innerHTML = '<div class="no-grid-msg">Aucune grille sélectionnée — clique sur un onglet pour afficher une grille.</div>';
    gridWrapper.className = 'grid-wrapper';
    bingoMsg.classList.add('hidden');
    btnGenerate.disabled = true;
    btnGenerate.classList.add('btn-disabled');
    return;
  }

  btnGenerate.disabled = !enoughElements || locked;
  btnGenerate.classList.toggle('btn-disabled', !enoughElements || locked);

  gridWrapper.className = `grid-wrapper grid-views-${gridsToShow.length}`;

  // Le message global est désormais remplacé par des messages individuels par grille
  bingoMsg.classList.add('hidden');

  const _pendingBingoEffects = [];

  gridsToShow.forEach(gridItem => {
    const isActive = gridItem.id === (g?.id);
    const { wrapper, bingoLines } = buildSingleGrid(t, gridItem, isActive, gridsToShow.length);

    // Drag & drop pour réordonner les grilles affichées
    if (gridsToShow.length > 1) {
      wrapper.draggable = true;
      wrapper.style.cursor = 'grab';
      wrapper.title = 'Déplace la grille';
      wrapper.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', gridItem.id);
        wrapper.classList.add('grid-wrapper-dragging');
        _draggingGridWrapper = true;
      });
      wrapper.addEventListener('dragend', () => {
        wrapper.classList.remove('grid-wrapper-dragging');
        _draggingGridWrapper = false;
      });
      wrapper.addEventListener('dragover', e => {
        e.preventDefault();
        wrapper.classList.add('grid-wrapper-drag-over');
      });
      wrapper.addEventListener('dragleave', () => wrapper.classList.remove('grid-wrapper-drag-over'));
      wrapper.addEventListener('drop', e => {
        e.preventDefault();
        wrapper.classList.remove('grid-wrapper-drag-over');
        const srcId = e.dataTransfer.getData('text/plain');
        if (srcId.startsWith('cell:')) return; // drag depuis une case → ignorer
        if (srcId === gridItem.id) return;
        const srcIdx = _selectedGridIds.indexOf(srcId);
        const dstIdx = _selectedGridIds.indexOf(gridItem.id);
        if (srcIdx === -1 || dstIdx === -1) return;
        [_selectedGridIds[srcIdx], _selectedGridIds[dstIdx]] = [_selectedGridIds[dstIdx], _selectedGridIds[srcIdx]];
        saveLocalSelectedGrids(_selectedGridIds);
        renderGrid();
      });
    }

    gridWrapper.appendChild(wrapper);
    _pendingBingoEffects.push({ gridId: gridItem.id, lineCount: bingoLines.length });
  });

  applyFontScale();
  if (window.lucide) lucide.createIcons();

  // Déclencher après que les wrappers sont dans le DOM et que le layout est calculé
  setTimeout(() => {
    _pendingBingoEffects.forEach(({ gridId, lineCount }) => {
      triggerBingoEffectIfNew(gridId, lineCount);
    });
  }, 0);
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
// Modale : nouveau dossier (remplace modal-new-theme)
// ──────────────────────────────────────────────
const modalNewTheme        = document.getElementById('modal-new-folder');
const newThemeNameInput    = document.getElementById('new-folder-name-input');
const btnConfirmNewTheme   = document.getElementById('btn-confirm-new-folder');
const btnCancelNewTheme    = document.getElementById('btn-cancel-new-folder');
const btnCloseNewThemeModal = document.getElementById('btn-close-new-folder-modal');

function openNewThemeModal(parentId = null) {
  if (!modalNewTheme) return;

  // Peupler le select parent
  const sel = document.getElementById('new-folder-parent-select');
  if (sel) {
    sel.innerHTML = '';
    const rootOpt = document.createElement('option');
    rootOpt.value = '';
    rootOpt.textContent = '— Racine —';
    sel.appendChild(rootOpt);
    function _addOptions(folders, depth) {
      (folders || []).filter(f => !f.archived).forEach(f => {
        const opt = document.createElement('option');
        opt.value = f.id;
        opt.textContent = '  '.repeat(depth) + f.name;
        sel.appendChild(opt);
        _addOptions(f.folders, depth + 1);
      });
    }
    _addOptions(state.folders, 0);
    sel.value = parentId || '';
  }

  const parent = parentId ? findFolderById(state.folders, parentId) : null;
  const siblings = parent ? (parent.folders || []) : (state.folders || []);
  const n = siblings.length + 1;
  newThemeNameInput.value = '';
  modalNewTheme.classList.remove('hidden');
  setTimeout(() => { newThemeNameInput.focus(); newThemeNameInput.select(); }, 50);
}

function openNewFolderModal(parentId = null) { openNewThemeModal(parentId); }

function closeNewThemeModal() {
  if (modalNewTheme) modalNewTheme.classList.add('hidden');
}

function confirmNewTheme() {
  const name = newThemeNameInput.value.trim();
  if (!name) return;
  const sel = document.getElementById('new-folder-parent-select');
  const parentId = (sel && sel.value) ? sel.value : null;
  closeNewThemeModal();
  createFolder(name, parentId);
}

function createTheme(name) { createFolder(name, null); }

if (btnConfirmNewTheme) btnConfirmNewTheme.addEventListener('click', confirmNewTheme);
if (btnCancelNewTheme) btnCancelNewTheme.addEventListener('click', closeNewThemeModal);
if (btnCloseNewThemeModal) btnCloseNewThemeModal.addEventListener('click', closeNewThemeModal);
if (newThemeNameInput) newThemeNameInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') confirmNewTheme();
  if (e.key === 'Escape') closeNewThemeModal();
});

// Modale renommer / dupliquer dossier
let _renameFolderId = null;
let _renameFolderMode = 'rename'; // 'rename' | 'duplicate'
function openRenameFolderModal(id) {
  const folder = findFolderById(state.folders, id);
  if (!folder) return;
  _renameFolderId = id;
  _renameFolderMode = 'rename';
  const title = document.getElementById('rename-folder-modal-title');
  if (title) title.textContent = 'Renommer le dossier';
  if (renameThemeInput) renameThemeInput.value = folder.name;
  if (modalRenameTheme) modalRenameTheme.classList.remove('hidden');
  setTimeout(() => { if (renameThemeInput) { renameThemeInput.focus(); renameThemeInput.select(); } }, 50);
}
function openDuplicateFolderModal(id) {
  const folder = findFolderById(state.folders, id);
  if (!folder) return;
  _renameFolderId = id;
  _renameFolderMode = 'duplicate';
  const title = document.getElementById('rename-folder-modal-title');
  if (title) title.textContent = 'Dupliquer le dossier';
  if (renameThemeInput) renameThemeInput.value = '';
  if (renameThemeInput) renameThemeInput.placeholder = 'Nom du nouveau dossier...';
  if (modalRenameTheme) modalRenameTheme.classList.remove('hidden');
  setTimeout(() => { if (renameThemeInput) renameThemeInput.focus(); }, 50);
}
function closeRenameThemeModal() {
  if (modalRenameTheme) modalRenameTheme.classList.add('hidden');
  _renameFolderId = null;
  _renameFolderMode = 'rename';
}
function confirmRenameTheme() {
  if (!_renameFolderId) return;
  const name = renameThemeInput?.value.trim() || '';
  if (!name) return;
  if (_renameFolderMode === 'duplicate') {
    duplicateFolder(_renameFolderId, name);
  } else {
    renameFolder(_renameFolderId, name);
  }
  closeRenameThemeModal();
}
function renameTheme(id, newName) { renameFolder(id, newName); }
function duplicateTheme(id) { openDuplicateFolderModal(id); }
function deleteTheme(id) { deleteFolder(id); }
function archiveTheme(id) { archiveFolder(id); }

// ──────────────────────────────────────────────
// Modale — déplacer un dossier
// ──────────────────────────────────────────────
let _moveFolderId = null;

function _buildFolderSelectOptions(sel, excludeId) {
  sel.innerHTML = '';
  const rootOpt = document.createElement('option');
  rootOpt.value = '';
  rootOpt.textContent = '— Racine —';
  sel.appendChild(rootOpt);
  function _add(folders, depth) {
    (folders || []).filter(f => !f.archived && f.id !== excludeId).forEach(f => {
      // Exclure aussi les descendants du dossier déplacé
      if (excludeId && findFolderById([f], excludeId)) return;
      const opt = document.createElement('option');
      opt.value = f.id;
      opt.textContent = '  '.repeat(depth) + f.name;
      sel.appendChild(opt);
      _add(f.folders, depth + 1);
    });
  }
  _add(state.folders, 0);
}

function openMoveFolderModal(id) {
  _moveFolderId = id;
  const sel = document.getElementById('move-folder-target-select');
  if (sel) _buildFolderSelectOptions(sel, id);

  // Sélectionner le parent actuel
  const curParent = findParentFolder(state.folders, id);
  if (sel) sel.value = curParent ? curParent.id : '';

  const choiceDiv = document.getElementById('move-folder-elements-choice');
  if (choiceDiv) choiceDiv.style.display = 'none';

  const modal = document.getElementById('modal-move-folder');
  if (modal) modal.classList.remove('hidden');
}

function closeMoveFolderModal() {
  const modal = document.getElementById('modal-move-folder');
  if (modal) modal.classList.add('hidden');
  _moveFolderId = null;
}

function confirmMoveFolder() {
  if (!_moveFolderId) return;
  const sel = document.getElementById('move-folder-target-select');
  const targetId = sel ? (sel.value || null) : null;

  moveFolder(_moveFolderId, targetId);
  closeMoveFolderModal();
}

(function() {
  const modal = document.getElementById('modal-move-folder');
  const btnClose = document.getElementById('btn-close-move-folder-modal');
  const btnConfirm = document.getElementById('btn-confirm-move-folder');
  const btnCancel = document.getElementById('btn-cancel-move-folder');
  if (btnClose) btnClose.addEventListener('click', closeMoveFolderModal);
  if (btnConfirm) btnConfirm.addEventListener('click', confirmMoveFolder);
  if (btnCancel) btnCancel.addEventListener('click', closeMoveFolderModal);
})();

// ──────────────────────────────────────────────
// Modale — importer les cases d'un autre dossier
// ──────────────────────────────────────────────
let _importElementsTargetId = null;

function openImportElementsModal(targetId) {
  _importElementsTargetId = targetId;
  const sel = document.getElementById('import-elements-source-select');
  if (sel) {
    sel.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '— Choisir un dossier —';
    sel.appendChild(placeholder);
    function _addSrc(folders, depth) {
      (folders || []).filter(f => !f.archived).forEach(f => {
        if (f.id !== targetId && (f.elements || []).length > 0) {
          const opt = document.createElement('option');
          opt.value = f.id;
          opt.textContent = '  '.repeat(depth) + f.name;
          sel.appendChild(opt);
        }
        _addSrc(f.folders, depth + 1);
      });
    }
    _addSrc(state.folders, 0);
  }
  const modal = document.getElementById('modal-import-elements');
  if (modal) modal.classList.remove('hidden');
}

function closeImportElementsModal() {
  const modal = document.getElementById('modal-import-elements');
  if (modal) modal.classList.add('hidden');
  _importElementsTargetId = null;
}

function confirmImportElements() {
  if (!_importElementsTargetId) return;
  const sel = document.getElementById('import-elements-source-select');
  const sourceRootId = sel ? sel.value : '';
  if (!sourceRootId) return;
  const added = importElements(sourceRootId, _importElementsTargetId);
  closeImportElementsModal();
  if (added === 0) {
    alert('Toutes les cases existent déjà dans ce dossier.');
  }
}

(function() {
  const modal = document.getElementById('modal-import-elements');
  const btnClose = document.getElementById('btn-close-import-elements-modal');
  const btnConfirm = document.getElementById('btn-confirm-import-elements');
  const btnCancel = document.getElementById('btn-cancel-import-elements');
  if (btnClose) btnClose.addEventListener('click', closeImportElementsModal);
  if (btnConfirm) btnConfirm.addEventListener('click', confirmImportElements);
  if (btnCancel) btnCancel.addEventListener('click', closeImportElementsModal);
})();

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

document.getElementById('btn-import-elements-panel').addEventListener('click', () => {
  const s = activeSubtheme();
  if (!s) return;
  openImportElementsModal(s.id);
});

btnSizeMinus.addEventListener('click', () => changeSize(-1));
btnSizePlus.addEventListener('click',  () => changeSize(+1));

gridHeightInput.addEventListener('input', () => {
  const v = Math.max(20, Math.min(80, parseInt(gridHeightInput.value) || 80));
  _localGridHeight = v;
  document.getElementById('grid-height-display').textContent = v + '%';
  renderGrid();
});
gridHeightInput.addEventListener('change', () => {
  const v = Math.max(20, Math.min(80, parseInt(gridHeightInput.value) || 80));
  saveLocalGridHeight(v);
});

fontScaleInput.addEventListener('input', () => {
  const pct = Math.max(50, Math.min(200, parseInt(fontScaleInput.value) || 100));
  _localFontScale = pct / 100;
  document.getElementById('font-scale-display').textContent = pct + '%';
  applyFontScale();
});
fontScaleInput.addEventListener('change', () => {
  const pct = Math.max(50, Math.min(200, parseInt(fontScaleInput.value) || 100));
  saveLocalFontScale(pct / 100);
});

chkLockGenerate.addEventListener('click', () => {
  const t = activeTheme();
  if (t) {
    t.locked = !_isLockGenerateChecked();
    saveState();
  }
  renderGrid();
});

let _isDraggingElement = false;

function openCasesPanel() {
  document.getElementById('cases-panel').classList.add('open');
}
function closeCasesPanel() {
  if (_isDraggingElement) return;
  document.getElementById('cases-panel').classList.remove('open');
}
document.getElementById('btn-cases-panel').addEventListener('click', () => {
  const panel = document.getElementById('cases-panel');
  if (panel.classList.contains('open')) closeCasesPanel();
  else openCasesPanel();
});
document.getElementById('cases-panel-close').addEventListener('click', () => {
  _isDraggingElement = false;
  document.getElementById('cases-panel').classList.remove('open');
});


// ──────────────────────────────────────────────
// Menu contextuel — Dossiers (remplace ctx-menu-theme)
// ──────────────────────────────────────────────
const ctxMenuTheme  = document.getElementById('ctx-menu-folder');
const ctxThemeRename    = document.getElementById('ctx-folder-rename');
const ctxThemeDuplicate = document.getElementById('ctx-folder-duplicate');
const ctxThemeArchive   = document.getElementById('ctx-folder-archive');
let _ctxThemeId = null; // contient maintenant un folderId

function closeCtxMenuTheme() { closeCtxMenuFolder(); }

function openCtxMenuFolder(id, e, anchorEl) {
  closeCtxMenuSubtheme(); closeCtxMenuGrid(); closeCtxMenuElement();
  _ctxThemeId = id;
  const _ceBtn = document.getElementById('ctx-folder-set-current-event');
  if (_ceBtn) {
    const isCurrentEvent = state.currentEventFolderId === id;
    _ceBtn.innerHTML = '<i data-lucide="party-popper"></i> ' + (isCurrentEvent ? 'Retirer soirée en cours' : 'Définir comme soirée en cours');
    if (window.lucide) lucide.createIcons();
  }
  if (ctxMenuTheme) { positionCtxMenu(ctxMenuTheme, e, anchorEl); ctxMenuTheme.classList.remove('hidden'); }
}

function closeCtxMenuFolder() {
  if (ctxMenuTheme) ctxMenuTheme.classList.add('hidden');
  _ctxThemeId = null;
}

if (ctxThemeRename) ctxThemeRename.addEventListener('click', () => {
  if (_ctxThemeId) openRenameFolderModal(_ctxThemeId);
  closeCtxMenuFolder();
});
if (ctxThemeDuplicate) ctxThemeDuplicate.addEventListener('click', () => {
  if (_ctxThemeId) openDuplicateFolderModal(_ctxThemeId);
  closeCtxMenuFolder();
});
if (ctxThemeArchive) ctxThemeArchive.addEventListener('click', () => {
  if (_ctxThemeId) archiveFolder(_ctxThemeId);
  closeCtxMenuFolder();
});
const _ctxFolderDeleteBtn = document.getElementById('ctx-folder-delete');
if (_ctxFolderDeleteBtn) _ctxFolderDeleteBtn.addEventListener('click', () => {
  if (_ctxThemeId) deleteFolder(_ctxThemeId);
  closeCtxMenuFolder();
});
const _ctxFolderNewChildBtn = document.getElementById('ctx-folder-new-child');
if (_ctxFolderNewChildBtn) _ctxFolderNewChildBtn.addEventListener('click', () => {
  const parentId = _ctxThemeId;
  closeCtxMenuFolder();
  if (parentId) openNewFolderModal(parentId);
});
const _ctxFolderSetCurrentEventBtn = document.getElementById('ctx-folder-set-current-event');
if (_ctxFolderSetCurrentEventBtn) _ctxFolderSetCurrentEventBtn.addEventListener('click', () => {
  const id = _ctxThemeId;
  closeCtxMenuFolder();
  if (id) confirmSetCurrentEventFolder(id);
});

const _ctxFolderCancelBtn = document.getElementById('ctx-folder-cancel');
if (_ctxFolderCancelBtn) _ctxFolderCancelBtn.addEventListener('click', () => closeCtxMenuFolder());

// ──────────────────────────────────────────────
// Menu contextuel — Grilles
// ──────────────────────────────────────────────
const ctxMenuGrid    = document.getElementById('ctx-menu-grid');
const ctxGridRename    = document.getElementById('ctx-grid-rename');
const ctxGridDuplicate = document.getElementById('ctx-grid-duplicate');
let _ctxGridId = null;

function openCtxMenuGrid(id, e, anchorEl) {
  closeCtxMenuTheme(); closeCtxMenuSubtheme(); closeCtxMenuElement();
  _ctxGridId = id;
  positionCtxMenu(ctxMenuGrid, e, anchorEl);
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
document.getElementById('ctx-grid-delete').addEventListener('click', () => {
  if (_ctxGridId) deleteGrid(_ctxGridId);
  closeCtxMenuGrid();
});
document.getElementById('ctx-grid-cancel').addEventListener('click', () => closeCtxMenuGrid());

// ── Menu contextuel cases ──
const ctxMenuElement  = document.getElementById('ctx-menu-element');
const ctxElEdit       = document.getElementById('ctx-element-edit');
const ctxElArchive    = document.getElementById('ctx-element-archive');
let _ctxElementId     = null;
let _ctxElementSpan   = null;

function openCtxMenuElement(id, span, e, anchorEl) {
  closeCtxMenuTheme(); closeCtxMenuSubtheme(); closeCtxMenuGrid();
  _ctxElementId = id;
  _ctxElementSpan = span;
  positionCtxMenu(ctxMenuElement, e, anchorEl);
  ctxMenuElement.classList.remove('hidden');
}
function closeCtxMenuElement() { ctxMenuElement.classList.add('hidden'); _ctxElementId = null; _ctxElementSpan = null; }

ctxElEdit.addEventListener('click', () => {
  if (_ctxElementId && _ctxElementSpan) startEditElement(_ctxElementId, _ctxElementSpan);
  closeCtxMenuElement();
});
ctxElArchive.addEventListener('click', () => {
  if (_ctxElementId) archiveElement(_ctxElementId);
  closeCtxMenuElement();
});
document.getElementById('ctx-element-delete-active').addEventListener('click', () => {
  if (_ctxElementId) deleteElement(_ctxElementId);
  closeCtxMenuElement();
});
document.getElementById('ctx-element-cancel').addEventListener('click', () => closeCtxMenuElement());

// ── Menu contextuel cases archivées ──
const ctxMenuElementArchived = document.getElementById('ctx-menu-element-archived');
const ctxElRestore           = document.getElementById('ctx-element-restore');
const ctxElDelete            = document.getElementById('ctx-element-delete');
let _ctxElementArchivedId    = null;

function openCtxMenuElementArchived(id, e, anchorEl) {
  closeCtxMenuTheme(); closeCtxMenuSubtheme(); closeCtxMenuGrid(); closeCtxMenuElement();
  _ctxElementArchivedId = id;
  positionCtxMenu(ctxMenuElementArchived, e, anchorEl);
  ctxMenuElementArchived.classList.remove('hidden');
}
function closeCtxMenuElementArchived() { ctxMenuElementArchived.classList.add('hidden'); _ctxElementArchivedId = null; }

ctxElRestore.addEventListener('click', () => {
  if (_ctxElementArchivedId) restoreElement(_ctxElementArchivedId);
  closeCtxMenuElementArchived();
});
ctxElDelete.addEventListener('click', () => {
  if (_ctxElementArchivedId) deleteElement(_ctxElementArchivedId);
  closeCtxMenuElementArchived();
});
document.getElementById('ctx-element-archived-cancel').addEventListener('click', () => closeCtxMenuElementArchived());

function positionCtxMenu(menu, e, anchorEl) {
  if (anchorEl) {
    // getBoundingClientRect() retourne des coords viewport → compatible position:fixed directement
    const aRect = anchorEl.getBoundingClientRect();
    menu.style.left = (aRect.right + 4) + 'px';
    menu.style.top  = aRect.top + 'px';
    requestAnimationFrame(() => {
      const rect = menu.getBoundingClientRect();
      if (rect.right  > window.innerWidth  - 8) menu.style.left = (aRect.left - rect.width - 4) + 'px';
      if (rect.bottom > window.innerHeight - 8)  menu.style.top  = (aRect.bottom - rect.height) + 'px';
    });
  } else {
    // clientX/Y = coords viewport → compatible position:fixed
    menu.style.left = e.clientX + 'px';
    menu.style.top  = e.clientY + 'px';
    requestAnimationFrame(() => {
      const rect = menu.getBoundingClientRect();
      if (rect.right  > window.innerWidth  - 8) menu.style.left = (e.clientX - rect.width) + 'px';
      if (rect.bottom > window.innerHeight - 8)  menu.style.top  = (e.clientY - rect.height) + 'px';
    });
  }
}

document.addEventListener('click', () => {
  closeCtxMenuTheme();
  closeCtxMenuGrid();
  closeCtxMenuSubtheme();
  closeCtxMenuElement();
  closeCtxMenuElementArchived();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeCtxMenuTheme(); closeCtxMenuGrid(); closeCtxMenuSubtheme(); closeCtxMenuElement(); closeCtxMenuElementArchived(); }
});
// Fermer les menus contextuels au scroll (ils sont fixed et ne suivent pas la page)
window.addEventListener('scroll', () => {
  closeCtxMenuTheme(); closeCtxMenuGrid(); closeCtxMenuSubtheme(); closeCtxMenuElement(); closeCtxMenuElementArchived();
}, { passive: true });

document.getElementById('btn-open-grids-window').addEventListener('click', () => {
  const grids = getVisibleGrids();
  if (grids.length === 0) return;
  const ids = grids.map(g => g.id).join(',');
  window.open(`index.html?openGrids=${encodeURIComponent(ids)}`, '_blank', 'width=1100,height=700');
});

btnGenerate.addEventListener('click', () => {
  if (manualMode) return;
  const t = activeTheme();
  const s = activeSubtheme();
  if (!t || t.locked || !s) return;
  const grids = getVisibleGrids();
  if (grids.length === 0) return;
  const n = activeGrid()?.gridSize || 4;
  const cellCount = n * n;
  const sArchivedIds = (s && s.archivedElementIds) ? s.archivedElementIds : [];
  const active = (s.elements || []).filter(e => !sArchivedIds.includes(e.id));

  if (active.length < cellCount) {
    gridError.innerHTML = `<i data-lucide="triangle-alert"></i> Il faut au moins ${cellCount} éléments actifs pour générer une grille ${n}×${n} (${active.length}/${cellCount}).`;
    if (window.lucide) lucide.createIcons();
    gridError.classList.remove('hidden');
    return;
  }
  gridError.classList.add('hidden');
  grids.forEach(gx => generateOneGrid(t, gx, false));
  saveState();
  renderGrid();
});

// Bouton "Générer cases vides"
const btnGenerateFillEmpty = document.getElementById('btn-generate-fill-empty');
btnGenerateFillEmpty.addEventListener('click', () => {
  if (manualMode) return;
  const t = activeTheme();
  const s = activeSubtheme();
  if (!t || t.locked || !s) return;
  const grids = getVisibleGrids();
  if (grids.length === 0) return;

  gridError.classList.add('hidden');
  grids.forEach(gx => generateOneGrid(t, gx, true));
  saveState();
  renderGrid();
});

// Fonction pour mettre à jour l'état du bouton "Générer cases vides"
function updateFillEmptyButtonState() {
  const t = activeTheme();
  const s = activeSubtheme();
  const btn = document.getElementById('btn-generate-fill-empty');
  if (!btn) return;

  if (!t || t.locked || !s) {
    btn.disabled = true;
    btn.classList.add('btn-disabled');
    return;
  }

  const grids = getVisibleGrids();
  if (grids.length === 0) {
    btn.disabled = true;
    btn.classList.add('btn-disabled');
    return;
  }

  let canFillEmpty = false;

  // Vérifier si on peut remplir au moins une grille avec la méthode "cases vides"
  const sArchivedIds = (s && s.archivedElementIds) ? s.archivedElementIds : [];
  const activeElem = (s.elements || []).filter(e => !sArchivedIds.includes(e.id));
  for (const g of grids) {
    const n = g.gridSize;
    const cellCount = n * n;
    const usedIds = new Set();
    const emptyCount = g.grid.slice(0, cellCount).filter(c => !c || !c.elementId).length;

    if (emptyCount === 0) continue;

    for (let i = 0; i < cellCount; i++) {
      if (g.grid[i] && g.grid[i].elementId) {
        const elemExists = (s.elements || []).some(el => el.id === g.grid[i].elementId && !sArchivedIds.includes(el.id));
        if (elemExists) usedIds.add(g.grid[i].elementId);
      }
    }

    const availableCount = activeElem.length - usedIds.size;
    if (availableCount >= emptyCount) {
      canFillEmpty = true;
      break;
    }
  }

  btn.disabled = !canFillEmpty;
  btn.classList.toggle('btn-disabled', !canFillEmpty);
}


document.getElementById('btn-confirm-signout').addEventListener('click', () => {
  document.getElementById('modal-confirm-signout').classList.add('hidden');
  _auth.signOut();
});
document.getElementById('btn-cancel-signout').addEventListener('click', () => {
  document.getElementById('modal-confirm-signout').classList.add('hidden');
});
document.getElementById('btn-close-confirm-signout').addEventListener('click', () => {
  document.getElementById('modal-confirm-signout').classList.add('hidden');
});

btnReset.addEventListener('click', () => {
  const t = activeTheme();
  const s = activeSubtheme();
  if (!t || t.locked || !s) return;
  document.getElementById('modal-confirm-reset').classList.remove('hidden');
});

document.getElementById('btn-confirm-reset').addEventListener('click', () => {
  document.getElementById('modal-confirm-reset').classList.add('hidden');
  const t = activeTheme();
  const s = activeSubtheme();
  if (!t || !s) return;
  (s.grids || []).filter(gx => !gx.archived).forEach(gx => {
    gx.grid = gx.grid.map(c => ({ ...c, checked: false }));
  });
  (s.elements || []).forEach(el => { el.checked = false; });
  s.persistentCheckedIds = [];
  saveState();
  renderGrid();
  renderElements();
});

document.getElementById('btn-cancel-reset').addEventListener('click', () => {
  document.getElementById('modal-confirm-reset').classList.add('hidden');
});
document.getElementById('btn-close-confirm-reset').addEventListener('click', () => {
  document.getElementById('modal-confirm-reset').classList.add('hidden');
});
// Bouton global "Vider"
const btnClearGrids = document.getElementById('btn-clear-grids');
let _clearGridsTarget = 'visible'; // 'visible' ou gridId pour per-grille

function updateClearGridsButton() {
  const btn = document.getElementById('btn-clear-grids');
  if (!btn) return;
  const t = activeTheme();
  const locked = !t || t.locked;
  btn.disabled = locked;
  btn.classList.toggle('btn-disabled', locked);
}

function updateOpenGridsWindowButton() {
  const btn = document.getElementById('btn-open-grids-window');
  if (!btn) return;
  const noGrids = getVisibleGrids().length === 0;
  btn.disabled = noGrids;
  btn.classList.toggle('btn-disabled', noGrids);
}

btnClearGrids.addEventListener('click', () => {
  const t = activeTheme();
  if (!t || t.locked) return;
  _clearGridsTarget = 'visible';
  const grids = getVisibleGrids().filter(gx => !gx.locked);
  const count = grids.length;
  document.getElementById('modal-clear-msg').textContent =
    count === 1 ? 'Vider la grille affichée ?' : `Vider les ${count} grilles affichées ?`;
  document.getElementById('modal-confirm-clear').classList.remove('hidden');
});

document.getElementById('btn-confirm-clear').addEventListener('click', () => {
  document.getElementById('modal-confirm-clear').classList.add('hidden');
  if (_clearCellCallback) {
    _clearCellCallback();
    _clearCellCallback = null;
    return;
  }
  const t = activeTheme();
  if (!t || t.locked) return;
  const sNow = activeSubtheme();
  const grids = getVisibleGrids().filter(gx => !gx.locked);
  // Conserver les IDs validés avant de vider
  if (sNow) {
    if (!sNow.persistentCheckedIds) sNow.persistentCheckedIds = [];
    grids.forEach(gx => {
      gx.grid.forEach(c => {
        if (c.checked && c.elementId && !sNow.persistentCheckedIds.includes(c.elementId)) {
          sNow.persistentCheckedIds.push(c.elementId);
        }
      });
    });
  }
  grids.forEach(gx => { gx.grid = gx.grid.map(() => ({ elementId: null, checked: false })); });
  saveState();
  renderGrid();
  renderElements();
});

document.getElementById('btn-cancel-clear').addEventListener('click', () => {
  document.getElementById('modal-confirm-clear').classList.add('hidden');
  _clearCellCallback = null;
});
document.getElementById('btn-close-confirm-clear').addEventListener('click', () => {
  document.getElementById('modal-confirm-clear').classList.add('hidden');
  _clearCellCallback = null;
});

function closeConfirmCurrentEventModal() {
  document.getElementById('modal-confirm-current-event').classList.add('hidden');
  _pendingCurrentEventFolderId = null;
}
document.getElementById('btn-confirm-current-event').addEventListener('click', () => {
  const id = _pendingCurrentEventFolderId;
  closeConfirmCurrentEventModal();
  if (id) setCurrentEventFolder(id);
});
document.getElementById('btn-cancel-current-event').addEventListener('click', closeConfirmCurrentEventModal);
document.getElementById('btn-close-confirm-current-event').addEventListener('click', closeConfirmCurrentEventModal);

btnScreenshot.addEventListener('click', bingoScreenshot);

// Modal nouvelle grille
const modalNewGrid       = document.getElementById('modal-new-grid');
const newGridNameInput   = document.getElementById('new-grid-name-input');
const btnConfirmNewGrid  = document.getElementById('btn-confirm-new-grid');
const btnCancelNewGrid   = document.getElementById('btn-cancel-new-grid');
const btnCloseNewGridModal = document.getElementById('btn-close-new-grid-modal');

function openNewGridModal() {
  const s = activeSubtheme();
  if (!s) return;
  const count = s.grids.filter(g => !g.archived).length + 1;
  newGridNameInput.value = `Grille ${count}`;
  document.querySelectorAll('.grid-name-preset-check input').forEach(cb => { cb.checked = false; });
  modalNewGrid.classList.remove('hidden');
  setTimeout(() => { newGridNameInput.focus(); newGridNameInput.select(); }, 50);
}

function closeNewGridModal() {
  modalNewGrid.classList.add('hidden');
}

function confirmNewGrid() {
  const checked = [...document.querySelectorAll('.grid-name-preset-check input:checked')].map(cb => cb.value);
  if (checked.length > 0) {
    closeNewGridModal();
    checked.forEach(name => createGrid(name));
  } else {
    const name = newGridNameInput.value.trim();
    if (!name) return;
    closeNewGridModal();
    createGrid(name);
  }
}

btnConfirmNewGrid.addEventListener('click', confirmNewGrid);
btnCancelNewGrid.addEventListener('click', closeNewGridModal);
btnCloseNewGridModal.addEventListener('click', closeNewGridModal);
newGridNameInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') confirmNewGrid();
  if (e.key === 'Escape') closeNewGridModal();
});

btnNewGrid.addEventListener('click', () => {
  if (!activeSubtheme()) return;
  openNewGridModal();
});

const _btnNewGridInline = document.getElementById('btn-new-grid-inline');
if (_btnNewGridInline) {
  _btnNewGridInline.addEventListener('click', () => {
    if (!activeSubtheme()) return;
    openNewGridModal();
  });
}

const _btnCeNavigate = document.getElementById('btn-ce-navigate');
if (_btnCeNavigate) {
  _btnCeNavigate.addEventListener('click', () => {
    if (state.currentEventTierlistId) {
      if (window._switchPage) window._switchPage('tierlist');
      // Navigation directe sans toggle
      _tlLocalActiveTierlistId = state.currentEventTierlistId;
      _tlLocalNoSelection = false;
      saveUserPrefs({ tlActiveTierlistId: state.currentEventTierlistId, tlNoSelection: false });
      if (typeof tlRender === 'function') tlRender();
    } else if (state.currentEventFolderId) {
      if (window._switchPage) window._switchPage('bingo');
      // Navigation directe sans toggle
      _localActiveFolderId = state.currentEventFolderId;
      _saveLocalActiveFolderId(state.currentEventFolderId);
      const folder = findFolderById(state.folders, state.currentEventFolderId);
      _selectedGridIds = folder?.grids?.filter(g => !g.archived).slice(0, 1).map(g => g.id) || [];
      saveLocalSelectedGrids(_selectedGridIds);
      renderAllFolders();
      renderElements();
      renderGridsList();
      renderGrid();
    }
  });
}
const _btnCeSet = document.getElementById('btn-ce-set');
if (_btnCeSet) {
  _btnCeSet.addEventListener('click', () => {
    if (_localActiveFolderId) confirmSetCurrentEventFolder(_localActiveFolderId);
  });
}

const _btnNewFolderInGrids = document.getElementById('btn-new-folder-in-grids');
if (_btnNewFolderInGrids) {
  _btnNewFolderInGrids.addEventListener('click', () => openNewFolderModal(_localActiveFolderId || null));
}

// ── Archives unifiées ──────────────────────────────────────────────────────────
const modalArchivesUnified = document.getElementById('modal-archives-unified');

function _makeTreeNode(label, depth, collapsed, onToggle) {
  const row = document.createElement('div');
  row.className = 'tree-node-row';
  row.style.paddingLeft = (depth * 20) + 'px';

  const arrow = document.createElement('span');
  arrow.className = 'tree-arrow' + (collapsed ? ' collapsed' : '');
  arrow.innerHTML = '<i data-lucide="chevron-down"></i>';
  arrow.addEventListener('click', onToggle);
  row.appendChild(arrow);

  const name = document.createElement('span');
  name.className = 'tree-node-label';
  name.textContent = label;
  name.addEventListener('click', onToggle);
  row.appendChild(name);

  return row;
}

function _makeLeafRow(label, depth, actions) {
  const row = document.createElement('div');
  row.className = 'tree-leaf-row';
  row.style.paddingLeft = (depth * 20) + 'px';

  const icon = document.createElement('span');
  icon.className = 'tree-leaf-icon';
  icon.textContent = '—';
  row.appendChild(icon);

  const name = document.createElement('span');
  name.className = 'tree-leaf-label';
  name.textContent = label;
  row.appendChild(name);

  row.appendChild(_makeArchiveButtons(actions));

  return row;
}

function _makeArchiveButtons(actions) {
  const area = document.createElement('span');
  area.className = 'tree-leaf-actions';
  actions.forEach(({ text, cls, disabled, onClick }) => {
    const btn = document.createElement('button');
    btn.className = 'archived-theme-btn ' + cls;
    btn.innerHTML = text;
    if (disabled) btn.disabled = true;
    else btn.addEventListener('click', onClick);
    area.appendChild(btn);
  });
  return area;
}

function renderArchivesUnified() {
  const container = document.getElementById('archives-tree');
  container.innerHTML = '';
  let hasAny = false;

  function _renderFolderArchive(f, depth, parentArchived, targetContainer) {
    const dest = targetContainer || container;
    const fArchived = f.archived;
    const archivedSubFolders = (f.folders || []).filter(sf => sf.archived || (sf.folders || []).some(x => x.archived) || (sf.grids || []).some(g => g.archived));
    const archivedGrids = (f.grids || []).filter(g => g.archived);
    if (!fArchived && archivedSubFolders.length === 0 && archivedGrids.length === 0) return;
    hasAny = true;

    const folderChildren = document.createElement('div');
    folderChildren.className = 'tree-children tree-hidden';
    let collapsed = true;
    const folderRow = _makeTreeNode(f.name, depth, collapsed, () => {
      collapsed = !collapsed;
      folderRow.querySelector('.tree-arrow').classList.toggle('collapsed', collapsed);
      folderChildren.classList.toggle('tree-hidden', collapsed);
    });

    if (fArchived) {
      folderRow.appendChild(_makeArchiveButtons([
        { text: '<i data-lucide="corner-down-left"></i> Restaurer', cls: 'restore', disabled: parentArchived,
          onClick: () => { archiveFolder(f.id); renderArchivesUnified(); } },
        { text: '<i data-lucide="trash-2"></i> Supprimer', cls: 'del',
          onClick: () => { deleteFolder(f.id); renderArchivesUnified(); } }
      ]));
    }
    dest.appendChild(folderRow);
    dest.appendChild(folderChildren);

    archivedGrids.forEach(g => {
      const leafRow = _makeLeafRow(g.name, depth + 1, [
        { text: '<i data-lucide="corner-down-left"></i> Restaurer', cls: 'restore', disabled: fArchived || parentArchived,
          onClick: () => { g.archived = false; saveState(); renderGridsList(); renderArchivesUnified(); } },
        { text: '<i data-lucide="trash-2"></i> Supprimer', cls: 'del',
          onClick: () => {
            const savedId = _localActiveFolderId;
            _localActiveFolderId = f.id;
            deleteGrid(g.id);
            _localActiveFolderId = savedId;
            renderArchivesUnified();
          }
        }
      ]);
      folderChildren.appendChild(leafRow);
    });

    (f.folders || []).forEach(sf => {
      const sfArchived = sf.archived || (sf.folders || []).some(x => x.archived) || (sf.grids || []).some(g => g.archived);
      if (sfArchived) _renderFolderArchive(sf, depth + 1, fArchived || parentArchived, folderChildren);
    });
  }

  (state.folders || []).forEach(f => _renderFolderArchive(f, 0, false));
  if (!hasAny) container.innerHTML = '<p class="archived-empty">Aucun élément archivé.</p>';
  if (window.lucide) lucide.createIcons();
}

function openArchivesUnified() {
  renderArchivesUnified();
  _initPanelPosition(modalArchivesUnified, 'right');
  _makePanelDraggable(modalArchivesUnified);
  modalArchivesUnified.classList.add('open');
}

function closeArchivesUnified() {
  modalArchivesUnified.classList.remove('open');
}

document.getElementById('btn-archives-unified').addEventListener('click', () => {
  if (modalArchivesUnified.classList.contains('open')) closeArchivesUnified();
  else openArchivesUnified();
});
document.getElementById('btn-close-archives-unified').addEventListener('click', closeArchivesUnified);

// ── Panneau dossiers ──
document.getElementById('btn-folders-panel').addEventListener('click', () => {
  const panel = document.getElementById('folders-panel');
  if (panel.classList.contains('open')) closeFoldersPanel();
  else openFoldersPanel();
});
document.getElementById('folders-panel-close').addEventListener('click', closeFoldersPanel);

// ── Corbeille unifiée ──────────────────────────────────────────────────────────
const modalTrashUnified = document.getElementById('modal-trash-unified');
const modalConfirmTrashEmpty = document.getElementById('modal-confirm-trash-empty');

const _TYPE_LABELS = { theme: 'Dossier', subtheme: 'Dossier', folder: 'Dossier', grid: 'Grille' };

function renderTrashList() {
  const container = document.getElementById('trash-list');
  container.innerHTML = '';
  const trash = state.trash || [];
  if (trash.length === 0) {
    container.innerHTML = '<p class="archived-empty">La corbeille est vide.</p>';
    return;
  }

  // Arborescence Thème → Sous-thème → Grille.
  // Les éléments supprimés emportent leurs enfants dans entry.data — on les affiche aussi.
  // Les enfants imbriqués sont affichés en lecture seule (pas de bouton individuel).
  const treeNodes = []; // ordre d'insertion préservé

  function _getOrCreateTNode(key, label) {
    let node = treeNodes.find(n => n.key === key);
    if (!node) { node = { key, label, themeEntry: null, subs: [] }; treeNodes.push(node); }
    else if (label && label !== '(thème supprimé)') node.label = label;
    return node;
  }
  function _getOrCreateSNode(tNode, key, label) {
    let node = tNode.subs.find(n => n.key === key);
    if (!node) { node = { key, label, subEntry: null, grids: [] }; tNode.subs.push(node); }
    else if (label && label !== '(dossier supprimé)') node.label = label;
    return node;
  }

  // IDs des grilles déjà présentes en entrée séparée dans trash (type:'grid')
  const separateGridIds = new Set(
    trash.filter(e => e.type === 'grid').map(e => e.data?.id).filter(Boolean)
  );

  trash.forEach((entry, origIdx) => {
    if (entry.type === 'folder' || entry.type === 'theme') {
      const tNode = _getOrCreateTNode('__t__' + origIdx, entry.data?.name || '?');
      tNode.themeEntry = { entry, origIdx };
      (entry.data?.folders || entry.data?.subthemes || []).forEach(sub => {
        const sNode = _getOrCreateSNode(tNode, '__s__' + sub.id, sub.name || '?');
        (sub.grids || []).forEach(g => {
          if (!separateGridIds.has(g.id)) sNode.grids.push({ name: g.name, fromParent: true });
        });
      });
      (entry.data?.grids || []).forEach(g => {
        const sNode = _getOrCreateSNode(tNode, '__direct__', '—');
        if (!separateGridIds.has(g.id)) sNode.grids.push({ name: g.name, fromParent: true });
      });
    } else if (entry.type === 'subtheme') {
      const pf = findFolderById(state.folders, entry.themeId);
      const tNode = _getOrCreateTNode(entry.themeId || '__orphan__', pf?.name || '(dossier supprimé)');
      const sNode = _getOrCreateSNode(tNode, entry.data?.id || ('sub_' + origIdx), entry.data?.name || '?');
      sNode.subEntry = { entry, origIdx };
      (entry.data?.grids || []).forEach(g => {
        if (!separateGridIds.has(g.id)) sNode.grids.push({ name: g.name, fromParent: true });
      });
    } else if (entry.type === 'grid') {
      const pf = findFolderById(state.folders, entry.folderId || entry.themeId);
      const tNode = _getOrCreateTNode(entry.folderId || entry.themeId || '__orphan__', pf?.name || '(dossier supprimé)');
      const sNode = _getOrCreateSNode(tNode, '__direct__', '—');
      const canRestore = !!pf;
      sNode.grids.push({ name: entry.data?.name || '?', fromParent: false, origIdx, canRestore });
    }
  });

  treeNodes.forEach(tNode => {
    const themeChildren = document.createElement('div');
    themeChildren.className = 'tree-children tree-hidden';
    let tCollapsed = true;
    const themeRow = _makeTreeNode(tNode.label, 0, tCollapsed, () => {
      tCollapsed = !tCollapsed;
      themeRow.querySelector('.tree-arrow').classList.toggle('collapsed', tCollapsed);
      themeChildren.classList.toggle('tree-hidden', tCollapsed);
    });
    if (tNode.themeEntry) {
      themeRow.appendChild(_makeArchiveButtons([{
        text: '<i data-lucide="corner-down-left"></i> Restaurer', cls: 'restore',
        onClick: () => { trashRestore(tNode.themeEntry.origIdx); renderTrashList(); }
      }]));
    }
    container.appendChild(themeRow);
    container.appendChild(themeChildren);

    tNode.subs.forEach(sNode => {
      const subChildren = document.createElement('div');
      subChildren.className = 'tree-children tree-hidden';
      let sCollapsed = true;
      const subRow = _makeTreeNode(sNode.label, 1, sCollapsed, () => {
        sCollapsed = !sCollapsed;
        subRow.querySelector('.tree-arrow').classList.toggle('collapsed', sCollapsed);
        subChildren.classList.toggle('tree-hidden', sCollapsed);
      });
      if (sNode.subEntry) {
        const parentExists = !!findFolderById(state.folders, sNode.subEntry.entry.themeId);
        subRow.appendChild(_makeArchiveButtons([{
          text: '<i data-lucide="corner-down-left"></i> Restaurer', cls: 'restore',
          disabled: !parentExists,
          onClick: () => { trashRestore(sNode.subEntry.origIdx); renderTrashList(); }
        }]));
      }
      themeChildren.appendChild(subRow);
      themeChildren.appendChild(subChildren);

      sNode.grids.forEach(g => {
        const actions = g.fromParent ? [] : [{
          text: '<i data-lucide="corner-down-left"></i> Restaurer', cls: 'restore',
          disabled: !g.canRestore,
          onClick: () => { trashRestore(g.origIdx); renderTrashList(); }
        }];
        subChildren.appendChild(_makeLeafRow(g.name, 2, actions));
      });
    });
  });
  if (window.lucide) lucide.createIcons();
}

function openTrashUnified() {
  renderTrashList();
  _initPanelPosition(modalTrashUnified, 'right');
  _makePanelDraggable(modalTrashUnified);
  modalTrashUnified.classList.add('open');
}

function closeTrashUnified() {
  modalTrashUnified.classList.remove('open');
}

document.getElementById('btn-trash-unified').addEventListener('click', () => {
  if (modalTrashUnified.classList.contains('open')) closeTrashUnified();
  else openTrashUnified();
});
document.getElementById('btn-close-trash-unified').addEventListener('click', closeTrashUnified);

document.getElementById('btn-trash-empty-all').addEventListener('click', () => {
  if ((state.trash || []).length === 0) return;
  modalConfirmTrashEmpty.classList.remove('hidden');
});
document.getElementById('btn-close-confirm-trash-empty').addEventListener('click', () => modalConfirmTrashEmpty.classList.add('hidden'));
document.getElementById('btn-cancel-trash-empty').addEventListener('click', () => modalConfirmTrashEmpty.classList.add('hidden'));
document.getElementById('btn-confirm-trash-empty').addEventListener('click', () => {
  trashEmpty();
  modalConfirmTrashEmpty.classList.add('hidden');
  renderTrashList();
});

// Modales renommage dossier
if (btnConfirmRenameTheme) btnConfirmRenameTheme.addEventListener('click', confirmRenameTheme);
if (btnCancelRenameTheme) btnCancelRenameTheme.addEventListener('click', closeRenameThemeModal);
if (btnCloseRenameThemeModal) btnCloseRenameThemeModal.addEventListener('click', closeRenameThemeModal);
if (renameThemeInput) renameThemeInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') confirmRenameTheme();
  if (e.key === 'Escape') closeRenameThemeModal();
});

// Modales renommage grille
btnConfirmRenameGrid.addEventListener('click', confirmRenameGrid);
btnCancelRenameGrid.addEventListener('click', closeRenameGridModal);
btnCloseRenameGridModal.addEventListener('click', closeRenameGridModal);
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

  window._switchPage = (target) => {
    if (!document.getElementById(`page-${target}`)) return;
    navBtns.forEach(b => b.classList.toggle('active', b.dataset.page === target));
    pages.forEach(p => p.classList.toggle('active', p.id === `page-${target}`));
    if (typeof renderCurrentEventButton === 'function') renderCurrentEventButton();
  };

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('disabled')) return;
      const target = btn.dataset.page;
      _switchPage(target);
      saveUserPrefs({ activePage: target });
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
let tlState = { tierlists: [], folders: [] };
let _tlRemoteUpdate = false; // anti-boucle Firebase
const _dbTierlist = firebase.database().ref('tierlist');

// Prefs tierlist — personnelles par utilisateur (non partagées)
let _tlLocalShowLabels      = null; // null = pas encore chargé
let _tlLocalImgSize         = null;
let _tlLocalActiveTierlistId = null; // null = pas encore chargé
let _tlLocalNoSelection     = false; // true = l'utilisateur a délibérément désélectionné

function tlSave() {
  if (_tlRemoteUpdate) return;
  // Ne pas sauvegarder activeTierlistId/noSelection dans les données partagées
  const { activeTierlistId, noSelection, ...shared } = tlState;
  // sanitizeForFirebase (JSON.parse/stringify) élimine les éventuels `undefined` — Firebase refuse
  // toute écriture contenant `undefined` avec une exception SYNCHRONE (non catchable par .catch()),
  // ce qui plantait tout le script en cours (ex. tlDelete) et laissait l'UI bloquée jusqu'au F5.
  _dbTierlist.set(sanitizeForFirebase(shared)).catch(e => console.warn('TL save error:', e));
}

function _tlNormalizeState(parsed) {
  if (!parsed || typeof parsed !== 'object') return { tierlists: [], folders: [], trash: [] };
  if (!Array.isArray(parsed.tierlists)) parsed.tierlists = [];
  if (!Array.isArray(parsed.folders)) parsed.folders = [];
  if (!Array.isArray(parsed.trash)) parsed.trash = [];
  // Supprimer les anciens champs partagés s'ils existent encore en base
  delete parsed.activeTierlistId;
  delete parsed.noSelection;
  // Firebase supprime les tableaux vides — restaurer items/unplaced
  parsed.tierlists.forEach(tl => {
    if (!Array.isArray(tl.images)) tl.images = [];
    if (!Array.isArray(tl.unplaced)) tl.unplaced = [];
    if (!Array.isArray(tl.tiers)) tl.tiers = [];
    tl.tiers.forEach(tier => { if (!Array.isArray(tier.items)) tier.items = []; });
  });
  // Migration : avant l'introduction du groupe partagé, une tierlist générée depuis un template
  // recevait sa propre copie d'images (ids différents de ceux du template). Le template est
  // désormais l'unique source lue (_tlGetGroupImages) — on fusionne donc ici, une seule fois,
  // les images encore locales à une tierlist générée dans les images de son template, en
  // conservant leurs ids d'origine (référencés par tiers[].items/unplaced).
  let _tlMigrated = false;
  parsed.tierlists.forEach(tl => {
    if (tl.isTemplate || !tl.templateId || tl.images.length === 0) return;
    const template = parsed.tierlists.find(t => t.id === tl.templateId && t.isTemplate);
    if (!template) return;
    const existingIds = new Set(template.images.map(i => i.id));
    tl.images.forEach(img => { if (!existingIds.has(img.id)) { template.images.push(img); existingIds.add(img.id); } });
    tl.images = [];
    _tlMigrated = true;
  });
  parsed._tlMigrated = _tlMigrated;
  return parsed;
}

// ── Stack Undo ─────────────────────────────────────────────────────────────────
const _TL_UNDO_MAX = 5;
let _tlUndoStack = []; // chaque entrée = snapshot JSON de tlState

// Cache global id→src : alimenté à chaque import/paste, jamais vidé.
// Permet de restaurer les src même si l'image a été supprimée de tlState.
const _tlSrcCache = {};

function _tlCacheSrcs(tl) {
  (tl.images || []).forEach(img => { if (img.src) _tlSrcCache[img.id] = img.src; });
}

function _tlStateWithoutSrc(state) {
  return JSON.stringify({
    ...state,
    tierlists: state.tierlists.map(tl => ({
      ...tl,
      images: (tl.images || []).map(img => {
        const { src, ...rest } = img;
        return rest;
      })
    }))
  });
}

function _tlRestoreWithSrc(snapshot) {
  snapshot.tierlists.forEach(tl => {
    tl.images = (tl.images || []).map(img => ({ ...img, src: _tlSrcCache[img.id] || '' }));
  });
  return snapshot;
}

function tlPushUndo() {
  _tlUndoStack.push(_tlStateWithoutSrc(tlState));
  if (_tlUndoStack.length > _TL_UNDO_MAX) _tlUndoStack.shift();
  tlUpdateUndoBtn();
}

function tlUndo() {
  if (_tlUndoStack.length === 0) return;
  const snapshot = _tlUndoStack.pop();
  try {
    tlState = _tlRestoreWithSrc(JSON.parse(snapshot));
  } catch (e) { return; }
  tlSave();
  tlRender();
  tlUpdateUndoBtn();
}

function tlUpdateUndoBtn() {
  const btn = document.getElementById('tl-btn-undo');
  if (btn) btn.disabled = _tlUndoStack.length === 0;
  const tl = tlActiveTierlist();
  const hasPlaced = tl ? tl.tiers.some(tier => tier.items.length > 0) : false;
  if (tlBtnReset) { tlBtnReset.disabled = !hasPlaced; tlBtnReset.style.opacity = hasPlaced ? '' : '0.4'; tlBtnReset.style.cursor = hasPlaced ? '' : 'not-allowed'; }
}

function tlActiveTierlist() {
  return tlState.tierlists.find(tl => tl.id === _tlLocalActiveTierlistId) || null;
}

function tlDefaultTierlist(name, isTemplate = false) {
  return {
    id: uid(),
    name,
    archived: false,
    showLabels: true,
    imgSize: 80,
    unplacedSort: 'manual',
    isTemplate,
    tiers: TL_DEFAULT_TIERS.map(t => ({ id: uid(), label: t.label, color: t.color, items: [] })),
    unplaced: [],
    images: [],
  };
}

// Copie triée de tl.unplaced pour l'affichage — ne mute jamais tl.unplaced (le drag&drop manuel s'appuie dessus)
// Modes : 'manual' (ordre réel de tl.unplaced) | 'alpha' (nom) | 'date' (ordre d'ajout = ordre réel, comme 'manual')
function _tlGetSortedUnplaced(tl) {
  const ids = tl.unplaced.slice();
  const mode = tl.unplacedSort || 'manual';
  if (mode === 'alpha') {
    return ids.sort((a, b) => {
      const ia = tlFindImage(tl, a), ib = tlFindImage(tl, b);
      return (ia ? ia.name : '').localeCompare(ib ? ib.name : '', 'fr', { sensitivity: 'base' });
    });
  }
  // 'manual' et 'date' : ordre réel de tl.unplaced (pas de timestamp stocké, l'ordre d'ajout se confond avec l'ordre actuel)
  return ids;
}

// ── Dossiers ──────────────────────────────────────────────────────────────────
// Structure : folders = [{ id, name, archived, open, parentId }]
// tierlists[].folderId = id du dossier parent (ou null)
// folders[].parentId   = id du dossier parent (ou null = racine)

function tlDefaultFolder(name, parentId) {
  return { id: uid(), name, archived: false, open: true, parentId: parentId || null };
}

// Retourne tous les ids descendants d'un dossier (récursif)
function _tlGetDescendantIds(id) {
  const children = (tlState.folders || []).filter(f => f.parentId === id);
  const ids = children.map(f => f.id);
  children.forEach(f => { ids.push(..._tlGetDescendantIds(f.id)); });
  return ids;
}

function tlCreateFolder(name, parentId) {
  tlPushUndo();
  if (!tlState.folders) tlState.folders = [];
  const folder = tlDefaultFolder(name, parentId || null);
  tlState.folders.push(folder);
  tlSave();
  tlRender();
}

function tlRenameFolder(id, newName) {
  tlPushUndo();
  const folder = (tlState.folders || []).find(f => f.id === id);
  if (folder && newName.trim()) folder.name = newName.trim();
  tlSave();
  tlRender();
}

function tlMoveFolderToParent(id, newParentId) {
  tlPushUndo();
  const folder = (tlState.folders || []).find(f => f.id === id);
  if (!folder) return;
  // Interdire de mettre un dossier dans lui-même ou dans un de ses descendants
  if (newParentId && (newParentId === id || _tlGetDescendantIds(id).includes(newParentId))) return;
  folder.parentId = newParentId || null;
  tlSave();
  tlRender();
}

function tlArchiveFolder(id) {
  tlPushUndo();
  const folder = (tlState.folders || []).find(f => f.id === id);
  if (!folder) return;
  // Archiver en cascade les sous-dossiers
  const allIds = [id, ..._tlGetDescendantIds(id)];
  allIds.forEach(fid => {
    const f = (tlState.folders || []).find(x => x.id === fid);
    if (f) f.archived = true;
  });
  tlSave();
  tlRender();
}

function tlUnarchiveFolder(id) {
  tlPushUndo();
  const folder = (tlState.folders || []).find(f => f.id === id);
  if (!folder) return;
  folder.archived = false;
  // Restaurer aussi les sous-dossiers directs archivés en même temps
  _tlGetDescendantIds(id).forEach(fid => {
    const f = (tlState.folders || []).find(x => x.id === fid);
    if (f) f.archived = false;
  });
  tlSave();
  tlRender();
  tlRenderArchivedModal();
}

// ── Corbeille ─────────────────────────────────────────────────────────────────
function tlTrashPush(entry) {
  if (!tlState.trash) tlState.trash = [];
  tlState.trash.push({ ...entry, deletedAt: Date.now() });
}

function tlTrashRestore(idx) {
  if (!tlState.trash) return;
  const entry = tlState.trash[idx];
  if (!entry) return;
  tlState.trash.splice(idx, 1);
  if (entry.type === 'folder') {
    if (!tlState.folders) tlState.folders = [];
    tlState.folders.push(entry.data);
    (entry.data._tierlists || []).forEach(tl => { delete tl._tierlists; tlState.tierlists.push(tl); });
    delete entry.data._tierlists;
  } else if (entry.type === 'tierlist') {
    tlState.tierlists.push(entry.data);
  }
  tlSave();
  tlRender();
  tlRenderTrashList();
}

function tlTrashEmpty() {
  tlState.trash = [];
  tlSave();
}

function tlDeleteFolder(id) {
  tlPushUndo();
  const allIds = [id, ..._tlGetDescendantIds(id)];
  const folder = (tlState.folders || []).find(f => f.id === id);
  if (folder) {
    // Le dossier emporte avec lui les tierlists/templates directement rangés dedans (avec leurs tierlists
    // générées en cascade si c'est un template), pour permettre une restauration cohérente depuis la corbeille.
    const directTierlists = tlState.tierlists.filter(tl => tl.folderId === id);
    const cascaded = [];
    directTierlists.forEach(tl => {
      cascaded.push(tl);
      if (tl.isTemplate) cascaded.push(...tlState.tierlists.filter(t => t.templateId === tl.id));
    });
    const cascadedIds = new Set(cascaded.map(t => t.id));
    tlState.tierlists = tlState.tierlists.filter(t => !cascadedIds.has(t.id));
    tlTrashPush({ type: 'folder', data: { ...folder, _tierlists: cascaded } });
    if (cascadedIds.has(_tlLocalActiveTierlistId)) {
      const remaining = tlState.tierlists.filter(t => !t.archived);
      _tlLocalActiveTierlistId = remaining.length > 0 ? remaining[0].id : null;
      _tlLocalNoSelection = false;
      saveUserPrefs({ tlActiveTierlistId: _tlLocalActiveTierlistId, tlNoSelection: false });
    }
    if (cascadedIds.has(state.currentEventTierlistId)) {
      state.currentEventTierlistId = null;
      saveState();
    }
  }
  // Détacher les tierlists des sous-dossiers supprimés (non capturés dans l'entrée de corbeille du dossier racine)
  (tlState.tierlists || []).forEach(tl => { if (allIds.includes(tl.folderId)) tl.folderId = null; });
  tlState.folders = (tlState.folders || []).filter(f => !allIds.includes(f.id));
  tlSave();
  tlRender();
  tlRenderArchivedModal();
  tlRenderTrashList();
}

function tlMoveTierlistToFolder(tlId, folderId) {
  tlPushUndo();
  const tl = tlState.tierlists.find(t => t.id === tlId);
  if (!tl) return;
  tl.folderId = folderId || null;
  // Force l'ouverture du dossier cible pour que l'élément déplacé (notamment un groupe template) reste visible
  if (folderId) sessionStorage.setItem('tl_folder_open_' + folderId, '1');
  if (tl.isTemplate) sessionStorage.setItem('tl_tplgroup_open_' + tl.id, '1');
  tlSave();
  tlRender();
}

// ── DOM refs ──────────────────────────────────────────────────────────────────
const tlBtnNewTemplate    = document.getElementById('tl-btn-new-template');
const tlModalNewFolderSelect = document.getElementById('tl-modal-new-folder-select');
const tlList              = document.getElementById('tl-list');
const tlEmptyState        = document.getElementById('tl-empty-state');
const tlEditor            = document.getElementById('tl-editor');
const tlTitlePrefix       = document.getElementById('tl-title-prefix');
const tlTitleDisplay      = document.getElementById('tl-title-display');
const tlTitleInput        = document.getElementById('tl-title-input');
const tlShowLabelsToggle  = document.getElementById('tl-show-labels-toggle');
const tlImgSizeSlider     = document.getElementById('tl-img-size-slider');
const tlBtnAddTier        = document.getElementById('tl-btn-add-tier');
const tlBtnReset          = document.getElementById('tl-btn-reset');
const tlFileInput         = document.getElementById('tl-file-input');
const tlBtnExport         = document.getElementById('tl-btn-export');
const tlBtnCapture        = document.getElementById('tl-btn-capture');
const tlTiersZone         = document.getElementById('tl-tiers-zone');
const tlUnplacedZone      = document.getElementById('tl-unplaced-zone');
const tlUnplacedCount     = document.getElementById('tl-unplaced-count');
const tlUnplacedSortBtn   = document.getElementById('tl-unplaced-sort-btn');
const tlMaxImagesInput    = document.getElementById('tl-max-images-input');

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

const tlModalTrash          = document.getElementById('tl-modal-trash');
const tlModalTrashClose      = document.getElementById('tl-modal-trash-close');
const tlTrashList            = document.getElementById('tl-trash-list');
const tlModalConfirmTrashEmpty = document.getElementById('tl-modal-confirm-trash-empty');

const tlModalImgName      = document.getElementById('tl-modal-imgname');
const tlModalImgNameInput = document.getElementById('tl-modal-imgname-input');
const tlModalImgNameConfirm = document.getElementById('tl-modal-imgname-confirm');
const tlModalImgNameCancel  = document.getElementById('tl-modal-imgname-cancel');
const tlModalImgNameClose   = document.getElementById('tl-modal-imgname-close');

// (tl-modal-manage remplacé par menus contextuels dynamiques)

// ── Drag state ────────────────────────────────────────────────────────────────
let tlDragImgId = null;

// ── Sélection image (pour suppression au clavier) ──────────────────────────────
let _tlSelectedImgId = null;

// ── Drag & drop sidebar (tierlists & dossiers) ────────────────────────────────
let _tlSidebarDragId   = null; // id de la tierlist ou du dossier draggé
let _tlSidebarDragType = null; // 'tierlist' | 'folder'

function _tlSidebarDragStart(e, id, type) {
  _tlSidebarDragId   = id;
  _tlSidebarDragType = type;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', id);
  setTimeout(() => {
    const el = e.currentTarget;
    el.classList.add('tl-dragging');
  }, 0);
}

function _tlSidebarDragEnd(e) {
  _tlSidebarDragId   = null;
  _tlSidebarDragType = null;
  e.currentTarget.classList.remove('tl-dragging');
  // Nettoyer tous les indicateurs
  document.querySelectorAll('.tl-drag-over-top,.tl-drag-over-bottom,.tl-drag-over-folder')
    .forEach(el => el.classList.remove('tl-drag-over-top','tl-drag-over-bottom','tl-drag-over-folder'));
}

function _tlSidebarDragOverItem(e, el, id, type) {
  if (!_tlSidebarDragId) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  // Nettoyer les autres indicateurs
  document.querySelectorAll('.tl-drag-over-top,.tl-drag-over-bottom,.tl-drag-over-folder')
    .forEach(x => x.classList.remove('tl-drag-over-top','tl-drag-over-bottom','tl-drag-over-folder'));
  if (_tlSidebarDragType === 'tierlist' && type === 'folder-header') {
    // Déposer une tierlist sur un dossier = la ranger
    el.classList.add('tl-drag-over-folder');
    e.dataTransfer.dropEffect = 'move';
    return;
  }
  const rect = el.getBoundingClientRect();
  const mid  = rect.top + rect.height / 2;
  if (e.clientY < mid) el.classList.add('tl-drag-over-top');
  else el.classList.add('tl-drag-over-bottom');
}

function _tlSidebarDragLeaveItem(e, el) {
  el.classList.remove('tl-drag-over-top','tl-drag-over-bottom','tl-drag-over-folder');
}

function _tlSidebarDropOnItem(e, targetId, targetType, targetEl) {
  e.preventDefault();
  if (!_tlSidebarDragId || _tlSidebarDragId === targetId) {
    document.querySelectorAll('.tl-drag-over-top,.tl-drag-over-bottom,.tl-drag-over-folder')
      .forEach(x => x.classList.remove('tl-drag-over-top','tl-drag-over-bottom','tl-drag-over-folder'));
    return;
  }

  const isTop = targetEl.classList.contains('tl-drag-over-top');
  document.querySelectorAll('.tl-drag-over-top,.tl-drag-over-bottom,.tl-drag-over-folder')
    .forEach(x => x.classList.remove('tl-drag-over-top','tl-drag-over-bottom','tl-drag-over-folder'));

  if (_tlSidebarDragType === 'tierlist' && targetType === 'folder-header') {
    // Ranger la tierlist dans ce dossier
    tlPushUndo();
    tlMoveTierlistToFolder(_tlSidebarDragId, targetId);
    return;
  }

  // Réordonner : construire un tableau plat de références [{ type, id }]
  tlPushUndo();
  if (!tlState.folders) tlState.folders = [];

  if (_tlSidebarDragType === 'tierlist') {
    // Réordonner les tierlists dans leur contexte (même dossier)
    const dragTl = tlState.tierlists.find(t => t.id === _tlSidebarDragId);
    if (!dragTl) return;

    if (targetType === 'tierlist') {
      const targetTl = tlState.tierlists.find(t => t.id === targetId);
      if (!targetTl) return;
      // Même contexte ?
      if (dragTl.folderId === targetTl.folderId) {
        const arr = tlState.tierlists;
        const fromIdx = arr.findIndex(t => t.id === _tlSidebarDragId);
        const toIdx   = arr.findIndex(t => t.id === targetId);
        if (fromIdx === -1 || toIdx === -1) return;
        const [moved] = arr.splice(fromIdx, 1);
        const newIdx  = arr.findIndex(t => t.id === targetId);
        arr.splice(isTop ? newIdx : newIdx + 1, 0, moved);
      } else {
        // Déplacer vers le contexte de la cible
        dragTl.folderId = targetTl.folderId;
        const arr = tlState.tierlists;
        const fromIdx = arr.findIndex(t => t.id === _tlSidebarDragId);
        const [moved] = arr.splice(fromIdx, 1);
        const newIdx  = arr.findIndex(t => t.id === targetId);
        arr.splice(isTop ? newIdx : newIdx + 1, 0, moved);
      }
    } else if (targetType === 'folder') {
      // Déposer avant/après un dossier = sortir du dossier et mettre à cet endroit
      dragTl.folderId = null;
      const arr = tlState.tierlists;
      const fromIdx = arr.findIndex(t => t.id === _tlSidebarDragId);
      const [moved] = arr.splice(fromIdx, 1);
      tlState.tierlists.splice(isTop ? 0 : tlState.tierlists.length, 0, moved);
    }
  } else if (_tlSidebarDragType === 'folder') {
    if (targetType === 'folder') {
      // Interdire de déplacer dans un descendant
      if (_tlGetDescendantIds(_tlSidebarDragId).includes(targetId)) return;
      const arr = tlState.folders;
      const dragFolder = arr.find(f => f.id === _tlSidebarDragId);
      const targetFolder = arr.find(f => f.id === targetId);
      if (!dragFolder || !targetFolder) return;
      // Adopter le même parentId que la cible (même niveau)
      dragFolder.parentId = targetFolder.parentId || null;
      const fromIdx = arr.findIndex(f => f.id === _tlSidebarDragId);
      const [moved] = arr.splice(fromIdx, 1);
      const newIdx  = arr.findIndex(f => f.id === targetId);
      arr.splice(isTop ? newIdx : newIdx + 1, 0, moved);
    }
  }

  tlSave();
  tlRender();
}

// ── Rendu principal ───────────────────────────────────────────────────────────
function tlRender() {
  tlUpdateUndoBtn();
  tlRenderList();
  renderCurrentEventButton();
  _updateTlCeSetBtn();
  const tl = tlActiveTierlist();
  if (!tl || tl.archived) {
    tlEmptyState.classList.remove('hidden');
    tlEditor.classList.add('hidden');
    if (window.lucide) lucide.createIcons();
    return;
  }
  tlEmptyState.classList.add('hidden');
  tlEditor.classList.remove('hidden');

  tlTitleDisplay.textContent = tl.name;
  tlTitleInput.value = tl.name;
  if (tl.templateId) {
    const template = tlState.tierlists.find(t => t.id === tl.templateId && t.isTemplate);
    tlTitlePrefix.textContent = template ? template.name + ' › ' : '';
    tlTitlePrefix.classList.toggle('hidden', !template);
  } else {
    tlTitlePrefix.classList.add('hidden');
  }
  const tlBtnNewFromTemplate = document.getElementById('tl-btn-new-from-template');
  if (tlBtnNewFromTemplate) tlBtnNewFromTemplate.classList.toggle('hidden', !tl.isTemplate);
  // Prefs d'affichage : version locale si disponible, sinon valeur de la tierlist
  const showLabels = _tlLocalShowLabels !== null ? _tlLocalShowLabels : !!tl.showLabels;
  const imgSize    = _tlLocalImgSize    !== null ? _tlLocalImgSize    : (tl.imgSize || 80);
  tlShowLabelsToggle.checked = showLabels;
  tlImgSizeSlider.value      = imgSize;

  tlRenderTiers(tl);
  tlRenderUnplaced(tl);
  if (window.lucide) lucide.createIcons();
}

function tlBuildTierlistItem(tl) {
  const item = document.createElement('div');
  item.className = 'tl-list-item' + (tl.id === _tlLocalActiveTierlistId ? ' active' : '');
  item.dataset.id = tl.id;
  item.draggable = false;

  const dragHandle = document.createElement('span');
  dragHandle.className = 'tl-folder-drag-handle';
  dragHandle.innerHTML = '<i data-lucide="grip"></i>';
  dragHandle.title = 'Glisser pour déplacer';
  dragHandle.addEventListener('mousedown', () => { item.draggable = true; });
  dragHandle.addEventListener('mouseleave', () => { if (!item.classList.contains('tl-dragging')) item.draggable = false; });
  item.appendChild(dragHandle);

  const icon = document.createElement('span');
  icon.className = 'tl-list-item-icon';
  icon.innerHTML = tl.isTemplate ? '<i data-lucide="scroll"></i>' : '<i data-lucide="scroll-text"></i>';
  icon.style.cssText = 'flex-shrink:0;opacity:0.8;';
  const _icn = icon.querySelector('[data-lucide]');
  if (_icn) _icn.style.marginRight = '0';
  item.appendChild(icon);

  const nameSpan = document.createElement('span');
  nameSpan.className = 'tl-list-item-name';
  nameSpan.textContent = tl.name;
  nameSpan.title = tl.name + '\nClic gauche : sélectionner / désélectionner\nClic droit : renommer, dupliquer, archiver\nGlisser : réordonner';
  item.appendChild(nameSpan);

  const ctxBtn = document.createElement('button');
  ctxBtn.className = 'tl-list-item-btn';
  ctxBtn.innerHTML = '<i data-lucide="ellipsis-vertical"></i>';
  ctxBtn.title = 'Options';
  ctxBtn.addEventListener('click', e => {
    e.stopPropagation();
    tlOpenManageModal(tl.id, item);
  });
  item.appendChild(ctxBtn);

  item.addEventListener('click', () => tlSwitch(tl.id));
  item.addEventListener('contextmenu', e => { e.preventDefault(); e.stopPropagation(); tlOpenManageModal(tl.id, item); });

  // Drag & drop sidebar
  item.addEventListener('dragstart', e => _tlSidebarDragStart(e, tl.id, 'tierlist'));
  item.addEventListener('dragend', _tlSidebarDragEnd);
  item.addEventListener('dragover', e => _tlSidebarDragOverItem(e, item, tl.id, 'tierlist'));
  item.addEventListener('dragleave', e => _tlSidebarDragLeaveItem(e, item));
  item.addEventListener('drop', e => _tlSidebarDropOnItem(e, tl.id, 'tierlist', item));

  return item;
}

// Une tierlist générée n'est "rattachée" à son template que si celui-ci existe encore et n'est pas archivé
function _tlHasLiveTemplate(tl) {
  if (!tl.templateId) return false;
  return tlState.tierlists.some(t => t.id === tl.templateId && t.isTemplate && !t.archived);
}

// Le template est la source de vérité partagée (images, capacité max) de tout son groupe de tierlists générées.
// Contrairement à _tlHasLiveTemplate, on ne filtre pas !archived ici : un template archivé reste la source
// d'images de ses tierlists filles (sinon elles perdraient leurs images à l'archivage du template).
// Les tierlists créées avant l'introduction du système de groupe (sans templateId, ou pointant vers un
// template supprimé) retombent sur leurs propres champs locaux — comportement inchangé pour elles.
function _tlGroupRoot(tl) {
  if (!tl) return null;
  if (tl.isTemplate) return tl;
  if (tl.templateId) {
    const t = tlState.tierlists.find(x => x.id === tl.templateId && x.isTemplate);
    if (t) return t;
  }
  return tl;
}

function _tlGetGroupImages(tl) {
  return _tlGroupRoot(tl).images || [];
}

function _tlGetGroupMaxImages(tl) {
  return _tlGroupRoot(tl).maxImagesOverride || TL_MAX_IMAGES;
}

// Le template lui-même + toutes les tierlists générées à partir de lui
function _tlGetGroupMembers(tl) {
  const root = _tlGroupRoot(tl);
  return tlState.tierlists.filter(t => t.id === root.id || t.templateId === root.id);
}

// Texte "(Template › Dossier)" à afficher à côté d'une tierlist archivée/supprimée, pour donner
// son contexte d'origine (elle n'apparaît plus dans son emplacement habituel du panneau Dossiers).
// tl peut être un objet vivant de tlState.tierlists OU un objet figé venant de la corbeille (data).
// includeFolder=false quand le dossier est déjà visuellement représenté par l'imbrication de l'affichage.
function _tlContextLabel(tl, includeFolder = true) {
  const parts = [];
  if (tl.templateId) {
    const template = tlState.tierlists.find(t => t.id === tl.templateId && t.isTemplate);
    parts.push(template ? template.name : '(template supprimé)');
  }
  if (includeFolder && tl.folderId) {
    const folder = (tlState.folders || []).find(f => f.id === tl.folderId);
    parts.push(folder ? folder.name : '(dossier supprimé)');
  }
  return parts.length > 0 ? ' (' + parts.join(' › ') + ')' : '';
}

// Rendu d'un template comme "dossier virtuel" repliable, contenant ses tierlists générées
function _tlBuildTemplateGroupEl(template, depth) {
  const collapseKey = 'tl_tplgroup_open_' + template.id;
  const groupOpen = sessionStorage.getItem(collapseKey) === '1';
  const isActive = template.id === _tlLocalActiveTierlistId
    || tlState.tierlists.some(t => t.id === _tlLocalActiveTierlistId && t.templateId === template.id);

  const groupEl = document.createElement('div');
  groupEl.className = 'tl-folder' + (groupOpen ? ' open' : '') + (isActive ? ' active-folder' : '');
  groupEl.dataset.templateId = template.id;
  if (depth > 0) groupEl.style.marginLeft = (depth * 10) + 'px';

  const header = document.createElement('div');
  header.className = 'tl-folder-header';

  const arrow = document.createElement('span');
  arrow.className = 'tl-folder-arrow';
  arrow.innerHTML = '<i data-lucide="chevron-right"></i>';
  arrow.style.cursor = 'pointer';
  arrow.addEventListener('click', e => {
    e.stopPropagation();
    const isOpen = sessionStorage.getItem(collapseKey) === '1';
    sessionStorage.setItem(collapseKey, isOpen ? '0' : '1');
    groupEl.classList.toggle('open', !isOpen);
  });

  const icon = document.createElement('span');
  icon.className = 'tl-folder-icon';
  icon.innerHTML = '<i data-lucide="scroll"></i>';

  const name = document.createElement('span');
  name.className = 'tl-folder-name';
  name.textContent = template.name;
  name.title = template.name + '\nClic gauche : ouvrir le template\nClic droit : renommer, générer, archiver';

  const ctxBtn = document.createElement('button');
  ctxBtn.className = 'tl-folder-ctx-btn';
  ctxBtn.innerHTML = '<i data-lucide="ellipsis-vertical"></i>';
  ctxBtn.title = 'Options';
  ctxBtn.addEventListener('click', e => {
    e.stopPropagation();
    tlOpenManageModal(template.id, header);
  });

  const dragHandle = document.createElement('span');
  dragHandle.className = 'tl-folder-drag-handle';
  dragHandle.innerHTML = '<i data-lucide="grip"></i>';
  dragHandle.title = 'Glisser pour déplacer';

  header.appendChild(dragHandle);
  header.appendChild(arrow);
  header.appendChild(icon);
  header.appendChild(name);
  header.appendChild(ctxBtn);

  header.addEventListener('click', () => tlSwitch(template.id));
  header.addEventListener('contextmenu', e => {
    e.preventDefault();
    e.stopPropagation();
    tlOpenManageModal(template.id, header);
  });

  // Drag & drop — un template est une entrée tlState.tierlists (isTemplate:true),
  // donc _tlSidebarDropOnItem le traite déjà comme type 'tierlist' sans code additionnel
  groupEl.draggable = false;
  dragHandle.addEventListener('mousedown', () => { groupEl.draggable = true; });
  dragHandle.addEventListener('mouseleave', () => { if (!groupEl.classList.contains('tl-dragging')) groupEl.draggable = false; });
  groupEl.addEventListener('dragstart', e => {
    if (e.target !== groupEl && e.target.closest('.tl-folder-children')) return;
    _tlSidebarDragStart(e, template.id, 'tierlist');
  });
  groupEl.addEventListener('dragend', _tlSidebarDragEnd);
  groupEl.addEventListener('dragover', e => _tlSidebarDragOverItem(e, groupEl, template.id, 'tierlist'));
  groupEl.addEventListener('dragleave', e => _tlSidebarDragLeaveItem(e, groupEl));
  groupEl.addEventListener('drop', e => _tlSidebarDropOnItem(e, template.id, 'tierlist', groupEl));

  groupEl.appendChild(header);

  const children = document.createElement('div');
  children.className = 'tl-folder-children';
  const generated = tlState.tierlists.filter(t => !t.archived && t.templateId === template.id);
  if (generated.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'color:var(--text-faint);font-style:italic;font-size:0.75rem;padding:3px 4px;';
    empty.textContent = 'Aucune tier list générée';
    children.appendChild(empty);
  } else {
    generated.forEach(t => children.appendChild(tlBuildTierlistItem(t)));
  }
  groupEl.appendChild(children);

  return groupEl;
}

function _tlBuildFolderEl(folder, depth) {
  const activeTl = tlState.tierlists.find(t => t.id === _tlLocalActiveTierlistId && !t.archived);
  // Actif si la TL active est dans ce dossier ou dans un descendant
  const allDescIds = [folder.id, ..._tlGetDescendantIds(folder.id)];
  const folderIsActive = activeTl && allDescIds.includes(activeTl.folderId);
  const tlCollapseKey = 'tl_folder_open_' + folder.id;
  const folderOpen = sessionStorage.getItem(tlCollapseKey) === '1';

  const folderEl = document.createElement('div');
  folderEl.className = 'tl-folder' + (folderOpen ? ' open' : '') + (folderIsActive ? ' active-folder' : '');
  folderEl.dataset.folderId = folder.id;
  if (depth > 0) folderEl.style.marginLeft = (depth * 10) + 'px';

  const header = document.createElement('div');
  header.className = 'tl-folder-header';

  const arrow = document.createElement('span');
  arrow.className = 'tl-folder-arrow';
  arrow.innerHTML = '<i data-lucide="chevron-right"></i>';
  arrow.style.cursor = 'pointer';
  arrow.addEventListener('click', e => {
    e.stopPropagation();
    const key = 'tl_folder_open_' + folder.id;
    const isOpen = sessionStorage.getItem(key) === '1';
    sessionStorage.setItem(key, isOpen ? '0' : '1');
    folderEl.classList.toggle('open', !isOpen);
  });

  const icon = document.createElement('span');
  icon.className = 'tl-folder-icon';
  icon.innerHTML = '<i data-lucide="folder-closed"></i>';

  const name = document.createElement('span');
  name.className = 'tl-folder-name';
  name.textContent = folder.name;
  name.title = folder.name + '\nClic droit : renommer, déplacer, archiver\nGlisser : réordonner';

  const ctxBtn = document.createElement('button');
  ctxBtn.className = 'tl-folder-ctx-btn';
  ctxBtn.innerHTML = '<i data-lucide="ellipsis-vertical"></i>';
  ctxBtn.title = 'Options';
  ctxBtn.addEventListener('click', e => {
    e.stopPropagation();
    tlOpenFolderManageModal(folder.id, header);
  });

  const dragHandle = document.createElement('span');
  dragHandle.className = 'tl-folder-drag-handle';
  dragHandle.innerHTML = '<i data-lucide="grip"></i>';
  dragHandle.title = 'Glisser pour déplacer';

  header.appendChild(dragHandle);
  header.appendChild(arrow);
  header.appendChild(icon);
  header.appendChild(name);
  header.appendChild(ctxBtn);

  header.addEventListener('contextmenu', e => {
    e.preventDefault();
    e.stopPropagation();
    tlOpenFolderManageModal(folder.id, header);
  });

  // Drag & drop — activé seulement via la poignée grip
  folderEl.draggable = false;
  dragHandle.addEventListener('mousedown', () => { folderEl.draggable = true; });
  dragHandle.addEventListener('mouseleave', () => { if (!folderEl.classList.contains('tl-dragging')) folderEl.draggable = false; });
  folderEl.addEventListener('dragstart', e => {
    if (e.target !== folderEl && e.target.closest('.tl-folder-children')) return;
    _tlSidebarDragStart(e, folder.id, 'folder');
  });
  folderEl.addEventListener('dragend', _tlSidebarDragEnd);
  folderEl.addEventListener('dragover', e => {
    if (_tlSidebarDragType === 'tierlist') {
      _tlSidebarDragOverItem(e, header, folder.id, 'folder-header');
    } else if (_tlSidebarDragType === 'folder' && _tlSidebarDragId !== folder.id) {
      // Moitié haute/basse = réordonner, zone centrale = mettre dedans
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      document.querySelectorAll('.tl-drag-over-top,.tl-drag-over-bottom,.tl-drag-over-folder')
        .forEach(x => x.classList.remove('tl-drag-over-top','tl-drag-over-bottom','tl-drag-over-folder'));
      const rect = folderEl.getBoundingClientRect();
      const y = e.clientY - rect.top;
      if (y < rect.height * 0.25) folderEl.classList.add('tl-drag-over-top');
      else if (y > rect.height * 0.75) folderEl.classList.add('tl-drag-over-bottom');
      else header.classList.add('tl-drag-over-folder');
    }
  });
  folderEl.addEventListener('dragleave', e => {
    if (!folderEl.contains(e.relatedTarget)) {
      _tlSidebarDragLeaveItem(e, header);
      _tlSidebarDragLeaveItem(e, folderEl);
    }
  });
  folderEl.addEventListener('drop', e => {
    if (_tlSidebarDragType === 'tierlist') {
      _tlSidebarDropOnItem(e, folder.id, 'folder-header', header);
    } else if (_tlSidebarDragType === 'folder') {
      if (header.classList.contains('tl-drag-over-folder')) {
        // Déposer dans le dossier
        e.preventDefault();
        document.querySelectorAll('.tl-drag-over-top,.tl-drag-over-bottom,.tl-drag-over-folder')
          .forEach(x => x.classList.remove('tl-drag-over-top','tl-drag-over-bottom','tl-drag-over-folder'));
        tlMoveFolderToParent(_tlSidebarDragId, folder.id);
      } else {
        _tlSidebarDropOnItem(e, folder.id, 'folder', folderEl);
      }
    }
  });

  folderEl.appendChild(header);

  const children = document.createElement('div');
  children.className = 'tl-folder-children';

  // Sous-dossiers
  const subFolders = (tlState.folders || []).filter(f => !f.archived && f.parentId === folder.id);
  subFolders.forEach(sf => children.appendChild(_tlBuildFolderEl(sf, depth + 1)));

  // Tierlists/templates du dossier — les tierlists rattachées à un template vivant
  // n'apparaissent jamais à plat, seulement sous leur groupe de template (voir tlRenderList)
  const folderTierlists = tlState.tierlists.filter(tl => !tl.archived && tl.folderId === folder.id && !_tlHasLiveTemplate(tl));
  if (subFolders.length === 0 && folderTierlists.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'color:var(--text-faint);font-style:italic;font-size:0.75rem;padding:3px 4px;';
    empty.textContent = 'Vide';
    children.appendChild(empty);
  } else {
    folderTierlists.forEach(tl => children.appendChild(
      tl.isTemplate ? _tlBuildTemplateGroupEl(tl, depth + 1) : tlBuildTierlistItem(tl)
    ));
  }

  folderEl.appendChild(children);
  return folderEl;
}

function tlRenderList() {
  tlList.innerHTML = '';
  if (!tlState.folders) tlState.folders = [];
  const rootFolders = tlState.folders.filter(f => !f.archived && !f.parentId);
  // Tierlists/templates sans dossier — les tierlists rattachées à un template vivant
  // n'apparaissent jamais à plat, seulement sous leur groupe de template
  const activeToplevel = tlState.tierlists.filter(tl => !tl.archived && !tl.folderId && !_tlHasLiveTemplate(tl));
  const hasContent = rootFolders.length > 0 || activeToplevel.length > 0;

  if (!hasContent) {
    const msg = document.createElement('div');
    msg.className = 'tl-list-empty';
    msg.style.cssText = 'color:var(--text-faint);font-style:italic;font-size:0.82rem;padding:8px 4px;';
    msg.textContent = 'Aucune tier list';
    tlList.appendChild(msg);
    return;
  }

  // Dossiers racine d'abord (récursif)
  rootFolders.forEach(folder => tlList.appendChild(_tlBuildFolderEl(folder, 0)));

  // Templates (groupes repliables) puis tierlists isolées, sans dossier ni template
  const toplevelTemplates = activeToplevel.filter(tl => tl.isTemplate);
  const toplevelPlain = activeToplevel.filter(tl => !tl.isTemplate);
  toplevelTemplates.forEach(tpl => tlList.appendChild(_tlBuildTemplateGroupEl(tpl, 0)));
  toplevelPlain.forEach(tl => tlList.appendChild(tlBuildTierlistItem(tl)));
}

// ── Drag & drop réordonnement des tiers ───────────────────────────────────────
let _tlTierDragId = null;

function tlRenderTiers(tl) {
  tlTiersZone.innerHTML = '';
  const imgSize = _tlLocalImgSize !== null ? _tlLocalImgSize : (tl.imgSize || 80);

  tl.tiers.forEach((tier, tierIdx) => {
    const row = document.createElement('div');
    row.className = 'tl-tier-row';
    row.dataset.tierId = tier.id;

    // Cellule label — draggable pour réordonner
    const labelCell = document.createElement('div');
    labelCell.className = 'tl-tier-label-cell';
    labelCell.style.background = tier.color;
    labelCell.draggable = true;
    labelCell.title = 'Clic droit pour les options · Glisser pour réordonner';

    const labelText = document.createElement('span');
    labelText.className = 'tl-tier-label-text';
    labelText.textContent = tier.label;
    labelText.title = 'Clic pour renommer · Clic droit pour les options · Glisser pour réordonner';
    labelText.addEventListener('click', e => {
      e.stopPropagation();
      _tlInlineRenameTier(labelText, tl, tier);
    });
    labelText.addEventListener('mousedown', e => e.stopPropagation()); // empêche drag depuis le texte
    labelCell.appendChild(labelText);

    // Drag & drop réordonnement tiers
    labelCell.addEventListener('dragstart', e => {
      _tlTierDragId = tier.id;
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(() => labelCell.classList.add('tl-tier-label-dragging'), 0);
    });
    labelCell.addEventListener('dragend', () => {
      _tlTierDragId = null;
      labelCell.classList.remove('tl-tier-label-dragging');
      document.querySelectorAll('.tl-tier-row').forEach(r => r.classList.remove('tl-tier-drop-above', 'tl-tier-drop-below'));
    });
    row.addEventListener('dragover', e => {
      if (!_tlTierDragId || _tlTierDragId === tier.id) return;
      e.preventDefault();
      const rect = row.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      row.classList.toggle('tl-tier-drop-above', e.clientY < mid);
      row.classList.toggle('tl-tier-drop-below', e.clientY >= mid);
    });
    row.addEventListener('dragleave', e => {
      if (!row.contains(e.relatedTarget)) {
        row.classList.remove('tl-tier-drop-above', 'tl-tier-drop-below');
      }
    });
    row.addEventListener('drop', e => {
      if (!_tlTierDragId || _tlTierDragId === tier.id) return;
      e.preventDefault();
      row.classList.remove('tl-tier-drop-above', 'tl-tier-drop-below');
      const rect = row.getBoundingClientRect();
      const before = e.clientY < rect.top + rect.height / 2;
      const fromIdx = tl.tiers.findIndex(t => t.id === _tlTierDragId);
      let toIdx = tierIdx;
      if (fromIdx === -1) return;
      tlPushUndo();
      const [moved] = tl.tiers.splice(fromIdx, 1);
      let insertIdx = tl.tiers.findIndex(t => t.id === tier.id);
      if (!before) insertIdx += 1;
      tl.tiers.splice(insertIdx, 0, moved);
      tlSave();
      tlRender();
    });

    // Clic droit → menu contextuel tier
    labelCell.addEventListener('contextmenu', e => {
      e.preventDefault();
      e.stopPropagation();
      _tlShowTierCtxMenu(e, tl, tier, tierIdx, labelText);
    });

    row.appendChild(labelCell);

    // Zone images
    const imgsDiv = document.createElement('div');
    imgsDiv.className = 'tl-tier-images';
    imgsDiv.dataset.dropzone = tier.id;
    imgsDiv.addEventListener('dragover', e => {
      if (_tlTierDragId) return; // ignore si on réordonne les tiers
      tlDragOver(e);
    });
    imgsDiv.addEventListener('drop', e => {
      if (_tlTierDragId) return;
      tlDrop(e, tier.id);
    });
    imgsDiv.addEventListener('dragleave', e => {
      if (_tlTierDragId) return;
      tlDragLeave(e);
    });

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

// ── Renommage inline tier ─────────────────────────────────────────────────────
function _tlInlineRenameTier(spanEl, tl, tier) {
  const input = document.createElement('input');
  input.type = 'text';
  input.value = tier.label;
  input.className = 'tl-tier-label-input';
  spanEl.replaceWith(input);
  input.focus();
  input.select();

  const commit = () => {
    const newLabel = input.value.trim();
    if (newLabel && newLabel !== tier.label) {
      tlPushUndo();
      tier.label = newLabel;
      tlSave();
    }
    tlRender();
  };
  input.addEventListener('blur', commit);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    if (e.key === 'Escape') { input.removeEventListener('blur', commit); tlRender(); }
  });
}

// ── Helper : fabrique un ctx-menu TL (même style que Bingo) ──────────────────
// Retourne { menu, addItem, addSep, close }
// close() supprime le menu + retire les listeners document
let _tlActiveCtxMenu = null; // un seul menu TL ouvert à la fois

function _tlMakeCtxMenu(anchorEl, e) {
  // Fermer tout menu TL déjà ouvert
  if (_tlActiveCtxMenu) { _tlActiveCtxMenu.remove(); _tlActiveCtxMenu = null; }

  const menu = document.createElement('div');
  menu.className = 'ctx-menu';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'ctx-close-btn';
  closeBtn.title = 'Fermer';
  closeBtn.innerHTML = '<i data-lucide="x"></i>';
  menu.appendChild(closeBtn);
  if (window.lucide) lucide.createIcons();

  const close = () => {
    menu.remove();
    if (_tlActiveCtxMenu === menu) _tlActiveCtxMenu = null;
    document.removeEventListener('click', onDocClick);
    document.removeEventListener('contextmenu', onDocCtx);
  };

  closeBtn.addEventListener('click', e => { e.stopPropagation(); close(); });

  // iconName: nom d'icône Lucide (ou '' pour aucune icône), text: libellé affiché
  const addItem = (iconName, text, danger, fn) => {
    const btn = document.createElement('button');
    btn.className = 'ctx-menu-item' + (danger ? ' ctx-danger' : '');
    if (iconName) {
      const i = document.createElement('i');
      i.setAttribute('data-lucide', iconName);
      btn.appendChild(i);
    }
    btn.appendChild(document.createTextNode(text));
    btn.addEventListener('click', () => { close(); fn(); });
    menu.appendChild(btn);
    if (window.lucide) lucide.createIcons();
    return btn;
  };

  const addSep = () => {
    const d = document.createElement('div');
    d.style.cssText = 'height:1px;background:var(--border);margin:4px 0;';
    menu.appendChild(d);
  };

  document.body.appendChild(menu);
  _tlActiveCtxMenu = menu;

  if (anchorEl) positionCtxMenu(menu, null, anchorEl);
  else positionCtxMenu(menu, e, null);

  const onDocClick = () => close();
  const onDocCtx   = () => close();
  setTimeout(() => {
    document.addEventListener('click', onDocClick, { once: true });
    document.addEventListener('contextmenu', onDocCtx, { once: true });
  }, 0);

  return { menu, addItem, addSep, close };
}

// ── Menu contextuel tier ──────────────────────────────────────────────────────
function _tlShowTierCtxMenu(e, tl, tier, tierIdx, labelSpan) {
  const { addItem, addSep } = _tlMakeCtxMenu(null, e);

  addItem('pencil', 'Renommer', false, () => {
    if (labelSpan && document.body.contains(labelSpan)) _tlInlineRenameTier(labelSpan, tl, tier);
    else tlOpenTierModal({ mode: 'edit', tl, tier });
  });
  addItem('palette', 'Modifier la couleur', false, () => tlOpenTierModal({ mode: 'color', tl, tier }));
  addSep();
  addItem('chevron-up', 'Ajouter un tier au-dessus', false, () => {
    tlPushUndo();
    tl.tiers.splice(tierIdx, 0, { id: uid(), label: '?', color: '#888888', items: [] });
    tlSave(); tlRender();
    tlEditTier(tlActiveTierlist(), tlActiveTierlist().tiers[tierIdx]);
  });
  addItem('chevron-down', 'Ajouter un tier en-dessous', false, () => {
    tlPushUndo();
    tl.tiers.splice(tierIdx + 1, 0, { id: uid(), label: '?', color: '#888888', items: [] });
    tlSave(); tlRender();
    tlEditTier(tlActiveTierlist(), tlActiveTierlist().tiers[tierIdx + 1]);
  });
  addSep();
  addItem('x', 'Supprimer ce tier', true, () => tlDeleteTier(tl, tier.id));
}

function tlRenderUnplaced(tl) {
  tlUnplacedZone.innerHTML = '';
  const imgSize = _tlLocalImgSize !== null ? _tlLocalImgSize : (tl.imgSize || 80);

  // Bouton "+" import — gros bouton vert avec menu contextuel (fichiers / presse-papier)
  const btnImport = document.createElement('button');
  btnImport.className = 'tl-import-btn tl-import-btn--plus';
  btnImport.title = 'Ajouter des images\nClic : importer des fichiers ou coller depuis le presse-papier';
  btnImport.style.width = imgSize + 'px';
  btnImport.style.height = imgSize + 'px';
  btnImport.innerHTML = '<span class="tl-import-icon"><i data-lucide="image"></i></span><span class="tl-import-label">Image</span>';
  btnImport.addEventListener('click', () => _tlShowImportMenu(btnImport));
  tlUnplacedZone.appendChild(btnImport);

  // Barre de saisie texte inline — ajout rapide d'une carte texte (Entrée pour valider)
  const textInputWrap = document.createElement('span');
  textInputWrap.className = 'tl-add-text-wrap';
  textInputWrap.style.height = imgSize + 'px';
  textInputWrap.innerHTML = '<i data-lucide="a-large-small"></i>';

  const textInput = document.createElement('input');
  textInput.type = 'text';
  textInput.className = 'tl-add-text-input';
  textInput.placeholder = 'Texte...';
  textInput.title = 'Taper un texte puis Entrée pour ajouter une carte';
  textInput.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      const text = textInput.value.trim();
      if (!text) return;
      _tlAddTextCard(tl, text);
    }
  });
  textInputWrap.appendChild(textInput);
  tlUnplacedZone.appendChild(textInputWrap);

  if (tl.unplaced.length === 0) {
    const hint = document.createElement('div');
    hint.className = 'tl-unplaced-hint';
    hint.textContent = 'Dépose des images ici ou importe-en';
    tlUnplacedZone.appendChild(hint);
  } else {
    _tlGetSortedUnplaced(tl).forEach(imgId => {
      const img = tlFindImage(tl, imgId);
      if (img) tlUnplacedZone.appendChild(tlBuildImgCard(tl, img, imgSize));
    });
  }
  tlUnplacedCount.textContent = tl.unplaced.length + ' / ' + _tlGetGroupImages(tl).length;
  const _sortIcons = { manual: 'hand', alpha: 'arrow-down-a-z', date: 'arrow-down-0-1' };
  const _sortLabels = { manual: 'Manuel', alpha: 'Alphabétique', date: "Date d'ajout" };
  const _sortMode = tl.unplacedSort || 'manual';
  tlUnplacedSortBtn.innerHTML = `<i data-lucide="${_sortIcons[_sortMode] || 'hand'}"></i> Tri : ${_sortLabels[_sortMode] || 'Manuel'}`;
  if (window.lucide) lucide.createIcons();
  tlMaxImagesInput.textContent = _tlGetGroupMaxImages(tl);
}

function _tlShowImportMenu(anchorEl) {
  const { addItem } = _tlMakeCtxMenu(anchorEl, null);
  addItem('import', 'Importer des fichiers', false, () => tlFileInput.click());
  addItem('square-mouse-pointer', 'Coller depuis le presse-papier', false, () => _tlPasteFromClipboard(tlActiveTierlist()));
}

function _tlPasteFromClipboard(tl) {
  if (!tl) return;
  navigator.clipboard.read().then(items => {
    const imageItems = items.filter(item => item.types.some(t => t.startsWith('image/')));
    if (imageItems.length === 0) { alert('Aucune image dans le presse-papier.'); return; }
    const root = _tlGroupRoot(tl);
    if (!root.images) root.images = [];
    const maxImages = tlEffectiveMaxImages(tl);
    if (root.images.length >= maxImages) {
      alert(`Limite atteinte — maximum ${maxImages} éléments par groupe.`); return;
    }
    const now = new Date();
    const promises = imageItems.map(item => {
      const type = item.types.find(t => t.startsWith('image/'));
      return item.getType(type).then(blob => {
        const name = `capture_${now.getHours()}h${String(now.getMinutes()).padStart(2,'0')}`;
        return _tlCompressToBase64(blob).then(src => {
          if (root.images.length >= maxImages) return;
          if (root.images.some(i => i.src === src)) return;
          const img = { id: uid(), src, name };
          _tlSrcCache[img.id] = src;
          root.images.push(img);
          _tlGetGroupMembers(tl).forEach(member => {
            if (!member.unplaced.includes(img.id)) member.unplaced.push(img.id);
          });
        });
      });
    });
    Promise.all(promises).then(() => { tlSave(); tlRender(); }).catch(e => {
      console.warn('TL clipboard paste error:', e);
      alert('Impossible de lire le presse-papier. Essaie Ctrl+V à la place.');
    });
  }).catch(() => alert('Impossible de lire le presse-papier. Essaie Ctrl+V à la place.'));
}

function tlBuildImgCard(tl, img, size) {
  const card = document.createElement('div');
  card.className = 'tl-img-card';
  if (img.id === _tlSelectedImgId) card.classList.add('selected');
  card.draggable = true;
  card.dataset.imgId = img.id;
  card.title = img.name + '\nClic gauche : sélectionner (Suppr pour supprimer) · Glisser pour déplacer · Clic droit : renommer / supprimer';

  card.addEventListener('click', e => {
    e.stopPropagation();
    _tlSelectedImgId = (_tlSelectedImgId === img.id) ? null : img.id;
    tlRender();
  });

  card.addEventListener('dragstart', e => {
    tlDragImgId = img.id;
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => card.classList.add('dragging'), 0);
  });
  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
    tlDragImgId = null;
  });

  const isText = (img.type || 'image') === 'text';
  if (isText) {
    card.classList.add('tl-img-card--text');
    const textEl = document.createElement('div');
    textEl.className = 'tl-text-card-content';
    textEl.style.width = size + 'px';
    textEl.style.height = size + 'px';
    textEl.style.background = img.color || '#3a3a42';
    textEl.textContent = img.name;
    card.appendChild(textEl);
  } else {
    const imgEl = document.createElement('img');
    imgEl.src = img.src;
    imgEl.style.width = size + 'px';
    imgEl.style.height = size + 'px';
    imgEl.draggable = false;
    card.appendChild(imgEl);
  }

  const _showLbls = _tlLocalShowLabels !== null ? _tlLocalShowLabels : !!tl.showLabels;
  if (_showLbls && !isText) {
    const label = document.createElement('div');
    label.className = 'tl-img-label';
    label.style.width = size + 'px';
    label.textContent = img.name;
    label.title = 'Clic gauche : renommer · Clic droit : options';
    label.addEventListener('click', e => {
      e.stopPropagation();
      _tlInlineRenameImg(label, tl, img, size);
    });
    card.appendChild(label);
  }

  card.addEventListener('contextmenu', e => {
    e.preventDefault();
    e.stopPropagation();
    _tlShowImgCtxMenu(e, tl, img);
  });

  return card;
}

// ── Renommage inline image ────────────────────────────────────────────────────
function _tlInlineRenameImg(labelEl, tl, img, size) {
  const input = document.createElement('input');
  input.type = 'text';
  input.value = img.name;
  input.className = 'tl-img-label-input';
  input.style.width = size + 'px';
  labelEl.replaceWith(input);
  input.focus();
  input.select();

  const commit = () => {
    const newName = input.value.trim();
    if (newName && newName !== img.name) {
      tlPushUndo();
      img.name = newName;
      tlSave();
    }
    tlRender();
  };
  input.addEventListener('blur', commit);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    if (e.key === 'Escape') { input.removeEventListener('blur', commit); tlRender(); }
  });
}

// ── Menu contextuel image ─────────────────────────────────────────────────────
function _tlShowImgCtxMenu(e, tl, img) {
  const { addItem } = _tlMakeCtxMenu(null, e);
  addItem('pencil', 'Renommer', false, () => tlOpenRenameImg(tl, img));
  addItem('x', 'Supprimer', true, () => tlDeleteImage(tl, img.id));
}

// ── Recherche d'image ─────────────────────────────────────────────────────────
function tlFindImage(tl, imgId) {
  return _tlGetGroupImages(tl).find(i => i.id === imgId) || null;
}

// ── Actions sur les tierlists ─────────────────────────────────────────────────
function tlCreate(name, folderId, isTemplate = false) {
  tlPushUndo();
  const tl = tlDefaultTierlist(name, isTemplate);
  if (folderId) tl.folderId = folderId;
  tlState.tierlists.push(tl);
  _tlLocalActiveTierlistId = tl.id;
  _tlLocalNoSelection = false;
  saveUserPrefs({ tlActiveTierlistId: tl.id, tlNoSelection: false });
  tlSave();
  tlRender();
}

function tlSwitch(id) {
  if (_tlLocalActiveTierlistId === id) {
    _tlLocalActiveTierlistId = null;
    _tlLocalNoSelection = true;
    saveUserPrefs({ tlActiveTierlistId: null, tlNoSelection: true });
  } else {
    _tlLocalActiveTierlistId = id;
    _tlLocalNoSelection = false;
    saveUserPrefs({ tlActiveTierlistId: id, tlNoSelection: false });
  }
  tlSave();
  tlRender();
}

function tlDelete(id) {
  tlPushUndo();
  const tl = tlState.tierlists.find(t => t.id === id);
  if (!tl) return;
  // Suppression d'un template : cascade sur toutes ses tierlists générées, chacune sa propre entrée de corbeille
  const cascaded = tl.isTemplate ? tlState.tierlists.filter(t => t.templateId === id) : [];
  tlTrashPush({ type: 'tierlist', data: tl, folderId: tl.folderId || null });
  cascaded.forEach(t => tlTrashPush({ type: 'tierlist', data: t, folderId: t.folderId || null }));
  const removedIds = new Set([id, ...cascaded.map(t => t.id)]);
  tlState.tierlists = tlState.tierlists.filter(t => !removedIds.has(t.id));
  if (removedIds.has(_tlLocalActiveTierlistId)) {
    const remaining = tlState.tierlists.filter(t => !t.archived);
    _tlLocalActiveTierlistId = remaining.length > 0 ? remaining[0].id : null;
    _tlLocalNoSelection = false;
    saveUserPrefs({ tlActiveTierlistId: _tlLocalActiveTierlistId, tlNoSelection: false });
  }
  if (removedIds.has(state.currentEventTierlistId)) {
    state.currentEventTierlistId = null;
    saveState();
  }
  tlSave();
  tlRender();
  tlRenderTrashList();
}

function tlArchive(id) {
  tlPushUndo();
  const tl = tlState.tierlists.find(t => t.id === id);
  if (!tl) return;
  tl.archived = true;
  if (_tlLocalActiveTierlistId === id) {
    const remaining = tlState.tierlists.filter(t => !t.archived);
    _tlLocalActiveTierlistId = remaining.length > 0 ? remaining[0].id : null;
    _tlLocalNoSelection = false;
    saveUserPrefs({ tlActiveTierlistId: _tlLocalActiveTierlistId, tlNoSelection: false });
  }
  tlSave();
  tlRender();
}

// Convertit une tierlist normale en template : un template n'a jamais d'image classée dans un tier,
// donc toute image déjà placée est renvoyée en zone non placée.
function tlConvertToTemplate(id) {
  const tl = tlState.tierlists.find(t => t.id === id);
  if (!tl) return;
  const placedCount = tl.tiers.reduce((n, t) => n + t.items.length, 0);
  if (placedCount > 0) {
    const ok = confirm(`Convertir "${tl.name}" en template va renvoyer ses ${placedCount} image(s) classée(s) en zone non placée (un template n'a jamais d'image dans un tier). Continuer ?`);
    if (!ok) return;
  }
  tlPushUndo();
  tl.tiers.forEach(t => {
    t.items.forEach(imgId => { if (!tl.unplaced.includes(imgId)) tl.unplaced.push(imgId); });
    t.items = [];
  });
  tl.isTemplate = true;
  tlSave();
  tlRender();
}

function tlReset() {
  const tl = tlActiveTierlist();
  if (!tl) return;
  const hasPlaced = tl.tiers.some(tier => tier.items.length > 0);
  if (!hasPlaced) return;
  document.getElementById('tl-modal-confirm-reset').classList.remove('hidden');
}

function _tlDoReset() {
  const tl = tlActiveTierlist();
  if (!tl) return;
  tlPushUndo();
  tl.tiers.forEach(tier => {
    tier.items.forEach(imgId => { if (!tl.unplaced.includes(imgId)) tl.unplaced.push(imgId); });
    tier.items = [];
  });
  tlSave();
  tlRender();
}

function tlCopy(id) {
  tlPushUndo();
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
  _tlLocalActiveTierlistId = copy.id;
  _tlLocalNoSelection = false;
  saveUserPrefs({ tlActiveTierlistId: copy.id, tlNoSelection: false });
  tlSave();
  tlRender();
}

function tlRename(id, newName) {
  tlPushUndo();
  const tl = tlState.tierlists.find(t => t.id === id);
  if (tl && newName.trim()) tl.name = newName.trim();
  tlSave();
  tlRender();
}

// ── Actions sur les tiers ─────────────────────────────────────────────────────
function tlAddTier(label, color) {
  tlPushUndo();
  const tl = tlActiveTierlist();
  if (!tl) return;
  tl.tiers.push({ id: uid(), label, color, items: [] });
  tlSave();
  tlRender();
}

function tlDeleteTier(tl, tierId) {
  const tier = tl.tiers.find(t => t.id === tierId);
  if (tier && tier.items.length > 0) {
    const confirmed = confirm(`Ce tier contient ${tier.items.length} image(s). Les supprimer quand même ? (Elles seront renvoyées dans "Images non placées")`);
    if (!confirmed) return;
  }
  tlPushUndo();
  if (tier) {
    tier.items.forEach(imgId => {
      if (!tl.unplaced.includes(imgId)) tl.unplaced.push(imgId);
    });
  }
  tl.tiers = tl.tiers.filter(t => t.id !== tierId);
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

function _tlCompressToBase64(file, maxPx = 400, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = image;
      if (width > maxPx || height > maxPx) {
        if (width >= height) { height = Math.round(height * maxPx / width); width = maxPx; }
        else { width = Math.round(width * maxPx / height); height = maxPx; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    image.onerror = reject;
    image.src = url;
  });
}

const TL_MAX_IMAGES = 50;
const TL_MAX_IMAGES_CAP = 500;
const TL_MAX_IMAGES_CHOICES = [50, 100, 200, 500];

// Retourne la limite effective du groupe (template + ses tierlists générées)
function tlEffectiveMaxImages(tl) {
  return _tlGetGroupMaxImages(tl);
}

function tlSetMaxImages(tl, value) {
  let n = parseInt(value, 10);
  if (isNaN(n) || n < 1) n = TL_MAX_IMAGES;
  n = Math.min(n, TL_MAX_IMAGES_CAP);
  _tlGroupRoot(tl).maxImagesOverride = n;
  tlSave();
  return n;
}

function tlImportImages(files) {
  const tl = tlActiveTierlist();
  if (!tl) return;
  const root = _tlGroupRoot(tl);
  if (!root.images) root.images = [];

  const maxImages = tlEffectiveMaxImages(tl);
  const remaining = maxImages - root.images.length;
  if (remaining <= 0) {
    alert(`Limite atteinte — maximum ${maxImages} éléments par groupe.`);
    return;
  }

  const fileArray = Array.from(files).slice(0, remaining);
  const ignoredByLimit = files.length - fileArray.length;
  let ignoredByDuplicate = 0;

  const processFile = (file) => {
    const name = file.name.replace(/\.[^.]+$/, '');
    return _tlCompressToBase64(file).then(src => {
      if (root.images.some(i => i.src === src)) { ignoredByDuplicate++; return; }
      const img = { id: uid(), src, name };
      _tlSrcCache[img.id] = src;
      root.images.push(img);
      _tlGetGroupMembers(tl).forEach(member => {
        if (!member.unplaced.includes(img.id)) member.unplaced.push(img.id);
      });
    });
  };

  Promise.all(fileArray.map(processFile)).then(() => {
    tlSave();
    tlRender();
    const msgs = [];
    if (ignoredByLimit > 0) msgs.push(`${ignoredByLimit} élément${ignoredByLimit > 1 ? 's ignorés' : ' ignoré'} — limite de ${maxImages} éléments atteinte.`);
    if (ignoredByDuplicate > 0) msgs.push(`${ignoredByDuplicate} élément${ignoredByDuplicate > 1 ? 's déjà présents ignorés' : ' déjà présent ignoré'} (doublon).`);
    if (msgs.length) alert(msgs.join('\n'));
  }).catch(e => console.warn('TL import error:', e));
}

function tlDeleteImage(tl, imgId) {
  tlPushUndo();
  const root = _tlGroupRoot(tl);
  _tlGetGroupMembers(tl).forEach(member => {
    member.unplaced = member.unplaced.filter(id => id !== imgId);
    member.tiers.forEach(t => { t.items = t.items.filter(id => id !== imgId); });
  });
  if (root.images) root.images = root.images.filter(i => i.id !== imgId);
  tlSave();
  tlRender();
}

// ── Drag & drop ───────────────────────────────────────────────────────────────
function tlClearDropBefore() {
  document.querySelectorAll('.tl-img-card.drop-before').forEach(c => c.classList.remove('drop-before'));
}

function tlDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.classList.add('drag-over');
  // Indicateur de position
  tlClearDropBefore();
  const zone = e.currentTarget;
  const cards = Array.from(zone.querySelectorAll('.tl-img-card'));
  const idx = tlDropInsertIndex(zone, e.clientX, e.clientY);
  if (idx < cards.length) cards[idx].classList.add('drop-before');
}

function tlDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
  tlClearDropBefore();
}

// Calcule l'index d'insertion dans une zone flex-wrap à partir de la position du curseur
function tlDropInsertIndex(zone, clientX, clientY) {
  const cards = Array.from(zone.querySelectorAll('.tl-img-card'));
  if (cards.length === 0) return 0;
  for (let i = 0; i < cards.length; i++) {
    const rect = cards[i].getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    const midY = rect.top + rect.height / 2;
    // Si le curseur est au-dessus du milieu vertical de la carte, ou sur la même ligne à gauche
    if (clientY < midY - rect.height * 0.1) return i;
    if (Math.abs(clientY - midY) <= rect.height * 0.6 && clientX < midX) return i;
  }
  return cards.length;
}

function tlDrop(e, targetZoneId) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  tlClearDropBefore();
  const imgId = tlDragImgId;
  if (!imgId) return;
  const tl = tlActiveTierlist();
  if (!tl) return;
  if (tl.isTemplate && targetZoneId !== '__unplaced__') return;
  tlPushUndo();

  // Retirer de partout
  tl.unplaced = tl.unplaced.filter(id => id !== imgId);
  tl.tiers.forEach(t => { t.items = t.items.filter(id => id !== imgId); });

  if (targetZoneId === '__unplaced__') {
    // Tout réordonnancement manuel repasse le tri en mode "manuel"
    if ((tl.unplacedSort || 'manual') !== 'manual') tl.unplacedSort = 'manual';
    // Insertion à la position du curseur dans la zone unplaced
    const insertIdx = tlDropInsertIndex(tlUnplacedZone, e.clientX, e.clientY);
    tl.unplaced.splice(insertIdx, 0, imgId);
  } else {
    const tier = tl.tiers.find(t => t.id === targetZoneId);
    if (tier) {
      // Insertion à la position du curseur dans la zone du tier
      const imgsDiv = e.currentTarget;
      const insertIdx = tlDropInsertIndex(imgsDiv, e.clientX, e.clientY);
      tier.items.splice(insertIdx, 0, imgId);
    }
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
  if (newName) {
    tlPushUndo();
    img.name = newName;
  }
  tlModalImgName.classList.add('hidden');
  tlRenameImgContext = null;
  tlSave();
  tlRender();
}

// ── Canvas partagé Export/Capture ────────────────────────────────────────────
async function _tlBuildCanvas(tl) {
  const imgSize = tl.imgSize || 80;
  const labelW = 140;
  const padding = 6;
  const rowGap = 4;
  const imgGap = 4;
  const labelFontSize = Math.round(imgSize * 0.35);
  const totalWidth = 860;

  const tierHeights = tl.tiers.map(tier => {
    if (tier.items.length === 0) return imgSize + padding * 2;
    const rows = Math.ceil(tier.items.length * (imgSize + imgGap) / (totalWidth - labelW));
    return Math.max(imgSize + padding * 2, rows * (imgSize + imgGap) + padding * 2);
  });

  const canvas = document.createElement('canvas');
  canvas.width = totalWidth;
  canvas.height = tierHeights.reduce((a, b) => a + b + rowGap, 0) + 40;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#18181c';
  ctx.fillRect(0, 0, totalWidth, canvas.height);
  ctx.fillStyle = '#e8e8f0';
  ctx.font = 'bold 18px Arial';
  ctx.fillText(tl.name, 12, 26);

  const loadImage = (src) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

  let y = 36;
  for (let i = 0; i < tl.tiers.length; i++) {
    const tier = tl.tiers[i];
    const tierH = tierHeights[i];
    ctx.fillStyle = tier.color;
    ctx.fillRect(0, y, labelW, tierH);
    ctx.fillStyle = '#111';
    ctx.font = `bold ${labelFontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tier.label, labelW / 2, y + tierH / 2);
    ctx.fillStyle = '#22222a';
    ctx.fillRect(labelW, y, totalWidth - labelW, tierH);
    let x = labelW + padding;
    let rowY = y + padding;
    for (const imgId of tier.items) {
      const imgData = _tlGetGroupImages(tl).find(i => i.id === imgId) || null;
      if (!imgData) continue;
      if (x + imgSize > totalWidth - padding) { x = labelW + padding; rowY += imgSize + imgGap; }
      if ((imgData.type || 'image') === 'text') {
        ctx.fillStyle = imgData.color || '#3a3a42';
        ctx.fillRect(x, rowY, imgSize, imgSize);
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.round(imgSize * 0.16)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(imgData.name.slice(0, 20), x + imgSize / 2, rowY + imgSize / 2, imgSize - 8);
      } else {
        const imgEl = await loadImage(imgData.src);
        if (imgEl) ctx.drawImage(imgEl, x, rowY, imgSize, imgSize);
      }
      if (tl.showLabels && (imgData.type || 'image') !== 'text') {
        ctx.fillStyle = 'rgba(0,0,0,0.72)';
        ctx.fillRect(x, rowY + imgSize - 16, imgSize, 16);
        ctx.fillStyle = '#e8e8f0';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(imgData.name.slice(0, 14), x + imgSize / 2, rowY + imgSize - 8);
      }
      x += imgSize + imgGap;
    }
    y += tierH + rowGap;
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  return canvas;
}

// ── Export PNG ────────────────────────────────────────────────────────────────
function tlExport() {
  const tl = tlActiveTierlist();
  if (!tl) return;
  _tlBuildCanvas(tl).then(canvas => {
    const link = document.createElement('a');
    link.download = (tl.name || 'tierlist').replace(/[^a-z0-9]/gi, '_') + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  });
}

// ── Modal archivées (tierlists + dossiers) ────────────────────────────────────
function tlBuildArchivedTierlistItem(tl) {
  const item = document.createElement('div');
  item.className = 'archived-theme-item';

  const name = document.createElement('span');
  name.className = 'archived-theme-name';
  name.innerHTML = '<i data-lucide="scroll-text"></i> ';
  name.appendChild(document.createTextNode(tl.name + _tlContextLabel(tl, false)));
  item.appendChild(name);

  const btnRestore = document.createElement('button');
  btnRestore.className = 'archived-theme-btn restore';
  btnRestore.innerHTML = '<i data-lucide="corner-down-left"></i> Restaurer';
  btnRestore.addEventListener('click', () => {
    // Restaurer sans dossier (détacher du dossier)
    tlPushUndo();
    const t = tlState.tierlists.find(x => x.id === tl.id);
    if (t) { t.archived = false; t.folderId = null; }
    if (!_tlLocalActiveTierlistId) {
      _tlLocalActiveTierlistId = tl.id;
      _tlLocalNoSelection = false;
      saveUserPrefs({ tlActiveTierlistId: tl.id, tlNoSelection: false });
    }
    tlSave(); tlRender(); tlRenderArchivedModal();
  });
  item.appendChild(btnRestore);

  const btnDel = document.createElement('button');
  btnDel.className = 'archived-theme-btn del';
  btnDel.innerHTML = '<i data-lucide="x"></i> Supprimer';
  btnDel.addEventListener('click', () => { tlDelete(tl.id); tlRenderArchivedModal(); });
  item.appendChild(btnDel);

  return item;
}

function tlRenderArchivedModal() {
  tlArchivedList.innerHTML = '';
  const archivedTL = tlState.tierlists.filter(t => t.archived);
  const archivedFolders = (tlState.folders || []).filter(f => f.archived);
  // Dossiers non archivés qui contiennent des tierlists archivées
  const activeFoldersWithArchivedTL = (tlState.folders || []).filter(f => !f.archived &&
    tlState.tierlists.some(t => t.archived && t.folderId === f.id));

  if (archivedTL.length === 0 && archivedFolders.length === 0) {
    tlArchivedList.innerHTML = '<p class="archived-empty">Aucun élément archivé.</p>';
    return;
  }

  // Dossiers archivés (avec expandeur pour voir leurs tierlists archivées)
  if (archivedFolders.length > 0) {
    const sep = document.createElement('p');
    sep.style.cssText = 'font-size:0.72rem;font-weight:700;color:var(--text-faint);text-transform:uppercase;letter-spacing:0.08em;margin:0 0 6px;';
    sep.innerHTML = '<i data-lucide="folder-closed"></i> Dossiers archivés';
    tlArchivedList.appendChild(sep);

    // Rendre récursivement les dossiers archivés (racine en premier)
    function _renderArchivedFolder(folder, depth) {
      const tlsInFolder = tlState.tierlists.filter(t => t.folderId === folder.id);
      const subFolders = archivedFolders.filter(f => f.parentId === folder.id);
      const hasChildren = tlsInFolder.length > 0 || subFolders.length > 0;

      const folderWrap = document.createElement('div');
      folderWrap.style.cssText = 'margin-bottom:4px;' + (depth > 0 ? 'margin-left:' + (depth * 14) + 'px;' : '');

      const item = document.createElement('div');
      item.className = 'archived-theme-item';
      item.style.cssText = 'flex-direction:column;align-items:stretch;gap:6px;';

      const topRow = document.createElement('div');
      topRow.style.cssText = 'display:flex;align-items:center;gap:8px;';

      let childrenDiv = null;
      if (hasChildren) {
        const arrowBtn = document.createElement('button');
        arrowBtn.style.cssText = 'background:none;border:none;color:var(--text-faint);cursor:pointer;font-size:0.65rem;padding:0 4px;transition:transform 0.15s;flex-shrink:0;';
        arrowBtn.innerHTML = '<i data-lucide="chevron-right"></i>';
        arrowBtn.title = 'Voir le contenu';
        childrenDiv = document.createElement('div');
        childrenDiv.style.cssText = 'display:none;flex-direction:column;gap:4px;padding:4px 0 0 14px;border-left:2px solid var(--border);margin-left:6px;';
        arrowBtn.addEventListener('click', e => {
          e.stopPropagation();
          const open = childrenDiv.style.display !== 'none';
          childrenDiv.style.display = open ? 'none' : 'flex';
          arrowBtn.style.transform = open ? '' : 'rotate(90deg)';
        });
        topRow.appendChild(arrowBtn);
      }

      const name = document.createElement('span');
      name.className = 'archived-theme-name';
      name.innerHTML = '<i data-lucide="folder-closed"></i> ';
      name.appendChild(document.createTextNode(folder.name));
      topRow.appendChild(name);

      const btnRestore = document.createElement('button');
      btnRestore.className = 'archived-theme-btn restore';
      btnRestore.innerHTML = '<i data-lucide="corner-down-left"></i> Restaurer';
      btnRestore.addEventListener('click', () => tlUnarchiveFolder(folder.id));
      topRow.appendChild(btnRestore);

      const btnDel = document.createElement('button');
      btnDel.className = 'archived-theme-btn del';
      btnDel.innerHTML = '<i data-lucide="x"></i> Supprimer';
      btnDel.addEventListener('click', () => { tlDeleteFolder(folder.id); tlRenderArchivedModal(); });
      topRow.appendChild(btnDel);

      item.appendChild(topRow);
      if (childrenDiv) {
        subFolders.forEach(sf => {
          const sfEl = document.createElement('div');
          sfEl.style.cssText = 'margin-top:4px;';
          _renderArchivedFolder(sf, 0); // déjà indenté par childrenDiv
          // On rend directement dans childrenDiv (pas de récursion dans folderWrap)
          childrenDiv.appendChild(sfEl);
          // Re-render dans le bon conteneur
          sfEl.remove();
          const sfWrap = document.createElement('div');
          sfWrap.style.cssText = 'margin-bottom:2px;';
          // Build simplified sf row
          const sfRow = document.createElement('div');
          sfRow.className = 'archived-theme-item';
          sfRow.style.cssText = 'display:flex;align-items:center;gap:8px;';
          const sfName = document.createElement('span');
          sfName.className = 'archived-theme-name';
          sfName.innerHTML = '<i data-lucide="folder-closed"></i> ';
          sfName.appendChild(document.createTextNode(sf.name));
          sfRow.appendChild(sfName);
          const sfRestore = document.createElement('button');
          sfRestore.className = 'archived-theme-btn restore';
          sfRestore.innerHTML = '<i data-lucide="corner-down-left"></i> Restaurer';
          sfRestore.addEventListener('click', () => tlUnarchiveFolder(sf.id));
          sfRow.appendChild(sfRestore);
          const sfDel = document.createElement('button');
          sfDel.className = 'archived-theme-btn del';
          sfDel.innerHTML = '<i data-lucide="x"></i> Supprimer';
          sfDel.addEventListener('click', () => { tlDeleteFolder(sf.id); tlRenderArchivedModal(); });
          sfRow.appendChild(sfDel);
          sfWrap.appendChild(sfRow);
          childrenDiv.appendChild(sfWrap);
        });
        tlsInFolder.forEach(tl => childrenDiv.appendChild(tlBuildArchivedTierlistItem(tl)));
        item.appendChild(childrenDiv);
      }
      folderWrap.appendChild(item);
      tlArchivedList.appendChild(folderWrap);
    }

    // Afficher d'abord les dossiers racine archivés, puis les enfants
    const rootArchived = archivedFolders.filter(f => !f.parentId || !archivedFolders.find(p => p.id === f.parentId));
    rootArchived.forEach(folder => _renderArchivedFolder(folder, 0));
  }

  // Tierlists archivées sans dossier (ou dont le dossier n'est pas archivé)
  const orphanArchivedTL = archivedTL.filter(t => !t.folderId || !(tlState.folders || []).find(f => f.id === t.folderId && f.archived));
  if (orphanArchivedTL.length > 0) {
    const sep = document.createElement('p');
    sep.style.cssText = 'font-size:0.72rem;font-weight:700;color:var(--text-faint);text-transform:uppercase;letter-spacing:0.08em;margin:' + (archivedFolders.length > 0 ? '10px 0 6px' : '0 0 6px') + ';';
    sep.innerHTML = '<i data-lucide="square-mouse-pointer"></i> Tier lists archivées';
    tlArchivedList.appendChild(sep);

    // Grouper par dossier actif
    const byFolder = {};
    orphanArchivedTL.forEach(tl => {
      const key = tl.folderId || '__root__';
      if (!byFolder[key]) byFolder[key] = [];
      byFolder[key].push(tl);
    });

    // Tierlists sans dossier
    if (byFolder['__root__']) {
      byFolder['__root__'].forEach(tl => tlArchivedList.appendChild(tlBuildArchivedTierlistItem(tl)));
    }

    // Tierlists dans dossiers actifs
    (tlState.folders || []).filter(f => !f.archived && byFolder[f.id]).forEach(folder => {
      const tlsInFolder = byFolder[folder.id];
      const folderWrap = document.createElement('div');
      folderWrap.style.cssText = 'margin-bottom:4px;';

      const folderHeader = document.createElement('div');
      folderHeader.style.cssText = 'display:flex;align-items:center;gap:6px;background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius);padding:5px 10px;font-size:0.8rem;font-weight:700;color:var(--text-muted);';

      const arrowBtn = document.createElement('button');
      arrowBtn.style.cssText = 'background:none;border:none;color:var(--text-faint);cursor:pointer;font-size:0.65rem;padding:0 4px;transition:transform 0.15s;flex-shrink:0;';
      arrowBtn.innerHTML = '<i data-lucide="chevron-right"></i>';
      arrowBtn.title = 'Voir les tier lists';
      const childrenDiv = document.createElement('div');
      childrenDiv.style.cssText = 'display:none;flex-direction:column;gap:4px;padding:4px 0 0 14px;border-left:2px solid var(--border);margin-left:6px;';
      arrowBtn.addEventListener('click', e => {
        e.stopPropagation();
        const open = childrenDiv.style.display !== 'none';
        childrenDiv.style.display = open ? 'none' : 'flex';
        arrowBtn.style.transform = open ? '' : 'rotate(90deg)';
      });

      folderHeader.appendChild(arrowBtn);
      const folderIcon = document.createElement('i');
      folderIcon.setAttribute('data-lucide', 'folder-closed');
      folderHeader.appendChild(folderIcon);
      folderHeader.appendChild(document.createTextNode(' ' + folder.name + ' (' + tlsInFolder.length + ')'));
      folderWrap.appendChild(folderHeader);

      tlsInFolder.forEach(tl => childrenDiv.appendChild(tlBuildArchivedTierlistItem(tl)));
      folderWrap.appendChild(childrenDiv);
      tlArchivedList.appendChild(folderWrap);
    });
  }
  if (window.lucide) lucide.createIcons();
}

// ── Modal nouvelle tierlist ───────────────────────────────────────────────────
let tlModalNewMode = 'create'; // 'create' | 'rename' | 'create-template'
let tlModalNewTargetId = null;

function tlPopulateFolderSelect(selectEl, selectedId, excludeId) {
  const activeFolders = (tlState.folders || []).filter(f => !f.archived);
  selectEl.innerHTML = '<option value="">— Aucun dossier —</option>';
  // Exclure un dossier et ses descendants (pour éviter les cycles)
  const excluded = excludeId ? new Set([excludeId, ..._tlGetDescendantIds(excludeId)]) : new Set();
  function addOptions(parentId, depth) {
    activeFolders.filter(f => (f.parentId || null) === (parentId || null) && !excluded.has(f.id)).forEach(f => {
      const opt = document.createElement('option');
      opt.value = f.id;
      opt.textContent = ' '.repeat(depth * 3) + '📁 ' + f.name;
      if (f.id === selectedId) opt.selected = true;
      selectEl.appendChild(opt);
      addOptions(f.id, depth + 1);
    });
  }
  addOptions(null, 0);
}

function tlOpenNewModal() {
  tlModalNewMode = 'create';
  tlModalNewTargetId = null;
  tlModalNewTitle.textContent = 'Nouvelle tier list';
  const n = (tlState.tierlists || []).filter(t => !t.archived).length + 1;
  tlModalNewInput.value = `Tierlist ${n}`;
  // Afficher/cacher le select dossier selon le mode
  const wrap = document.getElementById('tl-modal-new-folder-wrap');
  if (wrap) {
    wrap.style.display = '';
    tlPopulateFolderSelect(tlModalNewFolderSelect, '');
  }
  tlModalNew.classList.remove('hidden');
  setTimeout(() => { tlModalNewInput.focus(); tlModalNewInput.select(); }, 50);
}

function tlOpenNewTemplateModal() {
  tlModalNewMode = 'create-template';
  tlModalNewTargetId = null;
  tlModalNewTitle.textContent = 'Nouveau template';
  const n = (tlState.tierlists || []).filter(t => !t.archived && t.isTemplate).length + 1;
  tlModalNewInput.value = `Template ${n}`;
  const wrap = document.getElementById('tl-modal-new-folder-wrap');
  if (wrap) {
    wrap.style.display = '';
    tlPopulateFolderSelect(tlModalNewFolderSelect, '');
  }
  tlModalNew.classList.remove('hidden');
  setTimeout(() => { tlModalNewInput.focus(); tlModalNewInput.select(); }, 50);
}

function tlOpenRenameModal(id) {
  const tl = tlState.tierlists.find(t => t.id === id);
  if (!tl) return;
  tlModalNewMode = 'rename';
  tlModalNewTargetId = id;
  tlModalNewTitle.textContent = 'Renommer la tier list';
  tlModalNewInput.value = tl.name;
  // Cacher le select dossier en mode rename
  const wrap = document.getElementById('tl-modal-new-folder-wrap');
  if (wrap) wrap.style.display = 'none';
  tlModalNew.classList.remove('hidden');
  setTimeout(() => { tlModalNewInput.focus(); tlModalNewInput.select(); }, 50);
}

function tlConfirmNewModal() {
  const val = tlModalNewInput.value.trim();
  if (!val) return;
  tlModalNew.classList.add('hidden');
  if (tlModalNewMode === 'create') {
    const folderId = tlModalNewFolderSelect ? tlModalNewFolderSelect.value || null : null;
    tlCreate(val, folderId, false);
  } else if (tlModalNewMode === 'create-template') {
    const folderId = tlModalNewFolderSelect ? tlModalNewFolderSelect.value || null : null;
    tlCreate(val, folderId, true);
  } else if (tlModalNewMode === 'rename') {
    tlRename(tlModalNewTargetId, val);
  }
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
  if (ctx.mode === 'color') {
    tlModalTierTitle.textContent = 'Modifier la couleur';
    tlModalTierLabel.style.display = 'none';
    document.getElementById('tl-modal-tier-confirm').textContent = 'Enregistrer';
    tlSelectColor(ctx.tier.color, null);
    tlModalTierColor.value = ctx.tier.color;
  } else if (ctx.mode === 'edit') {
    tlModalTierTitle.textContent = 'Modifier le tier';
    tlModalTierLabel.style.display = '';
    tlModalTierLabel.value = ctx.tier.label;
    document.getElementById('tl-modal-tier-confirm').textContent = 'Enregistrer';
    tlSelectColor(ctx.tier.color, null);
    tlModalTierColor.value = ctx.tier.color;
  } else {
    tlModalTierTitle.textContent = 'Nouveau tier';
    tlModalTierLabel.style.display = '';
    tlModalTierLabel.value = '';
    document.getElementById('tl-modal-tier-confirm').textContent = 'Ajouter';
    tlSelectColor(TL_PRESET_COLORS[0], null);
    tlModalTierColor.value = TL_PRESET_COLORS[0];
  }
  tlModalTier.classList.remove('hidden');
  if (ctx.mode !== 'color') setTimeout(() => { tlModalTierLabel.focus(); tlModalTierLabel.select(); }, 50);
}

function tlConfirmTierModal() {
  const color = tlTierSelectedColor;
  tlModalTier.classList.add('hidden');
  if (tlTierModalCtx && tlTierModalCtx.mode === 'color') {
    tlPushUndo();
    tlTierModalCtx.tier.color = color;
    tlSave();
    tlRender();
    tlTierModalCtx = null;
    return;
  }
  const label = tlModalTierLabel.value.trim();
  if (!label) return;
  if (tlTierModalCtx && tlTierModalCtx.mode === 'edit') {
    tlPushUndo();
    tlTierModalCtx.tier.label = label;
    tlTierModalCtx.tier.color = color;
    tlSave();
    tlRender();
  } else {
    tlAddTier(label, color);
  }
  tlTierModalCtx = null;
}

// ── Gestion dossier — remplacée par menus contextuels dynamiques ──────────────

function tlOpenFolderManageModal(id, anchorEl) {
  const folder = (tlState.folders || []).find(f => f.id === id);
  if (!folder) return;
  const { addItem, addSep } = _tlMakeCtxMenu(anchorEl, null);
  addItem('pencil', 'Renommer', false, () => tlOpenFolderModal('rename', id, folder.name));
  addItem('move', 'Déplacer dans un dossier', false, () => tlOpenMoveFolderModal(id));
  addSep();
  addItem('package', 'Archiver', true, () => tlArchiveFolder(id));
  addItem('trash-2', 'Supprimer', true, () => tlDeleteFolder(id));
}

// ── Modal nouveau/renommer dossier ────────────────────────────────────────────
let _tlFolderModalMode = 'create'; // 'create' | 'rename'
let _tlFolderModalTargetId = null;
const tlModalFolder       = document.getElementById('tl-modal-folder');
const tlModalFolderTitle  = document.getElementById('tl-modal-folder-title');
const tlModalFolderInput  = document.getElementById('tl-modal-folder-input');
const tlModalFolderConfirm = document.getElementById('tl-modal-folder-confirm');
const tlModalFolderCancel  = document.getElementById('tl-modal-folder-cancel');
const tlModalFolderClose   = document.getElementById('tl-modal-folder-close');

const tlModalFolderParentSelect = document.getElementById('tl-modal-folder-parent-select');
const tlModalFolderParentWrap   = document.getElementById('tl-modal-folder-parent-wrap');

function tlOpenFolderModal(mode = 'create', id = null, currentName = '') {
  _tlFolderModalMode = mode;
  _tlFolderModalTargetId = id;
  if (mode === 'rename') {
    tlModalFolderTitle.textContent = 'Renommer le dossier';
    tlModalFolderConfirm.textContent = 'Renommer';
    tlModalFolderInput.value = currentName;
    if (tlModalFolderParentWrap) tlModalFolderParentWrap.style.display = 'none';
  } else {
    tlModalFolderTitle.textContent = 'Nouveau dossier';
    tlModalFolderConfirm.textContent = 'Créer';
    const n = (tlState.folders || []).length + 1;
    tlModalFolderInput.value = `Dossier ${n}`;
    if (tlModalFolderParentWrap) {
      tlModalFolderParentWrap.style.display = '';
      tlPopulateFolderSelect(tlModalFolderParentSelect, '');
      tlModalFolderParentSelect.options[0].textContent = '— Aucun (racine) —';
    }
  }
  tlModalFolder.classList.remove('hidden');
  setTimeout(() => { tlModalFolderInput.focus(); tlModalFolderInput.select(); }, 50);
}

function tlConfirmFolderModal() {
  const val = tlModalFolderInput.value.trim();
  if (!val) return;
  tlModalFolder.classList.add('hidden');
  if (_tlFolderModalMode === 'create') {
    const parentId = tlModalFolderParentSelect ? tlModalFolderParentSelect.value || null : null;
    tlCreateFolder(val, parentId);
  } else if (_tlFolderModalMode === 'rename' && _tlFolderModalTargetId) {
    tlRenameFolder(_tlFolderModalTargetId, val);
  }
}

tlModalFolderConfirm.addEventListener('click', tlConfirmFolderModal);
tlModalFolderCancel.addEventListener('click', () => tlModalFolder.classList.add('hidden'));
tlModalFolderClose.addEventListener('click', () => tlModalFolder.classList.add('hidden'));
tlModalFolderInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') tlConfirmFolderModal();
  if (e.key === 'Escape') tlModalFolder.classList.add('hidden');
});

// Bouton + Dossier
document.getElementById('tl-btn-new-folder').addEventListener('click', () => tlOpenFolderModal('create'));

// (tl-ctx-overlay supprimé — remplacé par menus contextuels dynamiques)

// ── Menu contextuel tierlist (clic droit sur onglet) ─────────────────────────
function tlOpenManageModal(id, anchorEl) {
  const tl = tlState.tierlists.find(t => t.id === id);
  if (!tl) return;
  const { addItem, addSep } = _tlMakeCtxMenu(anchorEl, null);
  addItem('pencil', 'Renommer', false, () => tlOpenRenameModal(id));
  addItem('copy-plus', 'Dupliquer', false, () => tlCopy(id));
  addItem('shelving-unit', 'Ranger dans un dossier', false, () => tlOpenMoveModal(id));
  if (!tl.isTemplate) {
    const ceIsActive = state.currentEventTierlistId === id;
    const ceLabel = ceIsActive ? 'Retirer soirée en cours' : 'Définir comme soirée en cours';
    addItem('party-popper', ceLabel, false, () => setCurrentEventTierlist(id));
    if (!tl.templateId) addItem('scroll', 'Convertir en template', false, () => tlConvertToTemplate(id));
  } else {
    addItem('scroll-text', 'Générer depuis ce template', false, () => tlOpenGenerateFromTemplateModal(id));
  }
  addSep();
  addItem('package', 'Archiver', true, () => tlArchive(id));
  addItem('trash-2', 'Supprimer', true, () => tlDelete(id));
}

// ── Capture Tierlist (presse-papier) ─────────────────────────────────────────
function tlCapture() {
  const tl = tlActiveTierlist();
  if (!tl) return;
  _tlBuildCanvas(tl).then(canvas => {
    canvas.toBlob(blob => {
      if (!blob) return;
      navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).then(() => {
        playCaptureSound();
      }).catch(err => {
        console.warn('TL Capture clipboard error:', err);
      });
    }, 'image/png');
  });
}

// ── Titre inline edit ─────────────────────────────────────────────────────────
function tlStartTitleEdit() {
  const tl = tlActiveTierlist();
  if (!tl) return;
  tlTitleInput.value = tl.name;
  tlTitleDisplay.classList.add('hidden');
  tlTitleInput.classList.remove('hidden');
  tlTitleInput.focus();
  tlTitleInput.select();
}

function tlCommitTitleEdit() {
  const tl = tlActiveTierlist();
  if (!tl) return;
  const newName = tlTitleInput.value.trim();
  tlTitleInput.classList.add('hidden');
  tlTitleDisplay.classList.remove('hidden');
  if (newName && newName !== tl.name) {
    tlRename(tl.id, newName);
  } else {
    tlTitleDisplay.textContent = tl.name;
  }
}

// ── Sidebar drawer tierlist ───────────────────────────────────────────────────
function openTlSidebar() {
  document.getElementById('tl-sidebar').classList.add('open');
}
function closeTlSidebar() {
  document.getElementById('tl-sidebar').classList.remove('open');
}

document.getElementById('tl-btn-folders').addEventListener('click', () => {
  const panel = document.getElementById('tl-sidebar');
  if (panel.classList.contains('open')) closeTlSidebar();
  else openTlSidebar();
});
document.getElementById('tl-empty-btn-folders').addEventListener('click', openTlSidebar);
document.getElementById('tl-sidebar-close').addEventListener('click', closeTlSidebar);

document.getElementById('tl-btn-open-window').addEventListener('click', () => {
  const tl = tlActiveTierlist();
  if (!tl) return;
  window.open(`index.html?openTierlist=${encodeURIComponent(tl.id)}`, '_blank', 'width=1100,height=700');
});

const _tlBtnCeSet = document.getElementById('tl-btn-ce-set');
if (_tlBtnCeSet) {
  _tlBtnCeSet.addEventListener('click', () => {
    const tl = tlActiveTierlist();
    if (tl) setCurrentEventTierlist(tl.id);
  });
}

document.getElementById('tl-btn-new-from-template').addEventListener('click', () => {
  const tl = tlActiveTierlist();
  if (tl && tl.isTemplate) tlOpenGenerateFromTemplateModal(tl.id);
});

// Fermer le menu contextuel TL actif sur Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && _tlActiveCtxMenu) { _tlActiveCtxMenu.remove(); _tlActiveCtxMenu = null; }
});

// Désélectionner l'image en cliquant ailleurs
document.addEventListener('click', e => {
  if (_tlSelectedImgId && !e.target.closest('.tl-img-card')) {
    _tlSelectedImgId = null;
    tlRender();
  }
});

// Supprimer l'image sélectionnée avec Suppr/Retour arrière
document.addEventListener('keydown', e => {
  if ((e.key === 'Delete' || e.key === 'Backspace') && _tlSelectedImgId) {
    const tag = document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const tl = tlActiveTierlist();
    if (!tl) return;
    const img = tlFindImage(tl, _tlSelectedImgId);
    if (!img) return;
    e.preventDefault();
    const imgId = _tlSelectedImgId;
    _tlSelectedImgId = null;
    tlDeleteImage(tl, imgId);
  }
});

// ── Listeners ─────────────────────────────────────────────────────────────────
tlBtnNewTemplate.addEventListener('click', tlOpenNewTemplateModal);
document.getElementById('tl-empty-btn-new').addEventListener('click', tlOpenNewTemplateModal);
document.getElementById('tl-empty-btn-folder').addEventListener('click', () => tlOpenFolderModal('create'));

tlModalNewConfirm.addEventListener('click', tlConfirmNewModal);
tlModalNewCancel.addEventListener('click', () => tlModalNew.classList.add('hidden'));
tlModalNewClose.addEventListener('click', () => tlModalNew.classList.add('hidden'));
tlModalNewInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') tlConfirmNewModal();
  if (e.key === 'Escape') tlModalNew.classList.add('hidden');
});

// Titre inline edit
tlTitleDisplay.addEventListener('click', tlStartTitleEdit);
tlTitleInput.addEventListener('blur', tlCommitTitleEdit);
tlTitleInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') { tlTitleInput.blur(); }
  if (e.key === 'Escape') {
    tlTitleInput.classList.add('hidden');
    tlTitleDisplay.classList.remove('hidden');
    const tl = tlActiveTierlist();
    if (tl) tlTitleDisplay.textContent = tl.name;
  }
});

// (tlCloseManageModal supprimé — remplacé par menus contextuels dynamiques)

// ── Modal "Ranger dans un dossier" ───────────────────────────────────────────
let _tlMoveTargetId = null;
let _tlMoveTargetType = 'tierlist'; // 'tierlist' | 'folder'
const tlModalMove        = document.getElementById('tl-modal-move');
const tlModalMoveSelect  = document.getElementById('tl-modal-move-select');
const tlModalMoveConfirm = document.getElementById('tl-modal-move-confirm');
const tlModalMoveCancel  = document.getElementById('tl-modal-move-cancel');
const tlModalMoveClose   = document.getElementById('tl-modal-move-close');

function tlOpenMoveModal(id) {
  const tl = tlState.tierlists.find(t => t.id === id);
  if (!tl) return;
  _tlMoveTargetId = id;
  _tlMoveTargetType = 'tierlist';
  document.getElementById('tl-modal-move-title').textContent = 'Ranger "' + tl.name + '"';
  tlPopulateFolderSelect(tlModalMoveSelect, tl.folderId || '');
  tlModalMoveSelect.options[0].textContent = '— Aucun dossier (racine) —';
  tlModalMove.classList.remove('hidden');
}

function tlOpenMoveFolderModal(id) {
  const folder = (tlState.folders || []).find(f => f.id === id);
  if (!folder) return;
  _tlMoveTargetId = id;
  _tlMoveTargetType = 'folder';
  document.getElementById('tl-modal-move-title').textContent = 'Déplacer "' + folder.name + '"';
  tlPopulateFolderSelect(tlModalMoveSelect, folder.parentId || '', id);
  tlModalMoveSelect.options[0].textContent = '— Racine (aucun parent) —';
  tlModalMove.classList.remove('hidden');
}

tlModalMoveConfirm.addEventListener('click', () => {
  if (!_tlMoveTargetId) return;
  const targetId = tlModalMoveSelect.value || null;
  tlModalMove.classList.add('hidden');
  if (_tlMoveTargetType === 'folder') {
    tlMoveFolderToParent(_tlMoveTargetId, targetId);
  } else {
    tlMoveTierlistToFolder(_tlMoveTargetId, targetId);
  }
  _tlMoveTargetId = null;
});
tlModalMoveCancel.addEventListener('click', () => { tlModalMove.classList.add('hidden'); _tlMoveTargetId = null; });
tlModalMoveClose.addEventListener('click', () => { tlModalMove.classList.add('hidden'); _tlMoveTargetId = null; });

tlBtnAddTier.addEventListener('click', () => tlOpenTierModal({ mode: 'create' }));
tlModalTierConfirm.addEventListener('click', tlConfirmTierModal);
tlModalTierCancel.addEventListener('click', () => { tlModalTier.classList.add('hidden'); tlTierModalCtx = null; });
tlModalTierClose.addEventListener('click', () => { tlModalTier.classList.add('hidden'); tlTierModalCtx = null; });
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

// ── Ajout rapide d'une carte texte (barre inline, couleur fixe) ──────────────
const TL_TEXT_CARD_COLOR = '#3a3a42';

function _tlAddTextCard(tl, text) {
  const root = _tlGroupRoot(tl);
  if (!root.images) root.images = [];
  const maxImages = tlEffectiveMaxImages(tl);
  if (root.images.length >= maxImages) {
    alert(`Limite atteinte — maximum ${maxImages} éléments par groupe.`);
    return;
  }
  const img = { id: uid(), type: 'text', name: text, color: TL_TEXT_CARD_COLOR };
  root.images.push(img);
  _tlGetGroupMembers(tl).forEach(member => {
    if (!member.unplaced.includes(img.id)) member.unplaced.push(img.id);
  });
  tlSave();
  tlRender();
  const input = document.querySelector('.tl-add-text-input');
  if (input) input.focus();
}

// ── Génération de tierlists depuis un template (façon Bingo Jérôme/Adrien/Damien) ──
const tlModalGenerate        = document.getElementById('tl-modal-generate-from-template');
const tlGenerateNameInput    = document.getElementById('tl-generate-name-input');
const tlBtnConfirmGenerate   = document.getElementById('tl-btn-confirm-generate');
const tlBtnCancelGenerate    = document.getElementById('tl-btn-cancel-generate');
const tlModalGenerateClose   = document.getElementById('tl-modal-generate-close');

let _tlGenerateTemplateId = null;

function tlOpenGenerateFromTemplateModal(templateId) {
  _tlGenerateTemplateId = templateId;
  tlGenerateNameInput.value = '';
  document.querySelectorAll('#tl-modal-generate-from-template .grid-name-preset-check input')
    .forEach(cb => { cb.checked = false; });
  tlModalGenerate.classList.remove('hidden');
}

function _tlCreateFromTemplate(templateId, name) {
  const template = tlState.tierlists.find(t => t.id === templateId);
  if (!template) return null;
  // Pas de copie des images : la tierlist générée lit les éléments du template en continu (_tlGetGroupImages)
  const copy = tlDefaultTierlist(name, false);
  copy.templateId = templateId;
  copy.folderId = template.folderId || null;
  copy.unplaced = (template.unplaced || []).slice();
  tlState.tierlists.push(copy);
  return copy;
}

function tlConfirmGenerateFromTemplate() {
  if (!_tlGenerateTemplateId) return;
  const checked = [...document.querySelectorAll('#tl-modal-generate-from-template .grid-name-preset-check input:checked')].map(cb => cb.value);
  tlModalGenerate.classList.add('hidden');
  tlPushUndo();
  let lastCreated = null;
  if (checked.length > 0) {
    checked.forEach(name => { lastCreated = _tlCreateFromTemplate(_tlGenerateTemplateId, name); });
  } else {
    const name = tlGenerateNameInput.value.trim();
    if (!name) return;
    lastCreated = _tlCreateFromTemplate(_tlGenerateTemplateId, name);
  }
  if (lastCreated) {
    _tlLocalActiveTierlistId = lastCreated.id;
    _tlLocalNoSelection = false;
    saveUserPrefs({ tlActiveTierlistId: lastCreated.id, tlNoSelection: false });
  }
  _tlGenerateTemplateId = null;
  tlSave();
  tlRender();
}

tlBtnConfirmGenerate.addEventListener('click', tlConfirmGenerateFromTemplate);
tlBtnCancelGenerate.addEventListener('click', () => tlModalGenerate.classList.add('hidden'));
tlModalGenerateClose.addEventListener('click', () => tlModalGenerate.classList.add('hidden'));
tlGenerateNameInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') tlConfirmGenerateFromTemplate();
  if (e.key === 'Escape') tlModalGenerate.classList.add('hidden');
});

// (tlBtnImportImages supprimé — le bouton est maintenant dans le panneau images non placées)
tlFileInput.addEventListener('change', () => { if (tlFileInput.files.length) tlImportImages(tlFileInput.files); tlFileInput.value = ''; });

tlBtnReset.addEventListener('click', tlReset);
const _tlModalConfirmReset = document.getElementById('tl-modal-confirm-reset');
document.getElementById('tl-btn-confirm-reset').addEventListener('click', () => { _tlModalConfirmReset.classList.add('hidden'); _tlDoReset(); });
document.getElementById('tl-btn-cancel-reset').addEventListener('click', () => _tlModalConfirmReset.classList.add('hidden'));
document.getElementById('tl-btn-close-confirm-reset').addEventListener('click', () => _tlModalConfirmReset.classList.add('hidden'));

function tlRenderTrashList() {
  const container = tlTrashList;
  container.innerHTML = '';
  const trash = tlState.trash || [];
  if (trash.length === 0) {
    container.innerHTML = '<p class="archived-empty">La corbeille est vide.</p>';
    return;
  }

  const treeNodes = []; // { key, label, folderEntry, tierlists: [{ name, origIdx, fromParent }] }
  function _getOrCreateNode(key, label) {
    let node = treeNodes.find(n => n.key === key);
    if (!node) { node = { key, label, folderEntry: null, tierlists: [] }; treeNodes.push(node); }
    return node;
  }

  const separateTlIds = new Set(
    trash.filter(e => e.type === 'tierlist').map(e => e.data?.id).filter(Boolean)
  );

  trash.forEach((entry, origIdx) => {
    if (entry.type === 'folder') {
      const node = _getOrCreateNode('__f__' + origIdx, entry.data?.name || '?');
      node.folderEntry = { entry, origIdx };
      (entry.data?._tierlists || []).forEach(tl => {
        if (!separateTlIds.has(tl.id)) node.tierlists.push({ name: tl.name + _tlContextLabel(tl, false), fromParent: true });
      });
    } else if (entry.type === 'tierlist') {
      const pf = entry.folderId ? (tlState.folders || []).find(f => f.id === entry.folderId) : null;
      const key = entry.folderId ? entry.folderId : '__root__';
      const node = _getOrCreateNode(key, pf ? pf.name : (entry.folderId ? '(dossier supprimé)' : '— Sans dossier —'));
      const canRestore = !entry.folderId || !!pf;
      node.tierlists.push({ name: (entry.data?.name || '?') + _tlContextLabel(entry.data || {}, false), origIdx, fromParent: false, canRestore });
    }
  });

  treeNodes.forEach(node => {
    const children = document.createElement('div');
    children.className = 'tree-children tree-hidden';
    let collapsed = true;
    const row = _makeTreeNode(node.label, 0, collapsed, () => {
      collapsed = !collapsed;
      row.querySelector('.tree-arrow').classList.toggle('collapsed', collapsed);
      children.classList.toggle('tree-hidden', collapsed);
    });
    if (node.folderEntry) {
      row.appendChild(_makeArchiveButtons([{
        text: '<i data-lucide="corner-down-left"></i> Restaurer', cls: 'restore',
        onClick: () => { tlTrashRestore(node.folderEntry.origIdx); }
      }]));
    }
    container.appendChild(row);
    container.appendChild(children);

    node.tierlists.forEach(tl => {
      const actions = tl.fromParent ? [] : [{
        text: '<i data-lucide="corner-down-left"></i> Restaurer', cls: 'restore',
        disabled: !tl.canRestore,
        onClick: () => { tlTrashRestore(tl.origIdx); }
      }];
      children.appendChild(_makeLeafRow(tl.name, 1, actions));
    });
  });
  if (window.lucide) lucide.createIcons();
}

tlBtnExport.addEventListener('click', tlExport);
tlBtnCapture.addEventListener('click', tlCapture);

tlShowLabelsToggle.addEventListener('change', () => {
  _tlLocalShowLabels = tlShowLabelsToggle.checked;
  saveUserPrefs({ tlShowLabels: _tlLocalShowLabels });
  tlRender();
});

tlImgSizeSlider.addEventListener('input', () => {
  _tlLocalImgSize = parseInt(tlImgSizeSlider.value);
  saveUserPrefs({ tlImgSize: _tlLocalImgSize });
  tlRender();
});

function tlOpenArchivesUnified() {
  tlRenderArchivedModal();
  _initPanelPosition(tlModalArchived, 'right');
  _makePanelDraggable(tlModalArchived);
  tlModalArchived.classList.add('open');
}
function tlCloseArchivesUnified() {
  tlModalArchived.classList.remove('open');
}
document.getElementById('tl-btn-archives-unified').addEventListener('click', () => {
  if (tlModalArchived.classList.contains('open')) tlCloseArchivesUnified();
  else tlOpenArchivesUnified();
});
tlModalArchivedClose.addEventListener('click', tlCloseArchivesUnified);

function tlOpenTrashUnified() {
  tlRenderTrashList();
  _initPanelPosition(tlModalTrash, 'right');
  _makePanelDraggable(tlModalTrash);
  tlModalTrash.classList.add('open');
}
function tlCloseTrashUnified() {
  tlModalTrash.classList.remove('open');
}
document.getElementById('tl-btn-trash-unified').addEventListener('click', () => {
  if (tlModalTrash.classList.contains('open')) tlCloseTrashUnified();
  else tlOpenTrashUnified();
});
tlModalTrashClose.addEventListener('click', tlCloseTrashUnified);

document.getElementById('tl-btn-trash-empty-all').addEventListener('click', () => {
  if ((tlState.trash || []).length === 0) return;
  tlModalConfirmTrashEmpty.classList.remove('hidden');
});
document.getElementById('tl-btn-close-confirm-trash-empty').addEventListener('click', () => tlModalConfirmTrashEmpty.classList.add('hidden'));
document.getElementById('tl-btn-cancel-trash-empty').addEventListener('click', () => tlModalConfirmTrashEmpty.classList.add('hidden'));
document.getElementById('tl-btn-confirm-trash-empty').addEventListener('click', () => {
  tlTrashEmpty();
  tlModalConfirmTrashEmpty.classList.add('hidden');
  tlRenderTrashList();
});

tlModalImgNameConfirm.addEventListener('click', tlConfirmRenameImg);
tlModalImgNameCancel.addEventListener('click', () => { tlModalImgName.classList.add('hidden'); tlRenameImgContext = null; });
tlModalImgNameClose.addEventListener('click', () => { tlModalImgName.classList.add('hidden'); tlRenameImgContext = null; });
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

// ── Limite d'images personnalisable ───────────────────────────────────────────
tlMaxImagesInput.addEventListener('click', () => {
  const tl = tlActiveTierlist();
  if (!tl) return;
  const current = tlEffectiveMaxImages(tl);
  const { addItem } = _tlMakeCtxMenu(tlMaxImagesInput, null);
  TL_MAX_IMAGES_CHOICES.forEach(n => {
    const btn = addItem('', String(n), false, () => { tlMaxImagesInput.textContent = tlSetMaxImages(tl, n); tlRender(); });
    if (current === n) {
      const check = document.createElement('i');
      check.setAttribute('data-lucide', 'check');
      btn.insertBefore(check, btn.firstChild);
      if (window.lucide) lucide.createIcons();
    }
  });
});

tlUnplacedSortBtn.addEventListener('click', () => {
  const tl = tlActiveTierlist();
  if (!tl) return;
  const current = tl.unplacedSort || 'manual';
  const setSort = mode => { tl.unplacedSort = mode; tlSave(); tlRender(); };
  const { addItem } = _tlMakeCtxMenu(tlUnplacedSortBtn, null);
  const addSortItem = (mode, iconName, text) => {
    const btn = addItem(iconName, text, false, () => setSort(mode));
    if (current === mode) {
      const check = document.createElement('i');
      check.setAttribute('data-lucide', 'check');
      btn.insertBefore(check, btn.firstChild);
      if (window.lucide) lucide.createIcons();
    }
  };
  addSortItem('manual', 'hand', 'Manuel');
  addSortItem('alpha', 'arrow-down-a-z', 'Alphabétique');
  addSortItem('date', 'arrow-down-0-1', 'Date d\'ajout');
});

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
  const maxImages = tlEffectiveMaxImages(tl);
  if (tl.images.length >= maxImages) {
    alert(`Limite atteinte — maximum ${maxImages} images par tierlist.`);
    return;
  }
  const now = new Date();
  const promises = imageItems.map(it => {
    const file = it.getAsFile();
    if (!file) return Promise.resolve();
    const name = `capture_${now.getHours()}h${String(now.getMinutes()).padStart(2,'0')}`;
    return _tlCompressToBase64(file).then(src => {
      if (tl.images.length >= maxImages) return;
      if (tl.images.some(i => i.src === src)) return;
      const img = { id: uid(), src, name };
      _tlSrcCache[img.id] = src;
      tl.images.push(img);
      tl.unplaced.push(img.id);
    });
  });

  Promise.all(promises).then(() => { tlSave(); tlRender(); tlUpdateUndoBtn(); }).catch(e => console.warn('TL paste error:', e));
});

// ══════════════════════════════════════════════════════════════════════════════
// Initialisation Firebase temps réel
// ══════════════════════════════════════════════════════════════════════════════

// ── Bingo ─────────────────────────────────────────────────────────────────────
_dbBingo.on('value', snapshot => {
  _bingoRemoteUpdate = true;
  // Capturer les IDs de grilles connues avant la mise à jour, pour détecter les vraiment nouvelles
  const _knownGridIdsBefore = new Set(
    (state.folders || []).flatMap(function collectGridIds(f) {
      return [...(f.grids || []).map(g => g.id), ...(f.folders || []).flatMap(collectGridIds)];
    })
  );
  _firebaseReady = true;
  const raw = snapshot.val();
  const migrated = migrateState(raw);
  state = migrated || initState();

  // Normaliser l'état (nouvelle structure dossiers)
  if (!state.folders) state.folders = [];
  if (state.currentEventFolderId  === undefined) state.currentEventFolderId  = null;
  if (state.currentEventTierlistId === undefined) state.currentEventTierlistId = null;
  function _normalizeFolder(f) {
    if (!f.elements)          f.elements          = [];
    if (!f.archivedElementIds) f.archivedElementIds = [];
    if (!f.folders)           f.folders            = [];
    if (!f.grids)             f.grids              = [];
    if (f.locked === undefined) f.locked            = false;
    f.grids.forEach(g => {
      if (g.archived === undefined) g.archived = false;
      if (g.hidden   === undefined) g.hidden   = false;
      if (g.title    === undefined) g.title    = '';
      if (g.locked   === undefined) g.locked   = false;
      if (!g.grid || g.grid.length === 0) {
        g.grid = Array.from({ length: MAX_SIZE * MAX_SIZE }, () => ({ elementId: null, checked: false, color: null }));
      } else {
        while (g.grid.length < MAX_SIZE * MAX_SIZE) g.grid.push({ elementId: null, checked: false, color: null });
      }
    });
    f.folders.forEach(_normalizeFolder);
  }
  state.folders.forEach(_normalizeFolder);

  if (_prefsReady) {
    // Ajouter les nouvelles grilles apparues dans le dossier actif à la sélection de l'utilisateur
    const activeF = activeFolder();
    // Ajouter uniquement les grilles qui n'existaient pas avant cette mise à jour Firebase (créées par un autre utilisateur)
    if (activeF) {
      const brandNewGrids = (activeF.grids || []).filter(g => !g.archived && !_knownGridIdsBefore.has(g.id));
      if (brandNewGrids.length > 0) {
        const combined = [..._selectedGridIds, ...brandNewGrids.map(g => g.id)].slice(0, 3);
        if (combined.length !== _selectedGridIds.length) {
          _selectedGridIds = combined;
          saveLocalSelectedGrids(_selectedGridIds);
        }
      }
    }
    _applyPrefsAndRender();
  } else if (!currentUser) {
    // Pas encore connecté : render par défaut sans prefs
    renderThemesList();
    renderSubthemesList();
    renderElements();
    renderGridsList();
    renderGrid();
    setTimeout(setBingoReadyForEffect, 0);
  }
  // Si _prefsReady est false mais currentUser existe : loadUserPrefs() appellera _applyPrefsAndRender() lui-même
  _bingoRemoteUpdate = false;
});

// ── Tier List ─────────────────────────────────────────────────────────────────
_dbTierlist.on('value', snapshot => {
  _tlRemoteUpdate = true;
  const raw = snapshot.val();
  tlState = _tlNormalizeState(raw);
  const _needsMigrationSave = tlState._tlMigrated;
  delete tlState._tlMigrated;
  // Alimenter le cache src depuis les données Firebase
  tlState.tierlists.forEach(_tlCacheSrcs);
  // Valider que la tierlist active de cet utilisateur existe encore
  // Attendre que les prefs soient chargées avant toute sélection automatique
  if (_prefsReady) {
    if (!_tlLocalNoSelection && _tlLocalActiveTierlistId) {
      const still = tlState.tierlists.find(t => t.id === _tlLocalActiveTierlistId && !t.archived);
      if (!still) {
        const first = tlState.tierlists.find(t => !t.archived);
        _tlLocalActiveTierlistId = first ? first.id : null;
        if (_tlLocalActiveTierlistId) saveUserPrefs({ tlActiveTierlistId: _tlLocalActiveTierlistId });
      }
    } else if (!_tlLocalNoSelection && !_tlLocalActiveTierlistId) {
      // Première connexion / première fois : sélectionner la première tierlist dispo
      const first = tlState.tierlists.find(t => !t.archived);
      if (first) {
        _tlLocalActiveTierlistId = first.id;
        saveUserPrefs({ tlActiveTierlistId: first.id, tlNoSelection: false });
      }
    }
  }
  _applySoloTierlistModeIfNeeded();
  tlRender();
  _tlRemoteUpdate = false;
  if (_needsMigrationSave) tlSave();
});
