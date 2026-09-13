# Lyads — Dossier de réalisation (handoff intégral)

**Destinataire :** agent de développement (Codex).
**Source de vérité :** les maquettes validées de ce dépôt. Le prototype `Prototype Lyads.dc.html` est la référence d'interaction ; les fichiers `Lot N - *.dc.html` sont la référence visuelle écran par écran.
**Langue de l'interface :** français. Tous les libellés cités dans ce document sont définitifs et doivent être reproduits **à l'identique**, ponctuation, espaces insécables et casse comprises.

---

## 0. Ce qu'est Lyads

Un agent d'optimisation publicitaire Meta pour les annonceurs d'Afrique de l'Ouest. Le produit se connecte au compte publicitaire, l'examine chaque jour, et propose des corrections chiffrées que l'utilisateur valide. Il génère aussi les créatives et les campagnes, analyse les résultats, et observe le marché.

Trois piliers, et cet ordre est structurant dans toute l'interface :

1. **Optimisation** — agent, règles automatisées, gestionnaire de publicités
2. **Création** — studio créatif, constructeur de campagne
3. **Intelligence** — analyse créative, intelligence marché, rapports

---

## 1. Pile technique attendue

| Élément | Choix | Raison |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript | rendu serveur pour le site public, référencement |
| Styles | Tailwind + `tokens.css` | `tailwind.config.js` fourni, mappé sur les jetons |
| État serveur | TanStack Query | invalidation après chaque action agent |
| État client | Zustand | compte actif, préférences, brouillons |
| Base | PostgreSQL + Prisma | livre de crédits transactionnel |
| Files d'attente | Redis + BullMQ | analyses, générations, synchronisations |
| Auth | e-mail + mot de passe, Google OAuth | conforme A4/A5 |
| Intégration | Meta Marketing API v21.0+ | lecture et écriture |
| Hébergement | UE | annoncé dans les mentions légales A7 |

**Interdit :** toute valeur de couleur, police, rayon ou espacement codée en dur. Uniquement les variables de `tokens.css`.

---

## 2. Jetons de design

Le fichier `tokens.css` de ce dossier est la source de vérité, à copier tel quel. Points saillants :

- **Primaire « Argile »** — `--ly-primary-600:#B44A26` pour toute action principale, `--ly-primary-700:#94391D` au survol.
- **Neutres « Sable » chauds** — `#FFFFFF` → `#0F0E0C`. Aucun gris froid.
- **Bleu « Agent » `--ly-agent-500:#3B4FD1`** — **usage exclusif : contenu produit par l'IA.** Jamais décoratif. C'est la convention qui permet à l'utilisateur de distinguer d'un coup d'œil ce qui vient de la machine.
- **Performance publicitaire** — jamais la couleur seule : toujours couleur + glyphe + mot. Six états : bon, à surveiller, mauvais, apprentissage, épuisé, en pause.
- **Typographie** — `Figtree` pour le texte, `Space Grotesk` pour tous les chiffres. Tout nombre comparable porte `font-variant-numeric: tabular-nums`.
- **Cible tactile** — `--ly-touch-min:48px`, jamais en dessous.

Thème sombre : les variables `[data-theme="dark"]` sont définies et doivent fonctionner dès la v1.

---

## 3. Inventaire complet des écrans

**70 écrans maquettés et validés.** Nomenclature : **A** = site public, **B** = entrée et configuration, **C** = application.
La colonne « Maquette » donne le fichier à ouvrir pour la référence visuelle. Toute divergence entre ce document et la maquette : **la maquette gagne**.

### A — Site public · 8 écrans

