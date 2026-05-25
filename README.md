# LesMichels — Fiche Projet

> Application web privée pour soirées TV entre amis.
> Thème : sombre, sobre, moderne. Hébergée sur GitHub Pages.

---

## Instructions

L'objectif est de créer une application web en français appelée 
LesMichels pour moi et mes amis.
Cette application permettra principalement de générer des bingos 
personnalisés, des tierlists et un planning partagé.
Le style doit être sombre, sobre, moderne et agréable sur PC.
Le code sera hébergé sur GitHub et mis en ligne via GitHub Pages.

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
├── index.html       → Structure de la page
├── style.css        → Thème sombre, mise en forme (police Arial)
├── app.js           → Logique (bingo, sauvegarde, thèmes, grilles)
└── README.md        → Ce fichier
```

---

## ✅ Fonctionnalités réalisées

### Tier List (v1 — Mai 2026)

#### Gestion des tier lists
- [x] Création d'une tier list avec titre (demandé à la création)
- [x] Renommage du titre à tout moment via le bouton ✏
- [x] Copie d'une tier list existante (clone complet)
- [x] Archivage d'une tier list (disparaît de la liste principale)
- [x] **Modal "Archivées"** : restaurer ou supprimer définitivement
- [x] Suppression définitive d'une tier list
- [x] Sauvegarde automatique en temps réel dans `localStorage` (clé `lesmichels_tierlist_v1`)

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
- [x] **Thèmes de soirée** : l'utilisateur crée autant de thèmes qu'il veut (ex : "Soirée Walking Dead"), chacun avec son propre nom, ses propres cases et ses propres grilles
- [x] Barre de thèmes en haut de page, toujours visible (thèmes actifs uniquement)
- [x] Double-clic ou bouton ✏ pour renommer un thème
- [x] Archivage d'un thème (disparaît de la barre principale)
- [x] **Bouton "Thèmes archivés"** : affiche un modal listant les thèmes archivés avec options restaurer / supprimer
- [x] Suppression d'un thème (si au moins un autre thème actif existe)
- [x] Sauvegarde automatique dans `localStorage` (clé `lesmichels_bingo_v2`)
- [x] Migration automatique depuis l'ancien format v1

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
- [x] Suppression d'une grille (si au moins une autre existe)

#### Affichage de la grille
- [x] **Hauteur fixe à 60% de la hauteur de l'écran** — invariable quoi qu'il arrive (contenu, police, taille)
- [x] **Zoom texte** : boutons +/- pour augmenter ou réduire la taille du texte dans les cases, **en temps réel** sans rechargement
- [x] Taille de texte adaptative selon la longueur du texte, sans impacter la taille de la grille
- [x] **Détection bingo** sur lignes, colonnes et les deux diagonales
- [x] **Lignes complétées affichées en vert clair** (animations pulse)
- [x] **Message bingo** :
  - 1 ligne → `🎉 BINGO ! Tu as complété une ligne !`
  - N lignes → `🎉 BINGO xN ! Tu as complété N lignes !`

#### Interface
- [x] Police **Arial** sur l'intégralité de l'application
- [x] Logo "LesMichels Bingo" (sans TV)

---

## 🔜 À faire

- Sauvegarde en ligne en temps réel disponible pour tous et pour toutes les fonctionnalités de l'application

### Bingo
- Terminé

### Tier List
- Terminé

### Planning partagé
- À venir

---

## 💾 Sauvegarde des données

Les données sont sauvegardées automatiquement dans le navigateur via `localStorage` :
- Bingo : clé `lesmichels_bingo_v2`
- Tier List : clé `lesmichels_tierlist_v1`

**Important :** les données sont liées au navigateur et à l'appareil. Elles ne sont pas partagées entre plusieurs personnes.

Une synchronisation en ligne pourra être ajoutée plus tard si besoin.

---

## 📝 Notes techniques

- Aucune dépendance externe (pas de framework, pas d'installation)
- Compatible avec tous les navigateurs modernes
- Polices chargées depuis Google Fonts (Space Mono pour les monospaces) + Arial système
- Données stockées côté client uniquement (pas de serveur)
- Migration automatique depuis l'ancien format v1 (`lesmichels_bingo`)

---

## ⚙️ Règles techniques

- Le projet doit rester compatible avec GitHub Pages
- Toujours préserver les sauvegardes existantes
- Toujours privilégier les modifications minimales
- Éviter les frameworks inutiles
- Conserver un code simple et lisible
- Éviter les dépendances externes inutiles
- Éviter les réécritures complètes inutiles
- Toujours expliquer les fichiers modifiés
- Toujours mettre à jour ce README après une modification importante
