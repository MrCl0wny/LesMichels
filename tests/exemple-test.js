// ─────────────────────────────────────────────────────────────────────────────
// EXEMPLE DE TEST — sert de modèle à copier/adapter pour tester un nouveau
// changement. Pas un vrai test à faire tourner régulièrement, juste un point
// de départ pour vérifier l'appli "en vrai" avant de dire qu'un fix marche.
//
// Prérequis : Playwright installé (voir tests/README.md), projet servi en local.
// Lancer avec : node tests/exemple-test.js
// ─────────────────────────────────────────────────────────────────────────────

const { chromium } = require('playwright');
const path = require('path');

const SITE_URL = 'http://localhost:8080/index.html';
const SHIM_PATH = path.join(__dirname, 'firebase-shim.js');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });

  // Empêche le vrai Firebase (chargé depuis internet) d'écraser notre faux
  await context.route('**/firebasejs/**', route =>
    route.fulfill({ status: 200, contentType: 'text/javascript', body: '' })
  );
  await context.addInitScript({ path: SHIM_PATH });

  const page = await context.newPage();
  page.on('pageerror', err => console.log('ERREUR PAGE:', err.message));

  await page.goto(SITE_URL);
  await page.waitForTimeout(800);

  // Aller sur l'onglet Tier List
  await page.click('button[data-page="tierlist"]');
  await page.waitForTimeout(300);

  // Créer une tierlist de test avec deux images, directement en JS (plus rapide
  // que de cliquer partout dans l'UI pour un test ponctuel)
  const setup = await page.evaluate(() => {
    tlCreate('Test', null, false);
    const tl = tlState.tierlists[tlState.tierlists.length - 1];
    _tlLocalActiveTierlistId = tl.id;
    const mkImg = (name, color) => {
      const c = document.createElement('canvas'); c.width = 10; c.height = 10;
      c.getContext('2d').fillStyle = color; c.getContext('2d').fillRect(0, 0, 10, 10);
      return { id: uid(), src: c.toDataURL(), name };
    };
    const img = mkImg('Img1', 'red');
    tl.images.push(img);
    tl.unplaced.push(img.id);
    tlSave(); tlRender();
    return { tlId: tl.id, imgId: img.id };
  });
  console.log('Tierlist de test créée :', setup);

  await page.screenshot({ path: path.join(__dirname, 'screenshot.png') });
  console.log('Capture d\'écran enregistrée dans tests/screenshot.png');

  await browser.close();
})();