| Réf | Écran | Contenu validé | Maquette |
|---|---|---|---|
| A1 | Landing page | 12 sections : bandeau, en-tête à menu 3 entrées, accroche à titre rotatif + onglets, bande de crédibilité, chapeau, 3 blocs piliers, tarifs condensés, témoignages, appel final, pied de page. 3 formats : 375, 768, 1440 | `Lot 7 - A1 Landing page v2.dc.html` |
| A2 | Fonctionnalités | Un bloc par module dans l'ordre des piliers, capture d'interface, 3 cas d'usage écrits, ce qu'il remplace concrètement | `Lot 7 - Site public.dc.html` |
| A3 | Tarifs | 4 plans (gratuit au même rang), sélecteur FCFA/EUR/USD, table des coûts unitaires, simulateur de plan, tableau comparatif 24 lignes replié, moyens de paiement | `Lot 7 - Site public.dc.html` |
| A4 | Connexion | 4 éléments, « Mot de passe oublié » sur la ligne du libellé, Google OAuth, colonne d'état des services | `Lot 7 - Site public.dc.html` |
| A5 | Inscription | 4 champs, robustesse du mot de passe expliquée en direct, puis écran de vérification d'e-mail (expéditeur nommé, renvoi à 42 s) | `Lot 7 - Site public.dc.html` |
| A6 | Mot de passe oublié | 3 étapes : demande · confirmation neutre « si un compte existe » · nouveau mot de passe | `Lot 7 - Site public.dc.html` |
| A7 | Pages légales | 1 gabarit, 4 documents : mentions légales, CGU, confidentialité, cookies. Largeur de ligne bornée à 720 px | `Lot 7 - Site public.dc.html` |
| A8 | Contact et support | Formulaire, canaux, délais annoncés, renvoi vers la documentation | `Lot 7 - Site public.dc.html` |

### B — Entrée et configuration · 11 écrans

| Réf | Écran | Contenu validé | Maquette |
|---|---|---|---|
| B1 | Bienvenue | 4 promesses chiffrées, dont « gain estimé 42 000 FCFA sur 30 jours » | `Lot 6 - Onboarding Business Brain et Parametres.dc.html` |
| B2 | Permissions Meta | 4 permissions avec leur intitulé technique (`ads_management`, `ads_read`, `pages_show_list`, `business_management`) et leur conséquence en clair | idem |
| B3 | Business Manager | Liste des BM accessibles, dont un cas en **lecture seule** — « Sanou Retail Group » | idem |
| B4 | Compte publicitaire | Sélection, dont un compte **libellé en EUR non converti** — « Kola Export Europe » | idem |
| B5 | Page et Instagram | Sélection, dont un cas **sans compte Instagram lié** — « Kola Pro — grossistes » | idem |
| B6 | Pixel et événements | Vérification, dont un événement à **volume faible** — « InitiateCheckout », et « Prospect » signalé | idem |
| B7 | Business Brain · Offre | Ce que vous vendez, gamme, prix | idem |
| B8 | Business Brain · Audience | À qui, personas | idem |
| B9 | Business Brain · Objectifs | Objectif principal, CPA cible, budget mensuel | idem |
| B10 | Business Brain · Ton de marque | Registre, interdits de vocabulaire | idem |
| B11 | Business Brain · Récapitulatif | Complétude, ce qui manque, effet sur la qualité des générations | idem |

> Le CPA cible saisi en B9 **est** le seuil que l'agent utilise en C2.1 pour signaler les écarts. Le lien doit être réel dans le code, pas illustratif.

### C — Application · 51 écrans

#### C1 — Tableau de bord · 2 écrans

| Réf | Écran | Contenu validé | Maquette |
|---|---|---|---|
| C1.1 | Tableau de bord | 6 zones · 3 états (plein, vide, erreur) · alertes dont « Publicité rejetée par Meta » · abréviation des montants avec la valeur exacte en légende (`2,64 M` + `2 642 400 exact`) | `Lot 1 - C1.1 Tableau de bord.dc.html` |
| C1.2 | Sélecteur de compte | Multi-BM, multi-compte, recherche, devise par compte, mode consultation | `Lot 1 - C1.2 Selecteur de compte.dc.html` |

#### C2 — Agent d'optimisation · 2 écrans

| Réf | Écran | Contenu validé | Maquette |
|---|---|---|---|
| C2.1 | Fil des recommandations | 7 recommandations, 4 niveaux de gravité, fiabilité en %, **carte-mère groupée « 8 objets groupés »**, section « Traité aujourd'hui » | `Lot 1 - Partie 3 Agent d optimisation.dc.html` |
| C2.2 | Détail d'une recommandation | 4 blocs : constat · calcul avec base de mesure · ce que Lyads va faire · **tableau avant/après avec « Budget quotidien du compte inchangé »** · réversibilité 30 j | idem |

