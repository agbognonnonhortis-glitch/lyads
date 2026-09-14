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

Le top 5 reste trié par dépense décroissante sur le compte et la période sélectionnés ; il ne constitue pas un classement de rentabilité. Les médias sont résolus à la demande par `POST /api/ads/{id}/media`, avec contrôle des droits par compte, déduplication et cache de quinze minutes dans les jobs `meta.media`. Aucun jeton Meta n’est envoyé au navigateur.

Le worker lit la créative puis le fichier vidéo. Pour les vidéos appartenant à une page, il utilise son jeton uniquement en mémoire côté serveur, puis, si nécessaire, parcourt la bibliothèque vidéo autorisée du compte. Les requêtes sont paginées et soumises au quota commun. Les résultats ne contiennent que les URLs HTTPS de médias, jamais le HTML du fournisseur ni un jeton d’accès. L’absence de fichier lisible est explicitée, sans transformer une vidéo en image.

Le lecteur possède Play, les contrôles natifs et une prélecture muette au survol ; quitter la zone arrête cette prélecture, tandis qu’une lecture lancée par clic continue. Les images et éléments de carrousel sont visibles sans ouvrir chaque ligne. Tests : droits et cache dans PostgreSQL, URLs sans credentials, identification des formats, survol muet et maintien après clic. Vérification réelle : le fichier de la publicité test est résolu avec le jeton de sa page, alors que la lecture avec le jeton utilisateur ne retournait pas de source.
