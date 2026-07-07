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
- **Panneaux Dossiers / Cases fixes** : sidebars rétractables poussant le contenu (Dossiers s'ouvre à gauche, Cases à droite, toutes deux 400px de large), ouverture/fermeture via leurs boutons dédiés dans la toolbar
- **Archivage groupé uniquement** : impossible d'archiver une grille seule — l'archivage se fait toujours via le dossier parent (qui archive ses grilles en cascade)
- **Ouvrir les grilles dans une nouvelle fenêtre** : bouton "Ouvrir dans une nouvelle fenêtre" dans la toolbar globale (avant le cadenas) — ouvre toutes les grilles affichées via `index.html?openGrids=id1,id2,...` dans une fenêtre séparée, déplaçable librement, entièrement interactive et synchronisée Firebase. La fenêtre garde la toolbar globale utile (réglages Grille/Texte, Générer grilles/cases vides, Vider, Reset, Capture) mais masque l'en-tête et la navigation dossiers

### Tier List
- Création et gestion de tier lists avec dossiers
- Import d'images, drag & drop entre tiers, export PNG
- Synchronisation temps réel entre tous les appareils connectés (images stockées en base64 dans Firebase Realtime DB)
- **Limite d'images personnalisable** : 50 images par tierlist par défaut ; champ "Images max" éditable à côté du compteur "Images non placées", modifiable jusqu'à 200, propre à chaque tierlist
- **Anti-doublon à l'import** : une image déjà présente dans la tierlist (même contenu) n'est pas réimportée
- **Suppression rapide** : clic gauche sur une image pour la sélectionner, puis touche Suppr/Retour arrière pour la supprimer
- **Tri des images non placées** : par défaut, ordre manuel (réordonnable librement par drag & drop). Icône ↕️ à côté du compteur ouvre un menu pour choisir Manuel / Alphabétique / Date d'ajout ; dès qu'une image est de nouveau glissée pour être repositionnée, le tri repasse automatiquement en mode manuel.
- **Images non rognées** : les images non carrées s'affichent désormais en entier (letterboxées) au lieu d'être coupées.
- **Cartes texte** : une petite barre "+ Texte..." toujours visible à côté du bouton d'import (s'agrandit légèrement quand on clique dedans) — tape un texte, Entrée pour l'ajouter (fond gris foncé fixe), classable comme une image dans les tiers.
- **Templates** : un template est une tierlist dont les images restent toujours en zone "non placée" (impossible de les glisser dans un tier). Sert de base réutilisable. Bouton "+ Template" dans le panneau Dossiers, ou clic droit sur une tierlist existante → "🧩 Convertir en template" (renvoie automatiquement ses images classées en zone non placée).
- **Génération depuis un template** : clic droit sur un template → "🎲 Générer depuis ce template" ouvre une modal avec noms prédéfinis Jérôme / Adrien / Damien (cases à cocher, comme pour les grilles Bingo) ou un nom personnalisé. Crée une tierlist indépendante par nom coché, avec toutes les images du template en zone non placée. Le template et ses tierlists générées sont regroupés dans le panneau Dossiers (le template s'affiche comme un dossier repliable 🧩), et le titre de l'éditeur affiche "NomTemplate › NomTierlist".

---

## 💾 Stockage des données

| Module | Stockage | Partagé |
|---|---|---|
| Bingo | Firebase Realtime DB (`/bingo`) | ✅ Temps réel |
| Tier List | Firebase Realtime DB (`/tierlist`), images en base64 | ✅ Temps réel |

---

## 🗂️ Structure du projet

```
LesMichels/
├── index.html          → Page principale + modals + initialisation Firebase
├── style.css           → Thème sombre
├── app.js              → Logique JS : auth, bingo, tier list
├── 404.html            → Page d'erreur Firebase Hosting
├── firebase.json       → Configuration Firebase Hosting + Functions + cache HTTP
├── database.rules.json → Règles d'accès Firebase (authentifiés uniquement)
└── README.md           → Ce fichier
```

---

## 📝 Notes techniques

- Vanilla JS/CSS/HTML — aucun framework, aucun build tool
- Firebase SDK 10.12.2 chargé via CDN
- Police : Space Mono (logo), Arial (interface)
- Assets versionnés via `?v=N` pour invalidation du cache navigateur

### Icônes (Lucide)

Le CDN Lucide est chargé dans `index.html` (`<script src="https://unpkg.com/lucide@latest">`), en remplacement progressif des emojis actuels (🗑, 📁, 🎲...). Rien n'est encore remplacé — les emojis restent en place jusqu'à migration.

**Choisir une icône** : aller sur [lucide.dev/icons](https://lucide.dev/icons), chercher un mot-clé (ex. "trash", "folder", "dice"), cliquer sur l'icône qui plaît pour récupérer son nom exact (ex. `trash-2`, `folder`, `dices`).

**Utilisation** : remplacer l'emoji par `<i data-lucide="nom-de-l-icone"></i>`, puis appeler `lucide.createIcons()` pour que Lucide transforme les balises en SVG (à refaire après tout ajout dynamique de boutons, ex. menus contextuels).

## 🗓️ Idées & todo

- [ ] **Statistiques par dossier** : taux de remplissage des grilles, cases les plus cochées, nombre de bingos par soirée
- [ ] **Recherche de cases** : champ de recherche dans le panneau Cases pour filtrer rapidement
- [ ] **Animations de bingo** : confettis / flash / son au moment de la détection d'un bingo

---

## Notes à moi même

Infobulles — désactivées (mais code conservé) :

Les infobulles utilisent uniquement l'attribut HTML natif title="". Il n'y a aucun CSS personnalisé pour les infobulles — elles sont gérées par le navigateur.

Elles sont désormais désactivées globalement via un flag en haut d'app.js : `const DISABLE_TITLE_TOOLTIPS = true;`. Ce code neutralise l'écriture de `title` sur tous les éléments (JS dynamique) et vide les `title="..."` déjà présents dans le HTML au chargement — sans supprimer les attributs source. Pour les réactiver : repasser le flag à `false`.

Dans index.html : chaque <button ... title="..."> entre les lignes ~51 à ~174 (la zone panneau de contrôle Bingo et la sidebar Tier List).
Dans app.js : partout où du HTML est créé dynamiquement, par exemple ligne 1021 (li.title = 'Clic gauche ...'), ligne 1034 (handle.title = 'Glisser-déposer...'), et d'autres éléments créés dans renderGrid() (~ligne 2260–2500).
Pour les modifier, tu changes simplement le contenu entre guillemets de l'attribut title="" directement dans ces fichiers.