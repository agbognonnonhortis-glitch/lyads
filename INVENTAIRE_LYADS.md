# Lyads — Inventaire vérifié après réception des maquettes

Mise à jour du 12 septembre 2026. Ce document remplace l’audit initial qui signalait 19 fichiers de maquettes absents. Audit de fichiers et de sources ; aucune intégration de l’application n’a commencé.

## Conclusion

**Les 19 fichiers de lots attendus sont désormais présents**, dans `MAQUETTE ET HANDOFF/maquettes/`, avec le support local. Le paquet contient aussi le handoff révisé, le manifeste des écrans, les interactions, les décisions et les données de démonstration.

Le manifeste contient **76 lignes : 75 références déclarées maquettées et une ligne C7.x explicitement absente**. Je ne confirme pas 75 écrans distincts complets : A8 est un renvoi à C9.5, pas la page Contact et support annoncée, et certains cadres regroupent plusieurs références.

Le périmètre produit est compris. Les références reçues permettent de préparer l’intégration, mais deux manques de design demeurent : Contact/support et Règles automatisées. Plusieurs correspondances de pages, le prototype autonome et les données de démonstration nécessitent également une correction.

## Contrôles effectués

- Présence des 19 fichiers de lots du handoff initial : 19/19.
- Lecture du README, de DECISIONS.md, INTERACTIONS.md, du handoff, du manifeste et de DEMO_DATA.json.
- Lecture des intitulés, ancres et sections dans les 19 maquettes ; comparaison avec le manifeste.
- Vérification des liens locaux statiques src/href dans les HTML non empaquetés : 21 occurrences contrôlées, aucun fichier cible absent. Les destinations dynamiques ne sont pas couvertes par ce comptage.
- Dépendances réseau restantes repérées : Google Fonts et unpkg. Les sources support.js chargent notamment React ; présence du fichier local ne signifie pas autonomie hors connexion.
- Décodage en mémoire du prototype autonome et comparaison de sa logique avec le nouveau prototype source.
- Vérification du JSON de démonstration, des totaux de campagnes et d’exemples de relations entre objets.

Ce contrôle ne constitue pas une recette graphique ou fonctionnelle dans un navigateur. Aucun script du prototype n’a été exécuté pour établir cet inventaire.

## Ce que la nouvelle réception corrige

- Les maquettes des lots 1 à 7 sont livrées.
- C2 comprend cinq références : fil, détail, confirmation, historique et réglages.
- B7–B11 correspondent au formulaire Business Brain, à l’analyse de site, au récapitulatif, au choix du plan et à la fin d’onboarding.
- C10 désigne les trois vues Business Brain en consultation ; les huit vues Paramètres/facturation sont numérotées C11.
- DECISIONS.md retient 7 jours pour l’annulation des actions et 1 500 crédits mensuels pour Pro.
- Les comportements et cas métier sont beaucoup mieux documentés.

## Inventaire de la réception

La colonne « Repère observé » reprend l’intitulé de maquette lorsqu’une divergence est identifiée ; sinon elle conserve le titre du manifeste avec une référence repérée dans le fichier. « À harmoniser » signifie que le manifeste ou les interactions ne correspondent pas au contenu livré, pas que la maquette manque.

