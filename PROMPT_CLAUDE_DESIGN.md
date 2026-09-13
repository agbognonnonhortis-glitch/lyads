# Prompt de correction à envoyer à Claude Design — après réception du paquet

J’ai transmis ton dossier « MAQUETTE ET HANDOFF » à Codex. **Les 19 fichiers de maquettes sont bien reçus**, ainsi que le handoff, le manifeste, les interactions, les décisions, le design system et DEMO_DATA.json. L’audit des fichiers révèle toutefois les problèmes précis ci-dessous.

Prépare une livraison corrigée, en conservant les maquettes existantes et la direction graphique validée. Codex réalisera ensuite l’intégration locale de toutes les pages et les interactions de démonstration. Identifie explicitement chaque nouvelle proposition de design qui nécessite ma validation.

## 1. Fournir les maquettes encore manquantes

**A8 — Contact et support.** Le manifeste annonce cette page dans `Lot 7 - Site public.dc.html`, mais le bloc `data-screen-label="A8"` porte réellement « Vue publique d’un rapport partagé » et précise « Écran non remaquetté », avec renvoi à C9.5. Ce bloc ne remplace pas une page Contact.

Livre la page Contact/support prévue : formulaire, canaux et délais de réponse, lien vers l’aide, validation de saisie, confirmation d’envoi et erreur. Les coordonnées et délais non confirmés doivent être marqués à compléter. Conserve C9.5 comme vue publique des rapports, avec un identifiant distinct.

**C7 — Règles automatisées.** Ton dossier confirme que ce module n’a jamais été conçu, bien qu’il fasse partie du périmètre initial. Propose les trois maquettes complètes, dans le design system :

- C7.1 : liste des règles, état, périmètre, dernière exécution, objets concernés ; cas vide et erreur.
- C7.2 : constructeur SI/ALORS, sélection du compte et des objets, conditions et actions, garde-fou contre les contradictions, validation et confirmation.
- C7.3 : historique d’exécution, modifications avant/après, provenance, succès/échec et annulation.

Les réglages de l’agent C2.5 restent distincts de ce module. Présente les seuils ou comportements jamais validés comme des propositions à valider. Prévois mobile 375 et ordinateur 1440, ainsi que les règles d’adaptation intermédiaires.

## 2. Corriger le manifeste en lisant les vrais intitulés des maquettes

Le manifeste reçu contient 75 références déclarées maquettées et une ligne C7.x absente. Plusieurs références ne décrivent pas l’écran auquel elles renvoient :

| Référence | Manifeste actuel | Maquette réellement livrée |
|---|---|---|
| A8 | Contact et support | Renvoi à la vue publique C9.5 |
| C4.7 | Récapitulatif et contrôles | Textes, dans un cadre partagé avec C4.6 Créatives |
| C5.7 | Envoi vers une campagne | Bibliothèque personnelle |
| C6.5 | Comparaison de variantes | Gagnants enterrés — forte performance, faible dépense |
| C8.2 | Résultats et filtres | Détail d’une publicité |
| C8.3 | Détail d’une publicité concurrente | Mes collections |
| C8.4 | Angles et messages | Détail d’une collection |
| C8.5 | Suivi d’un concurrent | Lancer une analyse de marché |
| C8.6 | Alertes de marché | Rapport d’analyse de marché |
| C8.7 | Synthèse sectorielle | Axes de communication recommandés |
| C8.8 | États et limites de la source | Historique des analyses |
| C9.3 | Personnalisation et marque | Modèles de rapport |
| C9.4 | Envoi et planification | Paramètres de partage |

Relis toutes les références, y compris celles qui ne figurent pas dans ce tableau. Aligne les titres, types de vue, cadres/ancres, entrées, sorties, états et formats de `SCREENS_MANIFEST.csv` sur les maquettes.

Aligne également `INTERACTIONS.md` et le handoff. Les destinations doivent pointer vers la bonne fonction : par exemple, une carte de publicité concurrente ne peut pas renvoyer vers « Mes collections » en prétendant ouvrir son détail.

Pour chaque fonction anciennement annoncée sous une référence erronée — notamment comparaison de variantes, envoi vers une campagne, suivi de concurrents, alertes et planification de rapports — indique son emplacement réel ou marque-la comme non conçue. Ne supprime aucun besoin implicitement à l’occasion d’un changement de numéro.

Recalcule le nombre de références et distingue les pages, étapes, onglets, panneaux, modales et renvois. Le bloc A8 actuel n’est pas une seconde maquette de C9.5. C4.6 et C4.7 partagent un cadre : rends-le explicite.

## 3. Régénérer le prototype autonome

Le fichier `Prototype Lyads - autonome.html` livré est identique octet pour octet à l’ancien export. Sa logique ne comporte pas la route `manager` : le gestionnaire y reste une page d’attente.

En revanche, `maquettes/Prototype Lyads.dc.html` contient bien la route `manager`, les trois niveaux Campagnes/Ensembles/Publicités et les modes tableau/grille. Ces deux exports ne sont donc pas synchronisés.

