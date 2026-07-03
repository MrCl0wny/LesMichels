const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const { ProxyAgent, request: undiciRequest } = require('undici');

const scraperApiKey = defineSecret('SCRAPERAPI_KEY');

// Même whitelist que database.rules.json — ne modifier qu'en synchro avec ce fichier.
const ALLOWED_UIDS = new Set([
  'qvXEXn9zarMPaK0l9AH4PDtxsVG3',
  'VDpOI5BckhR7cmu3Bl7lzWj0wpH2',
  'KXEWIJplDrdqGnUSJA7Pvnr7aRx2'
]);

const MAX_IMAGES = 200;

exports.importTiermakerTierlist = onCall(
  { region: 'europe-west1', timeoutSeconds: 300, memory: '256MiB', secrets: [scraperApiKey] },
  async (request) => {
    if (!request.auth || !ALLOWED_UIDS.has(request.auth.uid)) {
      throw new HttpsError('permission-denied', 'Accès non autorisé.');
    }

    const apiKey = scraperApiKey.value();

    const slug = extractSlug(request.data && request.data.url);
    if (!slug) throw new HttpsError('invalid-argument', 'URL TierMaker invalide.');

    const pageUrl = `https://tiermaker.com/create/${slug}`;
    const { text: html, status } = await fetchTextWithStatus(viaProxy(pageUrl, apiKey));
    if (!html) throw new HttpsError('not-found', `Template TierMaker introuvable (HTTP ${status}).`);

    const baseTierImagePath = matchOne(html, /baseTierImagePath\s*=\s*"([^"]+)"/);
    const dateLastEdited = matchOne(html, /dateLastEdited\s*=\s*"([^"]+)"/);
    const initListArgs = matchOne(html, /tierSystem\.initList\(([^)]+)\)/);
    if (!baseTierImagePath || !dateLastEdited || !initListArgs) {
      throw new HttpsError('failed-precondition', 'Format de page TierMaker inattendu.');
    }

    const apiUrl = `https://tiermaker.com/api/?type=templates-v2&id=${encodeURIComponent(slug)}&lastEdited=${encodeURIComponent(dateLastEdited)}&variation=`;
    const filesJson = await fetchJson(viaProxy(apiUrl, apiKey));
    if (!Array.isArray(filesJson) || filesJson.length < 1) {
      throw new HttpsError('failed-precondition', 'Réponse API TierMaker inattendue.');
    }
    // Le 1er élément de filesJson est censé être le chemin de base, mais son format
    // est instable selon les templates (parfois un chemin absolu, parfois juste le slug).
    // baseTierImagePath (extrait du HTML) est fiable dans tous les cas observés.
    const [, ...fileNames] = filesJson;

    // Un templateCode vide signifie "template vierge" : aucune répartition en tiers,
    // toutes les images du template partent en "non classées".
    const templateCode = parseFirstStringArg(initListArgs);
    const tiers = templateCode ? parseTemplateCode(templateCode) : [];

    let idsToFetch;
    if (tiers.length > 0) {
      const usedPicIds = new Set();
      tiers.forEach(t => t.picIds.forEach(id => usedPicIds.add(id)));
      idsToFetch = [...usedPicIds];
    } else {
      // Toutes les images du template, dans l'ordre (index 1 à N).
      idsToFetch = fileNames.map((_, i) => i + 1);
    }

    const truncated = idsToFetch.length > MAX_IMAGES;
    idsToFetch = idsToFetch.slice(0, MAX_IMAGES);
    const idsToFetchSet = new Set(idsToFetch);

    const picIdToIndex = new Map();
    const images = [];
    let failCount = 0;
    // ScraperAPI intercepte le TLS avec son propre certificat (MITM) : rejectUnauthorized
    // désactivé sur la connexion cible, comme leur doc l'indique via `curl -k`.
    const proxyAgent = new ProxyAgent({
      uri: `http://scraperapi:${apiKey}@proxy-server.scraperapi.com:8001`,
      requestTls: { rejectUnauthorized: false }
    });
    try {
      for (const picId of idsToFetch) {
        const fileName = fileNames[picId - 1];
        if (!fileName) continue;
        const imgUrl = `https://tiermaker.com${baseTierImagePath}/${fileName}`;
        const { dataUrl, status: imgStatus } = await fetchImageViaScraperProxy(imgUrl, proxyAgent);
        if (!dataUrl) {
          failCount++;
          logger.warn('image échec', { fileName, status: imgStatus, progress: `${images.length}/${idsToFetch.length}`, failCount });
          continue;
        }
        picIdToIndex.set(picId, images.length);
        images.push({ name: fileName, src: dataUrl });
        await sleep(150);
      }
    } finally {
      await proxyAgent.close();
    }
    if (failCount > 0) logger.info('résumé échecs images', { failCount, total: idsToFetch.length });

    if (images.length === 0) {
      throw new HttpsError('internal', 'Aucune image n\'a pu être téléchargée depuis TierMaker.');
    }

    let outTiers, unplaced;
    if (tiers.length > 0) {
      outTiers = tiers.map((t, i) => ({
        label: t.label,
        color: goldenAngleColor(i),
        images: t.picIds.filter(id => idsToFetchSet.has(id) && picIdToIndex.has(id)).map(id => picIdToIndex.get(id))
      }));
      unplaced = [];
    } else {
      outTiers = [];
      unplaced = images.map((_, i) => i);
    }

    logger.info('import terminé', { slug, imagesCount: images.length, tiersCount: outTiers.length, truncated });
    return { name: slug, tiers: outTiers, images, unplaced, truncated };
  }
);

