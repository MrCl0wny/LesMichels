/* ═══════════════════════════════════════════════
   LesMichels — app.js
═══════════════════════════════════════════════ */

// ──────────────────────────────────────────────
// Mode "grille(s) plein écran" (overlay interne, activable aussi via ?openGrids= pour compat)
// ──────────────────────────────────────────────
const _soloGridParams = new URLSearchParams(window.location.search);
const _soloGridIds = (_soloGridParams.get('openGrids') || _soloGridParams.get('openGrid') || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
let _soloGridApplied = false;

let _soloTierlistId = _soloGridParams.get('openTierlist') || null;
let _soloTierlistApplied = false;

let _compareTierlistIds = (_soloGridParams.get('compareTierlists') || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
let _compareModeApplied = false;
// true si la page a été ouverte directement sur ?compareTierlists= (fenêtre dédiée créée par
// window.open() depuis le modal "Comparer" — donc fermable par le script qui l'a ouverte).
const _compareModeIsDedicatedWindow = _compareTierlistIds.length >= 2;

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
// Tooltip custom générique (data-tooltip="...") — seul canal d'infobulle qui fonctionne encore une
// fois title="..." désactivé ci-dessus. N'affiche rien si l'élément demande une troncature
// explicite (voir _showAppTooltipIfTruncated) et que le texte n'est en fait pas tronqué.
// ──────────────────────────────────────────────
let _appTooltipEl = null;
function _showAppTooltip(text, anchorRect) {
  if (!_appTooltipEl) {
    _appTooltipEl = document.createElement('div');
    _appTooltipEl.id = 'app-tooltip';
    _appTooltipEl.className = 'hidden';
    document.body.appendChild(_appTooltipEl);
  }
  _appTooltipEl.textContent = text;
  _appTooltipEl.classList.remove('hidden');
  const top = anchorRect.bottom + 6;
  let left = anchorRect.left + anchorRect.width / 2;
  _appTooltipEl.style.top = top + 'px';
  _appTooltipEl.style.left = left + 'px';
  _appTooltipEl.style.transform = 'translateX(-50%)';
  // Recale si ça dépasse à gauche/droite de la fenêtre
  const rect = _appTooltipEl.getBoundingClientRect();
  if (rect.left < 4) _appTooltipEl.style.left = (left + (4 - rect.left)) + 'px';
  if (rect.right > window.innerWidth - 4) _appTooltipEl.style.left = (left - (rect.right - window.innerWidth + 4)) + 'px';
}
function _hideAppTooltip() {
  if (_appTooltipEl) _appTooltipEl.classList.add('hidden');
}
// N'affiche le tooltip que si le texte de l'élément est réellement tronqué visuellement
// (scrollWidth/scrollHeight > client*) — évite une infobulle redondante sur un nom déjà entier.
function _showAppTooltipIfTruncated(el) {
  const isTruncated = el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1;
  if (!isTruncated) return;
  _showAppTooltip(el.dataset.tooltip || el.textContent, el.getBoundingClientRect());
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

  const formEmail    = document.getElementById('form-email-signin');
  const inputEmail   = document.getElementById('input-email-signin');
  const inputPassword = document.getElementById('input-password-signin');

  formEmail.addEventListener('submit', (e) => {
    e.preventDefault();
    document.getElementById('auth-error').textContent = '';
    const pseudoEmail = inputEmail.value.trim().toLowerCase() + '@lesmichels.local';
    _auth.signInWithEmailAndPassword(pseudoEmail, inputPassword.value).catch(err => {
      console.error('Erreur connexion pseudo:', err);
      document.getElementById('auth-error').textContent = 'Pseudo ou mot de passe incorrect.';
    });
  });

  btnSignout.addEventListener('click', () => {
    document.getElementById('modal-confirm-signout').classList.remove('hidden');
  });

  const ALLOWED_UIDS = [
    'qvXEXn9zarMPaK0l9AH4PDtxsVG3',
    'VDpOI5BckhR7cmu3Bl7lzWj0wpH2',
    'KXEWIJplDrdqGnUSJA7Pvnr7aRx2',
    'Ju1gJx4dqmW2OwHcE1sDdq7Odff1',
    'GZ1u5gEoVBSC3Ujgd1coPDui0Qu2',
    'DF7RxxHCcLWRU3dKFRaamEjR1so1'
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
      _localShowNewBadge = true;
      _tlLocalShowLabels       = null;
      _tlLocalImgSize          = null;
      _tlLocalUnplacedImgSize  = null;
      _tlLocalUnplacedShowLabels = null;
      _tlLocalUnplacedHidden   = false;
      _tlLocalSplit            = null;
      _tlLocalActiveTierlistId = null;
      _tlLocalActiveFolderId   = null;
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
    if (prefs.showNewBadge     != null) _localShowNewBadge     = !!prefs.showNewBadge;
    if (prefs.foldersViewMode  != null) _foldersViewMode       = prefs.foldersViewMode;
    if (prefs.tlFoldersViewMode != null) _tlFoldersViewMode    = prefs.tlFoldersViewMode;
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
    if (prefs.tlUnplacedImgSize   != null) _tlLocalUnplacedImgSize  = prefs.tlUnplacedImgSize;
    if (prefs.tlUnplacedShowLabels != null) _tlLocalUnplacedShowLabels = !!prefs.tlUnplacedShowLabels;
    if (prefs.tlUnplacedHidden    != null) _tlLocalUnplacedHidden   = !!prefs.tlUnplacedHidden;
    if (prefs.tlSplit             != null) _tlLocalSplit            = prefs.tlSplit;
    if (prefs.tlActiveTierlistId  != null) _tlLocalActiveTierlistId = prefs.tlActiveTierlistId;
    if (prefs.tlActiveFolderId    != null) _tlLocalActiveFolderId   = prefs.tlActiveFolderId;
    if (prefs.tlNoSelection       != null) _tlLocalNoSelection      = !!prefs.tlNoSelection;
    // Page active — l'app démarre toujours sur l'accueil (sauf lien direct vers une grille/tierlist
    // en plein écran solo) ; prefs.activePage n'est utilisée que pour les changements d'onglet en cours de session.
    if (window._switchPage && _soloGridIds.length === 0 && !_soloTierlistId) _switchPage('home');
    _prefsReady = true;
    // Appliquer les prefs visuelles
    fontScaleInput.value = Math.round(_localFontScale * 100);
    const fsValueInput = document.getElementById('font-scale-value-input');
    if (fsValueInput) fsValueInput.value = Math.round(_localFontScale * 100);
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
      : `${grids.length} grilles`);
    document.body.classList.add('solo-grid-mode');
  }
}

// #tl-split-slider-label, #tl-btn-undo, #tl-btn-toggle-unplaced, #tl-list-options-frame et le
// wrapper du bouton Liste vivent dans la toolbar du mode normal (lignes 1 et 2) et dans la barre
// plein écran (.tl-solo-toolbar) en solo-tierlist-mode — mêmes éléments physiques déplacés en JS,
// jamais deux jeux de contrôles désynchronisés (comme #font-scale-label côté Bingo). En plein
// écran, un template ne peut pas s'afficher : le bouton Liste y remplace Tiers/Reset (masqués via
// body.solo-tierlist-mode, voir CSS) pour permettre de changer de liste sans repasser en mode normal.
function _tlEnterSoloToolbarLayout() {
  const splitLabel = document.getElementById('tl-split-slider-label');
  const undoBtn = document.getElementById('tl-btn-undo');
  const optionsFrame = document.getElementById('tl-list-options-frame');
  const toggleUnplacedBtn = document.getElementById('tl-btn-toggle-unplaced');
  const listWrap = document.getElementById('tl-btn-tierlist-dropdown')?.closest('.tl-labeled-btn');
  const soloLeft = document.querySelector('.tl-solo-toolbar-left');
  const soloCenter = document.querySelector('.tl-solo-toolbar-center');
  const soloRight = document.querySelector('.tl-solo-toolbar-right');
  const exitBtn = document.getElementById('tl-btn-exit-solo');
  if (listWrap && soloLeft) soloLeft.appendChild(listWrap);
  if (optionsFrame && soloLeft) soloLeft.appendChild(optionsFrame);
  // Répartition + Annuler regroupés et centrés sur TOUTE la barre (voir .tl-solo-toolbar-center
  // en CSS), pas dans .tl-solo-toolbar-left avec le cadre Options Liste.
  if (splitLabel && soloCenter) soloCenter.appendChild(splitLabel);
  if (undoBtn && soloCenter) soloCenter.appendChild(undoBtn);
  if (toggleUnplacedBtn && soloRight) soloRight.insertBefore(toggleUnplacedBtn, exitBtn);
}
function _tlExitSoloToolbarLayout() {
  const splitLabel = document.getElementById('tl-split-slider-label');
  const undoBtn = document.getElementById('tl-btn-undo');
  const optionsFrame = document.getElementById('tl-list-options-frame');
  const toggleUnplacedBtn = document.getElementById('tl-btn-toggle-unplaced');
  const listWrap = document.getElementById('tl-btn-tierlist-dropdown')?.closest('.tl-labeled-btn');
  const line1Right = document.querySelector('.ctrl-row-line1 .ctrl-row-grids-right');
  const line1Left = document.querySelector('.ctrl-row-line1 .ctrl-row-grids-left');
  const toolbarLeft = document.querySelector('.ctrl-row-toolbar-left');
  const toolbarCenter = document.querySelector('.tl-ctrl-row-toolbar .ctrl-row-toolbar-center');
  if (toggleUnplacedBtn && line1Right) line1Right.appendChild(toggleUnplacedBtn);
  if (optionsFrame && toolbarLeft) toolbarLeft.appendChild(optionsFrame);
  // Répartition + Annuler retournent centrés sur la ligne 2 (.ctrl-row-toolbar-center), Répartition
  // avant Annuler — même position qu'en mode normal avant l'entrée en plein écran.
  if (splitLabel && toolbarCenter) toolbarCenter.appendChild(splitLabel);
  if (undoBtn && toolbarCenter) toolbarCenter.appendChild(undoBtn);
  if (listWrap && line1Left) line1Left.appendChild(listWrap);
}

// Annuler centré sur TOUTE la barre comparaison (voir .tl-compare-toolbar-center en CSS), même
// élément DOM physique que le mode normal/plein écran, déplacé en JS (même pattern que
// _tlEnterSoloToolbarLayout/_tlExitSoloToolbarLayout ci-dessus).
function _tlEnterCompareToolbarLayout() {
  const undoBtn = document.getElementById('tl-btn-undo');
  const compareCenter = document.querySelector('.tl-compare-toolbar-center');
  if (undoBtn && compareCenter) compareCenter.appendChild(undoBtn);
}
function _tlExitCompareToolbarLayout() {
  const undoBtn = document.getElementById('tl-btn-undo');
  const toolbarCenter = document.querySelector('.tl-ctrl-row-toolbar .ctrl-row-toolbar-center');
  if (undoBtn && toolbarCenter) toolbarCenter.appendChild(undoBtn);
}

function _applySoloTierlistModeIfNeeded() {
  if (!_soloTierlistId || _soloTierlistApplied) return;
  const tl = tlState.tierlists.find(t => t.id === _soloTierlistId && !t.archived);
  if (!tl) return;
  _soloTierlistApplied = true;
  _tlLocalActiveTierlistId = tl.id;
  _tlLocalNoSelection = false;
  if (window._switchPage) window._switchPage('tierlist');
  document.title = (_tlFullTitlePath(tl) || tl.name || 'Liste');
  document.body.classList.add('solo-tierlist-mode');
  _tlEnterSoloToolbarLayout();
  requestAnimationFrame(_adjustTlLayoutHeight);
}

function _applyCompareTierlistModeIfNeeded() {
  if (_compareTierlistIds.length < 2) return;
  const tls = _compareTierlistIds
    .map(id => tlState.tierlists.find(t => t.id === id && !t.archived))
    .filter(Boolean);
  if (tls.length < 2) {
    // Une tierlist comparée a été supprimée/archivée entre-temps : on garde le dernier rendu affiché.
    return;
  }
  if (!_compareModeApplied) {
    _compareModeApplied = true;
    _tlLocalActiveTierlistId = null;
    if (window._switchPage) window._switchPage('tierlist');
    document.body.classList.add('compare-tierlist-mode');
    _tlEnterCompareToolbarLayout();
    tlUpdateUndoBtn();
    if (_compareModeIsDedicatedWindow) {
      const exitBtn = document.getElementById('tl-compare-btn-exit');
      if (exitBtn) {
        exitBtn.innerHTML = '<i data-lucide="x"></i> Fermer';
        exitBtn.title = 'Fermer cette fenêtre';
        if (window.lucide) lucide.createIcons();
      }
    }
  }
  document.title = 'Comparaison : ' + _tlCommonTitlePath(tls);
  _tlCompareGroupMembers = tls;
  _tlCompareSelectedIds = tls.map(t => t.id);
  if (typeof _tlRenderCompareListsMenu === 'function') _tlRenderCompareListsMenu();
  _tlRenderCompareView(tls);
}

function _exitSoloTierlistMode() {
  document.body.classList.remove('solo-tierlist-mode');
  document.title = 'LesMichels';
  _tlExitSoloToolbarLayout();
  // Empêche le listener Firebase (_dbTierlist.on('value')) de rouvrir le mode au prochain snapshot
  _soloTierlistId = null;
  _soloTierlistApplied = false;
  requestAnimationFrame(_adjustTlLayoutHeight);
}

function _exitCompareTierlistMode() {
  // Fenêtre dédiée ouverte via window.open() depuis le modal "Comparer" (?compareTierlists=
  // dès le chargement) : window.close() fonctionne car la page a été ouverte par script.
  // Si window.close() échoue (bloqué par le navigateur), on retombe sur le comportement normal.
  if (_compareModeIsDedicatedWindow) {
    window.close();
  }
  document.body.classList.remove('compare-tierlist-mode');
  document.title = 'LesMichels';
  _tlExitCompareToolbarLayout();
  // Empêche le listener Firebase (_dbTierlist.on('value')) de rouvrir le mode au prochain snapshot
  _compareTierlistIds = [];
  _compareModeApplied = false;
  _tlCompareGroupMembers = null;
  _tlCompareSelectedIds = null;
  // _tlRenderCompareView() démasque ces deux éléments indépendamment de la classe du body — sans ça
  // ils restent visibles même après la sortie du mode.
  document.getElementById('tl-compare-toolbar')?.classList.add('hidden');
  document.getElementById('tl-compare-view')?.classList.add('hidden');
  tlRender();
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
      _selectedGridIds = (folder.grids || []).filter(g => !g.archived).map(g => g.id);
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
  if (_tlLocalShowLabels !== null) _tlUpdateShowLabelsBtn(_tlLocalShowLabels);
  if (_tlLocalUnplacedShowLabels !== null) _tlUpdateUnplacedShowLabelsBtn(_tlLocalUnplacedShowLabels);
  if (_tlLocalImgSize    !== null) {
    _tlLocalImgSize = _tlClampImgSize(_tlLocalImgSize);
    tlImgSizeSlider.value = _tlLocalImgSize;
    const tlImgSizeValueInputEl = document.getElementById('tl-img-size-value-input');
    if (tlImgSizeValueInputEl) tlImgSizeValueInputEl.value = _tlLocalImgSize;
  }
  if (_tlLocalUnplacedImgSize !== null && tlUnplacedImgSizeSlider) {
    _tlLocalUnplacedImgSize = _tlClampImgSize(_tlLocalUnplacedImgSize);
    tlUnplacedImgSizeSlider.value = _tlLocalUnplacedImgSize;
    const tlUnplacedImgSizeValueInputEl = document.getElementById('tl-unplaced-img-size-value-input');
    if (tlUnplacedImgSizeValueInputEl) tlUnplacedImgSizeValueInputEl.value = _tlLocalUnplacedImgSize;
  }
  if (_tlLocalSplit !== null) {
    _tlLocalSplit = Math.max(30, Math.min(70, _tlLocalSplit));
    if (tlSplitSlider) tlSplitSlider.value = _tlLocalSplit;
    if (tlSplitValueInput) tlSplitValueInput.value = _tlLocalSplit;
    if (tlSplitValueInputRight) tlSplitValueInputRight.value = 100 - _tlLocalSplit;
    document.documentElement.style.setProperty('--tl-split', _tlLocalSplit);
  }
  // Re-render la Tier List avec la bonne tierlist active
  if (typeof tlRender === 'function') tlRender();
  if (typeof renderHomePage === 'function') renderHomePage();
}

// ──────────────────────────────────────────────
// État global Bingo
// ──────────────────────────────────────────────

// Préférences visuelles — stockées dans Firebase /users/{uid}/prefs
let _localFontScale  = 1;
let _localShowNewBadge = true;

function _saveLocalActiveFolderId(id) { saveUserPrefs({ activeFolderId: id || null }); }

function saveLocalFontScale(scale) {
  _localFontScale = Math.max(0.5, Math.min(3, scale));
  saveUserPrefs({ fontScale: _localFontScale });
}

function saveLocalShowNewBadge(shown) {
  _localShowNewBadge = !!shown;
  saveUserPrefs({ showNewBadge: _localShowNewBadge });
}

// IDs des grilles sélectionnées (affichées simultanément, nombre illimité)
// Stocké par dossier : { [folderId]: [gridId, ...] }
let _selectedGridIds = [];
let _selectedGridsByFolder = {};
let _draggingGridWrapper = false;

const _EMPTY_SELECTION = '__empty__';

function saveLocalSelectedGrids(ids) {
  _selectedGridIds = ids.slice();
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

// Compose le nom affiché d'un dossier numéroté (saison/épisode) : "S01" ou "S01 La Guerre des Chefs"
// (numéro toujours affiché sur 2 chiffres minimum : 01, 02, ... 10, 11...).
// numbering.subtitle est conservé (à part de folder.name) pour pouvoir reformater le nom lors d'une
// duplication (auto-incrément du numéro en gardant le même sous-titre si aucun nouveau n'est fourni).
function formatNumberedFolderName(numbering) {
  const prefix = numbering.type === 'episode' ? 'Ep' : 'S';
  const base = prefix + String(numbering.number).padStart(2, '0');
  return numbering.subtitle ? `${base} ${numbering.subtitle}` : base;
}

function defaultFolder(name, withGrid = false, numbering = null) {
  const now = Date.now();
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
    children: [],     // références ordonnées
    createdAt: now,
    updatedAt: now,
    numbering: numbering || null   // { type: 'season'|'episode', number: N } ou null
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
    if (!Array.isArray(raw.elementPresets)) raw.elementPresets = [];
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

  if (!Array.isArray(raw.elementPresets)) raw.elementPresets = [];

  return raw;
}

let state = initState();
let _bingoRemoteUpdate = false;
let _firebaseReady = false;
let _prefsReady    = false;
// activeFolderId est chargé depuis Firebase /users/{uid}/prefs
let _localActiveFolderId   = null;
// Vue du panneau Dossiers Bingo : 'list' (façon Explorateur, lignes) ou 'icons' (façon Explorateur,
// tuiles) — les deux partagent la même navigation par niveau (_foldersNavFolderId), seule la
// présentation change. Chargé depuis prefs.
let _foldersViewMode = 'list';
// Dossier actuellement ouvert dans le panneau Dossiers (null = racine), partagé entre vue liste et
// vue icônes — indépendant de _localActiveFolderId : naviguer dans le panneau ne doit pas changer
// le dossier bingo actif tant qu'on n'a pas explicitement "ouvert" un dossier-bingo.
let _foldersNavFolderId = null;

function initState() {
  return { folders: [], trash: [], currentEventFolderId: null, currentEventTierlistId: null, elementPresets: [] };
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
        const parts = ['Liste'];
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
        const fullPath = parts.join(' \\ ');
        lbl.textContent = fullPath;
        document.getElementById('btn-ce-navigate').title = 'Aller à la soirée en cours\n' + fullPath;
      }
      const onTlPage = document.getElementById('page-tierlist')?.classList.contains('active');
      const alreadyHere = onTlPage && _tlLocalActiveTierlistId === ceTl;
      btn.classList.toggle('ce-nav-disabled', alreadyHere);
      _updateCeSetHeaderBtn();
      return;
    }
    // TL introuvable ou archivée — nettoyer
    state.currentEventTierlistId = null;
    saveState();
  }

  const cef = state.currentEventFolderId;
  if (!cef) { btn.style.display = 'none'; _updateCeSetHeaderBtn(); return; }
  const folder = findFolderById(state.folders, cef);
  if (!folder || folder.archived) { btn.style.display = 'none'; _updateCeSetHeaderBtn(); return; }
  btn.style.display = 'flex';
  if (lbl) {
    const path = getFolderPath(state.folders, cef);
    const fullPath = 'Bingo \\ ' + path.map(f => f.name).join(' \\ ');
    lbl.textContent = fullPath;
    document.getElementById('btn-ce-navigate').title = 'Aller à la soirée en cours\n' + fullPath;
  }
  const onBingoPage = document.getElementById('page-bingo')?.classList.contains('active');
  const alreadyHereBingo = onBingoPage && _localActiveFolderId === cef;
  btn.classList.toggle('ce-nav-disabled', alreadyHereBingo);
  _updateCeSetHeaderBtn();
}

// Un seul bouton physique "Définir soirée en cours" (#btn-ce-set-header), déplacé en JS selon
// la page active — même pattern que #font-scale-label (Bingo) / #tl-split-slider-label (Tier
// List) : jamais deux jeux de contrôles désynchronisés. Sur Bingo, il vit juste après le bouton
// Grilles (#btn-grids-dropdown) en ligne 1 du panneau bingo ; sur Tier List, juste après le
// bouton Liste (#tl-btn-tierlist-dropdown) en ligne 1 du panneau tierlist. Masqué sur Accueil/
// Dossiers (retombe dans le header, sa position d'origine dans le HTML).
function _placeCeSetHeaderBtn() {
  const ceSet = document.getElementById('btn-ce-set-header');
  if (!ceSet) return;
  const onTlPage = document.getElementById('page-tierlist')?.classList.contains('active');
  const onBingoPage = document.getElementById('page-bingo')?.classList.contains('active');
  if (onBingoPage) {
    const gridsBtn = document.getElementById('btn-grids-dropdown');
    if (gridsBtn && gridsBtn.nextSibling !== ceSet) gridsBtn.insertAdjacentElement('afterend', ceSet);
  } else if (onTlPage) {
    const listWrap = document.getElementById('tl-btn-tierlist-dropdown')?.closest('.tl-labeled-btn');
    if (listWrap && listWrap.nextSibling !== ceSet) listWrap.insertAdjacentElement('afterend', ceSet);
  }
}

// État (grisé si la page active est déjà la soirée en cours) dépend de la page affichée —
// appelé à chaque renderCurrentEventButton(), indépendamment de la branche bingo/tierlist qui a matché.
function _updateCeSetHeaderBtn() {
  const ceSet = document.getElementById('btn-ce-set-header');
  if (!ceSet) return;
  const onHomePage = document.getElementById('page-home')?.classList.contains('active');
  const onFoldersPage = document.getElementById('page-folders')?.classList.contains('active');
  if (onHomePage || onFoldersPage) {
    ceSet.style.display = 'none';
    return;
  }
  _placeCeSetHeaderBtn();
  ceSet.style.display = '';
  const onTlPage = document.getElementById('page-tierlist')?.classList.contains('active');
  let isCurrentEvent;
  if (onTlPage) {
    const tl = (typeof tlActiveTierlist === 'function') ? tlActiveTierlist() : null;
    const root = tl && typeof _tlGroupRoot === 'function' ? _tlGroupRoot(tl) : tl;
    isCurrentEvent = root && state.currentEventTierlistId === root.id;
  } else {
    isCurrentEvent = _localActiveFolderId && state.currentEventFolderId === _localActiveFolderId;
  }
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

let _pendingCurrentEventTierlistId = null;

function confirmSetCurrentEventTierlist(id) {
  // Une tierlist membre d'un groupe (générée depuis un template) doit toujours définir
  // le template racine comme soirée en cours, jamais une tierlist individuelle du groupe.
  const tlRaw = (tlState.tierlists || []).find(t => t.id === id);
  const root = tlRaw && typeof _tlGroupRoot === 'function' ? _tlGroupRoot(tlRaw) : tlRaw;
  const targetId = root ? root.id : id;

  // Retirer la soirée en cours ne nécessite pas de confirmation, seulement la définir
  if (state.currentEventTierlistId === targetId) {
    setCurrentEventTierlist(targetId);
    return;
  }
  _pendingCurrentEventTierlistId = targetId;
  const msg = document.getElementById('modal-current-event-msg');
  if (msg) msg.textContent = root ? `Définir "${root.name}" comme soirée en cours ?` : 'Définir cette liste comme soirée en cours ?';
  document.getElementById('modal-confirm-current-event').classList.remove('hidden');
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

function createFolder(name, parentId = null, numbering = null) {
  const folder = defaultFolder(name, false, numbering);
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
    touchFolderChain(parentId);
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
      _selectedGridIds = (f.grids || []).filter(g => !g.archived).map(g => g.id);
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
    touchFolderChain(parent.id);
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
  if (folder && newName.trim()) { folder.name = newName.trim(); touchFolderChain(id); }
  saveState();
  renderAllFolders();
}

// Dossier "épisode précédent" du dossier actif : parmi ses frères (même parent) de type 'episode',
// celui dont le numbering.number est le plus grand tout en restant strictement inférieur au sien.
// Retourne null si le dossier actif n'est pas lui-même un épisode numéroté, ou si aucun épisode
// précédent n'existe parmi ses frères.
function _previousEpisodeFolder(folder) {
  if (!folder || !folder.numbering || folder.numbering.type !== 'episode') return null;
  const parent = findParentFolder(state.folders, folder.id);
  const siblings = parent ? (parent.folders || []) : (state.folders || []);
  let best = null;
  siblings.forEach(f => {
    if (f.id === folder.id || !f.numbering || f.numbering.type !== 'episode') return;
    if (f.numbering.number >= folder.numbering.number) return;
    if (!best || f.numbering.number > best.numbering.number) best = f;
  });
  return best;
}

// Ensemble des textes de case (normalisés : trim + minuscule) actifs (non archivés) de l'épisode
// précédent du dossier donné — utilisé pour repérer les cases "nouvelles" (badge NEW).
// Retourne null si le dossier n'a pas d'épisode précédent (fonctionnalité inapplicable).
function _previousEpisodeActiveTextSet(folder) {
  const prev = _previousEpisodeFolder(folder);
  if (!prev) return null;
  const prevArchivedIds = prev.archivedElementIds || [];
  const set = new Set();
  (prev.elements || []).forEach(el => {
    if (prevArchivedIds.includes(el.id)) return;
    set.add((el.text || '').trim().toLowerCase());
  });
  return set;
}

// Numéro suivant pour un dossier numéroté du même type (saison/épisode) parmi ses frères (même parent)
function _nextFolderNumber(siblings, type) {
  const nums = siblings.filter(f => f.numbering && f.numbering.type === type).map(f => f.numbering.number);
  return nums.length ? Math.max(...nums) + 1 : 1;
}

// explicitNumbering : objet {type, number, subtitle} déjà choisi par l'utilisateur dans la modal
// (prioritaire) — si absent, on retombe sur l'auto-incrément à partir de la numérotation source.
function duplicateFolder(id, name, explicitNumbering) {
  const src = findFolderById(state.folders, id);
  if (!src) return;
  const copy = JSON.parse(JSON.stringify(src));
  function remapIds(f) {
    f.id = uid();
    f.archived = false;
    const now = Date.now();
    f.createdAt = now;
    f.updatedAt = now;
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
  if (explicitNumbering) {
    copy.numbering = explicitNumbering;
    copy.name = formatNumberedFolderName(copy.numbering);
  } else if (src.numbering) {
    const parentForNumbering = findParentFolder(state.folders, id);
    const siblingsForNumbering = parentForNumbering ? (parentForNumbering.folders || []) : (state.folders || []);
    const subtitle = name || src.numbering.subtitle || '';
    copy.numbering = { type: src.numbering.type, number: _nextFolderNumber(siblingsForNumbering, src.numbering.type), subtitle };
    copy.name = formatNumberedFolderName(copy.numbering);
  } else {
    copy.numbering = null;
    copy.name = name || src.name + ' (copie)';
  }
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

function importElements(sourceId, targetId, replace = false) {
  const src = findFolderById(state.folders, sourceId);
  const dst = findFolderById(state.folders, targetId);
  if (!src || !dst) return;
  const srcElements = src.elements || [];
  if (srcElements.length === 0) return;
  if (replace) {
    dst.elements = [];
    dst.archivedElementIds = [];
    (dst.grids || []).forEach(g => {
      g.grid = g.grid.map(cell => ({ elementId: null, checked: false, color: null }));
    });
  }
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
  renderGrid();
  return added;
}

// Importe une liste de textes (preset) dans un dossier, avec option de remplacement.
function importElementTexts(texts, targetId, replace = false) {
  const dst = findFolderById(state.folders, targetId);
  if (!dst || !texts || texts.length === 0) return 0;
  if (replace) {
    dst.elements = [];
    dst.archivedElementIds = [];
    (dst.grids || []).forEach(g => {
      g.grid = g.grid.map(cell => ({ elementId: null, checked: false, color: null }));
    });
  }
  if (!dst.elements) dst.elements = [];
  const existingTexts = new Set(dst.elements.map(e => e.text.trim().toLowerCase()));
  let added = 0;
  texts.forEach(text => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!existingTexts.has(trimmed.toLowerCase())) {
      dst.elements.push({ id: uid(), text: trimmed });
      existingTexts.add(trimmed.toLowerCase());
      added++;
    }
  });
  saveState();
  renderElements();
  renderGrid();
  return added;
}

// ──────────────────────────────────────────────
// Presets de cases (globaux, réutilisables entre dossiers)
// ──────────────────────────────────────────────
function getElementPresets() {
  if (!Array.isArray(state.elementPresets)) state.elementPresets = [];
  return state.elementPresets;
}

function saveElementPreset(name, texts) {
  getElementPresets().push({ id: uid(), name: name.trim(), elements: texts.map(t => t.trim()).filter(Boolean) });
  saveState();
}

function updateElementPreset(id, name, texts) {
  const preset = getElementPresets().find(p => p.id === id);
  if (!preset) return;
  preset.name = name.trim();
  preset.elements = texts.map(t => t.trim()).filter(Boolean);
  saveState();
}

function deleteElementPreset(id) {
  state.elementPresets = getElementPresets().filter(p => p.id !== id);
  saveState();
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
const gridError        = document.getElementById('grid-error');
const btnNewGrid       = document.getElementById('btn-new-grid');
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
// Bouton "New" (visible seulement quand le dossier actif est un épisode ayant un épisode
// précédent parmi ses frères) : bascule l'affichage du badge NEW sur les cases nouvelles.
const btnToggleNewBadge = document.getElementById('btn-toggle-new-badge');
function _updateNewBadgeButton() {
  if (!btnToggleNewBadge) return;
  const s = activeSubtheme();
  const applicable = !!(s && _previousEpisodeFolder(s));
  btnToggleNewBadge.classList.toggle('hidden', !applicable);
  btnToggleNewBadge.setAttribute('aria-pressed', _localShowNewBadge ? 'true' : 'false');
  btnToggleNewBadge.innerHTML = `<i data-lucide="${_localShowNewBadge ? 'eye' : 'eye-off'}"></i> New`;
  if (window.lucide) lucide.createIcons();
}
btnToggleNewBadge?.addEventListener('click', () => {
  saveLocalShowNewBadge(!_localShowNewBadge);
  _updateNewBadgeButton();
  renderGrid();
});
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
// Reconstruire la liste des cases est coûteux (tri + scan de toutes les grilles
// par case) : inutile de le faire pendant que le panneau est fermé et invisible.
// On le rattrape via openCasesPanel() qui force un render à l'ouverture.
let _casesPanelDirty = false;
function renderElements() {
  const panelEl = document.getElementById('cases-panel');
  if (panelEl && !panelEl.classList.contains('open')) {
    _casesPanelDirty = true;
    return;
  }
  _casesPanelDirty = false;
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

function clearAllElements() {
  const s = activeSubtheme();
  if (!s) return;
  s.elements = [];
  s.archivedElementIds = [];
  (s.grids || []).forEach(g => {
    g.grid = g.grid.map(cell => ({ elementId: null, checked: false, color: null }));
  });
  saveState();
  renderElements();
  renderGrid();
}

function clearArchivedElements() {
  const s = activeSubtheme();
  if (!s) return;
  const archivedIds = s.archivedElementIds || [];
  if (archivedIds.length === 0) return;
  s.elements = (s.elements || []).filter(e => !archivedIds.includes(e.id));
  s.archivedElementIds = [];
  (s.grids || []).forEach(g => {
    g.grid = g.grid.map(cell =>
      archivedIds.includes(cell.elementId) ? { elementId: null, checked: false, color: null } : cell
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
  const fsContainer = document.getElementById('bingo-fullscreen-breadcrumb');
  if (container) container.innerHTML = '';
  if (fsContainer) fsContainer.textContent = '';
  const path = _localActiveFolderId ? getFolderPath(state.folders, _localActiveFolderId) : [];
  if (fsContainer) fsContainer.textContent = path.map(f => f.name).join(' \\ ');
  const pathLabel = document.getElementById('path-dropdown-label');
  if (pathLabel) pathLabel.textContent = path.length ? path.map(f => f.name).join(' \\ ') : 'Racine';
  if (!container || !_localActiveFolderId) return;
  path.forEach((f, i) => {
    if (i > 0) {
      const sep = document.createElement('span');
      sep.className = 'grids-breadcrumb-sep';
      sep.textContent = '\\';
      container.appendChild(sep);
    }
    const span = document.createElement('span');
    span.className = 'grids-breadcrumb-item' + (i === path.length - 1 ? ' last' : '');
    span.textContent = f.name;
    container.appendChild(span);
  });
}

// ── Bouton Chemin (mode normal) : arborescence pliable/dépliable des dossiers, même comportement
// que le bouton Chemin de la partie Tier List (voir _tlRenderPathMenuRows/_tlGoToFolder). Les
// dossiers bingo sont imbriqués (folder.folders), pas une liste plate avec parentId comme tlState.
function _renderPathMenuRows(menu, rootFolders, resetPathExpansion) {
  menu.querySelectorAll('.tl-path-menu-row').forEach(el => el.remove());

  const currentPathIds = _localActiveFolderId
    ? getFolderPath(rootFolders, _localActiveFolderId).map(f => f.id)
    : [];

  // À chaque (ré)ouverture du dropdown (pas lors des re-rendus internes causés par un clic sur une
  // flèche), le chemin actif redémarre toujours déplié, même s'il avait été replié manuellement lors
  // d'une ouverture précédente — le repli manuel ne "tient" que pendant que le menu reste ouvert.
  if (resetPathExpansion) currentPathIds.forEach(id => sessionStorage.removeItem('bingo_folder_open_' + id));

  const buildRow = (folder, depth) => {
    const children = (folder.folders || []).filter(f => !f.archived);
    const hasChildren = children.length > 0;
    const key = 'bingo_folder_open_' + folder.id;
    const isOnCurrentPath = currentPathIds.includes(folder.id);
    // Déplié par défaut sur le chemin actif, mais seulement tant que l'utilisateur n'a pas explicitement
    // replié/déplié ce dossier lui-même (sessionStorage prend le dessus dès qu'il existe).
    const stored = sessionStorage.getItem(key);
    const isOpen = stored !== null ? stored === '1' : isOnCurrentPath;

    const row = document.createElement('div');
    row.className = 'tl-path-menu-row' + (isOnCurrentPath ? ' active' : '');
    row.style.paddingLeft = (depth * 14) + 'px';

    const arrow = document.createElement('span');
    arrow.className = 'tl-path-menu-arrow' + (isOpen ? ' open' : '');
    arrow.innerHTML = hasChildren ? '<i data-lucide="chevron-right"></i>' : '';
    if (hasChildren) {
      arrow.addEventListener('click', ev => {
        ev.stopPropagation();
        sessionStorage.setItem(key, isOpen ? '0' : '1');
        _renderPathMenuRows(menu, rootFolders);
      });
    }
    row.appendChild(arrow);

    const icon = document.createElement('span');
    icon.className = 'tl-path-menu-icon';
    icon.innerHTML = '<i data-lucide="folder"></i>';
    row.appendChild(icon);

    const name = document.createElement('span');
    name.className = 'tl-path-menu-name';
    name.textContent = folder.name;
    row.appendChild(name);

    row.addEventListener('click', () => {
      menu.classList.add('hidden');
      if (_localActiveFolderId !== folder.id) switchFolder(folder.id);
    });

    menu.appendChild(row);
    if (hasChildren && isOpen) children.forEach(f => buildRow(f, depth + 1));
  };

  const roots = (rootFolders || []).filter(f => !f.archived);
  roots.forEach(f => buildRow(f, 0));

  if (roots.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'tl-path-menu-row';
    empty.style.cssText = 'opacity:0.6;cursor:default;';
    empty.textContent = 'Aucun dossier';
    menu.appendChild(empty);
  }
  if (window.lucide) lucide.createIcons();
}

const _btnPathDropdown = document.getElementById('btn-path-dropdown');
const _pathDropdownMenu = document.getElementById('path-dropdown-menu');
if (_btnPathDropdown && _pathDropdownMenu) {
  _btnPathDropdown.addEventListener('click', e => {
    e.stopPropagation();
    const isOpen = !_pathDropdownMenu.classList.contains('hidden');
    if (isOpen) {
      _pathDropdownMenu.classList.add('hidden');
    } else {
      _pathDropdownMenu.classList.remove('hidden');
      positionCtxMenu(_pathDropdownMenu, null, _btnPathDropdown);
      _renderPathMenuRows(_pathDropdownMenu, state.folders, true);
    }
  });
  _pathDropdownMenu.addEventListener('click', e => e.stopPropagation());
  document.addEventListener('click', () => _pathDropdownMenu.classList.add('hidden'));
}

// Tri des dossiers dans les drawers Dossiers (bingo + tierlist) : toujours trié, pas de mode manuel
// (pas de drag&drop de réordonnancement — "Déplacer" dans le menu contextuel reste le seul moyen de
// changer un dossier de parent).
function _folderSortMode(key) {
  const mode = localStorage.getItem(key);
  return ['alpha', 'alpha-desc', 'updatedAt', 'updatedAt-asc'].includes(mode) ? mode : 'alpha';
}
function _sortFoldersList(list, mode) {
  const sorted = list.slice();
  if (mode === 'updatedAt' || mode === 'updatedAt-asc') {
    sorted.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    if (mode === 'updatedAt-asc') sorted.reverse();
  } else {
    sorted.sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
    if (mode === 'alpha-desc') sorted.reverse();
  }
  return sorted;
}

// Remonte updatedAt = Date.now() sur folderId et tous ses ancêtres (pour le tri "Date de modification").
function touchFolderChain(folderId) {
  if (!folderId) return;
  const now = Date.now();
  getFolderPath(state.folders, folderId).forEach(f => { f.updatedAt = now; });
}

// Aplatit récursivement l'arbre de dossiers (non archivés) pour trouver les plus récemment modifiés.
function _flattenFoldersForRecent(folders) {
  const out = [];
  (folders || []).forEach(f => {
    if (f.archived) return;
    out.push(f);
    out.push(..._flattenFoldersForRecent(f.folders));
  });
  return out;
}

// Parmi une liste de dossiers déjà triés par updatedAt décroissant, retire tout dossier qui est
// ancêtre d'un dossier déjà retenu — touchFolderChain() propage le même timestamp à toute la
// chaîne, donc sans ça un même événement de modification ferait apparaître plusieurs fois le même
// chemin (dossier, parent, grand-parent...) au lieu du seul dossier le plus profond concerné.
function _dedupeAncestorFolders(sorted, getAncestorIds) {
  const kept = [];
  const keptAncestorIds = new Set();
  for (const f of sorted) {
    if (keptAncestorIds.has(f.id)) continue; // f est déjà l'ancêtre d'un dossier plus profond retenu
    kept.push(f);
    getAncestorIds(f.id).forEach(id => keptAncestorIds.add(id));
  }
  return kept;
}

// Même filtrage que _homeRenderRecentBingo (page d'accueil) : seuls les dossiers-bingo (au moins
// une grille non archivée), même titre/icône.
function _renderRecentFolderPaths() {
  const container = document.getElementById('folders-panel-recent');
  if (!container) return;
  container.innerHTML = '';
  const ancestorIdsOf = id => getFolderPath(state.folders, id).slice(0, -1).map(f => f.id);
  const sorted = _flattenFoldersForRecent(state.folders)
    .filter(f => f.updatedAt && (f.grids || []).some(g => !g.archived))
    // À updatedAt égal (même événement, propagé par touchFolderChain à toute la chaîne), le dossier
    // le plus profond doit être considéré en premier pour que la déduplication le retienne, lui.
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0) || ancestorIdsOf(b.id).length - ancestorIdsOf(a.id).length);
  const recent = _dedupeAncestorFolders(sorted, ancestorIdsOf);
  if (recent.length === 0) return;

  const title = document.createElement('div');
  title.className = 'fp-recent-title';
  title.textContent = 'Bingos récents';
  container.appendChild(title);

  const list = document.createElement('div');
  list.className = 'fp-recent-list';
  recent.forEach(f => {
    const row = document.createElement('div');
    row.className = 'fp-recent-row';
    const icon = document.createElement('span');
    icon.className = 'fp-recent-icon';
    icon.innerHTML = '<i data-lucide="grid-3x3"></i>';
    const path = document.createElement('span');
    path.className = 'fp-recent-path';
    path.textContent = getFolderPath(state.folders, f.id).map(x => x.name).join(' \\ ');
    row.appendChild(icon);
    row.appendChild(path);
    row.addEventListener('click', () => {
      const ancestors = getFolderPath(state.folders, f.id).slice(0, -1);
      _foldersNavFolderId = ancestors.length ? ancestors[ancestors.length - 1].id : null;
      if (_localActiveFolderId !== f.id) switchFolder(f.id);
    });
    list.appendChild(row);
  });
  container.appendChild(list);
}

// Menu ⋮ / clic droit d'un dossier bingo — partagé entre la vue liste et la vue icônes.
function _openBingoFolderCtxMenu(f, e, anchor, openThisFolder) {
  e.stopPropagation();
  const { addItem } = _tlMakeCtxMenu(anchor, e, { title: f.name });
  addItem('folder-open', 'Ouvrir',              false, openThisFolder);
  addItem('folder-closed', 'Nouveau sous-dossier', false, () => openNewFolderModal(f.id));
  addItem('pencil', 'Renommer',             false, () => openRenameFolderModal(f.id));
  addItem('copy-plus', 'Dupliquer',            false, () => openDuplicateFolderModal(f.id));
  addItem('bar-chart-2', 'Statistiques',       false, () => openBingoStatsModal(f));
  addItem('move', 'Déplacer',            false, () => openMoveFolderModal(f.id));
  const ceIsActive = state.currentEventFolderId === f.id;
  const ceLabel = ceIsActive ? 'Retirer soirée en cours' : 'Définir comme soirée en cours';
  addItem('party-popper', ceLabel,                  false, () => confirmSetCurrentEventFolder(f.id));

  addItem('package', 'Archiver',            true,  () => archiveFolder(f.id));
  addItem('trash-2', 'Supprimer',           true,  () => deleteFolder(f.id));
}

// Bascule vue liste / vue icônes du panneau Dossiers Bingo (préférence mémorisée).
function _setFoldersViewMode(mode) {
  if (_foldersViewMode === mode) return;
  _foldersViewMode = mode;
  saveUserPrefs({ foldersViewMode: mode });
  renderAllFolders();
}

document.getElementById('fp-view-toggle-list').addEventListener('click', () => _setFoldersViewMode('list'));
document.getElementById('fp-view-toggle-icons').addEventListener('click', () => _setFoldersViewMode('icons'));

// Fil d'Ariane partagé entre vue liste et vue icônes du panneau Dossiers Bingo — navigue via
// _foldersNavFolderId, le même niveau courant que consomment les deux fonctions de rendu ci-dessous.
function _renderFoldersBreadcrumb(onNavigate) {
  const crumbContainer = document.getElementById('fp-icons-breadcrumb');
  if (!crumbContainer) return { currentFolder: null, path: [] };

  const currentFolder = _foldersNavFolderId ? findFolderById(state.folders, _foldersNavFolderId) : null;
  if (_foldersNavFolderId && !currentFolder) _foldersNavFolderId = null;
  const path = _foldersNavFolderId ? getFolderPath(state.folders, _foldersNavFolderId) : [];

  crumbContainer.innerHTML = '';
  const rootCrumb = document.createElement('span');
  rootCrumb.className = 'fp-icons-crumb' + (path.length === 0 ? ' current' : '');
  rootCrumb.textContent = 'Racine';
  rootCrumb.addEventListener('click', () => { if (path.length) { _foldersNavFolderId = null; onNavigate(); } });
  crumbContainer.appendChild(rootCrumb);
  path.forEach((f, i) => {
    const sep = document.createElement('span');
    sep.className = 'fp-icons-crumb-sep';
    sep.textContent = '\\';
    crumbContainer.appendChild(sep);
    const crumb = document.createElement('span');
    const isLast = i === path.length - 1;
    crumb.className = 'fp-icons-crumb' + (isLast ? ' current' : '');
    crumb.textContent = f.name;
    if (!isLast) crumb.addEventListener('click', () => { _foldersNavFolderId = f.id; onNavigate(); });
    crumbContainer.appendChild(crumb);
  });

  return { currentFolder, path };
}

// Vue icônes du panneau Dossiers Bingo (façon Explorateur de fichiers) : grille de tuiles pour le
// seul niveau courant (_foldersNavFolderId, null = racine), navigation par double-clic + fil d'Ariane.
function _renderFoldersPanelIcons() {
  const treeContainer = document.getElementById('folders-panel-icons');
  if (!treeContainer) return;
  treeContainer.innerHTML = '';

  const sortMode = _folderSortMode('bingoFoldersSortMode');
  const sortSelect = document.getElementById('folders-sort-select');
  if (sortSelect) sortSelect.value = sortMode;

  const { currentFolder } = _renderFoldersBreadcrumb(_renderFoldersPanelIcons);

  const listSource = currentFolder ? (currentFolder.folders || []) : (state.folders || []);
  const items = _sortFoldersList(listSource.filter(f => !f.archived), sortMode);

  if (items.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'fp-icon-tile-empty';
    empty.textContent = 'Aucun dossier ici.';
    treeContainer.appendChild(empty);
    if (window.lucide) lucide.createIcons();
    return;
  }

  items.forEach(f => {
    const isBingoFolder = (f.grids || []).length > 0;
    const isActive = f.id === _localActiveFolderId;

    const tile = document.createElement('div');
    tile.className = 'fp-icon-tile' + (isBingoFolder ? ' is-bingo' : '') + (isActive ? ' active' : '');
    tile.dataset.folderId = f.id;

    const iconEl = document.createElement('div');
    iconEl.className = 'fp-icon-tile-icon';
    iconEl.innerHTML = isBingoFolder ? '<i data-lucide="grid-3x3"></i>' : '<i data-lucide="folder"></i>';

    const nameEl = document.createElement('div');
    nameEl.className = 'fp-icon-tile-name';
    nameEl.textContent = f.name;
    nameEl.addEventListener('mouseenter', () => _showAppTooltipIfTruncated(nameEl));
    nameEl.addEventListener('mouseleave', _hideAppTooltip);

    const ctxBtn = document.createElement('button');
    ctxBtn.className = 'fp-icon-tile-ctx-btn';
    ctxBtn.innerHTML = '<i data-lucide="ellipsis-vertical"></i>';
    ctxBtn.title = 'Options';

    tile.appendChild(ctxBtn);
    tile.appendChild(iconEl);
    tile.appendChild(nameEl);

    const openThisFolder = () => { if (_localActiveFolderId !== f.id) switchFolder(f.id); _switchPage('bingo'); };
    const openMenu = e => _openBingoFolderCtxMenu(f, e, tile, openThisFolder);

    // Simple clic : un dossier contenant des grilles (is-bingo) s'ouvre directement, même s'il a
    // aussi des sous-dossiers — sinon (dossier "conteneur" pur) on descend dedans façon Explorateur.
    tile.addEventListener('click', e => {
      if (e.target === ctxBtn || ctxBtn.contains(e.target)) return;
      e.stopPropagation();
      treeContainer.querySelectorAll('.fp-icon-tile.selected').forEach(t => t.classList.remove('selected'));
      tile.classList.add('selected');
      if (isBingoFolder) openThisFolder();
      else { _foldersNavFolderId = f.id; _renderFoldersPanelIcons(); }
    });
    ctxBtn.addEventListener('click', openMenu);
    tile.addEventListener('contextmenu', e => { e.preventDefault(); openMenu(e); });

    treeContainer.appendChild(tile);
  });

  if (window.lucide) lucide.createIcons();
}

// Vue liste du panneau Dossiers Bingo, façon Explorateur de fichiers en mode "Liste" : lignes
// plates du seul niveau courant (même navigation que la vue icônes, _foldersNavFolderId), plus
// d'arborescence dépliable — double-clic descend d'un niveau, le fil d'Ariane remonte.
function renderFoldersPanelTree() {
  const container = document.getElementById('folders-panel-tree');
  if (!container) return;

  document.getElementById('fp-view-toggle-list').classList.toggle('active', _foldersViewMode === 'list');
  document.getElementById('fp-view-toggle-icons').classList.toggle('active', _foldersViewMode === 'icons');
  container.classList.toggle('hidden', _foldersViewMode !== 'list');
  document.getElementById('folders-panel-icons').classList.toggle('hidden', _foldersViewMode !== 'icons');

  _renderRecentFolderPaths();

  if (_foldersViewMode === 'icons') { _renderFoldersPanelIcons(); return; }

  container.innerHTML = '';

  const sortMode = _folderSortMode('bingoFoldersSortMode');
  const sortSelect = document.getElementById('folders-sort-select');
  if (sortSelect) sortSelect.value = sortMode;

  const { currentFolder } = _renderFoldersBreadcrumb(renderFoldersPanelTree);

  const listSource = currentFolder ? (currentFolder.folders || []) : (state.folders || []);
  const items = _sortFoldersList(listSource.filter(f => !f.archived), sortMode);

  if (items.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'fp-empty';
    empty.textContent = 'Aucun dossier ici.';
    container.appendChild(empty);
    return;
  }

  items.forEach(f => {
    const isActive = f.id === _localActiveFolderId;
    const isBingoFolder = (f.grids || []).length > 0;

    const row = document.createElement('div');
    row.className = 'fp-folder-row' + (isBingoFolder ? ' fp-list-item' : '') + (isActive ? ' active' : '');
    row.dataset.folderId = f.id;

    const icon = document.createElement('span');
    icon.className = 'fp-folder-icon';
    icon.innerHTML = isBingoFolder ? '<i data-lucide="grid-3x3"></i>' : '<i data-lucide="folder"></i>';

    const name = document.createElement('span');
    name.className = 'fp-folder-name';
    name.textContent = f.name;

    const ctxBtn = document.createElement('button');
    ctxBtn.className = 'fp-folder-ctx-btn';
    ctxBtn.innerHTML = '<i data-lucide="ellipsis-vertical"></i>';
    ctxBtn.title = 'Options';

    row.appendChild(icon);
    row.appendChild(name);
    row.appendChild(ctxBtn);

    const openThisFolder = () => { if (_localActiveFolderId !== f.id) switchFolder(f.id); _switchPage('bingo'); };

    // Simple clic : même règle que la vue icônes — un dossier-bingo s'ouvre directement, un dossier
    // conteneur pur descend d'un niveau.
    row.addEventListener('click', e => {
      if (e.target === ctxBtn || ctxBtn.contains(e.target)) return;
      container.querySelectorAll('.fp-folder-row.selected').forEach(r => r.classList.remove('selected'));
      row.classList.add('selected');
      if (isBingoFolder) openThisFolder();
      else { _foldersNavFolderId = f.id; renderFoldersPanelTree(); }
    });

    const openFolderMenu = (e, anchor) => _openBingoFolderCtxMenu(f, e, anchor, openThisFolder);
    ctxBtn.addEventListener('click', e => openFolderMenu(e, row));
    row.addEventListener('contextmenu', e => { e.preventDefault(); openFolderMenu(e, null); });

    container.appendChild(row);
  });

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

// ── Page dédiée Dossiers (remplace les anciens drawers latéraux Bingo/Tier List) ──
// _foldersPageActiveTab n'est pas persisté (juste en mémoire) : à chaque ouverture explicite d'un
// onglet précis (ex. depuis un bouton "Dossiers" propre à Bingo ou Tier List), on force l'onglet
// demandé plutôt que de garder le dernier visité, plus prévisible pour l'utilisateur.
let _foldersPageActiveTab = 'bingo';

function _switchFoldersPageTab(tab) {
  _foldersPageActiveTab = tab;
  document.getElementById('folders-page-tab-bingo').classList.toggle('active', tab === 'bingo');
  document.getElementById('folders-page-tab-tierlist').classList.toggle('active', tab === 'tierlist');
  document.getElementById('folders-page-panel-bingo').classList.toggle('hidden', tab !== 'bingo');
  document.getElementById('folders-page-panel-tierlist').classList.toggle('hidden', tab !== 'tierlist');
  _renderFoldersPage();
}

function _renderFoldersPage() {
  if (_foldersPageActiveTab === 'bingo') renderFoldersPanelTree();
  else tlRenderList();
  if (window.lucide) lucide.createIcons();
}

// Ouvre la page Dossiers directement sur l'onglet demandé (ou l'onglet courant si non précisé).
function openFoldersPage(tab) {
  if (tab) _switchFoldersPageTab(tab);
  _switchPage('folders');
  saveUserPrefs({ activePage: 'folders' });
}

// Stubs de compat : anciens noms encore appelés depuis divers call sites historiques.
function openFoldersPanel() { openFoldersPage('bingo'); }
function closeFoldersPanel() {}
function openTlSidebar() { openFoldersPage('tierlist'); }
function closeTlSidebar() {}

document.getElementById('folders-page-tab-bingo').addEventListener('click', () => _switchFoldersPageTab('bingo'));
document.getElementById('folders-page-tab-tierlist').addEventListener('click', () => _switchFoldersPageTab('tierlist'));

// "+ Bingo" : même mécanisme que "Nouveau Bingo" sur l'accueil (home-btn-bingo-new-grid) — la
// modal "Nouveau dossier" affiche en plus sa section grille (_homeNewGridAfterFolder), dossier +
// première grille créés en une seule action. Racine par défaut (null) ; l'utilisateur choisit
// l'emplacement réel dans la modal.
document.getElementById('btn-new-bingo-folder').addEventListener('click', () => {
  _homeNewGridAfterFolder = true;
  openNewFolderModal(null);
});

// Archives/Corbeille communes : ouvrent la modale correspondant à l'onglet actif.
document.getElementById('folders-page-btn-archives').addEventListener('click', () => {
  if (_foldersPageActiveTab === 'bingo') openArchivesUnified();
  else tlOpenArchivesUnified();
});
document.getElementById('folders-page-btn-trash').addEventListener('click', () => {
  if (_foldersPageActiveTab === 'bingo') openTrashUnified();
  else tlOpenTrashUnified();
});

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
  const pathStr = path.map(f => f.name).join(' \\ ');
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
    _selectedGridIds.unshift(g.id);
    saveLocalSelectedGrids(_selectedGridIds);
  }
  touchFolderChain(s.id);
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
  touchFolderChain(s.id);
  saveState();
  renderGridsList();
  renderGrid();
}

function renameGrid(id, newName) {
  const s = activeSubtheme();
  const g = s?.grids.find(g => g.id === id);
  if (g && newName.trim()) { g.name = newName.trim(); g.title = newName.trim(); if (s) touchFolderChain(s.id); }
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
  touchFolderChain(s.id);
  saveState();
  renderGridsList();
  renderGrid();
}

// Le rendu visuel des grilles (cocher/afficher, ⋮ options) se fait à la demande dans le menu
// déroulant "Grilles" (_renderGridsDropdownMenu) — cette fonction ne fait plus que garder l'état
// à jour (breadcrumb, bouton soirée en cours, nettoyage des sélections obsolètes).
function renderGridsList() {
  renderGridsBreadcrumb();
  _updateCeSetHeaderBtn();
  const s = activeSubtheme();
  if (!s) return;
  const activeGrids = s.grids.filter(g => !g.archived);
  // Nettoyer les ids sélectionnés obsolètes (grilles supprimées/archivées)
  _selectedGridIds = _selectedGridIds.filter(id => activeGrids.some(x => x.id === id));
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
  const t = activeTheme();
  if (!t || t.locked) return;
  const grids = getVisibleGrids();
  if (grids.length === 0) return;
  // Redimensionner toutes les grilles affichées ensemble, à partir de la taille de la première
  const newSize = grids[0].gridSize + delta;
  if (newSize < MIN_SIZE || newSize > MAX_SIZE) return;

  grids.forEach(g => {
    g.gridSize = newSize;
    // S'assurer que le tableau est toujours de taille MAX_SIZE² — on ne tronque jamais
    while (g.grid.length < MAX_SIZE * MAX_SIZE) {
      g.grid.push({ elementId: null, checked: false, color: null });
    }
  });

  saveState();
  renderGrid();
}


function applyFontScale() {
  const scale = _localFontScale;
  const pct = Math.round(scale * 100);
  fontScaleInput.value = pct;
  const fsValueInput = document.getElementById('font-scale-value-input');
  if (fsValueInput) fsValueInput.value = pct;

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
let _clearArchivedOnlyCallback = null; // callback du bouton "Archivées seulement" (modal-confirm-clear)
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
  const prevEpisodeTexts = _localShowNewBadge ? _previousEpisodeActiveTextSet(s) : null;

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
  titleInput.title = 'Renommer la grille';
  const _syncTitleInputSize = () => {
    titleInput.size = Math.max(1, (titleInput.value || titleInput.placeholder || '').length);
  };
  _syncTitleInputSize();
  titleInput.addEventListener('input', () => {
    _syncTitleInputSize();
    const sNow = activeSubtheme();
    if (!sNow) return;
    const gNow = sNow.grids.find(x => x.id === g.id);
    if (!gNow) return;
    const val = titleInput.value.trim();
    gNow.title = val;
    gNow.name = val || gNow.name;
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

  // Message bingo individuel, sur la même rangée que le titre, à droite
  if (bingoLines.length > 0) {
    const msg = document.createElement('div');
    msg.className = 'bingo-message-inline';
    const count = bingoLines.length;
    msg.innerHTML = count === 1
      ? `<i data-lucide="party-popper"></i> BINGO !`
      : `<i data-lucide="party-popper"></i> BINGO x${count} !`;
    titleRow.appendChild(msg);
  }

  // Contrôles par grille (ordre : Bloquer | Générer | Vider | Capture), à côté du nom
  const globalLocked = !!t.locked;
  const gridLocked = g.locked || globalLocked;

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

  const genDisabled = gridLocked || (!enoughForThis && !canFillEmpty);

  const btnSubGen = document.createElement('button');
  btnSubGen.className = 'btn-action btn-subgrid btn-subgrid-gen' + (genDisabled ? ' btn-disabled' : '');
  btnSubGen.disabled = genDisabled;
  btnSubGen.innerHTML = '<i data-lucide="dices"></i>';
  btnSubGen.title = genDisabled && !gridLocked
    ? `Pas assez d'éléments (${activeElemCount}/${cellCount})`
    : 'Générer aléatoirement cette grille';
  btnSubGen.addEventListener('click', () => openGenerateChoiceModal(g.id));

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

  // Cadre discret autour de Bloquer + Générer + Vider
  const lockGenGroup = document.createElement('div');
  lockGenGroup.className = 'subgrid-lock-gen-group';
  lockGenGroup.appendChild(lblLock);
  lockGenGroup.appendChild(btnSubGen);
  lockGenGroup.appendChild(btnSubClear);
  titleRow.appendChild(lockGenGroup);

  const btnSubCapture = document.createElement('button');
  btnSubCapture.className = 'btn-action btn-screenshot-bingo btn-subgrid grid-view-title-capture';
  btnSubCapture.innerHTML = '<i data-lucide="camera"></i>';
  btnSubCapture.title = 'Copier la grille dans le presse-papier';
  btnSubCapture.addEventListener('click', () => bingoScreenshotOne(g.id));
  titleRow.appendChild(btnSubCapture);

  wrapper.appendChild(titleRow);

  const gridEl = document.createElement('div');
  gridEl.className = 'bingo-grid';
  gridEl.title = '';
  gridEl.style.gridTemplateColumns = `repeat(${n}, 1fr)`;

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
      if (prevEpisodeTexts && el && !prevEpisodeTexts.has((el.text || '').trim().toLowerCase())) {
        const newBadge = document.createElement('span');
        newBadge.className = 'bingo-cell-new-badge';
        newBadge.textContent = 'NEW';
        div.appendChild(newBadge);
      }

      div.title = cell.checked ? 'Désactiver cette case' : 'Valider cette case' + (!gridLocked ? ' · Clic droit : vider' : '');
      div.addEventListener('click', () => {
        if (!cell.elementId) return;
        const newChecked = !cell.checked;
        const tNow = activeTheme();
        const sNow = activeSubtheme();
        // Cocher une case ne change la taille des grilles affichées QUE si ça complète ou casse
        // une ligne de bingo (le badge "BINGO !" modifie la hauteur de l'en-tête). On compare le
        // nombre de lignes de bingo de chaque grille visible avant/après pour le détecter, et
        // sauter le reflow coûteux de _adjustBingoGridSizes() dans le cas courant (aucun bingo).
        const visibleGridsBefore = getVisibleGrids();
        const lineCountsBefore = visibleGridsBefore.map(gx => getBingoResult(gx.gridSize, gx.grid.slice(0, gx.gridSize * gx.gridSize)).lines.length);
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
          touchFolderChain(sNow.id);
        }
        saveState();
        const visibleGridsAfter = getVisibleGrids();
        const lineCountsAfter = visibleGridsAfter.map(gx => getBingoResult(gx.gridSize, gx.grid.slice(0, gx.gridSize * gx.gridSize)).lines.length);
        const sameBingoState = visibleGridsBefore.length === visibleGridsAfter.length
          && lineCountsBefore.every((n, idx) => n === lineCountsAfter[idx]);
        renderGrid(sameBingoState);
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

  return { wrapper, bingoLines };
}

// "Reset" décoche toutes les cases de toutes les grilles non archivées du sous-thème actif — inutile
// (et donc désactivé) s'il n'y a ni dossier/sous-thème actif, si le dossier est verrouillé, ou si rien
// n'est actuellement coché (grilles ET persistentCheckedIds, que Reset vide aussi).
function updateResetButton() {
  const t = activeTheme();
  const s = activeSubtheme();
  if (!t || t.locked || !s) {
    btnReset.disabled = true;
    btnReset.classList.add('btn-disabled');
    return;
  }
  const hasCheckedCell = (s.grids || []).some(gx => !gx.archived && gx.grid.some(c => c.checked));
  const hasPersistent = (s.persistentCheckedIds || []).length > 0;
  const nothingToReset = !hasCheckedCell && !hasPersistent;
  btnReset.disabled = nothingToReset;
  btnReset.classList.toggle('btn-disabled', nothingToReset);
}

// skipSizeRecalc : true seulement quand l'appelant sait avec certitude que rien de
// dimensionnel n'a changé (ex : cocher une case) — évite le reflow synchrone coûteux
// de _adjustBingoGridSizes(). Par défaut false (comportement historique, toujours sûr) :
// ne jamais passer true pour un appelant qui pourrait tourner alors que la grille n'a
// pas encore été dimensionnée au moins une fois (page masquée, changement de dossier...).
function renderGrid(skipSizeRecalc = false) {
  const t = activeTheme();
  const s = activeSubtheme();
  const g = activeGrid();

  updateClearGridsButton();
  updateOpenGridsWindowButton();
  updateResetButton();
  _updateNewBadgeButton();
  document.getElementById('btn-cases-panel')?.classList.remove('btn-attention');
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
    btnSizeMinus.disabled = true;
    btnSizePlus.disabled = true;
    bingoMsg.classList.add('hidden');
    btnGenerate.disabled = true;
    btnGenerate.classList.add('btn-disabled');
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
    btnSizeMinus.disabled = true;
    btnSizePlus.disabled = true;
    bingoMsg.classList.add('hidden');
    btnGenerate.disabled = true;
    btnGenerate.classList.add('btn-disabled');
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
    btnSizeMinus.disabled = true;
    btnSizePlus.disabled = true;
    bingoMsg.classList.add('hidden');
    btnGenerate.disabled = true;
    btnGenerate.classList.add('btn-disabled');
    return;
  }

  const n = (g || s.grids.find(x => !x.archived)).gridSize;
  sizeDisplay.textContent = `${n}×${n}`;

  // Synchroniser l'icône verrou avec l'état du thème
  const locked = !!t.locked;
  _setLockGenerateChecked(locked);
  btnSizeMinus.disabled = locked || n <= MIN_SIZE;
  btnSizePlus.disabled = locked || n >= MAX_SIZE;

  const sArchivedIds = (s && s.archivedElementIds) ? s.archivedElementIds : [];
  const activeCount = (s.elements || []).filter(e => !sArchivedIds.includes(e.id)).length;
  const enoughElements = activeCount >= n * n;
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

  const canGenerate = !locked && (enoughElements || canFillEmptyCellsVisibleGrids());
  btnGenerate.disabled = !canGenerate;
  btnGenerate.classList.toggle('btn-disabled', !canGenerate);
  // Surbrillance du bouton Cases pilotée uniquement par le nombre minimal de cases (enoughElements),
  // pas par canGenerate : tant que ce seuil n'est pas atteint, la surbrillance reste affichée même
  // si canFillEmptyCellsVisibleGrids() permettrait déjà de générer partiellement.
  document.getElementById('btn-cases-panel')?.classList.toggle('btn-attention', !enoughElements);

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
  // _adjustBingoGridSizes() force un reflow synchrone (getBoundingClientRect/getComputedStyle) :
  // coûteux sur machine lente, à sauter uniquement quand l'appelant garantit qu'aucune dimension
  // n'a changé (voir skipSizeRecalc en tête de fonction).
  if (!skipSizeRecalc) {
    _adjustBingoGridSizes();
    // Re-mesurer après le premier paint réel : au chargement initial (ou juste après le
    // changement de page), le navigateur peut ne pas avoir fini la mise en page au moment de
    // l'appel synchrone ci-dessus (polices pas encore chargées, extensions qui retardent le
    // rendu...) — la mesure donne alors une grille minuscule tant qu'aucune interaction ne
    // redéclenche renderGrid(). requestAnimationFrame garantit un recalcul après paint.
    requestAnimationFrame(_adjustBingoGridSizes);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(_adjustBingoGridSizes);
  }

  // Déclencher après que les wrappers sont dans le DOM et que le layout est calculé
  setTimeout(() => {
    _pendingBingoEffects.forEach(({ gridId, lineCount }) => {
      triggerBingoEffectIfNew(gridId, lineCount);
    });
  }, 0);
}

// Dimensionne chaque .bingo-grid pour occuper au maximum l'espace disponible
// (largeur ET hauteur) sans jamais déborder — mesuré dynamiquement plutôt que
// deviné en vh, car la hauteur du header au-dessus varie (titre, boutons wrap).
// La grille est carrée (aspect-ratio:1/1) ET chaque cellule l'est aussi (.bingo-cell
// aspect-ratio:1) : contraindre uniquement max-height ne suffit pas, car les cellules
// restent dimensionnées par la LARGEUR des colonnes (1fr) — si celle-ci reste grande
// pendant que la hauteur est bridée, les cellules deviennent plus hautes que l'espace
// alloué et se chevauchent. Il faut donc calculer le côté du carré (min de la largeur
// et de la hauteur réellement disponibles) et fixer explicitement width ET height.
function _adjustBingoGridSizes() {
  document.querySelectorAll('.cases-sidebar.open').forEach(_adjustSidebarMaxHeight);
  const wrappers = gridWrapper.querySelectorAll('.grid-view-wrapper');
  if (!wrappers.length) return;
  // Réinitialiser AVANT de mesurer : .grid-view-wrapper est en flex:1 1 0 (min-width:0), donc
  // sans ça un width fixé par l'appel précédent influence la largeur mesurée du wrapper au tour
  // suivant (le wrapper se contracte au contenu) — spirale de rétrécissement à chaque nouveau
  // render/resize. On mesure toujours la largeur "naturelle" que le flex donnerait sans contrainte.
  wrappers.forEach(wrapper => {
    const gridEl = wrapper.querySelector('.bingo-grid');
    if (gridEl) { gridEl.style.width = ''; gridEl.style.maxHeight = ''; }
  });

  // Basé sur le viewport (pas le parent, qui s'étire librement avec son contenu)
  // pour garantir qu'il ne faut jamais scroller pour voir le bas de la grille.
  // Il faut soustraire tout ce qui reste SOUS gridWrapper jusqu'au bas de page :
  // le padding-bottom de .panel-grid (hérité de .panel) et celui de .main, sinon
  // le total dépasse legèrement 100vh malgré ce calcul (débordement observé : ~19px).
  const panelGridStyle = getComputedStyle(gridWrapper.closest('.panel-grid'));
  const mainStyle = getComputedStyle(document.querySelector('.main'));
  const bottomReserve = parseFloat(panelGridStyle.paddingBottom) + parseFloat(panelGridStyle.borderBottomWidth) + parseFloat(mainStyle.paddingBottom);
  const totalAvailableHeight = window.innerHeight - gridWrapper.getBoundingClientRect().top - bottomReserve;
  // Avec flex-wrap, un grand nombre de grilles peut occuper plusieurs rangées : diviser la
  // hauteur disponible par le nombre de rangées réellement affichées (détecté par les tops
  // distincts des wrappers), sinon chaque grille tente de prendre toute la hauteur du viewport
  // et déborde dès qu'il y a plus d'une rangée.
  const rowTops = new Set(Array.from(wrappers).map(w => Math.round(w.getBoundingClientRect().top)));
  const rowCount = Math.max(1, rowTops.size);
  const wrapperGapV = parseFloat(getComputedStyle(gridWrapper).rowGap || getComputedStyle(gridWrapper).gap) || 0;
  const availableHeight = (totalAvailableHeight - wrapperGapV * (rowCount - 1)) / rowCount;
  wrappers.forEach(wrapper => {
    const gridEl = wrapper.querySelector('.bingo-grid');
    if (!gridEl) return;
    const headerHeight = Array.from(wrapper.children).reduce((sum, child) => {
      return child === gridEl ? sum : sum + child.getBoundingClientRect().height;
    }, 0);
    const wrapperStyle = getComputedStyle(wrapper);
    const wrapperPaddingV = parseFloat(wrapperStyle.paddingTop) + parseFloat(wrapperStyle.paddingBottom)
      + parseFloat(wrapperStyle.borderTopWidth) + parseFloat(wrapperStyle.borderBottomWidth);
    const wrapperPaddingH = parseFloat(wrapperStyle.paddingLeft) + parseFloat(wrapperStyle.paddingRight);
    const wrapperGap = parseFloat(wrapperStyle.rowGap || wrapperStyle.gap) || 0;
    const gapCount = wrapper.children.length - 1;
    const maxH = Math.max(80, availableHeight - headerHeight - wrapperPaddingV - wrapperGap * gapCount - 4);
    const maxW = Math.max(80, wrapper.getBoundingClientRect().width - wrapperPaddingH);
    const side = Math.min(maxH, maxW);
    gridEl.style.maxHeight = side + 'px';
    gridEl.style.width = side + 'px';
  });
}

window.addEventListener('resize', () => {
  if (document.getElementById('page-bingo').classList.contains('active')) _adjustBingoGridSizes();
});

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

let _editFolderId = null; // null = mode création, sinon id du dossier en cours d'édition ou de duplication
let _folderModalMode = 'create'; // 'create' | 'edit' | 'duplicate'
// "Nouveau Bingo" depuis l'accueil : fait apparaître la section grille dans le modal "Nouveau
// dossier" (fusion des deux modals) — voir openNewThemeModal / confirmNewTheme.
let _homeNewGridAfterFolder = false;

// Lit l'état des 2 checkboxes exclusives Saison/Épisode : retourne 'season' | 'episode' | null
function _readNumberingType(seasonCb, episodeCb) {
  if (seasonCb && seasonCb.checked) return 'season';
  if (episodeCb && episodeCb.checked) return 'episode';
  return null;
}

// Rend les 2 checkboxes mutuellement exclusives (cocher l'une décoche l'autre) et met à jour
// l'affichage du champ numéro + la prévisualisation du préfixe (S01/Ep01) sur le champ nom.
function _wireNumberingChecks(seasonCb, episodeCb, wrap, numberInput, nameInput, prefixEl) {
  const update = () => {
    const type = _readNumberingType(seasonCb, episodeCb);
    if (wrap) wrap.classList.toggle('hidden', !type);
    if (type && numberInput) numberInput.focus();
    _updateNamePrefixPreview(seasonCb, episodeCb, numberInput, nameInput, prefixEl);
  };
  if (seasonCb) seasonCb.addEventListener('change', () => { if (seasonCb.checked && episodeCb) episodeCb.checked = false; update(); });
  if (episodeCb) episodeCb.addEventListener('change', () => { if (episodeCb.checked && seasonCb) seasonCb.checked = false; update(); });
  if (numberInput) numberInput.addEventListener('input', () => _updateNamePrefixPreview(seasonCb, episodeCb, numberInput, nameInput, prefixEl));
}

// Affiche en grisé, superposé au champ nom, le préfixe S01/Ep01 qui sera ajouté au nom final —
// et décale le padding du texte tapé pour qu'il ne chevauche pas le préfixe affiché. Le placeholder
// n'annonce "(optionnel)" que quand une numérotation est cochée (le nom devient alors un sous-titre
// facultatif) ; sans numérotation, le nom reste obligatoire et le placeholder ne doit pas le suggérer.
function _updateNamePrefixPreview(seasonCb, episodeCb, numberInput, nameInput, prefixEl) {
  if (!nameInput) return;
  const type = _readNumberingType(seasonCb, episodeCb);
  nameInput.placeholder = type ? 'Nom (optionnel)...' : 'Nom...';
  if (!prefixEl) return;
  const num = numberInput ? parseInt(numberInput.value, 10) : NaN;
  if (!type || !num || num < 1) {
    prefixEl.textContent = '';
    nameInput.style.paddingLeft = '';
    return;
  }
  const prefix = (type === 'episode' ? 'Ep' : 'S') + String(num).padStart(2, '0') + ' ';
  prefixEl.textContent = prefix;
  requestAnimationFrame(() => {
    const w = prefixEl.getBoundingClientRect().width;
    nameInput.style.paddingLeft = (13 + w) + 'px';
  });
}

// ── Dropdown "Emplacement" arborescent (remplace visuellement un <select> de dossiers) ────────
// Le <select> caché passé en paramètre reste la source de vérité (comme pour .tl-preset-dropdown) :
// on ne fait que synchroniser un bouton + panneau flottant par-dessus, avec le même mécanisme de
// rétractation par dossier (chevron, sessionStorage) que renderFoldersPanelTree.
let _folderTreeDropdownPanel = null;
let _folderTreeDropdownCloseHandler = null;
function _closeFolderTreeDropdown() {
  if (_folderTreeDropdownPanel) { _folderTreeDropdownPanel.remove(); _folderTreeDropdownPanel = null; }
  if (_folderTreeDropdownCloseHandler) { document.removeEventListener('click', _folderTreeDropdownCloseHandler); _folderTreeDropdownCloseHandler = null; }
  document.querySelectorAll('.folder-tree-dropdown-btn.open').forEach(b => b.classList.remove('open'));
}

// rootFolders : tableau de dossiers racine (chacun avec sa propriété `.folders` pour les enfants)
// rootLabel : texte affiché pour l'option racine (aucun parent)
function _setupFolderTreeDropdown(selectEl, btnEl, rootFolders, rootLabel, storageKey) {
  const labelSpan = btnEl.querySelector('span');
  const iconEl = btnEl.querySelector('[data-lucide]');

  function findFolderLabel(folders, id) {
    for (const f of (folders || [])) {
      if (f.id === id) return f.name;
      const found = findFolderLabel(f.folders, id);
      if (found) return found;
    }
    return null;
  }

  function refreshBtn() {
    const val = selectEl.value;
    const name = val ? findFolderLabel(rootFolders, val) : null;
    labelSpan.textContent = name || rootLabel;
    if (iconEl) iconEl.setAttribute('data-lucide', name ? 'folder-closed' : 'house');
    if (window.lucide) lucide.createIcons();
  }

  function selectFolder(id) {
    selectEl.value = id || '';
    refreshBtn();
    _closeFolderTreeDropdown();
  }

  function renderFolderRow(f, depth) {
    const wrapper = document.createElement('div');
    const children = (f.folders || []).filter(sf => !sf.archived);
    const hasChildren = children.length > 0;

    const row = document.createElement('div');
    row.className = 'fp-folder-row' + (selectEl.value === f.id ? ' active' : '');
    row.style.paddingLeft = (8 + depth * 14) + 'px';

    const collapseKey = storageKey + '_' + f.id;
    let collapsed = sessionStorage.getItem(collapseKey) !== '0';

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

    row.appendChild(arrow);
    row.appendChild(icon);
    row.appendChild(name);

    const childrenEl = document.createElement('div');
    childrenEl.className = 'fp-children' + (collapsed ? ' collapsed' : '');
    children.forEach(sf => childrenEl.appendChild(renderFolderRow(sf, depth + 1)));

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
    row.addEventListener('click', e => { e.stopPropagation(); selectFolder(f.id); });

    wrapper.appendChild(row);
    wrapper.appendChild(childrenEl);
    return wrapper;
  }

  btnEl.onclick = e => {
    e.stopPropagation();
    if (_folderTreeDropdownPanel) { _closeFolderTreeDropdown(); return; }
    const panel = document.createElement('div');
    panel.className = 'folder-tree-dropdown-panel';

    const rootRow = document.createElement('div');
    rootRow.className = 'folder-tree-dropdown-root' + (!selectEl.value ? ' selected' : '');
    rootRow.innerHTML = '<i data-lucide="house"></i> ' + rootLabel;
    rootRow.addEventListener('click', e2 => { e2.stopPropagation(); selectFolder(''); });
    panel.appendChild(rootRow);

    rootFolders.filter(f => !f.archived).forEach(f => panel.appendChild(renderFolderRow(f, 0)));

    document.body.appendChild(panel);
    const rect = btnEl.getBoundingClientRect();
    panel.style.left = rect.left + 'px';
    panel.style.top = (rect.bottom + 4) + 'px';
    panel.style.width = rect.width + 'px';
    requestAnimationFrame(() => {
      const pr = panel.getBoundingClientRect();
      if (pr.bottom > window.innerHeight - 8) panel.style.top = (rect.top - pr.height - 4) + 'px';
    });
    btnEl.classList.add('open');
    _folderTreeDropdownPanel = panel;
    if (window.lucide) lucide.createIcons();
    _folderTreeDropdownCloseHandler = () => _closeFolderTreeDropdown();
    setTimeout(() => document.addEventListener('click', _folderTreeDropdownCloseHandler), 0);
  };

  refreshBtn();
}

function openNewThemeModal(parentId = null) {
  if (!modalNewTheme) return;
  _editFolderId = null;
  _folderModalMode = 'create';

  const parentWrap = document.getElementById('new-folder-parent-wrap');
  if (parentWrap) parentWrap.style.display = '';
  const modalTitle = document.getElementById('new-folder-modal-title');
  if (modalTitle) modalTitle.textContent = _homeNewGridAfterFolder ? 'NOUVEAU BINGO' : 'Nouveau dossier';
  if (btnConfirmNewTheme) btnConfirmNewTheme.textContent = 'Créer';

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
    const dropdownBtn = document.getElementById('new-folder-parent-dropdown-btn');
    if (dropdownBtn) _setupFolderTreeDropdown(sel, dropdownBtn, state.folders || [], '— Racine —', 'fp_newfolder_collapsed');
  }

  newThemeNameInput.value = '';
  const seasonCb = document.getElementById('new-folder-numbering-season');
  const episodeCb = document.getElementById('new-folder-numbering-episode');
  const numberingWrap = document.getElementById('new-folder-numbering-wrap');
  const numberingNumber = document.getElementById('new-folder-numbering-number');
  if (seasonCb) seasonCb.checked = false;
  if (episodeCb) episodeCb.checked = false;
  if (numberingWrap) numberingWrap.classList.add('hidden');
  if (numberingNumber) numberingNumber.value = '';
  _updateNamePrefixPreview(seasonCb, episodeCb, numberingNumber, newThemeNameInput, document.getElementById('new-folder-name-prefix'));

  // Section grille (fusion avec le modal "Nouvelle grille") : visible uniquement pour
  // "Nouveau Bingo" depuis l'accueil (_homeNewGridAfterFolder).
  const gridWrap = document.getElementById('new-folder-grid-wrap');
  if (gridWrap) {
    gridWrap.classList.toggle('hidden', !_homeNewGridAfterFolder);
    if (_homeNewGridAfterFolder) {
      const gridNameInput = document.getElementById('new-folder-grid-name-input');
      if (gridNameInput) gridNameInput.value = '';
      gridWrap.querySelectorAll('.grid-name-preset-check input').forEach(cb => { cb.checked = false; });
    }
  }

  modalNewTheme.classList.remove('hidden');
  setTimeout(() => { newThemeNameInput.focus(); newThemeNameInput.select(); }, 50);
}

function openNewFolderModal(parentId = null) { openNewThemeModal(parentId); }

// "Renommer" un dossier existant : réutilise la modal de création, pré-remplie (nom + numérotation),
// sans changer de parent. Le champ nom ne contient jamais le préfixe S01/Ep01 — seulement le sous-titre
// saisi par l'utilisateur (vide si le dossier numéroté n'en a pas).
function openEditFolderModal(id) {
  const folder = findFolderById(state.folders, id);
  if (!folder || !modalNewTheme) return;
  _editFolderId = id;
  _folderModalMode = 'edit';

  const parentWrap = document.getElementById('new-folder-parent-wrap');
  if (parentWrap) parentWrap.style.display = 'none';
  const modalTitle = document.getElementById('new-folder-modal-title');
  if (modalTitle) modalTitle.textContent = 'Renommer le dossier';
  if (btnConfirmNewTheme) btnConfirmNewTheme.textContent = 'Renommer';

  const seasonCb = document.getElementById('new-folder-numbering-season');
  const episodeCb = document.getElementById('new-folder-numbering-episode');
  const numberingWrap = document.getElementById('new-folder-numbering-wrap');
  const numberingNumber = document.getElementById('new-folder-numbering-number');
  if (folder.numbering) {
    if (seasonCb) seasonCb.checked = folder.numbering.type === 'season';
    if (episodeCb) episodeCb.checked = folder.numbering.type === 'episode';
    if (numberingWrap) numberingWrap.classList.remove('hidden');
    if (numberingNumber) numberingNumber.value = folder.numbering.number;
    newThemeNameInput.value = folder.numbering.subtitle || '';
  } else {
    if (seasonCb) seasonCb.checked = false;
    if (episodeCb) episodeCb.checked = false;
    if (numberingWrap) numberingWrap.classList.add('hidden');
    if (numberingNumber) numberingNumber.value = '';
    newThemeNameInput.value = folder.name;
  }
  _updateNamePrefixPreview(seasonCb, episodeCb, numberingNumber, newThemeNameInput, document.getElementById('new-folder-name-prefix'));
  modalNewTheme.classList.remove('hidden');
  setTimeout(() => { newThemeNameInput.focus(); newThemeNameInput.select(); }, 50);
}

// "Dupliquer" un dossier : même modal complète, préremplie avec la numérotation du dossier source et
// le numéro déjà auto-incrémenté (modifiable avant validation) — le préfixe S01/Ep01 s'affiche en
// grisé dans le champ nom comme pour créer/renommer.
function openDuplicateFolderModalFull(id) {
  const folder = findFolderById(state.folders, id);
  if (!folder || !modalNewTheme) return;
  _editFolderId = id;
  _folderModalMode = 'duplicate';

  const parentWrap = document.getElementById('new-folder-parent-wrap');
  if (parentWrap) parentWrap.style.display = 'none';
  const modalTitle = document.getElementById('new-folder-modal-title');
  if (modalTitle) modalTitle.textContent = 'Dupliquer le dossier';
  if (btnConfirmNewTheme) btnConfirmNewTheme.textContent = 'Dupliquer';

  const seasonCb = document.getElementById('new-folder-numbering-season');
  const episodeCb = document.getElementById('new-folder-numbering-episode');
  const numberingWrap = document.getElementById('new-folder-numbering-wrap');
  const numberingNumber = document.getElementById('new-folder-numbering-number');
  if (folder.numbering) {
    const parent = findParentFolder(state.folders, id);
    const siblings = parent ? (parent.folders || []) : (state.folders || []);
    if (seasonCb) seasonCb.checked = folder.numbering.type === 'season';
    if (episodeCb) episodeCb.checked = folder.numbering.type === 'episode';
    if (numberingWrap) numberingWrap.classList.remove('hidden');
    if (numberingNumber) numberingNumber.value = _nextFolderNumber(siblings, folder.numbering.type);
    newThemeNameInput.value = folder.numbering.subtitle || '';
  } else {
    if (seasonCb) seasonCb.checked = false;
    if (episodeCb) episodeCb.checked = false;
    if (numberingWrap) numberingWrap.classList.add('hidden');
    if (numberingNumber) numberingNumber.value = '';
    newThemeNameInput.value = '';
  }
  _updateNamePrefixPreview(seasonCb, episodeCb, numberingNumber, newThemeNameInput, document.getElementById('new-folder-name-prefix'));
  modalNewTheme.classList.remove('hidden');
  setTimeout(() => { newThemeNameInput.focus(); newThemeNameInput.select(); }, 50);
}

function closeNewThemeModal() {
  if (modalNewTheme) modalNewTheme.classList.add('hidden');
  _editFolderId = null;
  _folderModalMode = 'create';
}

function confirmNewTheme() {
  const seasonCb = document.getElementById('new-folder-numbering-season');
  const episodeCb = document.getElementById('new-folder-numbering-episode');
  const numberingNumber = document.getElementById('new-folder-numbering-number');
  const type = _readNumberingType(seasonCb, episodeCb);
  const subtitle = newThemeNameInput.value.trim();
  let numbering = null;
  let name;
  if (type) {
    const num = parseInt(numberingNumber.value, 10);
    if (!num || num < 1) { numberingNumber.focus(); return; }
    numbering = { type, number: num, subtitle };
    name = formatNumberedFolderName(numbering);
  } else {
    if (_folderModalMode !== 'duplicate' && !subtitle) { newThemeNameInput.focus(); return; }
    name = subtitle;
  }
  if (_folderModalMode === 'edit' && _editFolderId) {
    const folder = findFolderById(state.folders, _editFolderId);
    closeNewThemeModal();
    if (folder) {
      folder.name = name;
      folder.numbering = numbering;
      touchFolderChain(folder.id);
      saveState();
      renderAllFolders();
    }
    return;
  }
  if (_folderModalMode === 'duplicate' && _editFolderId) {
    const srcId = _editFolderId;
    closeNewThemeModal();
    duplicateFolder(srcId, name, numbering);
    return;
  }
  const sel = document.getElementById('new-folder-parent-select');
  const parentId = (sel && sel.value) ? sel.value : null;
  // "Nouveau Bingo" depuis l'accueil : lire la section grille fusionnée AVANT de fermer le
  // modal (closeNewThemeModal ne vide pas ces champs, mais autant lire pendant qu'ils sont là).
  const fromHome = _homeNewGridAfterFolder;
  let gridNames = [];
  if (fromHome) {
    const checked = [...document.querySelectorAll('#new-folder-grid-wrap .grid-name-preset-check input:checked')].map(cb => cb.value);
    const gridNameInput = document.getElementById('new-folder-grid-name-input');
    gridNames = checked.length > 0 ? checked : [(gridNameInput?.value.trim()) || 'Grille 1'];
  }
  closeNewThemeModal();
  createFolder(name, parentId, numbering);
  if (fromHome) {
    _homeNewGridAfterFolder = false;
    const folder = activeFolder();
    if (folder) {
      gridNames.forEach(gname => createGrid(gname));
      // Rejoindre directement le Bingo qu'on vient de créer (comme "Rejoindre Bingo").
      if (typeof _homeGoToBingoFolder === 'function') _homeGoToBingoFolder(folder.id);
    }
  }
}

function createTheme(name) { createFolder(name, null); }

if (btnConfirmNewTheme) btnConfirmNewTheme.addEventListener('click', confirmNewTheme);
if (btnCancelNewTheme) btnCancelNewTheme.addEventListener('click', closeNewThemeModal);
if (btnCloseNewThemeModal) btnCloseNewThemeModal.addEventListener('click', closeNewThemeModal);
if (newThemeNameInput) newThemeNameInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') confirmNewTheme();
  if (e.key === 'Escape') closeNewThemeModal();
});

_wireNumberingChecks(
  document.getElementById('new-folder-numbering-season'),
  document.getElementById('new-folder-numbering-episode'),
  document.getElementById('new-folder-numbering-wrap'),
  document.getElementById('new-folder-numbering-number'),
  newThemeNameInput,
  document.getElementById('new-folder-name-prefix')
);

// "Renommer" et "Dupliquer" utilisent tous deux désormais la modal complète (numérotation + nom),
// voir openEditFolderModal / openDuplicateFolderModalFull.
function openRenameFolderModal(id) { openEditFolderModal(id); }
function openDuplicateFolderModal(id) { openDuplicateFolderModalFull(id); }
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
let _elementPresetsTargetId = null;

// Reconstruit un arbre filtré ne gardant que les dossiers éligibles (cases présentes, pas la
// cible) et leurs ancêtres (nécessaires pour l'affichage hiérarchique, même sans case propre) —
// pour réutiliser _setupFolderTreeDropdown (dropdown "Emplacement" arborescent générique).
function _buildImportElementsSourceTree(folders, targetId) {
  return (folders || []).filter(f => !f.archived).map(f => {
    const children = _buildImportElementsSourceTree(f.folders, targetId);
    const eligible = f.id !== targetId && (f.elements || []).length > 0;
    if (!eligible && children.length === 0) return null;
    return { id: f.id, name: f.name, folders: children };
  }).filter(Boolean);
}

function openImportElementsModal(targetId) {
  _elementPresetsTargetId = targetId;
  const sel = document.getElementById('import-elements-source-select');
  const dropdownBtn = document.getElementById('import-elements-source-dropdown-btn');
  if (sel) {
    sel.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '— Choisir un dossier —';
    sel.appendChild(placeholder);
  }
  if (sel && dropdownBtn) {
    const tree = _buildImportElementsSourceTree(state.folders, targetId);
    _setupFolderTreeDropdown(sel, dropdownBtn, tree, '— Choisir un dossier —', 'fp_importelements_collapsed');
  }
  const replaceCb = document.getElementById('element-preset-replace-checkbox');
  if (replaceCb) replaceCb.checked = false;
}

function confirmImportElements() {
  if (!_elementPresetsTargetId) return;
  const sel = document.getElementById('import-elements-source-select');
  const sourceRootId = sel ? sel.value : '';
  if (!sourceRootId) return;
  const replaceCb = document.getElementById('element-preset-replace-checkbox');
  const replace = replaceCb ? replaceCb.checked : false;
  const added = importElements(sourceRootId, _elementPresetsTargetId, replace);
  closeElementPresetsModal();
  if (added === 0 && !replace) {
    alert('Toutes les cases existent déjà dans ce dossier.');
  }
}

document.getElementById('btn-confirm-import-elements').addEventListener('click', confirmImportElements);

// ──────────────────────────────────────────────
// Modale "Preset cases" — fusion import depuis un autre dossier + gestion des presets
// enregistrés : cliquer un preset l'importe directement dans le dossier actif.
// ──────────────────────────────────────────────
function renderElementPresetList() {
  const list = document.getElementById('element-preset-list');
  if (!list) return;
  list.innerHTML = '';
  const presets = getElementPresets();
  if (presets.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'font-size:0.8rem;color:var(--text-muted);';
    empty.textContent = 'Aucun preset.';
    list.appendChild(empty);
    return;
  }
  presets.forEach(p => {
    const row = document.createElement('div');
    row.className = 'modal-item-row';

    const btn = document.createElement('button');
    btn.className = 'btn-action btn-secondary';
    btn.style.flex = '1';
    btn.style.textAlign = 'left';
    btn.title = 'Importer ce preset dans le dossier actif';
    btn.textContent = `${p.name} (${(p.elements || []).length})`;
    btn.addEventListener('click', () => {
      if (!_elementPresetsTargetId) return;
      const replaceCb = document.getElementById('element-preset-replace-checkbox');
      const replace = replaceCb ? replaceCb.checked : false;
      const added = importElementTexts(p.elements || [], _elementPresetsTargetId, replace);
      closeElementPresetsModal();
      if (added === 0 && !replace) {
        alert('Toutes les cases existent déjà dans ce dossier.');
      }
    });
    row.appendChild(btn);

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-action btn-secondary';
    editBtn.title = 'Modifier ce preset';
    editBtn.innerHTML = '<i data-lucide="pencil"></i>';
    editBtn.addEventListener('click', () => openElementPresetEditModal(p.id));
    row.appendChild(editBtn);

    const del = document.createElement('button');
    del.className = 'btn-action btn-secondary';
    del.title = 'Supprimer ce preset';
    del.innerHTML = '<i data-lucide="trash-2"></i>';
    del.addEventListener('click', () => {
      if (confirm(`Supprimer le preset "${p.name}" ?`)) { deleteElementPreset(p.id); renderElementPresetList(); }
    });
    row.appendChild(del);

    list.appendChild(row);
  });
  if (window.lucide) lucide.createIcons();
}

function openElementPresetsModal(targetId) {
  openImportElementsModal(targetId);
  renderElementPresetList();
  const saveInput = document.getElementById('element-preset-save-input');
  if (saveInput) saveInput.value = '';
  document.getElementById('modal-element-presets').classList.remove('hidden');
}

function closeElementPresetsModal() {
  document.getElementById('modal-element-presets').classList.add('hidden');
  _elementPresetsTargetId = null;
}

document.getElementById('btn-close-element-presets-modal').addEventListener('click', closeElementPresetsModal);
document.getElementById('btn-close-element-presets').addEventListener('click', closeElementPresetsModal);
document.getElementById('btn-new-element-preset').addEventListener('click', () => openElementPresetEditModal(null));
document.getElementById('btn-save-current-as-element-preset').addEventListener('click', () => {
  const input = document.getElementById('element-preset-save-input');
  const name = input.value.trim();
  if (!name) return;
  const s = activeSubtheme();
  const texts = s ? (s.elements || []).map(e => e.text) : [];
  if (texts.length === 0) { alert('Ce dossier ne contient aucune case à sauvegarder.'); return; }
  saveElementPreset(name, texts);
  input.value = '';
  renderElementPresetList();
});

// ──────────────────────────────────────────────
// Modale — édition d'un preset de cases (nom + liste de cases individuelles, comme le panneau Cases)
// ──────────────────────────────────────────────
let _elementPresetEditId = null; // null = nouveau preset
let _elementPresetEditTexts = [];

function _updateElementPresetEditTitle() {
  const titleEl = document.getElementById('element-preset-edit-title');
  if (!titleEl) return;
  const base = _elementPresetEditId ? 'Modifier le preset' : 'Nouveau preset';
  titleEl.textContent = `${base} (${_elementPresetEditTexts.length})`;
}

function _renderElementPresetEditList() {
  const list = document.getElementById('element-preset-edit-list');
  if (!list) return;
  _updateElementPresetEditTitle();
  list.innerHTML = '';
  _elementPresetEditTexts.forEach((text, idx) => {
    const li = document.createElement('li');
    li.className = 'element-item';
    li.title = 'Clic gauche : renommer';

    const span = document.createElement('span');
    span.className = 'element-text';
    span.textContent = text;
    span.style.cursor = 'text';
    li.appendChild(span);

    const del = document.createElement('button');
    del.className = 'elem-menu-btn';
    del.title = 'Supprimer cette case';
    del.innerHTML = '<i data-lucide="x"></i>';
    del.addEventListener('click', e => {
      e.stopPropagation();
      _elementPresetEditTexts.splice(idx, 1);
      _renderElementPresetEditList();
    });
    li.appendChild(del);

    li.addEventListener('click', e => {
      e.stopPropagation();
      _startEditElementPresetEditText(idx, span, e);
    });

    list.appendChild(li);
  });
  if (window.lucide) lucide.createIcons();
}

// Édition inline d'une case du preset en cours d'édition, même comportement que startEditElement()
// pour le panneau Cases (textarea remplaçant le span, Enter valide, Escape annule).
function _startEditElementPresetEditText(idx, span, clickEvent) {
  const text = _elementPresetEditTexts[idx];
  if (text === undefined) return;

  const textarea = document.createElement('textarea');
  textarea.className = 'element-edit-input';
  textarea.textContent = text;
  textarea.maxLength = 80;

  const commit = () => {
    const newText = textarea.value.trim();
    if (newText) _elementPresetEditTexts[idx] = newText;
    _renderElementPresetEditList();
  };

  textarea.addEventListener('blur', commit);
  textarea.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); textarea.blur(); }
    if (e.key === 'Escape') { textarea.value = text; textarea.blur(); }
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
    const charWidth = rect.width / text.length;
    const position = Math.round(clickX / charWidth);
    textarea.setSelectionRange(position, position);
  } else {
    textarea.select();
  }
}

function openElementPresetEditModal(presetId) {
  _elementPresetEditId = presetId;
  const preset = presetId ? getElementPresets().find(p => p.id === presetId) : null;
  _elementPresetEditTexts = preset ? (preset.elements || []).slice() : [];
  document.getElementById('element-preset-edit-name').value = preset ? preset.name : '';
  const editInput = document.getElementById('element-preset-edit-input');
  if (editInput) editInput.value = '';
  _renderElementPresetEditList();
  document.getElementById('modal-element-presets').classList.add('hidden');
  document.getElementById('modal-element-preset-edit').classList.remove('hidden');
}

function closeElementPresetEditModal() {
  document.getElementById('modal-element-preset-edit').classList.add('hidden');
  document.getElementById('modal-element-presets').classList.remove('hidden');
  renderElementPresetList();
}

function _addElementPresetEditText() {
  const input = document.getElementById('element-preset-edit-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  _elementPresetEditTexts.push(text);
  input.value = '';
  _renderElementPresetEditList();
  input.focus();
}
document.getElementById('btn-element-preset-edit-add').addEventListener('click', _addElementPresetEditText);
document.getElementById('element-preset-edit-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') _addElementPresetEditText();
});

document.getElementById('btn-confirm-element-preset-edit').addEventListener('click', () => {
  const name = document.getElementById('element-preset-edit-name').value.trim();
  if (!name) return;
  if (_elementPresetEditId) {
    updateElementPreset(_elementPresetEditId, name, _elementPresetEditTexts);
  } else {
    saveElementPreset(name, _elementPresetEditTexts);
  }
  closeElementPresetEditModal();
});
document.getElementById('btn-cancel-element-preset-edit').addEventListener('click', closeElementPresetEditModal);
document.getElementById('btn-close-element-preset-edit-modal').addEventListener('click', closeElementPresetEditModal);

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

document.getElementById('btn-presets-elements-panel').addEventListener('click', () => {
  const s = activeSubtheme();
  if (!s) return;
  openElementPresetsModal(s.id);
});

document.getElementById('btn-clear-elements-panel').addEventListener('click', () => {
  const s = activeSubtheme();
  if (!s || !(s.elements || []).length) return;
  _clearCellCallback = clearAllElements;
  const archivedCount = (s.archivedElementIds || []).length;
  const btnArchivedOnly = document.getElementById('btn-confirm-clear-archived-only');
  if (archivedCount > 0) {
    _clearArchivedOnlyCallback = clearArchivedElements;
    btnArchivedOnly.textContent = '';
    btnArchivedOnly.innerHTML = `<i data-lucide="package"></i> Archivées seulement (${archivedCount})`;
    btnArchivedOnly.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  } else {
    _clearArchivedOnlyCallback = null;
    btnArchivedOnly.classList.add('hidden');
  }
  document.getElementById('modal-clear-msg').textContent = archivedCount > 0
    ? `Supprimer les ${s.elements.length} case(s) de ce dossier, ou seulement les ${archivedCount} archivée(s) ?`
    : `Supprimer les ${s.elements.length} case(s) de ce dossier ?`;
  document.getElementById('modal-confirm-clear').classList.remove('hidden');
});

btnSizeMinus.addEventListener('click', () => changeSize(-1));
btnSizePlus.addEventListener('click',  () => changeSize(+1));

fontScaleInput.addEventListener('input', () => {
  const pct = Math.max(50, Math.min(200, parseInt(fontScaleInput.value) || 100));
  _localFontScale = pct / 100;
  applyFontScale();
});
fontScaleInput.addEventListener('change', () => {
  const pct = Math.max(50, Math.min(200, parseInt(fontScaleInput.value) || 100));
  saveLocalFontScale(pct / 100);
});
const fontScaleValueInput = document.getElementById('font-scale-value-input');
if (fontScaleValueInput) {
  fontScaleValueInput.addEventListener('change', () => {
    const pct = Math.max(50, Math.min(200, parseInt(fontScaleValueInput.value) || 100));
    _localFontScale = pct / 100;
    applyFontScale();
    saveLocalFontScale(pct / 100);
  });
}

chkLockGenerate.addEventListener('click', () => {
  const t = activeTheme();
  if (t) {
    t.locked = !_isLockGenerateChecked();
    saveState();
  }
  renderGrid();
});

let _isDraggingElement = false;

// Plafonne .cases-sidebar à l'espace réellement visible sous sa position actuelle
// (mesurée, pas un calc(100vh - Npx) déconnecté du control-panel dont la hauteur varie
// avec le nombre de grilles affichées) — sinon le sidebar peut dépasser le bas de
// l'écran quand son contenu (liste de cases) est plus haut que l'espace dispo, et
// provoque un scroll de toute la page.
function _adjustSidebarMaxHeight(sidebar) {
  if (!sidebar) return;
  const top = sidebar.getBoundingClientRect().top;
  const maxH = Math.max(120, window.innerHeight - top - 12);
  sidebar.style.maxHeight = maxH + 'px';
}
window.addEventListener('resize', () => {
  document.querySelectorAll('.cases-sidebar.open').forEach(_adjustSidebarMaxHeight);
});

function openCasesPanel() {
  const panel = document.getElementById('cases-panel');
  panel.classList.add('open');
  if (_casesPanelDirty) renderElements();
  _adjustSidebarMaxHeight(panel);
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

// ── Statistiques des cases (winrate sur la saison) ──
// Un "épisode" = tout dossier non archivé possédant au moins une grille non archivée.
// Pour chaque case (regroupée par texte normalisé) : n = nb d'épisodes où elle est active
// (présente et non archivée dans cet épisode), m = nb d'épisodes où elle est cochée dans
// au moins une grille non archivée de cet épisode.
function _collectEpisodeFolders(folder) {
  const episodes = [];
  (folder.folders || []).forEach(sub => {
    if (sub.archived) return;
    if ((sub.grids || []).some(g => !g.archived)) episodes.push(sub);
    episodes.push(..._collectEpisodeFolders(sub));
  });
  return episodes;
}

function computeBingoStats(episodes) {
  const stats = new Map(); // key texte normalisé → { text, n, m }

  episodes.forEach(ep => {
    const archivedIds = new Set(ep.archivedElementIds || []);
    const checkedIds = new Set();
    (ep.grids || []).forEach(g => {
      if (g.archived) return;
      (g.grid || []).forEach(c => {
        if (c && c.checked && c.elementId) checkedIds.add(c.elementId);
      });
    });
    (ep.elements || []).forEach(el => {
      if (archivedIds.has(el.id)) return;
      const key = el.text.trim().toLowerCase();
      if (!stats.has(key)) stats.set(key, { text: el.text, n: 0, m: 0 });
      const entry = stats.get(key);
      entry.n++;
      if (checkedIds.has(el.id)) entry.m++;
    });
  });

  return Array.from(stats.values())
    .map(e => ({ ...e, pct: e.n > 0 ? Math.round((e.m / e.n) * 100) : 0 }))
    .sort((a, b) => b.pct - a.pct || b.n - a.n || a.text.localeCompare(b.text));
}

// Un dossier est un "bingo" s'il a au moins une grille (archivée ou non — le dossier
// lui-même est bien un bingo même si toutes ses grilles sont archivées).
function _isFolderBingo(folder) {
  return !!(folder && folder.grids && folder.grids.length > 0);
}

// Périmètre des stats pour un dossier donné : si c'est un bingo (a des grilles), le
// périmètre est son parent direct (la "saison" la plus proche) — ex: KL > S1 > E4 → S1.
// Sinon (dossier conteneur, ex: S1 lui-même), le périmètre est le dossier lui-même,
// ses enfants servant d'épisodes. Si un bingo est déjà à la racine (pas de parent),
// il sert lui-même de périmètre.
function _findStatsScopeFolder(folder) {
  if (!folder) return null;
  if (!_isFolderBingo(folder)) return folder;
  return findParentFolder(state.folders, folder.id) || folder;
}

let _bingoStatsScope = null;       // dossier périmètre courant (la "saison")
let _bingoStatsAllEpisodes = [];   // tous les épisodes de ce périmètre
let _bingoStatsSelectedIds = null; // Set des épisodes inclus (null = pas encore initialisé)

function renderBingoStatsModal(folder) {
  const root = _findStatsScopeFolder(folder || activeFolder());
  const list = document.getElementById('bingo-stats-list');
  const nameEl = document.getElementById('bingo-stats-folder-name');
  if (!root || !list) return;
  nameEl.textContent = root.name;

  _bingoStatsScope = root;
  _bingoStatsAllEpisodes = _collectEpisodeFolders(root);
  // Par défaut, tous les épisodes sont inclus
  _bingoStatsSelectedIds = new Set(_bingoStatsAllEpisodes.map(ep => ep.id));

  _renderBingoStatsRows();
}

function _renderBingoStatsRows() {
  const list = document.getElementById('bingo-stats-list');
  if (!list) return;
  const included = _bingoStatsAllEpisodes.filter(ep => _bingoStatsSelectedIds.has(ep.id));
  const rows = computeBingoStats(included);
  list.innerHTML = '';
  if (rows.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'color:var(--text-muted);font-size:0.85rem;';
    empty.textContent = 'Aucune case trouvée pour les épisodes sélectionnés.';
    list.appendChild(empty);
    return;
  }
  rows.forEach(r => {
    const row = document.createElement('div');
    row.className = 'modal-item-row';
    const nameSpan = document.createElement('span');
    nameSpan.textContent = r.text;
    const statSpan = document.createElement('span');
    statSpan.className = 'tl-shrink-0';
    statSpan.textContent = `${r.m}/${r.n} (${r.pct}%)`;
    row.appendChild(nameSpan);
    row.appendChild(statSpan);
    list.appendChild(row);
  });
}

function openBingoStatsModal(folder) {
  renderBingoStatsModal(folder);
  document.getElementById('modal-bingo-stats').classList.remove('hidden');
}
function closeBingoStatsModal() {
  document.getElementById('modal-bingo-stats').classList.add('hidden');
}
document.getElementById('btn-bingo-stats').addEventListener('click', () => openBingoStatsModal());
document.getElementById('btn-close-bingo-stats-modal').addEventListener('click', closeBingoStatsModal);

// ── Menu déroulant "Épisodes" de la modale Stats : cocher/décocher les épisodes inclus. ──
const _btnBingoStatsEpisodes = document.getElementById('btn-bingo-stats-episodes');
if (_btnBingoStatsEpisodes) {
  _btnBingoStatsEpisodes.addEventListener('click', e => {
    e.stopPropagation();
    _renderBingoStatsEpisodesMenu();
  });
}

function _renderBingoStatsEpisodesMenu() {
  const menu = document.getElementById('bingo-stats-episodes-menu');
  if (!menu) return;
  menu.innerHTML = '';
  menu.classList.remove('hidden');
  positionCtxMenu(menu, null, _btnBingoStatsEpisodes);

  const closeMenu = () => menu.classList.add('hidden');
  setTimeout(() => document.addEventListener('click', closeMenu, { once: true }), 0);
  menu.addEventListener('click', e => e.stopPropagation());

  _bingoStatsAllEpisodes.forEach(ep => {
    const isSelected = _bingoStatsSelectedIds.has(ep.id);
    const item = document.createElement('div');
    item.className = 'grid-tab tl-dropdown-item' + (isSelected ? ' active' : '');

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = isSelected;
    cb.addEventListener('click', e => e.stopPropagation());
    cb.addEventListener('change', () => {
      if (cb.checked) _bingoStatsSelectedIds.add(ep.id);
      else _bingoStatsSelectedIds.delete(ep.id);
      item.classList.toggle('active', cb.checked);
      _renderBingoStatsRows();
    });
    item.appendChild(cb);

    const nameSpan = document.createElement('span');
    nameSpan.className = 'grid-tab-name';
    nameSpan.textContent = ep.name;
    nameSpan.addEventListener('click', () => cb.click());
    item.appendChild(nameSpan);

    menu.appendChild(item);
  });

  if (window.lucide) lucide.createIcons();
}

// ── Menu déroulant "Grilles" (mode normal) : cocher/décocher pour afficher, + Grille,
// et bouton ⋮ par grille (Renommer/Archiver/Supprimer, pas de Dupliquer). ──
const _btnGridsDropdown = document.getElementById('btn-grids-dropdown');
if (_btnGridsDropdown) {
  _btnGridsDropdown.addEventListener('click', e => {
    e.stopPropagation();
    _renderGridsDropdownMenu();
  });
}

function _renderGridsDropdownMenu() {
  const menu = document.getElementById('grids-dropdown-menu');
  if (!menu) return;
  const s = activeSubtheme();
  menu.innerHTML = '';
  menu.classList.remove('hidden');
  positionCtxMenu(menu, null, _btnGridsDropdown);

  const closeMenu = () => menu.classList.add('hidden');
  const onDocClick = () => closeMenu();
  setTimeout(() => document.addEventListener('click', onDocClick, { once: true }), 0);
  menu.addEventListener('click', e => e.stopPropagation());

  if (!s) { if (window.lucide) lucide.createIcons(); return; }
  const activeGrids = s.grids.filter(g => !g.archived);
  _selectedGridIds = _selectedGridIds.filter(id => activeGrids.some(x => x.id === id));

  activeGrids.forEach(g => {
    const isSelected = _selectedGridIds.includes(g.id);
    const item = document.createElement('div');
    item.className = 'grid-tab tl-dropdown-item' + (isSelected ? ' active' : '');

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = isSelected;
    cb.title = isSelected ? 'Masquer cette grille' : 'Afficher cette grille';
    cb.addEventListener('click', e => e.stopPropagation());
    cb.addEventListener('change', () => {
      const sNow = activeSubtheme();
      if (!sNow) return;
      if (cb.checked) {
        _selectedGridIds.push(g.id);
        sNow.activeGridId = g.id;
      } else {
        _selectedGridIds = _selectedGridIds.filter(id => id !== g.id);
        if (sNow.activeGridId === g.id) {
          sNow.activeGridId = _selectedGridIds.length > 0 ? _selectedGridIds[0] : null;
        }
      }
      saveLocalSelectedGrids(_selectedGridIds);
      saveState();
      renderGridsList();
      renderGrid();
    });
    item.appendChild(cb);

    const nameSpan = document.createElement('span');
    nameSpan.className = 'grid-tab-name';
    nameSpan.textContent = g.name;
    nameSpan.addEventListener('click', () => cb.click());
    item.appendChild(nameSpan);

    const ctxBtn = document.createElement('button');
    ctxBtn.className = 'grid-tab-ctx-btn';
    ctxBtn.innerHTML = '<i data-lucide="ellipsis-vertical"></i>';
    ctxBtn.title = 'Options';
    ctxBtn.addEventListener('click', e => {
      e.stopPropagation();
      openCtxMenuGrid(g.id, null, ctxBtn);
      closeMenu();
    });
    item.appendChild(ctxBtn);

    menu.appendChild(item);
  });

  const sep = document.createElement('div');
  sep.style.cssText = 'height:1px;background:var(--border);margin:4px 0;';
  menu.appendChild(sep);

  const addBtn = document.createElement('button');
  addBtn.className = 'ctx-menu-item ctx-green';
  addBtn.textContent = '+ Grille';
  addBtn.addEventListener('click', () => { closeMenu(); openNewGridModal(); });
  menu.appendChild(addBtn);

  if (window.lucide) lucide.createIcons();
}


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
  const _titleEl = document.getElementById('ctx-folder-title');
  if (_titleEl) {
    const folder = findFolderById(state.folders, id);
    _titleEl.textContent = folder ? folder.name : '';
  }
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
let _ctxGridId = null;

function openCtxMenuGrid(id, e, anchorEl) {
  closeCtxMenuTheme(); closeCtxMenuSubtheme(); closeCtxMenuElement();
  _ctxGridId = id;
  const _titleEl = document.getElementById('ctx-grid-title');
  if (_titleEl) {
    const s = activeSubtheme();
    const g = s && s.grids.find(g => g.id === id);
    _titleEl.textContent = g ? g.name : '';
  }
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
  const _titleEl = document.getElementById('ctx-element-title');
  if (_titleEl) _titleEl.textContent = span ? span.textContent : '';
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
  const _titleEl = document.getElementById('ctx-element-archived-title');
  if (_titleEl) {
    const s = activeSubtheme();
    const el = s && (s.elements || []).find(e => e.id === id);
    _titleEl.textContent = el ? el.text : '';
  }
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
  document.title = getFolderPath(state.folders, _localActiveFolderId).map(f => f.name).join(' \\ ');
  document.body.classList.add('solo-grid-mode');
  // En plein écran, tout doit tenir sur une seule rangée : #btn-grids-dropdown (ligne 1, mode
  // normal), #font-scale-label, #btn-toggle-new-badge et le bouton Capture (2e rangée, mode normal)
  // sont déplacés en JS dans #bingo-solo-toolbar-center, dans cet ordre (Grilles/Taille/New/Capture)
  // — mêmes éléments physiques, jamais deux jeux de contrôles désynchronisés. Le chemin
  // (#bingo-fullscreen-breadcrumb) reste un frère indépendant de ce groupe, centré par position
  // absolue (voir CSS), pas dans ce conteneur — sinon un groupe trop large le pousse hors de son centrage.
  const soloCenter = document.getElementById('bingo-solo-toolbar-center');
  const gridsDropdown = document.getElementById('btn-grids-dropdown');
  const fontScaleLabel = document.getElementById('font-scale-label');
  const newBadgeBtn = document.getElementById('btn-toggle-new-badge');
  const captureBtn = document.getElementById('btn-screenshot-bingo-normal');
  if (soloCenter) {
    if (gridsDropdown) soloCenter.appendChild(gridsDropdown);
    if (fontScaleLabel) soloCenter.appendChild(fontScaleLabel);
    if (newBadgeBtn) soloCenter.appendChild(newBadgeBtn);
    if (captureBtn) soloCenter.appendChild(captureBtn);
  }
  // Fermer le panneau Cases : affichage cassé s'il est laissé ouvert en plein écran.
  // Sa fermeture anime une transition CSS de largeur (0.22s, voir .cases-sidebar) : recalculer
  // seulement en requestAnimationFrame() mesurait encore l'ancienne largeur réduite (bug rapporté —
  // la taille des grilles restait celle d'avant la fermeture du panneau). Il faut attendre la fin
  // de cette transition avant de mesurer la largeur réellement disponible.
  closeCasesPanel();
  // Le layout plein écran change la taille disponible sans déclencher de 'resize' :
  // recalculer une fois que le nouveau layout est peint, sinon les grilles gardent
  // la taille calculée pour l'affichage normal jusqu'à la prochaine interaction.
  requestAnimationFrame(_adjustBingoGridSizes);
  setTimeout(_adjustBingoGridSizes, 240);
});
document.getElementById('btn-exit-solo-grid')?.addEventListener('click', () => {
  document.body.classList.remove('solo-grid-mode');
  document.title = 'LesMichels';
  requestAnimationFrame(_adjustBingoGridSizes);
  // Rendre #btn-grids-dropdown à la ligne 1 (après le bouton Chemin), #font-scale-label puis
  // #btn-toggle-new-badge (entre le cadre .lock-group et Capture) et Capture à la 2e rangée (mode normal).
  const gridsDropdown = document.getElementById('btn-grids-dropdown');
  const pathBtn = document.getElementById('btn-path-dropdown');
  if (gridsDropdown && pathBtn) pathBtn.insertAdjacentElement('afterend', gridsDropdown);
  const optionsRow = document.getElementById('bingo-grids-options-row');
  const lockGroup = optionsRow ? optionsRow.querySelector('.lock-group') : null;
  const fontScaleLabel = document.getElementById('font-scale-label');
  if (fontScaleLabel && lockGroup) lockGroup.insertAdjacentElement('afterend', fontScaleLabel);
  const newBadgeBtn = document.getElementById('btn-toggle-new-badge');
  if (newBadgeBtn && fontScaleLabel) fontScaleLabel.insertAdjacentElement('afterend', newBadgeBtn);
  const captureBtn = document.getElementById('btn-screenshot-bingo-normal');
  if (captureBtn && optionsRow) optionsRow.appendChild(captureBtn);
});
// Modale de choix "Capture" (plein écran) : toutes les grilles affichées ou une grille précise
const modalCaptureChoice = document.getElementById('modal-capture-choice');
const captureChoiceActions = document.getElementById('capture-choice-actions');
function openCaptureChoiceModal() {
  const grids = getVisibleGrids();
  captureChoiceActions.querySelectorAll('.btn-capture-choice-grid').forEach(btn => btn.remove());
  const btnCancel = document.getElementById('btn-cancel-capture-choice');
  grids.forEach(g => {
    const btn = document.createElement('button');
    btn.className = 'btn-action btn-secondary btn-capture-choice-grid';
    btn.innerHTML = `<i data-lucide="camera"></i> ${g.title || g.name}`;
    btn.addEventListener('click', () => {
      closeCaptureChoiceModal();
      bingoScreenshotOne(g.id);
    });
    captureChoiceActions.insertBefore(btn, btnCancel);
  });
  if (window.lucide) lucide.createIcons();
  modalCaptureChoice.classList.remove('hidden');
}
function closeCaptureChoiceModal() {
  modalCaptureChoice.classList.add('hidden');
}
document.getElementById('btn-screenshot-bingo-normal')?.addEventListener('click', openCaptureChoiceModal);
document.getElementById('btn-capture-choice-all').addEventListener('click', () => {
  closeCaptureChoiceModal();
  bingoScreenshot();
});
document.getElementById('btn-cancel-capture-choice').addEventListener('click', closeCaptureChoiceModal);
document.getElementById('btn-close-capture-choice').addEventListener('click', closeCaptureChoiceModal);

function generateAllVisibleGrids() {
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
}

function generateEmptyCellsVisibleGrids() {
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
}

function generateSingleGrid(gridId, emptyOnly) {
  if (manualMode) return;
  const tNow = activeTheme();
  const sNow = activeSubtheme();
  if (!tNow || tNow.locked || !sNow) return;
  const gNow = sNow.grids.find(x => x.id === gridId);
  if (!gNow || gNow.locked) return;
  const ok = generateOneGrid(tNow, gNow, emptyOnly);
  if (!ok) {
    const n = gNow.gridSize;
    const cellCount = n * n;
    const usedIds = new Set();
    const deletedIds = new Set();
    for (let i = 0; i < cellCount; i++) {
      if (gNow.grid[i] && gNow.grid[i].elementId) {
        const elemExists = (sNow.elements || []).some(el => el.id === gNow.grid[i].elementId);
        if (elemExists) usedIds.add(gNow.grid[i].elementId);
        else deletedIds.add(gNow.grid[i].elementId);
      }
    }
    const sArchivedIds = (sNow && sNow.archivedElementIds) ? sNow.archivedElementIds : [];
    const activeElemCount = (sNow.elements || []).filter(e => !sArchivedIds.includes(e.id)).length;
    let msg;
    if (emptyOnly) {
      const emptyCount = gNow.grid.slice(0, cellCount).filter(c => !c || !c.elementId).length;
      const availableCount = activeElemCount - usedIds.size;
      msg = `<i data-lucide="triangle-alert"></i> Impossible de remplir. Cases vides : ${emptyCount}, éléments disponibles : ${availableCount}.`;
      if (deletedIds.size > 0) msg += ` (${deletedIds.size} éléments sur la grille ont été supprimés)`;
    } else {
      msg = `<i data-lucide="triangle-alert"></i> Pas assez d'éléments actifs pour générer une grille ${n}×${n}.`;
    }
    gridError.innerHTML = msg;
    if (window.lucide) lucide.createIcons();
    gridError.classList.remove('hidden');
    return;
  }
  gridError.classList.add('hidden');
  saveState();
  renderGrid();
}

// Modale de choix "Générer" (globale ou par grille) : toutes les cases ou seulement les vides
const modalGenerateChoice = document.getElementById('modal-generate-choice');
let _generateChoiceTargetGridId = null; // null = grilles affichées (global), sinon id d'une grille précise
function openGenerateChoiceModal(gridId) {
  _generateChoiceTargetGridId = gridId || null;
  modalGenerateChoice.classList.remove('hidden');
}
function closeGenerateChoiceModal() {
  modalGenerateChoice.classList.add('hidden');
}
btnGenerate.addEventListener('click', () => openGenerateChoiceModal(null));
document.getElementById('btn-generate-choice-all').addEventListener('click', () => {
  const targetGridId = _generateChoiceTargetGridId;
  closeGenerateChoiceModal();
  if (targetGridId) generateSingleGrid(targetGridId, false);
  else generateAllVisibleGrids();
});
document.getElementById('btn-generate-choice-empty').addEventListener('click', () => {
  const targetGridId = _generateChoiceTargetGridId;
  closeGenerateChoiceModal();
  if (targetGridId) generateSingleGrid(targetGridId, true);
  else generateEmptyCellsVisibleGrids();
});
document.getElementById('btn-cancel-generate-choice').addEventListener('click', closeGenerateChoiceModal);
document.getElementById('btn-close-generate-choice').addEventListener('click', closeGenerateChoiceModal);

// Indique si au moins une grille affichée peut être remplie via "cases vides"
function canFillEmptyCellsVisibleGrids() {
  const t = activeTheme();
  const s = activeSubtheme();
  if (!t || t.locked || !s) return false;

  const grids = getVisibleGrids();
  if (grids.length === 0) return false;

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
    if (availableCount >= emptyCount) return true;
  }
  return false;
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

// "Vider" remet à vide toutes les cases remplies des grilles affichées non verrouillées — inutile
// (et donc désactivé) si le dossier est verrouillé, ou si aucune grille éligible n'a de case remplie.
function updateClearGridsButton() {
  const btn = document.getElementById('btn-clear-grids');
  if (!btn) return;
  const t = activeTheme();
  const locked = !t || t.locked;
  const grids = locked ? [] : getVisibleGrids().filter(gx => !gx.locked);
  const nothingToClear = locked || grids.every(gx => gx.grid.every(c => !c.elementId));
  btn.disabled = nothingToClear;
  btn.classList.toggle('btn-disabled', nothingToClear);
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

document.getElementById('btn-confirm-clear-archived-only').addEventListener('click', () => {
  document.getElementById('modal-confirm-clear').classList.add('hidden');
  document.getElementById('btn-confirm-clear-archived-only').classList.add('hidden');
  if (_clearArchivedOnlyCallback) {
    _clearArchivedOnlyCallback();
    _clearArchivedOnlyCallback = null;
  }
  _clearCellCallback = null;
});

document.getElementById('btn-confirm-clear').addEventListener('click', () => {
  document.getElementById('modal-confirm-clear').classList.add('hidden');
  document.getElementById('btn-confirm-clear-archived-only').classList.add('hidden');
  _clearArchivedOnlyCallback = null;
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
  document.getElementById('btn-confirm-clear-archived-only').classList.add('hidden');
  _clearCellCallback = null;
  _clearArchivedOnlyCallback = null;
});
document.getElementById('btn-close-confirm-clear').addEventListener('click', () => {
  document.getElementById('modal-confirm-clear').classList.add('hidden');
  document.getElementById('btn-confirm-clear-archived-only').classList.add('hidden');
  _clearCellCallback = null;
  _clearArchivedOnlyCallback = null;
});

function closeConfirmCurrentEventModal() {
  document.getElementById('modal-confirm-current-event').classList.add('hidden');
  _pendingCurrentEventFolderId = null;
  _pendingCurrentEventTierlistId = null;
}
document.getElementById('btn-confirm-current-event').addEventListener('click', () => {
  const folderId = _pendingCurrentEventFolderId;
  const tierlistId = _pendingCurrentEventTierlistId;
  closeConfirmCurrentEventModal();
  if (folderId) setCurrentEventFolder(folderId);
  else if (tierlistId) setCurrentEventTierlist(tierlistId);
});
document.getElementById('btn-cancel-current-event').addEventListener('click', closeConfirmCurrentEventModal);
document.getElementById('btn-close-confirm-current-event').addEventListener('click', closeConfirmCurrentEventModal);

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
      _selectedGridIds = folder?.grids?.filter(g => !g.archived).map(g => g.id) || [];
      saveLocalSelectedGrids(_selectedGridIds);
      renderAllFolders();
      renderElements();
      renderGridsList();
      renderGrid();
    }
  });
}
const _btnCeSetHeader = document.getElementById('btn-ce-set-header');
if (_btnCeSetHeader) {
  _btnCeSetHeader.addEventListener('click', () => {
    const onTlPage = document.getElementById('page-tierlist')?.classList.contains('active');
    if (onTlPage) {
      const tl = typeof tlActiveTierlist === 'function' ? tlActiveTierlist() : null;
      if (tl) confirmSetCurrentEventTierlist(tl.id);
    } else if (_localActiveFolderId) {
      confirmSetCurrentEventFolder(_localActiveFolderId);
    }
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

const modalArchivesUnifiedOverlay = document.getElementById('modal-archives-unified-overlay');

function openArchivesUnified() {
  renderArchivesUnified();
  modalArchivesUnified.classList.add('open');
  modalArchivesUnifiedOverlay.classList.add('open');
}

function closeArchivesUnified() {
  modalArchivesUnified.classList.remove('open');
  modalArchivesUnifiedOverlay.classList.remove('open');
}
modalArchivesUnifiedOverlay.addEventListener('click', closeArchivesUnified);

document.getElementById('btn-archives-unified').addEventListener('click', () => {
  if (modalArchivesUnified.classList.contains('open')) closeArchivesUnified();
  else openArchivesUnified();
});
document.getElementById('btn-close-archives-unified').addEventListener('click', closeArchivesUnified);

// ── Panneau dossiers (bouton legacy caché, garde sa fonction pour compat JS) ──
document.getElementById('btn-folders-panel').addEventListener('click', () => openFoldersPage('bingo'));

const _foldersSortSelect = document.getElementById('folders-sort-select');
if (_foldersSortSelect) {
  _foldersSortSelect.addEventListener('change', () => {
    localStorage.setItem('bingoFoldersSortMode', _foldersSortSelect.value);
    renderFoldersPanelTree();
  });
}

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

const modalTrashUnifiedOverlay = document.getElementById('modal-trash-unified-overlay');

function openTrashUnified() {
  renderTrashList();
  modalTrashUnified.classList.add('open');
  modalTrashUnifiedOverlay.classList.add('open');
}

function closeTrashUnified() {
  modalTrashUnified.classList.remove('open');
  modalTrashUnifiedOverlay.classList.remove('open');
}
modalTrashUnifiedOverlay.addEventListener('click', closeTrashUnified);

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
    // La page Bingo peut avoir été rendue pendant qu'elle était masquée (display:none sur
    // un ancêtre) — les mesures de _adjustBingoGridSizes() étaient alors nulles/fausses et
    // rien ne les recalculait tant qu'aucune case n'était cliquée. Recalculer après paint
    // dès que Bingo redevient visible.
    if (target === 'bingo' && typeof _adjustBingoGridSizes === 'function') {
      requestAnimationFrame(_adjustBingoGridSizes);
    }
    // Même piège que Bingo ci-dessus : _adjustTlLayoutHeight() tourne à chaque tlRender(), mais
    // si la page tierlist était encore masquée à ce moment (ex. rendue une fois avant que l'onglet
    // ne soit cliqué), la mesure faisait un early-return et .tl-layout gardait son calc(100vh - 200px)
    // de base — trop grand une fois le panneau de contrôle réellement affiché, d'où le scroll de
    // page à la première visite. Recalculer après paint dès que Tier List redevient visible.
    if (target === 'tierlist' && typeof _adjustTlLayoutHeight === 'function') {
      requestAnimationFrame(_adjustTlLayoutHeight);
    }
    if (target === 'home' && typeof renderHomePage === 'function') renderHomePage();
    if (target === 'folders' && typeof _renderFoldersPage === 'function') _renderFoldersPage();
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

// Presets de tiers par défaut — copiés dans tlState.tierPresets au premier chargement (voir
// _tlNormalizeState), pour que l'utilisateur puisse ensuite les modifier/supprimer comme les siens.
const TL_SEED_PRESETS = [
  { name: 'Standard', tiers: TL_DEFAULT_TIERS.map(t => ({ ...t })) },
  // Même ordre de labels (S→D) que Standard, mais couleurs inversées (bleu→rouge)
  { name: 'Inversé', tiers: TL_DEFAULT_TIERS.map((t, i) => ({ label: t.label, color: TL_DEFAULT_TIERS[TL_DEFAULT_TIERS.length - 1 - i].color })) },
];
function tlGetAllPresets() {
  return tlState.tierPresets || [];
}

// ── État ──────────────────────────────────────────────────────────────────────
let tlState = { tierlists: [], folders: [] };
let _tlRemoteUpdate = false; // anti-boucle Firebase
const _dbTierlist = firebase.database().ref('tierlist');

// Borne une taille d'image tierlist dans la plage valide (100–200), y compris une valeur
// stockée avant l'introduction de cette borne (ex: anciennes tierlists à 50/60/80).
function _tlClampImgSize(v) {
  return Math.max(100, Math.min(200, v || 100));
}

// Prefs tierlist — personnelles par utilisateur (non partagées)
let _tlLocalShowLabels      = null; // null = pas encore chargé
let _tlLocalImgSize         = null;
let _tlLocalUnplacedImgSize = null; // taille des images du cadre "Éléments non placés" (indépendante de la tierlist)
let _tlLocalUnplacedShowLabels = null; // afficher/masquer noms du cadre "Éléments non placés" (indépendant de la tierlist)
let _tlLocalUnplacedHidden  = false; // true = cadre "Éléments non placés" masqué (préférence locale)
let _tlLocalSplit           = null; // % de largeur allouée aux tiers (le reste va aux éléments non placés), null = pas encore chargé
let _tlLocalActiveTierlistId = null; // null = pas encore chargé
let _tlLocalActiveFolderId  = null; // dossier sélectionné (vide) sans tierlist active
let _tlLocalNoSelection     = false; // true = l'utilisateur a délibérément désélectionné
// Vue du panneau Dossiers Tier List : 'list' (façon Explorateur, lignes) ou 'icons' (façon
// Explorateur, tuiles) — mêmes principes que côté Bingo (_foldersViewMode/_foldersNavFolderId).
let _tlFoldersViewMode = 'list';
// Dossier actuellement ouvert dans le panneau Dossiers (null = racine), partagé entre vue liste et
// vue icônes — indépendant de _tlLocalActiveFolderId : naviguer dans le panneau ne doit pas changer
// le dossier/tierlist actifs tant qu'on n'a pas explicitement "ouvert" quelque chose.
let _tlFoldersNavFolderId = null;

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
  if (!parsed || typeof parsed !== 'object') {
    return { tierlists: [], folders: [], trash: [], tierPresets: TL_SEED_PRESETS.map(p => ({ id: uid(), name: p.name, tiers: p.tiers.map(t => ({ ...t })) })), tierPresetsSeeded: true };
  }
  if (!Array.isArray(parsed.tierlists)) parsed.tierlists = [];
  if (!Array.isArray(parsed.folders)) parsed.folders = [];
  if (!Array.isArray(parsed.trash)) parsed.trash = [];
  if (!Array.isArray(parsed.tierPresets)) parsed.tierPresets = [];
  // Injecter les presets par défaut une seule fois (première utilisation) — ensuite l'utilisateur
  // peut les renommer/recolorer/supprimer librement, comme n'importe quel preset personnalisé.
  let _tlPresetsSeededNow = false;
  if (!parsed.tierPresetsSeeded) {
    parsed.tierPresets = [
      ...TL_SEED_PRESETS.map(p => ({ id: uid(), name: p.name, tiers: p.tiers.map(t => ({ ...t })) })),
      ...parsed.tierPresets,
    ];
    parsed.tierPresetsSeeded = true;
    _tlPresetsSeededNow = true;
  }
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
  let _tlMigrated = _tlPresetsSeededNow;
  parsed.tierlists.forEach(tl => {
    if (tl.isTemplate || !tl.templateId || tl.images.length === 0) return;
    const template = parsed.tierlists.find(t => t.id === tl.templateId && t.isTemplate);
    if (!template) return;
    const existingIds = new Set(template.images.map(i => i.id));
    tl.images.forEach(img => { if (!existingIds.has(img.id)) { template.images.push(img); existingIds.add(img.id); } });
    tl.images = [];
    _tlMigrated = true;
  });
  // Nettoyage : la migration ci-dessus a pu, par le passé, dupliquer des images identiques (même
  // contenu, ids différents) venant de plusieurs tierlists générées dans un même template — gonflant
  // artificiellement son compteur d'éléments. On déduplique chaque template par contenu réel (src pour
  // une image, name+color pour une carte texte), en remappant toutes les références (unplaced/tiers)
  // de tous les membres du groupe vers l'id conservé, puis on retire les ids orphelins (qui ne
  // pointent plus vers aucune image existante).
  parsed.tierlists.forEach(template => {
    if (!template.isTemplate || !Array.isArray(template.images) || template.images.length === 0) return;
    const keyOf = img => img.type === 'text' ? 'text:' + img.name + ':' + img.color : 'img:' + img.src;
    const seen = new Map(); // clé de contenu -> id conservé
    const idRemap = new Map(); // id dupliqué -> id conservé
    const dedupedImages = [];
    template.images.forEach(img => {
      const key = keyOf(img);
      if (seen.has(key)) {
        idRemap.set(img.id, seen.get(key));
      } else {
        seen.set(key, img.id);
        dedupedImages.push(img);
      }
    });
    if (idRemap.size === 0) return;
    template.images = dedupedImages;
    const validIds = new Set(dedupedImages.map(i => i.id));
    const members = parsed.tierlists.filter(t => t.id === template.id || t.templateId === template.id);
    members.forEach(member => {
      const remapAndDedupe = ids => {
        const out = [];
        const outSeen = new Set();
        ids.forEach(id => {
          const realId = idRemap.get(id) || id;
          if (validIds.has(realId) && !outSeen.has(realId)) { out.push(realId); outSeen.add(realId); }
        });
        return out;
      };
      member.unplaced = remapAndDedupe(member.unplaced || []);
      (member.tiers || []).forEach(tier => { tier.items = remapAndDedupe(tier.items || []); });
    });
    _tlMigrated = true;
  });
  // Réparation : le même bug historique du Ctrl+V (cf. plus bas) a aussi pu écrire un id d'image dans
  // unplaced/tiers d'un membre SANS jamais créer l'image correspondante dans root.images (l'ancien
  // code faisait les deux opérations sur des objets différents — tl.images d'un côté, tl.unplaced de
  // l'autre — donc l'une des deux a pu se perdre selon l'ordre exact des sync Firebase). Résultat :
  // un id fantôme, compté dans "non placés" (tlRenderUnplaced ne filtre le rendu des cartes que via
  // `if (img)`, pas le compteur lui-même) mais invisible et impossible à cliquer/supprimer puisque
  // tlFindImage ne le retrouve dans aucune image existante. On retire ici tout id de unplaced/tiers
  // qui ne correspond à aucune image de root.images, pour tous les membres du groupe (le template
  // compris, puisqu'il peut aussi porter un toPlaceImgId orphelin).
  parsed.tierlists.forEach(template => {
    if (!template.isTemplate) return;
    const validIds = new Set((template.images || []).map(i => i.id));
    const members = parsed.tierlists.filter(t => t.id === template.id || t.templateId === template.id);
    members.forEach(member => {
      const beforeUnplaced = member.unplaced.length;
      member.unplaced = member.unplaced.filter(id => validIds.has(id));
      if (member.unplaced.length !== beforeUnplaced) _tlMigrated = true;
      (member.tiers || []).forEach(tier => {
        const beforeItems = tier.items.length;
        tier.items = tier.items.filter(id => validIds.has(id));
        if (tier.items.length !== beforeItems) _tlMigrated = true;
      });
    });
    if (template.toPlaceImgId && !validIds.has(template.toPlaceImgId)) {
      template.toPlaceImgId = null;
      _tlMigrated = true;
    }
  });
  // Réparation : bug historique (Ctrl+V ajoutait l'image sur tl.images/tl.unplaced du seul membre
  // actif au lieu de root.images + unplaced de TOUS les membres, cf. paste listener) a pu laisser des
  // images présentes dans root.images sans être référencées par certains participants — invisibles
  // pour eux, et un compteur "non placés" qui ne correspond plus au nombre de cartes réellement
  // rendues chez le membre qui les a collées (l'image existe bien dans root.images, mais si elle a
  // ensuite été fusionnée/dédupliquée ci-dessus son id remappé n'a jamais été ajouté ailleurs que là
  // où il existait déjà). On raccroche chaque image manquante à la zone "non placés" de chaque
  // participant qui ne la référence encore nulle part, pour que tous les membres d'un même groupe
  // aient toujours le même total d'éléments.
  parsed.tierlists.forEach(template => {
    if (!template.isTemplate || !Array.isArray(template.images) || template.images.length === 0) return;
    // Le template lui-même a sa propre zone "non placés" (il ne place juste jamais rien dans ses
    // tiers, cf. garde-fou tl.isTemplate && targetZoneId !== '__unplaced__') — il doit donc être
    // réparé comme n'importe quel membre, sinon une image ajoutée par le bug ne réapparaît que chez
    // les participants et reste absente du template lui-même.
    const members = parsed.tierlists.filter(t => t.id === template.id || t.templateId === template.id);
    if (members.length === 0) return;
    const allImgIds = template.images.map(i => i.id);
    members.forEach(member => {
      const referenced = new Set(member.unplaced || []);
      (member.tiers || []).forEach(tier => tier.items.forEach(id => referenced.add(id)));
      allImgIds.forEach(id => {
        if (!referenced.has(id)) { member.unplaced.push(id); referenced.add(id); _tlMigrated = true; }
      });
    });
  });
  // Nettoyage défensif : un toPlaceImgId dont tous les participants existants ont déjà résolu
  // (typiquement des données antérieures à l'ajout de _tlClearToPlaceIfAllResolved, ou un état
  // Firebase resté figé) doit être effacé au chargement — sinon une tierlist créée ensuite hérite
  // à tort d'un "élément en attente" alors que le groupe a déjà terminé.
  parsed.tierlists.forEach(template => {
    if (!template.isTemplate || !template.toPlaceImgId) return;
    const participants = parsed.tierlists.filter(t => t.templateId === template.id && !t.isTemplate);
    const imgId = template.toPlaceImgId;
    const isResolved = m => (m.resolvedToPlaceIds || []).includes(imgId) || (m.tiers || []).some(t => t.items.includes(imgId));
    if (participants.length > 0 && participants.every(isResolved)) {
      template.toPlaceImgId = null;
    }
  });
  parsed._tlMigrated = _tlMigrated;
  return parsed;
}

// ── Stack Undo ─────────────────────────────────────────────────────────────────
// Historique local à CET utilisateur (jamais synchronisé) : chaque entrée décrit une opération
// inverse ciblée (déplacer/ajouter/supprimer/renommer une image, ajouter/modifier/supprimer/réordonner
// un tier) plutôt qu'un snapshot complet de tlState. Un snapshot global se rejouait par-dessus l'état
// reçu entre-temps d'un autre utilisateur (via _dbTierlist.on('value')), écrasant son travail — une
// opération ciblée se réapplique sur l'état COURANT et ne touche que ce qu'elle décrit, donc les actions
// d'un autre utilisateur survenues entre-temps restent intactes. Portée volontairement limitée à
// images + tiers (le reste — dossiers, tierlists entières, archivage... — n'est pas couvert par Annuler).
const _TL_UNDO_MAX = 10;
let _tlUndoStack = []; // chaque entrée = { tierlistId, groupRootId, type, ...payload }

// Cache global id→src : alimenté à chaque import/paste, jamais vidé.
// Permet de restaurer les src même si l'image a été supprimée de tlState.
const _tlSrcCache = {};

function _tlCacheSrcs(tl) {
  (tl.images || []).forEach(img => { if (img.src) _tlSrcCache[img.id] = img.src; });
}

function _tlPushUndoOp(op) {
  _tlUndoStack.push(op);
  if (_tlUndoStack.length > _TL_UNDO_MAX) _tlUndoStack.shift();
  tlUpdateUndoBtn();
}

// Retrouve où se trouve imgId dans la tierlist tl : '__unplaced__' ou l'id d'un tier, avec l'index.
function _tlLocateImage(tl, imgId) {
  const uIdx = tl.unplaced.indexOf(imgId);
  if (uIdx !== -1) return { zone: '__unplaced__', index: uIdx };
  for (const tier of tl.tiers) {
    const idx = tier.items.indexOf(imgId);
    if (idx !== -1) return { zone: tier.id, index: idx };
  }
  return null;
}

function _tlRemoveImageFromAllZones(tl, imgId) {
  tl.unplaced = tl.unplaced.filter(id => id !== imgId);
  tl.tiers.forEach(t => { t.items = t.items.filter(id => id !== imgId); });
}

function _tlPlaceImageAt(tl, imgId, zone, index) {
  const list = zone === '__unplaced__' ? tl.unplaced : (tl.tiers.find(t => t.id === zone) || {}).items;
  if (!list) { tl.unplaced.push(imgId); return; }
  const idx = Math.max(0, Math.min(index, list.length));
  list.splice(idx, 0, imgId);
}

function tlUndo() {
  if (_tlUndoStack.length === 0) return;
  const op = _tlUndoStack.pop();
  const tl = tlState.tierlists.find(t => t.id === op.tierlistId);
  if (!tl) { tlUpdateUndoBtn(); return; }
  const root = op.groupRootId ? (tlState.tierlists.find(t => t.id === op.groupRootId) || tl) : tl;

  switch (op.type) {
    case 'moveImage':
      _tlRemoveImageFromAllZones(tl, op.imgId);
      _tlPlaceImageAt(tl, op.imgId, op.fromZone, op.fromIndex);
      break;
    case 'addImage': {
      if (!root.images) root.images = [];
      const idx = root.images.findIndex(i => i.id === op.imgId);
      if (idx !== -1) root.images.splice(idx, 1);
      _tlGetGroupMembers(tl).forEach(member => _tlRemoveImageFromAllZones(member, op.imgId));
      break;
    }
    case 'deleteImage':
      if (op.img.src) _tlSrcCache[op.img.id] = op.img.src;
      (root.images || (root.images = [])).push(op.img);
      const member = tlState.tierlists.find(t => t.id === op.tierlistId);
      if (member) _tlPlaceImageAt(member, op.img.id, op.zone, op.index);
      break;
    case 'renameImage': {
      const img = (root.images || []).find(i => i.id === op.imgId);
      if (img) img.name = op.oldName;
      break;
    }
    case 'addTier':
      tl.tiers = tl.tiers.filter(t => t.id !== op.tierId);
      break;
    case 'deleteTier': {
      const idx = Math.max(0, Math.min(op.index, tl.tiers.length));
      tl.tiers.splice(idx, 0, op.tier);
      op.tier.items.forEach(imgId => { tl.unplaced = tl.unplaced.filter(id => id !== imgId); });
      break;
    }
    case 'editTier': {
      const tier = tl.tiers.find(t => t.id === op.tierId);
      if (tier) { tier.label = op.oldLabel; tier.color = op.oldColor; }
      break;
    }
    case 'reorderTier': {
      const fromIdx = tl.tiers.findIndex(t => t.id === op.tierId);
      if (fromIdx !== -1) {
        const [moved] = tl.tiers.splice(fromIdx, 1);
        tl.tiers.splice(Math.max(0, Math.min(op.fromIndex, tl.tiers.length)), 0, moved);
      }
      break;
    }
    case 'replaceTiers': {
      tl.tiers = op.oldTiers;
      tl.unplaced = op.oldUnplaced;
      break;
    }
  }
  tlSave();
  tlRender();
  // tlRender() ne touche jamais .tl-compare-view (masqué dans le mode comparaison, seule
  // l'éditeur normal en dépend) — sans ce re-render dédié, l'undo modifiait bien les données mais
  // l'écran de comparaison restait figé sur l'ancien état, donnant l'impression que le bouton ne
  // faisait rien.
  if (document.body.classList.contains('compare-tierlist-mode')) {
    const ids = _tlCompareSelectedIds || [];
    const tls = ids.map(id => tlState.tierlists.find(t => t.id === id)).filter(Boolean);
    _tlRenderCompareView(tls);
  }
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

// Dossier "actuellement sélectionné" pour préremplir le parent d'un nouveau dossier/template :
// le dossier vide explicitement cliqué, sinon le dossier de la tierlist/template actif.
function _tlCurrentSelectedFolderId() {
  if (_tlLocalActiveFolderId) return _tlLocalActiveFolderId;
  const tl = tlActiveTierlist();
  return tl ? _tlEffectiveFolderId(tl) : null;
}

function tlDefaultTierlist(name, isTemplate = false) {
  return {
    id: uid(),
    name,
    archived: false,
    showLabels: true,
    imgSize: 100,
    unplacedSort: 'manual',
    isTemplate,
    tiers: TL_DEFAULT_TIERS.map(t => ({ id: uid(), label: t.label, color: t.color, items: [] })),
    unplaced: [],
    images: [],
  };
}

// Copie triée de tl.unplaced pour l'affichage — ne mute jamais tl.unplaced (le drag&drop manuel s'appuie dessus)
// Modes : 'manual' (ordre réel de tl.unplaced) | 'alpha'/'alpha-desc' (nom) | 'updatedAt'/'updatedAt-asc' (date de modification, récent→ancien par défaut)
function _tlGetSortedUnplaced(tl) {
  const ids = tl.unplaced.slice();
  const mode = tl.unplacedSort || 'manual';
  if (mode === 'alpha' || mode === 'alpha-desc') {
    ids.sort((a, b) => {
      const ia = tlFindImage(tl, a), ib = tlFindImage(tl, b);
      return (ia ? ia.name : '').localeCompare(ib ? ib.name : '', 'fr', { sensitivity: 'base' });
    });
    if (mode === 'alpha-desc') ids.reverse();
    return ids;
  }
  if (mode === 'updatedAt' || mode === 'updatedAt-asc') {
    ids.sort((a, b) => {
      const ia = tlFindImage(tl, a), ib = tlFindImage(tl, b);
      return (ib?.updatedAt || 0) - (ia?.updatedAt || 0);
    });
    if (mode === 'updatedAt-asc') ids.reverse();
    return ids;
  }
  // 'manual' : ordre réel de tl.unplaced
  return ids;
}

// ── Dossiers ──────────────────────────────────────────────────────────────────
// Structure : folders = [{ id, name, archived, open, parentId }]
// tierlists[].folderId = id du dossier parent (ou null)
// folders[].parentId   = id du dossier parent (ou null = racine)

function tlDefaultFolder(name, parentId, numbering = null) {
  const now = Date.now();
  return { id: uid(), name, archived: false, open: true, parentId: parentId || null, createdAt: now, updatedAt: now, numbering: numbering || null };
}

// Remonte updatedAt = Date.now() sur folderId et tous ses ancêtres (pour le tri "Date de modification").
function tlTouchFolderChain(folderId) {
  if (!folderId) return;
  const now = Date.now();
  let current = (tlState.folders || []).find(f => f.id === folderId);
  while (current) {
    current.updatedAt = now;
    current = current.parentId ? (tlState.folders || []).find(f => f.id === current.parentId) : null;
  }
}

// Dossier réel d'une tierlist : celui du template si elle en suit un vivant (les tierlists générées
// n'ont plus de folderId propre fiable, elles héritent toujours du dossier de leur template), sinon
// son propre folderId. Source unique à utiliser partout au lieu de lire tl.folderId directement.
function _tlEffectiveFolderId(tl) {
  if (!tl) return null;
  if (tl.templateId) {
    const template = tlState.tierlists.find(t => t.id === tl.templateId && t.isTemplate);
    if (template) return template.folderId || null;
  }
  return tl.folderId || null;
}

// Retourne le chemin complet d'un dossier ("Racine \ Enfant \ Petit-enfant")
function _tlFolderPath(folderId) {
  const chain = [];
  let current = (tlState.folders || []).find(f => f.id === folderId);
  while (current) {
    chain.unshift(current.name);
    current = current.parentId ? (tlState.folders || []).find(f => f.id === current.parentId) : null;
  }
  return chain.join(' \\ ');
}

// Préfixe de chemin affiché avant le nom de la tierlist : dossiers \ (template) — même logique que
// le préfixe du titre dans l'éditeur (tlRender), réutilisée pour Export PNG / Capture (_tlBuildCanvas).
// Retourne '' si la tierlist est à la racine (pas de dossier, pas de template).
function _tlTitlePathPrefix(tl) {
  const parts = [];
  const folderPath = _tlFolderPath(_tlEffectiveFolderId(tl));
  if (folderPath) parts.push(folderPath);
  if (tl.templateId) {
    const template = tlState.tierlists.find(t => t.id === tl.templateId && t.isTemplate);
    if (template) parts.push(template.name);
  }
  return parts.join(' \\ ');
}

// Chemin complet affiché en titre : dossiers \ (template \) nom de la tierlist.
function _tlFullTitlePath(tl) {
  const prefix = _tlTitlePathPrefix(tl);
  return prefix ? prefix + ' \\ ' + tl.name : tl.name;
}

// Chemin commun affiché en mode comparaison : toujours le chemin jusqu'au template (dossiers \
// template), jamais le nom propre d'un membre — qu'il y ait 1 ou plusieurs listes sélectionnées.
// ex. "Miss Univers \ 2026 \ Brésil (template)", que la comparaison montre Jérôme, Adrien, ou les deux.
function _tlCommonTitlePath(tls) {
  const prefix = _tlTitlePathPrefix(tls[0]);
  return prefix || tls.map(_tlFullTitlePath).join(' vs ');
}

// Retourne tous les ids descendants d'un dossier (récursif)
function _tlGetDescendantIds(id) {
  const children = (tlState.folders || []).filter(f => f.parentId === id);
  const ids = children.map(f => f.id);
  children.forEach(f => { ids.push(..._tlGetDescendantIds(f.id)); });
  return ids;
}

function tlCreateFolder(name, parentId, numbering = null) {
  if (!tlState.folders) tlState.folders = [];
  const folder = tlDefaultFolder(name, parentId || null, numbering);
  tlState.folders.push(folder);
  if (parentId) tlTouchFolderChain(parentId);
  tlSave();
  tlRender();
}

function tlRenameFolder(id, newName) {
  const folder = (tlState.folders || []).find(f => f.id === id);
  if (folder && newName.trim()) { folder.name = newName.trim(); tlTouchFolderChain(id); }
  tlSave();
  tlRender();
}

function tlMoveFolderToParent(id, newParentId) {
  const folder = (tlState.folders || []).find(f => f.id === id);
  if (!folder) return;
  // Interdire de mettre un dossier dans lui-même ou dans un de ses descendants
  if (newParentId && (newParentId === id || _tlGetDescendantIds(id).includes(newParentId))) return;
  folder.parentId = newParentId || null;
  tlSave();
  tlRender();
}

// Duplique un dossier et tout son contenu (récursif) : sous-dossiers, tierlists, templates avec leurs
// tierlists générées (repointées vers le template dupliqué, jamais vers l'original). Chaque tierlist/
// template copié obtient un nouvel id et de nouveaux ids d'image (même remap que tlCopy), pour rester
// totalement indépendant de l'original.
function _tlDuplicateTierlistDeep(src, folderId, templateIdOverride) {
  const copy = JSON.parse(JSON.stringify(src));
  copy.id = uid();
  copy.name = src.name + ' (copie)';
  copy.archived = false;
  // Une tierlist générée (templateIdOverride défini) n'a pas de folderId propre : elle suit son template copié.
  if (templateIdOverride !== undefined) { copy.templateId = templateIdOverride; delete copy.folderId; }
  else copy.folderId = folderId;
  const idMap = {};
  copy.images = (copy.images || []).map(img => {
    const newId = uid();
    idMap[img.id] = newId;
    return { ...img, id: newId };
  });
  copy.tiers = (copy.tiers || []).map(t => ({
    ...t,
    id: uid(),
    items: t.items.map(oid => idMap[oid] || oid),
  }));
  copy.unplaced = (copy.unplaced || []).map(oid => idMap[oid] || oid);
  tlState.tierlists.push(copy);
  return copy;
}

// explicitNumbering : numérotation déjà choisie par l'utilisateur pour le dossier racine dupliqué
// (prioritaire sur l'auto-incrément) — ne s'applique qu'au dossier racine, pas aux sous-dossiers
// récursifs qui gardent leur propre auto-incrément.
function tlDuplicateFolder(id, newParentId, explicitNumbering) {
  const folder = (tlState.folders || []).find(f => f.id === id);
  if (!folder) return;
  if (!tlState.folders) tlState.folders = [];

  const cloneRecursive = (srcFolder, targetParentId, forcedNumbering) => {
    let newName = srcFolder.name;
    let newNumbering = null;
    if (forcedNumbering !== undefined) {
      newNumbering = forcedNumbering;
      newName = newNumbering ? formatNumberedFolderName(newNumbering) : srcFolder.name;
    } else if (srcFolder.numbering) {
      const siblings = (tlState.folders || []).filter(f => !f.archived && (f.parentId || null) === (targetParentId || null));
      newNumbering = { ...srcFolder.numbering, number: _nextFolderNumber(siblings, srcFolder.numbering.type) };
      newName = formatNumberedFolderName(newNumbering);
    }
    const newFolder = tlDefaultFolder(newName, targetParentId, newNumbering);
    tlState.folders.push(newFolder);

    // Templates + leurs tierlists générées (repointées vers la copie du template)
    const templates = tlState.tierlists.filter(t => !t.archived && t.folderId === srcFolder.id && t.isTemplate);
    templates.forEach(tpl => {
      const tplCopy = _tlDuplicateTierlistDeep(tpl, newFolder.id);
      const generated = tlState.tierlists.filter(t => !t.archived && t.templateId === tpl.id);
      generated.forEach(gen => _tlDuplicateTierlistDeep(gen, newFolder.id, tplCopy.id));
    });

    // Tierlists normales (ni template, ni générées depuis un template déjà traité ci-dessus)
    const plain = tlState.tierlists.filter(t => !t.archived && t.folderId === srcFolder.id && !t.isTemplate && !t.templateId);
    plain.forEach(tl => _tlDuplicateTierlistDeep(tl, newFolder.id));

    // Sous-dossiers
    (tlState.folders || []).filter(f => !f.archived && f.parentId === srcFolder.id && f.id !== newFolder.id)
      .forEach(sub => cloneRecursive(sub, newFolder.id));

    return newFolder;
  };

  const result = cloneRecursive(folder, newParentId !== undefined ? newParentId : (folder.parentId || null), explicitNumbering);
  tlSave();
  tlRender();
  return result;
}

function tlArchiveFolder(id) {
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
  const allIds = [id, ..._tlGetDescendantIds(id)];
  const folder = (tlState.folders || []).find(f => f.id === id);
  if (folder && folder.parentId) tlTouchFolderChain(folder.parentId);
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
  const tl = tlState.tierlists.find(t => t.id === tlId);
  if (!tl) return;
  // Une tierlist rattachée à un template vivant suit toujours son dossier — on déplace le template à sa place.
  if (_tlHasLiveTemplate(tl)) {
    tlMoveTierlistToFolder(tl.templateId, folderId);
    return;
  }
  const oldFolderId = tl.folderId;
  tl.folderId = folderId || null;
  tlTouchFolderChain(oldFolderId);
  tlTouchFolderChain(folderId);
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
const tlEditorBody        = document.getElementById('tl-editor-body');
const tlShowLabelsToggle  = document.getElementById('tl-show-labels-toggle');
const tlUnplacedShowLabelsToggle = document.getElementById('tl-unplaced-show-labels-toggle');

function _tlEyeToggleHtml(shown) {
  return `<i data-lucide="${shown ? 'eye-off' : 'eye'}"></i> Noms`;
}
function _tlUpdateShowLabelsBtn(showLabels) {
  tlShowLabelsToggle.innerHTML = _tlEyeToggleHtml(showLabels);
  tlShowLabelsToggle.classList.toggle('active', !!showLabels);
  const compareToggle = document.getElementById('tl-compare-show-labels-toggle');
  if (compareToggle) {
    compareToggle.innerHTML = _tlEyeToggleHtml(showLabels);
    compareToggle.classList.toggle('active', !!showLabels);
  }
  if (window.lucide) lucide.createIcons();
}
function _tlUpdateUnplacedShowLabelsBtn(showLabels) {
  if (!tlUnplacedShowLabelsToggle) return;
  tlUnplacedShowLabelsToggle.innerHTML = _tlEyeToggleHtml(showLabels);
  tlUnplacedShowLabelsToggle.classList.toggle('active', !!showLabels);
  if (window.lucide) lucide.createIcons();
}
const tlImgSizeSlider     = document.getElementById('tl-img-size-slider');
const tlUnplacedImgSizeSlider = document.getElementById('tl-unplaced-img-size-slider');
const tlSplitSlider       = document.getElementById('tl-split-slider');
const tlSplitValueInput   = document.getElementById('tl-split-value-input');
const tlSplitValueInputRight = document.getElementById('tl-split-value-input-right');
const tlBtnAddTier        = document.getElementById('tl-btn-add-tier');
const tlBtnUndo           = document.getElementById('tl-btn-undo');
const tlBtnReset          = document.getElementById('tl-btn-reset');
const tlFileInput         = document.getElementById('tl-file-input');
const tlBtnExport         = document.getElementById('tl-btn-export');
const tlBtnCapture        = document.getElementById('tl-btn-capture');
const tlTiersZone         = document.getElementById('tl-tiers-zone');
const tlUnplacedZone      = document.getElementById('tl-unplaced-zone');
const tlUnplacedCount     = document.getElementById('tl-unplaced-count');
const tlUnplacedSortBtn   = document.getElementById('tl-unplaced-sort-btn');
const tlBtnAddImage       = document.getElementById('tl-btn-add-image');
const tlAddTextInput      = document.getElementById('tl-add-text-input');
const tlMaxImagesInput    = document.getElementById('tl-max-images-input');
const tlControlPanel      = document.getElementById('tl-control-panel');
const tlGroupElems        = document.querySelectorAll('.tl-group-elem');
const tlGroupBreadcrumb   = document.getElementById('tl-group-breadcrumb');

// Fallback dragover sur le conteneur de tiers lui-même : ses zones de padding/marges entre tiers
// ne sont couvertes par aucun listener dragover enfant (.tl-tier-wrap / .tl-tier-images), donc le
// navigateur y affiche son icône "interdit" faute de preventDefault() — d'où l'impression que le
// curseur "change" dès qu'on quitte un tier pendant un drag.
tlTiersZone.addEventListener('dragover', e => { if (_tlTierDragId || tlDragImgId) e.preventDefault(); });

// Auto-scroll pendant un drag&drop : le navigateur ne scrolle jamais automatiquement une zone
// en overflow pendant un dragover natif — sans ça, impossible de déposer une image hors de la
// portion actuellement visible de .tl-tiers-zone (scroll interne) ou de la page (scroll de fenêtre).
// Boucle rAF à vitesse progressive (douce près du seuil, jusqu'à TL_AUTOSCROLL_MAX_SPEED collé au
// bord) plutôt qu'un saut fixe par événement dragover (qui arrive en rafale et donnait un scroll saccadé).
const TL_AUTOSCROLL_EDGE = 70;
const TL_AUTOSCROLL_MAX_SPEED = 6;
let _tlAutoScrollDir = 0; // -1 haut, 0 aucun, 1 bas
let _tlAutoScrollTarget = null;
let _tlAutoScrollStrength = 0;
let _tlAutoScrollRafId = null;

function _tlAutoScrollStep() {
  if (_tlAutoScrollDir !== 0 && _tlAutoScrollTarget) {
    const amount = _tlAutoScrollDir * TL_AUTOSCROLL_MAX_SPEED * _tlAutoScrollStrength;
    if (_tlAutoScrollTarget === window) window.scrollBy(0, amount);
    else _tlAutoScrollTarget.scrollTop += amount;
    _tlAutoScrollRafId = requestAnimationFrame(_tlAutoScrollStep);
  } else {
    _tlAutoScrollRafId = null;
  }
}

function _tlSetAutoScroll(target, dir, strength) {
  _tlAutoScrollTarget = target;
  _tlAutoScrollDir = dir;
  _tlAutoScrollStrength = strength;
  if (dir !== 0 && _tlAutoScrollRafId === null) _tlAutoScrollRafId = requestAnimationFrame(_tlAutoScrollStep);
}

document.addEventListener('dragover', e => {
  if (tlTiersZone && tlTiersZone.contains(e.target)) {
    const rect = tlTiersZone.getBoundingClientRect();
    const distTop = e.clientY - rect.top;
    const distBottom = rect.bottom - e.clientY;
    if (distTop < TL_AUTOSCROLL_EDGE) { _tlSetAutoScroll(tlTiersZone, -1, 1 - Math.max(distTop, 0) / TL_AUTOSCROLL_EDGE); return; }
    if (distBottom < TL_AUTOSCROLL_EDGE) { _tlSetAutoScroll(tlTiersZone, 1, 1 - Math.max(distBottom, 0) / TL_AUTOSCROLL_EDGE); return; }
    _tlSetAutoScroll(null, 0, 0);
    return;
  }
  // Mode comparaison : chaque colonne a son propre scroll interne indépendant (pas de scroll de
  // fenêtre possible, .main est en overflow:hidden) — il faut cibler la colonne sous le curseur.
  const compareCol = e.target.closest && e.target.closest('.tl-compare-column');
  if (compareCol) {
    const rect = compareCol.getBoundingClientRect();
    const distTop = e.clientY - rect.top;
    const distBottom = rect.bottom - e.clientY;
    if (distTop < TL_AUTOSCROLL_EDGE) { _tlSetAutoScroll(compareCol, -1, 1 - Math.max(distTop, 0) / TL_AUTOSCROLL_EDGE); return; }
    if (distBottom < TL_AUTOSCROLL_EDGE) { _tlSetAutoScroll(compareCol, 1, 1 - Math.max(distBottom, 0) / TL_AUTOSCROLL_EDGE); return; }
    _tlSetAutoScroll(null, 0, 0);
    return;
  }
  const distTop = e.clientY;
  const distBottom = window.innerHeight - e.clientY;
  if (distTop < TL_AUTOSCROLL_EDGE) { _tlSetAutoScroll(window, -1, 1 - Math.max(distTop, 0) / TL_AUTOSCROLL_EDGE); return; }
  if (distBottom < TL_AUTOSCROLL_EDGE) { _tlSetAutoScroll(window, 1, 1 - Math.max(distBottom, 0) / TL_AUTOSCROLL_EDGE); return; }
  _tlSetAutoScroll(null, 0, 0);
}, true);
document.addEventListener('dragend', () => _tlSetAutoScroll(null, 0, 0));
document.addEventListener('drop', () => _tlSetAutoScroll(null, 0, 0));


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
    tlMoveTierlistToFolder(_tlSidebarDragId, targetId);
    return;
  }

  // Réordonner : construire un tableau plat de références [{ type, id }]
  if (!tlState.folders) tlState.folders = [];

  if (_tlSidebarDragType === 'tierlist') {
    // Réordonner les tierlists dans leur contexte (même dossier)
    const dragTl = tlState.tierlists.find(t => t.id === _tlSidebarDragId);
    if (!dragTl) return;
    // Une tierlist rattachée à un template vivant ne change jamais de dossier indépendamment de lui —
    // seul son ordre interne au groupe (non géré ici) peut varier, on ignore le drop inter-contexte.
    if (_tlHasLiveTemplate(dragTl)) return;

    if (targetType === 'tierlist') {
      const targetTl = tlState.tierlists.find(t => t.id === targetId);
      if (!targetTl) return;
      // Même contexte ?
      if (_tlEffectiveFolderId(dragTl) === _tlEffectiveFolderId(targetTl)) {
        const arr = tlState.tierlists;
        const fromIdx = arr.findIndex(t => t.id === _tlSidebarDragId);
        const toIdx   = arr.findIndex(t => t.id === targetId);
        if (fromIdx === -1 || toIdx === -1) return;
        const [moved] = arr.splice(fromIdx, 1);
        const newIdx  = arr.findIndex(t => t.id === targetId);
        arr.splice(isTop ? newIdx : newIdx + 1, 0, moved);
      } else {
        // Déplacer vers le contexte de la cible
        dragTl.folderId = _tlEffectiveFolderId(targetTl);
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

// Plafonne .tl-layout à l'espace réellement visible sous sa position actuelle,
// mesuré dynamiquement — au lieu d'un calc(100vh - Npx) fixe qui suppose une hauteur
// de header/control-panel constante. Même piège que côté Bingo (_adjustBingoGridSizes) :
// un magic number déconnecté du DOM réel sous-estime l'espace pris par le padding-bottom
// de .main et laisse un débordement de quelques pixels indépendant de la résolution.
function _adjustTlLayoutHeight() {
  const layout = document.querySelector('.tl-layout');
  if (!layout || layout.offsetParent === null) return;
  const main = document.querySelector('.main');
  const mainPaddingBottom = main ? parseFloat(getComputedStyle(main).paddingBottom) || 0 : 0;
  const top = layout.getBoundingClientRect().top;
  const h = Math.max(120, window.innerHeight - top - mainPaddingBottom);
  layout.style.height = h + 'px';
}
window.addEventListener('resize', () => {
  if (document.getElementById('page-tierlist').classList.contains('active')) _adjustTlLayoutHeight();
});

// ── Rendu principal ───────────────────────────────────────────────────────────
function tlRender() {
  _adjustTlLayoutHeight();
  requestAnimationFrame(_adjustTlLayoutHeight);
  tlUpdateUndoBtn();
  tlRenderList();
  renderCurrentEventButton();
  _updateCeSetHeaderBtn();
  const tl = tlActiveTierlist();
  // Le panneau de contrôle (Dossiers + Chemin/Template/Listes du dernier groupe ouvert) reste
  // affiché même sans tierlist/template actif dans le dossier courant — seule la zone éditeur
  // (titre, tiers, cadre Options Liste, Plein écran…) dépend d'une tierlist active.
  tlControlPanel.classList.remove('hidden');
  if (!tl || tl.archived) {
    tlEditor.classList.add('hidden');
    tlRenderGroupPanel(null);
    // En mode comparaison, tlActiveTierlist() est null (pas de tierlist "active" unique, voir
    // _tlOpenCompareInline) mais Annuler reste pertinent (undo agit sur le groupe entier) — le
    // bouton est déplacé dans .tl-compare-toolbar-center (_tlEnterCompareToolbarLayout), donc
    // tlRenderGroupPanel(null) ci-dessus l'a caché à tort, le réafficher explicitement ici.
    if (document.body.classList.contains('compare-tierlist-mode')) {
      const tlBtnUndoEl = document.getElementById('tl-btn-undo');
      if (tlBtnUndoEl) tlBtnUndoEl.classList.remove('hidden');
    }
    const tlListOptionsFrameEmpty = document.getElementById('tl-list-options-frame');
    if (tlListOptionsFrameEmpty) tlListOptionsFrameEmpty.classList.add('hidden');
    if (tlBtnToggleUnplaced) tlBtnToggleUnplaced.classList.add('hidden');
    _tlUpdateSplitSliderVisibility(null);
    const activeFolder = _tlLocalActiveFolderId
      ? (tlState.folders || []).find(f => f.id === _tlLocalActiveFolderId && !f.archived)
      : null;
    if (activeFolder && _tlFolderIsEmpty(activeFolder)) {
      tlEmptyState.classList.add('hidden');
      _tlRenderFolderEmptyState(activeFolder);
    } else {
      _tlHideFolderEmptyState();
      tlEmptyState.classList.remove('hidden');
    }
    if (window.lucide) lucide.createIcons();
    return;
  }
  _tlHideFolderEmptyState();
  tlEmptyState.classList.add('hidden');
  tlEditor.classList.remove('hidden');
  tlEditorBody.classList.toggle('tl-editor-body--template', !!tl.isTemplate);
  const tlBtnExportImages = document.getElementById('tl-btn-export-images');
  if (tlBtnExportImages) tlBtnExportImages.classList.toggle('hidden', !tl.isTemplate);
  const tlListOptionsFrame = document.getElementById('tl-list-options-frame');
  if (tlListOptionsFrame) tlListOptionsFrame.classList.toggle('hidden', !!tl.isTemplate);
  if (tlBtnToggleUnplaced) {
    tlBtnToggleUnplaced.classList.toggle('hidden', !!tl.isTemplate);
    tlEditorBody.classList.toggle('tl-unplaced-hidden', !tl.isTemplate && _tlLocalUnplacedHidden);
    _tlUpdateToggleUnplacedBtn();
  }
  _tlUpdateSplitSliderVisibility(tl);
  tlRenderGroupPanel(tl);

  // Prefs d'affichage : version locale si disponible, sinon valeur de la tierlist
  const showLabels = _tlLocalShowLabels !== null ? _tlLocalShowLabels : !!tl.showLabels;
  const unplacedShowLabels = _tlLocalUnplacedShowLabels !== null ? _tlLocalUnplacedShowLabels : !!tl.showLabels;
  const imgSize    = _tlLocalImgSize    !== null ? _tlLocalImgSize    : _tlClampImgSize(tl.imgSize);
  const unplacedImgSize = _tlLocalUnplacedImgSize !== null ? _tlLocalUnplacedImgSize : _tlClampImgSize(tl.imgSize);
  _tlUpdateShowLabelsBtn(showLabels);
  _tlUpdateUnplacedShowLabelsBtn(unplacedShowLabels);
  tlImgSizeSlider.value      = imgSize;
  if (tlUnplacedImgSizeSlider) tlUnplacedImgSizeSlider.value = unplacedImgSize;

  tlRenderTiers(tl);
  tlRenderUnplaced(tl);
  _tlRenderToPlaceZone(tl);
  if (window.lucide) lucide.createIcons();
}

// Contexte du panneau Chemin/Template/Listes : toujours basé sur le DOSSIER actif (pas sur la
// dernière tierlist sélectionnée), pour que naviguer via le menu Chemin mette immédiatement à jour
// les boutons Template/Listes vers ce qui existe réellement dans ce dossier — y compris "aucun
// template ici". folderId vient de la tierlist active si elle existe, sinon du dossier explicitement
// sélectionné (_tlLocalActiveFolderId, mis à jour par _tlGoToFolder).
function _tlActiveGroupContext() {
  const tl = tlActiveTierlist();
  const folderId = tl ? _tlEffectiveFolderId(tl) : _tlLocalActiveFolderId;
  const templatesHere = tlState.tierlists.filter(t => t.isTemplate && !t.archived && (t.folderId || null) === (folderId || null));
  // Le template affiché est celui du groupe de la tierlist active s'il est dans ce dossier,
  // sinon le premier template du dossier (ordre naturel), sinon aucun.
  const tlRoot = tl ? _tlGroupRoot(tl) : null;
  const root = (tlRoot && templatesHere.some(t => t.id === tlRoot.id)) ? tlRoot : (templatesHere[0] || null);
  return { tl, folderId, templatesHere, root };
}

// Le bouton Chemin garde sa largeur NATURELLE comme Template/Liste (pas de largeur commune —
// ça les écrasait tous à la largeur du plus étroit, texte illisible/chevauchant, voir capture
// rapportée). Seule sa largeur est plafonnée (160px) puisque son texte peut être très long ; au-delà
// il wrap sur 2 lignes + réduit sa police si besoin. La hauteur du bouton est FIXE (32px, comme
// Template/Liste, voir .tl-toolbar-btn.tl-btn-path en CSS) — jamais question de la faire varier.
// Le texte doit donc être contraint à tenir dans ces 32px : on réduit la police jusqu'à ce que les
// lignes réellement occupées (measurées après chaque changement de taille, pas juste "arrondi à 2")
// tiennent dans la hauteur du bouton ; si même la plus petite taille déborde encore (chemin
// extrêmement long), on tronque avec ellipsis en dernier recours plutôt que de laisser déborder
// (bug initial : le calcul visait "≤2 lignes" sans jamais vérifier que 2 lignes à cette taille de
// police tenaient réellement dans 32px, d'où débordement visuel du texte hors du bouton).
const TL_PATH_BTN_HEIGHT = 32;
function _tlFitPathBtnLabel(labelEl) {
  const btn = labelEl.closest('.tl-btn-path');
  if (!btn) return;
  const maxWidth = window.innerWidth * 0.25;
  btn.style.width = '';
  labelEl.style.whiteSpace = '';
  labelEl.style.wordBreak = '';
  labelEl.style.fontSize = '';
  labelEl.style.overflow = '';
  labelEl.style.textOverflow = '';
  labelEl.style.display = '';
  labelEl.style.webkitLineClamp = '';
  labelEl.style.webkitBoxOrient = '';
  const naturalWidth = btn.scrollWidth;
  if (naturalWidth <= maxWidth) return;
  btn.style.width = maxWidth + 'px';
  labelEl.style.whiteSpace = 'normal';
  labelEl.style.wordBreak = 'break-word';
  const baseFontSize = parseFloat(getComputedStyle(labelEl).fontSize);
  const sizes = [1, 0.88, 0.78, 0.68, 0.6, 0.52];
  let fits = false;
  for (const scale of sizes) {
    labelEl.style.fontSize = (baseFontSize * scale) + 'px';
    if (labelEl.scrollHeight <= TL_PATH_BTN_HEIGHT) { fits = true; break; }
  }
  if (!fits) {
    // Dernier recours : tronque avec ellipsis sur 2 lignes plutôt que de déborder du bouton.
    labelEl.style.overflow = 'hidden';
    labelEl.style.textOverflow = 'ellipsis';
    labelEl.style.display = '-webkit-box';
    labelEl.style.webkitLineClamp = '2';
    labelEl.style.webkitBoxOrient = 'vertical';
  }
}

// Panneau de contrôle tier list : bulles des tierlists d'un même groupe (template + générées),
// sélection unique — cliquer une bulle ouvre directement cette tierlist (pas de multi-affichage
// comme pour les grilles bingo, une tier list ne s'affiche jamais qu'une à la fois).
function tlRenderGroupPanel(tl) {
  const { folderId, templatesHere, root } = _tlActiveGroupContext();
  // Le chemin s'arrête au template (inclus) quand il y en a un dans ce dossier — jamais aux
  // tierlists générées individuelles, qui ne sont que des membres du même groupe.
  const folderPath = (_tlFolderPath(folderId) || 'Racine') + (root ? ' \\ ' + root.name : '');

  // Dropdown Chemin : toujours visible dès qu'un dossier est sélectionné ou qu'une tierlist est
  // active (contrairement à Template/Listes/Comparaison/Plein écran, qui dépendent d'un template).
  const tlPathWrap = document.getElementById('tl-btn-path-dropdown')?.closest('.tl-labeled-btn');
  if (tlPathWrap) tlPathWrap.classList.toggle('hidden', !folderId && !tl);
  const tlPathDropdownLabel = document.getElementById('tl-path-dropdown-label');
  if (tlPathDropdownLabel) {
    tlPathDropdownLabel.textContent = folderPath;
    _tlFitPathBtnLabel(tlPathDropdownLabel);
  }

  const tlTemplateWrap = document.getElementById('tl-btn-template-dropdown')?.closest('.tl-labeled-btn');
  const tlTierlistWrap = document.getElementById('tl-btn-tierlist-dropdown')?.closest('.tl-labeled-btn');
  const tlBtnCompare = document.getElementById('tl-btn-compare');
  const tlBtnOpenWindow = document.getElementById('tl-btn-open-window');

  if (tlTemplateWrap) tlTemplateWrap.classList.remove('hidden');
  if (tlTierlistWrap) tlTierlistWrap.classList.remove('hidden');

  const tlTemplateDropdownLabel = document.getElementById('tl-template-dropdown-label');
  const tlTierlistDropdownLabel = document.getElementById('tl-tierlist-dropdown-label');

  const tlBtnUndoEl = document.getElementById('tl-btn-undo');

  if (!root) {
    // Dossier sans aucun template : Template/Listes n'affichent rien, Comparaison/Plein écran/Annuler cachés.
    if (tlTemplateDropdownLabel) tlTemplateDropdownLabel.textContent = '';
    if (tlTierlistDropdownLabel) tlTierlistDropdownLabel.textContent = '';
    if (tlBtnCompare) tlBtnCompare.classList.add('hidden');
    if (tlBtnOpenWindow) tlBtnOpenWindow.classList.add('hidden');
    if (tlBtnUndoEl) tlBtnUndoEl.classList.add('hidden');
    if (window.lucide) lucide.createIcons();
    return;
  }

  const members = tlState.tierlists.filter(t => !t.archived && (t.id === root.id || t.templateId === root.id));

  if (tlTemplateDropdownLabel) tlTemplateDropdownLabel.textContent = root.name;
  if (tlTierlistDropdownLabel) tlTierlistDropdownLabel.textContent = (tl && !tl.isTemplate && tl.templateId === root.id) ? tl.name : '';

  // Plein écran/Comparaison/Annuler n'ont de sens que si une tierlist de CE groupe est réellement
  // affichée dans l'éditeur (pas seulement un dossier sélectionné sans tierlist active). Annuler
  // reste visible sur un template comme sur une liste générée (undo agit sur tiers/images des deux).
  // Plein écran, lui, n'a de sens que sur une liste générée : un template n'a pas de mode plein
  // écran dédié (_applySoloTierlistModeIfNeeded masque Tiers/Reset pour permettre de changer de
  // liste sans repasser en mode normal — un template n'a pas cette notion de "changer de liste").
  const tlIsGroupMember = !!(tl && (tl.id === root.id || tl.templateId === root.id));
  if (tlBtnOpenWindow) tlBtnOpenWindow.classList.toggle('hidden', !tlIsGroupMember || tl.isTemplate);
  if (tlBtnCompare) tlBtnCompare.classList.toggle('hidden', !tlIsGroupMember || members.filter(m => !m.isTemplate).length < 2);
  if (tlBtnUndoEl) tlBtnUndoEl.classList.toggle('hidden', !tlIsGroupMember);
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

// ── Zone "À placer" — un seul élément désigné, partagé par tout le groupe/template ──
// Stocké sur le root (root.toPlaceImgId), pas par tierlist : chaque membre déduit dynamiquement
// si SA zone est vide (l'élément est déjà dans un de ses tiers) ou si elle doit encore l'afficher.
// Le template lui-même n'est jamais un "participant" : il ne place jamais d'éléments dans ses
// tiers (labels seuls), donc il faut l'exclure du calcul "tout le monde a placé".
function _tlGetGroupParticipants(tl) {
  return _tlGetGroupMembers(tl).filter(m => !m.isTemplate);
}

function _tlIsPlacedInTiers(member, imgId) {
  return member.tiers.some(t => t.items.includes(imgId));
}

// Marque, pour CE membre précis, que l'élément désigné a été résolu (placé au moins une fois
// dans un de ses tiers) — une fois résolu, sa zone "à placer" reste vide DÉFINITIVEMENT pour ce
// membre, même s'il redéplace ensuite l'élément ailleurs (non-placés ou un autre tier). Sans ce
// marqueur persistant, un aller-retour tier→non-placés faisait réapparaître la carte à tort,
// puisque _tlIsPlacedInTiers ne regarde que l'emplacement ACTUEL de l'élément.
function _tlMarkToPlaceResolved(member, imgId) {
  if (!member.resolvedToPlaceIds) member.resolvedToPlaceIds = [];
  if (!member.resolvedToPlaceIds.includes(imgId)) member.resolvedToPlaceIds.push(imgId);
}

// true si CE membre précis a déjà "réglé son cas" pour cet élément désigné : soit il l'a placé
// dans un de ses tiers actuellement, soit il l'a résolu par le passé (resolvedToPlaceIds) — donc
// sa zone à placer doit rester vide et il ne doit plus compter comme "en attente" dans la couleur
// partagée, même s'il redéplace ensuite l'élément ailleurs (ex. retour vers ses non-placés).
function _tlMemberResolvedFor(member, imgId) {
  if ((member.resolvedToPlaceIds || []).includes(imgId)) return true;
  return _tlIsPlacedInTiers(member, imgId);
}

// Une fois que TOUS les participants actuels du groupe ont résolu l'élément désigné (zone
// jaune/vide partout), le sujet est clos : root.toPlaceImgId est remis à null. Sans ce nettoyage,
// il restait actif indéfiniment — une tierlist créée APRÈS coup (jamais résolue, puisqu'elle vient
// de naître sans aucun tier rempli) affichait alors à tort l'élément comme "encore en attente"
// dans sa propre zone, alors que le groupe entier avait déjà terminé.
function _tlClearToPlaceIfAllResolved(tl) {
  const root = _tlGroupRoot(tl);
  if (!root.toPlaceImgId) return;
  const members = _tlGetGroupParticipants(tl);
  if (members.length > 0 && members.every(m => _tlMemberResolvedFor(m, root.toPlaceImgId))) {
    root.toPlaceImgId = null;
  }
}

// true si l'élément désigné est déjà résolu chez CE membre précis → sa zone est vide.
function _tlToPlaceIsEmptyFor(tl) {
  const root = _tlGroupRoot(tl);
  if (!root.toPlaceImgId) return true;
  return _tlMemberResolvedFor(tl, root.toPlaceImgId);
}

// Désigne un nouvel élément "à placer" pour tout le groupe. Si un élément occupait déjà la zone
// quelque part (pas encore placé par tout le monde), demande confirmation avant de le remplacer.
// Le template lui-même n'a pas de zone "à placer" (pas de vrais tiers remplis, labels seuls) —
// la désignation n'a pas de sens depuis lui, on l'ignore silencieusement.
function _tlSetImageToPlace(tl, imgId) {
  if (tl.isTemplate) return;
  const root = _tlGroupRoot(tl);
  const members = _tlGetGroupParticipants(tl);
  const previousId = root.toPlaceImgId;

  const applyChange = () => {
    // Nouvelle désignation de cet élément : purger l'ancien marqueur "résolu" de TOUS les
    // membres pour cet imgId précis — sinon un membre ayant déjà résolu cet élément lors d'une
    // désignation antérieure ne le reverrait plus jamais dans sa zone "à placer", même après
    // qu'on le redésigne explicitement. La résolution ne doit tenir que jusqu'à la prochaine
    // fois où cet élément redevient "l'élément à placer" — _tlMemberResolvedFor recalcule
    // ensuite dynamiquement l'état réel (placé actuellement dans un tier ou non) pour chacun.
    members.forEach(member => {
      if (member.resolvedToPlaceIds) {
        member.resolvedToPlaceIds = member.resolvedToPlaceIds.filter(id => id !== imgId);
      }
    });
    // L'élément désigné sort des non-placés de TOUS les membres du groupe (pas seulement celui
    // qui vient de désigner) : un élément ne doit JAMAIS être visible à la fois dans les
    // non-placés et dans la zone "à placer" d'un même membre. Chez les membres qui n'ont pas
    // encore résolu, il n'apparaît donc plus que dans la zone à placer (jusqu'à ce qu'ils le
    // placent dans un tier) — le compteur non-placés/total compense ce retrait pour ne pas
    // baisser à tort (voir tlRenderUnplaced, qui recompte l'élément désigné non résolu).
    members.forEach(member => {
      const idx = member.unplaced.indexOf(imgId);
      if (idx !== -1) member.unplaced.splice(idx, 1);
    });
    // L'ancien élément désigné retourne dans les non-placés de chaque membre où il n'est
    // pas déjà placé dans un tier (sinon il reste où il est, comme demandé).
    if (previousId && previousId !== imgId) {
      members.forEach(member => {
        if (!_tlMemberResolvedFor(member, previousId) && !member.unplaced.includes(previousId)) {
          member.unplaced.push(previousId);
        }
      });
    }
    root.toPlaceImgId = imgId;
    tlTouchFolderChain(_tlEffectiveFolderId(tl));
    tlSave();
    tlRender();
  };

  const previousStillPending = previousId && previousId !== imgId && members.some(m => !_tlMemberResolvedFor(m, previousId));
  if (previousStillPending) {
    _tlOpenConfirmToPlaceModal(applyChange);
  } else {
    applyChange();
  }
}

let _tlPendingToPlaceConfirm = null;
function _tlOpenConfirmToPlaceModal(onConfirm) {
  _tlPendingToPlaceConfirm = onConfirm;
  document.getElementById('modal-confirm-toplace').classList.remove('hidden');
}
function _tlCloseConfirmToPlaceModal() {
  _tlPendingToPlaceConfirm = null;
  document.getElementById('modal-confirm-toplace').classList.add('hidden');
}
document.getElementById('btn-confirm-toplace').addEventListener('click', () => {
  const fn = _tlPendingToPlaceConfirm;
  _tlCloseConfirmToPlaceModal();
  if (fn) fn();
});
document.getElementById('btn-cancel-toplace').addEventListener('click', _tlCloseConfirmToPlaceModal);
document.getElementById('btn-close-confirm-toplace').addEventListener('click', _tlCloseConfirmToPlaceModal);

function _tlRenderToPlaceZone(tl) {
  // Le template n'a pas de zone "à placer" (masquée en CSS, .tl-editor-body--template
  // .tl-toplace-zone{display:none}) — pas la peine de calculer/peupler son contenu.
  if (tl.isTemplate) return;
  const zone = document.getElementById('tl-toplace-zone');
  const content = zone.querySelector('.tl-toplace-content');
  content.innerHTML = '';
  const root = _tlGroupRoot(tl);
  const members = _tlGetGroupParticipants(tl);
  const imgId = root.toPlaceImgId;
  const imgSize = 150; // taille fixe, indépendante du slider "Taille" du cadre non placés

  const allPlaced = !imgId || members.every(m => _tlMemberResolvedFor(m, imgId));
  zone.classList.toggle('tl-toplace-empty', allPlaced);
  zone.classList.toggle('tl-toplace-pending', !allPlaced);

  const showCard = imgId && !_tlToPlaceIsEmptyFor(tl) && tlFindImage(tl, imgId);
  if (showCard) {
    // Carte affichée : la zone s'adapte à sa taille réelle (image + nom si affiché).
    content.style.width = '';
    content.style.height = '';
    content.appendChild(tlBuildImgCard(tl, showCard, imgSize, false, true));
  } else {
    // Vide : taille fixe d'une image seule (imgSize), jamais plus petite — sinon la zone
    // rétrécirait à vide au lieu de garder sa place réservée.
    content.style.width = imgSize + 'px';
    content.style.height = imgSize + 'px';
  }
  if (window.lucide) lucide.createIcons();
}

// Texte "(Template \ Dossier)" à afficher à côté d'une tierlist archivée/supprimée, pour donner
// son contexte d'origine (elle n'apparaît plus dans son emplacement habituel du panneau Dossiers).
// tl peut être un objet vivant de tlState.tierlists OU un objet figé venant de la corbeille (data).
// includeFolder=false quand le dossier est déjà visuellement représenté par l'imbrication de l'affichage.
function _tlContextLabel(tl, includeFolder = true) {
  const parts = [];
  if (tl.templateId) {
    const template = tlState.tierlists.find(t => t.id === tl.templateId && t.isTemplate);
    parts.push(template ? template.name : '(template supprimé)');
  }
  if (includeFolder && _tlEffectiveFolderId(tl)) {
    const folder = (tlState.folders || []).find(f => f.id === _tlEffectiveFolderId(tl));
    parts.push(folder ? folder.name : '(dossier supprimé)');
  }
  return parts.length > 0 ? ' (' + parts.join(' \\ ') + ')' : '';
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
    empty.textContent = 'Aucune liste générée';
    children.appendChild(empty);
  } else {
    generated.forEach(t => children.appendChild(tlBuildTierlistItem(t)));
  }
  groupEl.appendChild(children);

  return groupEl;
}

function _tlFolderIsEmpty(folder) {
  const hasSubFolders = (tlState.folders || []).some(f => !f.archived && f.parentId === folder.id);
  const hasContent = tlState.tierlists.some(t => !t.archived && t.folderId === folder.id);
  return !hasSubFolders && !hasContent;
}

function _tlRenderFolderEmptyState(folder) {
  const el = document.getElementById('tl-folder-empty-state');
  if (!el) return;
  el.classList.remove('hidden');
  document.getElementById('tl-folder-empty-btn-folders').onclick = openTlSidebar;
  document.getElementById('tl-folder-empty-btn-folder').onclick = () => tlOpenFolderModal('create', null, '', folder.id);
  document.getElementById('tl-folder-empty-btn-template').onclick = () => tlOpenNewTemplateModal(folder.id);
}

function _tlHideFolderEmptyState() {
  const el = document.getElementById('tl-folder-empty-state');
  if (el) el.classList.add('hidden');
}

function _tlBuildFolderEl(folder, depth) {
  const activeTl = tlState.tierlists.find(t => t.id === _tlLocalActiveTierlistId && !t.archived);
  // Actif si la TL active est dans ce dossier ou dans un descendant, ou si ce dossier (vide)
  // a été explicitement sélectionné sans tierlist active
  const allDescIds = [folder.id, ..._tlGetDescendantIds(folder.id)];
  const folderIsActive = (activeTl && allDescIds.includes(_tlEffectiveFolderId(activeTl)))
    || (!activeTl && _tlLocalActiveFolderId === folder.id);
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
  const toggleOpen = () => {
    const isOpen = sessionStorage.getItem(tlCollapseKey) === '1';
    sessionStorage.setItem(tlCollapseKey, isOpen ? '0' : '1');
    folderEl.classList.toggle('open', !isOpen);
  };
  arrow.addEventListener('click', e => { e.stopPropagation(); toggleOpen(); });

  const icon = document.createElement('span');
  icon.className = 'tl-folder-icon';
  icon.innerHTML = '<i data-lucide="folder-closed"></i>';

  const name = document.createElement('span');
  name.className = 'tl-folder-name';
  name.textContent = folder.name;
  name.title = folder.name + '\nClic droit : renommer, déplacer, archiver';

  const ctxBtn = document.createElement('button');
  ctxBtn.className = 'tl-folder-ctx-btn';
  ctxBtn.innerHTML = '<i data-lucide="ellipsis-vertical"></i>';
  ctxBtn.title = 'Options';
  ctxBtn.addEventListener('click', e => {
    e.stopPropagation();
    tlOpenFolderManageModal(folder.id, header);
  });

  header.appendChild(arrow);
  header.appendChild(icon);
  header.appendChild(name);
  header.appendChild(ctxBtn);

  header.addEventListener('contextmenu', e => {
    e.preventDefault();
    e.stopPropagation();
    tlOpenFolderManageModal(folder.id, header);
  });

  // Simple clic sur le header = même fonction que la flèche (plier/déplier) ; navigation
  // réservée au double-clic et à l'item "Ouvrir" du menu ⋮.
  header.addEventListener('click', e => {
    if (e.target.closest('.tl-folder-arrow, .tl-folder-ctx-btn')) return;
    toggleOpen();
  });
  header.addEventListener('dblclick', e => {
    if (e.target.closest('.tl-folder-arrow, .tl-folder-ctx-btn')) return;
    _tlGoToFolder(folder.id);
    _switchPage('tierlist');
  });

  // Une tierlist peut toujours être glissée dans ce dossier (fonctionnalité distincte du
  // réordonnancement des dossiers, qui a été retiré) — le dossier lui-même n'est plus draggable.
  folderEl.addEventListener('dragover', e => {
    if (_tlSidebarDragType === 'tierlist') {
      _tlSidebarDragOverItem(e, header, folder.id, 'folder-header');
    }
  });
  folderEl.addEventListener('dragleave', e => {
    if (!folderEl.contains(e.relatedTarget)) {
      _tlSidebarDragLeaveItem(e, header);
    }
  });
  folderEl.addEventListener('drop', e => {
    if (_tlSidebarDragType === 'tierlist') {
      _tlSidebarDropOnItem(e, folder.id, 'folder-header', header);
    }
  });

  folderEl.appendChild(header);

  const children = document.createElement('div');
  children.className = 'tl-folder-children';

  // Sous-dossiers
  const subFolders = _sortFoldersList((tlState.folders || []).filter(f => !f.archived && f.parentId === folder.id), _folderSortMode('tlFoldersSortMode'));
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

// Ouvre (déplie) tous les ancêtres d'un dossier dans le drawer tierlist (sessionStorage tl_folder_open_<id>).
function _tlExpandFolderAncestors(folderId) {
  let current = (tlState.folders || []).find(f => f.id === folderId);
  current = current && current.parentId ? (tlState.folders || []).find(f => f.id === current.parentId) : null;
  while (current) {
    sessionStorage.setItem('tl_folder_open_' + current.id, '1');
    current = current.parentId ? (tlState.folders || []).find(f => f.id === current.parentId) : null;
  }
}

function _tlAncestorIdsOf(folderId) {
  const ids = [];
  let current = (tlState.folders || []).find(f => f.id === folderId);
  current = current && current.parentId ? (tlState.folders || []).find(f => f.id === current.parentId) : null;
  while (current) {
    ids.push(current.id);
    current = current.parentId ? (tlState.folders || []).find(f => f.id === current.parentId) : null;
  }
  return ids;
}

function _tlDepthOf(folderId) {
  return _tlAncestorIdsOf(folderId).length;
}

// Même filtrage que _homeRenderRecentTl (page d'accueil) : seuls les dossiers contenant au moins
// un template, même titre/icône/comportement de clic (ouvre directement le template s'il n'y en a
// qu'un dans le dossier).
function _tlRenderRecentFolderPaths() {
  const container = document.getElementById('tl-folders-panel-recent');
  if (!container) return;
  container.innerHTML = '';
  const hasTemplate = f => tlState.tierlists.some(t => t.isTemplate && !t.archived && t.folderId === f.id);
  const sorted = (tlState.folders || [])
    .filter(f => !f.archived && f.updatedAt && hasTemplate(f))
    // À updatedAt égal (même événement, propagé par tlTouchFolderChain à toute la chaîne), le dossier
    // le plus profond doit être considéré en premier pour que la déduplication le retienne, lui.
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0) || _tlDepthOf(b.id) - _tlDepthOf(a.id));
  const recent = _dedupeAncestorFolders(sorted, _tlAncestorIdsOf);
  if (recent.length === 0) return;

  const title = document.createElement('div');
  title.className = 'fp-recent-title';
  title.textContent = 'Templates récents';
  container.appendChild(title);

  const list = document.createElement('div');
  list.className = 'fp-recent-list';
  recent.forEach(f => {
    const row = document.createElement('div');
    row.className = 'fp-recent-row';
    const icon = document.createElement('span');
    icon.className = 'fp-recent-icon';
    icon.innerHTML = '<i data-lucide="scroll"></i>';
    const path = document.createElement('span');
    path.className = 'fp-recent-path';
    let pathText = _tlFolderPath(f.id);
    const templatesHere = tlState.tierlists.filter(t => t.isTemplate && !t.archived && t.folderId === f.id);
    if (templatesHere.length === 1) pathText += ' \\ ' + templatesHere[0].name;
    path.textContent = pathText;
    row.appendChild(icon);
    row.appendChild(path);
    row.addEventListener('click', () => {
      if (templatesHere.length === 1) _homeGoToTlTierlist(templatesHere[0]);
      else _tlGoToFolder(f.id);
    });
    list.appendChild(row);
  });
  container.appendChild(list);
  if (window.lucide) lucide.createIcons();
}

// Bascule vue liste / vue icônes du panneau Dossiers Tier List (préférence mémorisée).
function _tlSetFoldersViewMode(mode) {
  if (_tlFoldersViewMode === mode) return;
  _tlFoldersViewMode = mode;
  saveUserPrefs({ tlFoldersViewMode: mode });
  tlRenderList();
}

document.getElementById('tl-fp-view-toggle-list').addEventListener('click', () => _tlSetFoldersViewMode('list'));
document.getElementById('tl-fp-view-toggle-icons').addEventListener('click', () => _tlSetFoldersViewMode('icons'));

// Fil d'Ariane partagé entre vue liste et vue icônes du panneau Dossiers Tier List — navigue via
// _tlFoldersNavFolderId, le même niveau courant que consomment les deux fonctions de rendu.
function _tlRenderFoldersBreadcrumb(onNavigate) {
  const crumbContainer = document.getElementById('tl-icons-breadcrumb');
  if (!crumbContainer) return { currentFolder: null, path: [] };

  const currentFolder = _tlFoldersNavFolderId ? (tlState.folders || []).find(f => f.id === _tlFoldersNavFolderId) : null;
  if (_tlFoldersNavFolderId && !currentFolder) _tlFoldersNavFolderId = null;

  const path = [];
  let anc = currentFolder;
  while (anc) { path.unshift(anc); anc = anc.parentId ? (tlState.folders || []).find(f => f.id === anc.parentId) : null; }

  crumbContainer.innerHTML = '';
  const rootCrumb = document.createElement('span');
  rootCrumb.className = 'fp-icons-crumb' + (path.length === 0 ? ' current' : '');
  rootCrumb.textContent = 'Racine';
  rootCrumb.addEventListener('click', () => { if (path.length) { _tlFoldersNavFolderId = null; onNavigate(); } });
  crumbContainer.appendChild(rootCrumb);
  path.forEach((f, i) => {
    const sep = document.createElement('span');
    sep.className = 'fp-icons-crumb-sep';
    sep.textContent = '\\';
    crumbContainer.appendChild(sep);
    const crumb = document.createElement('span');
    const isLast = i === path.length - 1;
    crumb.className = 'fp-icons-crumb' + (isLast ? ' current' : '');
    crumb.textContent = f.name;
    if (!isLast) crumb.addEventListener('click', () => { _tlFoldersNavFolderId = f.id; onNavigate(); });
    crumbContainer.appendChild(crumb);
  });

  return { currentFolder, path };
}

// Vue icônes du panneau Dossiers Tier List (façon Explorateur de fichiers), même principe que
// _renderFoldersPanelIcons côté Bingo : grille de tuiles pour le seul niveau courant
// (_tlFoldersNavFolderId, null = racine), navigation par double-clic + fil d'Ariane. Contrairement à
// Bingo, un niveau peut aussi contenir des templates/tierlists isolées (pas que des sous-dossiers) —
// elles deviennent aussi des tuiles (icône différente), au prix du glisser-déposer/regroupement de
// templates que seule la vue liste conserve.
function _renderTlFoldersPanelIcons() {
  const treeContainer = document.getElementById('tl-folders-panel-icons');
  if (!treeContainer) return;
  treeContainer.innerHTML = '';

  const sortMode = _folderSortMode('tlFoldersSortMode');
  const sortSelect = document.getElementById('tl-folders-sort-select');
  if (sortSelect) sortSelect.value = sortMode;

  const { currentFolder } = _tlRenderFoldersBreadcrumb(_renderTlFoldersPanelIcons);
  const parentId = currentFolder ? currentFolder.id : null;
  const subFolders = _sortFoldersList((tlState.folders || []).filter(f => !f.archived && (f.parentId || null) === parentId), sortMode);
  // Tierlists/templates de ce niveau — les tierlists rattachées à un template vivant n'apparaissent
  // jamais à plat, seulement via leur template (même filtrage que la vue liste).
  const levelTierlists = tlState.tierlists.filter(tl => !tl.archived && (tl.folderId || null) === parentId && !_tlHasLiveTemplate(tl));

  if (subFolders.length === 0 && levelTierlists.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'fp-icon-tile-empty';
    empty.textContent = 'Vide.';
    treeContainer.appendChild(empty);
    if (window.lucide) lucide.createIcons();
    return;
  }

  subFolders.forEach(f => {
    const isActive = f.id === _tlLocalActiveFolderId;
    const tile = document.createElement('div');
    tile.className = 'fp-icon-tile' + (isActive ? ' active' : '');
    tile.dataset.folderId = f.id;

    const iconEl = document.createElement('div');
    iconEl.className = 'fp-icon-tile-icon';
    iconEl.innerHTML = '<i data-lucide="folder"></i>';

    const nameEl = document.createElement('div');
    nameEl.className = 'fp-icon-tile-name';
    nameEl.textContent = f.name;
    nameEl.addEventListener('mouseenter', () => _showAppTooltipIfTruncated(nameEl));
    nameEl.addEventListener('mouseleave', _hideAppTooltip);

    const ctxBtn = document.createElement('button');
    ctxBtn.className = 'fp-icon-tile-ctx-btn';
    ctxBtn.innerHTML = '<i data-lucide="ellipsis-vertical"></i>';
    ctxBtn.title = 'Options';

    tile.appendChild(ctxBtn);
    tile.appendChild(iconEl);
    tile.appendChild(nameEl);

    const openMenu = e => { e.stopPropagation(); tlOpenFolderManageModal(f.id, tile); };
    // Simple clic = entrer dans le dossier (façon Explorateur), jamais l'ouvrir comme dossier actif
    // — cette action-là reste réservée au menu ⋮ ("Ouvrir"), pour ne pas changer le contexte actif
    // juste en naviguant dans la vue icônes.
    tile.addEventListener('click', e => {
      if (e.target === ctxBtn || ctxBtn.contains(e.target)) return;
      e.stopPropagation();
      treeContainer.querySelectorAll('.fp-icon-tile.selected').forEach(t => t.classList.remove('selected'));
      tile.classList.add('selected');
      _tlFoldersNavFolderId = f.id; _renderTlFoldersPanelIcons();
    });
    ctxBtn.addEventListener('click', openMenu);
    tile.addEventListener('contextmenu', e => { e.preventDefault(); openMenu(e); });

    treeContainer.appendChild(tile);
  });

  levelTierlists.forEach(tl => {
    const isActive = tl.id === _tlLocalActiveTierlistId;
    const tile = document.createElement('div');
    tile.className = 'fp-icon-tile is-bingo' + (isActive ? ' active' : '');
    tile.dataset.tierlistId = tl.id;

    const iconEl = document.createElement('div');
    iconEl.className = 'fp-icon-tile-icon';
    iconEl.innerHTML = tl.isTemplate ? '<i data-lucide="scroll"></i>' : '<i data-lucide="scroll-text"></i>';

    const nameEl = document.createElement('div');
    nameEl.className = 'fp-icon-tile-name';
    nameEl.textContent = tl.name;
    nameEl.addEventListener('mouseenter', () => _showAppTooltipIfTruncated(nameEl));
    nameEl.addEventListener('mouseleave', _hideAppTooltip);

    const ctxBtn = document.createElement('button');
    ctxBtn.className = 'fp-icon-tile-ctx-btn';
    ctxBtn.innerHTML = '<i data-lucide="ellipsis-vertical"></i>';
    ctxBtn.title = 'Options';

    tile.appendChild(ctxBtn);
    tile.appendChild(iconEl);
    tile.appendChild(nameEl);

    const openThisTierlist = () => { tlSwitch(tl.id, false); _switchPage('tierlist'); };
    const openMenu = e => { e.stopPropagation(); tlOpenManageModal(tl.id, tile, 'folders'); };
    // Même logique que les tuiles dossier : simple clic = sélectionner visuellement puis ouvrir.
    tile.addEventListener('click', e => {
      if (e.target === ctxBtn || ctxBtn.contains(e.target)) return;
      e.stopPropagation();
      treeContainer.querySelectorAll('.fp-icon-tile.selected').forEach(t => t.classList.remove('selected'));
      tile.classList.add('selected');
      openThisTierlist();
    });
    ctxBtn.addEventListener('click', openMenu);
    tile.addEventListener('contextmenu', e => { e.preventDefault(); openMenu(e); });

    treeContainer.appendChild(tile);
  });

  if (window.lucide) lucide.createIcons();
}

// Ligne d'un sous-dossier en vue liste Tier List — même structure/classes que .fp-folder-row côté
// Bingo, mais un dossier Tier List est toujours un pur conteneur (jamais de "contenu direct" à
// ouvrir comme un dossier-bingo) : double-clic descend systématiquement dedans.
function _tlBuildFolderListRow(f, container, rerender) {
  const isActive = f.id === _tlLocalActiveFolderId;
  const row = document.createElement('div');
  row.className = 'fp-folder-row' + (isActive ? ' active' : '');
  row.dataset.folderId = f.id;

  const icon = document.createElement('span');
  icon.className = 'fp-folder-icon';
  icon.innerHTML = '<i data-lucide="folder"></i>';

  const name = document.createElement('span');
  name.className = 'fp-folder-name';
  name.textContent = f.name;

  const ctxBtn = document.createElement('button');
  ctxBtn.className = 'fp-folder-ctx-btn';
  ctxBtn.innerHTML = '<i data-lucide="ellipsis-vertical"></i>';
  ctxBtn.title = 'Options';

  row.appendChild(icon);
  row.appendChild(name);
  row.appendChild(ctxBtn);

  row.addEventListener('click', e => {
    if (e.target === ctxBtn || ctxBtn.contains(e.target)) return;
    container.querySelectorAll('.fp-folder-row.selected, .fp-list-item.selected').forEach(r => r.classList.remove('selected'));
    row.classList.add('selected');
    _tlFoldersNavFolderId = f.id; rerender();
  });

  const openMenu = e => { e.stopPropagation(); tlOpenFolderManageModal(f.id, row); };
  ctxBtn.addEventListener('click', openMenu);
  row.addEventListener('contextmenu', e => { e.preventDefault(); openMenu(e); });

  return row;
}

// Ligne d'une tierlist/template en vue liste Tier List — même comportement clic/double-clic que
// la tuile équivalente en vue icônes (simple clic = sélection visuelle, double-clic = ouvrir).
function _tlBuildTierlistListRow(tl, container) {
  const isActive = tl.id === _tlLocalActiveTierlistId;
  const row = document.createElement('div');
  row.className = 'fp-folder-row fp-list-item' + (isActive ? ' active' : '');
  row.dataset.tierlistId = tl.id;

  const icon = document.createElement('span');
  icon.className = 'fp-folder-icon';
  icon.innerHTML = tl.isTemplate ? '<i data-lucide="scroll"></i>' : '<i data-lucide="scroll-text"></i>';

  const name = document.createElement('span');
  name.className = 'fp-folder-name';
  name.textContent = tl.name;

  const ctxBtn = document.createElement('button');
  ctxBtn.className = 'fp-folder-ctx-btn';
  ctxBtn.innerHTML = '<i data-lucide="ellipsis-vertical"></i>';
  ctxBtn.title = 'Options';

  row.appendChild(icon);
  row.appendChild(name);
  row.appendChild(ctxBtn);

  const openThisTierlist = () => { tlSwitch(tl.id, false); _switchPage('tierlist'); };
  row.addEventListener('click', e => {
    if (e.target === ctxBtn || ctxBtn.contains(e.target)) return;
    container.querySelectorAll('.fp-folder-row.selected, .fp-list-item.selected').forEach(r => r.classList.remove('selected'));
    row.classList.add('selected');
    openThisTierlist();
  });

  const openMenu = e => { e.stopPropagation(); tlOpenManageModal(tl.id, row, 'folders'); };
  ctxBtn.addEventListener('click', openMenu);
  row.addEventListener('contextmenu', e => { e.preventDefault(); openMenu(e); });

  return row;
}

function tlRenderList() {
  if (!tlState.folders) tlState.folders = [];

  document.getElementById('tl-fp-view-toggle-list').classList.toggle('active', _tlFoldersViewMode === 'list');
  document.getElementById('tl-fp-view-toggle-icons').classList.toggle('active', _tlFoldersViewMode === 'icons');
  tlList.classList.toggle('hidden', _tlFoldersViewMode !== 'list');
  document.getElementById('tl-folders-panel-icons').classList.toggle('hidden', _tlFoldersViewMode !== 'icons');

  if (_tlFoldersViewMode === 'icons') { _renderTlFoldersPanelIcons(); if (window.lucide) lucide.createIcons(); return; }

  tlList.innerHTML = '';
  _tlRenderRecentFolderPaths();
  const tlSortMode = _folderSortMode('tlFoldersSortMode');
  const tlSortSelect = document.getElementById('tl-folders-sort-select');
  if (tlSortSelect) tlSortSelect.value = tlSortMode;

  const { currentFolder } = _tlRenderFoldersBreadcrumb(tlRenderList);
  const parentId = currentFolder ? currentFolder.id : null;

  const subFolders = _sortFoldersList((tlState.folders || []).filter(f => !f.archived && (f.parentId || null) === parentId), tlSortMode);
  // Tierlists/templates de ce niveau — les tierlists rattachées à un template vivant n'apparaissent
  // jamais à plat, seulement via leur template (même filtrage que la vue icônes).
  const levelTierlists = tlState.tierlists.filter(tl => !tl.archived && (tl.folderId || null) === parentId && !_tlHasLiveTemplate(tl));
  const hasContent = subFolders.length > 0 || levelTierlists.length > 0;

  if (!hasContent) {
    const msg = document.createElement('div');
    msg.className = 'tl-list-empty';
    msg.style.cssText = 'color:var(--text-faint);font-style:italic;font-size:0.82rem;padding:8px 4px;';
    msg.textContent = 'Vide.';
    tlList.appendChild(msg);
    return;
  }

  subFolders.forEach(f => tlList.appendChild(_tlBuildFolderListRow(f, tlList, tlRenderList)));
  levelTierlists.forEach(tl => tlList.appendChild(_tlBuildTierlistListRow(tl, tlList)));
  if (window.lucide) lucide.createIcons();
}

// ── Drag & drop réordonnement des tiers ───────────────────────────────────────
let _tlTierDragId = null;

// Aperçu du réordonnement de tier, même principe que le placeholder d'image (tl-drop-placeholder) :
// un bloc pousse visuellement les tiers voisins à la place où le tier atterrira, plutôt qu'une
// simple bordure indicative — cohérent avec l'aperçu déjà en place pour le drag d'image.
function _tlShowTierDropPlaceholder(wrap, before) {
  let placeholder = tlTiersZone.querySelector('.tl-tier-drop-placeholder');
  if (!placeholder) {
    placeholder = document.createElement('div');
    placeholder.className = 'tl-tier-drop-placeholder tl-drop-placeholder';
  }
  const rect = wrap.getBoundingClientRect();
  placeholder.style.height = rect.height + 'px';
  const refNode = before ? wrap : wrap.nextSibling;
  if (placeholder.nextSibling !== refNode || placeholder.parentElement !== tlTiersZone) {
    tlTiersZone.insertBefore(placeholder, refNode);
  }
}
function _tlClearTierDropPlaceholder() {
  const placeholder = tlTiersZone.querySelector('.tl-tier-drop-placeholder');
  if (placeholder) placeholder.remove();
}

function tlRenderTiers(tl) {
  tlTiersZone.innerHTML = '';
  const imgSize = _tlLocalImgSize !== null ? _tlLocalImgSize : _tlClampImgSize(tl.imgSize);

  tl.tiers.forEach((tier, tierIdx) => {
    const wrap = document.createElement('div');
    wrap.className = 'tl-tier-wrap';
    wrap.dataset.tierId = tier.id;
    wrap.draggable = false;

    // Colonne grip + settings — en dehors du carré coloré du tier
    const controls = document.createElement('div');
    controls.className = 'tl-tier-controls';

    const dragHandle = document.createElement('span');
    dragHandle.className = 'tl-tier-drag-handle';
    dragHandle.innerHTML = '<i data-lucide="grip"></i>';
    dragHandle.title = 'Glisser pour réordonner';
    dragHandle.addEventListener('mousedown', () => { wrap.draggable = true; });
    dragHandle.addEventListener('mouseleave', () => { if (!wrap.classList.contains('tl-tier-label-dragging')) wrap.draggable = false; });
    controls.appendChild(dragHandle);

    const settingsBtn = document.createElement('button');
    settingsBtn.className = 'tl-tier-settings-btn';
    settingsBtn.innerHTML = '<i data-lucide="settings"></i>';
    settingsBtn.title = 'Options du tier';
    settingsBtn.addEventListener('click', e => {
      e.stopPropagation();
      _tlShowTierCtxMenu(e, tl, tier, tierIdx, labelText);
    });
    controls.appendChild(settingsBtn);

    wrap.appendChild(controls);

    const row = document.createElement('div');
    row.className = 'tl-tier-row';

    // Cellule label
    const labelCell = document.createElement('div');
    labelCell.className = 'tl-tier-label-cell';
    labelCell.style.background = tier.color;
    labelCell.title = 'Clic droit pour les options · Glisser la poignée pour réordonner';

    const labelText = document.createElement('span');
    labelText.className = 'tl-tier-label-text';
    labelText.textContent = tier.label;
    labelText.title = 'Clic pour renommer (double-clic : tout sélectionner) · Clic droit pour les options';
    let _tierRenameClickTimer = null;
    labelText.addEventListener('click', e => {
      e.stopPropagation();
      if (_tierRenameClickTimer) { clearTimeout(_tierRenameClickTimer); _tierRenameClickTimer = null; return; }
      const caretOffset = _tlCaretOffsetFromClick(labelText, e.clientX, e.clientY);
      _tierRenameClickTimer = setTimeout(() => {
        _tierRenameClickTimer = null;
        _tlInlineRenameTier(labelText, tl, tier, caretOffset);
      }, 220);
    });
    labelText.addEventListener('dblclick', e => {
      e.stopPropagation();
      if (_tierRenameClickTimer) { clearTimeout(_tierRenameClickTimer); _tierRenameClickTimer = null; }
      _tlInlineRenameTier(labelText, tl, tier, null);
    });
    labelCell.appendChild(labelText);

    // Drag & drop réordonnement tiers — déclenché uniquement depuis la poignée (wrap.draggable).
    // e.target === wrap est indispensable : un dragstart/dragend démarré sur une carte-image à
    // l'intérieur du tier bubble jusqu'ici, et sans ce garde-fou _tlTierDragId se retrouvait affecté
    // pendant tout drag d'image (bloquant le drop dans imgsDiv, cf. wrap.addEventListener('drop')).
    wrap.addEventListener('dragstart', e => {
      if (e.target !== wrap) return;
      _tlTierDragId = tier.id;
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(() => wrap.classList.add('tl-tier-label-dragging'), 0);
    });
    wrap.addEventListener('dragend', e => {
      if (e.target !== wrap) return;
      _tlTierDragId = null;
      wrap.draggable = false;
      wrap.classList.remove('tl-tier-label-dragging');
      _tlClearTierDropPlaceholder();
    });
    wrap.addEventListener('dragover', e => {
      if (!_tlTierDragId) return;
      // preventDefault() dans tous les cas (même en survolant le tier qu'on drag lui-même) pour que
      // le curseur natif du navigateur reste en mode "autorisé" partout dans la zone valide — sans
      // ça, il passe en icône "interdit" dès qu'on repasse sur la position d'origine du drag.
      e.preventDefault();
      if (_tlTierDragId === tier.id) return;
      const rect = wrap.getBoundingClientRect();
      const before = e.clientY < rect.top + rect.height / 2;
      _tlShowTierDropPlaceholder(wrap, before);
    });
    wrap.addEventListener('dragleave', e => {
      if (!wrap.contains(e.relatedTarget)) {
        wrap.classList.remove('tl-tier-drop-above', 'tl-tier-drop-below');
      }
    });
    wrap.addEventListener('drop', e => {
      if (!_tlTierDragId || _tlTierDragId === tier.id) return;
      e.preventDefault();
      _tlClearTierDropPlaceholder();
      const rect = wrap.getBoundingClientRect();
      const before = e.clientY < rect.top + rect.height / 2;
      const fromIdx = tl.tiers.findIndex(t => t.id === _tlTierDragId);
      if (fromIdx === -1) return;
      _tlPushUndoOp({ tierlistId: tl.id, type: 'reorderTier', tierId: _tlTierDragId, fromIndex: fromIdx });
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
      if (!tl.isTemplate) {
        const hint = document.createElement('span');
        hint.className = 'tl-tier-images-empty';
        hint.textContent = 'Dépose des images ici';
        imgsDiv.appendChild(hint);
      }
    } else {
      tier.items.forEach(itemId => {
        const img = tlFindImage(tl, itemId);
        if (img) imgsDiv.appendChild(tlBuildImgCard(tl, img, imgSize));
      });
    }

    row.appendChild(imgsDiv);
    wrap.appendChild(row);
    tlTiersZone.appendChild(wrap);
  });
  if (window.lucide) lucide.createIcons();
}

// ── Renommage inline tier ─────────────────────────────────────────────────────
// Place le curseur dans `input` au caractère le plus proche du point (clientX, clientY) où l'utilisateur
// a cliqué sur `spanEl` (mesuré avant son remplacement) — sinon le clic qui déclenche le renommage
// sélectionnerait tout le texte au lieu de placer le curseur comme un clic normal dans un champ.
function _tlCaretOffsetFromClick(spanEl, clientX, clientY) {
  if (document.caretRangeFromPoint) {
    const range = document.caretRangeFromPoint(clientX, clientY);
    if (range && spanEl.contains(range.startContainer)) return range.startOffset;
  } else if (document.caretPositionFromPoint) {
    const pos = document.caretPositionFromPoint(clientX, clientY);
    if (pos && spanEl.contains(pos.offsetNode)) return pos.offset;
  }
  return null;
}

function _tlInlineRenameTier(spanEl, tl, tier, caretOffset) {
  // textarea plutôt qu'input : un label de tier peut passer sur plusieurs lignes (word-break selon la
  // largeur de la colonne) — un input single-line ne wrap pas et tronque visuellement le texte affiché.
  const input = document.createElement('textarea');
  input.value = tier.label;
  input.rows = 1;
  input.className = 'tl-tier-label-input';
  spanEl.replaceWith(input);
  const autoGrow = () => { input.style.height = 'auto'; input.style.height = input.scrollHeight + 'px'; };
  autoGrow();
  input.addEventListener('input', autoGrow);
  input.focus();
  if (caretOffset !== null) input.setSelectionRange(caretOffset, caretOffset);
  else input.select();

  const commit = () => {
    const newLabel = input.value.trim();
    if (newLabel && newLabel !== tier.label) {
      _tlPushUndoOp({ tierlistId: tl.id, type: 'editTier', tierId: tier.id, oldLabel: tier.label, oldColor: tier.color });
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

function _tlMakeCtxMenu(anchorEl, e, opts) {
  // Capturer la position de l'ancre AVANT de fermer un menu TL déjà ouvert : si anchorEl est
  // lui-même un élément de ce menu (ex. bouton ⋮ d'un dropdown), le retirer du DOM d'abord
  // ferait perdre son rect (tout à 0,0) et positionnerait le nouveau menu en haut à gauche.
  let frozenRect = null;
  if (anchorEl) {
    const r = anchorEl.getBoundingClientRect();
    frozenRect = { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
  }
  // Fermer tout menu TL déjà ouvert
  if (_tlActiveCtxMenu) { _tlActiveCtxMenu.remove(); _tlActiveCtxMenu = null; }

  const menu = document.createElement('div');
  menu.className = 'ctx-menu';

  if (opts && opts.title) {
    const titleEl = document.createElement('div');
    titleEl.className = 'ctx-menu-title';
    titleEl.textContent = opts.title;
    titleEl.title = opts.title;
    menu.appendChild(titleEl);
  }

  if (!opts || !opts.noCloseBtn) {
    const closeBtn = document.createElement('button');
    closeBtn.className = 'ctx-close-btn';
    closeBtn.title = 'Fermer';
    closeBtn.innerHTML = '<i data-lucide="x"></i>';
    menu.appendChild(closeBtn);
    closeBtn.addEventListener('click', e => { e.stopPropagation(); close(); });
  }
  if (window.lucide) lucide.createIcons();

  const close = () => {
    menu.remove();
    if (_tlActiveCtxMenu === menu) _tlActiveCtxMenu = null;
    document.removeEventListener('click', onDocClick);
    document.removeEventListener('contextmenu', onDocCtx);
  };

  // iconName: nom d'icône Lucide (ou '' pour aucune icône), text: libellé affiché
  const addItem = (iconName, text, danger, fn) => {
    const btn = document.createElement('button');
    btn.className = 'ctx-menu-item' + (danger === 'green' ? ' ctx-green' : danger ? ' ctx-danger' : '');
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

  if (frozenRect) positionCtxMenu(menu, null, { getBoundingClientRect: () => frozenRect });
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
  const { addItem, addSep } = _tlMakeCtxMenu(null, e, { title: tier.label });

  addItem('pencil', 'Renommer', false, () => {
    if (labelSpan && document.body.contains(labelSpan)) _tlInlineRenameTier(labelSpan, tl, tier);
    else tlOpenTierModal({ mode: 'edit', tl, tier });
  });
  addItem('palette', 'Modifier la couleur', false, () => tlOpenTierModal({ mode: 'color', tl, tier }));
  addSep();
  addItem('chevron-up', 'Ajouter un tier au-dessus', false, () => {
    const newTier = { id: uid(), label: '?', color: '#888888', items: [] };
    _tlPushUndoOp({ tierlistId: tl.id, type: 'addTier', tierId: newTier.id });
    tl.tiers.splice(tierIdx, 0, newTier);
    tlSave(); tlRender();
    tlEditTier(tlActiveTierlist(), tlActiveTierlist().tiers[tierIdx]);
  });
  addItem('chevron-down', 'Ajouter un tier en-dessous', false, () => {
    const newTier = { id: uid(), label: '?', color: '#888888', items: [] };
    _tlPushUndoOp({ tierlistId: tl.id, type: 'addTier', tierId: newTier.id });
    tl.tiers.splice(tierIdx + 1, 0, newTier);
    tlSave(); tlRender();
    tlEditTier(tlActiveTierlist(), tlActiveTierlist().tiers[tierIdx + 1]);
  });
  addSep();
  addItem('x', 'Supprimer ce tier', true, () => tlDeleteTier(tl, tier.id));
}

// ── Zoom image (overlay plein écran, lecture seule) ──────────────────────────
// Boîte à taille fixe (largeur = hauteur en vw/vh) impossible à faire suivre le ratio réel de
// l'image via CSS seul puisqu'on utilise background-image (pas <img>, pour échapper au scan
// d'extensions type Fatkun) — donc on mesure l'image en mémoire (jamais insérée dans le DOM) et on
// dimensionne le conteneur nous-mêmes, plafonné à 90vh de haut et 90vw de large.
function _tlOpenImgZoom(img, tl) {
  const modal = document.getElementById('tl-modal-img-zoom');
  const pic = document.getElementById('tl-img-zoom-picture');
  const label = document.getElementById('tl-img-zoom-label');
  if (!modal || !pic) return;
  pic.style.backgroundImage = `url("${img.src}")`;
  modal.classList.remove('hidden');
  const showLabels = _tlLocalShowLabels !== null ? _tlLocalShowLabels : !!(tl && tl.showLabels);
  if (label) {
    label.classList.toggle('hidden', !showLabels);
    label.textContent = img.name || '';
  }
  const probe = new Image();
  probe.onload = () => {
    const maxW = window.innerWidth * 0.9;
    const maxH = window.innerHeight * 0.9;
    // Toutes les images sont compressées à l'import (~400px de long côté, cf. _tlCompressToBase64),
    // donc leur taille native est toujours petite face à 90vw/90vh — sans cette normalisation le
    // zoom paraît minuscule et incohérent d'une image à l'autre selon leur ratio d'origine. On
    // remonte donc systématiquement à ~70% de l'espace disponible (quitte à légèrement flouter),
    // sauf si l'image est déjà plus grande que ça nativement.
    const targetW = maxW * 0.7;
    const targetH = maxH * 0.7;
    const upscaleRatio = Math.min(targetW / probe.naturalWidth, targetH / probe.naturalHeight);
    const ratio = Math.min(Math.max(upscaleRatio, 1), maxW / probe.naturalWidth, maxH / probe.naturalHeight);
    pic.style.width = Math.round(probe.naturalWidth * ratio) + 'px';
    pic.style.height = Math.round(probe.naturalHeight * ratio) + 'px';
  };
  probe.src = img.src;
}
function _tlCloseImgZoom() {
  const modal = document.getElementById('tl-modal-img-zoom');
  if (modal) modal.classList.add('hidden');
}
document.getElementById('tl-img-zoom-close')?.addEventListener('click', _tlCloseImgZoom);
document.getElementById('tl-modal-img-zoom')?.addEventListener('click', e => {
  if (e.target.id === 'tl-modal-img-zoom') _tlCloseImgZoom();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') _tlCloseImgZoom();
});

// ── Mode comparaison (overlay interne) ────────────────────────
let _tlCompareTierlists = null; // dernière liste rendue, pour re-render au changement de taille
let _tlCompareImgSize = 100;
let _tlCompareHighlightImgId = null; // élément en surbrillance dans toutes les colonnes (clic gauche)
let _tlCompareDragImgId = null;      // id de l'image en cours de glisser-déposer
let _tlCompareDragTlId = null;       // tierlist d'origine du drag (jamais de drop inter-liste)

function _tlRenderCompareView(tls) {
  const container = document.getElementById('tl-compare-view');
  if (!container) return;
  if (tls) _tlCompareTierlists = tls;
  else tls = _tlCompareTierlists;
  if (!tls) return;

  const toolbar = document.getElementById('tl-compare-toolbar');
  if (toolbar) toolbar.classList.remove('hidden');

  container.classList.remove('hidden');
  container.innerHTML = '';
  tls.forEach(tl => {
    const col = document.createElement('div');
    col.className = 'tl-compare-column';
    col.dataset.tlId = tl.id;

    const title = document.createElement('h3');
    title.className = 'tl-compare-column-title';
    title.textContent = tl.name;
    col.appendChild(title);

    const imgSize = _tlCompareImgSize;

    tl.tiers.forEach(tier => {
      const row = document.createElement('div');
      row.className = 'tl-compare-tier-row';

      const labelCell = document.createElement('div');
      labelCell.className = 'tl-tier-label-cell';
      labelCell.style.background = tier.color;
      const labelText = document.createElement('span');
      labelText.className = 'tl-tier-label-text';
      labelText.textContent = tier.label;
      labelCell.appendChild(labelText);
      row.appendChild(labelCell);

      const imgsDiv = document.createElement('div');
      imgsDiv.className = 'tl-tier-images';
      imgsDiv.dataset.tierId = tier.id;
      imgsDiv.dataset.tlId = tl.id;
      imgsDiv.addEventListener('dragover', e => _tlCompareDragOver(e, tl.id));
      imgsDiv.addEventListener('dragleave', _tlCompareDragLeave);
      imgsDiv.addEventListener('drop', e => _tlCompareDrop(e, tl, tier.id));
      tier.items.forEach(imgId => {
        const img = tlFindImage(tl, imgId);
        if (img) imgsDiv.appendChild(_tlBuildCompareImgCard(tl, img, imgSize));
      });
      row.appendChild(imgsDiv);

      col.appendChild(row);
    });

    container.appendChild(col);
  });
  if (window.lucide) lucide.createIcons();
}

// Carte en mode comparaison : pas de renommage/suppression (contrairement à l'éditeur normal),
// mais interactive — clic gauche = surbrillance croisée, double-clic = scroll auto vers l'élément
// dans les autres colonnes, glisser-déposer = réordonner/changer de tier DANS la même liste.
function _tlBuildCompareImgCard(tl, img, size) {
  const card = tlBuildImgCard(tl, img, size, true);
  card.classList.toggle('tl-compare-highlight', img.id === _tlCompareHighlightImgId);
  card.draggable = true;
  card.title = img.name + '\nClic gauche : surligner dans toutes les listes · Double-clic : localiser · Glisser pour réordonner';

  card.addEventListener('click', e => {
    e.stopPropagation();
    _tlCompareHighlightImgId = (_tlCompareHighlightImgId === img.id) ? null : img.id;
    _tlApplyCompareHighlight();
  });
  card.addEventListener('dblclick', e => {
    e.stopPropagation();
    _tlCompareHighlightImgId = img.id;
    _tlApplyCompareHighlight();
    _tlCompareScrollToImg(img.id);
  });
  card.addEventListener('dragstart', e => {
    _tlCompareDragImgId = img.id;
    _tlCompareDragTlId = tl.id;
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => card.classList.add('dragging'), 0);
  });
  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
    _tlCompareDragImgId = null;
    _tlCompareDragTlId = null;
    tlClearDropBefore();
    _tlClearDragSourceHidden();
    document.querySelectorAll('.tl-compare-view .tl-tier-images.drag-over').forEach(z => z.classList.remove('drag-over'));
  });

  return card;
}

function _tlApplyCompareHighlight() {
  document.querySelectorAll('#tl-compare-view .tl-img-card').forEach(card => {
    card.classList.toggle('tl-compare-highlight', card.dataset.imgId === _tlCompareHighlightImgId);
  });
}

// Scrolle chaque colonne où l'élément n'est pas déjà visible jusqu'à sa carte.
function _tlCompareScrollToImg(imgId) {
  document.querySelectorAll('#tl-compare-view .tl-compare-column').forEach(col => {
    const card = col.querySelector(`.tl-img-card[data-img-id="${imgId}"]`);
    if (!card) return;
    const colRect = col.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const alreadyVisible = cardRect.top >= colRect.top && cardRect.bottom <= colRect.bottom;
    if (!alreadyVisible) card.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });
}

// Glisser-déposer en mode comparaison : réutilise le même calcul de position que l'éditeur normal
// (_tlComputeDropIndex) mais jamais entre deux tierlists différentes de la comparaison — le drop
// est ignoré si la zone survolée/déposée n'appartient pas à la tierlist d'origine du drag.
function _tlCompareDragOver(e, zoneTlId) {
  if (!_tlCompareDragImgId || zoneTlId !== _tlCompareDragTlId) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const zone = e.currentTarget;
  zone.classList.add('drag-over');

  const sourceCard = document.querySelector(`#tl-compare-view .tl-img-card[data-img-id="${_tlCompareDragImgId}"]`);
  if (sourceCard) sourceCard.classList.add('drag-source-hidden');

  const { idx, cards } = _tlComputeDropIndex(zone, _tlCompareDragImgId, e.clientX, e.clientY);
  let placeholder = zone.querySelector('.tl-drop-placeholder');
  if (!placeholder) {
    placeholder = document.createElement('div');
    placeholder.className = 'tl-drop-placeholder';
  } else if (placeholder.parentElement !== zone) {
    placeholder.remove();
  }
  const refCard = cards[0] || zone.querySelector('.tl-img-card');
  if (refCard) {
    const size = refCard.getBoundingClientRect();
    placeholder.style.width = size.width + 'px';
    placeholder.style.height = size.height + 'px';
  }
  const refNode = cards[idx] || null;
  if (placeholder.nextSibling !== refNode || placeholder.parentElement !== zone) {
    zone.insertBefore(placeholder, refNode);
  }
}

function _tlCompareDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
  if (!e.currentTarget.contains(e.relatedTarget)) tlClearDropBefore();
}

function _tlCompareDrop(e, tl, targetTierId) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  tlClearDropBefore();
  const imgId = _tlCompareDragImgId;
  if (!imgId || _tlCompareDragTlId !== tl.id) return;

  const from = _tlLocateImage(tl, imgId);
  if (from) _tlPushUndoOp({ tierlistId: tl.id, type: 'moveImage', imgId, fromZone: from.zone, fromIndex: from.index });

  _tlRemoveImageFromAllZones(tl, imgId);
  const tier = tl.tiers.find(t => t.id === targetTierId);
  if (!tier) return;
  const imgsDiv = e.currentTarget;
  const { idx: insertIdx } = _tlComputeDropIndex(imgsDiv, imgId, e.clientX, e.clientY);
  tier.items.splice(insertIdx, 0, imgId);

  tlTouchFolderChain(_tlEffectiveFolderId(tl));
  tlSave();
  _tlRenderCompareView(null);
}

const tlCompareShowLabelsToggle = document.getElementById('tl-compare-show-labels-toggle');
if (tlCompareShowLabelsToggle) {
  tlCompareShowLabelsToggle.addEventListener('click', () => {
    const currentlyShown = _tlLocalShowLabels !== null ? _tlLocalShowLabels : true;
    _tlLocalShowLabels = !currentlyShown;
    _tlUpdateShowLabelsBtn(_tlLocalShowLabels);
    saveUserPrefs({ tlShowLabels: _tlLocalShowLabels });
    _tlRenderCompareView(null);
  });
}

// Assemble les canvas de chaque tierlist comparée côte à côte (même rendu que _tlBuildCanvas,
// donc respecte déjà la préférence _tlLocalShowLabels et la taille locale).
async function _tlBuildCompareCanvas() {
  const tls = _tlCompareTierlists;
  if (!tls || tls.length === 0) return null;
  const canvases = await Promise.all(tls.map(tl => _tlBuildCanvas(tl)));
  const gap = 16;
  const totalWidth = canvases.reduce((sum, c) => sum + c.width, 0) + gap * (canvases.length - 1);
  const totalHeight = Math.max(...canvases.map(c => c.height));
  const canvas = document.createElement('canvas');
  canvas.width = totalWidth;
  canvas.height = totalHeight;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#18181c';
  ctx.fillRect(0, 0, totalWidth, totalHeight);
  let x = 0;
  for (const c of canvases) {
    ctx.drawImage(c, x, 0);
    x += c.width + gap;
  }
  return canvas;
}

function tlCompareExport() {
  _tlBuildCompareCanvas().then(canvas => {
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'comparaison_tierlists.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  });
}

function tlCompareCapture() {
  _tlBuildCompareCanvas().then(canvas => {
    if (!canvas) return;
    canvas.toBlob(blob => {
      if (!blob) return;
      navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).then(() => {
        playCaptureSound();
      }).catch(err => {
        console.warn('TL Compare capture clipboard error:', err);
      });
    }, 'image/png');
  });
}

document.getElementById('tl-compare-btn-capture')?.addEventListener('click', () => openTlCaptureChoiceModal(tlCompareCapture, tlCompareExport));
document.getElementById('tl-compare-btn-exit')?.addEventListener('click', _exitCompareTierlistMode);

function tlRenderUnplaced(tl) {
  tlUnplacedZone.innerHTML = '';
  const imgSize = _tlLocalUnplacedImgSize !== null ? _tlLocalUnplacedImgSize : _tlClampImgSize(tl.imgSize);

  if (tl.unplaced.length === 0) {
    const hint = document.createElement('div');
    hint.className = 'tl-unplaced-hint';
    hint.textContent = 'Dépose des images ici ou importe-en';
    tlUnplacedZone.appendChild(hint);
  } else {
    _tlGetSortedUnplaced(tl).forEach(imgId => {
      const img = tlFindImage(tl, imgId);
      if (img) tlUnplacedZone.appendChild(tlBuildImgCard(tl, img, imgSize, false, true));
    });
  }
  // L'élément désigné "à placer" non encore résolu pour CE membre a été retiré de tl.unplaced
  // (il est affiché à part, dans la zone à placer) mais doit continuer à compter comme un
  // élément "non placé" dans l'affichage — sinon le compteur baisse à tort (ex. 30/31 → 29/30)
  // dès qu'un élément est désigné, alors qu'aucun élément n'a réellement quitté la tierlist.
  const toPlaceImgId = _tlGroupRoot(tl).toPlaceImgId;
  const toPlaceCountsAsUnplaced = toPlaceImgId && !_tlMemberResolvedFor(tl, toPlaceImgId) ? 1 : 0;
  const tlOwnUnplacedCount = tl.unplaced.length + toPlaceCountsAsUnplaced;
  const tlOwnTotal = tlOwnUnplacedCount + tl.tiers.reduce((sum, t) => sum + t.items.length, 0);
  tlUnplacedCount.textContent = tlOwnUnplacedCount + ' / ' + tlOwnTotal;
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
    const addedImgs = [];
    const promises = imageItems.map(item => {
      const type = item.types.find(t => t.startsWith('image/'));
      return item.getType(type).then(blob => {
        const name = `capture_${now.getHours()}h${String(now.getMinutes()).padStart(2,'0')}`;
        return _tlCompressToBase64(blob).then(src => {
          if (root.images.length >= maxImages) return;
          if (root.images.some(i => i.src === src)) return;
          const img = { id: uid(), src, name, updatedAt: Date.now() };
          _tlSrcCache[img.id] = src;
          _tlPushUndoOp({ tierlistId: tl.id, groupRootId: root.id, type: 'addImage', imgId: img.id });
          root.images.push(img);
          _tlGetGroupMembers(tl).forEach(member => {
            if (!member.unplaced.includes(img.id)) member.unplaced.push(img.id);
          });
          addedImgs.push(img);
        });
      });
    });
    Promise.all(promises).then(() => {
      tlSave(); tlRender();
      _tlNameNewImgsSequentially(tl, addedImgs);
    }).catch(e => {
      console.warn('TL clipboard paste error:', e);
      alert('Impossible de lire le presse-papier. Essaie Ctrl+V à la place.');
    });
  }).catch(() => alert('Impossible de lire le presse-papier. Essaie Ctrl+V à la place.'));
}

function tlBuildImgCard(tl, img, size, readOnly = false, isUnplacedZone = false) {
  const card = document.createElement('div');
  card.className = 'tl-img-card';
  if (!readOnly && img.id === _tlSelectedImgId) card.classList.add('selected');
  card.draggable = !readOnly;
  card.dataset.imgId = img.id;
  card.title = readOnly ? img.name : img.name + '\nClic gauche : sélectionner (Suppr pour supprimer) · Glisser pour déplacer · Clic droit : renommer / supprimer';

  if (!readOnly) {
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
      tlClearDropBefore();
      _tlClearDragSourceHidden();
    });

    if (isUnplacedZone) {
      card.addEventListener('dblclick', e => {
        e.stopPropagation();
        _tlSetImageToPlace(tl, img.id);
      });
    }
  }

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

    const zoomBtn = document.createElement('button');
    zoomBtn.type = 'button';
    zoomBtn.className = 'tl-img-zoom-btn';
    zoomBtn.draggable = false;
    zoomBtn.title = 'Agrandir l\'image';
    zoomBtn.innerHTML = '<i data-lucide="zoom-in"></i>';
    zoomBtn.addEventListener('click', e => {
      e.stopPropagation();
      _tlOpenImgZoom(img, tl);
    });
    zoomBtn.addEventListener('mousedown', e => e.stopPropagation());
    zoomBtn.addEventListener('dragstart', e => { e.preventDefault(); e.stopPropagation(); });
    card.appendChild(zoomBtn);
  }

  const _showLbls = isUnplacedZone
    ? (_tlLocalUnplacedShowLabels !== null ? _tlLocalUnplacedShowLabels : !!tl.showLabels)
    : (_tlLocalShowLabels !== null ? _tlLocalShowLabels : !!tl.showLabels);
  if (_showLbls && !isText) {
    const label = document.createElement('div');
    label.className = 'tl-img-label';
    label.style.width = size + 'px';
    label.textContent = img.name;
    if (!readOnly) {
      label.title = 'Clic gauche : renommer (double-clic : tout sélectionner) · Clic droit : options';
      let _imgRenameClickTimer = null;
      label.addEventListener('click', e => {
        e.stopPropagation();
        if (_imgRenameClickTimer) { clearTimeout(_imgRenameClickTimer); _imgRenameClickTimer = null; return; }
        const caretOffset = _tlCaretOffsetFromClick(label, e.clientX, e.clientY);
        _imgRenameClickTimer = setTimeout(() => {
          _imgRenameClickTimer = null;
          _tlInlineRenameImg(label, tl, img, size, caretOffset);
        }, 220);
      });
      label.addEventListener('dblclick', e => {
        e.stopPropagation();
        if (_imgRenameClickTimer) { clearTimeout(_imgRenameClickTimer); _imgRenameClickTimer = null; }
        _tlInlineRenameImg(label, tl, img, size, null);
      });
    }
    card.appendChild(label);
  }

  if (!readOnly) {
    card.addEventListener('contextmenu', e => {
      e.preventDefault();
      e.stopPropagation();
      _tlShowImgCtxMenu(e, tl, img);
    });
  }

  return card;
}

// ── Renommage inline image ────────────────────────────────────────────────────
function _tlInlineRenameImg(labelEl, tl, img, size, caretOffset) {
  const input = document.createElement('input');
  input.type = 'text';
  input.value = img.name;
  input.className = 'tl-img-label-input';
  input.style.width = size + 'px';
  labelEl.replaceWith(input);
  input.focus();
  if (caretOffset !== null && caretOffset !== undefined) input.setSelectionRange(caretOffset, caretOffset);
  else input.select();

  const commit = () => {
    const newName = input.value.trim();
    if (newName && newName !== img.name) {
      _tlPushUndoOp({ tierlistId: tl.id, groupRootId: _tlGroupRoot(tl).id, type: 'renameImage', imgId: img.id, oldName: img.name });
      img.name = newName;
      img.updatedAt = Date.now();
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
  const { addItem } = _tlMakeCtxMenu(null, e, { title: img.name });
  const isText = (img.type || 'image') === 'text';
  if (!isText) addItem('zoom-in', 'Zoomer', false, () => _tlOpenImgZoom(img, tl));
  if (!tl.isTemplate) addItem('pin', 'À placer', false, () => _tlSetImageToPlace(tl, img.id));
  addItem('pencil', 'Renommer', false, () => tlOpenRenameImg(tl, img));
  addItem('x', 'Supprimer', true, () => tlDeleteImage(tl, img.id));
}

// ── Recherche d'image ─────────────────────────────────────────────────────────
function tlFindImage(tl, imgId) {
  return _tlGetGroupImages(tl).find(i => i.id === imgId) || null;
}

// ── Actions sur les tierlists ─────────────────────────────────────────────────
function tlCreate(name, folderId, isTemplate = false, presetId = null) {
  const tl = tlDefaultTierlist(name, isTemplate);
  if (folderId) tl.folderId = folderId;
  if (presetId) {
    const preset = tlGetAllPresets().find(p => p.id === presetId);
    if (preset) tl.tiers = preset.tiers.map(t => ({ id: uid(), label: t.label, color: t.color, items: [] }));
  }
  tlState.tierlists.push(tl);
  _tlLocalActiveTierlistId = tl.id;
  _tlLocalNoSelection = false;
  saveUserPrefs({ tlActiveTierlistId: tl.id, tlNoSelection: false });
  tlTouchFolderChain(tl.folderId);
  tlSave();
  tlRender();
  return tl;
}

function tlSwitch(id, allowDeselect = true) {
  if (_tlLocalActiveTierlistId === id) {
    if (!allowDeselect) return; // groupe : une bulle reste toujours sélectionnée
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
  const tl = tlState.tierlists.find(t => t.id === id);
  if (!tl) return;
  const effectiveFolderId = _tlEffectiveFolderId(tl);
  tlTouchFolderChain(effectiveFolderId);
  // Suppression d'un template : cascade sur toutes ses tierlists générées, chacune sa propre entrée de corbeille
  const cascaded = tl.isTemplate ? tlState.tierlists.filter(t => t.templateId === id) : [];
  tlTrashPush({ type: 'tierlist', data: tl, folderId: effectiveFolderId });
  cascaded.forEach(t => tlTrashPush({ type: 'tierlist', data: t, folderId: _tlEffectiveFolderId(t) }));
  const removedIds = new Set([id, ...cascaded.map(t => t.id)]);
  tlState.tierlists = tlState.tierlists.filter(t => !removedIds.has(t.id));
  if (removedIds.has(_tlLocalActiveTierlistId)) {
    // Priorité au template d'origine (s'il existe encore et n'a pas été supprimé lui-même) plutôt
    // qu'à une tierlist arbitraire — l'utilisateur reste dans le contexte qu'il consultait. S'il n'y
    // a plus de template, on désélectionne et on reste sur ce dossier plutôt que de sauter vers une
    // tierlist sans rapport ailleurs — tlRender() affiche alors l'écran "gros boutons" du dossier actif.
    const template = tl.templateId ? tlState.tierlists.find(t => t.id === tl.templateId && !removedIds.has(t.id)) : null;
    _tlLocalActiveTierlistId = template ? template.id : null;
    _tlLocalNoSelection = !template;
    if (!template) _tlLocalActiveFolderId = effectiveFolderId;
    saveUserPrefs({ tlActiveTierlistId: _tlLocalActiveTierlistId, tlNoSelection: _tlLocalNoSelection, tlActiveFolderId: _tlLocalActiveFolderId });
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
  tl.tiers.forEach(tier => {
    tier.items.forEach(imgId => { if (!tl.unplaced.includes(imgId)) tl.unplaced.push(imgId); });
    tier.items = [];
  });
  tlSave();
  tlRender();
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
  _tlLocalActiveTierlistId = copy.id;
  _tlLocalNoSelection = false;
  saveUserPrefs({ tlActiveTierlistId: copy.id, tlNoSelection: false });
  tlTouchFolderChain(_tlEffectiveFolderId(copy));
  tlSave();
  tlRender();
}

function tlRename(id, newName) {
  const tl = tlState.tierlists.find(t => t.id === id);
  if (tl && newName.trim()) { tl.name = newName.trim(); tlTouchFolderChain(_tlEffectiveFolderId(tl)); }
  tlSave();
  tlRender();
}

// ── Actions sur les tiers ─────────────────────────────────────────────────────
function tlAddTier(label, color) {
  const tl = tlActiveTierlist();
  if (!tl) return;
  const newTier = { id: uid(), label, color, items: [] };
  _tlPushUndoOp({ tierlistId: tl.id, type: 'addTier', tierId: newTier.id });
  tl.tiers.push(newTier);
  tlSave();
  tlRender();
}

function tlDeleteTier(tl, tierId) {
  const tier = tl.tiers.find(t => t.id === tierId);
  if (tier && tier.items.length > 0) {
    const confirmed = confirm(`Ce tier contient ${tier.items.length} image(s). Les supprimer quand même ? (Elles seront renvoyées dans "Images non placées")`);
    if (!confirmed) return;
  }
  if (tier) {
    const tierIdx = tl.tiers.findIndex(t => t.id === tierId);
    _tlPushUndoOp({ tierlistId: tl.id, type: 'deleteTier', tier: JSON.parse(JSON.stringify(tier)), index: tierIdx });
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

// Remplace entièrement les tiers d'une tierlist/template par une nouvelle liste (label+couleur).
// Les images déjà placées dans les tiers actuels sont renvoyées en zone "non placées" avant remplacement.
function _tlReplaceTiers(tl, newTiersSpec, confirmMessage) {
  const placedCount = tl.tiers.reduce((n, t) => n + t.items.length, 0);
  if (placedCount > 0) {
    const ok = confirm(confirmMessage || `Remplacer les tiers va renvoyer ${placedCount} image(s) classée(s) en zone non placée. Continuer ?`);
    if (!ok) return false;
  }
  _tlPushUndoOp({
    tierlistId: tl.id,
    type: 'replaceTiers',
    oldTiers: JSON.parse(JSON.stringify(tl.tiers)),
    oldUnplaced: [...tl.unplaced],
  });
  tl.tiers.forEach(t => t.items.forEach(imgId => {
    if (!tl.unplaced.includes(imgId)) tl.unplaced.push(imgId);
  }));
  tl.tiers = newTiersSpec.map(t => ({ id: uid(), label: t.label, color: t.color, items: [] }));
  tlSave();
  tlRender();
  return true;
}

function tlApplyPreset(tl, presetId) {
  const preset = tlGetAllPresets().find(p => p.id === presetId);
  if (!preset) return;
  _tlReplaceTiers(tl, preset.tiers);
}

function tlSaveCurrentAsPreset(tl, name) {
  const trimmed = (name || '').trim();
  if (!trimmed) return;
  const preset = {
    id: uid(),
    name: trimmed,
    tiers: tl.tiers.map(t => ({ label: t.label, color: t.color })),
  };
  if (!Array.isArray(tlState.tierPresets)) tlState.tierPresets = [];
  tlState.tierPresets.push(preset);
  tlSave();
}

function tlDeletePreset(id) {
  if (String(id).startsWith('__builtin_')) return;
  tlState.tierPresets = (tlState.tierPresets || []).filter(p => p.id !== id);
  tlSave();
}

function tlImportTiersFrom(tl, sourceTlId) {
  const source = tlState.tierlists.find(t => t.id === sourceTlId);
  if (!source) return false;
  return _tlReplaceTiers(tl, source.tiers.map(t => ({ label: t.label, color: t.color })));
}

// ── Images ────────────────────────────────────────────────────────────────────
// tl.images = [{id, src, name}] — source de vérité pour les images
// tl.unplaced = [id, id, ...] — ids des images non placées dans un tier
// tier.items  = [id, id, ...] — ids des images dans ce tier

function _tlCompressToBase64(file, maxPx = 600, quality = 0.82) {
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
      const img = { id: uid(), src, name, updatedAt: Date.now() };
      _tlSrcCache[img.id] = src;
      _tlPushUndoOp({ tierlistId: tl.id, groupRootId: root.id, type: 'addImage', imgId: img.id });
      root.images.push(img);
      _tlGetGroupMembers(tl).forEach(member => {
        if (!member.unplaced.includes(img.id)) member.unplaced.push(img.id);
      });
    });
  };

  Promise.all(fileArray.map(processFile)).then(() => {
    tlTouchFolderChain(_tlEffectiveFolderId(tl));
    tlSave();
    tlRender();
    const msgs = [];
    if (ignoredByLimit > 0) msgs.push(`${ignoredByLimit} élément${ignoredByLimit > 1 ? 's ignorés' : ' ignoré'} — limite de ${maxImages} éléments atteinte.`);
    if (ignoredByDuplicate > 0) msgs.push(`${ignoredByDuplicate} élément${ignoredByDuplicate > 1 ? 's déjà présents ignorés' : ' déjà présent ignoré'} (doublon).`);
    if (msgs.length) alert(msgs.join('\n'));
  }).catch(e => console.warn('TL import error:', e));
}

function tlDeleteImage(tl, imgId) {
  const root = _tlGroupRoot(tl);
  const img = (root.images || []).find(i => i.id === imgId);
  const loc = _tlLocateImage(tl, imgId);
  if (img && loc) {
    _tlPushUndoOp({ tierlistId: tl.id, groupRootId: root.id, type: 'deleteImage', img: JSON.parse(JSON.stringify(img)), zone: loc.zone, index: loc.index });
  }
  _tlGetGroupMembers(tl).forEach(member => {
    member.unplaced = member.unplaced.filter(id => id !== imgId);
    member.tiers.forEach(t => { t.items = t.items.filter(id => id !== imgId); });
  });
  if (root.images) root.images = root.images.filter(i => i.id !== imgId);
  tlSave();
  tlRender();
}

// ── Drag & drop ───────────────────────────────────────────────────────────────
// Aperçu "temps réel" du dépôt : un vrai élément placeholder (taille de la carte glissée) est
// inséré dans le flux flex de la zone survolée, à la position exacte où l'image atterrirait —
// ça pousse physiquement les cartes voisines, donnant le rendu final avant même de relâcher.
//
// Bug historique (l'image atterrit parfois "un cran à côté" de ce que montrait l'aperçu) : la
// carte source est masquée (.drag-source-hidden) pendant tout le drag pour que le placeholder la
// remplace visuellement. Si cette classe était retirée à CHAQUE dragleave (y compris un simple
// survol transitoire d'une bordure entre deux zones, ou d'un élément adjacent comme le libellé du
// tier), la carte source réapparaissait brièvement dans le DOM juste avant que tlDrop() calcule
// son index final — décalant le résultat d'un cran par rapport à l'aperçu montré l'instant d'avant.
// Le placeholder (juste un indicateur visuel) peut disparaître à chaque dragleave sans risque, mais
// .drag-source-hidden doit rester posé tant que le drag global est actif : il n'est retiré qu'à la
// fin réelle du geste (dragend sur la carte, cf. plus bas), jamais à un dragleave de zone.
function tlClearDropBefore() {
  document.querySelectorAll('.tl-drop-placeholder').forEach(p => p.remove());
}
function _tlClearDragSourceHidden() {
  document.querySelectorAll('.tl-img-card.drag-source-hidden').forEach(c => c.classList.remove('drag-source-hidden'));
}

// Point de calcul UNIQUE de la position de dépose, partagé par l'aperçu (tlDragOver) et le dépôt
// réel (tlDrop) : les deux doivent impérativement voir exactement la même géométrie (mêmes cartes
// exclues, même liste) pour que le résultat final corresponde toujours à ce que l'aperçu montrait.
// Exclut systématiquement le placeholder ET la carte source (identifiée par imgId) — jamais la
// géométrie post-insertion du placeholder, qui serait perturbée par notre propre insertion précédente.
function _tlComputeDropIndex(zone, imgId, clientX, clientY) {
  // Le placeholder, une fois inséré dans le DOM par un dragover précédent, pousse physiquement les
  // cartes qui le suivent dans le flux flex-wrap — même en l'excluant de la liste `cards`, leurs
  // getBoundingClientRect() restent décalés par sa présence. Pour mesurer la géométrie EXACTEMENT
  // comme si de rien n'était placé, on le retire du DOM le temps de la mesure, puis on le remet.
  // C'est ce décalage qui causait l'aperçu et le résultat final à diverger malgré des coordonnées
  // souris identiques (confirmé par un test réel : x/y strictement égaux, index différent).
  const placeholder = zone.querySelector('.tl-drop-placeholder');
  const placeholderNext = placeholder ? placeholder.nextSibling : null;
  if (placeholder) placeholder.remove();

  const cards = Array.from(zone.querySelectorAll('.tl-img-card'))
    .filter(c => c.dataset.imgId !== imgId);
  const idx = tlDropInsertIndex(zone, clientX, clientY, cards);

  if (placeholder) zone.insertBefore(placeholder, placeholderNext);

  return { idx, cards };
}

function tlDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.classList.add('drag-over');
  const zone = e.currentTarget;

  // Masquer la carte source pendant le survol (elle "quitte" sa position d'origine visuellement)
  if (tlDragImgId) {
    const sourceCard = document.querySelector(`.tl-img-card[data-img-id="${tlDragImgId}"]`);
    if (sourceCard) sourceCard.classList.add('drag-source-hidden');
  }

  const { idx, cards } = _tlComputeDropIndex(zone, tlDragImgId, e.clientX, e.clientY);
  // Ne rien logger ici (un dragover se déclenche des dizaines de fois par seconde) — on mémorise
  // juste le dernier index vu, comparé au moment du drop (seul point où on log, 1 seule ligne).
  window.__TL_DND_LAST_PREVIEW = { idx, cardsCount: cards.length, x: Math.round(e.clientX), y: Math.round(e.clientY) };

  let placeholder = zone.querySelector('.tl-drop-placeholder');
  if (!placeholder) {
    placeholder = document.createElement('div');
    placeholder.className = 'tl-drop-placeholder';
  } else if (placeholder.parentElement !== zone) {
    placeholder.remove();
  }
  const refCard = cards[0] || zone.querySelector('.tl-img-card');
  if (refCard) {
    const size = refCard.getBoundingClientRect();
    placeholder.style.width = size.width + 'px';
    placeholder.style.height = size.height + 'px';
  }
  const refNode = cards[idx] || null;
  // Ne toucher au DOM que si la position cible a réellement changé — réinsérer à la même place à
  // chaque frame de dragover perturbe inutilement le flux flex-wrap et alimente l'oscillation.
  if (placeholder.nextSibling !== refNode || placeholder.parentElement !== zone) {
    zone.insertBefore(placeholder, refNode);
  }
}

function tlDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
  // Ne retirer le placeholder que si on quitte vraiment la zone (pas un survol d'enfant)
  if (!e.currentTarget.contains(e.relatedTarget)) tlClearDropBefore();
}

// Calcule l'index d'insertion dans une zone flex-wrap à partir de la position du curseur.
// `cardsOverride` permet de fournir une liste de cartes déjà filtrée (ex: sans le placeholder
// d'aperçu ni la carte source en cours de drag) pour ne pas fausser le calcul de position.
function tlDropInsertIndex(zone, clientX, clientY, cardsOverride) {
  const cards = cardsOverride || Array.from(zone.querySelectorAll('.tl-img-card'));
  if (cards.length === 0) return 0;
  // Grouper les cartes par ligne (zone en flex-wrap = plusieurs lignes) avant de comparer en X,
  // sinon un dépôt à droite de la dernière carte d'une ligne peut être mal interprété comme
  // "avant la première carte de la ligne suivante" (bug historique).
  const rows = [];
  cards.forEach((card, i) => {
    const rect = card.getBoundingClientRect();
    let row = rows.find(r => Math.abs(r.top - rect.top) < rect.height * 0.5);
    if (!row) { row = { top: rect.top, bottom: rect.bottom, cards: [] }; rows.push(row); }
    row.cards.push({ i, rect });
    row.bottom = Math.max(row.bottom, rect.bottom);
  });
  let targetRow = rows[0];
  let bestDist = Infinity;
  rows.forEach(r => {
    const dist = Math.abs(clientY - (r.top + r.bottom) / 2);
    if (dist < bestDist) { bestDist = dist; targetRow = r; }
  });
  for (const { i, rect } of targetRow.cards) {
    if (clientX < rect.left + rect.width / 2) return i;
  }
  return targetRow.cards[targetRow.cards.length - 1].i + 1;
}

// Comme tlDropInsertIndex, mais retourne l'id de l'image affichée juste après le point de dépôt
// (ou null si en fin de liste) plutôt qu'un index brut — nécessaire pour la zone non placée quand
// l'ordre affiché (alpha/date) diffère de l'ordre réel de tl.unplaced (cf. tlDrop).
// `excludeImgId` exclut la carte de l'image en cours de déplacement (cohérence avec l'aperçu de tlDragOver).
function tlDropInsertBeforeId(zone, clientX, clientY, excludeImgId) {
  const { idx, cards } = _tlComputeDropIndex(zone, excludeImgId, clientX, clientY);
  return idx < cards.length ? cards[idx].dataset.imgId : null;
}

function tlDrop(e, targetZoneId) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  tlClearDropBefore();
  const imgId = tlDragImgId;
  if (!imgId) return;
  const tl = tlActiveTierlist();
  if (!tl) return;

  if (targetZoneId === '__toplace__') {
    _tlSetImageToPlace(tl, imgId);
    return;
  }
  // La carte affichée dans la zone "à placer" (elle n'est ni dans unplaced ni dans un tier
  // local — c'est la carte virtuelle affichée par _tlRenderToPlaceZone) ne peut être déposée
  // que dans un TIER : c'est la seule action qui "résout" la zone pour ce membre précis. La
  // désignation partagée (root.toPlaceImgId) n'est JAMAIS effacée ici — elle reste active pour
  // les autres membres du groupe tant qu'ils n'ont pas eux-mêmes placé l'élément dans un tier ;
  // _tlToPlaceIsEmptyFor recalcule dynamiquement, à chaque rendu, si leur zone doit encore l'afficher.
  const _rootForDrop = _tlGroupRoot(tl);
  const isFromToPlaceZone = _rootForDrop.toPlaceImgId === imgId && !_tlLocateImage(tl, imgId);
  if (isFromToPlaceZone && targetZoneId === '__unplaced__') return;
  if (isFromToPlaceZone) tl.unplaced.push(imgId); // entrée temporaire, retirée juste après par le flux normal

  if (tl.isTemplate && targetZoneId !== '__unplaced__') return;
  const from = _tlLocateImage(tl, imgId);
  if (from) {
    _tlPushUndoOp({ tierlistId: tl.id, type: 'moveImage', imgId, fromZone: from.zone, fromIndex: from.index });
  }

  // Retirer de partout
  tl.unplaced = tl.unplaced.filter(id => id !== imgId);
  tl.tiers.forEach(t => { t.items = t.items.filter(id => id !== imgId); });

  if (targetZoneId === '__unplaced__') {
    // "Tri" est une action ponctuelle qui fige déjà l'ordre manuel (cf. tlUnplacedSortBtn) : la zone
    // affichée reflète donc toujours tl.unplaced, sauf appel externe laissant unplacedSort non-manuel.
    const beforeId = tlDropInsertBeforeId(tlUnplacedZone, e.clientX, e.clientY, imgId);
    if ((tl.unplacedSort || 'manual') !== 'manual') {
      tl.unplaced = _tlGetSortedUnplaced(tl);
      tl.unplacedSort = 'manual';
    }
    let insertIdx = beforeId ? tl.unplaced.indexOf(beforeId) : tl.unplaced.length;
    if (insertIdx === -1) insertIdx = tl.unplaced.length;
    tl.unplaced.splice(insertIdx, 0, imgId);
  } else {
    const tier = tl.tiers.find(t => t.id === targetZoneId);
    if (tier) {
      // Même fonction de calcul que l'aperçu (tlDragOver) — garantit que le résultat final
      // corresponde toujours exactement à la position montrée par le placeholder.
      const imgsDiv = e.currentTarget;
      const { idx: insertIdx } = _tlComputeDropIndex(imgsDiv, imgId, e.clientX, e.clientY);
      if (window.__TL_DND_DEBUG) {
        const preview = window.__TL_DND_LAST_PREVIEW || {};
        const match = preview.idx === insertIdx;
        console.log(
          `[DND] ${match ? 'OK — pareil' : '⚠️ DIFFÉRENT'} — aperçu annonçait la position ${preview.idx}, drop réel a mis à la position ${insertIdx}` +
          ` (dernier survol à x=${preview.x},y=${preview.y} / drop à x=${Math.round(e.clientX)},y=${Math.round(e.clientY)})`
        );
      }
      tier.items.splice(insertIdx, 0, imgId);
      if (_rootForDrop.toPlaceImgId === imgId) {
        _tlMarkToPlaceResolved(tl, imgId);
        _tlClearToPlaceIfAllResolved(tl);
      }
    }
  }

  tlTouchFolderChain(_tlEffectiveFolderId(tl));
  tlSave();
  tlRender();
}

// Survol/sortie de la zone "à placer" : pas de placeholder réordonnable (un seul élément
// possible), juste un simple retour visuel drag-over comme les tiers/non-placés.
function tlToPlaceDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.classList.add('drag-over');
}
function tlToPlaceDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

// Exposer les fonctions de drag globalement (utilisées dans le HTML via attributs)
window.tlDragOver  = tlDragOver;
window.tlDragLeave = tlDragLeave;
window.tlDrop      = tlDrop;
window.tlToPlaceDragOver  = tlToPlaceDragOver;
window.tlToPlaceDragLeave = tlToPlaceDragLeave;

// ── Renommer image ────────────────────────────────────────────────────────────
let tlRenameImgContext = null;

// Retrouve l'image par id dans l'état courant — ne jamais garder de référence directe à l'objet
// image d'un contexte async : un aller-retour Firebase (_dbTierlist.on('value')) reconstruit
// tl.images entre-temps et rend toute référence capturée obsolète.
function _tlFindImgById(tlId, imgId) {
  const tl = tlState.tierlists.find(t => t.id === tlId);
  if (!tl) return null;
  const images = _tlGetGroupImages(tl);
  return images.find(i => i.id === imgId) || null;
}

function tlOpenRenameImg(tl, img) {
  tlRenameImgContext = { tlId: tl.id, imgId: img.id, isNew: false };
  tlModalImgNameInput.value = img.name;
  tlModalImgName.classList.remove('hidden');
  setTimeout(() => { tlModalImgNameInput.focus(); tlModalImgNameInput.select(); }, 50);
}

// Ouvre la modal de nom pour une image tout juste collée (isNew: true → champ vide, placeholder =
// nom auto ; afterConfirm sert à enchaîner sur l'image collée suivante s'il y en a plusieurs).
function tlOpenNameNewImg(tl, img, afterConfirm) {
  tlRenameImgContext = { tlId: tl.id, imgId: img.id, isNew: true, afterConfirm };
  tlModalImgNameInput.value = '';
  tlModalImgNameInput.placeholder = img.name;
  tlModalImgName.classList.remove('hidden');
  setTimeout(() => { tlModalImgNameInput.focus(); }, 50);
}

function tlConfirmRenameImg() {
  if (!tlRenameImgContext) return;
  const { tlId, imgId, isNew, afterConfirm } = tlRenameImgContext;
  const img = _tlFindImgById(tlId, imgId);
  const newName = tlModalImgNameInput.value.trim();
  if (img) {
    if (isNew) {
      if (newName) img.name = newName;
    } else if (newName && newName !== img.name) {
      const tl = tlState.tierlists.find(t => t.id === tlId);
      _tlPushUndoOp({ tierlistId: tlId, groupRootId: _tlGroupRoot(tl).id, type: 'renameImage', imgId: img.id, oldName: img.name });
      img.name = newName;
      img.updatedAt = Date.now();
    }
  }
  tlModalImgName.classList.add('hidden');
  tlModalImgNameInput.placeholder = "Nom de l'image...";
  tlRenameImgContext = null;
  tlSave();
  tlRender();
  if (isNew && afterConfirm) afterConfirm();
}

// Dessine une image dans un carré size×size en respectant son ratio (comme object-fit:contain
// sur .tl-img-card img à l'écran), fond surface pour les bandes vides plutôt que d'étirer/déformer.
function _tlDrawImageContain(ctx, img, x, y, size) {
  ctx.fillStyle = '#2a2a32';
  ctx.fillRect(x, y, size, size);
  const ratio = Math.min(size / img.width, size / img.height);
  const w = img.width * ratio;
  const h = img.height * ratio;
  ctx.drawImage(img, x + (size - w) / 2, y + (size - h) / 2, w, h);
}

// Découpe un texte en lignes tenant dans maxWidth (mot par mot, coupe un mot trop long au caractère
// près) — reproduit le word-break:break-word de .tl-tier-label-text, qui wrappe au lieu de déborder.
function _tlWrapText(ctx, text, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  const pushWord = (word) => {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width <= maxWidth || !line) {
      line = test;
    } else {
      lines.push(line);
      line = word;
    }
  };
  words.forEach(word => {
    if (ctx.measureText(word).width <= maxWidth) { pushWord(word); return; }
    // Mot seul plus large que maxWidth : le couper caractère par caractère
    if (line) { lines.push(line); line = ''; }
    let chunk = '';
    for (const ch of word) {
      const test = chunk + ch;
      if (ctx.measureText(test).width > maxWidth && chunk) { lines.push(chunk); chunk = ch; }
      else chunk = test;
    }
    line = chunk;
  });
  if (line) lines.push(line);
  return lines;
}

// Dessine tier.label centré dans labelW, multi-ligne (comme .tl-tier-label-text à l'écran :
// word-break: break-word, max-width 128px, line-height 1.1) ; réduit la police en dernier recours
// seulement si le label ne tient vraiment pas dans tierH (tier très bas + label très long).
function _tlDrawTierLabel(ctx, label, x, y, labelW, tierH, baseFontSize) {
  const maxTextWidth = labelW - 12;
  let fontSize = baseFontSize;
  let lines;
  do {
    ctx.font = `bold ${fontSize}px Arial`;
    lines = _tlWrapText(ctx, label, maxTextWidth);
    if (lines.length * fontSize * 1.1 <= tierH - 8 || fontSize <= 10) break;
    fontSize -= 2;
  } while (true);
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lineHeight = fontSize * 1.1;
  const startY = y + tierH / 2 - (lines.length - 1) * lineHeight / 2;
  lines.forEach((l, i) => ctx.fillText(l, x + labelW / 2, startY + i * lineHeight, maxTextWidth));
}

// ── Canvas partagé Export/Capture ────────────────────────────────────────────
async function _tlBuildCanvas(tl) {
  // Même taille que celle affichée à l'écran : la préférence locale (slider "Taille") prévaut sur
  // tl.imgSize, comme dans tlRender()/tlRenderTiers()/tlRenderUnplaced() — sinon l'export ne
  // correspond plus à ce que l'utilisateur voit s'il n'a pas sauvegardé cette taille sur la tierlist.
  const imgSize = _tlLocalImgSize !== null ? _tlLocalImgSize : _tlClampImgSize(tl.imgSize);
  const showLabels = _tlLocalShowLabels !== null ? _tlLocalShowLabels : !!tl.showLabels;
  const labelW = 140;
  const padding = 6;
  const rowGap = 4;
  const imgGap = 4;
  // .tl-tier-label-cell a une taille fixe (1.1rem = 17.6px), indépendante de la taille des images
  // (contrairement à ce que labelFontSize proportionnel à imgSize laissait croire à l'écran).
  const labelFontSize = 17.6;
  // Largeur réelle affichée à l'écran (fluide, dépend de la fenêtre) plutôt qu'une valeur fixe,
  // sinon la capture/export ne correspond plus à ce que l'utilisateur voit sur un écran large.
  const totalWidth = Math.round(tlTiersZone?.getBoundingClientRect().width) || 860;

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
  // Titre = chemin complet (dossiers | template | nom), pas seulement le nom de la tierlist.
  ctx.fillText(_tlFullTitlePath(tl), 12, 26, totalWidth - 24);

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
    _tlDrawTierLabel(ctx, tier.label, 0, y, labelW, tierH, labelFontSize);
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
        if (imgEl) _tlDrawImageContain(ctx, imgEl, x, rowY, imgSize);
      }
      if (showLabels && (imgData.type || 'image') !== 'text') {
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

// ── Export des images d'un template (téléchargement individuel de chaque image) ──
function tlExportImages() {
  const tl = tlActiveTierlist();
  if (!tl || !tl.isTemplate) return;
  const images = (tl.images || []).filter(img => (img.type || 'image') !== 'text' && img.src);
  if (images.length === 0) { alert('Aucune image à exporter.'); return; }
  const zip = new JSZip();
  const usedNames = new Set();
  images.forEach((img, i) => {
    let base = (img.name || `image_${i + 1}`).replace(/[^a-z0-9_-]/gi, '_') || `image_${i + 1}`;
    let name = base;
    let n = 2;
    while (usedNames.has(name)) { name = `${base}_${n++}`; }
    usedNames.add(name);
    const base64 = img.src.split(',')[1] || '';
    zip.file(name + '.jpg', base64, { base64: true });
  });
  zip.generateAsync({ type: 'blob' }).then(blob => {
    const link = document.createElement('a');
    link.download = (tl.name || 'images').replace(/[^a-z0-9]/gi, '_') + '.zip';
    link.href = URL.createObjectURL(blob);
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
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
      const tlsInFolder = tlState.tierlists.filter(t => _tlEffectiveFolderId(t) === folder.id);
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
  const orphanArchivedTL = archivedTL.filter(t => !_tlEffectiveFolderId(t) || !(tlState.folders || []).find(f => f.id === _tlEffectiveFolderId(t) && f.archived));
  if (orphanArchivedTL.length > 0) {
    const sep = document.createElement('p');
    sep.style.cssText = 'font-size:0.72rem;font-weight:700;color:var(--text-faint);text-transform:uppercase;letter-spacing:0.08em;margin:' + (archivedFolders.length > 0 ? '10px 0 6px' : '0 0 6px') + ';';
    sep.innerHTML = '<i data-lucide="square-mouse-pointer"></i> Listes archivées';
    tlArchivedList.appendChild(sep);

    // Grouper par dossier actif
    const byFolder = {};
    orphanArchivedTL.forEach(tl => {
      const key = _tlEffectiveFolderId(tl) || '__root__';
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
      arrowBtn.title = 'Voir les listes';
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
// "Nouveau Template" depuis l'accueil : fait apparaître la section génération dans ce même
// modal (fusion avec "Générer depuis ce template") — voir tlOpenNewTemplateModal / tlConfirmNewModal.
let _homeGenerateAfterTemplate = false;

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

// Reconstruit une arborescence `.folders` imbriquée à partir de la liste plate tlState.folders
// (modèle `parentId`), pour réutiliser _setupFolderTreeDropdown (qui attend ce format, comme
// state.folders côté Bingo).
function _tlBuildFolderTree(excludeId) {
  const activeFolders = (tlState.folders || []).filter(f => !f.archived);
  const excluded = excludeId ? new Set([excludeId, ..._tlGetDescendantIds(excludeId)]) : new Set();
  function build(parentId) {
    return activeFolders.filter(f => (f.parentId || null) === parentId && !excluded.has(f.id))
      .map(f => ({ id: f.id, name: f.name, archived: f.archived, folders: build(f.id) }));
  }
  return build(null);
}

// ── Modal "Gérer les tiers" (presets + import + sauvegarde) ─────────────────
let _tlTiersSourceTargetId = null;

function tlOpenTiersSourceModal(id) {
  const tl = tlState.tierlists.find(t => t.id === id);
  if (!tl) return;
  _tlTiersSourceTargetId = id;

  const presetList = document.getElementById('tl-tiers-source-preset-list');
  const saveInput = document.getElementById('tl-tiers-source-save-input');

  presetList.innerHTML = '';
  const presets = tlState.tierPresets || [];
  if (presets.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'font-size:0.8rem;color:var(--text-muted);';
    empty.textContent = 'Aucun preset.';
    presetList.appendChild(empty);
  } else {
    presets.forEach(p => {
      const row = document.createElement('div');
      row.className = 'modal-item-row';

      const btn = document.createElement('button');
      btn.className = 'btn-action btn-secondary tl-preset-row-btn';
      btn.style.flex = '1';
      btn.title = p.name + ' : ' + p.tiers.map(t => t.label).join(', ');
      const nameSpan = document.createElement('span');
      nameSpan.className = 'tl-preset-row-name';
      nameSpan.textContent = p.name;
      btn.appendChild(nameSpan);
      const dotsWrap = document.createElement('span');
      dotsWrap.className = 'tl-preset-row-dots';
      p.tiers.forEach(t => {
        const dot = document.createElement('span');
        dot.className = 'tl-preset-dot';
        dot.style.background = t.color;
        dotsWrap.appendChild(dot);
      });
      btn.appendChild(dotsWrap);
      btn.addEventListener('click', () => {
        if (tlApplyPreset(tl, p.id) !== false) tlModalTiersSource.classList.add('hidden');
      });
      row.appendChild(btn);

      const editBtn = document.createElement('button');
      editBtn.className = 'btn-action btn-secondary';
      editBtn.title = 'Modifier ce preset';
      editBtn.innerHTML = '<i data-lucide="pencil"></i>';
      editBtn.addEventListener('click', () => tlOpenPresetEditModal(p.id, id));
      row.appendChild(editBtn);

      const del = document.createElement('button');
      del.className = 'btn-action btn-secondary';
      del.title = 'Supprimer ce preset';
      del.innerHTML = '<i data-lucide="trash-2"></i>';
      del.addEventListener('click', () => {
        if (confirm(`Supprimer le preset "${p.name}" ?`)) { tlDeletePreset(p.id); tlOpenTiersSourceModal(id); }
      });
      row.appendChild(del);

      presetList.appendChild(row);
    });
  }

  saveInput.value = '';
  document.getElementById('tl-tiers-source-save-btn').onclick = () => {
    if (!saveInput.value.trim()) return;
    tlSaveCurrentAsPreset(tl, saveInput.value);
    tlOpenTiersSourceModal(id);
  };

  document.getElementById('tl-tiers-source-new-preset-btn').onclick = () => tlOpenPresetEditModal(null, id);
  document.getElementById('tl-tiers-source-import-btn').onclick = () => tlOpenImportTiersModal(id);

  if (window.lucide) lucide.createIcons();
  tlModalTiersSource.classList.remove('hidden');
}

// ── Modal "Importer tiers" — choix de la tier list source via un simple <select> ─────────────
// Même pattern que le select de dossier parent (tlPopulateFolderSelect) : une liste plate
// indentée par profondeur de dossier, pas une arborescence interactive.
function _tlPopulateImportTiersSelect(selectEl, excludeId) {
  selectEl.innerHTML = '<option value="">— Choisir —</option>';
  const byFolder = (parentId, depth) => {
    (tlState.folders || []).filter(f => !f.archived && (f.parentId || null) === (parentId || null)).forEach(f => {
      const folderTierlists = tlState.tierlists.filter(t => !t.archived && t.folderId === f.id && !_tlHasLiveTemplate(t) && t.id !== excludeId);
      if (folderTierlists.length > 0) {
        const group = document.createElement('optgroup');
        group.label = ' '.repeat(depth * 3) + '📁 ' + f.name;
        folderTierlists.forEach(t => {
          const opt = document.createElement('option');
          opt.value = t.id;
          opt.textContent = (t.isTemplate ? '📋 ' : '') + t.name;
          group.appendChild(opt);
        });
        selectEl.appendChild(group);
      }
      byFolder(f.id, depth + 1);
    });
  };
  byFolder(null, 0);
  const toplevel = tlState.tierlists.filter(t => !t.archived && !t.folderId && !_tlHasLiveTemplate(t) && t.id !== excludeId);
  toplevel.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = (t.isTemplate ? '📋 ' : '') + t.name;
    selectEl.appendChild(opt);
  });
}

let _tlImportTiersTargetId = null; // id d'une tierlist existante (mode "Gérer les tiers")
let _tlImportTiersOnPick = null;   // callback(sourceId) — mode "création" (pas de tierlist encore créée)

// `targetId` : id d'une tierlist déjà créée dont on remplace directement les tiers (comportement
// existant, appelé depuis le hub "Gérer les tiers"). `onPick` : callback alternatif utilisé quand
// aucune tierlist n'existe encore (ex: modal de création d'un nouveau template) — reçoit l'id de
// la tierlist source choisie, à appliquer soi-même après création.
function tlOpenImportTiersModal(targetId, onPick) {
  _tlImportTiersTargetId = targetId || null;
  _tlImportTiersOnPick = onPick || null;
  _tlPopulateImportTiersSelect(document.getElementById('tl-modal-import-tiers-select'), targetId || null);
  tlModalTiersSource.classList.add('hidden');
  document.getElementById('tl-modal-import-tiers').classList.remove('hidden');
}

document.getElementById('tl-modal-import-tiers-confirm').addEventListener('click', () => {
  const sourceId = document.getElementById('tl-modal-import-tiers-select').value;
  if (!sourceId) return;
  if (_tlImportTiersOnPick) {
    _tlImportTiersOnPick(sourceId);
    document.getElementById('tl-modal-import-tiers').classList.add('hidden');
    return;
  }
  if (!_tlImportTiersTargetId) return;
  const tl = tlState.tierlists.find(t => t.id === _tlImportTiersTargetId);
  if (!tl) return;
  if (tlImportTiersFrom(tl, sourceId) !== false) {
    document.getElementById('tl-modal-import-tiers').classList.add('hidden');
  }
});
const _tlCloseImportTiersModal = () => {
  document.getElementById('tl-modal-import-tiers').classList.add('hidden');
  if (_tlImportTiersOnPick) {
    _tlImportTiersOnPick = null;
    tlModalNew.classList.remove('hidden');
  } else if (_tlImportTiersTargetId) {
    tlOpenTiersSourceModal(_tlImportTiersTargetId);
  }
};
document.getElementById('tl-modal-import-tiers-cancel').addEventListener('click', _tlCloseImportTiersModal);
document.getElementById('tl-modal-import-tiers-close').addEventListener('click', _tlCloseImportTiersModal);

// ── Modal édition d'un preset (nom + tiers) ──────────────────────────────────
let _tlPresetEditId = null; // null = nouveau preset
let _tlPresetEditTiers = []; // [{label, color}] — copie de travail
let _tlPresetEditReturnToId = null; // id de la tierlist qui a ouvert le hub, pour y revenir

function tlOpenPresetEditModal(presetId, returnToId) {
  _tlPresetEditId = presetId;
  _tlPresetEditReturnToId = returnToId;
  const preset = presetId ? (tlState.tierPresets || []).find(p => p.id === presetId) : null;
  document.getElementById('tl-modal-preset-edit-name').value = preset ? preset.name : '';
  _tlPresetEditTiers = preset ? preset.tiers.map(t => ({ ...t })) : [];
  _tlRenderPresetEditTiers();
  tlModalTiersSource.classList.add('hidden');
  document.getElementById('tl-modal-preset-edit').classList.remove('hidden');
}

// Ferme tout popover de couleur ouvert (appelé avant d'en ouvrir un autre, ou au clic ailleurs)
function _tlClosePresetColorPopover() {
  const existing = document.querySelector('.tl-preset-color-popover');
  if (existing) existing.remove();
}

function _tlOpenPresetColorPopover(dotEl, tier) {
  _tlClosePresetColorPopover();
  const popover = document.createElement('div');
  popover.className = 'tl-preset-color-popover';
  popover.addEventListener('click', e => e.stopPropagation());

  const swatchesRow = document.createElement('div');
  swatchesRow.className = 'tl-preset-color-popover-swatches';
  TL_PRESET_COLORS.forEach(color => {
    const sw = document.createElement('button');
    sw.type = 'button';
    sw.className = 'tl-swatch';
    sw.style.background = color;
    if (color === tier.color) sw.classList.add('selected');
    sw.addEventListener('click', () => {
      tier.color = color;
      _tlClosePresetColorPopover();
      _tlRenderPresetEditTiers();
    });
    swatchesRow.appendChild(sw);
  });
  popover.appendChild(swatchesRow);

  const customLabel = document.createElement('label');
  customLabel.className = 'tl-color-custom-label';
  customLabel.title = 'Couleur personnalisée';
  const customText = document.createElement('span');
  customText.textContent = 'Autre';
  const customInput = document.createElement('input');
  customInput.type = 'color';
  customInput.className = 'tl-color-input-sm';
  customInput.value = tier.color;
  customInput.addEventListener('input', () => {
    tier.color = customInput.value;
    dotEl.style.background = customInput.value;
  });
  customInput.addEventListener('change', () => {
    _tlClosePresetColorPopover();
    _tlRenderPresetEditTiers();
  });
  customLabel.appendChild(customText);
  customLabel.appendChild(customInput);
  popover.appendChild(customLabel);

  // position:fixed calculé en JS plutôt que absolute : la liste de tiers a overflow-y:auto et
  // couperait visuellement tout popover positionné relativement à elle.
  document.body.appendChild(popover);
  const dotRect = dotEl.getBoundingClientRect();
  popover.style.position = 'fixed';
  popover.style.top = (dotRect.bottom + 6) + 'px';
  popover.style.left = dotRect.left + 'px';

  setTimeout(() => document.addEventListener('click', _tlClosePresetColorPopover, { once: true }), 0);
}

function _tlRenderPresetEditTiers() {
  const wrap = document.getElementById('tl-modal-preset-edit-tiers');
  wrap.innerHTML = '';
  _tlPresetEditTiers.forEach((tier, idx) => {
    const row = document.createElement('div');
    row.className = 'modal-item-row tl-preset-edit-row';
    row.draggable = true;
    row.dataset.idx = idx;

    const dragHandle = document.createElement('span');
    dragHandle.className = 'tl-folder-drag-handle';
    dragHandle.innerHTML = '<i data-lucide="grip"></i>';
    row.appendChild(dragHandle);

    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'tl-preset-dot tl-preset-dot-btn';
    dot.style.background = tier.color;
    dot.style.position = 'relative';
    dot.title = 'Changer la couleur';
    dot.addEventListener('click', e => {
      e.stopPropagation();
      _tlOpenPresetColorPopover(dot, tier);
    });
    row.appendChild(dot);

    const label = document.createElement('span');
    label.className = 'tl-preset-row-name';
    label.style.flex = '1';
    label.style.cursor = 'text';
    label.textContent = tier.label;
    label.title = 'Cliquer pour renommer';
    label.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'modal-text-input';
      input.value = tier.label;
      input.style.flex = '1';
      label.replaceWith(input);
      input.focus();
      input.select();
      const commit = () => {
        const val = input.value.trim();
        if (val) tier.label = val;
        _tlRenderPresetEditTiers();
      };
      input.addEventListener('blur', commit);
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
        if (e.key === 'Escape') { input.removeEventListener('blur', commit); _tlRenderPresetEditTiers(); }
      });
    });
    row.appendChild(label);

    const del = document.createElement('button');
    del.className = 'btn-action btn-secondary';
    del.title = 'Supprimer ce tier';
    del.innerHTML = '<i data-lucide="x"></i>';
    del.addEventListener('click', () => {
      _tlPresetEditTiers.splice(idx, 1);
      _tlRenderPresetEditTiers();
    });
    row.appendChild(del);

    // Réordonnement par drag & drop, directement dans la copie de travail _tlPresetEditTiers
    row.addEventListener('dragstart', e => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(idx));
      row.classList.add('dragging');
    });
    row.addEventListener('dragend', () => row.classList.remove('dragging'));
    row.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });
    row.addEventListener('drop', e => {
      e.preventDefault();
      const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
      const toIdx = idx;
      if (fromIdx === toIdx || isNaN(fromIdx)) return;
      const [moved] = _tlPresetEditTiers.splice(fromIdx, 1);
      _tlPresetEditTiers.splice(toIdx, 0, moved);
      _tlRenderPresetEditTiers();
    });

    wrap.appendChild(row);
  });
  if (window.lucide) lucide.createIcons();
}

document.getElementById('tl-modal-preset-edit-add-tier').addEventListener('click', () => {
  _tlPresetEditTiers.push({ label: '?', color: TL_PRESET_COLORS[0] });
  _tlRenderPresetEditTiers();
});

document.getElementById('tl-modal-preset-edit-confirm').addEventListener('click', () => {
  const name = document.getElementById('tl-modal-preset-edit-name').value.trim();
  if (!name || _tlPresetEditTiers.length === 0) return;
  if (!Array.isArray(tlState.tierPresets)) tlState.tierPresets = [];
  if (_tlPresetEditId) {
    const preset = tlState.tierPresets.find(p => p.id === _tlPresetEditId);
    if (preset) { preset.name = name; preset.tiers = _tlPresetEditTiers.map(t => ({ ...t })); }
  } else {
    tlState.tierPresets.push({ id: uid(), name, tiers: _tlPresetEditTiers.map(t => ({ ...t })) });
  }
  tlSave();
  document.getElementById('tl-modal-preset-edit').classList.add('hidden');
  if (_tlPresetEditReturnToId) tlOpenTiersSourceModal(_tlPresetEditReturnToId);
});

const _tlClosePresetEditModal = () => {
  document.getElementById('tl-modal-preset-edit').classList.add('hidden');
  if (_tlPresetEditReturnToId) tlOpenTiersSourceModal(_tlPresetEditReturnToId);
};
document.getElementById('tl-modal-preset-edit-cancel').addEventListener('click', _tlClosePresetEditModal);
document.getElementById('tl-modal-preset-edit-close').addEventListener('click', _tlClosePresetEditModal);

function tlPopulatePresetSelect(selectEl) {
  selectEl.innerHTML = '';
  tlGetAllPresets().forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    selectEl.appendChild(opt);
  });
  // Le <select> natif reste cette source de vérité (lu via .value ailleurs), mais un dropdown
  // custom par-dessus affiche le nom + les pastilles de couleur du preset — impossible avec un
  // <select> natif seul.
  _tlSyncPresetDropdown(selectEl);
}

function _tlBuildPresetDotsRow(preset) {
  const row = document.createElement('span');
  row.className = 'tl-preset-row-dots';
  preset.tiers.forEach(t => {
    const dot = document.createElement('span');
    dot.className = 'tl-preset-dot';
    dot.style.background = t.color;
    row.appendChild(dot);
  });
  return row;
}

function _tlSyncPresetDropdown(selectEl) {
  const wrap = selectEl.parentElement.querySelector('.tl-preset-dropdown');
  if (!wrap) return;
  const btn = wrap.querySelector('.tl-preset-dropdown-btn');
  const list = wrap.querySelector('.tl-preset-dropdown-list');
  const presets = tlGetAllPresets();

  const renderBtn = () => {
    btn.innerHTML = '';
    const preset = presets.find(p => p.id === selectEl.value) || presets[0];
    if (!preset) { btn.textContent = '— Aucun preset —'; return; }
    const nameSpan = document.createElement('span');
    nameSpan.className = 'tl-preset-row-name';
    nameSpan.textContent = preset.name;
    btn.appendChild(nameSpan);
    btn.appendChild(_tlBuildPresetDotsRow(preset));
  };

  list.innerHTML = '';
  presets.forEach(p => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'tl-preset-dropdown-item';
    const nameSpan = document.createElement('span');
    nameSpan.className = 'tl-preset-row-name';
    nameSpan.textContent = p.name;
    item.appendChild(nameSpan);
    item.appendChild(_tlBuildPresetDotsRow(p));
    item.addEventListener('click', () => {
      selectEl.value = p.id;
      renderBtn();
      list.classList.add('hidden');
    });
    list.appendChild(item);
  });

  if (presets.length > 0 && !presets.some(p => p.id === selectEl.value)) selectEl.value = presets[0].id;
  renderBtn();

  btn.onclick = () => list.classList.toggle('hidden');
}
document.addEventListener('click', e => {
  document.querySelectorAll('.tl-preset-dropdown-list:not(.hidden)').forEach(list => {
    if (!list.parentElement.contains(e.target)) list.classList.add('hidden');
  });
});

// Preset/import choisis dans le modal de création — id d'un preset OU id d'une tierlist source à
// importer (mutuellement exclusifs : importer écrase le choix de preset et inversement).
let _tlNewModalImportSourceId = null;

function _tlSetupNewModalImportBtn() {
  const btn = document.getElementById('tl-modal-new-import-tiers-btn');
  if (!btn) return;
  btn.textContent = _tlNewModalImportSourceId
    ? 'Importer tiers : ' + (tlState.tierlists.find(t => t.id === _tlNewModalImportSourceId)?.name || '?')
    : 'Importer tiers';
  btn.onclick = () => {
    tlOpenImportTiersModal(null, sourceId => {
      _tlNewModalImportSourceId = sourceId;
      _tlSetupNewModalImportBtn();
    });
  };
}

function tlOpenNewModal(presetFolderId) {
  tlModalNewMode = 'create';
  tlModalNewTargetId = null;
  _tlNewModalImportSourceId = null;
  tlModalNewTitle.textContent = 'Nouvelle liste';
  tlModalNewInput.value = '';
  tlModalNewInput.placeholder = 'Nom de la liste...';
  // Afficher/cacher le select dossier selon le mode
  const wrap = document.getElementById('tl-modal-new-folder-wrap');
  if (wrap) {
    wrap.style.display = '';
    tlPopulateFolderSelect(tlModalNewFolderSelect, presetFolderId || '');
    const dropdownBtn = document.getElementById('tl-modal-new-folder-dropdown-btn');
    if (dropdownBtn) _setupFolderTreeDropdown(tlModalNewFolderSelect, dropdownBtn, _tlBuildFolderTree(), '— Aucun dossier —', 'fp_tlnewmodal_collapsed');
  }
  const presetWrap = document.getElementById('tl-modal-new-preset-wrap');
  if (presetWrap) {
    presetWrap.style.display = '';
    tlPopulatePresetSelect(document.getElementById('tl-modal-new-preset-select'));
    _tlSetupNewModalImportBtn();
  }
  tlModalNew.classList.remove('hidden');
  setTimeout(() => { tlModalNewInput.focus(); }, 50);
}

function tlOpenNewTemplateModal(presetFolderId, fromHome = false) {
  tlModalNewMode = 'create-template';
  tlModalNewTargetId = null;
  _tlNewModalImportSourceId = null;
  _homeGenerateAfterTemplate = fromHome;
  tlModalNewTitle.textContent = 'Nouveau template';
  tlModalNewInput.value = '';
  tlModalNewInput.placeholder = 'Nom du template...';
  const wrap = document.getElementById('tl-modal-new-folder-wrap');
  if (wrap) {
    wrap.style.display = '';
    tlPopulateFolderSelect(tlModalNewFolderSelect, presetFolderId || '');
    const dropdownBtn = document.getElementById('tl-modal-new-folder-dropdown-btn');
    if (dropdownBtn) _setupFolderTreeDropdown(tlModalNewFolderSelect, dropdownBtn, _tlBuildFolderTree(), '— Aucun dossier —', 'fp_tlnewmodal_collapsed');
  }
  const presetWrap = document.getElementById('tl-modal-new-preset-wrap');
  if (presetWrap) {
    presetWrap.style.display = '';
    tlPopulatePresetSelect(document.getElementById('tl-modal-new-preset-select'));
    _tlSetupNewModalImportBtn();
  }
  // Section génération (fusion avec le modal "Générer depuis ce template") : visible uniquement
  // pour "Nouveau Template" depuis l'accueil (_homeGenerateAfterTemplate).
  const generateWrap = document.getElementById('tl-modal-new-generate-wrap');
  if (generateWrap) {
    generateWrap.classList.toggle('hidden', !fromHome);
    if (fromHome) {
      const nameInput = document.getElementById('tl-modal-new-generate-name-input');
      if (nameInput) nameInput.value = '';
      generateWrap.querySelectorAll('.grid-name-preset-check input').forEach(cb => { cb.checked = false; });
    }
  }
  tlModalNew.classList.remove('hidden');
  setTimeout(() => { tlModalNewInput.focus(); }, 50);
}

function tlOpenRenameModal(id) {
  const tl = tlState.tierlists.find(t => t.id === id);
  if (!tl) return;
  tlModalNewMode = 'rename';
  tlModalNewTargetId = id;
  tlModalNewTitle.textContent = 'Renommer la liste';
  tlModalNewInput.value = tl.name;
  tlModalNewInput.placeholder = 'Nom de la liste...';
  // Cacher le select dossier et le select preset en mode rename
  const wrap = document.getElementById('tl-modal-new-folder-wrap');
  if (wrap) wrap.style.display = 'none';
  const presetWrap = document.getElementById('tl-modal-new-preset-wrap');
  if (presetWrap) presetWrap.style.display = 'none';
  tlModalNew.classList.remove('hidden');
  setTimeout(() => { tlModalNewInput.focus(); tlModalNewInput.select(); }, 50);
}

function tlConfirmNewModal() {
  const val = tlModalNewInput.value.trim();
  if (!val) return;
  // "Nouveau Template" depuis l'accueil : lire la section génération fusionnée AVANT de fermer
  // le modal (mêmes champs que l'ex-modal "Générer depuis ce template").
  const generateAfter = tlModalNewMode === 'create-template' && _homeGenerateAfterTemplate;
  let generateNames = [];
  if (generateAfter) {
    const checked = [...document.querySelectorAll('#tl-modal-new-generate-wrap .grid-name-preset-check input:checked')].map(cb => cb.value);
    const nameInput = document.getElementById('tl-modal-new-generate-name-input');
    generateNames = checked.length > 0 ? checked : [(nameInput?.value.trim()) || 'Liste 1'];
  }
  tlModalNew.classList.add('hidden');
  if (tlModalNewMode === 'create' || tlModalNewMode === 'create-template') {
    const folderId = tlModalNewFolderSelect ? tlModalNewFolderSelect.value || null : null;
    const isTemplate = tlModalNewMode === 'create-template';
    let created;
    if (_tlNewModalImportSourceId) {
      // "Importer tiers" prime sur le choix de preset : créer sans preset, puis remplacer les
      // tiers par ceux de la tierlist source choisie (même comportement que dans le hub
      // "Gérer les tiers" — tlImportTiersFrom / _tlReplaceTiers).
      created = tlCreate(val, folderId, isTemplate, null);
      // Re-résoudre depuis tlState : tlSave() dans tlCreate() peut avoir déclenché une
      // resynchronisation qui remplace les objets tierlists par de nouvelles instances.
      const createdFresh = tlState.tierlists.find(t => t.id === created.id) || created;
      tlImportTiersFrom(createdFresh, _tlNewModalImportSourceId);
    } else {
      const presetSelect = document.getElementById('tl-modal-new-preset-select');
      created = tlCreate(val, folderId, isTemplate, presetSelect ? presetSelect.value || null : null);
    }
    _tlNewModalImportSourceId = null;
    if (generateAfter && created) {
      _homeGenerateAfterTemplate = false;
      let lastGenerated = null;
      generateNames.forEach(gname => { lastGenerated = _tlCreateFromTemplate(created.id, gname); });
      tlSave();
      // Rejoindre directement la liste générée (comme "Rejoindre Template").
      if (lastGenerated) {
        _tlLocalActiveTierlistId = lastGenerated.id;
        _tlLocalNoSelection = false;
        saveUserPrefs({ tlActiveTierlistId: lastGenerated.id, tlNoSelection: false });
      }
      window._switchPage('tierlist');
      tlRender();
    }
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
    const { tl, tier } = tlTierModalCtx;
    _tlPushUndoOp({ tierlistId: tl.id, type: 'editTier', tierId: tier.id, oldLabel: tier.label, oldColor: tier.color });
    tier.color = color;
    tlSave();
    tlRender();
    tlTierModalCtx = null;
    return;
  }
  const label = tlModalTierLabel.value.trim();
  if (!label) return;
  if (tlTierModalCtx && tlTierModalCtx.mode === 'edit') {
    const { tl, tier } = tlTierModalCtx;
    _tlPushUndoOp({ tierlistId: tl.id, type: 'editTier', tierId: tier.id, oldLabel: tier.label, oldColor: tier.color });
    tier.label = label;
    tier.color = color;
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
  const { addItem, addSep } = _tlMakeCtxMenu(anchorEl, null, { title: folder.name });
  addItem('folder-open', 'Ouvrir', false, () => { _tlGoToFolder(id); _switchPage('tierlist'); });
  addItem('pencil', 'Renommer', false, () => tlOpenFolderModal('edit', id));
  addItem('copy-plus', 'Dupliquer', false, () => tlOpenFolderModal('duplicate', id));
  addItem('move', 'Déplacer dans un dossier', false, () => tlOpenMoveFolderModal(id));
  addItem('scroll', 'Ajouter un template', false, () => tlOpenNewTemplateModal(id));
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

function tlOpenFolderModal(mode = 'create', id = null, currentName = '', presetParentId = null) {
  _tlFolderModalMode = mode;
  _tlFolderModalTargetId = id;
  const numberingCheckWrap = document.getElementById('tl-modal-folder-numbering-check-wrap');
  const numberingWrap = document.getElementById('tl-modal-folder-numbering-wrap');
  const seasonCb = document.getElementById('tl-modal-folder-numbering-season');
  const episodeCb = document.getElementById('tl-modal-folder-numbering-episode');
  const numberingNumber = document.getElementById('tl-modal-folder-numbering-number');
  const prefixEl = document.getElementById('tl-modal-folder-name-prefix');
  if (mode === 'rename') {
    tlModalFolderTitle.textContent = 'Renommer le dossier';
    tlModalFolderConfirm.textContent = 'Renommer';
    tlModalFolderInput.value = currentName;
    tlModalFolderInput.placeholder = 'Nom...';
    if (tlModalFolderParentWrap) tlModalFolderParentWrap.style.display = 'none';
    if (numberingCheckWrap) numberingCheckWrap.style.display = 'none';
    if (numberingWrap) numberingWrap.classList.add('hidden');
  } else if (mode === 'edit') {
    const folder = (tlState.folders || []).find(f => f.id === id);
    if (!folder) return;
    tlModalFolderTitle.textContent = 'Renommer le dossier';
    tlModalFolderConfirm.textContent = 'Renommer';
    tlModalFolderInput.placeholder = 'Nom (optionnel)...';
    if (tlModalFolderParentWrap) tlModalFolderParentWrap.style.display = 'none';
    if (numberingCheckWrap) numberingCheckWrap.style.display = '';
    if (folder.numbering) {
      if (seasonCb) seasonCb.checked = folder.numbering.type === 'season';
      if (episodeCb) episodeCb.checked = folder.numbering.type === 'episode';
      if (numberingWrap) numberingWrap.classList.remove('hidden');
      if (numberingNumber) numberingNumber.value = folder.numbering.number;
      tlModalFolderInput.value = folder.numbering.subtitle || '';
    } else {
      if (seasonCb) seasonCb.checked = false;
      if (episodeCb) episodeCb.checked = false;
      if (numberingWrap) numberingWrap.classList.add('hidden');
      if (numberingNumber) numberingNumber.value = '';
      tlModalFolderInput.value = folder.name;
    }
  } else if (mode === 'duplicate') {
    const folder = (tlState.folders || []).find(f => f.id === id);
    if (!folder) return;
    tlModalFolderTitle.textContent = 'Dupliquer le dossier';
    tlModalFolderConfirm.textContent = 'Dupliquer';
    tlModalFolderInput.placeholder = 'Nom (optionnel)...';
    if (tlModalFolderParentWrap) tlModalFolderParentWrap.style.display = 'none';
    if (numberingCheckWrap) numberingCheckWrap.style.display = '';
    if (folder.numbering) {
      const siblings = (tlState.folders || []).filter(f => !f.archived && (f.parentId || null) === (folder.parentId || null));
      if (seasonCb) seasonCb.checked = folder.numbering.type === 'season';
      if (episodeCb) episodeCb.checked = folder.numbering.type === 'episode';
      if (numberingWrap) numberingWrap.classList.remove('hidden');
      if (numberingNumber) numberingNumber.value = _nextFolderNumber(siblings, folder.numbering.type);
      tlModalFolderInput.value = folder.numbering.subtitle || '';
    } else {
      if (seasonCb) seasonCb.checked = false;
      if (episodeCb) episodeCb.checked = false;
      if (numberingWrap) numberingWrap.classList.add('hidden');
      if (numberingNumber) numberingNumber.value = '';
      tlModalFolderInput.value = '';
    }
  } else {
    tlModalFolderTitle.textContent = 'Nouveau dossier';
    tlModalFolderConfirm.textContent = 'Créer';
    tlModalFolderInput.value = '';
    tlModalFolderInput.placeholder = 'Nom (optionnel)...';
    if (tlModalFolderParentWrap) {
      tlModalFolderParentWrap.style.display = '';
      tlPopulateFolderSelect(tlModalFolderParentSelect, presetParentId || '');
      tlModalFolderParentSelect.options[0].textContent = '— Aucun (racine) —';
    }
    if (numberingCheckWrap) numberingCheckWrap.style.display = '';
    if (seasonCb) seasonCb.checked = false;
    if (episodeCb) episodeCb.checked = false;
    if (numberingWrap) numberingWrap.classList.add('hidden');
    if (numberingNumber) numberingNumber.value = '';
  }
  _updateNamePrefixPreview(seasonCb, episodeCb, numberingNumber, tlModalFolderInput, prefixEl);
  tlModalFolder.classList.remove('hidden');
  setTimeout(() => { tlModalFolderInput.focus(); if (mode !== 'create') tlModalFolderInput.select(); }, 50);
}

function tlConfirmFolderModal() {
  if (_tlFolderModalMode === 'create' || _tlFolderModalMode === 'edit' || _tlFolderModalMode === 'duplicate') {
    const seasonCb = document.getElementById('tl-modal-folder-numbering-season');
    const episodeCb = document.getElementById('tl-modal-folder-numbering-episode');
    const numberingNumber = document.getElementById('tl-modal-folder-numbering-number');
    const type = _readNumberingType(seasonCb, episodeCb);
    const subtitle = tlModalFolderInput.value.trim();
    let numbering = null;
    let name;
    if (type) {
      const num = parseInt(numberingNumber.value, 10);
      if (!num || num < 1) { numberingNumber.focus(); return; }
      numbering = { type, number: num, subtitle };
      name = formatNumberedFolderName(numbering);
    } else {
      if (_tlFolderModalMode !== 'duplicate' && !subtitle) { tlModalFolderInput.focus(); return; }
      name = subtitle;
    }
    tlModalFolder.classList.add('hidden');
    if (_tlFolderModalMode === 'edit') {
      const folder = (tlState.folders || []).find(f => f.id === _tlFolderModalTargetId);
      if (folder) {
        folder.name = name;
        folder.numbering = numbering;
        tlTouchFolderChain(folder.id);
        tlSave();
        tlRender();
      }
      return;
    }
    if (_tlFolderModalMode === 'duplicate') {
      tlDuplicateFolder(_tlFolderModalTargetId, undefined, numbering);
      return;
    }
    const parentId = tlModalFolderParentSelect ? tlModalFolderParentSelect.value || null : null;
    tlCreateFolder(name, parentId, numbering);
  } else if (_tlFolderModalMode === 'rename' && _tlFolderModalTargetId) {
    const val = tlModalFolderInput.value.trim();
    if (!val) return;
    tlModalFolder.classList.add('hidden');
    tlRenameFolder(_tlFolderModalTargetId, val);
  }
}

_wireNumberingChecks(
  document.getElementById('tl-modal-folder-numbering-season'),
  document.getElementById('tl-modal-folder-numbering-episode'),
  document.getElementById('tl-modal-folder-numbering-wrap'),
  document.getElementById('tl-modal-folder-numbering-number'),
  tlModalFolderInput,
  document.getElementById('tl-modal-folder-name-prefix')
);

tlModalFolderConfirm.addEventListener('click', tlConfirmFolderModal);
tlModalFolderCancel.addEventListener('click', () => tlModalFolder.classList.add('hidden'));
tlModalFolderClose.addEventListener('click', () => tlModalFolder.classList.add('hidden'));
tlModalFolderInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') tlConfirmFolderModal();
  if (e.key === 'Escape') tlModalFolder.classList.add('hidden');
});

// Bouton + Dossier
document.getElementById('tl-btn-new-folder').addEventListener('click', () => tlOpenFolderModal('create', null, '', _tlCurrentSelectedFolderId()));

// (tl-ctx-overlay supprimé — remplacé par menus contextuels dynamiques)

// ── Modal "Gérer les tiers" — listeners de fermeture ─────────────────────────
const tlModalTiersSource = document.getElementById('tl-modal-tiers-source');
document.getElementById('tl-modal-tiers-source-close').addEventListener('click', () => tlModalTiersSource.classList.add('hidden'));
document.getElementById('tl-modal-tiers-source-cancel').addEventListener('click', () => tlModalTiersSource.classList.add('hidden'));

// ── Comparaison : menu déroulant "Listes" ouvert au CLIC (cocher/décocher, tout coché par
// défaut) + ouverture automatique dans cette fenêtre au clic sur "Comparaison" (plus de modal).
let _tlCompareSelectedIds = null; // ids cochés en session ; null = pas encore initialisé (tout coché)

// Membres du groupe de la comparaison en cours (figé à l'ouverture, indépendant de la tierlist
// active du mode normal — le menu "Listes" doit continuer à cocher/décocher les mêmes membres
// tant qu'on reste en mode comparaison, même si l'utilisateur ne peut plus changer de tierlist active).
let _tlCompareGroupMembers = null;

function _tlRenderCompareListsMenu() {
  const menu = document.getElementById('tl-compare-lists-menu');
  if (!menu) return;
  const members = _tlCompareGroupMembers || [];
  if (members.length < 2) { menu.innerHTML = ''; return; }

  if (!_tlCompareSelectedIds) _tlCompareSelectedIds = members.map(m => m.id);
  else _tlCompareSelectedIds = _tlCompareSelectedIds.filter(id => members.some(m => m.id === id));
  if (_tlCompareSelectedIds.length === 0) _tlCompareSelectedIds = members.map(m => m.id);

  menu.innerHTML = '';
  members.forEach(m => {
    const isSelected = _tlCompareSelectedIds.includes(m.id);
    const item = document.createElement('label');
    item.className = 'grid-tab tl-dropdown-item' + (isSelected ? ' active' : '');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = isSelected;
    cb.addEventListener('click', e => e.stopPropagation());
    cb.addEventListener('change', () => {
      if (cb.checked) {
        if (!_tlCompareSelectedIds.includes(m.id)) _tlCompareSelectedIds.push(m.id);
      } else {
        _tlCompareSelectedIds = _tlCompareSelectedIds.filter(id => id !== m.id);
      }
      item.classList.toggle('active', cb.checked);
      _tlOpenCompareInline();
    });
    item.appendChild(cb);
    const nameSpan = document.createElement('span');
    nameSpan.className = 'grid-tab-name';
    nameSpan.textContent = m.name;
    // Ne PAS appeler cb.click() ici : un clic sur un enfant d'un <label> transfère déjà
    // nativement le clic vers son <input> associé — un second cb.click() manuel double le
    // toggle (coché → décoché → recoché), ce qui annule silencieusement le décochage.
    nameSpan.addEventListener('click', e => e.stopPropagation());
    item.appendChild(nameSpan);
    menu.appendChild(item);
  });
}

function _tlOpenCompareInline() {
  const ids = _tlCompareSelectedIds || [];
  const tls = ids.map(id => tlState.tierlists.find(t => t.id === id)).filter(Boolean);
  document.body.classList.add('compare-tierlist-mode');
  _tlEnterCompareToolbarLayout();
  tlUpdateUndoBtn();
  if (tls.length === 0) {
    document.title = 'Comparaison';
    _tlCompareTierlists = [];
    const container = document.getElementById('tl-compare-view');
    if (container) container.innerHTML = '';
    return;
  }
  document.title = 'Comparaison : ' + _tlCommonTitlePath(tls);
  _tlRenderCompareView(tls);
}

const _tlCompareListsMenu = document.getElementById('tl-compare-lists-menu');
const _tlCompareBtnLists = document.getElementById('tl-compare-btn-lists');
document.getElementById('tl-compare-btn-lists')?.addEventListener('click', e => {
  e.stopPropagation();
  const opening = _tlCompareListsMenu.classList.contains('hidden');
  if (!opening) { _tlCompareListsMenu.classList.add('hidden'); return; }
  _tlRenderCompareListsMenu();
  positionCtxMenu(_tlCompareListsMenu, null, _tlCompareBtnLists);
  _tlCompareListsMenu.classList.remove('hidden');
});
_tlCompareListsMenu?.addEventListener('click', e => e.stopPropagation());
document.addEventListener('click', () => _tlCompareListsMenu?.classList.add('hidden'));

document.getElementById('tl-btn-compare')?.addEventListener('click', () => {
  const tl = tlActiveTierlist();
  const members = tl ? _tlGetGroupMembers(tl).filter(m => !m.isTemplate) : [];
  if (members.length < 2) return;
  _tlCompareGroupMembers = members;
  _tlCompareSelectedIds = members.map(m => m.id);
  _tlOpenCompareInline();
});

// ── Menu contextuel tierlist (clic droit sur onglet) ─────────────────────────
function tlOpenManageModal(id, anchorEl, context) {
  const tl = tlState.tierlists.find(t => t.id === id);
  if (!tl) return;
  const ctx = context || 'folders'; // 'folders' | 'dropdown'
  const { addItem, addSep } = _tlMakeCtxMenu(anchorEl, null, { title: tl.name });
  addItem('pencil', 'Renommer', false, () => tlOpenRenameModal(id));
  if (!(ctx === 'dropdown' && !tl.isTemplate)) addItem('copy-plus', 'Dupliquer', false, () => tlCopy(id));
  // Une tierlist rattachée à un template vivant suit toujours le dossier du template — se déplace via lui.
  if (!(ctx === 'dropdown' && tl.isTemplate) && !_tlHasLiveTemplate(tl)) addItem('shelving-unit', 'Déplacer', false, () => tlOpenMoveModal(id));
  // "Définir soirée en cours" : retiré pour les tierlists (dropdown ET panneau dossiers),
  // gardé seulement pour les templates (hors dropdown Template, où il est aussi retiré).
  if (tl.isTemplate && ctx !== 'dropdown') {
    const ceRoot = typeof _tlGroupRoot === 'function' ? _tlGroupRoot(tl) : tl;
    const ceIsActive = state.currentEventTierlistId === (ceRoot ? ceRoot.id : id);
    const ceLabel = ceIsActive ? 'Retirer soirée en cours' : 'Définir comme soirée en cours';
    addItem('party-popper', ceLabel, false, () => confirmSetCurrentEventTierlist(id));
  }
  if (!tl.isTemplate) {
    if (!tl.templateId) addItem('scroll', 'Convertir en template', false, () => tlConvertToTemplate(id));
  } else if (ctx !== 'dropdown') {
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

// ── Ouverture de la page Dossiers (onglet Tier List) ──────────────────────────
// openTlSidebar/closeTlSidebar définies plus haut (stubs de compat → openFoldersPage('tierlist')).
document.getElementById('tl-empty-btn-folders').addEventListener('click', () => openFoldersPage('tierlist'));

const _tlBtnFolderOptions = document.getElementById('tl-btn-folder-options');
if (_tlBtnFolderOptions) {
  _tlBtnFolderOptions.addEventListener('click', (e) => {
    e.stopPropagation();
    const folderId = _tlCurrentSelectedFolderId();
    if (folderId) tlOpenFolderManageModal(folderId, _tlBtnFolderOptions);
  });
}

const _tlFoldersSortSelect = document.getElementById('tl-folders-sort-select');
if (_tlFoldersSortSelect) {
  _tlFoldersSortSelect.addEventListener('change', () => {
    localStorage.setItem('tlFoldersSortMode', _tlFoldersSortSelect.value);
    tlRenderList();
  });
}

document.getElementById('tl-btn-open-window').addEventListener('click', () => {
  const tl = tlActiveTierlist();
  if (!tl) return;
  document.title = (_tlFullTitlePath(tl) || tl.name || 'Liste');
  document.body.classList.add('solo-tierlist-mode');
  _tlEnterSoloToolbarLayout();
  requestAnimationFrame(_adjustTlLayoutHeight);
});
document.getElementById('tl-btn-exit-solo')?.addEventListener('click', _exitSoloTierlistMode);

// Ligne composite pour les dropdowns Template/Tier lists : nom cliquable (switch) + bouton ⋮
// (renommer/dupliquer/archiver/supprimer…, via le même tlOpenManageModal que partout ailleurs).
function _tlAddDropdownSwitchItem(menu, member, isActive, closeMenu, displayName) {
  const item = document.createElement('div');
  item.className = 'grid-tab tl-dropdown-item' + (isActive ? ' active' : '');

  const nameSpan = document.createElement('span');
  nameSpan.className = 'grid-tab-name';
  nameSpan.textContent = displayName || member.name;
  nameSpan.addEventListener('click', () => { closeMenu(); tlSwitch(member.id, false); });
  item.appendChild(nameSpan);

  const ctxBtn = document.createElement('button');
  ctxBtn.className = 'grid-tab-ctx-btn';
  ctxBtn.innerHTML = '<i data-lucide="ellipsis-vertical"></i>';
  ctxBtn.title = 'Options';
  ctxBtn.addEventListener('click', e => {
    e.stopPropagation();
    tlOpenManageModal(member.id, item, 'dropdown');
  });
  item.appendChild(ctxBtn);

  menu.appendChild(item);
}

// Navigue vers un dossier de l'arborescence tierlist. S'il contient au moins un template, ouvre
// directement le plus récent (dernier créé = dernier du tableau, push en fin dans tlCreate) plutôt
// que de désélectionner — sinon reste sur l'écran "gros boutons" du dossier vide.
function _tlGoToFolder(folderId) {
  _tlExpandFolderAncestors(folderId);
  _tlLocalActiveFolderId = folderId;
  const templatesHere = tlState.tierlists.filter(t => t.isTemplate && !t.archived && (t.folderId || null) === (folderId || null));
  const mostRecent = templatesHere[templatesHere.length - 1] || null;
  _tlLocalActiveTierlistId = mostRecent ? mostRecent.id : null;
  _tlLocalNoSelection = !mostRecent;
  saveUserPrefs({ tlActiveFolderId: folderId, tlActiveTierlistId: _tlLocalActiveTierlistId, tlNoSelection: _tlLocalNoSelection });
  tlRender();
}

// ── Dropdown Chemin : arborescence des dossiers ──────────────────────────────────
// Dessine les lignes de dossiers dans le menu Chemin (pliable/depliable comme le drawer Dossiers,
// meme sessionStorage tl_folder_open_<id> - un dossier ouvert dans l'un reste ouvert dans l'autre).
// Lignes construites a la main (chevron separe du nom) plutot qu'avec addItem, qui ne gere qu'une
// ligne plate sans sous-comportement cliquable.
function _tlRenderPathMenuRows(menu, activeFolders, close, resetPathExpansion) {
  menu.querySelectorAll('.tl-path-menu-row').forEach(el => el.remove());

  // Le dossier réellement affiché (celui du breadcrumb en haut) : celui de la tierlist/template actif
  // s'il y en a un, sinon _tlLocalActiveFolderId — même source que _tlActiveGroupContext(), utilisée
  // par le dropdown Template. _tlLocalActiveFolderId seul serait souvent obsolète/null ici.
  const effectiveFolderId = _tlActiveGroupContext().folderId;
  const currentPathIds = [];
  let _cur = effectiveFolderId ? activeFolders.find(f => f.id === effectiveFolderId) : null;
  while (_cur) {
    currentPathIds.unshift(_cur.id);
    _cur = _cur.parentId ? activeFolders.find(f => f.id === _cur.parentId) : null;
  }

  if (resetPathExpansion) currentPathIds.forEach(id => sessionStorage.removeItem('tl_folder_open_' + id));

  const buildRow = (folder, depth) => {
    const hasChildren = activeFolders.some(f => (f.parentId || null) === folder.id);
    const key = 'tl_folder_open_' + folder.id;
    const isOnCurrentPath = currentPathIds.includes(folder.id);
    // Déplié par défaut sur le chemin actif, mais seulement tant que l'utilisateur n'a pas explicitement
    // replié/déplié ce dossier lui-même (sessionStorage prend le dessus dès qu'il existe).
    const stored = sessionStorage.getItem(key);
    const isOpen = stored !== null ? stored === '1' : isOnCurrentPath;

    const row = document.createElement('div');
    row.className = 'tl-path-menu-row' + (isOnCurrentPath ? ' active' : '');
    row.style.paddingLeft = (depth * 14) + 'px';

    const arrow = document.createElement('span');
    arrow.className = 'tl-path-menu-arrow' + (isOpen ? ' open' : '');
    arrow.innerHTML = hasChildren ? '<i data-lucide="chevron-right"></i>' : '';
    if (hasChildren) {
      arrow.addEventListener('click', ev => {
        ev.stopPropagation();
        sessionStorage.setItem(key, isOpen ? '0' : '1');
        _tlRenderPathMenuRows(menu, activeFolders, close);
      });
    }
    row.appendChild(arrow);

    const icon = document.createElement('span');
    icon.className = 'tl-path-menu-icon';
    icon.innerHTML = '<i data-lucide="folder"></i>';
    row.appendChild(icon);

    const name = document.createElement('span');
    name.className = 'tl-path-menu-name';
    name.textContent = folder.name;
    row.appendChild(name);

    row.addEventListener('click', () => { close(); _tlGoToFolder(folder.id); });
    return row;
  };

  const addFolderRows = (parentId, depth) => {
    activeFolders
      .filter(f => (f.parentId || null) === (parentId || null))
      .forEach(f => {
        menu.appendChild(buildRow(f, depth));
        const stored = sessionStorage.getItem('tl_folder_open_' + f.id);
        const isOpen = stored !== null ? stored === '1' : currentPathIds.includes(f.id);
        if (isOpen) addFolderRows(f.id, depth + 1);
      });
  };
  addFolderRows(null, 0);

  if (activeFolders.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'tl-path-menu-row';
    empty.style.cssText = 'opacity:0.6;cursor:default;';
    empty.textContent = 'Aucun dossier';
    menu.appendChild(empty);
  }
  if (window.lucide) lucide.createIcons();
}

const _tlBtnPathDropdown = document.getElementById('tl-btn-path-dropdown');
if (_tlBtnPathDropdown) {
  _tlBtnPathDropdown.addEventListener('click', e => {
    e.stopPropagation();
    const { menu, close } = _tlMakeCtxMenu(_tlBtnPathDropdown, null, { noCloseBtn: true, title: 'Aller à un dossier' });
    const activeFolders = (tlState.folders || []).filter(f => !f.archived);
    _tlRenderPathMenuRows(menu, activeFolders, close, true);
  });
}

// ── Dropdown Template : liste les templates du dossier actif (voir _tlActiveGroupContext) ──
const _tlBtnTemplateDropdown = document.getElementById('tl-btn-template-dropdown');
if (_tlBtnTemplateDropdown) {
  _tlBtnTemplateDropdown.addEventListener('click', e => {
    e.stopPropagation();
    const { folderId, templatesHere, root } = _tlActiveGroupContext();
    const { menu, addItem, addSep, close } = _tlMakeCtxMenu(_tlBtnTemplateDropdown, null, { noCloseBtn: true });
    templatesHere.forEach(tpl => _tlAddDropdownSwitchItem(menu, tpl, root && tpl.id === root.id, close));
    if (templatesHere.length) addSep();
    addItem('', '+ Template', 'green', () => tlOpenNewTemplateModal(folderId));
    if (window.lucide) lucide.createIcons();
  });
}

// ── Dropdown Tier lists : liste les tier lists du groupe actif + option "Nouvelle" ──
const _tlBtnTierlistDropdown = document.getElementById('tl-btn-tierlist-dropdown');
if (_tlBtnTierlistDropdown) {
  _tlBtnTierlistDropdown.addEventListener('click', e => {
    e.stopPropagation();
    const { tl, root } = _tlActiveGroupContext();
    if (!root) return;
    const members = tlState.tierlists.filter(t => !t.archived && t.templateId === root.id);
    const { menu, addItem, addSep, close } = _tlMakeCtxMenu(_tlBtnTierlistDropdown, null, { noCloseBtn: true });
    // En plein écran, un template ne peut pas s'afficher (voir _applySoloTierlistModeIfNeeded) :
    // on ne propose donc que les listes générées, jamais le template lui-même.
    if (!document.body.classList.contains('solo-tierlist-mode')) {
      _tlAddDropdownSwitchItem(menu, root, !!tl && root.id === tl.id, close, root.name + ' (template)');
      addSep();
    }
    members.forEach(member => _tlAddDropdownSwitchItem(menu, member, !!tl && member.id === tl.id, close));
    if (members.length) addSep();
    addItem('', '+ Liste', 'green', () => tlOpenGenerateFromTemplateModal(root.id));
    if (window.lucide) lucide.createIcons();
  });
}

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
tlBtnNewTemplate.addEventListener('click', () => tlOpenNewTemplateModal(_tlCurrentSelectedFolderId()));
document.getElementById('tl-empty-btn-new').addEventListener('click', () => tlOpenNewTemplateModal(_tlCurrentSelectedFolderId()));
document.getElementById('tl-empty-btn-folder').addEventListener('click', () => tlOpenFolderModal('create', null, '', _tlCurrentSelectedFolderId()));

tlModalNewConfirm.addEventListener('click', tlConfirmNewModal);
tlModalNewCancel.addEventListener('click', () => tlModalNew.classList.add('hidden'));
tlModalNewClose.addEventListener('click', () => tlModalNew.classList.add('hidden'));
tlModalNewInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') tlConfirmNewModal();
  if (e.key === 'Escape') tlModalNew.classList.add('hidden');
});

// (tlCloseManageModal supprimé — remplacé par menus contextuels dynamiques)

// ── Modal "Déplacer" ──────────────────────────────────────────────────────────
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
  // Une tierlist rattachée à un template vivant se déplace uniquement via son template.
  if (_tlHasLiveTemplate(tl)) { tlOpenMoveModal(tl.templateId); return; }
  _tlMoveTargetId = id;
  _tlMoveTargetType = 'tierlist';
  document.getElementById('tl-modal-move-title').textContent = 'Déplacer "' + tl.name + '"';
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

tlBtnAddTier.addEventListener('click', () => {
  const tl = tlActiveTierlist();
  if (tl) tlOpenTiersSourceModal(tl.id);
});
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
  const img = { id: uid(), type: 'text', name: text, color: TL_TEXT_CARD_COLOR, updatedAt: Date.now() };
  _tlPushUndoOp({ tierlistId: tl.id, groupRootId: root.id, type: 'addImage', imgId: img.id });
  root.images.push(img);
  _tlGetGroupMembers(tl).forEach(member => {
    if (!member.unplaced.includes(img.id)) member.unplaced.push(img.id);
  });
  tlTouchFolderChain(_tlEffectiveFolderId(tl));
  tlSave();
  tlRender();
  tlAddTextInput.value = '';
  tlAddTextInput.focus();
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
  // Pas de folderId propre : elle suit toujours dynamiquement celui du template (_tlEffectiveFolderId)
  // L'élément désigné "à placer" (s'il y en a un, encore non résolu par cette toute nouvelle
  // tierlist puisqu'elle n'a aucun tier rempli) ne doit pas être copié dans ses non-placés — il
  // doit apparaître uniquement dans sa zone "à placer", jamais aux deux endroits à la fois.
  const toPlaceImgId = template.toPlaceImgId;
  copy.unplaced = (template.unplaced || []).filter(id => id !== toPlaceImgId);
  // Conserve les tiers (labels/couleurs) définis sur le template, plutôt que les tiers par défaut
  copy.tiers = (template.tiers || []).map(t => ({ id: uid(), label: t.label, color: t.color, items: [] }));
  tlState.tierlists.push(copy);
  tlTouchFolderChain(template.folderId);
  return copy;
}

function tlConfirmGenerateFromTemplate() {
  if (!_tlGenerateTemplateId) return;
  const checked = [...document.querySelectorAll('#tl-modal-generate-from-template .grid-name-preset-check input:checked')].map(cb => cb.value);
  tlModalGenerate.classList.add('hidden');
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
tlBtnUndo.addEventListener('click', tlUndo);
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

tlBtnExport?.addEventListener('click', tlExport);
tlBtnCapture?.addEventListener('click', () => openTlCaptureChoiceModal(tlCapture, tlExport));
document.getElementById('tl-btn-export-images')?.addEventListener('click', tlExportImages);

// ── Modal choix Capture tierlist (capture d'écran presse-papier ou export PNG) ──
const modalTlCaptureChoice = document.getElementById('modal-tl-capture-choice');
let _tlCaptureChoiceScreenshotFn = null;
let _tlCaptureChoiceExportFn = null;
function openTlCaptureChoiceModal(screenshotFn, exportFn) {
  _tlCaptureChoiceScreenshotFn = screenshotFn;
  _tlCaptureChoiceExportFn = exportFn;
  modalTlCaptureChoice.classList.remove('hidden');
}
function closeTlCaptureChoiceModal() {
  modalTlCaptureChoice.classList.add('hidden');
  _tlCaptureChoiceScreenshotFn = null;
  _tlCaptureChoiceExportFn = null;
}
document.getElementById('btn-tl-capture-choice-screenshot').addEventListener('click', () => {
  const fn = _tlCaptureChoiceScreenshotFn;
  closeTlCaptureChoiceModal();
  if (fn) fn();
});
document.getElementById('btn-tl-capture-choice-export').addEventListener('click', () => {
  const fn = _tlCaptureChoiceExportFn;
  closeTlCaptureChoiceModal();
  if (fn) fn();
});
document.getElementById('btn-cancel-tl-capture-choice').addEventListener('click', closeTlCaptureChoiceModal);
document.getElementById('btn-close-tl-capture-choice').addEventListener('click', closeTlCaptureChoiceModal);

tlShowLabelsToggle.addEventListener('click', () => {
  const tl = tlActiveTierlist();
  const currentlyShown = _tlLocalShowLabels !== null ? _tlLocalShowLabels : !!(tl && tl.showLabels);
  _tlLocalShowLabels = !currentlyShown;
  _tlUpdateShowLabelsBtn(_tlLocalShowLabels);
  saveUserPrefs({ tlShowLabels: _tlLocalShowLabels });
  tlRender();
});

if (tlUnplacedShowLabelsToggle) {
  tlUnplacedShowLabelsToggle.addEventListener('click', () => {
    const tl = tlActiveTierlist();
    const currentlyShown = _tlLocalUnplacedShowLabels !== null ? _tlLocalUnplacedShowLabels : !!(tl && tl.showLabels);
    _tlLocalUnplacedShowLabels = !currentlyShown;
    _tlUpdateUnplacedShowLabelsBtn(_tlLocalUnplacedShowLabels);
    saveUserPrefs({ tlUnplacedShowLabels: _tlLocalUnplacedShowLabels });
    tlRender();
  });
}

// Synchronise un curseur de taille d'images avec son input number associé (deux sens).
function _tlWireImgSizeControls(slider, valueInput, onChange) {
  const clamp = v => Math.max(100, Math.min(200, v));
  slider.addEventListener('input', () => {
    const v = clamp(parseInt(slider.value));
    if (valueInput) valueInput.value = v;
    onChange(v);
  });
  if (valueInput) {
    valueInput.addEventListener('change', () => {
      const n = parseInt(valueInput.value);
      const v = clamp(isNaN(n) ? parseInt(slider.value) : n);
      slider.value = v;
      valueInput.value = v;
      onChange(v);
    });
  }
}

const tlImgSizeValueInput = document.getElementById('tl-img-size-value-input');
_tlWireImgSizeControls(tlImgSizeSlider, tlImgSizeValueInput, v => {
  _tlLocalImgSize = v;
  saveUserPrefs({ tlImgSize: _tlLocalImgSize });
  tlRender();
});

if (tlUnplacedImgSizeSlider) {
  const tlUnplacedImgSizeValueInput = document.getElementById('tl-unplaced-img-size-value-input');
  _tlWireImgSizeControls(tlUnplacedImgSizeSlider, tlUnplacedImgSizeValueInput, v => {
    _tlLocalUnplacedImgSize = v;
    saveUserPrefs({ tlUnplacedImgSize: _tlLocalUnplacedImgSize });
    tlRender();
  });
}

function _tlApplySplit(value) {
  _tlLocalSplit = Math.max(30, Math.min(70, value));
  if (tlSplitSlider) tlSplitSlider.value = _tlLocalSplit;
  if (tlSplitValueInput) tlSplitValueInput.value = _tlLocalSplit;
  if (tlSplitValueInputRight) tlSplitValueInputRight.value = 100 - _tlLocalSplit;
  document.documentElement.style.setProperty('--tl-split', _tlLocalSplit);
  saveUserPrefs({ tlSplit: _tlLocalSplit });
}
if (tlSplitSlider) {
  tlSplitSlider.addEventListener('input', () => _tlApplySplit(parseInt(tlSplitSlider.value)));
}
if (tlSplitValueInput) {
  tlSplitValueInput.addEventListener('change', () => {
    const n = parseInt(tlSplitValueInput.value);
    _tlApplySplit(isNaN(n) ? _tlLocalSplit || 60 : n);
  });
}
if (tlSplitValueInputRight) {
  tlSplitValueInputRight.addEventListener('change', () => {
    const n = parseInt(tlSplitValueInputRight.value);
    _tlApplySplit(isNaN(n) ? _tlLocalSplit || 60 : 100 - n);
  });
}

const tlCompareImgSizeSlider = document.getElementById('tl-compare-img-size-slider');
if (tlCompareImgSizeSlider) {
  const tlCompareImgSizeValueInput = document.getElementById('tl-compare-img-size-value-input');
  _tlWireImgSizeControls(tlCompareImgSizeSlider, tlCompareImgSizeValueInput, v => {
    _tlCompareImgSize = v;
    _tlRenderCompareView(null);
  });
}

const tlModalArchivedOverlay = document.getElementById('tl-modal-archived-overlay');

function tlOpenArchivesUnified() {
  tlRenderArchivedModal();
  tlModalArchived.classList.add('open');
  tlModalArchivedOverlay.classList.add('open');
}
function tlCloseArchivesUnified() {
  tlModalArchived.classList.remove('open');
  tlModalArchivedOverlay.classList.remove('open');
}
document.getElementById('tl-btn-archives-unified').addEventListener('click', () => {
  if (tlModalArchived.classList.contains('open')) tlCloseArchivesUnified();
  else tlOpenArchivesUnified();
});
tlModalArchivedClose.addEventListener('click', tlCloseArchivesUnified);
tlModalArchivedOverlay.addEventListener('click', tlCloseArchivesUnified);

const tlModalTrashOverlay = document.getElementById('tl-modal-trash-overlay');

function tlOpenTrashUnified() {
  tlRenderTrashList();
  tlModalTrash.classList.add('open');
  tlModalTrashOverlay.classList.add('open');
}
function tlCloseTrashUnified() {
  tlModalTrash.classList.remove('open');
  tlModalTrashOverlay.classList.remove('open');
}
document.getElementById('tl-btn-trash-unified').addEventListener('click', () => {
  if (tlModalTrash.classList.contains('open')) tlCloseTrashUnified();
  else tlOpenTrashUnified();
});
tlModalTrashClose.addEventListener('click', tlCloseTrashUnified);
tlModalTrashOverlay.addEventListener('click', tlCloseTrashUnified);

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

function _tlCancelRenameImgModal() {
  const afterConfirm = tlRenameImgContext && tlRenameImgContext.isNew ? tlRenameImgContext.afterConfirm : null;
  tlModalImgName.classList.add('hidden');
  tlModalImgNameInput.placeholder = "Nom de l'image...";
  tlRenameImgContext = null;
  if (afterConfirm) afterConfirm();
}
tlModalImgNameConfirm.addEventListener('click', tlConfirmRenameImg);
tlModalImgNameCancel.addEventListener('click', _tlCancelRenameImgModal);
tlModalImgNameClose.addEventListener('click', _tlCancelRenameImgModal);
tlModalImgNameInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') tlConfirmRenameImg();
  if (e.key === 'Escape') _tlCancelRenameImgModal();
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

// "Tri" est une action ponctuelle (pas un mode persistant) : trier fige immédiatement l'ordre
// choisi comme nouvel ordre manuel (tl.unplaced), sans état de tri à retenir ensuite.
tlUnplacedSortBtn.addEventListener('click', () => {
  const tl = tlActiveTierlist();
  if (!tl) return;
  const applySort = mode => {
    tl.unplacedSort = mode;
    tl.unplaced = _tlGetSortedUnplaced(tl);
    tl.unplacedSort = 'manual';
    tlSave();
    tlRender();
  };
  const { addItem } = _tlMakeCtxMenu(tlUnplacedSortBtn, null);
  addItem('arrow-down-a-z', 'Alphabétique (A→Z)', false, () => applySort('alpha'));
  addItem('arrow-up-a-z', 'Alphabétique (Z→A)', false, () => applySort('alpha-desc'));
  addItem('arrow-down-0-1', 'Date de modification (récent→ancien)', false, () => applySort('updatedAt'));
  addItem('arrow-up-0-1', 'Date de modification (ancien→récent)', false, () => applySort('updatedAt-asc'));
});

// ── Afficher/masquer le cadre "Éléments non placés" (tierlist normale uniquement) ──
const tlBtnToggleUnplaced = document.getElementById('tl-btn-toggle-unplaced');
function _tlUpdateToggleUnplacedBtn() {
  if (!tlBtnToggleUnplaced) return;
  tlBtnToggleUnplaced.innerHTML = _tlLocalUnplacedHidden
    ? '<i data-lucide="eye"></i> Non placés'
    : '<i data-lucide="eye-off"></i> Non placés';
  tlBtnToggleUnplaced.title = _tlLocalUnplacedHidden ? 'Afficher le cadre Éléments non placés' : 'Masquer le cadre Éléments non placés';
  if (window.lucide) lucide.createIcons();
}
function _tlUpdateSplitSliderVisibility(tl) {
  const tlSplitSliderLabel = document.getElementById('tl-split-slider-label');
  if (tlSplitSliderLabel) tlSplitSliderLabel.classList.toggle('hidden', !tl || !!tl.isTemplate || _tlLocalUnplacedHidden);
}
if (tlBtnToggleUnplaced) {
  tlBtnToggleUnplaced.addEventListener('click', () => {
    _tlLocalUnplacedHidden = !_tlLocalUnplacedHidden;
    saveUserPrefs({ tlUnplacedHidden: _tlLocalUnplacedHidden });
    tlEditorBody.classList.toggle('tl-unplaced-hidden', _tlLocalUnplacedHidden);
    _tlUpdateToggleUnplacedBtn();
    _tlUpdateSplitSliderVisibility(tlActiveTierlist());
  });
}

// ── Ajout d'images / texte (barre du header non placés) ───────────────────────
tlBtnAddImage.addEventListener('click', () => _tlShowImportMenu(tlBtnAddImage));
tlAddTextInput.addEventListener('keydown', e => {
  e.stopPropagation();
  if (e.key === 'Enter') {
    const tl = tlActiveTierlist();
    const text = tlAddTextInput.value.trim();
    if (!tl || !text) return;
    _tlAddTextCard(tl, text);
  }
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

  // Les images appartiennent au groupe (template), pas à une tierlist individuelle — sans passer
  // par root.images + _tlGetGroupMembers (comme tlImportImages / _tlPasteFromClipboard / _tlAddTextCard),
  // l'image collée n'était visible que dans tl.images (jamais lu par tlFindImage, qui lit toujours
  // _tlGetGroupImages = root.images) et jamais ajoutée aux autres membres du groupe : image "fantôme"
  // invisible de tous, et listes du groupe désynchronisées en nombre d'éléments.
  const root = _tlGroupRoot(tl);
  if (!root.images) root.images = [];
  const maxImages = tlEffectiveMaxImages(tl);
  if (root.images.length >= maxImages) {
    alert(`Limite atteinte — maximum ${maxImages} éléments par groupe.`);
    return;
  }
  const now = new Date();
  const addedImgs = [];
  const promises = imageItems.map(it => {
    const file = it.getAsFile();
    if (!file) return Promise.resolve();
    const name = `capture_${now.getHours()}h${String(now.getMinutes()).padStart(2,'0')}`;
    return _tlCompressToBase64(file).then(src => {
      if (root.images.length >= maxImages) return;
      if (root.images.some(i => i.src === src)) return;
      const img = { id: uid(), src, name, updatedAt: Date.now() };
      _tlSrcCache[img.id] = src;
      _tlPushUndoOp({ tierlistId: tl.id, groupRootId: root.id, type: 'addImage', imgId: img.id });
      root.images.push(img);
      _tlGetGroupMembers(tl).forEach(member => {
        if (!member.unplaced.includes(img.id)) member.unplaced.push(img.id);
      });
      addedImgs.push(img);
    });
  });

  Promise.all(promises).then(() => {
    tlTouchFolderChain(_tlEffectiveFolderId(tl));
    tlSave(); tlRender(); tlUpdateUndoBtn();
    _tlNameNewImgsSequentially(tl, addedImgs);
  }).catch(e => console.warn('TL paste error:', e));
});

// Ouvre la modal de nom pour chaque image collée, l'une après l'autre.
function _tlNameNewImgsSequentially(tl, imgs) {
  if (imgs.length === 0) return;
  const [first, ...rest] = imgs;
  tlOpenNameNewImg(tl, first, () => _tlNameNewImgsSequentially(tl, rest));
}

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
        const combined = [..._selectedGridIds, ...brandNewGrids.map(g => g.id)];
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
  if (typeof renderHomePage === 'function') renderHomePage();
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
  _applyCompareTierlistModeIfNeeded();
  tlRender();
  if (typeof renderHomePage === 'function') renderHomePage();
  _tlRemoteUpdate = false;
  if (_needsMigrationSave) tlSave();
});

// ══════════════════════════════════════════════════════════════════════════════
// PAGE D'ACCUEIL
// ══════════════════════════════════════════════════════════════════════════════

// Va sur la page Bingo/Tier List et active un dossier donné (racine ou sous-dossier), en
// positionnant la navigation du panneau Dossiers sur son dossier parent — même logique que les
// liens "Récents" du panneau, réutilisée ici pour "rejoindre" depuis l'accueil.
function _homeGoToBingoFolder(folderId) {
  window._switchPage('bingo');
  const ancestors = getFolderPath(state.folders, folderId).slice(0, -1);
  _foldersNavFolderId = ancestors.length ? ancestors[ancestors.length - 1].id : null;
  if (_localActiveFolderId !== folderId) {
    switchFolder(folderId);
  } else {
    // Dossier déjà actif localement (ex. déjà ouvert avant de "rejoindre" depuis l'accueil) :
    // switchFolder() ne serait pas appelée, donc la sélection de grilles resterait bloquée sur
    // son état précédent au lieu de repasser à "toutes les grilles non archivées" comme pour un
    // vrai premier accès au dossier.
    _selectedGridIds = (findFolderById(state.folders, folderId)?.grids || []).filter(g => !g.archived).map(g => g.id);
    saveLocalSelectedGrids(_selectedGridIds);
    renderAllFolders();
    renderElements();
    renderGridsList();
    renderGrid();
  }
  saveUserPrefs({ activePage: 'bingo' });
}

function _homeGoToBingoGrid(folder, grid) {
  window._switchPage('bingo');
  const ancestors = getFolderPath(state.folders, folder.id).slice(0, -1);
  _foldersNavFolderId = ancestors.length ? ancestors[ancestors.length - 1].id : null;
  if (_localActiveFolderId !== folder.id) switchFolder(folder.id);
  _selectedGridIds = [grid.id];
  saveLocalSelectedGrids(_selectedGridIds);
  folder.activeGridId = grid.id;
  saveState();
  renderAllFolders();
  renderElements();
  renderGridsList();
  renderGrid();
  saveUserPrefs({ activePage: 'bingo' });
}

function _homeGoToTlTierlist(tl) {
  window._switchPage('tierlist');
  const root = typeof _tlGroupRoot === 'function' ? _tlGroupRoot(tl) : tl;
  if (tl.folderId) _tlExpandFolderAncestors(tl.folderId);
  _tlLocalActiveTierlistId = root.id;
  _tlLocalNoSelection = false;
  saveUserPrefs({ activePage: 'tierlist', tlActiveTierlistId: root.id, tlNoSelection: false });
  tlRender();
}

// Équivalent _homeGoToBingoFolder côté Tier List — ouvre directement la page sur ce dossier
// (voir _homeRenderRecentTl pour le même enchaînement _switchPage + _tlGoToFolder).
function _homeGoToTlFolder(folderId) {
  window._switchPage('tierlist');
  _tlGoToFolder(folderId);
}

// ── Récents (2 listes séparées de 5 : Bingo / Tier List) ──────────────────────
function _homeRenderRecentBingo() {
  const container = document.getElementById('home-recent-bingo');
  if (!container) return;
  container.innerHTML = '';
  const ancestorIdsOf = id => getFolderPath(state.folders, id).slice(0, -1).map(f => f.id);
  // Seuls les dossiers contenant au moins une grille (chemin qui "aboutit" à une grille) — exclut
  // les dossiers purement organisationnels qui n'ont que des sous-dossiers.
  const sorted = _flattenFoldersForRecent(state.folders)
    .filter(f => f.updatedAt && (f.grids || []).some(g => !g.archived))
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0) || ancestorIdsOf(b.id).length - ancestorIdsOf(a.id).length);
  const recent = _dedupeAncestorFolders(sorted, ancestorIdsOf);
  if (recent.length === 0) return;

  const title = document.createElement('div');
  title.className = 'home-recent-title';
  title.innerHTML = '<i data-lucide="grid-3x3"></i> Bingos récents';
  container.appendChild(title);

  const list = document.createElement('div');
  list.className = 'home-recent-list';
  recent.forEach(f => {
    const row = document.createElement('div');
    row.className = 'home-recent-row';
    row.innerHTML = '<span class="home-recent-icon"><i data-lucide="grid-3x3"></i></span><span class="home-recent-path"></span>';
    row.querySelector('.home-recent-path').textContent = getFolderPath(state.folders, f.id).map(x => x.name).join(' \\ ');
    row.addEventListener('click', () => _homeGoToBingoFolder(f.id));
    list.appendChild(row);
  });
  container.appendChild(list);
}

function _homeRenderRecentTl() {
  const container = document.getElementById('home-recent-tl');
  if (!container) return;
  container.innerHTML = '';
  // Seuls les dossiers contenant au moins un template (chemin qui "aboutit" à un template) —
  // exclut les dossiers purement organisationnels qui n'ont que des sous-dossiers.
  const hasTemplate = f => tlState.tierlists.some(t => t.isTemplate && !t.archived && t.folderId === f.id);
  const sorted = (tlState.folders || [])
    .filter(f => !f.archived && f.updatedAt && hasTemplate(f))
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0) || _tlDepthOf(b.id) - _tlDepthOf(a.id));
  const recent = _dedupeAncestorFolders(sorted, _tlAncestorIdsOf);
  if (recent.length === 0) return;

  const title = document.createElement('div');
  title.className = 'home-recent-title';
  title.innerHTML = '<i data-lucide="scroll"></i> Templates récents';
  container.appendChild(title);

  const list = document.createElement('div');
  list.className = 'home-recent-list';
  recent.forEach(f => {
    const row = document.createElement('div');
    row.className = 'home-recent-row';
    row.innerHTML = '<span class="home-recent-icon"><i data-lucide="scroll"></i></span><span class="home-recent-path"></span>';
    let pathText = _tlFolderPath(f.id);
    const templatesHere = tlState.tierlists.filter(t => t.isTemplate && !t.archived && t.folderId === f.id);
    if (templatesHere.length === 1) pathText += ' \\ ' + templatesHere[0].name;
    row.querySelector('.home-recent-path').textContent = pathText;
    row.addEventListener('click', () => {
      if (templatesHere.length === 1) _homeGoToTlTierlist(templatesHere[0]);
      else {
        window._switchPage('tierlist');
        _tlGoToFolder(f.id);
      }
    });
    list.appendChild(row);
  });
  container.appendChild(list);
}

function _homeRenderHero() {
  const btn = document.getElementById('home-btn-current-event');
  const lbl = document.getElementById('home-ce-label');
  if (!btn) return;

  const ceTl = state.currentEventTierlistId;
  if (ceTl) {
    const tl = (tlState.tierlists || []).find(t => t.id === ceTl && !t.archived);
    if (tl) {
      btn.style.display = 'inline-flex';
      if (lbl) {
        // Même construction de chemin que renderCurrentEventButton() (header) : Tier List | dossiers | nom
        const parts = ['Liste'];
        if (tl.folderId) {
          const folderParts = [];
          let current = (tlState.folders || []).find(f => f.id === tl.folderId);
          while (current) {
            folderParts.unshift(current.name);
            current = (tlState.folders || []).find(f => f.id === current.parentId);
          }
          parts.push(...folderParts);
        }
        parts.push(tl.name);
        lbl.textContent = 'Rejoindre la soirée en cours : ' + parts.join(' \\ ');
      }
      return;
    }
  }
  const ceFolder = state.currentEventFolderId;
  if (ceFolder) {
    const folder = findFolderById(state.folders, ceFolder);
    if (folder && !folder.archived) {
      btn.style.display = 'inline-flex';
      if (lbl) {
        const path = getFolderPath(state.folders, ceFolder);
        lbl.textContent = 'Rejoindre la soirée en cours : Bingo \\ ' + path.map(f => f.name).join(' \\ ');
      }
      return;
    }
  }
  btn.style.display = 'none';
}

function renderHomePage() {
  if (!currentUser) return;
  _homeRenderHero();
  _homeRenderRecentBingo();
  _homeRenderRecentTl();
  if (window.lucide) lucide.createIcons();
}

document.getElementById('home-btn-current-event')?.addEventListener('click', () => {
  document.getElementById('btn-ce-navigate')?.click();
});

// ── "Nouveau Bingo" — le modal "Nouveau dossier" affiche en plus sa section grille
// (_homeNewGridAfterFolder, voir openNewThemeModal/confirmNewTheme) : dossier + première grille
// créés en une seule action depuis l'accueil.
document.getElementById('home-btn-bingo-new-grid')?.addEventListener('click', () => {
  _homeNewGridAfterFolder = true;
  openNewFolderModal(null);
});
document.getElementById('home-btn-tl-new-template')?.addEventListener('click', () => tlOpenNewTemplateModal(null, true));

// "Ouvrir Bingo/Template existant" : ouvre directement la page Dossiers sur l'onglet correspondant
// (remplace l'ancienne modal arborescente dédiée, redondante avec cette page).
document.getElementById('home-btn-bingo-join')?.addEventListener('click', () => openFoldersPage('bingo'));
document.getElementById('home-btn-tl-join')?.addEventListener('click', () => openFoldersPage('tierlist'));

