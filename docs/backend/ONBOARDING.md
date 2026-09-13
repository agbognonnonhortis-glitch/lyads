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
