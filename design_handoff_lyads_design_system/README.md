# Handoff — Lyads Design System v1.0

## Ce que contient ce dossier

| Fichier | Rôle |
|---|---|
| `CLAUDE.md` | **À copier à la racine du dépôt.** Règles courtes et non négociables, lues automatiquement par l'outil de codage à chaque conversation. |
| `DESIGN_SYSTEM.md` | Spécification complète : couleur, typographie, échelles, composants, états, règles de l'agent, rédaction, accessibilité. |
| `tokens.css` | Jetons canoniques en variables CSS, avec bascule `[data-theme="dark"]`. **Source de vérité des valeurs.** |
| `tailwind.config.js` | Configuration Tailwind équivalente. Les rôles (`surface`, `border`, `ink`, `action`) pointent vers les variables CSS pour que le mode sombre soit automatique. |
| `Lyads Design System.dc.html` | Référence visuelle. À ouvrir dans un navigateur pour lever un doute. |

## Comment l'installer

1. Copier `tokens.css` dans le projet (par exemple `src/styles/tokens.css`) et l'importer **avant** toute autre feuille de style.
2. Charger les deux polices — Figtree (400/500/600/700/800) et Space Grotesk (500/600/700) — via Google Fonts ou en auto-hébergé.
3. Si le projet utilise Tailwind : fusionner `tailwind.config.js` dans la configuration existante.
4. Copier `CLAUDE.md` à la racine du dépôt et `DESIGN_SYSTEM.md` dans `docs/` (ou `.claude/`).
5. Basculer le thème via `document.documentElement.dataset.theme = 'dark' | 'light'`.

## Comment le faire respecter par l'outil de codage

`CLAUDE.md` à la racine est lu à chaque session : c'est ce qui garantit l'application des règles sans avoir à les répéter. Pour un travail d'interface, ouvrir la conversation par :

> Respecte `CLAUDE.md` et `docs/DESIGN_SYSTEM.md`. Utilise uniquement les jetons de `tokens.css` — aucune valeur codée en dur. Implémente [écran] en couvrant tous les états (repos, survol, focus, pressé, désactivé, chargement, vide, erreur) en mode clair et sombre.

Les autres outils lisent des fichiers équivalents : renommer `CLAUDE.md` en `.cursorrules` (Cursor), `.windsurfrules` (Windsurf), ou `.github/copilot-instructions.md` (Copilot). Le contenu reste identique.

## Statut

Fidélité **haute** : les valeurs sont définitives et doivent être respectées au pixel près.
Les fichiers HTML sont des **références de design**, pas du code de production — l'implémentation se fait dans l'environnement existant du projet, avec ses conventions.

## À compléter dans une phase ultérieure

Navigation (barre latérale, en-tête, onglets), modales et feuilles mobiles, parcours d'onboarding, notifications, graphiques détaillés. Ces composants ne sont pas encore spécifiés : les ajouter au système avant de les coder.
