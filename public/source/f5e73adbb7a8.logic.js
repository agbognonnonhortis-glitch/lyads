
const RECOS = [
  { id:'r1', prio:'Critique', glyph:'▼', color:'#C0311F', cat:'Budget', detected:'détectée aujourd\u2019hui 06:00',
    title:'Réallouer 180 000 FCFA de « Acquisition — Large 25-45 » vers « Retargeting — Visiteurs 30 j »',
    sub:'2 ensembles de publicités · campagne « Acquisition Q3 »',
    scope:'2 ensembles de publicités · campagne « Acquisition Q3 »',
    trustLabel:'Élevée', trustPct:'87 %', cta:'Examiner et appliquer',
    d1l:'CPA constaté', d1v:'18 550', d1u:'FCFA', d1n:'contre 12 000 de cible — dépassement de 55 %',
    d2l:'Sur la période', d2v:'12', d2u:'jours', d2n:'482 300 FCFA dépensés · 26 achats',
    d3l:'Ensemble receveur', d3v:'6 240', d3u:'FCFA', d3n:'CPA stable sur 14 j · plafonné par le budget depuis 6 j',
    impactLabel:'Impact estimé sur 30 jours', impactValue:'+ 0,86 à 1,21 M', impactUnit:'FCFA de revenu', impactNote:'fourchette à 80 %',
    impactBody:'ROAS du compte projeté de 2,84 à 3,18. Aucune baisse de volume attendue : le budget total est inchangé.',
    hasChange:true, ch1Label:'Acquisition Large', ch1From:'420 000', ch1To:'240 000',
    ch2Label:'Retargeting 30 j', ch2From:'90 000', ch2To:'270 000',
    chFoot:'Budget quotidien du compte inchangé : 510 000 FCFA',
    outcome:'180 000 FCFA réalloués' },
  { id:'r2', prio:'Critique', glyph:'▼', color:'#C0311F', cat:'Diffusion', detected:'détectée aujourd\u2019hui 06:00',
    title:'Recharger le budget de « Promo Tabaski — Carrousel »',
    sub:'La campagne la plus rentable du compte ne diffuse plus depuis 14 h.',
    scope:'1 campagne · budget quotidien épuisé à 10:12',
    trustLabel:'Élevée', trustPct:'94 %', cta:'Examiner et appliquer',
    d1l:'Arrêt de diffusion', d1v:'14', d1u:'heures', d1n:'budget épuisé à 10:12 ce matin',
    d2l:'ROAS de la campagne', d2v:'3,10', d2u:'', d2n:'sur 30 jours — le meilleur du compte',
    d3l:'Manque à gagner', d3v:'≈ 214 k', d3u:'FCFA', d3n:'revenu horaire moyen × 14 h',
    impactLabel:'Impact estimé sur 30 jours', impactValue:'+ 0,42 à 0,58 M', impactUnit:'FCFA de revenu', impactNote:'fourchette à 80 %',
    impactBody:'La recharge rétablit la diffusion sans modifier le ciblage ni les créatives. Aucun autre paramètre n\u2019est touché.',
    hasChange:true, ch1Label:'Budget quotidien', ch1From:'160 000', ch1To:'310 000',
    ch2Label:'État de la campagne', ch2From:'En pause', ch2To:'Active',
    chFoot:'Recharge ponctuelle · le budget revient à 160 000 FCFA demain à 00:00',
    outcome:'Budget rechargé · diffusion reprise' },
  { id:'r3', prio:'Élevée', glyph:'◆', color:'#8F5F08', cat:'Créative', detected:'détectée aujourd\u2019hui 06:00',
    grouped:true, groupLabel:'8 objets groupés',
    title:'Mettre en pause 8 publicités en fatigue avancée',
    sub:'Même diagnostic sur les 8 objets : fréquence supérieure à 4,5 et CTR sortant en baisse de plus de 30 % sur les 9 derniers jours.',
    scope:'8 publicités · 7 sélectionnées · 461 200 FCFA de dépense concernée',
    trustLabel:'Moyenne', trustPct:'71 %', cta:'Examiner les 7 sélectionnées',
    d1l:'Fréquence moyenne', d1v:'4,9', d1u:'', d1n:'seuil de fatigue fixé à 4,5',
    d2l:'CTR sortant', d2v:'−37', d2u:'%', d2n:'sur les 9 derniers jours',
    d3l:'Dépense concernée', d3v:'461 200', d3u:'FCFA', d3n:'7 publicités sur 8 sélectionnées',
    impactLabel:'Économie estimée sur 30 jours', impactValue:'+ 312 000', impactUnit:'FCFA redéployables', impactNote:'fiabilité 71 %',
    impactBody:'« Témoignage cliente » est décochée par défaut : sa fréquence est élevée mais son ROAS reste à 3,42. L\u2019agent signale, il ne tranche pas à votre place.',
    hasChange:false,
    outcome:'7 publicités mises en pause' },
  { id:'r4', prio:'Élevée', glyph:'◆', color:'#8F5F08', cat:'Ciblage', detected:'détectée aujourd\u2019hui 06:00',
    title:'Exclure Audience Network de 2 ensembles',
    sub:'7 % de la dépense pour 1,2 % des achats sur 30 jours — ROAS 0,41 contre 2,84 sur le compte.',
    scope:'2 ensembles de publicités · placements manuels',
    trustLabel:'Moyenne', trustPct:'71 %', cta:'Examiner et appliquer',
    d1l:'Part de la dépense', d1v:'7', d1u:'%', d1n:'184 900 FCFA sur 30 jours',
    d2l:'Part des achats', d2v:'1,2', d2u:'%', d2n:'3 achats sur 251',
    d3l:'ROAS du placement', d3v:'0,41', d3u:'', d3n:'contre 2,84 sur le compte',
    impactLabel:'Économie estimée sur 30 jours', impactValue:'+ 185 000', impactUnit:'FCFA', impactNote:'fiabilité 71 %',
    impactBody:'Le budget libéré reste dans les ensembles concernés et se reporte sur Facebook et Instagram, aux performances mesurées.',
    hasChange:false,
    outcome:'Audience Network exclu de 2 ensembles' },
  { id:'r5', prio:'Élevée', glyph:'◆', color:'#8F5F08', cat:'Créative', detected:'détectée le 31 juil.',
    title:'Corriger et resoumettre « Rentrée scolaire — Vidéo 15 s »',
    sub:'Rejetée par Meta — allégation de santé non autorisée. Ne diffuse pas depuis le 31 juillet.',
    scope:'1 publicité · campagne « Rentrée scolaire »',
    trustLabel:'Élevée', trustPct:'82 %', cta:'Examiner la correction',
    d1l:'Jours sans diffusion', d1v:'11', d1u:'jours', d1n:'depuis le rejet du 31 juillet',
    d2l:'Budget immobilisé', d2v:'95 000', d2u:'FCFA', d2n:'non dépensé sur la période',
    d3l:'Motif Meta', d3v:'1', d3u:'infraction', d3n:'allégation de santé non autorisée',
    impactLabel:'Remise en diffusion estimée', impactValue:'sous 24 h', impactUnit:'après resoumission', impactNote:'fiabilité 82 %',
    impactBody:'L\u2019agent propose une reformulation du texte de couverture qui retire l\u2019allégation sans changer l\u2019angle commercial.',
    hasChange:false,
    outcome:'Publicité corrigée et resoumise' },
  { id:'r6', prio:'Moyenne', glyph:'—', color:'#5C564E', cat:'Enchère', detected:'détectée aujourd\u2019hui 06:00',
    title:'Passer « Retargeting 30 j » au coût par résultat cible',
    sub:'CPA stable à 6 240 FCFA sur 14 jours — l\u2019ensemble supporte un plafond d\u2019enchère sans perdre de volume.',
    scope:'1 ensemble de publicités · stratégie d\u2019enchère',
    trustLabel:'Correcte', trustPct:'64 %', cta:'Examiner et appliquer',
    d1l:'CPA constaté', d1v:'6 240', d1u:'FCFA', d1n:'stable sur 14 jours, écart-type 4 %',
    d2l:'Plafond proposé', d2v:'7 000', d2u:'FCFA', d2n:'marge de 12 % au-dessus du constaté',
    d3l:'Volume actuel', d3v:'31', d3u:'achats / sem.', d3n:'plafonné par le budget depuis 6 j',
    impactLabel:'Volume estimé sur 30 jours', impactValue:'+ 18 achats', impactUnit:'à CPA constant', impactNote:'fiabilité 64 %',
    impactBody:'Le passage au coût cible protège le CPA si la concurrence monte. Le risque est une baisse de diffusion si le plafond est trop bas — d\u2019où la marge de 12 %.',
    hasChange:false,
    outcome:'Enchère passée au coût cible' },
  { id:'r7', prio:'Moyenne', glyph:'—', color:'#5C564E', cat:'Ciblage', detected:'détectée hier 06:00',
    title:'Élargir l\u2019audience « Intérêts beauté », saturée à 68 %',
    sub:'Au-delà de 70 % de couverture, le coût par résultat augmente faute de nouvelles personnes à atteindre.',
    scope:'1 audience · Sénégal et Côte d\u2019Ivoire',
    trustLabel:'Correcte', trustPct:'61 %', cta:'Examiner et appliquer',
    d1l:'Saturation', d1v:'68', d1u:'%', d1n:'portée cumulée sur 30 jours',
    d2l:'Après élargissement', d2v:'41', d2u:'%', d2n:'3 centres d\u2019intérêt proches ajoutés',
    d3l:'Personnes ajoutées', d3v:'+ 310 k', d3u:'', d3n:'estimation Meta pour SN + CI',
    impactLabel:'Marge de diffusion regagnée', impactValue:'≈ 6 semaines', impactUnit:'au rythme actuel', impactNote:'fiabilité 61 %',
    impactBody:'Les exclusions actuelles et la tranche d\u2019âge sont conservées. Seuls trois centres d\u2019intérêt proches sont ajoutés.',
    hasChange:false,
    outcome:'Ciblage élargi de 3 intérêts' }
];

