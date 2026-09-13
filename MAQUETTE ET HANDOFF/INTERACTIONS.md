# INTERACTIONS.md — comportement attendu, référence par référence

Complète `HANDOFF_CODEX.md` (le quoi) et `SCREENS_MANIFEST.csv` (où le trouver) par le comment.

**Convention de lecture.** « Attendu » = comportement établi par une maquette ou par le prototype. « **Point ouvert** » = comportement jamais défini ; à décider, pas à deviner. Aucun comportement marqué « attendu » n'a été inventé pour combler un vide.

---

## 0. Règles transversales

### États d'interaction, sur tout composant actionnable

| État | Traitement |
|---|---|
| repos | jeton de rôle nominal |
| survol | `filter: brightness(1.06)` sur les boutons pleins ; fond `--ly-neutral-100` sur les éléments de liste ; élévation `--ly-e2` sur les cartes cliquables |
| focus | anneau `--ly-focus-ring`, 2 px, visible au clavier — jamais supprimé |
| pressé | `--ly-action-active`, pas de déplacement de mise en page |
| désactivé | opacité conservée, `cursor: not-allowed`, **et une raison lisible à côté** — un bouton désactivé sans explication est un défaut |
| chargement | le libellé reste, un `ph-circle-notch` tourne à sa gauche, largeur figée |
| succès | message de confirmation nommant l'effet obtenu, 3 s |
| vide | icône, titre, une phrase de cause, une action de sortie |
| erreur | ce qui a échoué, pourquoi, ce que l'utilisateur peut faire |

**Interdit :** un message « Enregistré » générique. Chaque confirmation nomme son effet — « Budget rechargé · diffusion reprise », « 180 000 FCFA réalloués ».

### Saisie

- Validation **à la sortie du champ**, jamais à la frappe, sauf la robustesse du mot de passe (A5, A6) qui se met à jour en direct.
- Message d'erreur sous le champ, en `--ly-error`, et le champ prend une bordure `--ly-error`. Jamais la couleur seule : le texte porte l'information.
- **Brouillons conservés** pour le constructeur de campagne (C4.2 à C4.7), le brief créatif (C5.1) et le Business Brain (B7). Sortie sans enregistrer → demande de confirmation.
- Montants : séparateur de milliers par espace insécable, virgule décimale, devise **toujours** écrite à côté du nombre.
- **Point ouvert :** délai d'enregistrement automatique des brouillons, et durée de conservation.

### Formats et adaptations

Maquettes distinctes à **375** et **1440** partout ; **768** pour les lots 3 et 4 ; **1024** n'a **aucune maquette dédiée**. Règles d'adaptation à appliquer, non validées par une maquette :

| Largeur | Barre latérale | Tableaux | Panneaux | Actions |
|---|---|---|---|---|
| 1440 et + | 240 px déployée | 9 colonnes, totaux collés en bas | latéral 640 px | en ligne |
| 1024–1439 | 64 px réduite, infobulle au survol | 6 colonnes, les 3 retirées passent sur une 2ᵉ ligne sous le nom (ligne 52 → 66 px) | latéral 560 px | en ligne |
| 768–1023 | 64 px réduite | 6 colonnes, deux niveaux par ligne — **maquetté pour les lots 3 et 4** | latéral 560 px | en ligne |
| < 768 | masquée, 5 onglets en bas | cartes empilées, métrique pilote | plein écran | barre d'action collée en bas |

**N'annoncer comme validé que 375, 768 et 1440.** 1024 est une règle d'adaptation, pas une maquette.

---

## 1. Site public

### A1 · Landing page
- **Titre à rotation** : 3 phrases, ~4 s chacune, en boucle, hauteur du bloc réservée sur la plus longue. `prefers-reduced-motion` → phrase 1 figée.
- **En-tête** : « Fonctionnalités » ouvre le méga-menu ; ses trois entrées défilent chacune vers **son** bloc pilier. « Tarifs » → A3. « Connexion » → A4. « Créer un compte » → A5. Le logo revient en haut.
- **Onglets de l'accroche** : Optimisation · Création · Intelligence changent la capture affichée sans recharger.
- **Apparition au défilement** des blocs piliers : une seule fois, sans rejeu.
- **Emplacements vides et marqués** : badge partenaire Meta, logos clients, note d'avis, 8 à 10 témoignages.
- **Point ouvert :** destination du bandeau supérieur d'annonce.

