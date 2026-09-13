# Authentification Lyads

Les formulaires des maquettes sont reliés à Supabase Auth par les routes serveur Next.js. Les champs natifs reprennent les styles des emplacements source. Les valeurs du prototype sont des placeholders, jamais des identifiants préremplis. Facebook a été demandé après les maquettes : son bouton reprend le composant Google existant. Les logos officiels en couleur ont ensuite été demandés explicitement ; leur provenance figure dans `public/brands/README.md`.

## Parcours implémentés

- Inscription par e-mail avec validation, confirmation Supabase et renvoi du lien.
- Connexion par mot de passe ; choix de cookies de session ou persistants.
- Google et Facebook via OAuth PKCE, échange du code côté serveur.
- Création atomique du profil et du premier espace, sous les droits RLS de l'utilisateur. Répéter une connexion ne remplace pas les noms existants ni ne crée un espace supplémentaire.
- Récupération et remplacement du mot de passe ; révocation des sessions de rafraîchissement après changement. Les JWT déjà émis restent soumis à leur durée de validité Supabase.
- Déconnexion locale ou de toutes les sessions depuis l'écran de sécurité.
- Accès aux routes `/app/*`, `/configuration/*` et `/bienvenue` après vérification de l'identité par Supabase.

Les cookies sont HttpOnly, SameSite=Lax et Secure en HTTPS. Les réponses d'authentification ne sont pas mises en cache. Les POST vérifient l'origine et valident leur corps. Aucune clé administrateur n'est utilisée. Les métadonnées de nom servent uniquement à l'affichage, jamais aux autorisations.

Les panneaux d'erreur détaillés de la maquette contiennent des dates ou durées fictives : seules leurs formulations génériques sont utilisées dans les alertes actuelles. Les données du tableau de bord et les sessions illustrées dans la maquette restent démonstratives ; leur présence ne prouve aucune synchronisation Meta. La suppression de compte n'est pas raccordée.

## Configuration

Dans `.env.local` : variables Supabase de `.env.example`. En production, `APP_URL` doit être l'origine HTTPS exacte de Lyads. En développement, l'origine locale est déduite de la requête, en limitant le repli à localhost/127.0.0.1.

Dans Supabase Authentication → URL Configuration :

- Site URL local : `http://127.0.0.1:3000`.
- Redirect URLs locales : `http://127.0.0.1:3000/**`, `http://localhost:3000/**`.
- Ajouter les callbacks du domaine de production avant publication.

Callback à déclarer chez Google et Facebook : `https://beplqbktgbizhfcoixoi.supabase.co/auth/v1/callback`.

Le retour applicatif utilise `/auth/callback?flow=oauth` (ou `signup` / `recovery`). Les modèles e-mail par défaut peuvent utiliser le flux PKCE dans le navigateur initiateur. Pour des liens utilisables dans un autre navigateur, le serveur propose aussi `/auth/confirm?token_hash=…&type=signup` ou `recovery`, à configurer dans les modèles Supabase ; ne pas inclure de redirection arbitraire.

Facebook Auth identifie l'utilisateur. Les permissions et jetons pour analyser ses comptes publicitaires relèvent d'une intégration Meta distincte, encore à réaliser.

## Recette

```bash
npm test
npm run test:db
npm run typecheck
npm run build
# Avec npm run dev déjà lancé :
node --import tsx --test tests/http/auth.test.ts
```

Les tests HTTP n'envoient aucun e-mail et ne créent aucun compte : ils vérifient les refus des requêtes invalides, les pages protégées, les cookies PKCE et les redirections réelles vers Google/Facebook. Les tests PostgreSQL vérifient l'initialisation réessayable et l'isolation des utilisateurs.

Le 13 septembre 2026, le point de configuration Auth du projet confirme Google et Facebook activés, confirmation e-mail requise. Les deux redirections atteignent les serveurs d'autorisation des fournisseurs. Cela ne valide pas encore le consentement, l'échange final des secrets OAuth, la réception d'e-mails ni une connexion complète avec un utilisateur réel. Cette dernière recette nécessite une connexion volontaire du propriétaire, puis deux comptes de test pour la séparation réelle des sessions.

## Incident Google du 13 septembre 2026

À 02:00 UTC, Google et l'échange PKCE ont réussi, mais l'appel de création de l'espace a reçu HTTP 504 après environ 5,4 secondes. Lyads affichait seulement « Erreur ». Le SQL d'initialisation a ensuite été vérifié sur la base distante sous le rôle `authenticated` dans une transaction annulée ; il réussit. Un profil et un espace réels sont apparus lors d'une nouvelle tentative à 02:03 UTC.

L'initialisation réessaie désormais au maximum trois fois les erreurs temporaires de transport/passerelle, avec les mêmes paramètres et la même identité. Son caractère atomique et réessayable évite les doublons même si une première réponse se perd après validation de la transaction. Les erreurs permanentes de droits ne sont pas réessayées. L'alerte indique maintenant l'indisponibilité temporaire ; les journaux serveur ne conservent que le statut, un code contrôlé et le nombre de tentatives.

Les tests reproduisent le 504 suivi d'une réussite, le refus permanent et l'épuisement des trois tentatives. Les causes internes de l'incident de passerelle Supabase ne sont pas établies ; le correctif traite cette panne transitoire dans le parcours.

Conseillers consultés pendant le diagnostic : aucun blocage du modèle d'initialisation. Points distincts restant à traiter avant publication : droits d'exécution de la fonction préexistante `rls_auto_enable` ([conseiller](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)) et [protection contre les mots de passe compromis](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Les index non utilisés sont attendus tant que les imports Meta ne sont pas raccordés.