const ONB = [
  { key:'welcome', n:1, label:'Bienvenue', mobile:'Étape 1 — Bienvenue', cta:'Commencer la configuration', skip:false },
  { key:'meta', n:2, label:'Meta', mobile:'Étape 2 — Meta', cta:'Continuer', skip:true },
  { key:'bm', n:3, label:'Business Manager', mobile:'Étape 3 — Business Manager', cta:'Continuer avec Kola Distribution', skip:true },
  { key:'accounts', n:4, label:'Comptes', mobile:'Étape 4 — Comptes', cta:'Continuer avec 2 comptes', skip:true },
  { key:'pages', n:5, label:'Pages', mobile:'Étape 5 — Pages', cta:'Continuer avec Kola Distribution', skip:true },
  { key:'pixel', n:6, label:'Pixel', mobile:'Étape 6 — Pixel', cta:'Continuer avec Achat', skip:true }
];

const CAMPS = [
  { id:'c1', name:'Acquisition — Large 25-45', sub:'Conversions · CBO · 12 ensembles', status:'Apprentissage limité', glyph:'◒', kind:'warn',
    budget:'240 000', pct:86, spend:'482 300', buys:'26', roas:'0,84', cpa:'18 550', on:true, agent:false, act:'Modifier', drill:'12 ensembles',
    alert:'Bloqué depuis 9 j · sortie improbable' },
  { id:'c2', name:'Promo Tabaski — Carrousel', sub:'Conversions · ABO · 6 ensembles', status:'Budget épuisé', glyph:'⬒', kind:'err',
    budget:'80 000', pct:100, spend:'312 800', buys:'60', roas:'4,12', cpa:'5 210', on:true, agent:false, act:'Recharger', drill:'6 ensembles',
    alert:'Ne diffuse plus depuis 14 h' },
  { id:'c3', name:'Retargeting — Visiteurs 30 j', sub:'Budget modifié par l\u2019agent · 28 juil.', status:'Active', glyph:'▲', kind:'ok',
    budget:'270 000', pct:92, spend:'248 100', buys:'40', roas:'3,42', cpa:'6 240', on:true, agent:true, act:'Modifier', drill:'8 ensembles', alert:'' },
  { id:'c4', name:'Notoriété — Vidéo été', sub:'Notoriété · CBO · 4 ensembles', status:'En apprentissage', glyph:'◐', kind:'info',
    budget:'60 000', pct:44, spend:'186 400', buys:'0', roas:'—', cpa:'—', on:true, agent:false, act:'Modifier', drill:'4 ensembles', alert:'' },
  { id:'c5', name:'Rentrée scolaire — Vidéo 15 s', sub:'Allégation de santé non autorisée', status:'Rejetée', glyph:'✕', kind:'err',
    budget:'45 000', pct:0, spend:'0', buys:'0', roas:'—', cpa:'—', on:false, agent:false, act:'Corriger', drill:'3 ensembles',
    alert:'Rejetée par Meta · allégation de santé non autorisée' },
  { id:'c6', name:'Soldes Août — Collection', sub:'Démarre le 5 août · 00:00', status:'Programmée', glyph:'◷', kind:'neutral',
    budget:'120 000', pct:0, spend:'0', buys:'0', roas:'—', cpa:'—', on:true, agent:false, act:'Modifier', drill:'5 ensembles', alert:'' },
  { id:'c7', name:'Fidélité — Clients 90 j', sub:'Mise en pause par « CPA > cible » · 30 juil.', status:'En pause', glyph:'‖', kind:'neutral',
    budget:'30 000', pct:0, spend:'42 900', buys:'7', roas:'2,91', cpa:'6 128', on:false, agent:false, act:'Réactiver', drill:'4 ensembles', alert:'' },
  { id:'c8', name:'Karité — Vidéo 15 s', sub:'Soumise le 1 août', status:'En révision', glyph:'◔', kind:'neutral',
    budget:'—', pct:0, spend:'0', buys:'0', roas:'—', cpa:'—', on:true, agent:false, act:'Modifier', drill:'2 ensembles', alert:'' }
];

const SETS = [
  { name:'Large 25-45 — Sénégal', parent:'Acquisition — Large 25-45 · Achat', audience:'Ciblage large · 25-45 · F', places:'Fil, Reels, Stories',
    ln:'Limité', lnGlyph:'◒', lnCount:'18 / 50', lnNote:'bloqué depuis 9 j · sortie improbable', kind:'warn',
    spend:'218 400', roas:'0,71', cpa:'21 300' },
  { name:'Visiteurs 30 j — Similaire 1 %', parent:'Retargeting — Visiteurs 30 j · Achat', audience:'Personnalisée + Similaire 1 %', places:'Fil, Reels',
    ln:'Terminé', lnGlyph:'✓', lnCount:'50 / 50', lnNote:'sorti le 21 juil. · performances stables', kind:'ok',
    spend:'148 900', roas:'3,88', cpa:'5 720' },
  { name:'Intérêts mode — Dakar', parent:'Notoriété — Vidéo été · Vue de vidéo', audience:'Intérêts · 18-34 · Dakar', places:'Reels uniquement',
    ln:'En cours', lnGlyph:'◐', lnCount:'31 / 50', lnNote:'j 4 sur 7 · sortie estimée le 5 août', kind:'info',
    spend:'96 200', roas:'—', cpa:'—' }
];

