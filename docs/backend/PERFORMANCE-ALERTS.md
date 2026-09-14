# Alertes de performance

Les problèmes techniques de connexion et les alertes déterministes Lyads sont affichés dans le tableau de bord. Les statuts de diffusion Meta sont exclus de cette vue. Les détections de performance attendent la fin des imports actifs pour ne pas juger des lots partiels. Aucun appel d'écriture Meta, crédit ou modèle de langage n'intervient dans ces détections. Ce lot ne crée pas de recommandations applicables ni de promesses de gain.

## Exécution et droits

`alerts.scan` utilise la file existante, ses priorités, leases et retries. La réussite d'une synchronisation programme un scan des sept derniers jours complets du compte. La consultation des alertes demande également un scan asynchrone pour la période sélectionnée. Le navigateur actualise seulement cette zone tant que son scan est en attente. Une notification est enregistrée si des alertes sont détectées.

La clé de cache comprend le compte, la période, la version du détecteur, la dernière synchronisation, le jour dans le fuseau du compte et ses réglages. Un changement de données ou de seuils rend les anciens résultats inéligibles à cette consultation. Les résultats précédents restent traçables dans les jobs. Un job échoué peut être relancé après cinq minutes ; plafond de dix nouvelles analyses par compte et par minute. Le calcul utilise PostgreSQL en tâche de fond, avec un timeout de vingt secondes, et retourne au maximum cent alertes dédupliquées. Le résultat indique toute troncature.

La fonction publique de demande vérifie les droits par compte en base. Le calcul est réservé au service serveur. Les réglages sont soumis à RLS et aux droits d'édition du compte. Les cibles CPA/ROAS restent vides tant que l'utilisateur ne les a pas saisies dans « Régler les seuils d’alerte ».

## Significativité

Seules les entités actives sont jugées. Minimums prudents et configurables : trois jours observés, mille impressions, trente clics, dix achats et dépense strictement positive. Une dépense minimale additionnelle peut être définie dans la devise du compte. Ce sont des garde-fous de volume, pas une estimation de significativité statistique.

Source : métriques journalières sans répartition, uniquement `purchase` pour les achats/revenus. Valeurs absentes ou malformées = inconnues ; aucune conversion absente n'est transformée en zéro. Les doublons entité/jour, devises incohérentes et le jour en cours sont exclus du jugement. L'API renvoie les volumes suffisants, les volumes évalués et la raison d'insuffisance.

| Détecteur | Critère par défaut | Unité |
|---|---|---|
| CPA élevé | CPA > cible × 1,20 | Campagne |
| ROAS faible | ROAS < cible × 0,80 | Campagne |
| Fatigue | Fréquence quotidienne moyenne ≥ 3 ET CTR en baisse ≥ 20 % ET CPA en hausse ≥ 20 % | Publicité |
| Déséquilibre | ≥ 60 % des dépenses sur des ensembles dont le CPA ≥ 1,5 × le meilleur CPA | Campagne |

Fatigue : deux périodes adjacentes de même durée, au moins sept jours calendaires chacune et 80 % des jours observés (minimum six), avec volumes suffisants dans les deux fenêtres. La fréquence utilisée est explicitement la moyenne des fréquences quotidiennes ; elle n'est pas présentée comme une fréquence dédupliquée sur toute la période. Cette version ne prétend pas analyser la rétention vidéo, qui n'est pas importée.

Déséquilibre : au moins deux ensembles actifs d'une même campagne, même objectif d'optimisation et même spécification d'attribution, tous les pairs actifs ayant un volume suffisant. Le signal décrit les dépenses constatées, pas une prévision de réallocation ni le budget configuré. Chaque résultat expose sa période, son compte, sa devise, les seuils et les observations.

## Validation

Tests PostgreSQL avec jeux isolés : les quatre déclenchements, chiffres exacts, absence de cibles, volume insuffisant, métriques manquantes, comparaison d'attribution invalide, période courte, RLS, appel serveur réservé, minimums imposés en base, déduplication et invalidation du cache après changement de réglage.

Les données de test ne sont jamais insérées dans Supabase hébergé. Sans métriques importées, le résultat correct reste « aucune métrique importée », pas une performance fictive.

## État du déploiement au 14 septembre 2026

Code envoyé sur GitHub (`4bbec4a`), migration `20260914072853` appliquée par l'intégration Supabase, worker déployé et actif (version 23). La lecture du statut des checks GitHub a été refusée par le contrôle automatique (modèle indisponible) ; leur succès n'est pas affirmé.

Vérification de bout en bout via la file et le worker hébergés : scan `75881efb-bd85-440a-b468-d283547b6702`, statut `succeeded`, une tentative, processeur `alerts-v1`, terminé le 14 septembre à 08:00:50 UTC. Sur la période testée du compte déjà sélectionné : zéro ligne de métrique, zéro entité significative, zéro alerte. Aucun jeton ou compte publicitaire n'a été modifié. Les déclenchements positifs sont couverts par les jeux isolés PostgreSQL ; la validation sur les performances réelles reste conditionnée à leur import.

Les advisors de sécurité ne signalent aucune anomalie sur les nouveaux objets. Ils relèvent les six tables serveur volontairement sans politique utilisateur, et l'avertissement Auth préexistant concernant la [protection contre les mots de passe compromis](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), encore désactivée.