### A3 · Tarifs
- Sélecteur **FCFA / EUR / USD** : change les prix affichés, **ne convertit rien** — trois grilles distinctes.
- Tableau comparatif **replié par défaut**, 24 lignes.
- Simulateur : trois entrées (budget, comptes, créatives/mois) → un plan recommandé **et son calcul**. Aucune donnée enregistrée.
- Tout bouton de plan → A5.

### A4 · Connexion
- Erreur d'identifiants : message unique, **sans préciser si l'adresse existe**.
- « Rester connecté » cochée par défaut.
- **Point ouvert :** verrouillage après N tentatives.

### A5 · Inscription
- Robustesse du mot de passe en direct, 3 niveaux, et les trois règles cochées une à une : 12 caractères, une majuscule, un chiffre.
- Puis **vérification d'e-mail** : expéditeur nommé `noreply@lyads.app`, mention des indésirables, renvoi possible après **42 s** de compte à rebours.
- Lien de vérification ouvert → B1.

### A6 · Mot de passe oublié — 3 étapes
1. Demande → toujours le même message, quelle que soit l'adresse.
2. « Si un compte existe, le lien est parti ». Lien valable **1 heure, usage unique**. Renvoi après 42 s.
3. Nouveau mot de passe, mêmes trois règles → A4.

### A7 · Pages légales
Gabarit à **720 px** de largeur de ligne, hiérarchie de titres à deux niveaux, 4 onglets. **Textes à fournir.**

### A2, A8
Maquettés, non assemblés. Comportement attendu : A2 → chaque bloc de module renvoie à A5 ; A8 → formulaire avec accusé de réception et délai annoncé.

---

## 2. Mise en route — B1 à B6

- **Parcours linéaire à 6 étapes**, progression visible, retour possible, sortie possible à partir de B2 (« Ignorer ») qui mène directement à B7.
- **B2 · Connexion Meta** : les quatre permissions nommées avec leur intitulé technique et leur conséquence. La promesse « Lyads ne publie jamais sans votre accord » est sous le bouton — **elle doit être vraie dans le code**. Permissions refusées → écran dédié, pas une impasse.
- **B3** : un Business Manager en **lecture seule** reste sélectionnable, et déclenche le bandeau « Mode consultation » dans toute l'application.
- **B4** : un compte en **EUR** garde sa devise, aucune conversion. Un compte sans historique → B6 signale que l'analyse ne sera pas disponible avant 7 jours de diffusion.
- **B5** : une page **sans Instagram lié** est sélectionnable ; les placements Instagram seront alors indisponibles en C4.5.
- **B6** : pixel inactif ou événement à **volume faible** (< 50 conversions hebdomadaires) → avertissement explicite, sans blocage.
- **Point ouvert :** que se passe-t-il si l'utilisateur révoque l'accès Meta en cours de parcours ?

## 3. Business Brain — B7 à B11, C10.1 à C10.3

- **B7** formulaire, ou **B8** analyse automatique du site : 40 secondes, progression par étape nommée, échec → repli sur B7 sans perte de saisie.
- **B9** récapitulatif : 24 informations, celles **déduites du site** sont distinguées de celles saisies, les **manquantes** sont listées avec leur effet sur la qualité des générations.
- **B10** choix du plan et paiement — 4 plans, gratuit au même rang, échec de paiement traité.
- **B11** : ce qui est connecté, ce qui manque, la première action proposée.
- **C10.1 à C10.3** : le même contenu **en consultation hors onboarding**, avec l'historique des modifications (24 dont 9 par l'agent) et l'annulation.
- **Lien structurant à implémenter réellement :** le **CPA cible** saisi ici est le seuil que l'agent compare en C2.1. Le modifier change les recommandations au prochain calcul.

## 4. Tableau de bord — C1.1, C1.2

- Six zones. **Quatre états** : plein, vide, erreur Meta, données en retard (voir DECISIONS § 8).
- Montants abrégés avec la valeur exacte en légende : `2,64 M` + `2 642 400 exact`.
- Le CPA affiche sa **cible** à côté de la valeur.
- Chaque alerte est cliquable et mène à l'objet concerné, y compris « Publicité rejetée par Meta ».
- **C1.2 · sélecteur** : multi-BM, recherche, devise par compte, mention du rôle. Changer de compte **recharge tout le contexte** ; un compte en lecture seule déclenche le bandeau de consultation.

## 5. Agent — C2.1 à C2.5

### Cycle de vie d'une recommandation
`proposée → appliquée` ou `ignorée`, et `appliquée → annulée` pendant **7 jours**.

