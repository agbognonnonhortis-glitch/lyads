"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp, Report, accounts } from "@/lib/store";
import { route } from "@/lib/screens";
import { campaignTotals, money, ratio } from "@/lib/domain";
import {
  Button,
  Go,
  Card,
  Field,
  Select,
  Heading,
  Badge,
  AgentBox,
  Empty,
  Chart,
  Toggle,
  Alert,
  download,
} from "./ui";
import { DataState } from "./dashboard";
const blocks = [
  "Synthèse",
  "Indicateurs",
  "Campagnes",
  "Créatives",
  "Recommandations",
];
export function ReportPaper({ report }: { report: Report }) {
  const s = useApp();
  const cs = s.campaigns.filter(
      (c) => c.accountId === (report.accountId ?? "act_2841"),
    ),
    totals = campaignTotals(cs),
    currency = accounts.find((a) => a.id === report.accountId)?.devise ?? "XOF";
  return (
    <article className="report-paper">
      <div className="row between">
        <strong>{report.brand}</strong>
        <Badge>Rapport de démonstration</Badge>
      </div>
      <h1>{report.name}</h1>
      <p className="muted">{report.period} · données fictives</p>
      {report.blocks.map((b) => (
        <section key={b}>
          <h2>{b}</h2>
          {b === "Synthèse" ? (
            <p>
              Votre compte a dépensé {money(totals.spend, currency)} pour{" "}
              {totals.purchases} achats attribués. Examinez les écarts de coût
              par résultat avant de réallouer votre budget.
            </p>
          ) : b === "Indicateurs" ? (
            <>
              <div className="grid3">
                <div>
                  <small>Dépenses</small>
                  <h2 className="num">{money(totals.spend, currency)}</h2>
                </div>
                <div>
                  <small>Achats</small>
                  <h2 className="num">{totals.purchases}</h2>
                </div>
                <div>
                  <small>ROAS</small>
                  <h2 className="num">{ratio(totals.roas)}</h2>
                </div>
              </div>
              <Chart />
            </>
          ) : b === "Campagnes" ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Campagne</th>
                    <th>Dépenses</th>
                    <th>ROAS</th>
                  </tr>
                </thead>
                <tbody>
                  {cs.map((c) => (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td className="num">{money(c.spend, currency)}</td>
                      <td className="num">{ratio(c.roas)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : b === "Créatives" ? (
            <p>
              Les signaux de fatigue et les variantes sont consultables dans
              l’analyse créative. Priorité : renouveler les publicités dont la
              fréquence est élevée.
            </p>
          ) : (
            <p>
              Conserver le budget global, examiner les campagnes interrompues et
              préparer des variantes. Toute action nécessite une validation.
            </p>
          )}
        </section>
      ))}
      <section>
        <small>
          Généré avec Lyads · intégration locale · aucun résultat réel
        </small>
      </section>
    </article>
  );
}
export function Reports({
  refId,
  publicId,
}: {
  refId: string;
  publicId?: string;
}) {
  const s = useApp(),
    router = useRouter(),
    n = Number(refId.split(".")[1]);
  const r = publicId
    ? s.reports.find((r) => r.id === publicId)
    : (s.reports.find((r) => r.id === s.selectedReport) ?? s.reports[0]);
  const [newName, setNewName] = useState("Nouveau rapport"),
    [busy, setBusy] = useState(false);
  const update = (p: Partial<Report>) => {
    if (r)
      s.patch({
        reports: s.reports.map((x) => (x.id === r.id ? { ...x, ...p } : x)),
      });
  };
  const create = (name: string, selectedBlocks = blocks) => {
    const report: Report = {
      accountId: s.accountId,
      id: crypto.randomUUID(),
      name,
      period: "30 derniers jours",
      brand: s.brain.company,
      blocks: selectedBlocks,
      shared: false,
      revoked: false,
      expiresAt: null,
      schedule: "Jamais",
    };
    s.patch({ reports: [report, ...s.reports], selectedReport: report.id });
    router.push(route("C9.2"));
  };
  const generate = async () => {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 600));
    if (s.charge(3, "Synthèse de rapport"))
      s.notify("Synthèse de démonstration actualisée");
    setBusy(false);
  };
  if (n === 5)
    return (
      <div className="public-page">
        <div className="public-nav">
          <strong>Lyads · Rapport partagé</strong>
        </div>
        {!r || !r.shared || r.revoked ? (
          <div className="legal">
            <Empty
              title="Ce lien de partage est désactivé"
              description="Le propriétaire peut activer un nouveau lien depuis les paramètres de partage."
            />
          </div>
        ) : r.expiresAt && r.expiresAt < Date.now() ? (
          <div className="legal">
            <Empty
              title="Ce lien a expiré"
              description="Demandez un nouveau lien au propriétaire du rapport."
            />
          </div>
        ) : (
          <div className="public-section stack">
            <Alert tone="info">
              Aperçu public local : ce lien fonctionne uniquement sur cette
              machine et dans ce navigateur.
            </Alert>
            <div>
              <Button variant="secondary" onClick={() => window.print()}>
                Imprimer / enregistrer en PDF
              </Button>
            </div>
            <ReportPaper report={r} />
          </div>
        )}
      </div>
    );
  return (
    <>
      <Heading
        eyebrow="Rapports"
        title={
          [
            "",
            "Vos rapports",
            "Éditeur de rapport",
            "Modèles de rapports",
            "Partager le rapport",
          ][n]
        }
        description="Composez vos bilans et préparez leur diffusion. La planification est enregistrée sans envoi automatique."
        action={
          <Button onClick={() => create("Bilan — " + s.brain.company)}>
            Nouveau rapport
          </Button>
        }
      />
      {n === 1 && (
        <DataState>
          {s.reports.length ? (
            <div className="grid3">
              {s.reports.map((x) => (
                <Card key={x.id}>
                  <div className="stack">
                    <Badge tone={x.shared && !x.revoked ? "good" : "neutral"}>
                      {x.shared && !x.revoked ? "Partage activé" : "Brouillon"}
                    </Badge>
                    <h2>{x.name}</h2>
                    <p className="muted">
                      {x.period} · {x.blocks.length} sections
                    </p>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        s.patch({ selectedReport: x.id });
                        router.push(route("C9.2"));
                      }}
                    >
                      Ouvrir le rapport
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Empty />
          )}
        </DataState>
      )}
      {n === 2 && r && (
        <div className="stack">
          <Card>
            <div className="grid3">
              <Field
                label="Titre du rapport"
                value={r.name}
                onChange={(e) => update({ name: e.target.value })}
              />
              <Field
                label="Marque du client"
                value={r.brand}
                onChange={(e) => update({ brand: e.target.value })}
              />
              <Select
                label="Période"
                value={r.period}
                onChange={(e) => update({ period: e.target.value })}
              >
                {["7 derniers jours", "30 derniers jours", "Ce mois"].map(
                  (x) => (
                    <option key={x}>{x}</option>
                  ),
                )}
              </Select>
            </div>
          </Card>
          <div className="report-editor">
            <Card>
              <div className="stack tight">
                <h3>Sections</h3>
                {blocks.map((b) => (
                  <label className="check-row" key={b}>
                    <input
                      type="checkbox"
                      checked={r.blocks.includes(b)}
                      onChange={() =>
                        update({
                          blocks: r.blocks.includes(b)
                            ? r.blocks.filter((x) => x !== b)
                            : [...r.blocks, b],
                        })
                      }
                    />
                    {b}
                  </label>
                ))}
                <h3>Ordre</h3>
                {r.blocks.map((b, i) => (
                  <div className="row" key={b}>
                    <small className="grow">{b}</small>
                    <Button
                      className="small"
                      variant="ghost"
                      disabled={i === 0}
                      aria-label={"Monter " + b}
                      onClick={() => {
                        const arr = [...r.blocks];
                        [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
                        update({ blocks: arr });
                      }}
                    >
                      ↑
                    </Button>
                  </div>
                ))}
                <Button disabled={busy} onClick={generate}>
                  {busy ? "Génération…" : "Synthèse · 3 crédits"}
                </Button>
                <Go to="C9.4">Partager</Go>
                <Button variant="secondary" onClick={() => window.print()}>
                  Imprimer / PDF
                </Button>
                <Button
                  variant="ghost"
                  onClick={() =>
                    download(
                      "rapport-lyads.json",
                      JSON.stringify(r, null, 2),
                      "application/json",
                    )
                  }
                >
                  Exporter la structure
                </Button>
                <small>Modifications enregistrées automatiquement.</small>
              </div>
            </Card>
            <ReportPaper report={r} />
          </div>
        </div>
      )}
      {n === 3 && (
        <>
          <div className="grid3">
            {[
              ["Bilan mensuel", blocks],
              ["Rapport créatif", ["Synthèse", "Créatives", "Recommandations"]],
              ["Synthèse dirigeant", ["Synthèse", "Indicateurs"]],
            ].map(([name, b]) => (
              <Card key={String(name)}>
                <div className="stack">
                  <Badge>Modèle Lyads</Badge>
                  <h2>{name}</h2>
                  <p className="muted">{(b as string[]).join(" · ")}</p>
                  <Button onClick={() => create(String(name), b as string[])}>
                    Utiliser ce modèle
                  </Button>
                </div>
              </Card>
            ))}
          </div>
          <Card>
            <form
              className="row wrap"
              onSubmit={(e) => {
                e.preventDefault();
                if (newName.trim()) create(newName, []);
              }}
            >
              <Field
                label="Rapport vierge"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />
              <Button>Créer</Button>
            </form>
          </Card>
        </>
      )}
      {n === 4 && r && (
        <div className="detail-width stack">
          <Card>
            <div className="stack">
              <h2>{r.name}</h2>
              <div className="row between">
                <div>
                  <h3>Activer le lien public</h3>
                  <small>Simulation de partage sur cet ordinateur.</small>
                </div>
                <Toggle
                  checked={r.shared && !r.revoked}
                  label="Activer le partage"
                  onChange={() => update({ shared: !r.shared, revoked: false })}
                />
              </div>
              <Field
                label="Lien d’aperçu local"
                readOnly
                value={
                  typeof window === "undefined"
                    ? "/rapport/demo"
                    : window.location.origin + "/rapport/demo?id=" + r.id
                }
              />
              <div className="row wrap">
                <Button
                  variant="secondary"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(
                        window.location.origin + "/rapport/demo?id=" + r.id,
                      );
                      s.notify("Lien local copié");
                    } catch {
                      s.notify("Copiez le lien affiché ci-dessus.");
                    }
                  }}
                >
                  Copier le lien
                </Button>
                <Go to={"/rapport/demo?id=" + r.id}>Voir la page publique</Go>
              </div>
              <Select
                label="Expiration du lien"
                value={
                  r.expiresAt === null
                    ? "Jamais"
                    : r.expiresAt < Date.now()
                      ? "Expiré"
                      : "7 jours"
                }
                onChange={(e) =>
                  update({
                    expiresAt:
                      e.target.value === "Jamais"
                        ? null
                        : e.target.value === "Expiré"
                          ? Date.now() - 1000
                          : Date.now() + 7 * 86400000,
                  })
                }
              >
                {["Jamais", "7 jours", "Expiré"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </Select>
              <Select
                label="Préférence de planification (simulation)"
                value={r.schedule}
                onChange={(e) => update({ schedule: e.target.value })}
              >
                {["Jamais", "Chaque lundi", "Premier du mois"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </Select>
              <Button
                variant="danger"
                disabled={!r.shared || r.revoked}
                onClick={() => {
                  update({ revoked: true, shared: false });
                  s.notify("Lien révoqué");
                }}
              >
                Révoquer le lien
              </Button>
            </div>
          </Card>
          <AgentBox>
            Le rapport partagé présente uniquement le contenu du bilan. Les
            invitations et les envois réels seront raccordés lors de l’étape
            fonctionnelle.
          </AgentBox>
        </div>
      )}
    </>
  );
}