const ADS = [
  { name:'Tabaski — Carrousel 5 produits', copy:'« Jusqu\u2019à −40 % sur toute la collection Tabaski, livraison… »',
    format:'Carrousel', spec:'1080×1080 · Acheter', spend:'186 200', roas:'4,08', freq:'2,1', ret:'—', on:true, status:'', kind:'ok' },
  { name:'Témoignage cliente — Vidéo 22 s', copy:'« J\u2019ai reçu ma commande en 48 h à Thiès, la qualité est… »',
    format:'Vidéo 9:16', spec:'22 s · En savoir plus', spend:'126 600', roas:'3,44', freq:'1,8', ret:'48 % · 9,2 s moy.', on:true, status:'', kind:'ok' },
  { name:'Offre livraison gratuite', copy:'« Livraison offerte dès 25 000 FCFA, partout au Sénégal »',
    format:'Image unique', spec:'1080×1350 · Acheter', spend:'98 400', roas:'1,72', freq:'5,2', ret:'—', on:true, status:'Fatigue', kind:'warn' },
  { name:'Rentrée scolaire — 15 s', copy:'« Préparez la rentrée sans vous ruiner, jusqu\u2019à −30 % »',
    format:'Vidéo 4:5', spec:'15 s · Acheter', spend:'0', roas:'—', freq:'—', ret:'—', on:false, status:'Rejetée', kind:'err' }
];

const METRICS = [
  { key:'roas', name:'ROAS', hint:'Tri croissant — les campagnes qui perdent de l\u2019argent en premier' },
  { key:'cpa', name:'CPA', hint:'Tri décroissant — les achats les plus chers en premier' },
  { key:'spend', name:'Dépense', hint:'Tri décroissant — où part l\u2019argent' },
  { key:'budget', name:'Budget consommé', hint:'Tri décroissant — les campagnes proches de l\u2019épuisement' },
  { key:'freq', name:'Fréquence', hint:'Tri décroissant — les audiences saturées' }
];

const MODULES = {
  manager:{ kicker:'Campagnes', title:'Gestionnaire de publicités', file:'Lot 2 - Tableau mobile et modele.dc.html',
    body:'Le tableau à trois niveaux — campagnes, ensembles, publicités — avec édition en ligne des budgets et des états, et le modèle de colonnes réutilisé partout ailleurs.',
    screens:[['C3.1','Tableau des campagnes'],['C3.2','Édition en ligne et actions groupées'],['C3.3','Modèle de colonnes et tri']] },
  builder:{ kicker:'Campagnes', title:'Constructeur de campagne', file:'Lot 3 - Etape 1 Mode et brief.dc.html',
    body:"Les neuf écrans du parcours de création, du choix du mode jusqu'à la publication, en version agent et en version manuelle.",
    screens:[['C4.1','Choix du mode'],['C4.2','Brief et états'],['C4.3',"Proposition de structure de l'agent"],['C4.4','Construction manuelle — campagne'],['C4.5','Ensembles et ciblage'],['C4.6','Publicités et créatives'],['C4.7','Récapitulatif et contrôles'],['C4.8','Prévisualisation multi-placements'],['C4.9','Publication et suivi']] },
  studio:{ kicker:'Créatif', title:'Studio créatif', file:'Lot 4 - Studio et Analyse creative.dc.html',
    body:"La génération de textes, d'images et de vidéos courtes à partir du Business Brain, avec la galerie de résultats et le coût en crédits affiché avant chaque lancement.",
    screens:[['C5.1',"Point de départ et brief créatif"],['C5.2','Génération de textes'],['C5.3','Génération de visuels'],['C5.4','Génération de vidéos courtes'],['C5.5','Galerie de résultats'],['C5.6','Retouche et déclinaisons'],['C5.7','Envoi vers une campagne']] },
  creative:{ kicker:'Créatif', title:'Analyse créative', file:'Lot 4 - Studio et Analyse creative.dc.html',
    body:"Le classement des créatives par score d'efficacité, l'analyse élément par élément, et la détection de fatigue avant qu'elle ne coûte.",
    screens:[['C6.1','Classement des créatives'],['C6.2','Détail d\u2019une créative'],['C6.3','Analyse par éléments'],['C6.4','Fatigue et cycle de vie'],['C6.5','Comparaison de variantes'],['C6.6','Recommandations créatives']] },
  rules:{ kicker:'Pilotage', title:'Règles automatisées', file:'Lot 1 - Partie 3 Agent d optimisation.dc.html',
    body:"Les règles SI / ALORS que l'agent applique seul, leur historique d'exécution et le garde-fou qui empêche deux règles de se contredire.",
    screens:[['C7.1','Liste des règles actives'],['C7.2','Constructeur de règle'],['C7.3','Historique d\u2019exécution']] },
  market:{ kicker:'Pilotage', title:'Analyse marché', file:'Lot 5 - Intelligence marche et Rapports.dc.html',
    body:"La recherche de publicités actives dans votre secteur, leur durée de diffusion, les angles occupés et ceux qui restent libres.",
    screens:[['C8.1','Recherche de publicités'],['C8.2','Résultats et filtres'],['C8.3','Détail d\u2019une publicité concurrente'],['C8.4','Angles et messages'],['C8.5','Suivi d\u2019un concurrent'],['C8.6','Alertes de marché'],['C8.7','Synthèse sectorielle'],['C8.8','États et limites']] },
  reports:{ kicker:'Pilotage', title:'Rapports', file:'Lot 5 - Intelligence marche et Rapports.dc.html',
    body:"La composition d'un rapport, sa mise aux couleurs du client, et la vue publique partagée par lien en lecture seule.",
    screens:[['C9.1','Liste des rapports'],['C9.2','Composition d\u2019un rapport'],['C9.3','Personnalisation et marque'],['C9.4','Envoi et planification'],['C9.5','Vue publique partagée']] },
  brain:{ kicker:'Configuration', title:'Business Brain', file:'Lot 6 - Onboarding Business Brain et Parametres.dc.html',
    body:"Ce que Lyads sait de votre activité : offre, audience, objectifs, ton de marque. C'est la source que l'agent réutilise pour écrire et pour juger.",
    screens:[['B7','Offre et catalogue'],['B8','Audience et personas'],['B9','Objectifs et seuils'],['B10','Ton de marque'],['B11','Récapitulatif et complétude']] }
};

