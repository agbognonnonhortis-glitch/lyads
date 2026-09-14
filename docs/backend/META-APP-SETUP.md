# Configuration Meta et validation avant ouverture aux clients

État du 14 septembre 2026. Le guide transmis par le propriétaire sert de référence de configuration. Les essais avec un compte interne ne constituent pas une approbation Meta pour les comptes de clients externes.

## Vérifications du déploiement

La migration `20260913235607` est appliquée sur le projet Supabase. Les fonctions OAuth, worker et webhook sont actives. Vérifications locales : 49 tests applicatifs, 20 tests PostgreSQL et 17 tests Deno, compilation de production réussie. Les vérifications GitHub et Supabase du premier déploiement ont réussi.

Le contrôle réel du jeton enregistré a été refusé par Meta : aucune application émettrice n’a donc été enregistrée comme vérifiée. Le contrôle reste fermé aux lectures publicitaires tant que le jeton n’est pas vérifié ; renouveler l’autorisation OAuth permet de repartir du jeton délivré par l’application configurée. La permission `pages_read_engagement` est absente des octrois actuellement enregistrés.

Le health check OAuth répond HTTP 200, une livraison webhook sans signature est rejetée avec HTTP 401. La vérification du callback webhook répond HTTP 503 tant que `META_WEBHOOK_VERIFY_TOKEN` n’est pas configuré. Aucun abonnement Meta ni validation de chiffres dans Ads Manager n’est déclaré terminé.

## Contrôles implémentés

- À chaque nouvelle autorisation Marketing, introspection du jeton via `debug_token` avec les identifiants de l’application côté serveur. Vérification de `is_valid`, de l’application émettrice, du type utilisateur et de l’identité ; enregistrement distinct de l’expiration du jeton et de l’accès aux données. Le retour `me` doit confirmer la même identité.
- Avant une lecture de ressources, rejet d’un jeton enregistré pour une autre application. Les anciennes connexions sans provenance et les contrôles de plus de six heures sont vérifiés à nouveau. Le planificateur déclenche aussi cette vérification indépendamment des imports.
- Une erreur d’identifiants de l’application n’est pas traitée comme la preuve que les jetons de tous les clients sont expirés. Les erreurs de fournisseur ne sont pas renvoyées brutes au navigateur.
- Les écritures de validation et de permissions vérifient que le jeton chiffré n’a pas été remplacé depuis le début du travail. Un ancien traitement ne peut pas invalider une nouvelle autorisation.
- La connexion reste « partielle » si des permissions attendues manquent. Le bouton existant de connexion relance OAuth pour une connexion partielle, expirée ou non encore vérifiée. Une notification de reconnexion mène à ce parcours.

## Application et permissions

Les secrets utilisés sont `META_APP_ID` et `META_APP_SECRET`, dans Supabase Edge Functions Secrets. Aucun jeton global ni jeton MCP ne remplace l’autorisation propre à chaque client.

Callback Marketing à enregistrer dans l’application Meta :

`https://beplqbktgbizhfcoixoi.supabase.co/functions/v1/lyads-meta/callback`

Ce callback est distinct de celui de Supabase Auth pour se connecter à Lyads avec Facebook. Si l’application utilisée pour Supabase Auth change aussi, sa configuration fournisseur doit être mise à jour séparément.

| Permission demandée | Utilisation prévue |
| --- | --- |
| `ads_read` | Lecture des performances publicitaires |
| `ads_management` | Gestion publicitaire après validation explicite dans Lyads ; sa présence ne déclenche aucune écriture |
| `business_management` | Découverte des Business Managers et de leurs ressources accessibles |
| `pages_show_list` | Accès à la liste des pages autorisées |
| `pages_read_engagement` | Lecture des informations de pages nécessaires au produit |

Les permissions réellement accordées restent la source de vérité. Une autorisation de périmètre ne garantit pas l’accès à tous les actifs : les erreurs par ressource restent prises en compte. Les permissions leads, Threads et catalogues ne sont pas demandées tant que leur fonctionnalité ne les nécessite pas. Le changement vers une configuration Facebook Login for Business par `config_id` n’est pas effectué implicitement.

Après changement d’application, utiliser **Connecter mon Business Manager** pour renouveler l’autorisation. Ne pas transmettre les secrets par messagerie et ne pas supprimer manuellement les données publicitaires déjà importées.

## Webhooks préparés

Callback :