| Réf. | Titre du manifeste | Repère observé / constat | Statut | Fichier de maquette |
|---|---|---|---|---|
| A1 | Landing page | Landing page | Référence présente | Lot 7 - A1 Landing page v2.dc.html |
| A2 | Fonctionnalités | Fonctionnalités | Référence présente | Lot 7 - Site public.dc.html |
| A3 | Tarifs | Tarifs | Référence présente | Lot 7 - Site public.dc.html |
| A4 | Connexion | Connexion | Référence présente | Lot 7 - Site public.dc.html |
| A5 | Inscription | Inscription | Référence présente | Lot 7 - Site public.dc.html |
| A6 | Mot de passe oublié | Mot de passe oublié | Référence présente | Lot 7 - Site public.dc.html |
| A7 | Pages légales | Pages légales | Gabarit, textes à fournir | Lot 7 - Site public.dc.html |
| A8 | Contact et support | Aucune maquette Contact : ce bloc renvoie à la vue publique C9.5 | Contact absent | Lot 7 - Site public.dc.html |
| B1 | Bienvenue | Bienvenue | Référence présente | Lot 6 - Onboarding Business Brain et Parametres.dc.html |
| B2 | Connexion Meta | Connexion Meta | Référence présente | Lot 6 - Onboarding Business Brain et Parametres.dc.html |
| B3 | Sélection du Business Manager | Sélection du Business Manager | Référence présente | Lot 6 - Onboarding Business Brain et Parametres.dc.html |
| B4 | Sélection du compte publicitaire | Sélection du compte publicitaire | Référence présente | Lot 6 - Onboarding Business Brain et Parametres.dc.html |
| B5 | Page Facebook et compte Instagram | Page Facebook et compte Instagram | Référence présente | Lot 6 - Onboarding Business Brain et Parametres.dc.html |
| B6 | Pixel et événement de conversion | Pixel et événement de conversion | Référence présente | Lot 6 - Onboarding Business Brain et Parametres.dc.html |
| B7 | Formulaire | Formulaire | Référence présente | Lot 6 - Onboarding Business Brain et Parametres.dc.html |
| B8 | Analyse automatique du site | Analyse automatique du site | Référence présente | Lot 6 - Onboarding Business Brain et Parametres.dc.html |
| B9 | Récapitulatif | Récapitulatif | Référence présente | Lot 6 - Onboarding Business Brain et Parametres.dc.html |
| B10 | Choix du plan et paiement | Choix du plan et paiement | Référence présente | Lot 6 - Onboarding Business Brain et Parametres.dc.html |
| B11 | Onboarding terminé | Onboarding terminé | Référence présente | Lot 6 - Onboarding Business Brain et Parametres.dc.html |
| C1.1 | Tableau de bord | Tableau de bord | Référence présente | Lot 1 - C1.1 Tableau de bord.dc.html |
| C1.2 | Sélecteur de compte | Sélecteur de compte | Référence présente | Lot 1 - C1.2 Selecteur de compte.dc.html |
| C2.1 | Fil des recommandations | Fil des recommandations | Référence présente | Lot 1 - Partie 3 Agent d optimisation.dc.html |
| C2.2 | Détail d'une recommandation | Détail d'une recommandation | Référence présente | Lot 1 - Partie 3 Agent d optimisation.dc.html |
| C2.3 | Modale de confirmation | Modale de confirmation | Référence présente | Lot 1 - Partie 3 Agent d optimisation.dc.html |
| C2.4 | Historique — réel contre estimé | Historique — réel contre estimé | Référence présente | Lot 1 - Partie 3 Agent d optimisation.dc.html |
| C2.5 | Réglages de l'agent | Réglages de l'agent | Référence présente | Lot 1 - Partie 3 Agent d optimisation.dc.html |
| C3.1 | Tableau des campagnes | Tableau des campagnes | Référence présente | Lot 2 - Tableau mobile et modele.dc.html |
| C3.2 | Ensembles de publicités | Ensembles de publicités | Référence présente | Lot 2 - Tableau mobile et modele.dc.html |
| C3.3 | Publicités | Publicités | Référence présente | Lot 2 - Tableau mobile et modele.dc.html |
| C4.1 | Choix du mode | Choix du mode | Référence présente | Lot 3 - Etape 1 Mode et brief.dc.html |
| C4.2 | Brief et états | Brief et états | Référence présente | Lot 3 - Etape 1 Mode et brief.dc.html |
| C4.3 | Proposition de structure de l'agent | Proposition de structure de l'agent | Référence présente | Lot 3 - Etape 2 Proposition agent.dc.html |
| C4.4 | Construction manuelle — campagne | Objectif et budget | Référence présente | Lot 3 - Etape 3 Construction manuelle.dc.html |
| C4.5 | Ensembles et ciblage | Ciblage | Référence présente | Lot 3 - Etape 3 Construction manuelle.dc.html |
| C4.6 | Publicités et créatives | Créatives (cadre partagé avec C4.7) | Référence présente | Lot 3 - Etape 3 Construction manuelle.dc.html |
| C4.7 | Récapitulatif et contrôles | Textes (cadre partagé avec C4.6) | À harmoniser | Lot 3 - Etape 3 Construction manuelle.dc.html |
| C4.8 | Prévisualisation multi-placements | Prévisualisation multi-placements | Référence présente | Lot 3 - Etape 4 Apercu et publication.dc.html |
| C4.9 | Publication et suivi | Récapitulatif et publication | Référence présente | Lot 3 - Etape 4 Apercu et publication.dc.html |
| C5.1 | Point de départ et brief créatif | Accueil du Studio créatif | Référence présente | Lot 4 - Studio et Analyse creative.dc.html |
| C5.2 | Génération de textes | Génération de textes | Référence présente | Lot 4 - Studio et Analyse creative.dc.html |
| C5.3 | Génération de visuels | Génération de visuels | Référence présente | Lot 4 - Studio et Analyse creative.dc.html |
| C5.4 | Génération de vidéos courtes | Génération de vidéos courtes | Référence présente | Lot 4 - Studio et Analyse creative.dc.html |
| C5.5 | Galerie de résultats | Galerie de résultats | Référence présente | Lot 4 - Studio et Analyse creative.dc.html |
| C5.6 | Retouche et déclinaisons | Éditeur de créative | Référence présente | Lot 4 - Studio et Analyse creative.dc.html |
| C5.7 | Envoi vers une campagne | Bibliothèque personnelle | À harmoniser | Lot 4 - Studio et Analyse creative.dc.html |
| C6.1 | Classement des créatives | Classement des créatives | Référence présente | Lot 4 - Studio et Analyse creative.dc.html |
| C6.2 | Détail d'une créative | Détail d'une créative | Référence présente | Lot 4 - Studio et Analyse creative.dc.html |
| C6.3 | Analyse par éléments | Analyse par éléments | Référence présente | Lot 4 - Studio et Analyse creative.dc.html |
| C6.4 | Fatigue et cycle de vie | Détecteur de fatigue | Référence présente | Lot 4 - Studio et Analyse creative.dc.html |
| C6.5 | Comparaison de variantes | Gagnants enterrés — forte performance, faible dépense | À harmoniser | Lot 4 - Studio et Analyse creative.dc.html |
| C6.6 | Recommandations créatives | Propositions d’itérations — une seule variable à la fois | Référence présente | Lot 4 - Studio et Analyse creative.dc.html |
| C8.1 | Recherche de publicités | Recherche de publicités | Référence présente | Lot 5 - Intelligence marche et Rapports.dc.html |
| C8.2 | Résultats et filtres | Détail d’une publicité | À harmoniser | Lot 5 - Intelligence marche et Rapports.dc.html |
| C8.3 | Détail d'une publicité concurrente | Mes collections | À harmoniser | Lot 5 - Intelligence marche et Rapports.dc.html |
| C8.4 | Angles et messages | Détail d’une collection | À harmoniser | Lot 5 - Intelligence marche et Rapports.dc.html |
| C8.5 | Suivi d'un concurrent | Lancer une analyse de marché | À harmoniser | Lot 5 - Intelligence marche et Rapports.dc.html |
| C8.6 | Alertes de marché | Rapport d’analyse de marché | À harmoniser | Lot 5 - Intelligence marche et Rapports.dc.html |
| C8.7 | Synthèse sectorielle | Axes de communication recommandés | À harmoniser | Lot 5 - Intelligence marche et Rapports.dc.html |
| C8.8 | États et limites de la source | Historique des analyses | À harmoniser | Lot 5 - Intelligence marche et Rapports.dc.html |
| C9.1 | Liste des rapports | Liste des rapports | Référence présente | Lot 5 - Intelligence marche et Rapports.dc.html |
| C9.2 | Composition d'un rapport | Éditeur de rapport | Référence présente | Lot 5 - Intelligence marche et Rapports.dc.html |
| C9.3 | Personnalisation et marque | Modèles de rapport | À harmoniser | Lot 5 - Intelligence marche et Rapports.dc.html |
| C9.4 | Envoi et planification | Paramètres de partage | À harmoniser | Lot 5 - Intelligence marche et Rapports.dc.html |
| C9.5 | Vue publique partagée | Prévisualisation et vue publique | Référence présente | Lot 5 - Intelligence marche et Rapports.dc.html |
| C10.1 | Fiche entreprise | Fiche entreprise | Référence présente | Lot 6 - Onboarding Business Brain et Parametres.dc.html |
| C10.2 | Produits et offres | Produits et offres | Référence présente | Lot 6 - Onboarding Business Brain et Parametres.dc.html |
| C10.3 | Historique des modifications | Historique des modifications | Référence présente | Lot 6 - Onboarding Business Brain et Parametres.dc.html |
| C11.1 | Profil utilisateur | Profil utilisateur | Référence présente | Lot 6 - Onboarding Business Brain et Parametres.dc.html |
| C11.2 | Comptes Meta connectés | Comptes Meta connectés | Référence présente | Lot 6 - Onboarding Business Brain et Parametres.dc.html |
| C11.3 | Abonnement et plan | Abonnement et plan | Référence présente | Lot 6 - Onboarding Business Brain et Parametres.dc.html |
| C11.4 | Crédits | Crédits | Référence présente | Lot 6 - Onboarding Business Brain et Parametres.dc.html |
| C11.5 | Historique de facturation | Historique de facturation | Référence présente | Lot 6 - Onboarding Business Brain et Parametres.dc.html |
| C11.6 | Notifications | Notifications | Référence présente | Lot 6 - Onboarding Business Brain et Parametres.dc.html |
| C11.7 | Équipe et accès | Équipe et accès | Référence présente | Lot 6 - Onboarding Business Brain et Parametres.dc.html |
| C11.8 | Déconnexion et suppression de compte | Déconnexion et suppression de compte | Référence présente | Lot 6 - Onboarding Business Brain et Parametres.dc.html |

