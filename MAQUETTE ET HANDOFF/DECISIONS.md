# DECISIONS.md — divergences, arbitrages et points ouverts

Établi le 12 septembre 2026 par relecture des sources. Pour chaque sujet : la valeur de chaque source, la décision retenue, et **la source qui fait autorité**. Quand aucune source ne fait autorité, le sujet est marqué **« À trancher par le propriétaire du projet »** et n'est pas décidé à sa place.

**Hiérarchie des sources appliquée**, de la plus forte à la plus faible :

1. `tokens.css` et `DESIGN_SYSTEM.md` — se déclarent source de vérité
2. Les maquettes de lot validées (`Lot N - *.dc.html`)
3. `Prototype Lyads.dc.html`
4. `HANDOFF_CODEX.md` — document dérivé, corrigé quand il divergeait

---

## 1. Réversibilité des actions de l'agent — **tranché : 7 jours**

| Source | Valeur |
|---|---|
| `DESIGN_SYSTEM.md` | « reste annulable pendant 7 jours » |
| `CLAUDE.md` | « annulable 7 jours » |
| Prototype — panneau C2.2 et ligne « Traité aujourd'hui » | « annulable 7 jours » |
| `HANDOFF_CODEX.md` (avant correction) | 30 jours |

**Décision : 7 jours.** Trois sources concordantes dont les deux qui font autorité. Le handoff a été corrigé. Aucune interface ne doit annoncer 30 jours.

## 2. Crédits du plan Pro — **tranché : 1 500 / mois**

| Source | Valeur |
|---|---|
| Maquette A3 · Tarifs | 1 500 crédits / mois |
| Maquette B10 · Choix du plan | 1 500 |
| Maquette C11.3 · Abonnement | « Plan Pro, 1 012 crédits consommés sur 1 500 » |
| Coquille applicative (jauge) | 38 / 200 |

**Décision : 1 500.** Trois maquettes concordantes contre une. Le « 200 » de la coquille est une **donnée de démonstration périmée** : aucun plan du catalogue ne vaut 200 crédits (60 · 500 · 1 500 · 5 000).

**Point ouvert mineur :** sur quel plan placer le compte de démonstration « Kola Distribution » ? C11.3 le place sur Pro à 1 012 / 1 500. Recommandation : aligner la coquille sur ces mêmes valeurs, ce qui rend cohérent le bandeau « Solde faible » (voir § 4).

## 3. Coût d'une analyse — **deux actions distinctes, à confirmer**

| Source | Valeur |
|---|---|
| A3 · table des coûts unitaires | « Analyse complète d'un compte — 8 crédits » |
| Prototype C2.1 · bouton | « Lancer un scan · 2 crédits » |

**Lecture retenue : ce sont deux actions différentes**, et non une contradiction — un scan de relance sur des données déjà synchronisées coûte moins qu'une analyse complète. Les deux libellés existent côte à côte dans les maquettes du lot 5 et du lot 6.

**À confirmer par le propriétaire :** la nomenclature définitive. Proposition, à valider :
- **Analyse complète** — 8 crédits — reprise de l'historique sur 90 jours, une fois par jour au maximum
- **Scan** — 2 crédits — réévaluation sur les données déjà en base, à la demande

Sans confirmation, ne pas fusionner les deux en une seule action facturée.

## 4. Seuil du bandeau « Solde faible » — **À trancher par le propriétaire du projet**

| Source | Valeur |
|---|---|
| `HANDOFF_CODEX.md` | « sous 15 % du plan » |
| Prototype — logique `lowCredits` | `credits / maxCredits < 0.25`, soit 25 % |

Les deux valeurs sont défendables et aucune maquette validée ne tranche. Avec 38 / 200 dans la coquille (19 %), le bandeau s'affiche : cohérent à 25 %, incohérent à 15 %. **Valeurs contradictoires : 15 % et 25 %.** Recommandation technique : un seuil unique en configuration, valeur de départ 25 %, plus un second palier « épuisé » à 0.

## 5. Fréquence de surveillance — **réconciliable, à confirmer**

| Source | Valeur |
|---|---|
| Maquette B1 · Bienvenue | « Il surveille vos campagnes toutes les heures » |
| Maquette A1 et A2 | surveillance horaire |
| Maquette C2.1 | « Analyse du 11 août · 14 ensembles et 38 publicités examinés » — une analyse datée du jour |
| `HANDOFF_CODEX.md` | « examine le compte chaque jour » |

