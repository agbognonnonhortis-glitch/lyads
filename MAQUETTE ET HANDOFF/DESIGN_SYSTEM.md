# Lyads — Design System v1.0

Direction retenue : **« Terrain — argile & lumière »**.
Ce document est **normatif**. Toute valeur absente d'ici doit être ajoutée ici avant d'être utilisée dans le code.

Référence visuelle : `Lyads Design System.dc.html` (ouvrir dans un navigateur).
Ce fichier HTML est une **référence de design**, pas du code de production : il ne doit pas être copié tel quel. L'implémentation se fait dans l'environnement existant du projet (React/Vue/Svelte/native…), avec ses conventions.

Fidélité : **haute (hifi)**. Couleurs, typographie, espacements et états sont définitifs et doivent être respectés au pixel près.

---

## 1. Principes

1. **Une décision par écran** — une seule action principale par vue ; le reste est secondaire ou différé.
2. **Lisible au soleil** — contraste ≥ 4,5:1 sur tout texte, ≥ 3:1 sur les éléments non textuels. Jamais de gris clair sur blanc.
3. **L'agent propose, l'humain valide** — aucune écriture sur un compte publicitaire sans confirmation explicite. L'indigo signale toujours l'agent.
4. **Le pouce d'abord** — cible tactile minimale 48 px, actions en bas d'écran sur mobile, jamais de défilement horizontal.

---

## 2. Couleur

### 2.1 Primaire « Argile » — `--ly-primary-*`

| Palier | Hex | Usage |
|---|---|---|
| 50 | `#FDF5F1` | fond de survol de ligne |
| 100 | `#FAE8DF` | fond d'accent léger |
| 200 | `#F4CDBB` | anneau de focus, séries de graphique claires |
| 300 | `#EBAA8D` | **action en mode sombre** |
| 400 | `#DF815B` | graphiques |
| 500 | `#CE5F35` | graphiques, survol de séries |
| 600 | `#B44A26` | **action par défaut (mode clair)** — 4,9:1 sur blanc |
| 700 | `#94391D` | survol de l'action |
| 800 | `#74301C` | état pressé |
| 900 | `#5D2A1B` | séries de graphique sombres |
| 950 | `#33150C` | texte sur fond primary-300 |

### 2.2 Neutres « Sable » — `--ly-neutral-*` (chauds, jamais gris pur)

| Palier | Hex | Usage |
|---|---|---|
| 0 | `#FFFFFF` | surface claire |
| 50 | `#FBF9F6` | surface creusée, en-tête de tableau |
| 100 | `#F4F1EB` | fond de page clair |
| 200 | `#E8E3D9` | bordure claire, piste de progression |
| 300 | `#D6CFC2` | bordure forte, contour de bouton secondaire |
| 400 | `#A9A196` | texte désactivé, placeholder |
| 500 | `#6E6862` | texte discret — 5,5:1 sur blanc, 4,9:1 sur `neutral-100` |
| 600 | `#5C564E` | texte secondaire |
| 700 | `#423D37` | corps de texte |
| 800 | `#2C2925` | titres secondaires |
| 900 | `#1B1916` | **surface sombre**, texte principal clair |
| 950 | `#0F0E0C` | fond de page sombre |

Surfaces en mode sombre : fond `#0F0E0C` · surface `#1B1916` · surface haute `#262320` · bordure `#35312B` · bordure forte `#6A6357`.

### 2.3 Sémantique

| Rôle | Clair (texte) | Clair (fond) | Sombre (texte) | Sombre (fond) |
|---|---|---|---|---|
| Succès / secondaire | `#146B4A` | `#E3F0EA` | `#6FD3A6` | `#12352A` |
| Avertissement | `#8F5F08` (fond de pastille, texte blanc 5,5:1) · `#7A5208` (texte sur `#F8EDD8`, 5,9:1) | `#F8EDD8` | `#E7B54B` | `#33260B` |
| Erreur / destructif | `#C0311F` | `#FBE9E6` | `#F07064` | `#3A1512` |
| Information | `#3B4FD1` | `#EDEFFC` | `#8E9BF0` | `#171A33` |

