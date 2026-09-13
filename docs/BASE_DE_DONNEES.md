# Socle de données Lyads

Le handoff est une référence frontend uniquement. Ce modèle technique découle du cadrage fonctionnel validé : Supabase, un propriétaire par espace, plusieurs comptes publicitaires, données Meta réelles, synchronisations, analyses et historique. Il ne reprend pas la pile backend indicative du handoff.

## État vérifié

- Le client local communique avec Auth et l’API de données du projet `beplqbktgbizhfcoixoi`.
- La migration du socle est préparée et testée localement avec PostgreSQL via PGlite, dépendance réservée aux tests. Supabase reste l’unique base de l’application.
- Les tests simulent uniquement la frontière d’identité Supabase (`auth.users`, `auth.uid()`, rôles) et exécutent réellement le SQL, les contraintes, privilèges et politiques RLS.
- Aucune application distante de cette migration n’est encore confirmée. Le CLI actuellement connecté refuse l’accès à la référence Lyads ; les outils MCP ne sont pas exposés à la session.

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

Le workflow GitHub vérifie le projet à chaque push et pull request. Il ne déploie pas la base. Une intégration Supabase configurée dans son tableau de bord est distincte de ce workflow ; son comportement sur la branche cible doit être vérifié.

Avant application distante, exécuter `supabase/inspection.sql` sur le projet cible, examiner les éventuelles tables existantes et l’historique des migrations, puis adapter la migration si nécessaire. Elle ne supprime aucun objet existant et échoue si un nom de table est déjà utilisé, au lieu d’écraser l’existant.

Après application, vérifier les tables et migrations distantes, les conseillers de sécurité et deux véritables sessions Supabase. La validation locale ne remplace pas cette recette distante. Aucun déploiement distant ne doit être annoncé sur la seule base d’un push GitHub réussi.

Références techniques : [RLS Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security), [permissions explicites des nouvelles tables](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically), [PGlite](https://pglite.dev/docs/api).