#### C3 — Gestionnaire de publicités · 3 écrans

| Réf | Écran | Contenu validé | Maquette |
|---|---|---|---|
| C3.1 | Tableau des campagnes | 9 colonnes par défaut sur 24 · **10 statuts de diffusion**, dont 4 seulement portent un filet gauche de 3 px (Apprentissage limité, Rejetée, Budget épuisé, Erreur) · barre de consommation du budget · provenance (agent, règle nommée, utilisateur, Meta) · ligne de totaux collée en bas | `Lot 2 - Tableau mobile et modele.dc.html` |
| C3.2 | Ensembles de publicités | Même modèle, 3 colonnes changent : campagne parente, audience, **indicateur d'apprentissage 0–50 avec phrase de pronostic** | idem |
| C3.3 | Publicités | **Deux modes** : tableau (comparer) et grille de vignettes 16:10 (juger). Sélection et actions en masse identiques dans les deux | idem |

> Arbitrage mobile du lot 2, à respecter : **cartes empilées, pas de tableau à colonne figée.** Les 4 tâches quotidiennes sont à un geste. La comparaison passe par la **métrique pilote** qui occupe le grand chiffre et ordonne la liste — 1 pilote + 2 secondaires, jamais plus de 3 chiffres par carte. Le mode « Comparer » (colonne figée) reste accessible depuis l'en-tête. Sélection multiple par appui long, en-tête sombre en mode sélection. 5 filtres rapides portant leur dénombrement.

#### C4 — Constructeur de campagne · 9 écrans

| Réf | Écran | Maquette |
|---|---|---|
| C4.1 | Choix du mode — agent ou manuel | `Lot 3 - Etape 1 Mode et brief.dc.html` |
| C4.2 | Brief et états | `Lot 3 - Etape 1 Mode et brief.dc.html` |
| C4.3 | Proposition de structure de l'agent | `Lot 3 - Etape 2 Proposition agent.dc.html` |
| C4.4 | Construction manuelle — campagne | `Lot 3 - Etape 3 Construction manuelle.dc.html` |
| C4.5 | Ensembles et ciblage | `Lot 3 - Etape 3 Construction manuelle.dc.html` |
| C4.6 | Publicités et créatives | `Lot 3 - Etape 3 Construction manuelle.dc.html` |
| C4.7 | Récapitulatif et contrôles avant publication | `Lot 3 - Etape 4 Apercu et publication.dc.html` |
| C4.8 | Prévisualisation multi-placements | `Lot 3 - Etape 4 Apercu et publication.dc.html` |
| C4.9 | Publication et suivi | `Lot 3 - Etape 4 Apercu et publication.dc.html` |

États et déclinaisons : `Lot 3 - Etape 5 Etats.dc.html` · `Lot 3 - Etape 6 Tablette 768.dc.html` · `Lot 3 - Etape 7 Mobile 375.dc.html`

#### C5 — Studio créatif · 7 écrans

| Réf | Écran | Maquette |
|---|---|---|
| C5.1 | Point de départ et brief créatif | `Lot 4 - Studio et Analyse creative.dc.html` |
| C5.2 | Génération de textes | idem |
| C5.3 | Génération de visuels | idem |
| C5.4 | Génération de vidéos courtes | idem |
| C5.5 | Galerie de résultats | idem |
| C5.6 | Retouche et déclinaisons | idem |
| C5.7 | Envoi vers une campagne | idem |

#### C6 — Analyse créative · 6 écrans

| Réf | Écran | Maquette |
|---|---|---|
| C6.1 | Classement des créatives | `Lot 4 - Studio et Analyse creative.dc.html` |
| C6.2 | Détail d'une créative | idem |
| C6.3 | Analyse par éléments | idem |
| C6.4 | Fatigue et cycle de vie | idem |
| C6.5 | Comparaison de variantes | idem |
| C6.6 | Recommandations créatives | idem |

