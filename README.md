# LesMichels — Fiche Projet

> Application web privée pour soirées TV entre amis.
> Thème : sombre, sobre, moderne. Hébergée sur GitHub Pages.

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

### Bingo
- Sauvegarde en ligne en temps réel disponible pour tous.

### Tier List
- À venir

### Planning partagé
- À venir

---

## 💾 Sauvegarde des données

Les données (thèmes, cases, grilles) sont sauvegardées automatiquement dans le navigateur via `localStorage` (clé `lesmichels_bingo_v2`).

**Important :** les données sont liées au navigateur et à l'appareil. Elles ne sont pas partagées entre plusieurs personnes.

Une synchronisation en ligne pourra être ajoutée plus tard si besoin.

---

## 📝 Notes techniques

- Aucune dépendance externe (pas de framework, pas d'installation)
- Compatible avec tous les navigateurs modernes
- Polices chargées depuis Google Fonts (Space Mono pour les monospaces) + Arial système
- Données stockées côté client uniquement (pas de serveur)
- Migration automatique depuis l'ancien format v1 (`lesmichels_bingo`)