### 2.4 Agent — `--ly-agent-*` (seule famille froide du système)

`50 #EDEFFC` · `200 #C4CAF5` · `300 #8E9BF0` · `500 #3B4FD1` ★ · `700 #2A3AA3` · `900 #1A2470`

**Règle stricte** : l'indigo est interdit hors contexte agent — aucun bouton produit, aucun état de performance, aucune série de graphique.
Tout bloc produit par l'agent est posé sur `agent-50` avec liseré `agent-200` (clair), ou fond `#171A33` avec liseré `#2E3675` (sombre).

### 2.5 Performance — `--ly-perf-*`

Toujours **couleur + glyphe + mot**, jamais la couleur seule.

| Jeton | Libellé | Glyphe | Clair | Sombre | Règle métier |
|---|---|---|---|---|---|
| `perf-good` | Performe | ▲ | texte `#FFFFFF` / fond `#146B4A` | texte `#6FD3A6` / fond `#12352A` | ROAS ≥ seuil |
| `perf-watch` | À surveiller | ◆ | `#FFFFFF` / `#8F5F08` | `#E7B54B` / `#33260B` | 0,8× – 1× seuil |
| `perf-bad` | Sous-performe | ▼ | `#FFFFFF` / `#C0311F` | `#F07064` / `#3A1512` | < 0,8× seuil |
| `perf-learning` | Apprentissage | ◐ | `#2A3AA3` / `#EDEFFC` | `#8E9BF0` / `#171A33` | < 50 conversions |
| `perf-depleted` | Budget épuisé | ■ | `#423D37` / `#E8E3D9` | `#D6CFC2` / `#35312B` | budget consommé |
| `perf-paused` | En pause | ‖ | `#5C564E` / contour tireté 1,5 px `#A9A196` | `#A9A196` / contour tireté `#5C564E` | diffusion arrêtée |

Pastille : `padding 5px 10px`, `border-radius 999px`, `font 700 11px/1.2 Figtree`, `white-space: nowrap`.

---

## 3. Typographie

**Figtree** — interface et titres (400/500/600/700/800).
**Space Grotesk** — toute valeur numérique et tout libellé technique (500/600/700), toujours `font-variant-numeric: tabular-nums`.

| Jeton | Taille / interligne | Graisse | Interlettrage |
|---|---|---|---|
| `display` | 34 / 1.15 | 800 | −0,02em |
| `title` | 26 / 1.25 | 700 | 0 |
| `heading` | 19 / 1.35 | 700 | 0 |
| `body` | 16 / 1.65 | 400 | 0 |
| `body-sm` | 14 / 1.55 | 400 | 0 |
| `label` | 13 / 1.3 | 600 | 0 |
| `caption` | 12 / 1.45 | 400 | 0 |
| `mono-label` | 11 / 1.3 | 500 | +0,14em, majuscules |

Chiffres : `num-hero` 38/700 · `num-lg` 30/700 · `num-md` 20/700 · `num-sm` 14/500 — Space Grotesk, tabulaires, alignés à droite en tableau.

Formatage : suit la **locale de l'utilisateur**, jamais celle du compte publicitaire (`Intl.NumberFormat`).
fr-FR : séparateur de milliers = espace insécable fine, décimale = virgule, devise en suffixe (`1 245 800 FCFA`).
Au-delà de 7 chiffres : abréger (`1,25 M`). Ratios à 2 décimales, pourcentages à 1.

**Interdit** : exprimer une variation par la seule couleur du texte. Toujours pastille + glyphe + valeur.

