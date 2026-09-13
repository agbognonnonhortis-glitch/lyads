import { writeFileSync } from "node:fs";
import { screens } from "../../src/lib/screens";
import { catalog } from "../../src/lib/source/render";
let output =
  "# Routes et cadres fournis\n\nCe document est un inventaire de vérification, extérieur à l’interface produit. Les liens de variante affichent le cadre exact sélectionné.\n\n";
for (const [ref, entry] of Object.entries(catalog)) {
  const screen = screens.find((s) => s.ref === ref);
  const path = screen?.path ?? "/confirmation-envoi";
  output += `## ${ref} — ${screen?.title ?? "Confirmation d’envoi"}\n\n[Ouvrir](http://127.0.0.1:3000${path})\n\n`;
  for (const frame of entry.frames)
    output += `- [${frame.width} px — ${frame.label || ref}](http://127.0.0.1:3000${path}?view=${frame.id}) — ${frame.source}:${frame.line}\n`;
  output += "\n";
}
writeFileSync("docs/fidelity/ROUTES.md", output);
