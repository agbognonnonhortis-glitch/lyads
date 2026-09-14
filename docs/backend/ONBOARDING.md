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

Le Business Manager et au moins un compte publicitaire sont obligatoires. Les pages Facebook et les pixels peuvent être ignorés explicitement via « Continuer sans page » et « Continuer sans pixel ». La RPC et les contraintes en base acceptent ces choix, y compris pour l’analyse du site et la finalisation. Les ressources choisies restent vérifiées contre les accès Meta de l’utilisateur. Après inscription, Paramètres → Comptes Meta propose les liens de configuration des pages et pixels ; leur ajout conserve la finalisation, le profil et les crédits et ramène aux paramètres.

Chaque écran après la connexion présente un seul bouton principal « Suivant ». L’actualisation des ressources est un bouton texte avec icône en haut ; « Continuer sans pixel » est un lien discret à côté de « Suivant ». Le premier écran conserve « Connecter mon Business Manager ».

## Analyse du site et nouveau profil d’entreprise

Étapes 5–7 : URL (`/configuration/entreprise`) → attente (`/configuration/analyse-site`) → formulaire (`/configuration/entreprise?section=review`). Les anciennes URL de sections ouvrent le nouveau formulaire. Les étapes 8–10 restent récapitulatif, plan, fin. Le formulaire expose uniquement : nom de l’entreprise, produit/service, description, bénéfices, problème résolu, prix facultatif saisi par l’utilisateur, liste des produits, niche, audience. Les anciens champs restent conservés en base mais ne sont plus présentés.

`website.analyze` passe par la file durable et le worker existants : lecture de la page publique puis jusqu’à quatre liens du même domaine (produits/services/à propos), un point de reprise par page, extraction structurée, validation des citations, sauvegarde atomique et notification. Coût utilisateur : 0 crédit, inclus dans l’onboarding ; maximum cinq lancements par jour et une minute entre deux lancements. Un lancement actif identique est réutilisé.

Secrets Supabase : `OPENAI_API_KEY` requis, `OPENAI_EXTRACTION_MODEL` facultatif (défaut `gpt-4.1-mini-2025-04-14`). L’appel utilise Responses, `store:false`, un schéma JSON strict sans prix, puis une validation locale des huit champs et de leurs citations exactes. Documents publics envoyés au fournisseur, aucun jeton Meta. Source et déduction restent distinguées par champ ; aucune valeur absente n’est inventée. Le nom validé à la suite du formulaire/récapitulatif devient le nom de l’espace dans le dashboard et le sélecteur d’entreprises.

Protection de lecture : HTTP(S) public uniquement, pas d’identifiants dans l’URL, DNS IPv4 validé et épinglé à la connexion, refus des plages privées/réservées, redirections bornées et restreintes au domaine canonique, limite de taille et durée, robots.txt respecté, aucun JavaScript exécuté, aucune authentification/captcha contourné. Les sites rendus uniquement en JavaScript, protégés ou refusant le robot offrent un parcours de correction/saisie manuelle.

Une nouvelle analyse conserve les valeurs manuelles (y compris les effacements) et les corrections concurrentes. Les résultats d’un ancien job ou d’un bail expiré ne sont pas appliqués. Le prix n’est jamais prérempli par le fournisseur. La récupération des résultats reprend au rechargement grâce à `analysis_job_id` enregistré.

Validation : tests d’extraction, de blocage des réseaux internes, des robots et preuves source ; tests PostgreSQL des permissions, limites, reprise et corrections concurrentes ; contrôleur URL/attente/formulaire ; parcours visuel isolé ordinateur/mobile ; lecture HTTP réelle d’une page publique. L’essai réel avec la clé du projet et une URL commerciale choisie par le propriétaire est distinct des réponses fournisseur simulées utilisées en tests.

Références d’implémentation : [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [secrets Edge Functions](https://supabase.com/docs/guides/functions/secrets).

### Correction de la lecture et des citations — 14 septembre 2026

Le `lookup` personnalisé de `node:http`/`node:https` provoquait `ERR_NOT_IMPLEMENTED` dans le runtime hébergé Supabase, alors que le test Deno local passait. La lecture utilise maintenant `Deno.connect` vers l’IPv4 publique validée, puis `Deno.startTls` avec le nom du site pour vérifier le certificat et transmettre SNI. Le lecteur HTTP/1.1 borne les en-têtes et le corps, gère les réponses chunked et conserve les contrôles de redirection et robots.txt. Les erreurs conservent une étape et un code de diagnostic sans secret ni contenu de page.

Le modèle sélectionne désormais l’identifiant d’un extrait serveur (650 caractères maximum). Le serveur résout cet identifiant vers une citation exacte et son URL avant la validation existante et l’enregistrement en base ; les identifiants inexistants sont refusés. Cela supprime les erreurs de transcription de citations sans accepter de sources inventées. Les valeurs manuelles et le prix restent préservés.

Tests : transport HTTP fragmenté/UTF-8/chunked, limites et troncatures, réseaux privés, robots, extraction, citations et identifiants de source. Deux URLs utilisateur récupérées en local avec le transport corrigé : `https://lionelhortis.com/guide-de-la-publicite-facebook/` et `https://go.lionelhortis.com/fbadstarter`.

Validation hébergée : le job utilisateur `f401c274-35f1-45bc-862b-fa455676b352` a réussi le 14 septembre 2026 à 09:03 UTC sur le worker v30, après lecture de deux pages. Produit identifié : « Guide de la publicité Facebook ». Sept champs ont été enregistrés ; les valeurs manuelles sont conservées. Coût utilisateur : 0 crédit. La notification de cet essai relancé a été mise à jour pour refléter sa réussite.
