# Référence fonctionnelle backend — 13 septembre 2026

Cette spécification fournie par le propriétaire remplace le cadrage backend antérieur. Le handoff reste exclusivement une référence frontend. Les maquettes, textes, polices et images sont conservés ; seules les valeurs fonctionnelles remplacent la démonstration. Le backend doit servir tous les onglets décrits ci-dessous, dans l'ordre imposé.

## Invariants

1. Toute écriture Meta exige une action utilisateur confirmée et passe par un service unique : droits, intention auditée, exécution, résultat audité. Exception : règle créée et activée par l'utilisateur après simulation.
2. Aucun appel Meta dans le navigateur. Jetons et secrets exclusivement serveur, chiffrés au repos ; les secrets de fournisseurs sont dans Supabase Secrets.
3. Détection déterministe. Les modèles rédigent et expliquent ; aucun calcul de métrique ni décision de seuil ne leur est confié.
4. Tout jugement de performance exige un volume significatif configurable. Le résultat porte sa suffisance ; en dessous aucun jugement, badge de performance, corrélation ou recommandation. L'état « données insuffisantes » est normal.
5. Traitements longs asynchrones : file durable, progression, notification.
6. Coût affiché avant exécution ; solde vérifié sans débit anticipé. Débit uniquement des résultats réussis, au prorata pour les variantes ; libération de réservation en échec, remboursement tracé si un débit doit être compensé.
7. Toute modification publicitaire est tracée : origine utilisateur/agent/règle/synchronisation, auteur, entité, champ, avant/après, date, résultat.
8. Aucune métrique inventée. Une valeur indisponible reste explicitement indisponible. Erreurs françaises avec action proposée. Sorties IA strictement validées avant emploi, particulièrement avant écriture Meta.

## Socle prioritaire

- Supabase Auth existant : inscription, vérification e-mail, récupération, connexion Google/Facebook, déconnexion. Organisations, propriétaire/administrateur/éditeur/lecteur, attribution par compte et isolation RLS obligatoire sur toutes les tables dépendantes.
- Meta OAuth serveur avec échange longue durée, chiffrement, permissions effectivement reçues (y compris refus partiels), expiration proactive et reconnexion. Inventaire Business Managers, comptes, Pages, Instagram, pixels, événements, audiences, catalogues selon les permissions réellement accordées.
- Import initial **90 jours** (confirmé). Structures, métriques journalières par entité et ventilations placement/plateforme/âge/sexe. Import incrémental planifié, import manuel limité, fenêtre glissante de révision (paramétrable, pas seulement la veille).
- Tous les appels Meta passent par une file et une régulation centrale : quotas par compte, priorité utilisateur, temporisation exponentielle, lots compatibles, cache structure, traduction des codes Meta.
- Crédits : barème en base, réservations empêchant les dépenses concurrentes excessives, débit à réussite, attribution mensuelle et expiration, rachats indépendants du plan, transactions et remboursements détaillés.
- Audit central append-only.

## Contrats par onglet