### Module C7 toujours absent

Le module fait partie du périmètre demandé à l’origine. La nouvelle livraison explique qu’il n’a jamais été maquetté. Les réglages C2.5 ne remplacent pas ses trois fonctions :

- C7.1 — Liste des règles automatisées.
- C7.2 — Constructeur SI/ALORS et gestion des contradictions.
- C7.3 — Historique d’exécution et annulation.

### Page Contact toujours absente

Dans `Lot 7 - Site public.dc.html`, la section `data-screen-label="A8"` (ligne 1821) porte « Vue publique d’un rapport partagé », suivie de « Écran non remaquetté ». Elle renvoie à C9.5. Il n’y a donc pas, à cet emplacement, la page Contact/support promise par le manifeste et INTERACTIONS.md.

## Problèmes de correspondance à corriger

Les écarts de fond sont listés dans la matrice ci-dessus. Exemples : C4.7 contient les textes publicitaires ; C5.7 est la bibliothèque personnelle ; C6.5 présente les gagnants enterrés. Le lot 5 est particulièrement concerné : C8.2–C8.8 et C9.3–C9.4 ne portent pas les fonctions annoncées par le manifeste.

Il faut aligner les titres, types de vue et parcours sur les maquettes, puis indiquer où se trouvent les fonctions initialement annoncées. Ne pas supprimer implicitement un besoin parce que son numéro a changé. Par exemple, la comparaison de variantes et le suivi de concurrents doivent être localisés dans les maquettes ou signalés comme non conçus.

