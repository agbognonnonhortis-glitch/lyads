"use client";
import { useState } from "react";
import {
  ArrowRight,
  Plus,
  TrendUp,
  Info,
  Sparkle,
  ArrowClockwise,
} from "@phosphor-icons/react";
import { useApp, accounts } from "@/lib/store";
import { money, ratio, number, campaignTotals } from "@/lib/domain";
import {
  Card,
  Go,
  Button,
  Heading,
  Badge,
  Chart,
  Thumb,
  Alert,
  Empty,
  Search,
} from "./ui";
import { AccountPicker } from "./shell";
import { Screen } from "@/lib/screens";
export function DataState({ children }: { children: React.ReactNode }) {
  const s = useApp();
  if (s.scenario === "empty")
    return (
      <Empty
        title="Votre activité commence ici"
        description="Aucune donnée sur cette période. Créez une campagne ou explorez les exemples."
        action={
          <div className="row wrap">
            <Go to="C4.1" variant="primary">
              Créer une campagne
            </Go>
            <Button
              variant="secondary"
              onClick={() => s.patch({ scenario: "full" })}
            >
              Afficher les exemples
            </Button>
          </div>
        }
      />
    );
  if (s.scenario === "error")
    return (
      <Empty
        title="Impossible de récupérer les performances"
        description="Aucun budget n’a été modifié. Réessayez la synchronisation."
        action={
          <Button
            onClick={() => {
              s.patch({ scenario: "full" });
              s.notify("Synchronisation terminée");
            }}
          >
            <ArrowClockwise size={18} />
            Réessayer
          </Button>
        }
      />
    );
  return <>{children}</>;
}
export function Dashboard({ screen }: { screen: Screen }) {
  const s = useApp(),
    [period, setPeriod] = useState("7 derniers jours"),
    [metric, setMetric] = useState("spend");
  const cs = s.campaigns.filter((c) => c.accountId === s.accountId);
  const totals = campaignTotals(cs),
    currency = accounts.find((a) => a.id === s.accountId)?.devise ?? "XOF";
  const pending = s.recommendations.filter(
    (r) => r.status === "pending" && r.accountId === s.accountId,
  );
  if (screen.ref === "C1.2")
    return (
      <div className="detail-width">
        <Heading
          title="Vos comptes publicitaires"
          description="Un contexte, une devise et des accès propres à chaque compte."
        />
        <Card>
          <AccountPicker />
        </Card>
      </div>
    );
  return (
    <>
      <Heading
        title="Tableau de bord"
        description="Vos performances en un regard. Les décisions qui comptent, juste après."
        action={
          <>
            <select
              aria-label="Période du tableau de bord"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option>7 derniers jours</option>
              <option>30 derniers jours</option>
              <option>Aujourd’hui</option>
            </select>
            <Go to="C4.1" variant="primary">
              <Plus size={17} />
              Créer une campagne
            </Go>
          </>
        }
      />
      <DataState>
        {!cs.length ? (
          <Empty
            title="Aucune campagne sur ce compte"
            action={
              <Go to="C4.1" variant="primary">
                Créer une campagne
              </Go>
            }
          />
        ) : (
          <div className="stack">
            {cs.some((c) => c.status === "budget_epuise") && (
              <Alert tone="bad">
                <div className="row between wrap">
                  <div>
                    <strong>
                      Budget épuisé — « Promo Tabaski — Carrousel »
                    </strong>
                    <p>
                      Votre campagne ne diffuse plus. Une réallocation peut
                      relancer la diffusion.
                    </p>
                  </div>
                  <Go to="C2.1">
                    Examiner <ArrowRight size={16} />
                  </Go>
                </div>
              </Alert>
            )}
            {cs.some((c) => c.status === "rejetee") && (
              <Alert tone="bad">
                <div className="row between wrap">
                  <div>
                    <strong>
                      Publicité rejetée par Meta — « Rentrée scolaire — Vidéo 15
                      s »
                    </strong>
                    <p>
                      Motif : allégation de santé non autorisée. Vérifiez le
                      texte de la publicité.
                    </p>
                  </div>
                  <Go to="C3.3">Voir le motif</Go>
                </div>
              </Alert>
            )}
            <div className="metric-grid">
              {[
                [
                  "ROAS",
                  ratio(totals.roas),
                  "▼ 0,22",
                  "Retour sur dépense publicitaire",
                ],
                [
                  "Dépense",
                  money(
                    period === "30 derniers jours"
                      ? totals.spend * 4
                      : period === "Aujourd’hui"
                        ? totals.spend / 7
                        : totals.spend,
                    currency,
                  ),
                  "▲ 12,4 %",
                  "vs période précédente",
                ],
                [
                  "Coût par achat",
                  money(totals.cpa, currency),
                  "▲ 8,2 %",
                  "Cible : " + money(s.brain.cpa, currency),
                ],
                ["CPC", money(172, currency), "▼ 4,1 %", "Coût par clic"],
                [
                  "Impressions",
                  number(Math.round(totals.spend / 1.7)),
                  "▲ 16,8 %",
                  "Affichages des publicités",
                ],
                [
                  "Achats",
                  number(totals.purchases),
                  "▲ 6,4 %",
                  "Conversions attribuées",
                ],
              ].map(([label, value, change, hint], i) => (
                <Card className="metric" key={label}>
                  <div className="label">
                    {label}
                    <Info size={14} />
                  </div>
                  <div className="value">
                    {value.length > 14 && i === 1
                      ? number(totals.spend / 1000000) + " M"
                      : value}
                  </div>
                  <Badge tone={i === 0 || i === 2 ? "bad" : "good"}>
                    {change}
                  </Badge>
                  <small>
                    {i === 1 ? money(totals.spend, currency) + " exact" : hint}
                  </small>
                  <div className="spark-bars">
                    {[25, 38, 28, 52, 48, 66, 58, 76, 64, 88, 80, 100].map(
                      (h, j) => (
                        <i key={j} style={{ height: h + "%" }} />
                      ),
                    )}
                  </div>
                </Card>
              ))}
            </div>
            <div className="dashboard-charts">
              <Card>
                <div className="card-title">
                  <h2>Évolution des performances</h2>
                  <select
                    aria-label="Métrique du graphique"
                    value={metric}
                    onChange={(e) => setMetric(e.target.value)}
                  >
                    <option value="spend">Dépense</option>
                    <option value="roas">ROAS</option>
                  </select>
                </div>
                <div className="row wrap">
                  <span className="legend">{period}</span>
                  <span className="legend previous">Période précédente</span>
                </div>
                <Chart variant={metric} />
              </Card>
              <Card>
                <div className="card-title">
                  <h2>Vos meilleures publicités</h2>
                  <Go to="C6.1" variant="ghost">
                    Tout voir <ArrowRight size={16} />
                  </Go>
                </div>
                {s.creatives
                  .filter((c) => c.accountId === s.accountId)
                  .sort((a, b) => b.roas - a.roas)
                  .slice(0, 3)
                  .map((c) => (
                    <div className="list-row" key={c.id}>
                      <Thumb creative={c} small />
                      <button
                        className="table-name grow"
                        onClick={() => {
                          s.patch({ selectedCreative: c.id });
                          window.location.href = "/app/analyse/creative";
                        }}
                      >
                        {c.name}
                        <small className="table-sub">
                          {c.format} · {money(c.spend, currency)}
                        </small>
                      </button>
                      <div>
                        <strong className="num good-text">
                          {ratio(c.roas)}
                        </strong>
                        <small style={{ display: "block" }}>ROAS</small>
                      </div>
                    </div>
                  ))}
              </Card>
            </div>
            <div>
              <div className="card-title">
                <div className="row">
                  <Sparkle size={20} />
                  <h2>Les recommandations du jour</h2>
                  <Badge tone="info">{pending.length} en attente</Badge>
                </div>
                <Go to="C2.1" variant="ghost">
                  Voir toutes les recommandations <ArrowRight size={17} />
                </Go>
              </div>
              <div className="grid2">
                {pending.slice(0, 2).map((r) => (
                  <div key={r.id} className="reco-card">
                    <div className="row between">
                      <Badge tone={r.severity === "Critique" ? "bad" : "warn"}>
                        {r.severity}
                      </Badge>
                      <small>
                        Fiabilité{" "}
                        <strong className="num">{r.confidence} %</strong>
                      </small>
                    </div>
                    <h2>{r.title}</h2>
                    <p>{r.body}</p>
                    <div>
                      <Go
                        to="C2.2"
                        variant="agent"
                        onClick={() => s.patch({ selectedReco: r.id })}
                      >
                        Examiner la recommandation
                        <ArrowRight size={16} />
                      </Go>
                    </div>
                  </div>
                ))}
              </div>
              {!pending.length && (
                <Card>
                  <p>Toutes les recommandations ont été traitées.</p>
                  <Go to="C2.4">Consulter l’historique</Go>
                </Card>
              )}
            </div>
          </div>
        )}
      </DataState>
    </>
  );
}
