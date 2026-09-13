# Marketing API — lecture du guide et écarts avec Lyads

Analyse du 14 septembre 2026, à partir du document « Marketing API Use Cases » transmis par le propriétaire et du code local. Il s’agit du guide de configuration de l’application et de ses cas d’utilisation, pas de la référence complète des endpoints Marketing API.

Les consignes fonctionnelles de Lyads restent prioritaires : données réelles, secrets côté serveur, droits par compte et aucune écriture publicitaire sans confirmation utilisateur. Les instructions de publication présentes dans le guide ne constituent pas une demande de publier l’application Meta.

## Ce qui existe dans le code

- OAuth Marketing distinct de la connexion Facebook à Supabase Auth ; échanges côté serveur avec `META_APP_ID` et `META_APP_SECRET`, puis chiffrement du jeton obtenu par organisation et identité Meta.
- Vérification des permissions réellement accordées via `me/permissions` : les permissions demandées ne sont pas considérées comme automatiquement obtenues.
- Inventaire des Business Managers, comptes possédés ou partenaires, pages possédées ou partenaires, pixels et statistiques d’événements. La découverte est paginée et traitée dans la file de travaux.
- Import des structures publicitaires et des métriques, limitation de débit, suivi des quotas et gestion des erreurs en français.
- Contrôle des dates d’expiration enregistrées et traitement des erreurs nécessitant une reconnexion.

Références de code : `supabase/functions/lyads-meta/index.ts`, `supabase/functions/_shared/meta.ts`, `supabase/functions/_shared/inventory.ts`, `supabase/functions/lyads-worker/index.ts`.

## Écarts et ordre de traitement

| Priorité | Sujet | État constaté / travail à réaliser |
| --- | --- | --- |
| 1 | Changement d’application Meta | Les nouveaux secrets servent aux nouveaux échanges OAuth. Le worker utilise encore le jeton chiffré enregistré pour chaque connexion. Il manque un contrôle de l’application émettrice du jeton et une gestion explicite du changement d’application. Ne pas remplacer les jetons de tous les clients par un jeton global. |
| 1 | Validité et expiration des accès | Compléter la vérification du jeton, de son application et de l’expiration d’accès aux données. Le champ `data_access_expires_at` est vérifié par le worker mais n’est pas renseigné par le callback actuel. Un health check positif ne prouve pas la validité d’un jeton auprès de Meta. |
| 1 | Validation des données réelles | Après autorisation avec la bonne application, vérifier les ressources choisies puis comparer période, fuseau, devise, attribution et métriques avec Ads Manager. Ce jalon demeure bloquant avant les écritures publicitaires. |
| 2 | Facebook Login for Business | L’URL OAuth actuelle utilise des scopes explicites, sans `config_id`. Vérifier la configuration de la nouvelle application avant d’ajouter ce parcours ; ne pas mélanger implicitement les modes jeton utilisateur et utilisateur système. |
| 2 | Permissions par fonction | Le code demande `ads_read`, `ads_management`, `pages_show_list`, `business_management`. Le guide cite aussi `pages_read_engagement`. Vérifier les permissions requises pour chaque endpoint utilisé, puis compléter la demande et les indicateurs de fonctions disponibles. Ne pas demander toutes les permissions du document sans besoin fonctionnel. |
| 2 | Accès aux comptes clients | Préparer les cas d’utilisation de mesure et de gestion publicitaire, ainsi que les éléments de vérification et d’App Review nécessaires dans la configuration effective de Meta. Le succès avec le compte du développeur ne valide pas l’accès aux comptes de clients externes. |
| 3 | Webhooks et cycle de vie | Aucun endpoint webhook Meta identifié dans les fonctions examinées. Prévoir vérification du callback et de la signature, déduplication et traitement en file, ainsi que les parcours de désautorisation et de suppression des données. La synchronisation reste nécessaire pour réconcilier les données. |
| 3 | Catalogue complet | Compléter les ressources nécessaires aux futurs modules : Instagram, audiences et catalogues, selon les permissions et fonctionnalités activées. |

## Limites de la documentation reçue

Le guide permet de préparer la configuration, mais ne suffit pas à définir les champs Insights, les combinaisons de breakdowns, l’attribution, les rapports asynchrones ou les contraintes d’écriture des campagnes. Chaque implémentation devra utiliser la référence de l’endpoint correspondant à la version Graph configurée.

Les noms `page_manage_ads` et `page_manage_metadata` figurant dans le document doivent être vérifiés dans la référence officielle avant tout usage ; ils ne sont pas ajoutés aux scopes du code.

Les pages officielles d’autorisation et de Facebook Login for Business ont renvoyé HTTP 429 pendant cette lecture. Les exigences Meta mentionnées ici proviennent donc du document fourni et restent à confirmer dans la configuration effective de l’application. Aucun changement d’autorisation, de webhook ou de version Graph n’a été déployé sur cette seule base.

## Références à consulter

- [Marketing API](https://developers.facebook.com/documentation/ads-commerce/marketing-api)
- [Autorisation Marketing API](https://developers.facebook.com/documentation/ads-commerce/marketing-api/get-started/authorization)
- [Facebook Login for Business](https://developers.facebook.com/documentation/facebook-login/facebook-login-for-business)
- [Webhooks des comptes publicitaires](https://developers.facebook.com/docs/graph-api/webhooks/getting-started/webhooks-for-ad-accounts)
- [Référence des permissions](https://developers.facebook.com/docs/permissions)

Cette analyse documente les écarts ; elle ne déclare pas ces compléments implémentés ni l’application Meta approuvée.