function viaProxy(targetUrl, apiKey) {
  return `https://api.scraperapi.com/?api_key=${apiKey}&url=${encodeURIComponent(targetUrl)}`;
}

function extractSlug(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  const m = trimmed.match(/tiermaker\.com\/(?:create|list)\/(?:[^/]+\/)?([a-z0-9-]+)/i);
  if (m) return m[1];
  if (/^[a-z0-9-]+$/i.test(trimmed)) return trimmed;
  return null;
}

async function fetchTextWithStatus(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return { text: null, status: res.status };
    return { text: await res.text(), status: res.status };
  } catch (e) {
    logger.error('fetchTextWithStatus error', { url, error: e.message });
    return { text: null, status: 'fetch-error: ' + e.message };
  }
}

async function fetchJson(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      logger.warn('fetchJson: réponse non-ok', { status: res.status });
      return null;
    }
    return await res.json();
  } catch (e) {
    logger.error('fetchJson error', { error: e.message });
    return null;
  }
}

// Passe par le vrai proxy HTTP ScraperAPI (pas leur endpoint api.scraperapi.com,
// qui altère les octets binaires des images en les traitant comme du texte).
async function fetchImageViaScraperProxy(url, proxyAgent) {
  try {
    const res = await undiciRequest(url, { dispatcher: proxyAgent });
    if (res.statusCode < 200 || res.statusCode >= 300) {
      return { dataUrl: null, status: res.statusCode };
    }
    const buf = Buffer.from(await res.body.arrayBuffer());
    const ct = res.headers['content-type'] || 'image/png';
    return { dataUrl: `data:${ct};base64,${buf.toString('base64')}`, status: res.statusCode };
  } catch (e) {
    logger.error('fetchImageViaScraperProxy error', { url, error: e.message });
    return { dataUrl: null, status: 'fetch-error: ' + e.message };
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function matchOne(str, re) {
  const m = str.match(re);
  return m ? m[1] : null;
}

function parseFirstStringArg(argsStr) {
  const m = argsStr.match(/^\s*"([^"]*)"/);
  return m ? m[1] : null;
}

function parseTemplateCode(code) {
  const segments = code.split('==');
  segments.shift(); // ignorer categoryName / "undefined"
  return segments.filter(Boolean).map(seg => {
    const parts = seg.split('|');
    const label = parts[0] || '?';
    const picIds = parts.slice(2).map(Number).filter(n => Number.isInteger(n) && n > 0);
    return { label, picIds };
  });
}

function goldenAngleColor(i) {
  const hue = Math.round((i * 137.508) % 360);
  return hslToHex(hue, 65, 55);
}

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = x => Math.round(255 * x).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}
