# Socle de données Lyads

Le handoff est une référence frontend uniquement. Ce modèle technique découle du cadrage fonctionnel validé : Supabase, un propriétaire par espace, plusieurs comptes publicitaires, données Meta réelles, synchronisations, analyses et historique. Il ne reprend pas la pile backend indicative du handoff.

## État vérifié

- Le client local communique avec Auth et l’API de données du projet `beplqbktgbizhfcoixoi`.
- La migration du socle est préparée et testée localement avec PostgreSQL via PGlite, dépendance réservée aux tests. Supabase reste l’unique base de l’application.
- Les tests simulent uniquement la frontière d’identité Supabase (`auth.users`, `auth.uid()`, rôles) et exécutent réellement le SQL, les contraintes, privilèges et politiques RLS.
- Le propriétaire a relié la branche GitHub. Le push de relance `f43c2c4` sur `main` a déclenché le contrôle Supabase. La table des espaces est passée d’une réponse `PGRST205` (absente du cache de schéma) à `42501` (présente, accès refusé au visiteur non connecté).
- Les 12 tables du socle répondent désormais sur le projet principal `beplqbktgbizhfcoixoi` et refusent toutes l’accès anonyme. Les vérifications ont utilisé `limit=0` et n’ont lu ni écrit de données métier.
- Le commit de fusion `9ec4a76` a obtenu les deux contrôles réussis : « Supabase Preview » et « verify ». La présence des tables est confirmée indépendamment ; la recette avec deux véritables sessions Auth et la lecture de l’historique distant des migrations restent à réaliser.

## Tables du premier pilote

| Table | Fonction |
|---|---|
| `lyads_profiles` | Nom de l’utilisateur, relié à Supabase Auth ; aucun mot de passe stocké ici |
| `lyads_workspaces` | Espace et son propriétaire unique |
| `lyads_meta_connections` | Identité Meta, permissions reçues et dates ; aucun jeton secret |
| `lyads_ad_accounts` | Compte publicitaire, devise réelle, fuseau et niveau d’accès |
| `lyads_campaigns` | Campagnes importées et identifiants Meta |
| `lyads_ad_sets` | Ensembles rattachés à leur campagne et compte |
| `lyads_ads` | Publicités rattachées à leur ensemble et compte |
| `lyads_sync_runs` | Suivi des imports et clés de reprise sans duplication |
| `lyads_insight_snapshots` | Mesures source, période, contexte de requête et date de récupération |
| `lyads_analyses` | Analyses ou scans, version du traitement, copie des entrées et résultat |
| `lyads_recommendations` | Recommandations reliées à une analyse |
| `lyads_action_events` | Journal des événements, ajout seul pour les traitements serveur |

Les structures détaillées des réponses Meta et de l’agent restent à adapter à leurs contrats réels. Les objets JSON n’inventent ni colonnes de revenus, ni ROAS, ni taux de change. Une mesure absente reste absente ; les montants décimaux source peuvent être conservés en chaînes exactes. Les calculs ultérieurs devront utiliser une arithmétique décimale et la devise du compte. Les imports devront valider et expurger leurs objets source avant enregistrement.

La clé de déduplication des mesures devra être calculée à partir du compte, objet, période, attribution, ventilations et contexte complet. Les tests prouvent l’unicité en base ; l’importeur qui construit cette clé reste à réaliser.

## Accès

Les 12 tables ont RLS activée et des droits explicites. Un visiteur non connecté ne peut rien lire ni écrire. Un utilisateur connecté lit uniquement les lignes de ses espaces. Il peut créer son profil et son espace et modifier leurs noms ; il ne peut pas transférer leur propriété.

Les écritures de données Meta, permissions, résultats et historique sont réservées au serveur. Les clés étrangères composites empêchent de relier un objet à un autre compte ou espace, même lors d’une écriture serveur. Le rôle serveur peut ajouter des événements mais ne reçoit pas de droit de modification ou suppression du journal. Un administrateur PostgreSQL conserve ses privilèges habituels : ce journal n’est pas un stockage inviolable.

Le stockage des jetons Meta, la synchronisation effective et les actions publicitaires ne sont pas implémentés par cette migration. Aucune exécution Meta n’est déclenchée. Aucun tarif ni crédit n’est initialisé.

## Vérification et livraison

```bash
npm ci
npm test
npm run test:db
npm run typecheck
npm run build
```

Le workflow GitHub vérifie le projet à chaque push et pull request. L’intégration Supabase réalise séparément le déploiement. Le premier push avait été ignoré car la branche n’était pas associée ; après correction par le propriétaire, un nouveau push sur `main` a déclenché Supabase et les 12 tables sont devenues présentes dans la base principale.

Avant les prochaines évolutions, examiner le schéma et l’historique distant avec `supabase/inspection.sql` et les outils disponibles. La migration initiale ne supprime aucun objet existant et échoue si un nom de table est déjà utilisé, au lieu d’écraser l’existant.

Après application, vérifier les tables et migrations distantes, les conseillers de sécurité et deux véritables sessions Supabase. La validation locale ne remplace pas cette recette distante. Aucun déploiement distant ne doit être annoncé sur la seule base d’un push GitHub réussi.

Références techniques : [RLS Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security), [permissions explicites des nouvelles tables](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically), [PGlite](https://pglite.dev/docs/api).

## Initialisation des comptes

La migration `20260913011307_lyads_account_initialization.sql` ajoute `lyads_initialize_account(text)`, appelée après authentification. Elle crée le profil et le premier espace dans une transaction sous les droits de l’utilisateur, conserve les noms existants et sérialise les appels simultanés par utilisateur. Les tests PostgreSQL couvrent les appels répétés, l’isolation et le refus des appels anonymes. Voir `AUTHENTIFICATION.md` pour la recette du parcours complet.