Déclinaisons : `Lot 4 - Tablette 768.dc.html` · `Lot 4 - Mobile 375.dc.html`

#### C7 — Règles automatisées · 3 écrans

| Réf | Écran | Contenu validé | Maquette |
|---|---|---|---|
| C7.1 | Liste des règles actives | État, dernière exécution, nombre d'objets touchés | `Lot 1 - Partie 3 Agent d optimisation.dc.html` |
| C7.2 | Constructeur de règle | SI / ALORS, **garde-fou empêchant deux règles de se contredire** | idem |
| C7.3 | Historique d'exécution | Ce qui a été modifié, par quelle règle, annulable 30 j | idem |

#### C8 — Intelligence marché · 8 écrans

| Réf | Écran | Maquette |
|---|---|---|
| C8.1 | Recherche de publicités | `Lot 5 - Intelligence marche et Rapports.dc.html` |
| C8.2 | Résultats et filtres | idem |
| C8.3 | Détail d'une publicité concurrente | idem |
| C8.4 | Angles et messages — occupés et libres | idem |
| C8.5 | Suivi d'un concurrent | idem |
| C8.6 | Alertes de marché | idem |
| C8.7 | Synthèse sectorielle | idem |
| C8.8 | États et limites de la source | idem |

#### C9 — Rapports · 5 écrans

| Réf | Écran | Maquette |
|---|---|---|
| C9.1 | Liste des rapports | `Lot 5 - Intelligence marche et Rapports.dc.html` |
| C9.2 | Composition d'un rapport | idem |
| C9.3 | Personnalisation et marque du client | idem |
| C9.4 | Envoi et planification | idem |
| C9.5 | Vue publique partagée — lien en lecture seule | idem |

#### C10 — Facturation, crédits, paramètres · 6 écrans

| Réf | Écran | Maquette |
|---|---|---|
| C10.1 | Plan et changement de plan | `Lot 6 - Onboarding Business Brain et Parametres.dc.html` |
| C10.2 | Solde de crédits et consommation | idem |
| C10.3 | Rachat de crédits | idem |
| C10.4 | Moyens de paiement et factures | idem |
| C10.5 | Utilisateurs et accès par compte | idem |
| C10.6 | Intégrations et révocation d'accès Meta | idem |

### Référence d'interaction

| Fichier | Rôle |
|---|---|
| `Prototype Lyads.dc.html` | prototype navigable — parcours d'entrée complet, agent en interaction réelle, gestionnaire C3.1–C3.3, état persistant, outils de démonstration |
| `Prototype Lyads - autonome.html` | même prototype en fichier unique hors connexion, à héberger tel quel |
| `Lot 1 - Coquille applicative.dc.html` | coquille : 3 largeurs de barre, 6 groupes de navigation, 5 bandeaux système |
| `Directions Design System.dc.html` | explorations de direction visuelle, pour contexte |
| `Lyads Design System.dc.html` | catalogue des composants |

## 4. Coquille applicative

Référence : `Lot 1 - Coquille applicative.dc.html`.

### Barre latérale — trois largeurs

- **240 px** — déployée, libellés visibles. Par défaut au-delà de 1024 px.
- **64 px** — réduite, icônes seules, infobulle au survol. Choix mémorisé par utilisateur.
- **Masquée** — en dessous de 768 px, remplacée par les onglets du bas.

### Groupes de navigation, dans cet ordre

1. **Tableau de bord** (hors groupe)
2. **Agent** (hors groupe, avec compteur de recommandations en attente)
3. **Campagnes** — Gestionnaire de publicités, Constructeur de campagne
4. **Créatif** — Studio créatif, Analyse créative
5. **Pilotage** — Règles automatisées, Analyse marché, Rapports
6. Pied de barre — **Business Brain**, jauge de crédits, **Paramètres**

### Onglets mobiles — cinq, dans cet ordre

Bord · Agent · Publicités · Rapports · Plus

« Plus » ouvre une feuille glissante contenant les six destinations restantes. Aucune destination ne doit être inatteignable en mobile.

### En-tête