**Le gris le plus clair admis pour du texte est `neutral-500 #6E6862`.** `neutral-400 #A9A196` est décoratif (bordures tiretées, pictogrammes de remplissage, squelettes) : il ne porte jamais de texte utile — ni un tiret cadratin de donnée manquante, ni un code d’erreur. Un ratio de contraste se vérifie contre la surface réelle, pas contre le blanc : un gris valide sur `#FFFFFF` peut échouer sur `neutral-100`.

---

## 4. Échelles

- **Espacement** — 4 · 8 · 12 · 16 · 24 · 32 · 40 · 48 · 64 · 80. Base 4. Gouttière de page 20 (mobile) / 32 (desktop). Écart intra-carte 12, inter-carte 16.
- **Rayons** — `sm 6` (pastilles internes) · `md 10` (boutons, champs) · `lg 14` (cartes) · `xl 20` (feuilles, modales) · `pill 999`. Jamais d'angle vif.
- **Élévation** — `e0` aucune · `e1 0 1px 2px rgba(45,35,25,.06)` · `e2 0 2px 8px rgba(45,35,25,.10)` · `e3 0 8px 24px rgba(45,35,25,.14)`. En mode sombre, l'élévation passe par la surface, pas par l'ombre.
- **Mouvement** — `fast 140ms` · `base 200ms` · `slow 320ms`, `cubic-bezier(.16,1,.3,1)`. Respecter `prefers-reduced-motion`.
- **Focus** — anneau 3 px `primary-200` + bordure `primary-600`. Visible sur tout élément interactif.
- **Icônes** — Phosphor, style **regular** (duotone et fill interdits). Échelle à 6 pas : **13** glyphe en ligne dans le texte et les pastilles · **16** pictogramme de contrôle (caret, horloge, croix) · **20** navigation déployée et actions d’en-tête · **22** rail réduit et barre d’onglets · **24** en-tête de bloc et alerte · **30** état vide. Trait 2 px, jamais mises à l’échelle par `transform` — on change de pas. Une icône ne porte jamais seule un sens.
- **Points de rupture** — sm 360 · md 768 · lg 1024 · xl 1280 · 2xl 1600. Le tableau dense n'apparaît qu'à partir de `lg`. Largeur maximale de contenu 1280, centrée.

---

## 5. Composants

### 5.1 Boutons
Hauteur 48 (md) · 40 (sm) · 56 (lg, pleine largeur mobile). Rayon 10. `font 700 15px/1 Figtree` (600 pour secondaire/discret).
Un seul bouton principal par écran. En chargement : largeur conservée, bouton désactivé, libellé au participe présent.

| Famille | Repos | Survol | Pressé | Désactivé |
|---|---|---|---|---|
| Principal | fond `#B44A26`, texte `#FFF` | `#94391D` | `#74301C` + `scale(.98)` | fond `#E8E3D9`, texte `#A9A196` |
| Secondaire | fond `#FFF`, contour 1,5 px `#D6CFC2`, texte `#2C2925` | fond `#FBF9F6`, contour `#A9A196` | fond `#F4F1EB`, contour `#7D766C` + `scale(.98)` | contour `#E8E3D9`, texte `#C0BBB2` |
| Agent | fond `#3B4FD1`, texte `#FFF` | `#2A3AA3` | `#1A2470` + `scale(.98)` | fond `#EDEFFC`, texte `#8E9BF0` |
| Discret | sans fond, texte `#5C564E` | fond `#F4F1EB` | fond `#E8E3D9` + `scale(.98)` | texte `#C0BBB2` |
| Destructif | fond `#FFF`, contour 1,5 px `#C0311F`, texte `#C0311F` | fond `#FBE9E6`, contour `#A0281A` | fond plein `#C0311F`, texte `#FFF` | contour `#E8E3D9`, texte `#C0BBB2` |

Mode sombre : Principal = fond `#EBAA8D` / texte `#33150C` · Secondaire = contour `#6A6357` / texte `#D6CFC2` · Agent = fond `#8E9BF0` / texte `#0F0E0C` · Désactivé = fond `#35312B` / texte `#7D766C`.