const NOTES = {
  manager:{ t:'Deux modes, deux intentions', b:"Le livrable du lot 2 n'est pas un tableau : c'est un arbitrage. Sur téléphone, trois des quatre tâches quotidiennes sont des actions — pause, budget, descente d'un niveau. Une action à trois gestes au pouce en 3G n'est pas une action, c'est un abandon. D'où les cartes, et la comparaison obtenue par le tri.", w:"Basculez en 375 : l'interrupteur, « Modifier » et la descente d'un niveau sont chacun à un geste. Le grand chiffre est la métrique pilote — changez-la, l'ordre de la liste change avec. En 1440, les quatre statuts qui appellent une action portent seuls un filet gauche de 3 px.", s:'Lot 2 · C3.1 à C3.3' },
  module:{ t:'Rien ne doit être une impasse', b:"Chaque destination du menu répond. Les modules pas encore assemblés annoncent leurs écrans validés et ouvrent la maquette correspondante, plutôt que de rester grisés.", w:"C'était une demande explicite du cadrage : en test utilisateur, la personne explore librement et tout doit répondre.", s:'Lots 2 à 6' },
  login:{ t:'Une porte, pas une vitrine', b:"Quatre éléments, aucun argument commercial : celui qui se connecte est déjà convaincu. « Mot de passe oublié » est sur la ligne du libellé, pas sous le champ — on le cherche là.", w:"La colonne de droite ne vend rien : elle affiche l'état des services, parce qu'un échec de connexion vient plus souvent de nous que de l'utilisateur.", s:'Lot 7 · A4 Connexion' },
  forgot:{ t:'Ne jamais révéler qu\u2019un compte existe', b:"« Si un compte existe, le lien est parti » — la formulation neutre empêche de tester des adresses une par une, et l'écran explique pourquoi plutôt que de laisser croire à une erreur.", w:"L'expéditeur est nommé, les indésirables sont mentionnés, et le renvoi a un compte à rebours. Trois écrans dans un même parcours.", s:'Lot 7 · A6 Mot de passe oublié' },
  pricing:{ t:'Des actions, pas des crédits', b:"Quatre plans, l'offre gratuite au même rang. Le tarif de chaque action est affiché en clair : un modèle de crédits opaque fait fuir.", w:"Le simulateur donne un plan recommandé et son calcul. Le tableau comparatif est replié par défaut. Mobile Money est au même rang que la carte bancaire.", s:'Lot 7 · A3 Tarifs' },
  legal:{ t:'Un modèle pour quatre documents', b:'Deux choses font la lisibilité d\u2019une page juridique : une largeur de ligne bornée à 720 px et une hiérarchie de titres à deux niveaux.', w:'Le texte juridique définitif est fourni par le client — seul le gabarit est validé ici.', s:'Lot 7 · A7 Pages légales' },
  landing:{ t:'Le produit avant le discours', b:"La page s'ouvre sur ce que fait le produit, pas sur une liste de fonctionnalités. Le bouton unique mène directement à l'inscription : pas de second appel à l'action concurrent.", w:'Les douze sections validées sont là : titre à rotation, onglets Optimisation / Création / Intelligence, bande de crédibilité aux emplacements vides, trois blocs piliers, tarifs avec sélecteur de devise, témoignages non rédigés, pied de page. La bascule 1440 / 375 change de cadre validé.', s:'Lot 7 · A1 Landing page v2 — les 12 sections' },
  signup:{ t:'Quatre champs et rien de plus', b:"Tout le reste est demandé pendant la configuration. L'indicateur de robustesse explique pourquoi il est exigeant — ce compte accède à des budgets publicitaires.", w:"La colonne de droite insiste sur le point qui rassure : l'offre gratuite est un plan mensuel, pas un essai de quatorze jours. C'est le seul endroit du site où cet argument est répété.", s:'Lot 7 · A5 Inscription' },
  connect:{ t:'Le moment de confiance', b:"L'étape la plus risquée du parcours : on demande un accès en écriture au compte publicitaire. Les trois permissions sont énoncées en clair, et la promesse « ne publie jamais sans votre accord » est juste sous le bouton.", w:'La connexion prend deux secondes puis enchaîne. En conditions réelles, c\u2019est une redirection vers Meta.', s:'Lot 6 · B1 Connexion Meta' },
  welcome:{ t:'Poser la promesse avant les formulaires', b:"Le seul écran où l'on peut promettre avant de demander. Quatre choses concrètes que l'agent fera — avec des chiffres, pas des adjectifs — puis les quatre étapes annoncées avec leur durée.", w:"La sortie « explorer d'abord le tableau de bord » est offerte tout de suite : un utilisateur qui veut voir avant de donner accès à son compte publicitaire a raison.", s:'Lot 6 · B1 Bienvenue' },
  meta:{ t:"L'étape la plus anxiogène", b:'Chaque autorisation est nommée, expliquée par son usage réel, étiquetée requise ou recommandée, avec son intitulé technique. En face, la liste verte de ce que nous ne ferons jamais sans validation.', w:"Le bouton est en bleu Meta, dans une carte qui rappelle que les identifiants ne passent pas par nous. Les quatre permissions sont lues avant le clic — l'ordre des deux colonnes est volontaire.", s:'Lot 6 · B2 Connexion Meta' },
  bm:{ t:'Le rôle est déterminant', b:"Trois Business Managers, avec le nombre de comptes et le rôle de l'utilisateur sur chacun.", w:'Sur Sanou Retail Group, la lecture seule est signalée en ambre avec ce qui ne fonctionnera pas et la démarche pour le corriger — demander le rôle Annonceur au propriétaire.', s:'Lot 6 · B3 Business Manager' },
  accounts:{ t:'Devise, fuseau, dépense', b:'Ces trois valeurs déterminent l\u2019affichage de toutes les données ensuite — d\u2019où leur présence dès la sélection, en trois tuiles côte à côte.', w:"Le compte en euros est signalé : les montants ne sont jamais convertis, et les totaux multi-comptes sont affichés par devise, jamais additionnés. Le compte restreint apparaît mais n'est pas sélectionnable, avec le motif et la date.", s:'Lot 6 · B4 Comptes publicitaires' },
  pages:{ t:'Ce qui se perd sans Instagram', b:"Trois pages, avec catégorie, abonnés et compte Instagram associé. La page par défaut est un choix unique, pas une case à cocher.", w:"La page sans Instagram n'est pas cachée : elle est signalée avec ce que cela retire — ni fil, ni Reels, ni Stories — et où corriger. C'est l'information qui évite une campagne mal placée deux semaines plus tard.", s:'Lot 6 · B5 Pages et Instagram' },
  pixel:{ t:'L\u2019écran qui décide si le produit a de la valeur', b:"Sans événement de conversion, l'agent voit ce que vous dépensez mais pas ce que vous gagnez. Cinq événements avec leur volume sur 7 jours.", w:"« Prospect » est en ambre : 38 événements par semaine ne suffisent pas, et le dire ici évite des recommandations douteuses plus tard. La colonne de droite traite le cas « aucun pixel » sans bloquer.", s:'Lot 6 · B6 Pixel et conversion' },
  verify:{ t:'Le point de sortie le plus fréquent', b:"L'e-mail n'arrive pas, ou il arrive dans les indésirables. Trois éléments répondent à ça : le nom exact de l'expéditeur, la mention explicite des indésirables, et un renvoi avec compte à rebours pour éviter le double envoi.", w:'Le bouton de renvoi est désactivé pendant 42 secondes — visible mais inerte, plutôt que masqué.', s:'Lot 7 · A5 Vérification d\u2019e-mail' },
  onboarding:{ t:'Business Brain', b:"Trois étapes courtes. Ce n'est pas un formulaire administratif : chaque réponse est réutilisée plus tard, et l'écran le dit à chaque étape.", w:'Le CPA cible de 12 000 FCFA saisi ici est exactement le seuil que l\u2019agent utilise pour signaler les écarts. On le retrouve sur le tableau de bord et dans chaque recommandation.', s:'Lot 6 · B3 à B6 Business Brain' },
  dashboard:{ t:'Les six zones', b:"Alertes actives en premier — elles disparaissent du DOM s'il n'y en a aucune, sans espace réservé. Puis les six indicateurs, l'évolution comparée, les meilleures publicités, et les recommandations du jour.", w:"La couleur suit le sens métier, pas la direction : CPC en hausse est rouge, dépense en hausse est neutre. Tout montant de plus de 6 chiffres s'abrège, l'exact est rappelé en légende.", s:'Lot 1 · C1.1 Vue d\u2019ensemble' },
  agent:{ t:'Le fil, classé par gravité', b:'Sept recommandations, deux critiques. La carte du haut est développée, les suivantes se compactent : le fil reste lisible à vingt entrées.', w:'La carte « 8 objets groupés » est la réponse au volume — une carte-mère porte le diagnostic commun. Validez-en une : elle passe dans « Appliqué aujourd\u2019hui », le badge bleu du menu baisse, et l\u2019état survit au rechargement.', s:'Lot 1 · C2.1 Fil des recommandations' },
  reco:{ t:'La justification chiffrée', b:"Une recommandation sans justification chiffrée est une injonction. Le chiffre qui fonde le diagnostic est au même niveau typographique que l'action — jamais relégué à un détail dépliable.", w:'« Ce qui change » montre les valeurs avant et après avant toute validation, et la ligne de pied rappelle que le budget total du compte ne bouge pas.', s:'Lot 1 · C2.2 Examiner et appliquer' }
};