| Onglet | Comportements exigés |
|---|---|
| Tableau de bord | Endpoints indépendants : KPI et comparaison période précédente, courbe temporelle, top 5 créatives, campagnes/placements, alertes, 3 recommandations du jour. Multi-comptes compatible devise/fuseau/attribution ; fraîcheur sur chaque réponse. |
| Agent | Scan planifié et manuel limité : fraîcheur, réglages/Brain, détecteurs, justification, déduplication/groupement, priorité, expiration, notification. Détecteurs indépendants CPA/ROAS, fatigue, apprentissage, déséquilibre budget, gagnant enterré, chevauchement, budget épuisé, sans conversion, exclusions, rejet/révision. Seuil volume configurable et documenté pour chacun ; justification chiffrée obligatoire, impact en fourchette avec confiance, alternatives. Sensibilités prudent/équilibré/agressif documentées. Application : droits, crédits, contrôle de version de l'entité, audit intention, Meta, résultat, débit, mesure d'impact ultérieure. Réglages CPA/ROAS/budget/attribution/sensibilité/fréquence/heure/exclusions/types. |
| Gestionnaire | Pagination, tri et filtres combinables exécutés en base ; vues/colonnes/filtres enregistrés. Statut, budget, ciblage, calendrier, enchère, duplication, nom, suppression ; lots asynchrones avec résultat par entité et reprise des seuls échecs. Avertissement préalable pour les champs qui réinitialisent l'apprentissage. Audit filtrable et annulation réversible. |
| Constructeur | Agent : brief + Brain + historique → structure justifiée et validée par schéma. Manuel : brouillon sauvegardé à chaque étape. Objectifs, événements pixel et volumes 7 jours, audiences/taille/mise à jour, intérêts/comportements, estimation, chevauchement, placements. Exclusions acheteurs 180j/inscrits 30j/visiteurs 14j proposées. Validation pixel/événement/créatives/URL/chevauchement/budget ; erreurs bloquantes, avertissements non bloquants. Publication campagne → ad sets → créatives → publicités, idempotente, inspection de l'état réel et reprise du manquant, aucune suppression compensatrice automatique. Maintenant/en pause/planifiée/brouillon. |
| Studio | Fournisseurs image/vidéo/voix interchangeables. Textes structurés validés, variantes et stockage/vignettes. Vidéo : validation du script et de l'image initiale avant génération coûteuse, étapes asynchrones reprenables. Débit à réussite, prorata et remboursement traçable. Bibliothèque dossiers/tags/recherche et performances réelles. |
| Analyse créative | Tagging vision avec confiance : format/humain/texte/couleurs/scène + vidéo durée/rythme/voix/sous-titres/accroche. Classement, fatigue glissante et gagnants enterrés déterministes et significatifs. Corrélations avec effectifs des deux groupes, supprimées si insuffisants. Itérations tracées : une variable, ordre accroche→angle→visuel→format, maximum 6 par source. |
| Règles | Moteur planifié distinct du scan. Périmètre, conditions ET/OU/métrique/opérateur/période, action, fréquence. min_volume_threshold obligatoire non nullable en base ; plafond quotidien, cooldown par entité, budget min/max, plage horaire. Simulation obligatoire vue par l'utilisateur avant activation. Option créer une recommandation. Journal évalués/correspondants/affectés/valeurs/résultat/motif, annulation réversible. |
| Intelligence marché | Fournisseur abstrait, factice uniquement en développement jusqu'au choix du fournisseur autorisé. Aucune collecte non autorisée. Recherche et abonnements annonceurs ; détails/tagging ; collections/annotations ; analyse asynchrone corpus collection/recherche/Brain. Angles/parts/durée moyenne de diffusion, formats, promesses, publics, prix, annonceurs, espaces libres. Chaque conclusion accompagnée du volume, aucune si insuffisant. 3–5 axes justifiés, briefs Studio/Constructeur. Les capacités d'une source réelle restent à vérifier au choix du fournisseur. |
| Rapports | Blocs configurables et autosauvegarde, modèles fournis et personnalisés. Partage jeton aléatoire, mot de passe haché optionnel, expiration/révocation/compteur, données figées ou recalculées ; données masquées exclues de la réponse serveur. PDF serveur. |
| Business Brain | Activité/offre/marché/audience/tunnel/historique ; produits avec performances liées. Analyse de site asynchrone et extraction ; distinction explicite saisie utilisateur/déduction IA. Complétude déterministe, données manquantes et fonctions dégradées, versions/restauration. Partagé Constructeur/Studio/Intelligence. |
| Paramètres | Profil/langue/fuseau/devise/mot de passe/MFA ; comptes et permissions/expiration/reconnexion/sync/ajout/retrait ; plan/quota/changement/résiliation ; crédits par type/jour/module/projection/rachat/remboursements ; factures/PDF/moyens de paiement/données de facturation, Mobile Money aussi important que carte ; notifications e-mail/in-app/WhatsApp/groupement/silence ; équipe/invitations/rôles/comptes/retrait. |

## Ordre et jalon bloquant

1. Socle complet.
2. **Jalon bloquant : afficher fidèlement les données d'un compte réel**, rapprochées de Meta avec les mêmes paramètres. Aucun passage aux modules suivants sans validation solide.
3. Service unique d'écriture Meta, modifications et lots.
4. Business Brain et Constructeur.
5. Agent : scan puis chaque détecteur testé isolément.
6. Studio.
7. Analyse créative.
8. Règles.
9. Intelligence marché.
10. Rapports.
11. Paiement/facturation.

## Décisions et points ouverts

- Historique initial : 90 jours, confirmé.
- Barème provisoire : utiliser les coûts explicites des maquettes lorsqu'ils existent ; **autres actions coûteuses désactivées** jusqu'au tarif défini, confirmé. Les prix contradictoires ou ambigus ne sont pas choisis arbitrairement.
- Secrets : Supabase Secrets, confirmé. Identifiants de l'app Meta pas encore configurés au début de ce lot ; le propriétaire les ajoutera.
- Source concurrentielle, Mobile Money, fournisseurs IA, domaine public et capacités réellement disponibles via Meta restent ouverts. Ces choix n'autorisent aucune donnée de production factice.