## Prototype autonome périmé

`MAQUETTE ET HANDOFF/Prototype Lyads - autonome.html` est **identique octet pour octet à l’ancien fichier autonome**. Il contient encore les pages d’attente du gestionnaire.

Le nouveau `maquettes/Prototype Lyads.dc.html` possède bien une route `manager`, les trois niveaux campagnes/ensembles/publicités, le mode tableau/grille et des interactions de démonstration. Sa logique est différente de celle embarquée dans l’autonome. Il faut régénérer l’export autonome à partir du nouveau source, ou utiliser explicitement le source comme référence à jour.

Les interactions du gestionnaire restent partielles dans le code : certains boutons affichent uniquement un message, les filtres rapides changent leur état visuel sans filtrer la liste des campagnes, et la descente vers les ensembles ne conserve pas l’identifiant de campagne. Ce sont des limites de démonstration à documenter, pas des fonctionnalités finalisées à recopier.

## Données de démonstration : correctes syntaxiquement, incomplètes et incohérentes par endroits

Les totaux des huit campagnes se vérifient : dépense 1 272 500, budget quotidien 845 000 et 133 achats. En revanche :

1. `r3` annonce « Karité — Vidéo 15 s » mais cible `a3`, nommée « Offre livraison gratuite ». La fréquence annoncée est 4,2 contre 5,2 pour la cible.
2. `r4` annonce l’audience « Intérêts beauté » mais cible `s1`, nommé « Large 25-45 — Sénégal » et décrit comme ciblage large.
3. Les publicités `a1` et `a2`, rattachées à `s2`, totalisent 312 800 de dépense ; `s2` n’en annonce que 148 900 sur le jeu de période commun. L’écart nécessite une correction ou des périodes explicitement distinctes.
4. `r1` propose d’augmenter un budget quotidien de 150 000 tout en affirmant « Budget quotidien du compte inchangé », sans mouvement compensatoire documenté. Son ROAS 3,12 diffère également du ROAS 4,12 de la campagne cible, sans fenêtre de mesure distincte explicite.
5. Le JSON ne contient que quatre recommandations ; le prototype en contient sept. Il n’existe pas de collection dédiée aux créatives/résultats de génération, à la veille, aux rapports ou aux factures, malgré les écrans correspondants.
6. 1 012 crédits utilisés sur 1 500 laissent 488 crédits, soit 32,53 %. Cela ne déclenche ni le seuil de 15 % ni celui de 25 %, contrairement à la justification donnée dans DECISIONS.md. Prévoir un scénario de solde faible distinct.

