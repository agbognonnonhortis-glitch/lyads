# Tableau de bord : données et synchronisation

La page C1.1 utilise les cadres et polices de la maquette, avec un rendu serveur qui retire les exemples avant l’envoi au navigateur. Aucun script de simulation de la maquette ne s’exécute sur cette page.

## Lecture

`GET /api/dashboard/{context|kpis|series|campaigns|placements|creatives|alerts|recommendations}` accepte `organization`, `accounts` (UUID séparés par des virgules), `since`, `until`. La période est limitée à 90 jours ; la comparaison porte sur les jours immédiatement précédents, de même durée. Les dates correspondent aux jours publicitaires Meta. Aujourd’hui, hier et les 7/30/90 derniers jours sont recalculés à partir de la date du compte sélectionné, dans son fuseau ; ils ne reprennent pas la fin d’une ancienne période personnalisée. Sans sélection explicite, seul le premier compte connecté lors de l’onboarding est affiché.

Chaque zone est indépendante et chaque réponse inclut la dernière synchronisation réussie par compte. La date commune est la plus ancienne des comptes sélectionnés. Si l’un des comptes n’a jamais été synchronisé, la date commune est absente. Les autorisations de l’organisation, les comptes retenus pendant l’onboarding et la RLS limitent les résultats.

La fonction SQL `lyads_dashboard_metrics`, exécutée avec les droits de l’appelant, agrège les décimales en PostgreSQL. KPI/courbes utilisent le niveau compte sans répartition ; campagnes, publicités et placements utilisent chacun leur jeu de données propre. Les répartitions ne sont jamais additionnées aux totaux.

CPC = dépense / clics. CPA = dépense / achats ; ROAS = valeur des achats / dépense. Les achats utilisent exactement l’action Meta `purchase`, sans additionner ses alias ou d’autres conversions. Une valeur absente ou un dénominateur nul produit `null`. Les montants de devises différentes ne sont pas additionnés. Toutes les valeurs monétaires, y compris les axes et les infobulles, utilisent le code et la précision de la devise du compte (USD, EUR, XOF, JPY, etc.). Une incohérence entre la devise des lignes importées et celle du compte bloque l’affichage et demande une resynchronisation. Les KPI indiquent lorsque seuls certains comptes sélectionnés ont des lignes disponibles. Une période sans lignes reste « aucune donnée », pas zéro inventé.

## Action Synchronisé

Le clic appelle `POST /api/accounts/{id}/sync` pour les comptes sélectionnés, avec une clé d’idempotence par demande. Le serveur applique la limitation existante de cinq minutes et place le travail dans la file. Le navigateur suit les tâches, désactive le bouton pendant le traitement, puis recharge les zones. Une transition queued → running n’annonce pas une réussite. Une erreur conserve la date du dernier import réussi et affiche une explication en français. Un rechargement de page retrouve les tâches en cours. Les réponses d’un ancien filtre ne remplacent pas les nouvelles.

## Limites explicites

Les détecteurs de performance utilisent les seuils configurés et les données suffisantes ; leurs résultats sont différés pendant un import actif. Le moteur de recommandations ne fournit pas encore de recommandations : aucune n’est fabriquée. La vue conserve les problèmes techniques et alertes de performance Lyads, et exclut les statuts de diffusion Meta. Les cinq publicités affichées sont ordonnées par dépense, pas déclarées gagnantes. Les listes de campagnes et placements sont limitées à 50 résultats.

## Vérifications

Tests PostgreSQL : calculs décimaux, exclusion des répartitions, achats non doublés, valeurs absentes, comptes non autorisés. Tests du contrôleur : doubles clics, date conservée pendant/à l’échec de l’import, rechargement des zones après réussite. Tests de rendu : retrait des exemples et présence des contrôles aux trois largeurs. Essais navigateur réalisés avec un serveur de fixtures isolé ; aucune synchronisation réelle n’est déclenchée par ces essais.
# Diagnostic de données absentes — 14 septembre 2026

Le contrôle a confirmé un compte sélectionné, un onboarding terminé et zéro ligne dans les métriques importées. Des imports antérieurs étaient marqués réussis avec 267 éléments traités ; ce compteur comprend les structures publicitaires et ne prouve pas la présence de métriques. La vérification du jeton existant a échoué avec `META_TOKEN_UNVERIFIED`. Aucune autorisation Marketing plus récente n'était enregistrée au moment de la lecture.

Le dashboard expose désormais les problèmes de connexion dès son chargement, y compris les jetons non vérifiés et l'expiration de l'accès aux données. Le contrôle de synchronisation devient « Reconnecter Meta » et conduit au parcours existant, sans ajouter de deuxième bouton principal. Les données historiques disponibles restent consultables ; les métriques absentes ne deviennent pas zéro. Un import vide n'est plus présenté comme une actualisation des chiffres réussie.