`https://beplqbktgbizhfcoixoi.supabase.co/functions/v1/lyads-meta-webhook`

1. Définir une valeur aléatoire d’au moins 32 caractères dans le secret Supabase `META_WEBHOOK_VERIFY_TOKEN` ; il s’agit d’un secret de vérification du callback, pas d’un jeton d’accès Marketing API.
2. Dans le produit Webhooks de l’application Meta, enregistrer le callback et la même valeur de vérification. Choisir l’objet compte publicitaire et les champs disponibles correspondant aux changements publicitaires utiles. Vérifier dans la référence de la version utilisée les champs et abonnements par compte requis.
3. Vérifier une livraison de test émise par Meta, puis une livraison réelle d’un compte déjà sélectionné dans Lyads. La réception technique ne prouve pas que tous les abonnements sont actifs.

Le serveur répond au challenge uniquement avec le bon secret. Les POST exigent `X-Hub-Signature-256`, calculée sur les octets exacts du corps avec `META_APP_SECRET`. La taille est bornée à 256 Kio, la lecture à cinq secondes. Les événements identiques sont dédupliqués par empreinte et les reçus sont conservés 30 jours, sans corps brut ni contenu publicitaire.

Un événement de compte publicitaire rapproche la prochaine synchronisation d’un compte déjà sélectionné, dont la synchronisation est activée et dont la connexion appartient à l’application. Il ne sélectionne pas de nouveaux comptes et ne modifie aucune campagne. Une synchronisation déjà en cours n’efface pas la demande d’actualisation. Les données sont ensuite relues par la file existante, avec ses limites de débit.

La configuration du callback dans Meta, les abonnements et la publication éventuelle de l’application restent des étapes externes. Le déploiement du récepteur ne les effectue pas.

## Validation des chiffres réels

Au contrôle initial de ce lot, le compte sélectionné utilisait USD et le fuseau Europe/Paris. La table des métriques importées contenait zéro ligne. Cela ne suffit pas à conclure à l’absence d’activité : la comparaison avec Ads Manager reste à faire.

Pour une période explicite couverte par les 90 jours importés, relever le même compte et le même fuseau dans Ads Manager. Comparer dépense, impressions et clics ; préciser le type de clic utilisé. Pour les résultats, CPA et ROAS, utiliser le même événement de conversion et la même attribution que la requête enregistrée (`use_unified_attribution_setting=true`). Le dashboard calcule actuellement les achats à partir de l’action `purchase` : il ne faut pas comparer son CPA à un coût par prospect.

Conserver le compte, la période, la date d’export et les réglages d’attribution avec le résultat de comparaison. Une valeur manquante reste indisponible, jamais zéro par convention. En cas de divergence, examiner les réponses sources et la fenêtre de révision avant de modifier le calcul.

## Accès aux futurs clients

Préparation à compléter dans le tableau de bord Meta : cas d’utilisation mesure/gestion publicitaire, rattachement au Business Portfolio, vérification d’entreprise et accès Tech Provider lorsque Meta les demande, puis App Review et niveaux d’accès adaptés aux permissions retenues. Le document fourni mentionne aussi Ads Management Standard Access ; vérifier l’accès effectivement attribué à cette application.

Le dossier de revue doit montrer le parcours réel : connexion, sélection des ressources, lecture des données, puis confirmation explicite avant une écriture. Fournir les instructions et accès de test par les canaux de revue Meta, jamais dans GitHub. Les fonctions d’écriture non encore développées ne peuvent pas être présentées comme opérationnelles.

Avant ouverture externe : domaine HTTPS de production, politique de confidentialité, parcours de désautorisation et suppression des données effectivement opérationnels, statut de publication et permissions approuvées. Le récepteur de changements publicitaires ajouté ici ne remplace pas ces parcours de suppression et de désautorisation.

Références : [autorisation Marketing](https://developers.facebook.com/documentation/ads-commerce/marketing-api/get-started/authorization), [permissions](https://developers.facebook.com/docs/permissions), [webhooks des comptes publicitaires](https://developers.facebook.com/docs/graph-api/webhooks/getting-started/webhooks-for-ad-accounts), [Facebook Login for Business](https://developers.facebook.com/documentation/facebook-login/facebook-login-for-business). Plusieurs pages Meta étaient inaccessibles pendant ce travail ; les conditions exactes de revue et les champs d’abonnement doivent être confirmés dans l’application avant activation.
