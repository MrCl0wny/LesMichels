# LesMichels — Fiche Projet

> Application web privée pour soirées TV entre amis.
> Thème : sombre, sobre, moderne. Hébergée sur Firebase Hosting.

---

## Instructions

L'objectif est de créer une application web en français appelée 
LesMichels pour moi et mes amis.
Cette application permettra principalement de générer des bingos 
personnalisés, des tierlists et un planning partagé.
Le style doit être sombre, sobre, moderne et agréable sur PC.
Le code sera hébergé sur Firebase Hosting avec Firebase Realtime Database.

Je suis novice en informatique. Tu gères donc entièrement toute 
la partie technique du projet. Tu dois :
- coder les fonctionnalités complètes
- proposer les meilleures solutions techniques adaptées à un débutant
- expliquer simplement les choses
- détailler clairement les étapes à suivre
- indiquer où placer les fichiers et comment lancer le projet
- privilégier un code propre, moderne et facile à maintenir
- éviter les solutions inutilement complexes
- mettre le fichier README constamment à jour

---

## 🗂️ Structure du projet

```
LesMichels/
├── index.html          → Structure de la page + modal pseudo + scripts Firebase
├── style.css           → Thème sombre, mise en forme
├── app.js              → Logique complète (bingo, tierlist, Firebase temps réel)
├── firebase.json       → Configuration Firebase Hosting
├── .firebaserc         → Projet Firebase cible (lesmichels-bf146)
├── database.rules.json → Règles d'accès Firebase Realtime Database
└── README.md           → Ce fichier
```

---

## 🌐 Hébergement & synchronisation

- **Hébergement** : Firebase Hosting (Google) — HTTPS inclus, déploiement simple
- **Base de données** : Firebase Realtime Database — synchronisation en temps réel via WebSocket
- **Accès** : uniquement via le lien fourni — `noindex` actif (invisible des moteurs de recherche)
- **Pseudo** : demandé à l'ouverture (stocké en session, pas de compte nécessaire)
- **Synchronisation** : toutes les modifications sont répercutées instantanément sur tous les appareils connectés, sans refresh

---

## ✅ Fonctionnalités réalisées

### Temps réel & multi-utilisateurs (Mai 2026)

- [x] **Synchronisation Firebase** : toutes les modifications de bingo sont enregistrées dans Firebase Realtime Database, les modifications de tierlist sont pour le moment enregistrées en LocalStorage
- [x] **Temps réel** : les changements apparaissent instantanément sur tous les appareils sans refresh
- [x] **Multi-utilisateurs** : tous les participants peuvent interagir et modifier simultanément
- [x] **Pseudo à l'ouverture** : l'utilisateur entre son pseudo lors de la première visite (stocké en session)
- [x] **Invisible des moteurs de recherche** : balise `noindex` + header HTTP `X-Robots-Tag`
- [x] **Accès via lien unique** : pas d'inscription, pas de connexion

---

### Tier List (v1 — Mai 2026)

#### Gestion des tier lists
- [x] Création d'une tier list avec titre (demandé à la création)
- [x] Renommage du titre à tout moment via le bouton ✏
- [x] Copie d'une tier list existante (clone complet)
- [x] Archivage d'une tier list (disparaît de la liste principale)
- [x] **Modal "Archivées"** : restaurer ou supprimer définitivement
- [x] Suppression définitive d'une tier list
- [x] Sauvegarde automatique en temps réel dans Firebase

#### Tiers
- [x] 5 tiers par défaut à la création : S (rouge), A (orange), B (jaune), C (vert), D (bleu)
- [x] Ajout d'un tier : label + choix de couleur
- [x] **Renommage d'un tier** via la modal "Modifier le tier" (bouton ✏ au survol)
- [x] Modification de la couleur d'un tier : **16 swatches prédéfinis** + color picker "Autre" pour couleur personnalisée
- [x] Déplacement d'un tier (▲ / ▼)
- [x] Suppression d'un tier (les images retournent dans "non placées")

#### Images
- [x] **Import via bouton "📁 Images"** (multi-fichiers, tous formats image)
- [x] **Glisser-déposer depuis le bureau** directement dans la zone "non placées"
- [x] **Coller depuis le presse-papier** (`Ctrl+V` sur la page) — colle l'image capturée
- [x] **Glisser-déposer** des images entre les tiers et la zone "non placées"
- [x] Suppression d'une image (bouton ✕ au survol)
- [x] Renommage d'une image (bouton ✏ au survol, ou double-clic sur le bandeau)

#### Affichage
- [x] **Zone tiers à 60 % de la hauteur de l'écran** (scrollable si beaucoup de tiers)
- [x] **Bandeau nom** activé par défaut — affiche le nom sous chaque image (toggle "Noms")
- [x] **Slider de taille** des images (48 px → 180 px)
- [x] **Export PNG** : génère et télécharge la tier list complète en image

---

### Bingo (v2 — Mai 2026)

