# Lyads — règles de design (à respecter dans tout code d'interface)

La source de vérité est `DESIGN_SYSTEM.md` (spec complète) et `tokens.css` (valeurs).
`Lyads Design System.dc.html` est la référence visuelle : l'ouvrir pour lever un doute, ne jamais en copier le code.

## Non négociable

1. **Aucune valeur en dur.** Couleurs, tailles, rayons, ombres, durées viennent de `tokens.css` (ou des utilitaires Tailwind de `tailwind.config.js`). Une valeur absente du système se discute avant d'être ajoutée — on l'ajoute d'abord aux jetons.
2. **Deux familles typographiques, pas une de plus.** Figtree pour l'interface, Space Grotesk pour **toute** valeur numérique et libellé technique, avec `font-variant-numeric: tabular-nums`.
3. **L'indigo `--ly-agent-*` est réservé à l'agent.** Aucun bouton produit, aucun état de performance, aucune série de graphique en indigo. Inversement, un bloc généré par l'agent est toujours sur fond `--ly-agent-50` (clair) / `#171A33` (sombre), avec l'étiquette « Lyads propose ».
4. **Information colorée = couleur + glyphe + mot.** Jamais de statut ou de variation exprimé par la seule couleur. Glyphes imposés : ▲ Performe · ◆ À surveiller · ▼ Sous-performe · ◐ Apprentissage · ■ Budget épuisé · ‖ En pause.
5. **Rien n'est écrit sur un compte publicitaire sans confirmation explicite** de l'utilisateur. L'application automatique est désactivée par défaut. Toute action de l'agent est annulable 7 jours et affiche son coût en crédits.
6. **Cible tactile ≥ 48 px**, focus visible partout (anneau 3 px `--ly-focus-ring`), contraste ≥ 4,5:1 sur le texte et ≥ 3:1 sur les bordures porteuses de sens.
7. **Un seul bouton principal par écran.**
8. **Pas de défilement horizontal.** Le tableau dense n'existe qu'à partir de `lg` (1024) ; en dessous, une carte par ligne.
9. **Une donnée manquante s'affiche `—`**, jamais `0`.
10. **Mode sombre** : l'élévation passe par la couleur de surface, pas par l'ombre. L'action passe en `--ly-primary-300` sur texte sombre — jamais de terracotta 600 sur fond sombre.

## Rédaction (SaaS international)

Registre professionnel et neutre, vocabulaire métier standard (ROAS, CPA, CTR, ensemble de publicités), phrases courtes traduisibles, ni humour ni émoji, vouvoiement systématique en français. Les recommandations sont à l'infinitif avec le montant exact et le nom d'entité entre guillemets.
Nombres, dates et devises suivent la **locale de l'utilisateur** (`Intl.NumberFormat`), jamais celle du compte publicitaire. Aucun libellé de bouton figé en largeur (+35 % en allemand).

## Avant d'ouvrir une PR d'interface

- [ ] Zéro couleur/taille/rayon/ombre codé en dur
- [ ] Mode clair **et** mode sombre vérifiés
- [ ] États couverts : repos, survol, focus clavier, pressé, désactivé, chargement, vide, erreur
- [ ] Testé à 360, 768 et 1280 px de large
- [ ] Chaînes externalisées et traduisibles, aucune concaténation de phrase
- [ ] `prefers-reduced-motion` respecté
