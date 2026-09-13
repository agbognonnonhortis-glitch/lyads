# Correction de fidélité — 13 septembre 2026

La première intégration personnalisée ne respectait pas suffisamment les maquettes. Elle a été retirée des routes actives et remplacée par l’affichage des cadres originaux. Les anciens points d’entrée sont conservés dans `fidelity/previous-entry/`.

Le catalogue extrait directement le HTML des maquettes, sans modifier les textes, chiffres, styles en ligne, SVG ou classes. Les styles du fichier source et sa logique DCLogic sont conservés. Le moteur fourni et les fichiers de polices et icônes sont servis localement. Seules les adresses des dépendances sont relocalisées.

Pour C3.2 et C3.3, le prototype fourni est ouvert sur le niveau Ensembles ou Publicités. La logique d’origine est conservée ; seul son état initial de navigation est déterminé par la route locale.

La landing v2, le tableau de bord et l’agent ont été inspectés dans le navigateur aux dimensions desktop et mobile fournies ; la landing a aussi été inspectée en tablette. Les onglets de la landing et le parcours tableau de bord → agent → détail ont été testés. Les 79 routes du registre issues des sources ont également été ouvertes dans le navigateur : chaque page charge un cadre visible. Les tests de fidélité contrôlent le catalogue entier, indépendamment de cet échantillon visuel.

Cette livraison est une intégration visuelle locale. Les actions métier qui n’existent pas dans les sources restent à implémenter lors de la phase fonctionnelle. Aucun résultat d’analyse, paiement, publication Meta ou génération IA réel n’est produit.

Les pages absentes ne sont pas remplacées par des écrans inventés : Contact A8 et le module Règles C7 restent indisponibles. Les annotations, chiffres parfois incohérents et emplacements provisoires des maquettes sont conservés afin de respecter la demande de reproduction littérale.

Voir `fidelity/ROUTES.md` pour accéder aux cadres et variantes, et `fidelity/extraction.json` pour les positions et empreintes SHA-256 des sources.