La cause de l'absence de métriques dans les imports précédant ce contrôle reste à établir avec un accès Meta vérifié et les réponses Insights du compte/période concernés. La reconnexion OAuth du connecteur technique Supabase a échoué pendant l'investigation ; aucune lecture supplémentaire ni comparaison Ads Manager n'a donc été annoncée comme réussie. Tests du correctif : 52 tests applicatifs et compilation de production réussis.

## Import progressif (14 septembre 2026)

Le déclencheur de sauvegarde de l’onboarding lance la synchronisation dans la même transaction que la validation Business Manager/comptes (passage à l’étape des pages). Aucun besoin de page, pixel, site ou plan pour ce lancement. Un import actif est réutilisé ; la fin d’onboarding ne déclenche plus une deuxième demande depuis le navigateur.

Les nouveaux imports visitent d’abord les sept jours les plus récents : compte, campagnes, publicités, placements, puis autres répartitions. Ils poursuivent les semaines précédentes jusqu’aux 90 jours convenus. Les anciens curseurs conservent leur ordre pour éviter de perdre des pages à la mise à jour. Le dispatch passe de cinq à deux secondes, sans augmenter la concurrence maximale ni supprimer la limitation Meta par compte ou le recul sur quota.

Chaque combinaison niveau/répartition/semaine est publiée atomiquement après sa dernière page Meta. Une page intermédiaire ne devient pas visible. Un résultat vide remplace les anciennes lignes du même lot, sans effacer les autres niveaux ou semaines. Le staging est conservé jusqu’au remplacement final atomique de l’import complet. Une interruption conserve les lots achevés ; les valeurs affichées peuvent donc être partielles, signalées dans le bandeau. La date de dernière synchronisation complète n’avance qu’à la réussite finale.

Le bandeau supérieur affiche compte, étape et éléments réellement traités ; la progression des lots est déterminée par les checkpoints. Le navigateur recharge les zones quand un checkpoint change, pas seulement quand le job termine. Les alertes de performance sont différées jusqu’à la fin de l’import pour éviter de juger un jeu de données encore incomplet.

Diagnostic du compte testé : le 14 septembre à 09:45 UTC, l’ancien import démarré à 09:25 avait traité 9 399 éléments sans erreur, mais aucune métrique n’était encore publiée. Cette attente provenait de la publication globale différée et du parcours des jeux de données, pas d’une absence de données Meta. La durée dépend du nombre d’entités/pages et des quotas ; aucun délai fixe n’est promis.