**Lecture retenue : deux rythmes distincts**, ce qui rend les deux sources vraies —
- **surveillance continue, horaire** : détection d'événements (budget épuisé, rejet Meta, chute brutale) → bandeaux et notifications
- **analyse complète, quotidienne** : recalcul du fil de recommandations → C2.1

**À confirmer :** cette distinction n'est écrite nulle part. Si elle est validée, elle doit entrer dans le handoff et dans les textes de B1.

## 6. Gestionnaire de publicités C3 — **corrigé**

Le handoff annonçait C3 intégré au prototype alors qu'il n'y avait qu'une page d'attente. C3.1, C3.2 et C3.3 sont désormais réellement assemblés, avec les intitulés de la maquette du lot 2 : **Campagnes · Ensembles · Publicités**. Les anciens intitulés génériques ont été supprimés.

## 7. Persistance du prototype — **corrigé dans le handoff**

| Source | Valeur |
|---|---|
| Prototype | clé `lyads-proto-v2` · `onb` = index 0..5 sur les six étapes Meta (Bienvenue, Meta, Business Manager, Comptes, Pages, Pixel) |
| `HANDOFF_CODEX.md` (avant correction) | clé `lyads-proto-v1` · `onb` = 0..2 sur le Business Brain |

**Décision : la description du prototype fait foi**, le handoff a été corrigé. À noter, et c'est structurant : **le Business Brain (B7–B11) est un parcours distinct des six étapes Meta (B1–B6)**, et il n'est pas assemblé dans le prototype.

## 8. États de données et bandeaux système — **À trancher par le propriétaire du projet**

| Source | États de données | Bandeaux |
|---|---|---|
| `HANDOFF_CODEX.md` | plein · vide · erreur | Meta interrompu · consultation · solde faible · synchronisation · maintenance |
| Prototype | plein · vide · retard | configuration · import · consultation · solde faible · Meta interrompu |

Les deux listes se recoupent sans se confondre. **Valeurs contradictoires :** « erreur » contre « retard » comme troisième état de données ; « maintenance » contre « configuration » et « import » dans la file de bandeaux.

Proposition à valider : quatre états de données — **plein · vide · erreur · retard** — et six bandeaux dans cet ordre de priorité : **Meta interrompu · consultation · configuration incomplète · import en cours · solde faible · maintenance**. Un seul bandeau visible à la fois.

## 9. Bleu indigo — **clarification, pas contradiction**

La règle « indigo réservé au contenu produit par l'IA » et le jeton `--ly-perf-learning:#2A3AA3` employé pour le statut « Apprentissage » utilisent bien la même famille chromatique.

**Lecture retenue :** la règle porte sur *ce qui est décidé par une machine plutôt que par l'utilisateur*. La phase d'apprentissage est pilotée par l'algorithme de Meta : elle relève de la même catégorie. Ce n'est donc pas une entorse, mais la règle doit être **réécrite en ces termes** dans `DESIGN_SYSTEM.md`, sinon chaque développeur la relira comme une contradiction.

**Interdit malgré tout :** l'indigo comme couleur décorative, d'accentuation ou de lien.

## 10. Gris et contraste — **tranché : ne jamais porter d'information sur `--ly-text-disabled`**

`tokens.css` est explicite : `--ly-text-disabled:#C0BBB2` est « décoratif uniquement — ne jamais porter de texte utile ». Or certaines prescriptions l'emploient pour les données manquantes (`—`) et les codes d'erreur.

**Décision :**
- donnée manquante, tiret cadratin, mention « non disponible » → `--ly-text-muted:#6E6862` (5,5:1 sur blanc)
- code d'erreur, référence technique → `--ly-text-secondary` en `--ly-font-mono`
- `--ly-text-disabled` → uniquement les bordures et glyphes de contrôles désactivés, jamais un caractère lisible

## 11. Catalogue et jetons — **tranché : `tokens.css` fait autorité**

Certaines valeurs du catalogue de composants diffèrent de `tokens.css`, notamment des bordures sombres, et plusieurs dimensions d'écran n'ont pas de jeton dédié.