class Component extends DCLogic {
  state = {
    route:'landing', vp:'desktop', sb:'full', plan:'pro', ds:'full', banner:'config',
    picker:true, notes:false, connecting:false, sheet:false,
    glow:'pulsation', rotation:true, menu:false, tab:0, cur:0,
    fg:0, mod:'manager', tableOpen:false,
    lvl:'camp', adView:'table', sel:[], paused:[], filtersOn:false, metricOn:false, fq:'', metric:'roas',
    onb:0, doneIds:[], curId:'r1', toast:'', toastN:0
  };

  componentDidMount() {
    try { const raw = localStorage.getItem('lyads-proto-v2'); if (raw) this.setState(JSON.parse(raw)); } catch (e) {}
  }

  componentDidUpdate() {
    try {
      const s = this.state;
      localStorage.setItem('lyads-proto-v2', JSON.stringify({
        route:s.route, vp:s.vp, sb:s.sb, plan:s.plan, ds:s.ds, banner:s.banner,
        picker:s.picker, notes:s.notes, onb:s.onb, doneIds:s.doneIds, curId:s.curId,
        glow:s.glow, rotation:s.rotation, tab:s.tab, cur:s.cur, fg:s.fg, mod:s.mod, lvl:s.lvl, adView:s.adView, paused:s.paused, metric:s.metric, fq:s.fq
      }));
    } catch (e) {}
  }

  go(route) { this.setState({ route, sheet:false }); }

  toast(text) {
    this.setState(s => ({ toast:text, toastN:s.toastN + 1 }));
    const n = this.state.toastN + 1;
    setTimeout(() => { if (this.state.toastN === n) this.setState({ toast:'' }); }, 3000);
  }

