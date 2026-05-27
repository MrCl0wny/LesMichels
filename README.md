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
├── index.html          → Structure de la page + modals + scripts Firebase
├── style.css           → Thème sombre, mise en forme (version 11)
├── app.js              → Logique complète (auth, bingo, tierlist, Firebase) (version 10)
├── 404.html            → Page d'erreur Firebase Hosting
├── firebase.json       → Configuration Firebase Hosting + cache headers
├── .firebaserc         → Projet Firebase cible (lesmichels-bf146)
├── database.rules.json → Règles d'accès Firebase (authentifiés uniquement)
└── README.md           → Ce fichier
```

---

## 🌐 Hébergement & synchronisation

- **Hébergement** : Firebase Hosting (Google) — HTTPS inclus, déploiement simple
- **Base de données** : Firebase Realtime Database — synchronisation en temps réel via WebSocket
- **Accès** : uniquement via le lien fourni — `noindex` actif (invisible des moteurs de recherche)
- **Authentification** : connexion Google obligatoire (Firebase Auth) — pas d'accès sans compte Google
- **Badge utilisateur** : affiché dans le header (en haut à droite) avec photo de profil et menu déroulant de déconnexion
- **Synchronisation** : toutes les modifications Bingo sont répercutées instantanément sur tous les appareils connectés, sans refresh
- **Cache HTTP** : fichiers `.html` servis sans cache ; fichiers `.js` et `.css` mis en cache 1 an (versionnés via `?v=N`)

---

## ✅ Fonctionnalités réalisées

### Temps réel & multi-utilisateurs (Mai 2026)

- [x] **Synchronisation Firebase (Bingo)** : toutes les modifications de bingo sont enregistrées dans Firebase Realtime Database — chemin `/bingo`
- [x] **Tier List en LocalStorage** : les données de tier list sont sauvegardées localement (pas partagées en temps réel)
- [x] **Temps réel (Bingo)** : les changements apparaissent instantanément sur tous les appareils sans refresh
- [x] **Multi-utilisateurs (Bingo)** : tous les participants peuvent interagir et modifier simultanément
- [x] **Invisible des moteurs de recherche** : balise `noindex, nofollow` + header HTTP `X-Robots-Tag`
- [x] **Authentification Google** : connexion obligatoire via compte Google (Firebase Auth) — modal de connexion bloque l'accès si non connecté
- [x] **Badge utilisateur** : affiché dans le header avec photo de profil Google et menu déroulant de déconnexion
- [x] **Accès sécurisé** : règles Firebase Realtime Database limitées aux utilisateurs authentifiés uniquement

---

### Tier List (v2 — Mai 2026)

#### Gestion des tier lists
- [x] Création d'une tier list avec titre (demandé à la création)
- [x] **Choix du dossier à la création** : sélecteur optionnel pour ranger directement la nouvelle tier list dans un dossier existant
- [x] Renommage du titre à tout moment via le bouton ✏
- [x] Copie d'une tier list existante (clone complet)
- [x] Archivage d'une tier list (disparaît de la liste principale)
- [x] **Modal "Archives"** : restaurer ou supprimer définitivement
- [x] Suppression définitive d'une tier list
- [x] Sauvegarde automatique en **LocalStorage** (locale, non partagée)

#### Tiers
- [x] 5 tiers par défaut à la création : S (rouge), A (orange), B (jaune), C (vert), D (bleu)
- [x] Ajout d'un tier : label + choix de couleur
- [x] **Renommage d'un tier** via la modal "Modifier le tier" (bouton ✏ au survol)
- [x] Modification de la couleur d'un tier : **16 swatches prédéfinis** + color picker "Autre" pour couleur personnalisée
- [x] Déplacement d'un tier (▲ / ▼)
- [x] Suppression d'un tier (les images retournent dans "non placées")

#### Dossiers (sidebar)
- [x] **Création de dossiers** pour organiser les tier lists (bouton `+ dossier`)
- [x] **Drag & drop dans la sidebar** : réordonner les tier lists et les dossiers par glisser-déposer
- [x] **Déposer une tier list sur un dossier** pour la ranger automatiquement dedans
- [x] **Double-clic sur une tier list** → menu contextuel : Renommer / Dupliquer / Ranger / Archiver
- [x] **Double-clic sur un dossier** → menu contextuel : Renommer / Archiver
- [x] **Modal "Ranger"** : sélectionner ou retirer d'un dossier depuis le menu contextuel
- [x] **Surbrillance bleue** du dossier contenant la tier list active dans la sidebar
- [x] **Archives** : tierlists dans les dossiers visibles directement à l'ouverture

#### Images
- [x] **Import via bouton "📁 Importer images"** (multi-fichiers, tous formats image)
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

### Bingo (v11 — Mai 2026)

#### Panneau de contrôle unifié
- [x] **Thèmes, sous-thèmes, grilles et barre d'outils regroupés** dans un seul panneau en haut — rétractable d'un clic (▲/▼)
- [x] Quatre lignes : Thème / Sous-thème / Grille / contrôles (Texte, Bloquer+Générer+Reset encadrés, Capture)

#### Thèmes
- [x] **Thèmes de soirée** : l'utilisateur crée autant de thèmes qu'il veut — nom par défaut "Thème N" (modifiable), chacun avec ses propres cases et sous-thèmes
- [x] Onglets de thèmes épurés (nom uniquement, sans icônes)
- [x] **Double-clic sur un thème** → menu contextuel clair : Renommer / Dupliquer / Archiver
- [x] **Réordonner les thèmes par glisser-déposer** : faire glisser un onglet de thème pour changer son ordre
- [x] Archivage d'un thème (disparaît de la barre principale)
- [x] **Bouton "📦 Thèmes archivés"** : affiche un modal listant les thèmes archivés avec options restaurer / supprimer
- [x] Suppression définitive d'un thème uniquement depuis la modal "Thèmes archivés" (sécurité anti-missclic)
- [x] Sauvegarde automatique dans Firebase (chemin `/bingo`)

#### Cases (communes au thème, validation par sous-thème)
- [x] Ajout d'une case (bouton ou touche Entrée)
- [x] **Double-clic sur une case** → édition inline directe (plus besoin du bouton ✏)
- [x] Archivage d'une case active (bouton 📦) — disparaît de la liste active
- [x] Restauration d'une case archivée (onglet "Archivées")
- [x] **Suppression définitive uniquement depuis l'onglet "Archivées"** (sécurité anti-missclic)
- [x] Onglets **Actives** / **Archivées**
- [x] Compteur de cases actives
- [x] **Panneau Cases rétractable** : bouton ◀/▶ toujours accessible même panneau réduit, libérant l'espace pour la grille
- [x] **Cases cochées colorées** : quand une case est cochée dans une grille du sous-thème actif, son item dans le panneau Cases prend la même couleur de fond (jaune doré)

#### Sous-thèmes
- [x] Chaque thème peut avoir plusieurs sous-thèmes (ex : épisodes d'une émission)
- [x] Les **cases sont communes** à tout le thème, mais la **validation est propre à chaque sous-thème**
- [x] **Double-clic sur un sous-thème** → menu contextuel : Renommer / Dupliquer / Archiver
- [x] **Réordonner les sous-thèmes par glisser-déposer**
- [x] **Modal "Sous-thèmes archivés"** : restaurer ou supprimer définitivement

#### Grilles (propres au sous-thème actif)
- [x] Plusieurs grilles par sous-thème (onglets) — **nom demandé à la création** via modal
- [x] **Taille individuelle par grille** de **3×3 à 5×5** — contrôle −/+ au-dessus de chaque grille — **taille par défaut : 4×4**
- [x] **Titre de grille = nom de l'onglet** : modifier le titre dans la grille met à jour l'onglet automatiquement (et vice-versa via renommage modal)
- [x] Onglets de grilles épurés (nom uniquement, sans icônes)
- [x] **Double-clic sur une grille** → menu contextuel clair : Renommer / Dupliquer / Archiver
- [x] **Dupliquer une grille** : clone complet (via menu contextuel double-clic)
- [x] **Archivage d'une grille** (via menu contextuel double-clic)
- [x] **Bouton "📦 Grilles archivées"** : restaurer ou supprimer définitivement une grille
- [x] Suppression définitive d'une grille uniquement depuis le modal "Grilles archivées" (sécurité anti-missclic)
- [x] **Réordonner les grilles par glisser-déposer** : faire glisser un onglet de grille pour changer son ordre

#### Mode de jeu
- [x] **Sélection multi-grilles (max 3)** : cliquer sur un onglet met la grille en surbrillance et l'affiche — recliquer la masque (max 3 simultanément)
- [x] **Possibilité de n'afficher aucune grille** : retirer la surbrillance de tous les onglets pour masquer toutes les grilles
- [x] **Barre d'outils sur une seule ligne** : Texte, séparateur, puis **cadre discret Bloquer / Générer / Reset**, Capture
- [x] **Bloquer** (toolbar) : empêche la génération **et le reset** global — chaque grille a aussi son propre verrou
- [x] **Bouton Générer** (bleu foncé) : placement aléatoire depuis les cases actives du thème
- [x] **Cases cochées persistantes** : les cases déjà cochées conservent leur état lors d'une regénération (même sur les nouvelles grilles générées entre temps)
- [x] **Bouton Reset** (rouge foncé) : décoche toutes les cases des grilles **du sous-thème actif uniquement** (y compris non affichées) — demande confirmation avant d'agir
- [x] **Valider une case = valider pour toutes les grilles du sous-thème actif** : cocher/décocher un élément l'applique à toutes les grilles non archivées du sous-thème courant
- [x] Clic sur une case = coche / décoche

#### Contrôles par grille (multi-grilles)
- [x] **Contrôles indépendants par grille** (ordre : Taille | Cadre Bloquer+Générer | Capture | Couleur texte) :
  - −/+ Modifier la taille de la grille individuellement
  - 🔒 Bloquer/débloquer la génération de cette grille
  - 🎲 Générer uniquement cette grille (bleu foncé)
  - 📷 Copier cette grille dans le presse-papier
  - **A🎨** Color picker pour la couleur de base du texte de cette grille
- [x] **Cadre discret** autour de Bloquer + Générer (global et par grille) pour signaler visuellement qu'ils sont liés
- [x] **Boutons globaux** (toolbar principale) agissent sur toutes les grilles non archivées du sous-thème actif :
  - Bloquer toutes, Générer toutes, Reset (sous-thème actif, avec confirmation), Capturer toutes (presse-papier)

#### Affichage de la grille
- [x] **Hauteur fixe à 70% de la hauteur de l'écran** (58% en mode 2 grilles, 48% en mode 3 grilles)
- [x] **Déplacer les grilles par glisser-déposer** : en mode multi-grilles, faire glisser un wrapper de grille pour changer son ordre d'affichage
- [x] **Séparation visuelle distincte** : en mode multi-grilles, chaque grille est encadrée indépendamment (fond, bordure, ombre)
- [x] **Titre personnalisé par grille** : champ de saisie au-dessus de chaque grille — synchronisé avec le nom de l'onglet
- [x] **Couleur de texte personnalisée par grille** : color picker dans les contrôles de chaque grille — s'applique aux cellules non cochées et au titre
- [x] **Zoom texte local** : boutons +/- pour agrandir ou réduire la taille du texte — réglage propre à chaque navigateur (stocké en LocalStorage)
- [x] Police fixée à **Arial** pour tous les textes des cases
- [x] Taille de texte adaptative selon la longueur du texte
- [x] **Détection bingo** sur lignes, colonnes et les deux diagonales
- [x] **Lignes complétées affichées en vert clair** (animations pulse)
- [x] **Message bingo par grille** : affiché sous chaque grille concernée indépendamment
- [x] **Capture** : copie la grille dans le presse-papier + **son de confirmation** au succès

---

## 🔜 À faire

### Tierlist

- [ ] Sauvegarde en temps réel Firebase (chemin `/tierlist`) partagée entre tous les utilisateurs
- [ ] Augmenter la largeur des tiers

### Planning

- [ ] Affichage du calendrier, semaine en cours en haut suivi des 3 prochaines semaines
- [ ] Création d'une soirée (ex : une émission TV)
- [ ] Possibilité de créer des sous-soirées (ex : une saison)
- [ ] Possibilité de créer des épisodes
- [ ] Possibilité d'archiver des soirées, des épisodes
- [ ] Possibilité d'écrire un sous-titre pour les soirées (ex : saison + numéro de l'épisode)
- [ ] Possibilité de mettre un lien URL à une soirée
- [ ] Glisser-Déposer des soirées dans le calendrier
- [ ] Bouton "vu" à cocher qui archive automatiquement l'épisode
- [ ] Boutons "Live" et "Replay" qui indiquent lorsque l'émission est diffusée en direct ou non
- [ ] Bouton Export PNG qui génère le planning en image
- [ ] Possibilité de créer la soirée en cliquant directement sur le calendrier
- [ ] Ajouter des participants et indiquer leur disponibilité
- [ ] Pastille de couleur avec initiale du participant en gros dans le calendrier, possibilité de cocher/décocher un jour spécifique
- [ ] Possibilité de faire une capture d'écran du planning

---

## 💾 Sauvegarde des données

| Module   | Stockage           | Chemin / Clé                        | Partagé |
|----------|--------------------|-------------------------------------|---------|
| Bingo    | Firebase Realtime  | `/bingo`                            | ✅ Oui  |
| Tier List | LocalStorage      | `lesmichels_tierlist`               | ❌ Non  |
| Zoom texte (Bingo) | LocalStorage | `lesmichels_bingo_fontscale`    | ❌ Non  |
| Thème actif (Bingo) | LocalStorage | `lesmichels_bingo_activetheme`  | ❌ Non  |
| Sous-thème actif (Bingo) | LocalStorage | `lesmichels_bingo_activesubtheme` | ❌ Non |
| Grilles sélectionnées (Bingo) | LocalStorage | `lesmichels_bingo_selectedgrids_v3` | ❌ Non |

---

## 📝 Notes techniques

- Aucune dépendance locale (pas de framework, pas de build tool, pas d'installation)
- Firebase SDK chargé via CDN (version **10.12.2** compat) — modules `app`, `database`, `auth`
- Compatible avec tous les navigateurs modernes
- Polices chargées depuis Google Fonts : **Space Mono** (logo, éléments mono) — **Syne** chargée mais non utilisée dans le CSS
- Synchronisation temps réel via WebSocket (Firebase `onValue`)
- Pas de boucle infinie : flag `_bingoRemoteUpdate` bloque la ré-écriture lors d'une mise à jour distante (Bingo uniquement)
- Thème actif, sous-thème actif et zoom texte sont **locaux** (par navigateur) et non synchronisés
- Versionnement des assets via query string (`style.css?v=17`, `app.js?v=16`)

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