**Décision : `tokens.css` gagne** en cas de divergence. Les dimensions structurantes suivantes, relevées dans les maquettes, doivent être **ajoutées au fichier de jetons** — elles sont aujourd'hui codées en dur :

```css
--ly-sidebar-full:240px;    /* barre latérale déployée */
--ly-sidebar-mini:64px;     /* barre latérale réduite */
--ly-panel-detail:640px;    /* panneau de détail C2.2 */
--ly-row-desktop:52px;      /* ligne de tableau 1440 */
--ly-row-tablet:66px;       /* ligne de tableau 768, deux niveaux */
--ly-doc-measure:720px;     /* largeur de ligne des pages légales */
--ly-frame-mobile:375px;
--ly-frame-tablet:768px;
--ly-frame-desktop:1440px;
```

## 12. Lueur des boutons — **À trancher par le propriétaire du projet**

Deux variantes ont été construites et livrées, aucune n'a été choisie :
- **pulsation permanente** — halo en `box-shadow` animée, 2,8 s, en boucle
- **intensification au survol** — halo au repos, renforcé au survol

Les deux sont réglables depuis la barre d'outils du prototype, écran A1. Les deux respectent `prefers-reduced-motion`. **Aucune décision enregistrée.**

## 13. Seuils par défaut des règles automatisées — **À trancher, et module non conçu**

Aucune valeur n'existe. **Et le module lui-même n'a jamais été maquetté** : voir § 14.

---

## 14. Erreurs du handoff précédent, corrigées

Relecture des étiquettes réelles de chaque maquette. Quatre écarts, tous corrigés dans `SCREENS_MANIFEST.csv` :

| Écart | Réalité |
|---|---|
| Le handoff annonçait **C2.1–C2.2**, 2 écrans | Le lot 1 contient **C2.1 à C2.5** : fil, détail, **modale de confirmation à 4 variantes**, **historique réel contre estimé**, **réglages de l'agent** |
| Le handoff annonçait **C7.1–C7.3 · Règles automatisées** | **Ce module n'existe dans aucune maquette.** Il figure au brief et dans la barre de navigation, mais n'a jamais été conçu. Le plus proche est C2.5 · Réglages de l'agent |
| Le handoff annonçait **C10.1–C10.6 · Facturation et paramètres** | Le lot 6 contient **C10.1–C10.3** (Business Brain en consultation : fiche entreprise, produits et offres, historique des modifications) et **C11.1–C11.8** (profil, comptes Meta, abonnement, crédits, facturation, notifications, équipe et accès, suppression de compte) |
| Le handoff décrivait **B7–B11** comme les cinq volets du Business Brain | B7 formulaire · B8 **analyse automatique du site** · B9 récapitulatif · B10 **choix du plan et paiement** · B11 onboarding terminé |

**Total réel : 75 références maquettées**, et non 70. Le décompte précédent comptait un module inexistant et sous-comptait C2 et C11.

---

## 15. Liste unique des questions ouvertes

À trancher par le propriétaire du projet. Aucune ne peut être décidée depuis les sources existantes.

1. **Seuil du bandeau « Solde faible »** — 15 % ou 25 % ?
2. **Lueur des boutons** — pulsation permanente ou intensification au survol ?
3. **Analyse et scan** — deux actions distinctes à 8 et 2 crédits, ou une seule ? Nomenclature définitive ?
4. **Fréquence de surveillance** — la distinction « horaire pour la détection, quotidienne pour l'analyse » est-elle validée ?
5. **États de données** — troisième état « erreur » ou « retard », ou les deux ?
6. **File des bandeaux système** — liste et ordre de priorité définitifs ?
7. **Règles automatisées** — module à concevoir : écrans, seuils par défaut, garde-fou anti-contradiction. Faut-il le maquetter avant le développement, ou C2.5 suffit-il pour la première livraison ?
8. **Plan du compte de démonstration** — aligner la coquille sur Pro 1 012 / 1 500 comme C11.3 ?
9. **Textes juridiques** des quatre documents A7.
10. **Identité légale** — « Lyads SARL », siège à Dakar, `contact@lyads.app`, `noreply@lyads.app` : ces mentions sont du **texte indicatif non confirmé**, à valider ou remplacer.
11. **Preuves commerciales** — témoignages (8 à 10), logos clients, badge partenaire Meta, note et nombre d'avis. Emplacements prévus et marqués, contenu à fournir. Rien n'a été inventé.