  renderVals() {
    const s = this.state;
    const on = v => v ? '1' : '0';
    const live = RECOS.filter(r => s.doneIds.indexOf(r.id) === -1);
    const done = RECOS.filter(r => s.doneIds.indexOf(r.id) !== -1);
    const cur = RECOS.filter(r => r.id === s.curId)[0] || RECOS[0];
    const inApp = ['dashboard','agent','reco','module','manager'].indexOf(s.route) !== -1;
    const note = NOTES[s.route === 'onboarding' ? ONB[s.onb].key : s.route] || NOTES.landing;
    const mod = MODULES[s.mod] || MODULES.manager;

    const pilot = METRICS.filter(m => m.key === s.metric)[0] || METRICS[0];
    const isPaused = c => s.paused.indexOf(c.id) !== -1 || !c.on;
    const num = v => v === '—' ? null : parseFloat(String(v).replace(/\s/g,'').replace(',','.'));
    const tone = k => k === 'err' ? '#C0311F' : k === 'warn' ? '#8F5F08' : k === 'ok' ? '#146B4A' : k === 'info' ? '#2A3AA3' : '#5C564E';
    const flagOf = k => (k === 'err' || k === 'warn') ? tone(k) : 'transparent';
    const pilotVal = c => { if (pilot.key === 'roas') return c.roas; if (pilot.key === 'cpa') return c.cpa;
      if (pilot.key === 'spend') return c.spend; if (pilot.key === 'budget') return c.pct + ' %'; return c.freq || '—'; };
    const camps = CAMPS.slice().sort((a, b) => {
      const x = num(pilotVal(a)), y = num(pilotVal(b));
      if (x === null) return 1; if (y === null) return -1;
      return pilot.key === 'roas' ? x - y : y - x;
    });
    const selSum = s.sel.reduce((t, id) => { const c = CAMPS.filter(x => x.id === id)[0];
      return t + (c ? (num(c.spend) || 0) : 0); }, 0).toLocaleString('fr-FR').replace(/\u202f/g, ' ') + ' FCFA';
    const learners = s.sel.filter(id => { const c = CAMPS.filter(x => x.id === id)[0];
      return c && (c.status === 'Apprentissage limité' || c.status === 'En apprentissage'); }).length;
    const selWarn = learners > 0
      ? learners + ' des ' + s.sel.length + ' campagnes repartiront en apprentissage'
      : 'Les modifications de budget relancent la phase d\u2019apprentissage';
    const scrollTo = key => { this.setState({ route:'landing', sheet:false, menu:false });
      setTimeout(() => {
        const els = [...document.querySelectorAll('[data-anchor="' + key + '"]')];
        const el = els.filter(e => e.getBoundingClientRect().width > 0)[0] || els[0];
        if (!el) return;
        let p = el.parentElement;
        while (p && p !== document.body) { const st = getComputedStyle(p);
          if ((st.overflowY === 'auto' || st.overflowY === 'scroll') && p.scrollHeight > p.clientHeight + 4) break;
          p = p.parentElement; }
        const top = el.getBoundingClientRect().top;
        if (p && p !== document.body) p.scrollTop += top - p.getBoundingClientRect().top - 24;
        else window.scrollBy(0, top - 90);
      }, 110); };

    const roasCol = v => v === '—' ? '#6E6862' : (num(v) < 1.6 ? '#C0311F' : '#146B4A');
    const barCol = p => p >= 100 ? '#C0311F' : p >= 85 ? '#8F5F08' : '#146B4A';

    const rowCamp = c => { const off = isPaused(c); return {
      name:c.name, sub:c.sub, status:c.status, glyph:c.glyph,
      stColor:tone(c.kind), flag:flagOf(c.kind), byAgent:on(c.agent),
      subColor:c.agent ? '#2A3AA3' : (c.kind === 'err' || c.kind === 'warn' ? tone(c.kind) : '#6E6862'),
      budget:c.budget, hasBar:on(c.pct > 0), barPct:c.pct + '%', barColor:barCol(c.pct),
      spend:c.spend, buys:c.buys, roas:c.roas, cpa:c.cpa, roasColor:roasCol(c.roas),
      swBg:off ? '#A9A196' : '#146B4A', swPos:off ? 'flex-start' : 'flex-end',
      boxBg:s.sel.indexOf(c.id) !== -1 ? '#B44A26' : 'transparent',
      boxBorder:s.sel.indexOf(c.id) !== -1 ? '#B44A26' : '#A9A196',
      boxTick:s.sel.indexOf(c.id) !== -1 ? '#FFFFFF' : 'transparent',
      toggleSel:() => this.setState({ sel:s.sel.indexOf(c.id) !== -1 ? s.sel.filter(x => x !== c.id) : s.sel.concat([c.id]) }),
      togglePause:() => { const nowOff = !off; this.setState({ paused:nowOff ? s.paused.concat([c.id]) : s.paused.filter(x => x !== c.id) });
        this.toast(c.name + (nowOff ? ' · mise en pause' : ' · réactivée')); },
      drill:() => this.setState({ lvl:'set', sel:[] })
    }; };

    const card = c => { const off = isPaused(c); return {
      name:c.name, status:c.status, glyph:c.glyph, stColor:tone(c.kind), flag:flagOf(c.kind),
      pilotName:pilot.name, pilot:pilotVal(c),
      pilotColor:pilot.key === 'roas' ? roasCol(c.roas) : '#1B1916',
      spend:c.spend, cpa:c.cpa,
      hasBar:on(c.pct > 0), barPct:c.pct + '%', barColor:barCol(c.pct),
      budgetLine:'Budget ' + c.budget + ' / j',
      hasAlert:on(!!c.alert), alert:c.alert,
      alertBg:c.kind === 'err' ? '#FBE9E6' : '#F8EDD8',
      alertFg:c.kind === 'err' ? '#8E2317' : '#7A5208',
      swBg:off ? '#A9A196' : '#146B4A', swPos:off ? 'flex-start' : 'flex-end',
      togglePause:() => { const nowOff = !off; this.setState({ paused:nowOff ? s.paused.concat([c.id]) : s.paused.filter(x => x !== c.id) });
        this.toast(c.name + (nowOff ? ' · mise en pause' : ' · réactivée')); },
      actLabel:c.act, act:() => this.toast(c.act + ' · ' + c.name),
      drillLabel:c.drill, drill:() => this.setState({ lvl:'set', sel:[] })
    }; };
    const empty = s.ds === 'empty', stale = s.ds === 'stale';
    const maxCredits = s.plan === 'pro' ? 200 : 60;
    const credits = s.plan === 'pro' ? 38 : 12;
    const nCrit = live.filter(r => r.prio === 'Critique').length;
    const nElev = live.filter(r => r.prio === 'Élevée').length;
    const nMoy = live.filter(r => r.prio === 'Moyenne').length;
    const parts = [];
    if (nCrit) parts.push(nCrit + (nCrit > 1 ? ' critiques' : ' critique'));
    if (nElev) parts.push(nElev + (nElev > 1 ? ' élevées' : ' élevée'));
    if (nMoy) parts.push(nMoy + (nMoy > 1 ? ' moyennes' : ' moyenne'));

    const mk = r => ({
      id:r.id, prio:r.prio, glyph:r.glyph, color:r.color, cat:r.cat, detected:r.detected,
      title:r.title, sub:r.sub, trustLabel:r.trustLabel, trustPct:r.trustPct, cta:r.cta,
      d1l:r.d1l, d1v:r.d1v, d1n:r.d1n, d2l:r.d2l, d2v:r.d2v, d2n:r.d2n,
      impactLabel:r.impactLabel, impactValue:r.impactValue, impactNote:r.impactNote,
      grouped:on(!!r.grouped), groupLabel:r.groupLabel || '',
      open:() => this.setState({ curId:r.id, route:'reco', sheet:false })
    });

    return {
      vp:s.vp,
      isDesktop:on(s.vp === 'desktop'), isMobile:on(s.vp === 'mobile'),
      setDesktop:() => this.setState({ vp:'desktop', sheet:false }),
      setMobile:() => this.setState({ vp:'mobile' }),
      sbFull:on(s.sb === 'full'), sbMini:on(s.sb === 'mini'), sbHidden:on(s.sb === 'hidden'),
      setSbFull:() => this.setState({ sb:'full' }),
      setSbMini:() => this.setState({ sb:'mini' }),
      setSbHidden:() => this.setState({ sb:'hidden' }),
      isPro:on(s.plan === 'pro'), isFree:on(s.plan === 'free'),
      setPro:() => this.setState({ plan:'pro' }), setFree:() => this.setState({ plan:'free' }),
      dsFull:on(s.ds === 'full'), dsEmpty:on(empty), dsStale:on(stale), dsData:on(!empty),
      setFull:() => this.setState({ ds:'full' }),
      setEmpty:() => this.setState({ ds:'empty' }),
      setStale:() => this.setState({ ds:'stale' }),
      bNone:on(s.banner === 'none'), bConfig:on(s.banner === 'config'), bMeta:on(s.banner === 'meta'),
      bCredits:on(s.banner === 'credits'), bImport:on(s.banner === 'import'), bConsult:on(s.banner === 'consult'),
      setBNone:() => this.setState({ banner:'none' }),
      setBConfig:() => this.setState({ banner:'config' }),
      setBMeta:() => this.setState({ banner:'meta' }),
      setBCredits:() => this.setState({ banner:'credits' }),
      setBImport:() => this.setState({ banner:'import' }),
      setBConsult:() => this.setState({ banner:'consult' }),
      pickerOn:on(s.picker), notesOn:on(s.notes),
      togglePicker:() => this.setState({ picker:!s.picker }),
      toggleNotes:() => this.setState({ notes:!s.notes }),
      reset:() => { try { localStorage.removeItem('lyads-proto-v2'); } catch (e) {}
        this.setState({ route:'landing', sb:'full', plan:'pro', ds:'full', banner:'config', onb:0, doneIds:[], curId:'r1', connecting:false, sheet:false, toast:'', glow:'pulsation', rotation:true, menu:false, tab:0, cur:0, fg:0, mod:'manager', tableOpen:false, lvl:'camp', adView:'table', sel:[], paused:[], filtersOn:false, metricOn:false, fq:'', metric:'roas' }); },

      glow:s.glow, rotoff:s.rotation ? '0' : '1',
      glowPulse:on(s.glow === 'pulsation'), glowHover:on(s.glow === 'survol'), rotOn:on(s.rotation),
      setGlowPulse:() => this.setState({ glow:'pulsation' }),
      setGlowHover:() => this.setState({ glow:'survol' }),
      toggleRot:() => this.setState({ rotation:!s.rotation }),
      vides:'1', bandeauOn:'1',
      menuOn:on(s.menu), toggleMenu:() => this.setState({ menu:!s.menu }),
      tab1:on(s.tab === 0), tab2:on(s.tab === 1), tab3:on(s.tab === 2),
      setTab1:() => this.setState({ tab:0 }), setTab2:() => this.setState({ tab:1 }), setTab3:() => this.setState({ tab:2 }),
      cur1:on(s.cur === 0), cur2:on(s.cur === 1), cur3:on(s.cur === 2),
      setCur1:() => this.setState({ cur:0 }), setCur2:() => this.setState({ cur:1 }), setCur3:() => this.setState({ cur:2 }),
      rLogin:on(s.route === 'login'), rForgot:on(s.route === 'forgot'),
      rPricing:on(s.route === 'pricing'), rLegal:on(s.route === 'legal'), rModule:on(s.route === 'module'),
      goLogin:() => this.go('login'), goPricing:() => this.go('pricing'), goLegal:() => this.go('legal'),
      goForgot:() => this.setState({ route:'forgot', fg:0, sheet:false }),
      signIn:() => { this.go('dashboard'); this.toast('Connecté · Kola Distribution'); },
      fg1:on(s.fg === 0), fg2:on(s.fg === 1), fg3:on(s.fg === 2),
      fgSend:() => this.setState({ fg:1 }), fgNext:() => this.setState({ fg:2 }),
      tableOpen:on(s.tableOpen), tableCta:s.tableOpen ? 'Replier le tableau' : 'Déplier le tableau complet — 24 lignes',
      toggleTable:() => this.setState({ tableOpen:!s.tableOpen }),
      goPilier1:() => scrollTo('piliers'), goPilier2:() => scrollTo('creation'), goPilier3:() => scrollTo('intelligence'),
      goPiliers:() => scrollTo('piliers'),
      _unusedPiliers:() => { this.setState({ route:'landing', sheet:false, menu:false });
        setTimeout(() => { const el = document.querySelector('[data-anchor="piliers"]'); if (!el) return;
          let p = el.parentElement; while (p && p !== document.body) { const st = getComputedStyle(p);
            if ((st.overflowY === 'auto' || st.overflowY === 'scroll') && p.scrollHeight > p.clientHeight + 4) break; p = p.parentElement; }
          const top = el.getBoundingClientRect().top;
          if (p && p !== document.body) p.scrollTop += top - p.getBoundingClientRect().top - 12;
          else window.scrollBy(0, top - 80); }, 90); },
      rManager:on(s.route === 'manager'),
      lvlCamp:on(s.lvl === 'camp'), lvlSet:on(s.lvl === 'set'), lvlAd:on(s.lvl === 'ad'),
      setLvlCamp:() => this.setState({ lvl:'camp', sel:[] }),
      setLvlSet:() => this.setState({ lvl:'set', sel:[] }),
      setLvlAd:() => this.setState({ lvl:'ad', sel:[] }),
      adTable:on(s.adView === 'table'), adGrid:on(s.adView === 'grid'),
      setAdTable:() => this.setState({ adView:'table' }), setAdGrid:() => this.setState({ adView:'grid' }),
      tableOn:'1',
      adTableOn:on(s.lvl === 'ad' && s.adView === 'table'),
      adGridOn:on(s.lvl === 'ad' && s.adView === 'grid'),
      filtersOn:on(s.filtersOn), metricOn:on(s.metricOn),
      toggleFilters:() => this.setState({ filtersOn:!s.filtersOn, metricOn:false }),
      toggleMetric:() => this.setState({ metricOn:!s.metricOn, filtersOn:false }),
      filterLabel:s.fq ? s.fq : 'Filtres · 1',
      clearFilter:() => this.setState({ fq:'' }),
      fq1:on(s.fq === 'Sous-performantes'), fq2:on(s.fq === 'Budget épuisé'), fq3:on(s.fq === 'Apprentissage bloqué'),
      fq4:on(s.fq === 'À surveiller'), fq5:on(s.fq === 'Meilleures'),
      setFq1:() => this.setState({ fq:s.fq === 'Sous-performantes' ? '' : 'Sous-performantes' }),
      setFq2:() => this.setState({ fq:s.fq === 'Budget épuisé' ? '' : 'Budget épuisé' }),
      setFq3:() => this.setState({ fq:s.fq === 'Apprentissage bloqué' ? '' : 'Apprentissage bloqué' }),
      setFq4:() => this.setState({ fq:s.fq === 'À surveiller' ? '' : 'À surveiller' }),
      setFq5:() => this.setState({ fq:s.fq === 'Meilleures' ? '' : 'Meilleures' }),
      metricLabel:'Pilote : ' + pilot.name,
      sortLabel:'Trié par ' + pilot.name + ' ' + (pilot.key === 'roas' ? 'croissant' : 'décroissant'),
      metrics:METRICS.map(m => ({ name:m.name, hint:m.hint, sel:on(m.key === s.metric), tick:m.key === s.metric ? '#B44A26' : 'transparent',
        pick:() => this.setState({ metric:m.key, metricOn:false }) })),
      selOn:on(s.sel.length > 0), selWarn:on(s.sel.length > 1),
      selLabel:s.sel.length + (s.sel.length > 1 ? ' sélectionnées' : ' sélectionnée'),
      selSum:'campagnes · ' + selSum,
      selWarnText:selWarn,
      selClear:() => this.setState({ sel:[] }),
      selAll:() => this.setState({ sel:s.sel.length === CAMPS.length ? [] : CAMPS.map(c => c.id) }),
      selPause:() => { this.setState({ paused:s.paused.concat(s.sel.filter(x => s.paused.indexOf(x) === -1)), sel:[] });
        this.toast(s.sel.length + (s.sel.length > 1 ? ' campagnes mises en pause' : ' campagne mise en pause')); },
      selBudget:() => this.toast('Modification de budget · ' + s.sel.length + ' sélectionnées'),
      rowsCamp:camps.map(c => rowCamp(c)),
      rowsSet:SETS.map(x => ({ name:x.name, parent:x.parent, audience:x.audience, places:x.places,
        lnGlyph:x.lnGlyph, lnLabel:x.ln, lnCount:x.lnCount, lnNote:x.lnNote,
        lnColor:tone(x.kind), flag:flagOf(x.kind), spend:x.spend, roas:x.roas, cpa:x.cpa,
        roasColor:x.roas === '—' ? '#6E6862' : (parseFloat(x.roas.replace(',','.')) < 1.6 ? '#C0311F' : '#146B4A') })),
      rowsAd:ADS.map(x => ({ name:x.name, copy:x.copy, format:x.format, spec:x.spec, spend:x.spend, roas:x.roas, freq:x.freq, ret:x.ret,
        flag:flagOf(x.kind === 'ok' ? 'neutral' : x.kind), hasStatus:on(!!x.status), status:x.status,
        stBg:x.kind === 'err' ? '#C0311F' : '#8F5F08', stFg:'#FFFFFF',
        swBg:x.on ? '#146B4A' : '#A9A196', swPos:x.on ? 'flex-end' : 'flex-start',
        roasColor:x.roas === '—' ? '#6E6862' : (parseFloat(x.roas.replace(',','.')) < 1.6 ? '#C0311F' : '#146B4A'),
        freqColor:x.freq !== '—' && parseFloat(x.freq.replace(',','.')) > 4 ? '#C0311F' : '#423D37' })),
      cards:camps.map(c => card(c)),
      modKicker:mod.kicker, modTitle:mod.title, modBody:mod.body, modFile:mod.file,
      modScreens:mod.screens.map(x => ({ ref:x[0], name:x[1] })),
      goManager:() => this.setState({ route:'manager', sheet:false }),
      goBuilder:() => this.setState({ route:'module', mod:'builder', sheet:false }),
      goStudio:() => this.setState({ route:'module', mod:'studio', sheet:false }),
      goCreative:() => this.setState({ route:'module', mod:'creative', sheet:false }),
      goRules:() => this.setState({ route:'module', mod:'rules', sheet:false }),
      goMarket:() => this.setState({ route:'module', mod:'market', sheet:false }),
      goReports:() => this.setState({ route:'module', mod:'reports', sheet:false }),
      goBrain:() => this.setState({ route:'module', mod:'brain', sheet:false }),
      goManagerSel:on(s.route === 'manager'),
      goBuilderSel:on(s.route === 'module' && s.mod === 'builder'),
      goStudioSel:on(s.route === 'module' && s.mod === 'studio'),
      goCreativeSel:on(s.route === 'module' && s.mod === 'creative'),
      goRulesSel:on(s.route === 'module' && s.mod === 'rules'),
      goMarketSel:on(s.route === 'module' && s.mod === 'market'),
      goReportsSel:on(s.route === 'module' && s.mod === 'reports'),
      rLanding:on(s.route === 'landing'), rSignup:on(s.route === 'signup'),
      rVerify:on(s.route === 'verify'), rOnb:on(s.route === 'onboarding'),
      rDash:on(s.route === 'dashboard'), rAgent:on(s.route === 'agent'), rReco:on(s.route === 'reco'),
      inApp:on(inApp),
      pLanding:on(s.route === 'landing'), pSignup:on(s.route === 'signup'),
      pConnect:on(s.route === 'onboarding' && s.onb === 1), pOnb:on(s.route === 'onboarding' && s.onb > 1),
      pDash:on(s.route === 'dashboard'), pAgent:on(s.route === 'agent'),
      pReco:on(s.route === 'reco'), pAgentAny:on(s.route === 'agent' || s.route === 'reco'),
      goLanding:() => this.go('landing'), goSignup:() => this.go('signup'),
      goVerify:() => this.go('verify'),
      goConnect:() => this.setState({ route:'onboarding', onb:1, connecting:false, sheet:false }),
      goOnb:() => this.setState({ route:'onboarding', onb:0, sheet:false }),
      goOnbFromSheet:() => this.setState({ route:'onboarding', onb:0, sheet:false }),
      goDash:() => this.go('dashboard'), goAgent:() => this.go('agent'),
      goRecoFirst:() => this.setState({ route:'reco', curId:live.length ? live[0].id : 'r1', sheet:false }),

      sheetOn:on(s.sheet),
      openSheet:() => this.setState({ sheet:true }),
      closeSheet:() => this.setState({ sheet:false }),

      isConnecting:on(s.connecting), notConnecting:on(!s.connecting),
      startConnect:() => { this.setState({ connecting:true });
        setTimeout(() => this.setState({ connecting:false, route:'onboarding', onb:2 }), 1600); },

      onbA:on(s.onb === 0), onbB:on(s.onb === 1), onbC:on(s.onb === 2),
      onbD:on(s.onb === 3), onbE:on(s.onb === 4), onbF:on(s.onb === 5),
      onbNotFirst:on(s.onb > 0),
      onbSkippable:on(!!ONB[s.onb].skip),
      onbCta:ONB[s.onb].cta,
      onbMobileTitle:ONB[s.onb].mobile,
      onbMilestone:ONB[s.onb].n + '/10',
      milestones:[1,2,3,4,5,6,7,8,9,10].map(n => ({
        n:String(n),
        bg:n === ONB[s.onb].n ? '#FAE8DF' : (n < ONB[s.onb].n ? '#B44A26' : '#F4F1EB'),
        fg:n === ONB[s.onb].n ? '#94391D' : (n < ONB[s.onb].n ? '#FFFFFF' : '#A9A196'),
        showLabel:on(n === ONB[s.onb].n), label:ONB[s.onb].label
      })),
      onbBack:() => this.setState({ onb:Math.max(0, s.onb - 1) }),
      onbNext:() => { if (s.onb < ONB.length - 1) this.setState({ onb:s.onb + 1 });
        else { this.setState({ route:'dashboard', banner:'none' }); this.toast('Configuration enregistrée · Kola Distribution connecté'); } },

      appTitle:s.route === 'dashboard' ? 'Tableau de bord' : (s.route === 'agent' ? 'Agent d\u2019optimisation' : (s.route === 'module' ? mod.title : (s.route === 'manager' ? 'Gestionnaire de publicités' : 'Recommandation'))),
      syncIcon:stale ? 'ph-clock-countdown' : 'ph-arrows-clockwise',
      syncColor:stale ? '#8F5F08' : '#6E6862',
      syncLabel:stale ? 'Données de 3 h 20' : 'Synchronisé il y a 12 min',
      syncDetail:stale ? 'Meta publie avec retard' : '2 août, 09:14 · source Meta',
      kSpend:stale ? '2,58 M' : '2,64 M',

      creditsLabel:credits + ' / ' + maxCredits,
      creditsNum:String(credits),
      creditsPct:Math.round(credits / maxCredits * 100) + '%',
      lowCredits:on(credits / maxCredits < 0.25),

      recos:live.map(mk), topRecos:live.slice(0, 2).map(mk),
      done:done.map(r => ({ title:r.title, outcome:r.outcome })),
      hasRecos:on(live.length > 0 && !empty), noRecos:on(live.length === 0 || empty),
      hasDone:on(done.length > 0), recoCount:String(empty ? 0 : live.length),
      critCount:String(nCrit),
      hasAlerts:on(!empty),
      pendingLabel:live.length + ' en attente',
      breakdown:parts.join(' · '),

      curPrio:cur.prio, curGlyph:cur.glyph, curColor:cur.color, curCat:cur.cat, curDetected:cur.detected,
      curTitle:cur.title, curScope:cur.scope, curCta:cur.cta,
      curTrustLabel:cur.trustLabel, curTrustPct:cur.trustPct,
      curD1L:cur.d1l, curD1V:cur.d1v, curD1U:cur.d1u, curD1N:cur.d1n,
      curD2L:cur.d2l, curD2V:cur.d2v, curD2U:cur.d2u, curD2N:cur.d2n,
      curD3L:cur.d3l, curD3V:cur.d3v, curD3U:cur.d3u, curD3N:cur.d3n,
      curImpactLabel:cur.impactLabel, curImpactValue:cur.impactValue, curImpactUnit:cur.impactUnit,
      curImpactNote:cur.impactNote, curImpactBody:cur.impactBody,
      curHasChange:on(!!cur.hasChange),
      curCh1Label:cur.ch1Label || '', curCh1From:cur.ch1From || '', curCh1To:cur.ch1To || '',
      curCh2Label:cur.ch2Label || '', curCh2From:cur.ch2From || '', curCh2To:cur.ch2To || '',
      curChFoot:cur.chFoot || '',
      validate:() => { if (s.doneIds.indexOf(cur.id) === -1) this.setState({ doneIds:s.doneIds.concat([cur.id]) });
        this.setState({ route:'agent' }); this.toast(cur.outcome); },
      dismiss:() => { if (s.doneIds.indexOf(cur.id) === -1) this.setState({ doneIds:s.doneIds.concat([cur.id]) });
        this.setState({ route:'agent' }); this.toast('Recommandation ignorée'); },
      rerun:() => { this.setState({ doneIds:[] }); this.toast('Scan terminé · 7 recommandations · 2 crédits'); },

      miniDashBg:s.route === 'dashboard' ? '#FAE8DF' : 'transparent',
      miniDashColor:s.route === 'dashboard' ? '#94391D' : '#5C564E',
      miniAgentBg:(s.route === 'agent' || s.route === 'reco') ? '#FAE8DF' : 'transparent',
      miniAgentColor:(s.route === 'agent' || s.route === 'reco') ? '#94391D' : '#5C564E',

      toastOn:on(!!s.toast), toastText:s.toast,
      noteTitle:note.t, noteBody:note.b, noteWatch:note.w, noteSource:note.s,
      stateLine:'Kola Distribution · ' + credits + ' / ' + maxCredits + ' cr. · ' + live.length + ' reco en attente · ' + (s.vp === 'mobile' ? '375' : '1440 · barre ' + (s.sb === 'full' ? '240' : s.sb === 'mini' ? '64' : 'masquée'))
    };
  }
}
