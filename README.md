# LesMichels

> Application web privée pour soirées TV entre amis.  
> Thème sombre, sobre, moderne. Hébergée sur Firebase Hosting.

---

## 🌐 Hébergement & accès

- **Hébergement** : Firebase Hosting (HTTPS automatique)
- **Base de données** : Firebase Realtime Database (synchronisation temps réel)
- **Authentification** : connexion Google obligatoire
- **Accès** : lien privé — invisible des moteurs de recherche (`noindex`)
- **Déploiement** : push sur `main` → GitHub Actions → Firebase automatiquement

---

## ✅ Fonctionnalités

### Bingo
- **Structure en dossiers imbriqués** : dossiers racines → dossiers enfants (profondeur illimitée) → grilles
- **Navigation multi-niveaux** : rangée dossiers racines + rangée enfants du dossier actif + fil d'Ariane (3+ niveaux)
- Jusqu'à 3 grilles simultanées avec contrôles indépendants
- Génération aléatoire (toutes cases ou seulement cases vides), détection bingo, captures PNG
- Synchronisation temps réel entre tous les appareils connectés
- **Archives unifiées** : onglet unique regroupant dossiers et grilles archivés
- **Archivage par dossier** : chaque dossier a ses propres cases archivées, indépendant des autres dossiers
- **Corbeille** : les éléments supprimés sont conservés temporairement, restaurables ou supprimables définitivement
- **Génération sélective** : option pour remplir uniquement les cases vides, laisser les cases existantes intactes

### Tier List
- Création et gestion de tier lists avec dossiers
- Import d'images, drag & drop entre tiers, export PNG
- Sauvegarde locale (non partagée entre utilisateurs)

---

## 💾 Stockage des données

| Module | Stockage | Partagé |
|---|---|---|
| Bingo | Firebase Realtime DB (`/bingo`) | ✅ Temps réel |
| Tier List | LocalStorage | ❌ Local uniquement |

---

## 🗂️ Structure du projet

```
LesMichels/
├── index.html          → Page principale + modals + initialisation Firebase
├── style.css           → Thème sombre
├── app.js              → Logique JS : auth, bingo, tier list
├── 404.html            → Page d'erreur Firebase Hosting
├── firebase.json       → Configuration Firebase Hosting + cache HTTP
├── database.rules.json → Règles d'accès Firebase (authentifiés uniquement)
└── README.md           → Ce fichier
```

---

## 📝 Notes techniques

- Vanilla JS/CSS/HTML — aucun framework, aucun build tool
- Firebase SDK 10.12.2 chargé via CDN
- Police : Space Mono (logo), Arial (interface)
- Assets versionnés via `?v=N` pour invalidation du cache navigateur