| Action | Effet |
|---|---|
| **Valider** (C2.2 → C2.3 → confirmer) | quitte le fil · entre dans « Traité aujourd'hui » avec la mention **appliquée** · décrémente les compteurs de la barre et de la cloche · message nommant l'effet · entre dans l'historique C2.4 comme **appliquée** |
| **Ignorer** | quitte le fil · entre dans l'historique C2.4 comme **ignorée** · message « Recommandation ignorée » · **ne doit jamais apparaître comme appliquée** |
| **Annuler** (depuis C2.4, ≤ 7 j) | l'action est défaite sur Meta · l'historique conserve les trois lignes : appliquée, annulée, et par qui |

- **C2.1** : tri par gravité, fiabilité en %, **carte-mère groupée** quand plusieurs objets subissent la même correction — le détail les énumère, jamais N cartes identiques.
- **C2.2** : quatre blocs dans cet ordre — constat · calcul avec **base de mesure en clair** · ce que Lyads va faire · tableau avant/après **avec ce qui ne change pas**.
- **C2.3** : dernier point avant écriture. 4 variantes (budget, pause, ciblage, créative), structure identique : ce qui change, avant → après, portée, conséquence, coût en crédits.
- **Non négociable :** aucune application sans passage par C2.2 puis C2.3. **Pas de validation en masse depuis le fil.**
- **C2.4** : compare le gain **réel** au gain **estimé**. C'est ce qui rend l'agent vérifiable.
- **C2.5** : objectifs de performance, seuils, application automatique **désactivée par défaut**.

## 6. Gestionnaire — C3.1 à C3.3

- Trois niveaux en onglets ; le nom d'un objet descend d'un niveau.
- **Interrupteur en ligne** : pause immédiate, message nommant l'objet, réversible d'un second clic.
- **Sélection multiple** : cases en 1440 ; **appui long** en mobile, où les cases n'existent qu'en mode sélection. En-tête **sombre** en mode sélection — impossible de croire qu'on est en navigation normale.
- Actions de groupe : **Mettre en pause** et **Budget** dans la barre, le reste sous `⋯`. L'avertissement d'apprentissage s'affiche **avant** la modale.
- **Filtres** : 5 filtres rapides **portant leur dénombrement**, plus un constructeur de conditions en dessous, jamais à la place.
- **Métrique pilote** : occupe le grand chiffre **et** ordonne la liste ; le sens du tri est **imposé** par la métrique. 1 pilote + 2 secondaires, jamais plus de 3 chiffres par carte.
- **Statuts** : 10 au total, **4 seulement** portent un filet gauche de 3 px — Apprentissage limité, Rejetée, Budget épuisé, Erreur. Le motif remplace alors la ligne technique sous le nom.
- **Provenance** : agent → pictogramme + ligne en `--ly-agent-700` ; règle → nom entre guillemets ; utilisateur → aucune décoration ; Meta → motif de rejet.
- **C3.3** : bascule tableau / grille. La grille sert à **juger** une créative, le tableau à la **comparer**. Sélection et actions de groupe identiques dans les deux.
- **Point ouvert :** pagination — « 50 par page » est affiché, le comportement au-delà n'est pas défini.

## 7. Constructeur de campagne — C4.1 à C4.9

- **C4.1** : deux modes. Agent → C4.2 brief → C4.3 proposition. Manuel → C4.4.
- **C4.3** : la proposition est **modifiable** ; accepter mène au récapitulatif, modifier bascule en manuel **sans perdre la proposition**.
- **C4.7** : contrôles avant publication à trois niveaux — passés, avertissements (publication possible), **bloquants** (publication impossible, chacun avec sa correction).
- **C4.8** : prévisualisation par placement. Un placement indisponible (Instagram non lié, voir B5) est **grisé avec sa raison**.
- **C4.9** : publication **simulée** dans le prototype. Trois issues : en cours, publiée, **rejetée par Meta** avec motif.
- Crédit : **2 crédits** par publication, affichés avant.

## 8. Studio et analyse créative — C5, C6

