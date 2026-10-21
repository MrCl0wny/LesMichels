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
2. Playwright est déjà installé hors du projet (`C:\Users\mrclo\.claude\tools\playwright`) —
   ne pas le réinstaller ici
3. Copier `tests/exemple-test.js` hors du projet, l'adapter au scénario à vérifier
4. Le lancer avec `node` depuis le dossier Playwright ci-dessus

## Pour toi (utilisateur)

Tu n'as rien à faire avec ce dossier. Il ne sert qu'à Claude en coulisses
pendant qu'il travaille sur tes demandes — tu peux l'ignorer complètement.