#### Thèmes
- [x] **Thèmes de soirée** : l'utilisateur crée autant de thèmes qu'il veut, chacun avec son propre nom, ses propres cases et ses propres grilles
- [x] Barre de thèmes en haut de page, toujours visible (thèmes actifs uniquement)
- [x] Double-clic ou bouton ✏ pour renommer un thème
- [x] Archivage d'un thème (disparaît de la barre principale)
- [x] **Bouton "Thèmes archivés"** : affiche un modal listant les thèmes archivés avec options restaurer / supprimer
- [x] Suppression définitive d'un thème uniquement depuis la modal "Thèmes archivés" (après archivage — sécurité anti-missclic)
- [x] Sauvegarde automatique dans Firebase

#### Cases (propres au thème actif)
- [x] Ajout d'une case (bouton ou touche Entrée)
- [x] **Modification inline** d'une case (bouton ✏)
- [x] Suppression définitive d'une case
- [x] Archivage / restauration d'une case
- [x] Onglets Actifs / Archivés
- [x] Compteur de cases actives

#### Grilles (propres au thème actif)
- [x] Plusieurs grilles par thème (onglets)
- [x] Taille variable de 3×3 à 8×8, modifiable à tout moment
- [x] **Bouton Générer** : placement aléatoire depuis les cases actives du thème
- [x] **Bouton Manuel** : mode placement par glisser-déposer depuis une palette de cases
  - Clic sur une case remplie en mode manuel vide la case
- [x] **Bouton Reset** : décoche toutes les cases sans changer la grille
- [x] Clic sur une case = coche / décoche
- [x] Double-clic ou bouton ✏ sur un onglet de grille pour le renommer
- [x] Suppression d'une grille

#### Affichage de la grille
- [x] **Hauteur fixe à 60% de la hauteur de l'écran**
- [x] **Zoom texte** : boutons +/- pour augmenter ou réduire la taille du texte dans les cases
- [x] Taille de texte adaptative selon la longueur du texte
- [x] **Détection bingo** sur lignes, colonnes et les deux diagonales
- [x] **Lignes complétées affichées en vert clair** (animations pulse)
- [x] **Message bingo** :
  - 1 ligne → `🎉 BINGO ! Tu as complété une ligne !`
  - N lignes → `🎉 BINGO xN ! Tu as complété N lignes !`
- [x] **Export PNG** : génère et télécharge la grille active en image (cases cochées et bingos mis en évidence)

---

## 🔜 À faire

### Bingo

- Faire en sorte que le texte dans les cases s'affiche correctement quand on exporte la grille
- Possibilité de faire une capture d'écran de la grille

### Tierlist

- Augmenter la largeur des tiers
- Sauvegarde en temps réel pour tous
- Possibilité de faire une capture d'écran de la tierlist

### Planning

- Affichage du calendrier, semaine en cours en haut suivi des 3 prochaines semaines
- Création d'une soirée (ex : une émission TV)
- Possibilité de créer des sous-soirées (ex : une saison)
- Possibilité de créer des épisodes
- Possibilité d'archiver des soirées, des épisodes
- Possibilité d'écrire un sous-titre pour les soirées (ex : saison + numéro de l'épisode)
- Possibilité de mettre un lien URL à une soirée
- Glisser-Déposer des soirées dans le calendrier
- Bouton "vu" à cocher qui archive automatiquement l'épisode
- Boutons "Live" et "Replay" qui indiquent lorsque l'émission est diffusée en direct ou non.
- Bouton Export PNG qui génère le planning en image
- Possibilité de créer la soirée en cliquant directement sur le calendrier
- Ajouter des participants et indiquer leur disponibilité
- Pastille de couleur avec initiale du participant en gros dans le calendrier, possibilité de cocher/décocher un jour spécifique
- Possibilité de faire une capture d'écran du planning

---

## 💾 Sauvegarde des données

Les données sont sauvegardées automatiquement dans **Firebase Realtime Database** :
- Bingo : chemin `/bingo`
- Tier List : LocalStorage pour le moment, chemin `/tierlist` à l'avenir

---

## 📝 Notes techniques

- Aucune dépendance locale (pas de framework, pas de build tool, pas d'installation)
- Firebase SDK chargé via CDN (version 10.12.2 compat)
- Compatible avec tous les navigateurs modernes
- Polices chargées depuis Google Fonts (Space Mono) + Arial système
- Synchronisation temps réel via WebSocket (Firebase `onValue`)
- Pas de boucle infinie : flag `_bingoRemoteUpdate` / `_tlRemoteUpdate` bloque la ré-écriture lors d'une mise à jour distante

---

## ⚙️ Règles techniques

- Toujours préserver les sauvegardes existantes
- Toujours privilégier les modifications minimales
- Éviter les frameworks inutiles
- Conserver un code simple et lisible
- Éviter les dépendances externes inutiles
- Éviter les réécritures complètes inutiles
- Toujours expliquer les fichiers modifiés
- Toujours mettre à jour ce README après une modification importante
