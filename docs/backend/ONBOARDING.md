# Onboarding — exécution du parcours réel

Demande du propriétaire : priorité exclusive à l’intégration et à la validation du parcours. Autorisation Meta unique, choix Business Manager puis comptes sur une même page, pages et Pixel ensuite. Aucune donnée illustrative des maquettes dans le parcours affiché.

## Tâches

1. Découvrir les Business Managers, comptes, pages et pixels avec le jeton existant ; afficher les erreurs/permissions manquantes et les listes vides réellement constatées.
2. Sauvegarder dans Supabase l’organisation, les sélections Meta, les réponses métier, la progression et les provenances ; valider les liens entre ressources côté serveur.
3. Raccorder les composants existants sans modifier polices, palette ou illustrations ; remplir les listes avec Meta et les formulaires avec les seules réponses enregistrées.
4. Afficher le récapitulatif et la complétude calculés depuis ces données ; supprimer les analyses, paiements, échéances et recommandations d’exemple.
5. Tester isolation, modification du Business Manager, reprise, sauvegarde, absence de fixtures, erreurs Meta et parcours jusqu’à la confirmation ; publier sur GitHub/Supabase.

## Dix étapes

1. Autoriser l’accès publicitaire Meta.
2. Choisir Business Manager et comptes publicitaires sur la même page.
3. Sélectionner les pages Facebook.
4. Sélectionner les pixels et événements réellement disponibles.
5. Renseigner activité et offre.
6. Renseigner marché et audience.
7. Renseigner tunnel et historique publicitaire.
8. Vérifier le récapitulatif et confirmer les informations.
9. Choisir le plan (aucune simulation de paiement).
10. Confirmer la configuration enregistrée.

Les six sections du formulaire B7 restent accessibles ensemble, avec progression par paire de sections. B4 devient un alias du choix combiné B3. L’analyse automatique du site B8 reste un parcours facultatif ; en l’absence d’un moteur raccordé, aucune extraction ni progression fictive n’est affichée et la saisie manuelle reste disponible. Les étapes de sélection Meta peuvent signaler l’absence de page/pixel sans inventer une ressource. Le plan gratuit peut être réellement activé ; les paiements payants restent indisponibles jusqu’au raccordement d’un prestataire.

## Validation du 13 septembre 2026

- 34 tests applicatifs, 15 tests PostgreSQL/PGlite et 7 tests Deno passent ; compilation Next et contrôles TypeScript réussis.
- Parcours cliqué jusqu’à l’étape 10 dans un serveur de test isolé : entreprise, compte, page, pixel, événement, saisies métier, récapitulatif, activation gratuite. Rechargement et vue mobile vérifiés. Les données de ce scénario ne sont jamais entrées dans Supabase.
- GitHub et Supabase ont déployé le parcours. La récupération réelle `meta.inventory` a terminé sans erreur ni permission manquante : 89 éléments reçus entre Business Managers et comptes. Les 54 comptes existants ont été actualisés. Les Business Managers déjà identifiés via les comptes restent également présents dans le catalogue.
- Aucun choix de Business Manager ou compte, aucune réponse métier, aucune activation de plan n’a été enregistré pour le propriétaire pendant cette vérification.
- Le contrôle d’approbation a refusé le test réel supplémentaire des pages/pixels sur une ressource choisie automatiquement. Ces appels seront vérifiés avec les sélections faites par l’utilisateur dans son parcours ; les variantes remplies et vides ainsi que les erreurs fournisseur sont couvertes par les tests isolés.
- L’analyse automatique de site et les paiements sont signalés comme indisponibles. Le plan gratuit conserve la limite d’un compte prévue dans la maquette. Les autres fonctionnalités produit restent hors de cette étape de travail.

## Navigation et ressources obligatoires

Le Business Manager, au moins un compte publicitaire et au moins une page Facebook sont obligatoires. Seul le pixel peut être ignoré explicitement. Cette obligation est vérifiée dans le contrôleur et dans la RPC de sauvegarde ; la base refuse `pages_skipped=true`. Les anciens parcours ayant ignoré la page reprennent à l’étape des pages sans perdre les réponses ni les crédits déjà attribués.

Chaque écran après la connexion présente un seul bouton principal « Suivant ». L’actualisation des ressources est un bouton texte avec icône en haut ; « Continuer sans pixel » est un lien discret à côté de « Suivant ». Le premier écran conserve « Connecter mon Business Manager ».
