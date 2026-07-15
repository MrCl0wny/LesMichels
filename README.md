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
- **Panneaux Dossiers / Cases fixes** : sidebars rétractables poussant le contenu (Dossiers s'ouvre à gauche, Cases à droite, toutes deux 400px de large), ouverture/fermeture via leurs boutons dédiés dans la toolbar. Archives et Corbeille sont accessibles tout en bas du panneau Dossiers
- **Archivage groupé uniquement** : impossible d'archiver une grille seule — l'archivage se fait toujours via le dossier parent (qui archive ses grilles en cascade)
- **Ouvrir les grilles dans une nouvelle fenêtre** : bouton "Ouvrir dans une nouvelle fenêtre" dans la toolbar globale (avant le cadenas) — ouvre toutes les grilles affichées via `index.html?openGrids=id1,id2,...` dans une fenêtre séparée, déplaçable librement, entièrement interactive et synchronisée Firebase. La fenêtre garde la toolbar globale utile (réglages Grille/Texte, Générer grilles/cases vides, Vider, Reset, Capture) mais masque l'en-tête et la navigation dossiers

### Tier List
- Création et gestion de tier lists avec dossiers
- Import d'images, drag & drop entre tiers, export PNG
- Synchronisation temps réel entre tous les appareils connectés (images stockées en base64 dans Firebase Realtime DB)
- **Toute tierlist appartient obligatoirement à un template** : il n'existe plus de création de tierlist libre — seul "+ Template" crée un nouvel objet racine ; les tierlists s'obtiennent via "Générer depuis ce template"
- **Groupe template partagé** : un template et toutes ses tierlists générées forment un groupe qui partage les mêmes éléments (images/cartes texte), le même nom d'éléments et la même capacité max. Ajouter ou supprimer un élément depuis n'importe quel membre du groupe (template ou tierlist générée) le répercute instantanément sur tous les autres — seul le placement dans les tiers reste propre à chaque tierlist
- **Capacité max à 4 paliers fixes** : 50 / 100 / 200 / 500 éléments par groupe, choix via un menu au clic sur "Capacité max :"
- **Anti-doublon à l'import** : une image déjà présente dans le groupe (même contenu) n'est pas réimportée
- **Suppression rapide** : clic gauche sur un élément pour le sélectionner, puis touche Suppr/Retour arrière pour le supprimer (propagé à tout le groupe)
- **Compteur "M / N"** : le badge "Éléments non placés" affiche le nombre d'éléments non placés sur le total propre à la tierlist affichée (pas le total de tout le groupe) — un nettoyage automatique au chargement déduplique les éventuels éléments en double accumulés par le passé dans un template
- **Tri des éléments non placés** : par défaut, ordre manuel (réordonnable librement par drag & drop). Le bouton affiche explicitement le mode actif ("Tri : Manuel" / "Tri : Alphabétique" / "Tri : Date d'ajout") et ouvre un menu pour en changer ; dès qu'un élément est de nouveau glissé pour être repositionné, le tri repasse automatiquement en mode manuel
- **Images non rognées** : les images non carrées s'affichent en entier (letterboxées) au lieu d'être coupées
- **Cartes texte** : une petite barre "+ Texte..." toujours visible à côté du bouton d'import — tape un texte, Entrée pour l'ajouter (fond gris foncé fixe), classable comme une image dans les tiers
- **Génération depuis un template** : sur un template, un bouton "+ Tier list" apparaît dans la toolbar (ou clic droit → "Générer depuis ce template") et ouvre une modal avec noms prédéfinis Jérôme / Adrien / Damien ou un nom personnalisé. Le titre de l'éditeur affiche "NomTemplate › NomTierlist". Les tiers (labels et couleurs) du template sont hérités par la tierlist générée
- **Panneau de contrôle Tier List** : au-dessus de l'éditeur, affiche des bulles pour naviguer entre le template et ses tierlists générées (sélection unique — cliquer une bulle ouvre directement cette tierlist), visible uniquement quand la tierlist active fait partie d'un tel groupe. Chaque bulle a un bouton "options" (3 points, clic droit possible aussi) donnant accès à Renommer/Dupliquer/Ranger/Soirée en cours/Archiver/Supprimer, comme les grilles côté Bingo
- **Un template peut être défini comme soirée en cours**, comme n'importe quelle tierlist
- **Panneau Dossiers fixe (400px)** : même comportement que le Bingo — sidebar qui pousse le contenu au lieu de flotter, ouverture/fermeture via le bouton dédié. Archives et Corbeille sont accessibles tout en bas de ce panneau
- **Dossiers, tierlists et templates déplaçables par glisser-déposer** : poignée dédiée (icône grip, curseur main) sur chaque ligne du panneau Dossiers
- **Ouvrir dans une nouvelle fenêtre (gris, comme le Bingo)** : bouton dans la toolbar de l'éditeur, avec le même comportement que côté Bingo (fenêtre séparée pour l'édition solo)
- **Bouton Annuler propre à chaque utilisateur** : n'annule que les actions de la personne qui clique (déplacer/ajouter/supprimer/renommer un élément, ajouter/modifier/supprimer/réordonner un tier) — jamais celles d'un autre appareil connecté en même temps. Ne couvre volontairement pas les actions plus rares (dossiers, tierlists entières, archivage)
- **Suppression définitive** : option "Supprimer" disponible sur les dossiers, templates et tierlists (clic droit), envoie à la Corbeille
- **Dupliquer un dossier** : copie récursive du dossier avec tout son contenu (sous-dossiers, tierlists, templates et leurs tierlists générées), accessible depuis le menu contextuel du dossier
- **Ajouter un template depuis un dossier** : option "Ajouter un template" dans le menu contextuel du dossier, pré-remplit le dossier de destination dans la modal de création
- **Affichage dédié pour un template** : les tiers (labels/couleurs uniquement, sans zone de dépose ni hint — un template ne peut de toute façon jamais recevoir d'élément classé dans un tier) sont affichés dans une colonne étroite à gauche, et "Éléments non placés" occupe le reste de l'espace à droite, côte à côte plutôt qu'empilés. Une tierlist normale (générée depuis un template) garde l'affichage classique empilé
- **Gérer tiers** (bouton dédié dans la toolbar) : hub unique regroupant tous les presets de tiers (titre + pastilles de couleur), un bouton "+ Nouveau preset", un bouton "Importer tiers" (choix de la tier list source via une liste déroulante groupée par dossier, remplacement total, éléments déjà classés renvoyés en "non placés"), et la sauvegarde des tiers actuels comme nouveau preset. Deux presets de base ("Standard" et "Inversé" — mêmes labels S→D, couleurs inversées) sont injectés une seule fois au premier chargement puis se comportent comme n'importe quel preset personnalisé. L'édition d'un preset (renommer, changer une couleur via une pastille cliquable, réordonner par glisser-déposer, ajouter/retirer un tier) se fait entièrement dans un seul modal, sans ouvrir d'autre fenêtre
- **Clic sur un dossier vide (Tier List)** : affiche deux gros boutons contextualisés "+ Nouveau dossier" (bleu) / "+ Nouveau template" (vert) au centre, comme pour le Bingo. Le dossier actuellement sélectionné est toujours proposé comme parent par défaut à la création d'un nouveau dossier ou template
- **Bouton "Afficher/Masquer noms"** : remplace l'ancienne case à cocher, bouton à fond orange plein (identique dans les deux états) dont le texte reflète l'état actuel
- **Aperçu temps réel du drag & drop** : un placeholder occupe réellement l'emplacement de dépose pendant le survol (poussant les cartes voisines), la carte glissée disparaît de sa position d'origine le temps du survol — le rendu final est visible avant même de relâcher. Le calcul de la ligne cible (zone en plusieurs rangées) est corrigé
- **Comparer plusieurs tier lists d'un même groupe** : bouton "Comparer" (visible dès que le groupe a ≥2 tierlists générées) ouvre une sélection puis affiche les tierlists choisies côte à côte, en lecture seule, dans une nouvelle fenêtre, avec un réglage de taille d'image dédié à cette vue
- **Sélection de groupe toujours active** : dans le panneau des bulles d'un groupe (template + tierlists générées), une bulle reste toujours sélectionnée — impossible de tout désélectionner en cliquant sur la bulle déjà active

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