### 5.2 Saisie
Hauteur 48, rayon 10, bordure 1,5 px `#D6CFC2`. **Libellé toujours au-dessus, jamais en placeholder.**
Focus : bordure `#B44A26` + anneau 3 px `#F4CDBB`. Erreur : bordure `#C0311F` + message `600 12px` en `#8E2317`, explicite et actionnable.
Placeholder en `neutral-500 #6E6862` — c’est du texte utile, jamais `neutral-400`. Désactivé : fond `#FBF9F6`, bordure `#E8E3D9` — **la raison est toujours écrite** sous le champ.
Segments de période : pilules, un seul actif (fond `#2C2925`, texte blanc), inactifs en contour `#D6CFC2`.
Interrupteur : 44 × 26, pastille 20. Actif `#146B4A`, inactif `#D6CFC2`. **L'application automatique est désactivée par défaut, sans exception.**

### 5.3 Carte de métrique
Surface `#FFF`, bordure `#E8E3D9`, rayon 14, padding 20, ombre `e1`, écart interne 12.
Structure : libellé (`label`) → valeur (`num-lg`, Space Grotesk, + unité 15/600 en `#7D766C`) → pastille de variation → contexte (`caption`) → micro-barres (hauteur 32, gap 4, rayon 3, dégradé `primary-200 → primary-600`).
**Une carte = une métrique + une comparaison + une micro-tendance.** Jamais deux chiffres de même taille dans une même carte.
Chargement : blocs `#E8E3D9`, opacité 100 → 60 %, 900 ms. Vide : tiret cadratin `—` en `#A9A196` + phrase d'explication.

### 5.4 Carte de recommandation (agent) — 4 états de cycle de vie

**Proposée** — fond `agent-50 #EDEFFC`, bordure `#C4CAF5`, rayon 16, padding 20.
En-tête : pastille « Lyads propose » (fond `#3B4FD1`, texte blanc) + pastille de priorité (`#C0311F`) à gauche ; bloc Fiabilité à droite (libellé `mono 10/500`, valeur `700 14` colorée par niveau).
Titre `700 21/1.35`, corps `400 15/1.6`.
Trois tuiles blanches rayon 10 : ROAS actuel (`#C0311F`) / ROAS projeté (`#0E4E36`) / Gain estimé 30 j (`#1B1916`).
Actions : bouton agent principal + secondaire + discret. Pied de carte : « Aucune modification ne sera appliquée sans votre confirmation · analyse : N crédits ».

**En cours** — même fond agent, barre de progression `#3B4FD1` sur piste `#C4CAF5`, compteur d'actifs, mention « annulable ».
**Appliquée** — fond `#E3F0EA`, bordure `#A9D3BF`, date d'application, résultat mesuré, lien « Annuler ce changement ».
**Écartée** — fond `#FBF9F6`, opacité .85, titre barré, délai de non-répétition, lien « Rétablir ».

### 5.5 Tableau de campagnes (≥ lg)
Rangée 52 px, en-tête `#FBF9F6` `600 12px`, bordure de rangée `#F4F1EB`, rayon d'enveloppe 14.
Colonnes : `2.2fr 1fr .9fr 1fr 1.5fr` — Campagne (`700 14`), Dépense, ROAS, CPA (Space Grotesk `500 14`, alignés à droite, tabulaires), État (pastille de performance).
Tri par défaut : dépense décroissante. Lignes alternées `neutral-50`, survol `primary-50`, sélection par bordure gauche 3 px `primary-600`.
**Une donnée manquante n'est jamais affichée « 0 » — toujours un tiret cadratin `—` en `#A9A196`.**

**< lg** : une carte par ligne, jamais de défilement horizontal. Titre + pastille d'état sur la première ligne, trois métriques maximum sur la seconde, la quatrième au dépliage.

