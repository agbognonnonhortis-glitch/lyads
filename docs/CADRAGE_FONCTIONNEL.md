# Lyads — cadrage fonctionnel après le formulaire

Décisions issues des réponses du propriétaire. Ce document remplace les propositions antérieures lorsqu’elles divergent des réponses ci-dessous. Les champs non renseignés ne valent pas accord.

## Confirmé

- Cibles : entreprises et agences dès le lancement.
- Supabase est confirmé comme base pour tout le projet : `beplqbktgbizhfcoixoi`. Le propriétaire autorise les opérations nécessaires sur cette base.
- Objectif final : SaaS complet, tous les modules fonctionnels avant le lancement public.
- Premier pilote technique : le compte publicitaire du propriétaire.
- Un utilisateur par espace au départ ; un espace peut regrouper plusieurs comptes publicitaires.
- Indicateurs à adapter aux objectifs des campagnes du compte sélectionné.
- Source des résultats publicitaires : données Meta accessibles par l’API à identifier.
- Ordre demandé : base de données, authentification, intégration de l’API et de l’agent, connexion des comptes, validation des données réelles. La connexion effective et la synchronisation du compte précèdent nécessairement l’analyse de ses données.
- Aucun développement des modules suivants avant validation de cette chaîne avec les données réelles.
- Contact et Règles automatisées reportés après le premier pilote ; ils ne sont pas exclus du périmètre final.
- Analyse complète et scan distincts ; leurs coûts doivent être vérifiés avant facturation.
- Alerte de solde sous 25 %, états vide/erreur/retard distincts, un seul bandeau système selon sa priorité.
- La fidélité aux maquettes reste impérative. Aucun redessin ni nouveau contenu commercial inventé.
- Le handoff sert uniquement au frontend ; ses propositions backend ne constituent pas des décisions d’architecture.
- Le propriétaire autorise la liaison du dossier au dépôt GitHub `agbognonnonhortis-glitch/lyads` et la publication du code du projet dans ce dépôt.

## Informations encore nécessaires

Le propriétaire indique « api » et mentionne une « edge function de l’agent d’optimisation ». Aucun code de cette fonction ni contrat de cette API n’a été trouvé dans les sources applicatives examinées. Il faut distinguer : API officielle Meta, API intermédiaire existante, fonction d’agent existante ou fonction encore à développer. URL de base, documentation et exemples de réponses expurgés suffisent pour commencer ; aucun secret dans ce document.

Date, pays ciblés et budget restent à définir. Hébergement, domaine et services complémentaires sont à mettre en place. Fréquences de traitement, modifications Meta autorisées et limites, tarifs, règles de crédits, paiements, fournisseurs IA, conservation des données, notifications et contenus publics ne sont pas validés.

## Architecture proposée, pas encore déployée

Conserver Next.js pour les écrans et utiliser PostgreSQL via Supabase, désormais choisi par le propriétaire. Prévoir Supabase Auth pour les utilisateurs et sessions, puis des fonctions serveur pour la connexion Meta, la synchronisation et l’appel de l’agent. Le lieu d’exécution de ces traitements sera adapté au contrat de l’API et à leurs durées.

Les traitements longs devront être découpés ou confiés à une file de travaux durable selon le contrat de l’API ; le terme « Edge Function » ne suffit pas à garantir qu’un import complet pourra tenir dans une seule invocation.

Références consultées :
- https://supabase.com/docs/guides/database/overview
- https://supabase.com/docs/guides/auth
- https://supabase.com/docs/guides/functions/limits

## Premier modèle de données à détailler

| Ensemble | Rôle |
|---|---|
| Utilisateurs et espaces | Propriétaire de l’espace ; isolation entre utilisateurs |
| Connexions Meta | Identité autorisée, permissions, expiration, références aux secrets conservés côté serveur |
| Comptes publicitaires | Identifiant Meta, espace propriétaire, devise, fuseau, accès |
| Campagnes, ensembles et publicités | Hiérarchie et identifiants externes ; objectifs et statuts reçus |
| Mesures publicitaires | Période, niveau, devise, attribution, ventilation et valeurs renvoyées par l’API |
| Synchronisations | État, date, progression, erreurs et reprise sans duplication |
| Analyses et recommandations | Données justificatives, période, version du traitement et résultat de l’agent |
| Journal des actions | Historique des demandes et résultats ; exécution Meta désactivée dans le premier raccordement |

Le schéma SQL final sera adapté aux données réellement renvoyées par l’API identifiée. Ne pas transformer un champ absent en zéro ni fabriquer un revenu ou un ROAS manquant. Conserver séparément les données source, les calculs dérivés et les estimations de l’agent.

## Critères de validation du premier jalon

1. Inscription, connexion, déconnexion et récupération d’accès opérationnelles.
2. Deux utilisateurs de test ne peuvent pas accéder aux données de l’autre.
3. Le propriétaire connecte son compte et retrouve les ressources réellement autorisées.
4. Les données sont enregistrées durablement et restent disponibles après rechargement.
5. Une resynchronisation ne crée pas de doublons.
6. Tableau de bord et gestionnaire utilisent les données réelles, avec date de synchronisation et états d’erreur appropriés.
7. Les indicateurs sont rapprochés de Meta avec les mêmes période, devise, fuseau et attribution ; tout écart est expliqué.
8. L’agent consomme ces données et retourne un résultat traçable ; aucune recommandation factice de la démonstration n’apparaît dans ce parcours réel.
9. Aucun module supplémentaire n’est entrepris avant validation de ce jalon.

État actuel : le projet est poussé sur GitHub et la liaison de branche Supabase a été corrigée par le propriétaire. Les clients Supabase sont configurés localement. Après le push de relance sur `main`, les 12 tables du socle sont présentes dans le projet principal et refusent toutes l’accès anonyme ; voir `BASE_DE_DONNEES.md`. Les tests PostgreSQL locaux et la compilation GitHub réussissent. La recette des droits avec deux véritables sessions Supabase Auth, l’authentification applicative et la connexion Meta restent à réaliser.
