# LesMichels — Fiche Projet

> Application web privée pour soirées TV entre amis.
> Thème : sombre, sobre, moderne. Hébergée sur GitHub Pages.

---

## 🗂️ Structure du projet

```
LesMichels/
├── index.html       → Structure de la page
├── style.css        → Thème sombre, mise en forme
├── app.js           → Logique (bingo, sauvegarde, grille)
└── README.md        → Ce fichier
```

---

## ✅ Fonctionnalités réalisées

### Bingo TV (v1 — Mai 2026)
- [x] Application web monopage en français
- [x] Thème sombre, sobre et moderne (CSS variables, polices Syne + Space Mono)
- [x] Responsive PC et mobile
- [x] **Sauvegarde automatique** dans le navigateur (`localStorage`) — les données persistent entre les sessions
- [x] **Gestion des éléments**
  - Ajout d'un élément (bouton ou touche Entrée)
  - Suppression définitive d'un élément
  - Archivage / restauration d'un élément
  - Onglets Actifs / Archivés
  - Compteur d'éléments actifs
  - On peut lister plus d'éléments qu'il n'y a de cases
- [x] **Grille de bingo**
  - Taille variable de 2×2 à 8×8, modifiable à tout moment
  - Bouton **Générer** : grille aléatoire depuis les éléments actifs
  - Bouton **Reset** : décoche toutes les cases sans changer la grille
  - Clic sur une case = coche / décoche
  - **Détection bingo** sur lignes, colonnes et les deux diagonales
  - **Mise en surbrillance animée** des lignes / colonnes / diagonales complètes
  - Message "🎉 BINGO !" affiché dès qu'un bingo est formé
  - Cases vides affichées proprement si moins d'éléments que de cases

---

## 🔜 À faire

### Bingo
- [ ] Nommer et sauvegarder plusieurs grilles
- [ ] Mode multi-joueurs (chaque joueur a sa propre grille générée aléatoirement)
- [ ] Export de la grille en image ou PDF
- [ ] Historique des parties

### Tier List
- [ ] Créer des catégories (S, A, B, C, D...)
- [ ] Glisser-déposer des éléments dans les catégories
- [ ] Sauvegarder et partager une tier list

### Planning partagé
- [ ] Calendrier des soirées
- [ ] Qui est disponible ?
- [ ] Votes pour choisir un programme

---

## 🚀 Mise en ligne sur GitHub Pages

### Première fois (à faire une seule fois)

1. Créer un compte sur [github.com](https://github.com) si ce n'est pas fait
2. Créer un nouveau dépôt public appelé `lesmichels`
3. Uploader les 4 fichiers du projet (`index.html`, `style.css`, `app.js`, `README.md`)
4. Dans les paramètres du dépôt → **Pages** → Source : branche `main`, dossier `/root`
5. L'URL sera du type : `https://TON_PSEUDO.github.io/lesmichels`

### Mise à jour du site

Après chaque modification, remplacer les fichiers modifiés sur GitHub.  
Les changements sont en ligne en quelques secondes.

---

## 💾 Sauvegarde des données

Les données (éléments, grille, taille) sont sauvegardées automatiquement dans le navigateur via `localStorage`.  
**Important :** les données sont liées au navigateur et à l'appareil. Elles ne sont pas partagées entre plusieurs personnes.

Une synchronisation en ligne (via un service tiers gratuit) pourra être ajoutée plus tard si besoin.

---

## 📝 Notes techniques

- Aucune dépendance externe (pas de framework, pas d'installation)
- Compatible avec tous les navigateurs modernes
- Polices chargées depuis Google Fonts (nécessite internet)
- Données stockées côté client uniquement (pas de serveur)