### 5.6 Barre d'action mobile
Collée en bas, surface `#FFF`, rayon 14, ombre `0 -2px 8px rgba(45,35,25,.10)`, padding 12.
Action principale en `flex:1` hauteur 56 ; actions secondaires réduites à une icône 48 × 48.

### 5.7 Messages, états vides et erreurs
Bandeaux : fond sémantique, rayon 12, padding 14/16, titre `700 14` + corps `400 13/1.5`. Le glyphe de performance préfixe le titre.
État vide : contour tireté 1,5 px `#D6CFC2`, fond `#FBF9F6`, rayon 14, padding 28 — titre `heading`, explication `body`, une seule action.
Erreur : dire **ce qui a échoué**, puis **ce qui n'a pas bougé**. Code d'erreur copiable en `mono 11` `#A9A196`.

---

## 6. Règles de l'agent

1. **Toujours attribuable** — tout contenu généré porte « Lyads propose » ou « Écrit par Lyads », sur fond `agent-50`. Aucun texte d'agent ne se fond dans l'interface produit.
2. **Fiabilité en clair** — trois niveaux : Élevée (≥ 80 %, `#0E4E36`), Moyenne (50–79 %, `#7A5208`), Faible (< 50 %, `#8E2317`). Sous 50 %, l'agent affiche une **observation**, jamais une action à valider.
3. **Réversible et chiffré** — chaque action indique son coût en crédits, le nombre d'actifs impactés, et reste annulable pendant 7 jours. L'écran de confirmation liste toujours l'avant / après.

---

## 7. Rédaction (SaaS international)

Chaque chaîne est écrite pour être traduite : registre professionnel et neutre, vocabulaire métier standard, phrases courtes sans idiome ni familiarité locale. La pédagogie vit dans les infobulles et l'aide, pas dans les libellés.

| On dit | On ne dit pas | Pourquoi |
|---|---|---|
| ROAS sous le seuil de rentabilité | Ça coûte plus que ça ne rapporte | Vocabulaire métier identique partout : ROAS, CPA, CTR, ensemble de publicités. L'utilisateur doit retrouver les termes de son gestionnaire de publicités. |
| Réallouer 180 000 FCFA vers « Retargeting 30 j » | Déplacez l'argent vers vos anciens visiteurs | Infinitif, montant exact, nom d'entité entre guillemets. La formulation directe traduit mal. |
| Impossible de récupérer les performances. Aucun budget n'a été modifié. | Oups ! Quelque chose s'est mal passé 😅 | On parle d'argent : ni humour ni émoji. Deux phrases courtes, traduisibles sans perte. |
| Aucune modification ne sera appliquée sans votre confirmation | Lyads s'occupe de tout | La confiance se gagne en énonçant la limite du pouvoir de l'agent. Vouvoiement systématique en français. |
| `1 245 800 FCFA` · `$12,458.00` · `12 458,00 €` | Un format unique pour toutes les langues | Nombres, dates et devises suivent la locale de l'utilisateur. Prévoir +35 % de longueur en allemand : aucun libellé de bouton figé en largeur. |

---

## 8. Accessibilité

- Contraste ≥ 4,5:1 sur le texte, ≥ 3:1 sur bordures et icônes porteuses de sens — **mesuré contre la surface réelle** (`neutral-100` et `neutral-50` sont plus sombres que le blanc et réduisent tous les ratios d’environ 12 %).
- Focus visible partout (anneau 3 px), ordre de tabulation logique, pas de piège au clavier.
- Cible tactile ≥ 48 × 48 px, écart minimal 8 px entre deux cibles.
- Double codage systématique de l'information colorée (couleur + glyphe + mot).
- `prefers-reduced-motion` : supprimer transitions et animations décoratives, conserver les changements d'état instantanés.
- Libellés de champs liés par `for`/`id` ; messages d'erreur annoncés en `aria-live="polite"`.
