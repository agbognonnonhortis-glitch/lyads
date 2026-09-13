# Lyads — paquet de handoff

Livré le 12 septembre 2026. Destiné à l'intégration Next.js / TypeScript.

## Ordre de lecture

1. **`HANDOFF_CODEX.md`** — le document de référence. 16 sections : pile, jetons, inventaire, coquille, agent, crédits, devises, animations, accessibilité, contenu, sécurité, ordre de réalisation, recette.
2. **`DECISIONS.md`** — à lire avant d'écrire une ligne de code. Les divergences entre sources, ce qui est tranché, et les **11 questions ouvertes** qui appartiennent au propriétaire du projet.
3. **`SCREENS_MANIFEST.csv`** — l'inventaire. Une ligne par référence : fichier, cadre, type de vue, entrée, sortie, formats, états, statut, reste à fournir. **Source de vérité de l'inventaire.**
4. **`INTERACTIONS.md`** — le comportement attendu, référence par référence, et les points ouverts.
5. **`DESIGN_SYSTEM.md`**, **`tokens.css`**, **`tailwind.config.js`** — le système. `tokens.css` fait autorité sur toute valeur.
6. **`CLAUDE.md`** — à copier à la racine du dépôt.

En cas de contradiction : **la maquette gagne sur le document, et `tokens.css` gagne sur le catalogue.**

## Ouvrir les maquettes localement

Les maquettes sont des fichiers HTML autonomes qui chargent un seul fichier local, `support.js`, présent dans le même dossier. **Un double-clic ne suffit pas** : le protocole `file://` bloque le chargement du module. Servez le dossier :

```bash
cd maquettes
python3 -m http.server 8080
# puis http://localhost:8080/
```

Ou avec Node :

```bash
npx serve maquettes
```

### Le prototype, sans rien installer

`Prototype Lyads - autonome.html`, à la racine du paquet : **un seul fichier, tout embarqué, fonctionne hors connexion et par double-clic.** C'est aussi le fichier à déposer sur un hébergement statique pour mettre le prototype en ligne.

## Dépendances externes restantes

| Ressource | Mode de chargement | Dans le fichier autonome |
|---|---|---|
| Figtree, Space Grotesk | Google Fonts, `<link>` | embarquées |
| Phosphor Icons (regular) | CDN unpkg, feuille de style | embarquées |
| React, runtime de gabarit | via `support.js` local | embarqués |

Aucune autre dépendance réseau. **Pour l'intégration**, hébergez les deux familles de police et le jeu d'icônes en local : le produit cible des connexions lentes, et `--ly-font-sans` / `--ly-font-mono` supposent leur présence.

## Ressources graphiques

- **Aucune image bitmap** n'est utilisée : les captures d'interface des pages publiques sont des reconstitutions en HTML des vrais écrans, pas des photos.
- **Emplacements à compléter**, marqués comme tels dans les maquettes et jamais remplis : badge partenaire Meta, logos clients, note et nombre d'avis, 8 à 10 témoignages, photographies de la preuve sociale de A1.
- **Aucun logo Lyads définitif** : le monogramme « L » sur fond `--ly-primary-600` est un substitut.

## Données de démonstration

`DEMO_DATA.json` — le jeu utilisé par le prototype et les maquettes, sous forme réutilisable, avec des relations stables : Business Managers → comptes → campagnes → ensembles → publicités, plus les recommandations et les créatives. Les identifiants sont stables d'un écran à l'autre : une campagne citée dans une recommandation existe dans le gestionnaire, avec les mêmes chiffres.

## Contenu à fournir par le propriétaire

Ces éléments **n'ont pas été inventés** et ne doivent pas l'être :

| Élément | Statut |
|---|---|
| Textes juridiques des 4 documents A7 | gabarit validé, contenu absent |
| Identité légale — « Lyads SARL », siège à Dakar, `contact@lyads.app`, `noreply@lyads.app` | **texte indicatif non confirmé** |
| Témoignages, logos clients, badge Meta, note d'avis | emplacements prévus et marqués |
| Seuils par défaut des règles automatisées | module non conçu |

## Trois listes factuelles

### Fourni et validé

- Le design system complet : `tokens.css`, `tailwind.config.js`, `DESIGN_SYSTEM.md`, catalogue visuel, thèmes clair et sombre
- **75 références d'écran** maquettées, dans 19 fichiers, tous présents dans `maquettes/`
- **17 références assemblées en interaction réelle** dans le prototype : A1, A3 à A7, B1 à B6, C1.1, C2.1, C2.2, C3.1 à C3.3
- Le prototype en fichier autonome, hors connexion, prêt à héberger
- `HANDOFF_CODEX.md`, `SCREENS_MANIFEST.csv`, `INTERACTIONS.md`, `DECISIONS.md`, `DEMO_DATA.json`
- Formats **375, 768 et 1440** conçus ; les règles d'adaptation à **1024** sont écrites dans `INTERACTIONS.md` § 0

### Fourni mais à valider

- Les **11 questions ouvertes** de `DECISIONS.md` § 15 — dont le seuil de solde faible, la variante de lueur, la distinction analyse / scan, la liste et l'ordre des bandeaux
- Les **9 jetons de dimension** proposés en `DECISIONS.md` § 11, à intégrer à `tokens.css`
- La reformulation de la règle sur l'indigo (`DECISIONS.md` § 9)
- Les règles d'adaptation à **1024 px** : déduites des maquettes 768 et 1440, **aucune maquette dédiée**
- L'identité légale et les mentions de contact

### Encore manquant

- **Le module Règles automatisées (C7)** — annoncé au brief et présent dans la barre de navigation, **jamais maquetté**. À cadrer avant développement.
- **L'assemblage en interaction** des 58 références restantes. Elles existent en maquette validée ; le prototype les annonce explicitement comme non assemblées.
- Les textes juridiques, les preuves commerciales et les ressources de marque listés ci-dessus.
- Les fichiers de police et d'icônes en version locale, à récupérer depuis leurs sources officielles.