Ces corrections et compléments sont réalisables lors de l’intégration locale. Ils ne nécessitent aucun accès à un compte publicitaire réel.

## Règles encore à harmoniser

- Les 11 choix ouverts de DECISIONS.md ne sont pas tous réglés : seuil de crédits, lueur, distinction scan/analyse, fréquence, file de bandeaux, périmètre C7, compte de démonstration et contenus du propriétaire.
- INTERACTIONS.md décrit déjà certaines propositions ouvertes comme des comportements attendus ; distinguer ce qui est décidé de ce qui est proposé.
- INTERACTIONS.md prévoit des tableaux à six colonnes à 768 px, tandis que CLAUDE.md et DESIGN_SYSTEM.md réservent les tableaux denses à partir de 1024 px.
- Anneau de focus : 2 px dans INTERACTIONS.md contre 3 px dans les règles et le design system.
- Les neuf jetons proposés dans DECISIONS.md ne sont pas ajoutés à tokens.css ; tokens.css, DESIGN_SYSTEM.md, CLAUDE.md et le catalogue sont identiques aux versions initiales.
- La règle sur l’indigo proposée dans DECISIONS.md n’est pas reportée dans le design system.
- Le handoff référence encore C10 pour la facturation dans l’ordre de réalisation, alors que l’inventaire la place en C11.
- Aucune maquette dédiée à 1024 px n’est livrée ; les règles d’adaptation sont identifiées comme non validées par une maquette. Ce n’est pas bloquant pour une adaptation responsive, une fois les règles harmonisées.

## Contenus du propriétaire

Logo Lyads définitif, identité légale, coordonnées publiques définitives, textes juridiques, témoignages, logos clients, badge Meta et note d’avis ne sont pas confirmés. Le monogramme L et les emplacements à compléter permettent d’avancer sur une démonstration locale. Aucune preuve commerciale ne doit être inventée.

## Suite

Le prompt `PROMPT_CLAUDE_DESIGN.md` a été remplacé par une demande ciblée sur cette réception. Les 19 fichiers reçus ne sont plus demandés à nouveau. Priorité : fournir Contact et C7, corriger la correspondance des pages, puis réconcilier les exports et les règles.
