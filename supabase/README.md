# Validation du socle Supabase

Projet principal : `beplqbktgbizhfcoixoi`.
Dépôt : `agbognonnonhortis-glitch/lyads`.
Répertoire de travail de l’intégration GitHub : `.`.

La migration crée 12 tables isolées par espace. Elle ne contient aucune donnée de démonstration. Le fichier `inspection.sql` permet d’examiner une base existante avant application.

Les tests locaux sont exécutés par `npm run test:db`. Le workflow `Lyads checks` vérifie également l’intégrité des maquettes, TypeScript et la compilation.

Le premier push sur `main` a confirmé la présence de l’intégration Supabase, mais son contrôle a été ignoré : cette branche Git n’était associée à aucune branche Supabase. Une pull request permet de vérifier la création d’une prévisualisation par l’intégration existante. Un contrôle GitHub vert ne signifie pas, à lui seul, que la base principale a reçu les migrations.

La [pull request de validation](https://github.com/agbognonnonhortis-glitch/lyads/pull/1) a confirmé un second réglage : la création automatique de branches de prévisualisation par pull request est désactivée. Supabase a ignoré ce contrôle avec le message « Creating a new preview branch per PR is disabled ». Le réglage est situé dans les [intégrations du projet Lyads](https://supabase.com/dashboard/project/beplqbktgbizhfcoixoi/settings/integrations). Aucun déploiement distant n’a donc été confirmé par cette vérification.

Le déploiement vers la base principale requiert l’association de la branche de production et l’option de déploiement correspondante dans l’intégration Supabase. La prévisualisation doit d’abord confirmer que la migration s’applique. Consulter ensuite l’historique distant et réaliser les tests avec de vraies sessions Auth avant d’annoncer la fin du raccordement fonctionnel.

Référence : [intégration GitHub Supabase](https://supabase.com/docs/guides/deployment/branching/github-integration).
