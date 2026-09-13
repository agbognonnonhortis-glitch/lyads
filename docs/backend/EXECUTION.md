# Socle backend — état d’exécution

La spécification fonctionnelle fournie par le propriétaire est l’autorité backend. Le handoff détermine uniquement les écrans.

## Choix mis en œuvre

- Organisations basées sur les espaces existants, propriétaire implicite, membres administrateur/éditeur/lecteur, accès explicites par compte, isolation RLS et contrôle serveur. Aucun transfert de propriété implicite.
- OAuth Marketing API distinct de Supabase Auth Facebook. Identifiants META_APP_ID et META_APP_SECRET dans Supabase Edge Function Secrets. Les quatre permissions de la maquette sont demandées, seuls les octrois réellement reçus sont enregistrés. Aucun service d’écriture publicitaire activé à ce jalon.
- API Meta v26.0 par défaut, vérifiée dans le dépôt officiel facebook/facebook-nodejs-business-sdk, src/api.js, le 13 septembre 2026. Surcharge par META_GRAPH_API_VERSION.
- Jetons chiffrés AES-GCM avec contexte organisation/identité. Clé générée dans Supabase Vault (LYADS_META_TOKEN_KEY_V1), accès service uniquement ; une valeur Edge Secret de ce même nom prend priorité. Ne pas modifier cette clé sans réencryptage des jetons existants.
- LYADS_APP_URL vaut http://127.0.0.1:3000 pour le pilote local. Le renseigner avec l’origine HTTPS lors de la mise en ligne. Callback : https://beplqbktgbizhfcoixoi.supabase.co/functions/v1/lyads-meta/callback.
- Une file PostgreSQL, quatre workers concurrents au maximum, deux départs toutes les cinq secondes. Chaque worker traite une seule page Meta puis enregistre son point de reprise. Lease aléatoire à usage unique, vérifié en base ; aucun secret permanent dans le navigateur ou le cron. L’URL de dispatch reste désactivée sur tout nouvel environnement jusqu’à configuration explicite.
- Import initial de 90 jours calendaires dans le fuseau du compte. Révision glissante de 7 jours toutes les 6 heures, valeurs provisoires configurables en base. Synchronisation manuelle limitée à une demande par cinq minutes.
- Les pages de métriques sont préparées en stockage privé puis publiées atomiquement à la fin : pas de mélange entre import ancien et incomplet, suppression des données révisées devenues absentes. Aucun zéro ne remplace une métrique manquante. Valeurs décimales sources conservées sous forme de chaînes.
- Métadonnées de campagnes, ensembles et annonces importées avec journal des champs modifiés. Répartition quotidienne par niveau, placement/plateforme et âge/sexe. Attribution unifiée documentée dans chaque contexte de calcul.
- Crédits : réservation transactionnelle sans débit, solde protégé contre la concurrence, débit des seules variantes réussies, remboursement idempotent, attribution et expiration mensuelles. Aucun plan ni quota attribué au client sans choix de souscription. Les prix provisoires viennent des maquettes récentes : structure 12, conseil 2, publication 6, texte 2, image 6, vidéo 45. Les autres actions restent sans prix et indisponibles.
- B2 déclenche OAuth ; B4 remplace les exemples par les comptes réellement découverts, permet leur sélection et affiche la progression d’import. Les autres écrans restent des maquettes tant que leur raccordement n’a pas été validé.

## Vérifications

Tests PostgreSQL locaux : accès inter-organisations et par compte, révocation, interdiction des écritures clientes, priorité et fencing des jobs, crédits partiels et remboursements, publication atomique des imports, audit des structures. Tests Deno : chiffrement, contexte, permissions partielles, restriction d’hôte Meta, erreurs, fenêtres calendaires. Ces tests ne remplacent pas un import réel et une comparaison avec Ads Manager.

## Travail restant avant le jalon des données réelles

Autorisation OAuth par le propriétaire, découverte du compte, import des 90 jours, comparaison des métriques/attribution avec Ads Manager, raccordement des zones indépendantes du tableau de bord. Une réponse de santé « ready » confirme uniquement la présence/forme des secrets et l’accès à la clé de chiffrement ; elle ne prouve pas que Meta les accepte.

Le catalogue complet de ressources (pages/Instagram/pixels/audiences/catalogues), la mesure proactive de l’expiration d’accès aux données via debug_token, les invitations d’équipe, la configuration utilisateur de la fréquence et le traitement asynchrone Insights de Meta restent à compléter. Le worker actuel utilise des lectures hebdomadaires paginées et un timeout borné ; les comptes dépassant ces limites devront passer au mode rapport asynchrone Meta.

Les détecteurs, les écritures publicitaires, le Studio, les règles, le paiement et les autres modules ne sont pas déclarés opérationnels. Ils suivent le jalon bloquant de la spécification.