Sélecteur de compte à gauche (C1.2), cloche de notifications, avatar. La cloche ouvre le fil de l'agent.

### Cinq bandeaux système

À implémenter comme une file d'attente, un seul visible à la fois, dans cet ordre de priorité :

1. **Connexion Meta interrompue** — rouge, bouton « Reconnecter »
2. **Mode consultation** — accès en lecture seule accordé par un tiers
3. **Solde de crédits faible** — sous 15 % du plan
4. **Synchronisation en cours** — après reconnexion
5. **Maintenance planifiée** — annonce datée

---

## 5. Modèle d'état du prototype

Le prototype persiste son état dans `localStorage` sous la clé `lyads-proto-v1`. En production, remplacer par la base. Les champs et leur signification :

```
route       écran courant — landing | signup | verify | login | forgot | pricing |
            legal | connect | onboarding | dashboard | agent | reco | module
plan        free | pro          (bascule de démonstration)
ds          full | empty | error (état des données : plein, vide, erreur)
onb         index d'étape du Business Brain (0..2)
doneIds     identifiants des recommandations traitées
curId       recommandation ouverte
mod         module affiché
cur         devise : 0 = FCFA, 1 = EUR, 2 = USD
glow        pulsation | survol  (variante de lueur des boutons, à trancher)
rotation    rotation du titre de l'accroche, activée ou non
```

**Règle de comportement à reproduire :** valider une recommandation la retire du fil, l'ajoute à « Traité aujourd'hui », décrémente le compteur du menu et de la cloche, et affiche un message de confirmation nommant l'effet obtenu — jamais un « Enregistré » générique.

---

## 6. Le cœur du produit : l'agent

### Fil des recommandations (C2.1)

Sept recommandations types, classées par gravité : **Critique · Élevée · Moyenne · Faible**. Chaque carte porte :

- une pastille de gravité
- un **niveau de fiabilité en pourcentage**, annoncé d'emblée
- un titre d'une phrase, sans jargon
- une phrase de conséquence chiffrée

**Carte-mère groupée :** quand plusieurs objets subissent la même correction, une seule carte les regroupe — libellé « 8 objets groupés » — et le détail les énumère. Ne pas produire huit cartes identiques.

### Détail d'une recommandation (C2.2)

Quatre blocs, dans cet ordre, et cet ordre est le produit :

