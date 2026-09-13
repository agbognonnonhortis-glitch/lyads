# Notifications dans la cloche

Les cloches des pages de l’application ouvrent un panneau commun, adapté au mobile. Les données proviennent de `lyads_notifications` : notifications de synchronisation terminée/échouée, reconnexion Meta et analyse de site. Aucun exemple de la maquette ne sert de notification.

`GET /api/notifications?organization=UUID` renvoie 20 messages par page, leur état de lecture et le nombre exact de non lus. La pagination garde une borne `asOf` afin que les nouveaux messages ne décalent pas les pages déjà consultées. Le compteur est actualisé toutes les 30 secondes lorsque la page est visible, à l’ouverture et après une action de lecture. Les messages sont affichés comme du texte ; les destinations « Voir » sont définies dans le code, jamais prises dans le contenu d’un message.

`PATCH /api/notifications` accepte une liste de 1 à 20 identifiants, ou `all: true` avec le `asOf` de la liste. L’action globale ne marque pas les notifications arrivées après ce chargement. La date de lecture est générée côté serveur, uniquement après une action explicite. Le navigateur attend la réussite avant de modifier le compteur ; un échec conserve les non lus et permet de réessayer.

Les requêtes vérifient l’utilisateur et son organisation. La RLS impose également le destinataire et les droits actuels sur le compte publicitaire concerné. L’API ne permet ni de créer un message ni d’en modifier le contenu. Ces lectures n’envoient aucun e-mail ou message WhatsApp.

Vérification : tests PostgreSQL de séparation des destinataires/organisations/comptes, interdiction de modifier le contenu, lecture idempotente ; tests du contrôleur pour affichage, échappement, lecture persistée, erreurs et liste vide ; essai navigateur sur un serveur de fixtures distinct, sans marquer les notifications réelles du client.
