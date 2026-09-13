# Validation du socle Supabase

Projet principal : `beplqbktgbizhfcoixoi`.
Dépôt : `agbognonnonhortis-glitch/lyads`.
Branche reliée : `main`. Répertoire de travail : `.`.

La migration crée 12 tables isolées par espace, sans données de démonstration. Les tests locaux sont exécutés par `npm run test:db`. Le workflow `Lyads checks` vérifie également l’intégrité des maquettes, TypeScript et la compilation.

Après correction de la liaison de branche par le propriétaire, le push de relance `f43c2c4` a déclenché Supabase. Les 12 tables sont maintenant présentes sur le projet principal. Les requêtes anonymes avec `limit=0` retournent toutes HTTP 401 et le code PostgreSQL `42501` : aucun accès public aux données.

La [pull request de validation](https://github.com/agbognonnonhortis-glitch/lyads/pull/1) a été fusionnée. Sur le commit `9ec4a76`, les contrôles « Supabase Preview » et « verify » sont tous deux réussis. Les anciens messages de branche non associée concernaient les tentatives précédentes.

Le fichier `inspection.sql` reste disponible pour examiner le schéma et l’historique avant les prochaines migrations. La recette avec deux véritables sessions Supabase Auth sera réalisée lors du raccordement des écrans d’authentification. Les tests PostgreSQL locaux ne remplacent pas cette vérification des sessions réelles.

Référence : [intégration GitHub Supabase](https://supabase.com/docs/guides/deployment/branching/github-integration).
