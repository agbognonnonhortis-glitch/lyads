# Lyads — intégration fidèle des sources

L’interface locale affiche directement les cadres HTML des maquettes fournies dans `MAQUETTE ET HANDOFF/maquettes`. Les textes, styles, SVG, polices Figtree / Space Grotesk et icônes Phosphor proviennent des sources, sans redessin. La landing utilise **A1 version 2**.

## Lancer

```bash
npm ci
npm run dev
```

Ouvrir [la landing](http://127.0.0.1:3000/), [le tableau de bord](http://127.0.0.1:3000/app/tableau-de-bord) ou [l’agent](http://127.0.0.1:3000/app/agent).

L’affichage des maquettes ne nécessite aucun compte externe ni fichier `.env`. Rien n’est déployé.

## Raccordement Supabase

Supabase est la base retenue pour Lyads, sur le projet `beplqbktgbizhfcoixoi`. Les clients navigateur et serveur sont préparés dans `src/lib/supabase`. Le client serveur transmet les cookies de session et utilise les droits de l’utilisateur ; aucune clé administrateur n’est utilisée.

Renseigner dans `.env.local` les variables de `.env.example`, dont la clé publique `sb_publishable_…` du projet. Ce fichier est ignoré par Git. Puis exécuter :

```bash
npm run supabase:check
```

Ce contrôle vérifie l’accessibilité d’Auth et de l’API de données avec la clé publique. Pour PostgREST, il demande une relation de diagnostic absente avec `limit=0` : la réponse précise `PGRST205` confirme l’accès au cache de schéma, sans retourner de lignes. Un autre type de 404 reste un échec. Ce contrôle ne prouve pas une lecture de table ni la validité des règles d’accès. Le diagnostic `/api/supabase/status` est disponible en développement uniquement.

État du raccordement : la clé publiable fournie par le propriétaire est configurée dans `.env.local`. Le diagnostic réel réussit pour Auth et PostgREST. Après la liaison de `main` et le push de relance `f43c2c4`, les 12 tables répondent sur le projet principal et refusent l’accès anonyme (HTTP 401, code PostgreSQL `42501`). La recette avec deux véritables sessions Auth reste à réaliser. Les écrans restent ceux des maquettes, sans authentification fonctionnelle ni données Meta réelles à ce stade.

## Vérifier

```bash
npm run source:extract
npm run typecheck
npm test
npm run test:db
npm run build
```

Les tests de fidélité comparent chaque bloc intégré à sa tranche exacte dans le fichier fourni et vérifient les styles, scripts et fichiers de polices/icônes. Le catalogue contient 231 cadres uniques, incluant les variantes et états fournis. Voir [l’inventaire des routes et variantes](docs/fidelity/ROUTES.md).

Le [socle Supabase](docs/BASE_DE_DONNEES.md) comporte 12 tables désormais présentes dans le projet principal et des tests PostgreSQL locaux pour les droits d’accès, les liens entre comptes, les doublons et le journal. Le handoff est une référence frontend uniquement ; le backend suit le cadrage fonctionnel validé.

## Fonctionnement de cette étape

Les liens de navigation sont branchés sur les éléments existants. Les interactions déjà présentes dans les sources (notamment les onglets, devises et animations de la landing et le gestionnaire du prototype) utilisent leur logique d’origine. Les maquettes statiques restent des écrans de démonstration : leur navigation ne réalise aucune opération Meta, paiement, génération IA ou envoi de message.

Les dimensions originales 375, 768 et 1440 sont conservées lorsqu’elles existent. Les panneaux et modales gardent leurs dimensions propres. Aux dimensions intermédiaires, la variante disponible est sélectionnée ; aucune disposition supplémentaire n’est inventée. Les textes d’annotation et emplacements vides présents *dans* les cadres sont eux aussi conservés.

Les pages Contact A8 et Règles C7 n’ont pas de maquette complète exploitable dans les fichiers fournis. Les anciens écrans inventés ne sont plus servis. Les alias légaux affichent uniquement le cadre légal fourni, sans rédaction juridique ajoutée.

## Code actif

- `src/app/[[...slug]]/route.ts` : routes HTML locales.
- `src/lib/source/render.ts` : assemblage des sources et sélection de la variante.
- `src/lib/source/catalog.json` : cadres extraits, provenance, empreintes et offsets.
- `scripts/fidelity/build.py` : extraction reproductible, sans transformation visuelle.
- `public/source/` : styles, polices, icônes et moteur fournis, plus `bridge.js` pour la navigation.
- `tests/fidelity.test.ts` : vérifications d’intégrité.

Les anciens composants personnalisés dans `src/components`, styles dans `src/styles` et simulateur Zustand sont conservés comme code antérieur, mais ne participent plus aux pages servies. Leurs tests métier ne prouvent pas le fonctionnement de l’interface actuelle. Les précédentes affirmations de couverture fonctionnelle sont remplacées par cette description.