- **Coût affiché avant chaque génération**, jamais découvert après. Crédit insuffisant → écran dédié avec le rachat, pas un échec muet.
- **Échec de notre côté → aucun crédit débité**, et c'est dit à l'écran. À implémenter comme transaction compensatoire.
- **C5.5** galerie : sélection multiple, retouche (C5.6), envoi vers une campagne (C5.7) qui atterrit en C4.6 ou C3.3.
- **C6.3** analyse par éléments : si les éléments ne sont pas détectables, l'écran le dit au lieu d'afficher un vide.
- **C6.4** fatigue : trois états, et une **phrase de pronostic** plutôt qu'un score seul — même principe que l'apprentissage en C3.2.
- **C6.6** → alimente C5.1 (regénérer) ou C2.2 (recommandation créative).

## 9. Marché et rapports — C8, C9

- **C8.1** : une analyse coûte **48 crédits**, affichés avant. Source indisponible ou couverture partielle → C8.8, jamais un tableau vide sans explication.
- **C8.4** : les angles **libres** sont actionnables et mènent au studio.
- **C9.2** : composition par blocs ; un bloc sans données le dit.
- **C9.3** : marque Lyads ou marque du client (plans Agence).
- **C9.5** : vue publique en **lecture seule**, par lien. États : valide, **expiré**, **révoqué**. Aucune action, aucune navigation vers l'application.
- **Point ouvert :** durée de validité par défaut d'un lien de partage, et révocation.

## 10. Paramètres et facturation — C11.1 à C11.8

- **C11.2** : jeton expiré traité **de front** — c'est la panne la plus fréquente de ce type de produit. Reconnexion en un geste depuis le bandeau comme depuis cet écran.
- **C11.3 / C11.4** : plan, consommation, **projection au rythme actuel**. Solde faible → bandeau (seuil à trancher, DECISIONS § 4).
- **C11.5** : factures téléchargeables, échec de paiement traité.
- **C11.6** : matrice 9 événements × 3 canaux.
- **C11.7** : 4 rôles, et le **périmètre se donne par compte** — pas un rôle global.
- **C11.8** : trois niveaux de gravité séparés visuellement. Suppression → confirmation par saisie du nom du compte.
- Paiement : **Wave · Orange Money · MTN MoMo · Carte bancaire**, Mobile Money au même rang que la carte.

## 11. Navigation de la coquille

- **Barre latérale** : 240 px déployée, 64 px réduite (infobulle au survol), masquée sous 768 px. **Choix mémorisé par utilisateur.**
- **Groupes**, dans cet ordre : Tableau de bord · Agent (avec compteur) · **Campagnes** (Gestionnaire, Constructeur) · **Créatif** (Studio, Analyse créative) · **Pilotage** (Règles, Analyse marché, Rapports) · pied : Business Brain, jauge de crédits, Paramètres.
- **Onglets mobiles**, cinq : Bord · Agent · Publicités · Rapports · **Plus**. « Plus » ouvre une feuille contenant les six destinations restantes. **Aucune destination inatteignable en mobile.**
- **Cloche** → fil de l'agent. Le compteur suit le nombre de recommandations en attente.
- **Bandeaux** : un seul visible à la fois, file par priorité (liste à trancher, DECISIONS § 8). Chacun porte **une action**, pas seulement un constat.

## 12. Cas métier à couvrir partout

| Cas | Comportement attendu |
|---|---|
| Meta déconnecté | bandeau rouge + « Reconnecter » · données de la dernière synchronisation, **datées** · écriture bloquée |
| Accès en lecture seule | bandeau « Mode consultation » · toute action d'écriture désactivée **avec sa raison** |
| Crédit insuffisant | coût affiché avant · écran de rachat · aucune action lancée à moitié |
| Compte en EUR | devise réelle, **aucune conversion**, devise écrite à côté du nombre |
| Instagram non lié | placements Instagram grisés en C4.5 et C4.8, avec la raison |
| Pixel absent ou inactif | avertissement en B6 et C1.1 · recommandations de conversion indisponibles |
| Volume d'événements faible | « moins de 50 conversions hebdomadaires » annoncé · fiabilité des recommandations minorée |
| Données en retard | horodatage de la dernière synchronisation visible sur chaque écran de données |
| Publication rejetée | motif Meta affiché **à la place de la ligne technique** · action de correction |

## 13. Points ouverts — récapitulatif

1. Destination du bandeau supérieur d'annonce (A1)
2. Verrouillage après N tentatives de connexion (A4)
3. Délai et durée de conservation des brouillons
4. Révocation de l'accès Meta en cours d'onboarding
5. Pagination au-delà de 50 lignes (C3)
6. Durée de validité et révocation d'un lien de rapport partagé (C9.5)
7. Le module **Règles automatisées** n'est pas maquetté (voir DECISIONS § 14)
