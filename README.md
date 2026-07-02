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
- **Déplacer un dossier** : via drag & drop (poignée `⠿`) dans le panneau Dossiers ou via l'option "Déplacer" du menu contextuel — avec choix de conserver ou adopter les cases du dossier d'arrivée
- **Importer des cases** : copie les cases d'un autre dossier dans le dossier actif (sans doublon), accessible depuis le menu contextuel

### Tier List
- Création et gestion de tier lists avec dossiers
- Import d'images, drag & drop entre tiers, export PNG
- Sauvegarde locale (non partagée entre utilisateurs)
- **Limite d'images personnalisable** : 50 images par tierlist par défaut ; champ "Images max" éditable à côté du compteur "Images non placées", modifiable jusqu'à 200, propre à chaque tierlist
- **Anti-doublon à l'import** : une image déjà présente dans la tierlist (même contenu) n'est pas réimportée
- **Suppression rapide** : clic gauche sur une image pour la sélectionner, puis touche Suppr/Retour arrière pour la supprimer

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

## 🗓️ Idées & todo

- [ ] **Statistiques par dossier** : taux de remplissage des grilles, cases les plus cochées, nombre de bingos par soirée
- [ ] **Recherche de cases** : champ de recherche dans le panneau Cases pour filtrer rapidement
- [ ] **Animations de bingo** : confettis / flash / son au moment de la détection d'un bingo
- [ ] **Tier List → Firebase** : partager les tier lists entre utilisateurs en temps réel

---

## Notes à moi même

Infobulles — désactivées (mais code conservé) :

Les infobulles utilisent uniquement l'attribut HTML natif title="". Il n'y a aucun CSS personnalisé pour les infobulles — elles sont gérées par le navigateur.

Elles sont désormais désactivées globalement via un flag en haut d'app.js : `const DISABLE_TITLE_TOOLTIPS = true;`. Ce code neutralise l'écriture de `title` sur tous les éléments (JS dynamique) et vide les `title="..."` déjà présents dans le HTML au chargement — sans supprimer les attributs source. Pour les réactiver : repasser le flag à `false`.

Dans index.html : chaque <button ... title="..."> entre les lignes ~51 à ~174 (la zone panneau de contrôle Bingo et la sidebar Tier List).
Dans app.js : partout où du HTML est créé dynamiquement, par exemple ligne 1021 (li.title = 'Clic gauche ...'), ligne 1034 (handle.title = 'Glisser-déposer...'), et d'autres éléments créés dans renderGrid() (~ligne 2260–2500).
Pour les modifier, tu changes simplement le contenu entre guillemets de l'attribut title="" directement dans ces fichiers.