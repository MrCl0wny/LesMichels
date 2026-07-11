// ─────────────────────────────────────────────────────────────────────────────
// FAUX FIREBASE — pour que Claude puisse tester l'appli sans compte Google réel.
//
// Ce fichier n'est JAMAIS chargé par l'appli normale (index.html ne le référence
// pas). Il sert uniquement aux tests automatisés que Claude fait lui-même avec
// Playwright, pour vérifier qu'un changement fonctionne avant de dire "c'est fait".
//
// Ce qu'il fait : remplace window.firebase par une version qui fait semblant
// d'être connecté (avec un des 3 comptes autorisés dans ALLOWED_UIDS de app.js)
// et qui stocke les données en mémoire au lieu d'aller sur le vrai serveur Firebase.
// Comme ça, aucun risque de toucher aux vraies données pendant un test.
//
// Utilisation (voir tests/README.md pour le détail) :
//   1. Servir le projet en local (ex: python -m http.server 8080)
//   2. Dans un script Playwright, avant d'ouvrir la page :
//        await context.route('**/firebasejs/**', route => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
//        await context.addInitScript({ path: 'tests/firebase-shim.js' });
//   3. Naviguer vers index.html normalement — l'appli croit être connectée.
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  function makeRef(pathParts, root) {
    const get = () => {
      let obj = root;
      for (const p of pathParts) { if (obj == null) return null; obj = obj[p]; }
      return obj === undefined ? null : obj;
    };
    const set = (obj) => {
      let target = root;
      for (let i = 0; i < pathParts.length - 1; i++) {
        const p = pathParts[i];
        if (!target[p]) target[p] = {};
        target = target[p];
      }
      if (pathParts.length) target[pathParts[pathParts.length - 1]] = obj;
      fireValue();
      return Promise.resolve();
    };
    const listeners = [];
    const fireValue = () => {
      const val = get();
      listeners.forEach(cb => cb({ val: () => val }));
    };
    return {
      on(event, cb) { if (event === 'value') { listeners.push(cb); setTimeout(fireValue, 0); } },
      once() { return Promise.resolve({ val: () => get() }); },
      set,
      update(patch) { const t = get() || {}; Object.assign(t, patch); return set(t); },
      child(p) { return makeRef([...pathParts, p], root); },
      push() { const id = 'k' + Math.random().toString(36).slice(2); return makeRef([...pathParts, id], root); },
    };
  }

  // Un des 3 UID autorisés dans app.js (ALLOWED_UIDS) — sans ça l'appli refuse l'accès.
  const FAKE_UID = 'qvXEXn9zarMPaK0l9AH4PDtxsVG3';

  window.__dbRoot = {};
  window.firebase = {
    initializeApp() {},
    auth() {
      return {
        onAuthStateChanged(cb) {
          setTimeout(() => cb({ uid: FAKE_UID, email: 'test@test.com', displayName: 'Test User' }), 0);
        },
        signInWithPopup() { return Promise.resolve(); },
        signOut() { return Promise.resolve(); },
        GoogleAuthProvider: function () {},
      };
    },
    database() {
      return { ref(path) { return makeRef(path.split('/').filter(Boolean), window.__dbRoot); } };
    },
  };
  firebase.auth.GoogleAuthProvider = function () {};
})();