1. **Le constat** — une phrase, ce qui va mal
2. **Le calcul** — trois métriques : valeur actuelle, valeur projetée, gain estimé ; puis **la base de mesure en clair** (« Estimation fondée sur le revenu horaire moyen des 7 derniers jours, appliqué aux 14 heures d'arrêt »)
3. **Ce que Lyads va faire** — les modifications exactes, énumérées avant validation
4. **Tableau avant / après** — avec la mention explicite de ce qui **ne** change **pas** : « Budget quotidien du compte inchangé »

Deux actions : **Valider et appliquer** / **Ignorer**. Plus la mention de réversibilité : toute action est annulable depuis l'historique pendant 30 jours.

**Non négociable :** aucune recommandation ne s'applique sans passage par cet écran. Pas de validation en masse depuis le fil.

---

## 7. Crédits

### Coûts unitaires — à implémenter comme table de configuration

| Action | Crédits |
|---|---|
| Analyse complète d'un compte | 8 |
| Génération d'un texte publicitaire | 1 |
| Génération d'une image | 8 |
| Génération d'une vidéo courte | 45 |
| Analyse de marché · 120 publicités | 48 |
| Publication d'une campagne | 2 |
| Rapport généré et partagé | 3 |

### Plans

| Plan | FCFA | EUR | USD | Crédits | Comptes | Utilisateurs |
|---|---|---|---|---|---|---|
| Gratuit | 0 | 0 | 0 | 60 | 1 | 1 |
| Essentiel | 9 900 | 15 | 16 | 500 | 2 | 1 |
| **Pro** *(recommandé)* | 24 900 | 38 | 41 | 1 500 | 5 | 2 |
| Agence | 59 900 | 91 | 99 | 5 000 | illimités | 5 |

### Règles du livre de crédits

- Les crédits **expirent à l'échéance mensuelle**, ils ne se cumulent pas.
- Rachat en cours de mois possible, au même tarif.
- **Aucun crédit débité si une génération échoue de notre côté.** À implémenter comme transaction compensatoire, pas comme absence de débit.
- Résiliation à tout moment, accès conservé jusqu'à la fin de la période payée.
- Le coût est **affiché avant** chaque lancement de génération, jamais découvert après.

### Paiement

Wave · Orange Money · MTN MoMo · Carte bancaire. **Mobile Money au même rang visuel que la carte bancaire**, jamais en second choix.

---

## 8. Devises

Trois devises : **FCFA, EUR, USD**. Le sélecteur est présent sur A1, A3 et la facturation.

**Règle stricte :** un compte publicitaire libellé en EUR **n'est jamais converti**. Les montants s'affichent dans la devise réelle du compte, et la devise est toujours écrite à côté du nombre. Le cas est validé en maquette sous le nom « Kola Export Europe ».

Format des nombres : espace insécable comme séparateur de milliers (`486 200 FCFA`), virgule décimale (`2,84`). Les grands montants sont abrégés avec la valeur exacte en légende : `2,64 M` + `2 642 400 exact`.

---

## 9. Animations

Contrainte de conception : **connexions lentes, appareils modestes.** CSS uniquement, aucune bibliothèque d'animation, aucune vidéo d'arrière-plan.

| Animation | Rendu | Détail |
|---|---|---|
| Titre à rotation (A1) | `@keyframes` opacité + translation | 3 phrases, ~4 s chacune, hauteur du bloc réservée sur la plus longue |
| Lueur des boutons | `box-shadow` animée | **deux variantes livrées, à trancher :** halo en pulsation permanente, ou intensification au survol |
| Apparition au défilement | `IntersectionObserver` + classe | une seule fois, sans rejeu |
| Captures animées | séquences CSS | fil qui se remplit, grille qui apparaît, courbe qui se trace |
| Survol des captures | `transform: translateY(-3px)` | légère élévation |

**Interdits :** défilement détourné, parallaxe, animations qui bloquent la lecture, animations qui rejouent à chaque passage.

**`prefers-reduced-motion`** doit couper toutes les animations et figer le titre sur la première phrase.

> Piège rencontré en prototype, à ne pas reproduire : une animation dont l'image à 0 % est `opacity:0` rend l'élément invisible tant que l'animation n'a pas démarré. Utiliser un `animation-delay` négatif pour que t=0 tombe dans la phase visible, ou partir de l'état visible.

---

## 10. Accessibilité

- Contraste : **4,5:1** pour le texte courant, 3:1 accepté uniquement à l'échelle des titres.
- `--ly-text-disabled:#C0BBB2` est **décoratif** : ne jamais y porter de texte utile.
- La performance n'est jamais signalée par la couleur seule.
- Cible tactile minimale 48 px.
- Anneau de focus visible partout : `--ly-focus-ring`.
- Navigation clavier complète sur le gestionnaire de publicités et le constructeur de campagne.

---

## 11. Contenu — règles absolues

Ces règles ont gouverné toute la conception. Les enfreindre invaliderait les maquettes.

1. **Aucun contenu fictif.** Ni statistique, ni témoignage, ni logo, ni note inventés. Les emplacements sont laissés vides et **marqués comme à compléter** — notamment le badge partenaire Meta, les logos clients, la note d'avis, et les huit à dix témoignages de A1.
2. **Aucune promesse de résultat chiffrée.** Pas de pourcentage de gain, pas de multiplicateur de ROAS dans le discours commercial. Les chiffres n'apparaissent que comme estimations d'un cas précis, avec leur base de calcul.
3. **Densité basse sur le site public.** Étiquette, titre, paragraphe court, capture, bouton. Pas de liste à puces dans les blocs piliers.
4. **Montrer le produit plutôt que le décrire.** Les fonctionnalités sont montrées par des captures d'interface réelles, jamais par des illustrations abstraites.
5. **Données de démonstration plausibles** — comptes `Kola Beauté`, `Kola Distribution`, `Kola Export Europe`, `Kola Pro — grossistes`, `Sanou Retail Group` ; persona `Aminata Diallo` ; campagnes `Promo Tabaski — Carrousel`, `Karité — Vidéo 15 s`, `Acquisition Large 25-45`, `Retargeting 30 j`.
6. **Français, vocabulaire accessible.** Pas de jargon publicitaire non expliqué.

---

## 12. Sécurité et confidentialité

- **Ne jamais révéler qu'un compte existe.** A6 affiche « Si un compte existe, le lien est parti », et l'écran explique pourquoi. C'est ce qui empêche l'énumération d'adresses.
- Lien de réinitialisation : expire en 1 heure, usage unique, compte à rebours de 42 s avant renvoi.
- Expéditeur nommé dans l'interface : `noreply@lyads.app`.
- Robustesse du mot de passe : 12 caractères, une majuscule, un chiffre — les trois règles affichées et cochées en direct.
- Permissions Meta énoncées avec leur intitulé technique (`ads_management`, `ads_read`, `pages_show_list`, `business_management`) et leur conséquence en clair.
- Promesse affichée sous le bouton de connexion Meta : **« Lyads ne publie jamais sans votre accord. »** Elle doit être vraie dans le code.
- Révocation d'accès possible à tout moment depuis les paramètres.
- Hébergement des données dans l'Union européenne, sous-traitants listés dans la politique de confidentialité.

---

## 13. Ordre de réalisation

1. **Socle** — jetons, coquille applicative, thème sombre, sélecteur de compte, les cinq bandeaux
2. **Authentification** — A4, A5, A6, plus la connexion Meta B1–B2
3. **Configuration** — B3–B6, puis Business Brain B7–B11
4. **Lecture** — tableau de bord C1.1 avec ses trois états, gestionnaire C3
5. **Le cœur** — agent C2.1 et C2.2, livre de crédits, historique annulable 30 jours
6. **Automatisation** — règles C7 avec le garde-fou anti-contradiction
7. **Création** — constructeur C4 (9 écrans), studio C5
8. **Intelligence** — analyse créative C6, marché C8, rapports C9
9. **Site public** — A1, A2, A3, A7, A8, rendus côté serveur
10. **Facturation** — C10, paiements Mobile Money et carte

Les étapes 1 à 5 constituent un produit utilisable. Les livrer avant d'ouvrir le chantier de création.

---

## 14. Critères de recette

Un écran est accepté quand :

- il ne contient **aucune valeur codée en dur** hors jetons ;
- ses **trois états** existent — plein, vide, erreur — et sont atteignables ;
- il fonctionne à **375, 768, 1024 et 1440 px** sans débordement ni chevauchement ;
- il fonctionne au **clavier seul** et l'anneau de focus est visible ;
- il respecte `prefers-reduced-motion` ;
- ses **libellés sont identiques** à ceux de la maquette validée ;
- ses nombres sont en `Space Grotesk` avec `tabular-nums`, et les montants portent leur devise ;
- **aucun bouton n'est une impasse** : toute destination répond.

---

## 15. Ce qui reste à trancher

À remonter au client, pas à décider seul :

1. **Variante de lueur** — pulsation permanente ou intensification au survol. Les deux sont implémentées dans le prototype, réglables depuis sa barre d'outils.
2. **Textes juridiques définitifs** des quatre documents A7 — seul le gabarit est validé.
3. **Témoignages, logos clients, badge partenaire Meta, note d'avis** — emplacements prévus, contenu à fournir.
4. **Seuils de déclenchement** des règles automatisées par défaut.

---

## 16. Fichiers de ce dossier

| Fichier | Rôle |
|---|---|
| `HANDOFF_CODEX.md` | ce document — 16 sections, inventaire des 70 écrans |
| `DESIGN_SYSTEM.md` | spécification complète des composants |
| `tokens.css` | jetons canoniques, à copier tel quel |
| `tailwind.config.js` | configuration Tailwind mappée sur les jetons |
| `Lyads Design System.dc.html` | catalogue visuel des composants |
| `CLAUDE.md` | règles projet |
| `README.md` | mise en route |
