"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkle,
  ArrowRight,
  CheckCircle,
  ClockCounterClockwise,
  SlidersHorizontal,
  ArrowClockwise,
} from "@phosphor-icons/react";
import { useApp, accounts } from "@/lib/store";
import { Screen, route } from "@/lib/screens";
import { budgetChanges, money, ratio, undoAllowed } from "@/lib/domain";
import {
  Card,
  Button,
  Go,
  Heading,
  Badge,
  AgentBox,
  Field,
  Select,
  Alert,
  Empty,
  Progress,
  Toggle,
} from "./ui";
import { DataState } from "./dashboard";
export function Agent({ screen }: { screen: Screen }) {
  const s = useApp(),
    router = useRouter();
  const [severity, setSeverity] = useState("Toutes"),
    [busy, setBusy] = useState(false);
  const rs = s.recommendations.filter((r) => r.accountId === s.accountId);
  const pending = rs.filter((r) => r.status === "pending");
  const r = rs.find((r) => r.id === s.selectedReco) ?? pending[0] ?? rs[0];
  const currency = accounts.find((a) => a.id === s.accountId)?.devise ?? "XOF";
  const open = (id: string) => {
    s.patch({ selectedReco: id });
    router.push(route("C2.2"));
  };
  if (screen.ref === "C2.5")
    return (
      <div className="detail-width">
        <Heading
          title="Réglages de l’agent"
          description="Définissez les repères qui guident les recommandations."
        />
        <Card>
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              s.log("Objectifs de performance mis à jour", "brain");
              s.notify("CPA cible et objectifs de l’agent mis à jour");
            }}
          >
            <div className="grid2">
              <Field
                label="CPA cible"
                type="number"
                min="1"
                value={s.brain.cpa}
                onChange={(e) =>
                  s.patch({
                    brain: { ...s.brain, cpa: Number(e.target.value) },
                  })
                }
              />
              <Field
                label="Budget mensuel"
                type="number"
                min="0"
                value={s.brain.budget}
                onChange={(e) =>
                  s.patch({
                    brain: { ...s.brain, budget: Number(e.target.value) },
                  })
                }
              />
            </div>
            <Select
              label="Seuil du solde de crédits faible"
              value={s.creditThreshold}
              onChange={(e) =>
                s.patch({ creditThreshold: Number(e.target.value) })
              }
            >
              <option value="15">15 % des crédits disponibles</option>
              <option value="25">25 % des crédits disponibles</option>
            </Select>
            <Alert tone="info">
              Surveillance horaire et analyse quotidienne sont simulées dans
              cette version locale. Toute recommandation demande votre
              validation.
            </Alert>
            <Button type="submit">Enregistrer les réglages</Button>
          </form>
        </Card>
      </div>
    );
  if (screen.ref === "C2.4")
    return (
      <>
        <Heading
          title="Historique des recommandations"
          description="Comparez les décisions prises et retrouvez leur justification."
        />
        <div className="stack">
          {rs.filter((r) => r.status !== "pending").length ? (
            rs
              .filter((r) => r.status !== "pending")
              .map((r) => (
                <Card key={r.id}>
                  <div className="row between wrap">
                    <div className="grow">
                      <Badge
                        tone={
                          r.status === "applied"
                            ? "good"
                            : r.status === "ignored"
                              ? "neutral"
                              : "warn"
                        }
                      >
                        {r.status === "applied"
                          ? "✓ Appliquée"
                          : r.status === "ignored"
                            ? "Ignorée"
                            : "Annulée"}
                      </Badge>
                      <h3 style={{ marginTop: "var(--ly-space-3)" }}>
                        {r.title}
                      </h3>
                      <p className="muted">{r.outcome}</p>
                      <small>
                        {r.appliedAt
                          ? new Date(r.appliedAt).toLocaleString("fr-FR")
                          : "Aujourd’hui"}{" "}
                        · Résultat mesuré : en attente de données réelles
                      </small>
                    </div>
                    {r.status === "applied" && (
                      <Button
                        variant="secondary"
                        disabled={!undoAllowed(r.appliedAt ?? 0)}
                        onClick={() => s.undoReco(r.id)}
                      >
                        <ClockCounterClockwise size={18} />
                        Annuler ce changement
                      </Button>
                    )}
                    {r.status === "ignored" && (
                      <Button
                        variant="secondary"
                        onClick={() => {
                          s.patch({
                            recommendations: s.recommendations.map((x) =>
                              x.id === r.id ? { ...x, status: "pending" } : x,
                            ),
                          });
                          s.notify("Recommandation rétablie dans le fil");
                        }}
                      >
                        Rétablir
                      </Button>
                    )}
                  </div>
                </Card>
              ))
          ) : (
            <Empty
              title="Votre historique commence avec une décision"
              description="Les recommandations appliquées, ignorées et annulées apparaîtront ici."
              action={<Go to="C2.1">Voir les recommandations</Go>}
            />
          )}
        </div>
      </>
    );
  if (["C2.2", "C2.3"].includes(screen.ref)) {
    if (!r)
      return (
        <Empty
          title="Aucune recommandation sur ce compte"
          action={<Go to="C2.1">Retour au fil</Go>}
        />
      );
    const changes = budgetChanges(s.campaigns, r),
      target = s.campaigns.find((c) => c.id === r.targetId);
    return (
      <div className="detail-width">
        <Go to="C2.1" variant="ghost">
          ← Retour aux recommandations
        </Go>
        <Heading
          title={
            screen.ref === "C2.3" ? "Confirmer les modifications" : r.title
          }
          description="Vous gardez la décision. Aucune action ne sera appliquée avant votre confirmation."
        />
        <div className="stack">
          <AgentBox>
            <div className="row between">
              <Badge tone={r.severity === "Critique" ? "bad" : "warn"}>
                {r.severity}
              </Badge>
              <strong className="num">Fiabilité {r.confidence} %</strong>
            </div>
            <h2 style={{ marginTop: "var(--ly-size-20)" }}>
              <span className="step-num">1</span>Le constat
            </h2>
            <p style={{ marginTop: "var(--ly-space-3)" }}>{r.body}</p>
          </AgentBox>
          <Card>
            <h2>
              <span className="step-num">2</span>Le calcul
            </h2>
            <div className="grid3" style={{ marginTop: "var(--ly-space-5)" }}>
              <div>
                <small>CPA actuel</small>
                <h2 className="num bad-text">{money(target?.cpa, currency)}</h2>
              </div>
              <div>
                <small>Votre CPA cible</small>
                <h2 className="num">{money(s.brain.cpa, currency)}</h2>
              </div>
              <div>
                <small>ROAS actuel</small>
                <h2 className="num">{ratio(target?.roas)}</h2>
              </div>
            </div>
            <p className="inline-note">
              Base de mesure : performances de démonstration des 7 derniers
              jours. Les estimations ne constituent pas une promesse de
              résultat.
            </p>
          </Card>
          <Card>
            <h2>
              <span className="step-num">3</span>Ce que Lyads va faire
            </h2>
            <p style={{ marginTop: "var(--ly-space-4)" }}>
              {r.kind === "rebalance"
                ? "Transférer une partie du budget quotidien vers la campagne la plus performante."
                : r.kind === "pause"
                  ? "Mettre la campagne en pause en conservant son ciblage et ses créatives."
                  : r.kind === "creative"
                    ? "Enregistrer une demande de déclinaison pour cette créative dans l’historique."
                    : "Mettre à jour le ciblage de démonstration et conserver les exclusions."}
            </p>
            {r.id === "r5" && (
              <details style={{ marginTop: "var(--ly-space-4)" }}>
                <summary>8 objets groupés</summary>
                <ul>
                  {Array.from({ length: 8 }, (_, i) => (
                    <li key={i}>
                      Ensemble d’acquisition {i + 1} · même signal de saturation
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </Card>
          <Card className="flush">
            <div style={{ padding: "var(--ly-space-5)" }}>
              <h2>
                <span className="step-num">4</span>Avant / après
              </h2>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Élément</th>
                  <th>Avant</th>
                  <th>Après</th>
                </tr>
              </thead>
              <tbody>
                {changes.length ? (
                  changes.map((c) => (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td className="num">{money(c.before, currency)}</td>
                      <td className="num good-text">
                        {money(c.after, currency)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td>{target?.name}</td>
                    <td>
                      {r.kind === "pause" ? "Active" : "Configuration actuelle"}
                    </td>
                    <td>
                      {r.kind === "pause" ? "En pause" : "Modification simulée"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div style={{ padding: "var(--ly-size-20)" }}>
              <Alert tone="good">
                <strong>Budget quotidien du compte inchangé</strong>
                <p>
                  Application : 0 crédit · Annulable pendant 7 jours depuis
                  l’historique.
                </p>
              </Alert>
            </div>
          </Card>
          {r.status === "pending" ? (
            <div className="row wrap">
              {screen.ref === "C2.2" ? (
                <Go to="C2.3" variant="agent">
                  Valider et appliquer <ArrowRight size={18} />
                </Go>
              ) : (
                <Button
                  variant="agent"
                  disabled={s.readonly || !s.metaConnected}
                  onClick={() => {
                    if (s.applyReco(r.id)) router.push(route("C2.1"));
                  }}
                >
                  Confirmer l’application
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => {
                  s.ignoreReco(r.id);
                  router.push(route("C2.1"));
                }}
              >
                Ignorer
              </Button>
            </div>
          ) : (
            <Alert tone="good">
              Cette recommandation a déjà été traitée. Consultez l’historique
              pour la retrouver.
            </Alert>
          )}
        </div>
      </div>
    );
  }
  return (
    <>
      <Heading
        title="Agent d’optimisation"
        description={`${pending.length} recommandations en attente. Votre CPA cible : ${money(s.brain.cpa, currency)}.`}
        action={
          <Button
            disabled={busy || s.credits < 2}
            onClick={async () => {
              setBusy(true);
              await new Promise((r) => setTimeout(r, 700));
              if (s.charge(2, "Scan de démonstration terminé"))
                s.notify(
                  "Scan terminé · " +
                    pending.length +
                    " recommandations · 2 crédits",
                );
              setBusy(false);
            }}
          >
            <Sparkle size={18} />
            {busy ? "Analyse en cours…" : "Lancer un scan · 2 crédits"}
          </Button>
        }
      />
      <DataState>
        <div className="reco-grid">
          <div className="stack">
            <div className="pill-tabs">
              {["Toutes", "Critique", "Élevée", "Moyenne", "Faible"].map(
                (v) => (
                  <button
                    key={v}
                    onClick={() => setSeverity(v)}
                    className={severity === v ? "active" : ""}
                  >
                    {v}{" "}
                    <span className="num">
                      {v === "Toutes"
                        ? pending.length
                        : pending.filter((r) => r.severity === v).length}
                    </span>
                  </button>
                ),
              )}
            </div>
            {pending
              .filter((r) => severity === "Toutes" || r.severity === severity)
              .map((r) => (
                <div className="reco-card" key={r.id}>
                  <div className="row between">
                    <div className="row">
                      <Badge
                        tone={
                          r.severity === "Critique"
                            ? "bad"
                            : r.severity === "Faible"
                              ? "neutral"
                              : "warn"
                        }
                      >
                        {r.severity}
                      </Badge>
                      {r.id === "r5" && (
                        <Badge tone="info">8 objets groupés</Badge>
                      )}
                    </div>
                    <small>
                      Fiabilité{" "}
                      <strong className="num">{r.confidence} %</strong>
                    </small>
                  </div>
                  <h2>{r.title}</h2>
                  <p>{r.body}</p>
                  <div>
                    <Button variant="agent" onClick={() => open(r.id)}>
                      Examiner et valider <ArrowRight size={16} />
                    </Button>
                  </div>
                </div>
              ))}
            {!pending.length && (
              <Empty
                title="Tout est traité pour aujourd’hui"
                description="Retrouvez vos décisions dans l’historique."
                action={<Go to="C2.4">Consulter l’historique</Go>}
              />
            )}
            <h2>Traité aujourd’hui</h2>
            {rs
              .filter((r) => r.status !== "pending")
              .map((r) => (
                <Card key={r.id}>
                  <div className="row">
                    <CheckCircle size={22} />
                    <div>
                      <h3>{r.title}</h3>
                      <p className="muted">{r.outcome}</p>
                    </div>
                  </div>
                </Card>
              ))}
          </div>
          <aside className="reco-sidebar stack">
            <Card>
              <div className="eyebrow">Votre agent aujourd’hui</div>
              <h2 className="num">{pending.length} recommandations</h2>
              <p className="inline-note">
                Classées par gravité, avec une justification chiffrée avant
                chaque décision.
              </p>
              <Progress
                value={
                  ((rs.length - pending.length) / Math.max(rs.length, 1)) * 100
                }
              />
              <small>
                {rs.length - pending.length} traitées sur {rs.length}
              </small>
            </Card>
            <Card>
              <h3>Vous gardez le contrôle</h3>
              <p className="inline-note">
                Lyads ne publie jamais sans votre accord. Chaque modification
                reste annulable pendant 7 jours.
              </p>
              <Go to="C2.5" variant="ghost">
                <SlidersHorizontal size={17} />
                Réglages de l’agent
              </Go>
            </Card>
          </aside>
        </div>
      </DataState>
    </>
  );
}