Références : [Supabase, limites du worker](https://supabase.com/docs/guides/functions/limits), [Meta, modèle officiel des rapports asynchrones](https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/adreportrun.py). Les appels Insights actuels restent bornés par semaine et paginés dans notre file durable ; aucun traitement de l’historique complet dans la requête HTTP utilisateur.

Validation en production : migration `20260914093844` et worker déployés. L’ancien import complet a terminé à 09:47:15 UTC après 21 min 28 s (11 283 éléments traités). L’actualisation de contrôle déclenchée depuis le dashboard a réussi de 09:49:39 à 09:51:39 UTC (2 098 éléments, environ 2 minutes). Ces deux durées portent sur des périmètres différents et ne mesurent pas un facteur d’accélération. Après actualisation, le navigateur affiche les données réelles du compte en EUR : pour la période du 7 au 14 septembre, 128,65 EUR, 36 863 impressions et 3 032 clics ; campagne et placements sont également présents. Le délai exact du premier lot d’un nouvel import initial reste à mesurer en conditions réelles ; le déclenchement anticipé et la publication des lots avant la fin sont vérifiés par les tests PostgreSQL.

## Médias publicitaires (14 septembre 2026)

Le titre « Meilleures publicités » est conservé. Le classement utilise désormais les critères par événement décrits ci-dessous. Les médias sont résolus à la demande par `POST /api/ads/{id}/media`, avec contrôle des droits par compte, déduplication et cache de quinze minutes dans les jobs `meta.media`. Aucun jeton Meta n’est envoyé au navigateur.

Le worker lit la créative puis le fichier vidéo. Pour les vidéos appartenant à une page, il utilise son jeton uniquement en mémoire côté serveur, puis, si nécessaire, parcourt la bibliothèque vidéo autorisée du compte. Les requêtes sont paginées et soumises au quota commun. Les résultats ne contiennent que les URLs HTTPS de médias, jamais le HTML du fournisseur ni un jeton d’accès. L’absence de fichier lisible est explicitée, sans transformer une vidéo en image.

Le lecteur possède Play, les contrôles natifs et une prélecture muette au survol ; quitter la zone arrête cette prélecture, tandis qu’une lecture lancée par clic continue. Les images et éléments de carrousel sont chargés à l’ouverture de chaque ligne. Tests : droits et cache dans PostgreSQL, URLs sans credentials, identification des formats, survol muet et maintien après clic. Vérification réelle : le fichier de la publicité test est résolu avec le jeton de sa page, alors que la lecture avec le jeton utilisateur ne retournait pas de source.


## Classement par événement de conversion

`lyads_account_ads` agrège et trie en PostgreSQL, avec RLS, sur les comptes et dates demandés. Campagnes actives et arrêtées sont incluses. L’événement vient de `adset.promoted_object.custom_event_type` ou `custom_conversion_id`, puis des objectifs d’optimisation explicitement reconnus (leads, clics, vues de destination, interactions, mentions J’aime). Un objectif « ventes » seul ne prouve pas un événement achat. Les objectifs non identifiés ne sont pas devinés : leurs publicités restent consultables sans rang.

Classement **par événement**, présenté par pages de dix publicités : achats par ROAS décroissant, coût par achat croissant, achats décroissants ; autres événements par coût par résultat croissant, résultats décroissants. Identifiant stable en dernier départage. Aucun score IA ni mélange entre lead et achat. Les valeurs ne sont jamais additionnées entre alias Meta (`purchase` et `omni_purchase`, par exemple). ROAS absent laisse une annonce achat sans rang ; aucun repli sur la dépense.

Les seuils existants du compte sont réutilisés : `min_days` (3 par défaut), `min_purchases` utilisé ici comme minimum de résultats de l’événement (10), `min_impressions` (1000), `min_clicks` (30), `min_spend` (0 avec dépense strictement positive obligatoire). Ils constituent un garde-fou de volume, pas une preuve statistique ni une garantie de rentabilité. Chaque jour importé doit comporter les métriques nécessaires ; métrique manquante reste inconnue, elle ne devient pas zéro. Le RPC retourne les seuils, le volume, l’indicateur de suffisance pour chaque annonce classée et des informations de pagination. Des snapshots non quotidiens ou dupliqués empêchent de classer la publicité.

La synchronisation importe désormais `promoted_object`. Les structures importées avant cette évolution nécessitent une actualisation pour identifier les achats. Les vidéos conservent leur lecteur et leur prélecture au survol.

## Cibles métier et garde-fous automatiques

Le formulaire expose uniquement `target_roas`, `target_cpr` (coût par résultat générique), `target_cpl` (coût par inscription/lead) et `target_cpa` (coût par achat, nom historique conservé pour préserver les valeurs existantes). Les cibles restent facultatives, strictement positives et dans la devise du compte, sauf le ROAS qui est un ratio. Les champs techniques ne sont plus acceptés par l’API et leurs droits INSERT/UPDATE ont été retirés à `authenticated` au niveau des colonnes PostgreSQL ; leurs valeurs par défaut et leur gestion restent côté plateforme.

Le moteur `alerts-v2` choisit la cible à partir de l’événement réellement configuré : achat → cible achat, lead ou inscription → cible inscription, sinon cible CPR. La cible CPR sert de repli uniquement lorsqu’une cible spécifique manque. Sans cible correspondante, aucune alerte de dépassement de coût n’est créée. Le ROAS cible concerne uniquement les achats. Les recommandations futures devront lire les mêmes cibles persistées ; cette évolution ne crée pas le moteur de recommandations encore absent.

Une campagne n’est évaluée globalement que si tous ses ensembles partagent un même événement identifié. Sinon, les dépassements sont évalués par ensemble, sans mélanger achats et leads. Fatigue et déséquilibre utilisent également le coût du résultat configuré ; les comparaisons budgétaires restent séparées par événement, objectif d’optimisation et attribution. Les preuves affichent le nombre d’achats, d’inscriptions ou de résultats correspondant. La nouvelle version de clé de cache déclenche une nouvelle analyse après migration et après changement de cibles.


### Liste repliable de toutes les publicités

`lyads_account_ads` remplace l’appel du widget à `lyads_ranked_ads`. Toutes les publicités importées du compte sont consultables, y compris les actives sans métriques sur la période. La base calcule le classement par événement et renvoie dix lignes à la fois avec `nextOffset`; « Afficher plus de publicités » permet de parcourir le reste. Le tri et la pagination sont exécutés en PostgreSQL. La pagination par position est appliquée après l’agrégation et le classement déterministe (identifiant comme dernier critère); une synchronisation peut actualiser le classement entre deux pages.

Les publicités sous les seuils, sans événement identifié ou sans ROAS nécessaire restent consultables après les classées, sans rang ni barre de performance colorée. Leurs valeurs manquantes restent nulles. Pour les publicités classées, la barre représente le ROAS rapporté au meilleur ROAS du même événement et de la même devise, ou le meilleur CPR divisé par celui de la publicité. Elle ne représente pas la dépense.

Chaque ligne est repliée initialement. L’ouverture affiche le média à gauche et les statistiques à droite et déclenche seulement alors la résolution du média. La fermeture met la vidéo en pause. Les mentions globales sur la limite et le nombre de données insuffisantes ne sont pas affichées.
