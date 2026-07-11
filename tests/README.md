# Dossier de tests (pour Claude)

Ce dossier n'est **pas utilisé par l'application** — `index.html` ne le charge jamais.
Il sert uniquement à Claude pour vérifier qu'un changement fonctionne vraiment,
en pilotant un vrai navigateur, avant de dire "c'est corrigé".

## Pourquoi ce dossier existe

L'appli demande une vraie connexion Google avant de faire quoi que ce soit.
Claude n'a pas de compte Google connecté dans son environnement de travail —
donc sans ce dossier, il ne peut pas tester "en vrai" et doit se fier uniquement
à la lecture du code.

`firebase-shim.js` est un faux Firebase qui fait croire à l'appli qu'un des
comptes autorisés est connecté, et qui stocke les données en mémoire (jamais
sur le vrai serveur — aucun risque pour les vraies données).

## Utilisation par Claude

1. Servir le projet en local (`python -m http.server 8080` depuis la racine)
2. Installer Playwright si besoin (ne survit pas d'une session à l'autre) :
   `npm install playwright && npx playwright install chromium`
3. Copier `tests/exemple-test.js`, l'adapter au scénario à vérifier
4. Lancer avec `node mon-test.js`

## Pour toi (utilisateur)

Tu n'as rien à faire avec ce dossier. Il ne sert qu'à Claude en coulisses
pendant qu'il travaille sur tes demandes — tu peux l'ignorer complètement.
