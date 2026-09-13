# Tableau de bord : données et synchronisation

La page C1.1 utilise les cadres et polices de la maquette, avec un rendu serveur qui retire les exemples avant l’envoi au navigateur. Aucun script de simulation de la maquette ne s’exécute sur cette page.

## Lecture

`GET /api/dashboard/{context|kpis|series|campaigns|placements|creatives|alerts|recommendations}` accepte `organization`, `accounts` (UUID séparés par des virgules), `since`, `until`. La période est limitée à 90 jours ; la comparaison porte sur les jours immédiatement précédents, de même durée. Les dates correspondent aux jours publicitaires Meta ; le raccourci initial utilise le fuseau du premier compte sélectionné.

Chaque zone est indépendante et chaque réponse inclut la dernière synchronisation réussie par compte. La date commune est la plus ancienne des comptes sélectionnés. Si l’un des comptes n’a jamais été synchronisé, la date commune est absente. Les autorisations de l’organisation, les comptes retenus pendant l’onboarding et la RLS limitent les résultats.

La fonction SQL `lyads_dashboard_metrics`, exécutée avec les droits de l’appelant, agrège les décimales en PostgreSQL. KPI/courbes utilisent le niveau compte sans répartition ; campagnes, publicités et placements utilisent chacun leur jeu de données propre. Les répartitions ne sont jamais additionnées aux totaux.

CPC = dépense / clics. CPA = dépense / achats ; ROAS = valeur des achats / dépense. Les achats utilisent exactement l’action Meta `purchase`, sans additionner ses alias ou d’autres conversions. Une valeur absente ou un dénominateur nul produit `null`. Les montants de devises différentes ne sont pas additionnés. Les KPI indiquent lorsque seuls certains comptes sélectionnés ont des lignes disponibles. Une période sans lignes reste « aucune donnée », pas zéro inventé.

## Action Synchronisé

Le clic appelle `POST /api/accounts/{id}/sync` pour les comptes sélectionnés, avec une clé d’idempotence par demande. Le serveur applique la limitation existante de cinq minutes et place le travail dans la file. Le navigateur suit les tâches, désactive le bouton pendant le traitement, puis recharge les zones. Une transition queued → running n’annonce pas une réussite. Une erreur conserve la date du dernier import réussi et affiche une explication en français. Un rechargement de page retrouve les tâches en cours. Les réponses d’un ancien filtre ne remplacent pas les nouvelles.

## Limites explicites

Les détecteurs de performance et le moteur de recommandations ne sont pas encore activés : aucune recommandation ni badge de rentabilité n’est fabriqué. `sufficientData` reste faux tant que les règles de jugement ne sont pas configurées. Les alertes disponibles concernent les statuts de diffusion Meta et les connexions expirées. Les cinq publicités affichées sont ordonnées par dépense, pas déclarées gagnantes. Les listes de campagnes et placements sont limitées à 50 résultats.

## Vérifications

Tests PostgreSQL : calculs décimaux, exclusion des répartitions, achats non doublés, valeurs absentes, comptes non autorisés. Tests du contrôleur : doubles clics, date conservée pendant/à l’échec de l’import, rechargement des zones après réussite. Tests de rendu : retrait des exemples et présence des contrôles aux trois largeurs. Essais navigateur réalisés avec un serveur de fixtures isolé ; aucune synchronisation réelle n’est déclenchée par ces essais.
