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

## 3. Carte des écrans

Nomenclature : **A** = site public, **B** = entrée et configuration, **C** = application.

### Site public (A)

| Réf | Écran | Maquette |
|---|---|---|
| A1 | Landing page | `Lot 7 - A1 Landing page v2.dc.html` |
| A2 | Fonctionnalités | `Lot 7 - Site public.dc.html` |
| A3 | Tarifs | `Lot 7 - Site public.dc.html` |
| A4 | Connexion | `Lot 7 - Site public.dc.html` |
| A5 | Inscription + vérification e-mail | `Lot 7 - Site public.dc.html` |
| A6 | Mot de passe oublié (3 étapes) | `Lot 7 - Site public.dc.html` |
| A7 | Pages légales (4 documents, 1 gabarit) | `Lot 7 - Site public.dc.html` |
| A8 | Contact et support | `Lot 7 - Site public.dc.html` |

### Entrée et configuration (B)

| Réf | Écran | Maquette |
|---|---|---|
| B1 | Bienvenue et promesses chiffrées | `Lot 6 - Onboarding Business Brain et Parametres.dc.html` |
| B2 | Permissions Meta détaillées | idem |
| B3 | Sélection du Business Manager | idem |
| B4 | Sélection du compte publicitaire | idem |
| B5 | Sélection de la page et du compte Instagram | idem |
| B6 | Vérification du pixel et des événements | idem |
| B7–B11 | Business Brain : offre, audience, objectifs, ton, récapitulatif | idem |

### Application (C)

| Réf | Module | Écrans | Maquette |
|---|---|---|---|
| C1.1 | Tableau de bord | 6 zones, 3 états | `Lot 1 - C1.1 Tableau de bord.dc.html` |
| C1.2 | Sélecteur de compte | — | `Lot 1 - C1.2 Selecteur de compte.dc.html` |
| C2.1–C2.2 | Agent d'optimisation | fil + détail | `Lot 1 - Partie 3 Agent d optimisation.dc.html` |
| C3.1–C3.3 | Gestionnaire de publicités | 3 | `Lot 2 - Tableau mobile et modele.dc.html` |
| C4.1–C4.9 | Constructeur de campagne | 9 | `Lot 3 - Etape 1..7 *.dc.html` |
| C5.1–C5.7 | Studio créatif | 7 | `Lot 4 - Studio et Analyse creative.dc.html` |
| C6.1–C6.6 | Analyse créative | 6 | idem |
| C7.1–C7.3 | Règles automatisées | 3 | `Lot 1 - Partie 3 Agent d optimisation.dc.html` |
| C8.1–C8.8 | Intelligence marché | 8 | `Lot 5 - Intelligence marche et Rapports.dc.html` |
| C9.1–C9.5 | Rapports | 5 | idem |
| C10 | Facturation, crédits, paramètres | — | `Lot 6 - Onboarding Business Brain et Parametres.dc.html` |

Déclinaisons responsives validées : `Lot 3 - Etape 6 Tablette 768`, `Lot 3 - Etape 7 Mobile 375`, `Lot 4 - Tablette 768`, `Lot 4 - Mobile 375`.

---

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
| `HANDOFF_CODEX.md` | ce document |
| `DESIGN_SYSTEM.md` | spécification complète des composants |
| `tokens.css` | jetons canoniques, à copier tel quel |
| `tailwind.config.js` | configuration Tailwind mappée sur les jetons |
| `Lyads Design System.dc.html` | catalogue visuel des composants |
| `CLAUDE.md` | règles projet |
| `README.md` | mise en route |