Régénère le fichier autonome depuis le source réellement à jour, avec toutes ses dépendances embarquées. Vérifie que le gestionnaire est accessible dans les deux versions. Indique clairement les limites d’interaction du prototype : les actions qui ne produisent qu’un message, les filtres sans effet sur les données et la navigation sans conservation du contexte ne doivent pas être annoncés comme des fonctions terminées.

L’assemblage interactif de toutes les autres maquettes sera réalisé par Codex ; il suffit ici que les références livrées et leurs comportements soient décrits fidèlement.

## 4. Corriger les données de démonstration

Le JSON est lisible et les totaux des huit campagnes sont corrects. Corrige les incohérences suivantes :

- `r3` nomme « Karité — Vidéo 15 s » mais cible `a3`, nommée « Offre livraison gratuite » ; fréquence 4,2 dans la recommandation contre 5,2 dans la cible.
- `r4` nomme l’audience « Intérêts beauté » mais cible `s1`, nommé « Large 25-45 — Sénégal », avec un ciblage large.
- Les publicités `a1` et `a2`, enfants de `s2`, totalisent 312 800 de dépense, alors que `s2` n’en annonce que 148 900. Aligne les valeurs ou indique des périodes distinctes, si c’est voulu.
- `r1` ajoute 150 000 au budget quotidien tout en affirmant « Budget quotidien du compte inchangé », sans baisse compensatoire. Documente un avant/après équilibré ou corrige cette affirmation. Aligne aussi son ROAS 3,12 avec celui de sa cible, 4,12, ou précise les fenêtres de mesure.
- Le JSON contient quatre recommandations et le prototype sept : fournis une correspondance complète, avec identifiants stables.
- Avec 1 012 crédits utilisés sur 1 500, il reste 488 crédits, soit 32,53 %. Ce scénario ne déclenche aucun des seuils proposés, 15 % ou 25 %. Corrige la justification de DECISIONS.md et fournis un scénario de solde faible distinct.

Si des données sont utilisées dans les autres maquettes, exporte les jeux existants : bibliothèque créative, résultats de génération, collections de publicités concurrentes, analyses, rapports, factures et équipe. S’ils n’existent pas sous forme structurée, indique les sources et les relations à reconstituer par Codex. Aucun témoignage commercial réel ou résultat client ne doit être inventé.

## 5. Harmoniser réellement les règles et les fichiers

Certaines corrections sont seulement annoncées dans DECISIONS.md : le design system et les jetons livrés n’ont pas été mis à jour.

- Les neuf jetons de dimension proposés dans DECISIONS.md ne figurent pas dans tokens.css. Ajoute ceux validés ou marque clairement leur statut de proposition.
- La règle de l’indigo est réinterprétée dans DECISIONS.md mais reste contradictoire avec CLAUDE.md et DESIGN_SYSTEM.md. Fournis une règle cohérente et précise son statut de validation.
- INTERACTIONS.md prévoit des tableaux à six colonnes dès 768 px ; CLAUDE.md et DESIGN_SYSTEM.md prescrivent des cartes sous 1024 px. Réconcilie cette règle avec les maquettes et le mode Comparer déjà prévu.
- Focus clavier : INTERACTIONS.md annonce 2 px, le design system 3 px. Harmonise la valeur.
- Les comportements proposés comme ouverts dans DECISIONS.md ne doivent pas apparaître simultanément comme définitivement validés dans INTERACTIONS.md.
- Corrige les anciens numéros résiduels, notamment C10 pour la facturation dans l’ordre de réalisation : le nouveau manifeste la situe en C11.
- Identifie les adaptations 1024 px comme règles proposées, puisqu’aucune maquette dédiée n’existe.

Conserve les arbitrages déjà documentés : annulation pendant 7 jours et plan Pro à 1 500 crédits/mois. Pour les choix du propriétaire encore ouverts — seuil de crédits, lueur des boutons, coût scan/analyse, fréquence et bandeaux — regroupe une liste courte de décisions avec une proposition claire par sujet, sans prétendre qu’elles ont été validées.

## 6. Livraison attendue

Fournis un paquet corrigé ou un complément clairement versionné contenant :

1. Les maquettes Contact/support et les propositions C7.
2. Le manifeste et les parcours corrigés selon les maquettes réelles.
3. Le prototype autonome régénéré depuis le source à jour.
4. Le JSON de démonstration corrigé et les jeux complémentaires disponibles.
5. Les règles, jetons et décisions harmonisés, avec distinction entre validé et proposé.
6. Un README qui décrit exactement le contenu livré et les limites restantes.

Termine par les fichiers effectivement fournis, les vérifications réellement faites et les éléments encore manquants. Les textes juridiques, l’identité légale, le logo définitif et les preuves commerciales restent marqués « à fournir par le propriétaire » ; ils peuvent être laissés ainsi pour la démonstration locale.
