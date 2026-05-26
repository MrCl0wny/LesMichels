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
├── index.html          → Structure de la page + modal connexion Google + scripts Firebase
├── style.css           → Thème sombre, mise en forme, badge utilisateur
├── app.js              → Logique complète (auth, bingo, tierlist, Firebase temps réel)
├── 404.html            → Page d'erreur Firebase Hosting
├── firebase.json       → Configuration Firebase Hosting
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
- **Badge utilisateur** : affiché en bas à droite avec photo de profil, nom et bouton de déconnexion
- **Synchronisation** : toutes les modifications sont répercutées instantanément sur tous les appareils connectés, sans refresh

---

## ✅ Fonctionnalités réalisées

### Temps réel & multi-utilisateurs (Mai 2026)

- [x] **Synchronisation Firebase** : toutes les modifications de bingo sont enregistrées dans Firebase Realtime Database, les modifications de tierlist sont pour le moment enregistrées en LocalStorage
- [x] **Temps réel** : les changements apparaissent instantanément sur tous les appareils sans refresh
- [x] **Multi-utilisateurs** : tous les participants peuvent interagir et modifier simultanément
- [x] **Invisible des moteurs de recherche** : balise `noindex` + header HTTP `X-Robots-Tag`
- [x] **Authentification Google** : connexion obligatoire via compte Google (Firebase Auth) — modal de connexion bloque l'accès si non connecté
- [x] **Badge utilisateur** : affiché en bas à droite avec photo de profil Google, nom et bouton déconnexion
- [x] **Accès sécurisé** : règles Firebase Realtime Database limitées aux utilisateurs authentifiés uniquement

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

### Bingo (v10 — Mai 2026)

#### Panneau de contrôle unifié
- [x] **Thèmes, grilles et barre d'outils regroupés** dans un seul panneau en haut — rétractable d'un clic (▲/▼)
- [x] Trois lignes : Thème / Grille / contrôles (Taille, Texte, Bloquer, Générer, Reset, Capture)

#### Thèmes
- [x] **Thèmes de soirée** : l'utilisateur crée autant de thèmes qu'il veut — nom par défaut "Thème N" (modifiable), chacun avec ses propres cases et grilles
- [x] Onglets de thèmes épurés (nom uniquement, sans icônes)
- [x] **Double-clic sur un thème** → menu contextuel clair : Renommer / Dupliquer / Archiver
- [x] **Réordonner les thèmes par glisser-déposer** : faire glisser un onglet de thème pour changer son ordre
- [x] Archivage d'un thème (disparaît de la barre principale)
- [x] **Bouton "📦 Thèmes archivés"** : affiche un modal listant les thèmes archivés avec options restaurer / supprimer
- [x] Suppression définitive d'un thème uniquement depuis la modal "Thèmes archivés" (sécurité anti-missclic)
- [x] Sauvegarde automatique dans Firebase

#### Cases (propres au thème actif)
- [x] Ajout d'une case (bouton ou touche Entrée)
- [x] **Double-clic sur une case** → édition inline directe (plus besoin du bouton ✏)
- [x] Archivage d'une case active (bouton 📦) — disparaît de la liste active
- [x] Restauration d'une case archivée (onglet "Archivées")
- [x] **Suppression définitive uniquement depuis l'onglet "Archivées"** (sécurité anti-missclic)
- [x] Onglets **Actives** / **Archivées**
- [x] Compteur de cases actives
- [x] **Panneau Cases rétractable** : bouton ◀/▶ toujours accessible même panneau réduit, libérant l'espace pour la grille

#### Grilles (propres au thème actif)
- [x] Plusieurs grilles par thème (onglets) — **nom demandé à la création** via modal
- [x] Taille variable de **3×3 à 5×5**, modifiable à tout moment — **taille par défaut : 4×4**
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
- [x] **Barre d'outils sur une seule ligne** : Taille, Texte, séparateur, puis Bloquer / Générer / Reset / Capture
- [x] **Bloquer** (toolbar) : empêche la génération **et le reset** global — chaque grille a aussi son propre verrou
- [x] **Bouton Générer** : placement aléatoire depuis les cases actives du thème
- [x] **Cases cochées persistantes** : les cases déjà cochées conservent leur état lors d'une regénération (même sur les nouvelles grilles générées entre temps)
- [x] **Bouton Reset** : décoche toutes les cases de toutes les grilles (y compris non affichées) — demande confirmation avant d'agir
- [x] **Valider une case = valider pour toutes les grilles** : cocher/décocher un élément l'applique à toutes les grilles non archivées, qu'elles soient affichées ou non
- [x] Clic sur une case = coche / décoche

#### Contrôles par grille (multi-grilles)
- [x] **Contrôles indépendants par grille** (ordre : Bloquer | Générer | Capture) :
  - 🔒 Bloquer/débloquer la génération de cette grille
  - 🎲 Générer uniquement cette grille
  - 📷 Copier cette grille dans le presse-papier
- [x] **Boutons globaux** (toolbar principale) agissent sur **toutes** les grilles non archivées :
  - Bloquer toutes, Générer toutes, Reset toutes (avec confirmation), Capturer toutes (presse-papier)

#### Affichage de la grille
- [x] **Hauteur fixe à 60% de la hauteur de l'écran**
- [x] **Séparation visuelle distincte** : en mode multi-grilles, chaque grille est encadrée indépendamment (fond, bordure, ombre) pour les distinguer clairement
- [x] **Titre personnalisé par grille** : champ de saisie au-dessus de chaque grille — synchronisé avec le nom de l'onglet
- [x] **Zoom texte local** : boutons +/- pour agrandir ou réduire la taille du texte — réglage propre à chaque navigateur
- [x] Police fixée à **Arial** pour tous les textes des cases
- [x] Taille de texte adaptative selon la longueur du texte
- [x] **Détection bingo** sur lignes, colonnes et les deux diagonales
- [x] **Lignes complétées affichées en vert clair** (animations pulse)
- [x] **Message bingo par grille** : affiché sous chaque grille concernée indépendamment
- [x] **Capture** : copie la grille dans le presse-papier + **son de confirmation** au succès

---

## 🔜 À faire

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
- Firebase SDK chargé via CDN (version 10.12.2 compat) — modules `app`, `database`, `auth`
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
