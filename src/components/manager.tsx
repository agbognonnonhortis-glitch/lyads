"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Funnel,
  Download,
  GridFour,
  List,
  ArrowRight,
  PencilSimple,
  WarningCircle,
} from "@phosphor-icons/react";
import { useApp, accounts, adSets, ads } from "@/lib/store";
import { Screen, route } from "@/lib/screens";
import { campaignTotals, money, number, ratio } from "@/lib/domain";
import {
  Button,
  Go,
  Card,
  Heading,
  Badge,
  Status,
  Toggle,
  Search,
  Modal,
  Field,
  Alert,
  Empty,
  Thumb,
  download,
  Select,
} from "./ui";
import { DataState } from "./dashboard";
export function Manager({ screen }: { screen: Screen }) {
  const s = useApp(),
    router = useRouter();
  const [q, setQ] = useState(""),
    [filter, setFilter] = useState("Toutes"),
    [metric, setMetric] = useState("spend"),
    [selected, setSelected] = useState<string[]>([]),
    [grid, setGrid] = useState(false),
    [budgetId, setBudgetId] = useState(""),
    [budget, setBudget] = useState(0);
  const currency = accounts.find((a) => a.id === s.accountId)?.devise ?? "XOF";
  const all = s.campaigns.filter((c) => c.accountId === s.accountId);
  const visible = all
    .filter(
      (c) =>
        c.name.toLowerCase().includes(q.toLowerCase()) &&
        (filter === "Toutes" ||
          (filter === "Sous-performantes" && (c.roas ?? 10) < 1.6) ||
          (filter === "Budget épuisé" && c.status === "budget_epuise") ||
          (filter === "En pause" && !c.active) ||
          (filter === "Meilleures" && (c.roas ?? 0) >= 3)),
    )
    .sort((a, b) =>
      metric === "roas"
        ? (a.roas ?? 999) - (b.roas ?? 999)
        : metric === "cpa"
          ? (b.cpa ?? 0) - (a.cpa ?? 0)
          : metric === "budget"
            ? b.budget - a.budget
            : b.spend - a.spend,
    );
  const total = campaignTotals(visible);
  const edit = (id: string, value: number) => {
    setBudgetId(id);
    setBudget(value);
  };
  const toggle = (id: string) =>
    setSelected((v) =>
      v.includes(id) ? v.filter((x) => x !== id) : [...v, id],
    );
  const goSets = (id: string) => {
    s.patch({ selectedCampaign: id, selectedSet: "" });
    router.push(route("C3.2"));
  };
  if (screen.ref === "C3.2") {
    const sets = [
      ...adSets,
      ...s.localSets.map((e) => ({
        ...e,
        apprentissage: {
          etat: "en_cours",
          evenements: 0,
          seuil: 50,
          pronostic: "En attente de la première diffusion",
        },
        depense: 0,
        roas: null,
        cpa: null,
      })),
    ].filter(
      (e) =>
        all.some((c) => c.id === e.campagne) &&
        (!s.selectedCampaign || e.campagne === s.selectedCampaign),
    );
    return (
      <>
        <Heading
          title="Ensembles de publicités"
          description={
            all.find((c) => c.id === s.selectedCampaign)?.name ??
            "Tous les ensembles du compte"
          }
          action={
            <Go to="C4.5" variant="primary">
              <Plus size={18} />
              Créer un ensemble
            </Go>
          }
        />
        {s.selectedCampaign && (
          <Button
            variant="ghost"
            onClick={() => s.patch({ selectedCampaign: "" })}
          >
            Afficher tous les ensembles
          </Button>
        )}
        <DataState>
          <div className="stack">
            {sets.map((e) => (
              <Card key={e.id}>
                <div className="row between wrap">
                  <div className="grow">
                    <h2>{e.nom}</h2>
                    <p className="inline-note">
                      {e.audience} · {e.placements.join(", ")}
                    </p>
                    <Badge
                      tone={e.apprentissage.etat === "limite" ? "warn" : "good"}
                    >
                      ◐ {e.apprentissage.evenements}/50 conversions
                    </Badge>
                    <p className="inline-note">{e.apprentissage.pronostic}</p>
                  </div>
                  <div>
                    <small>Dépense</small>
                    <h3 className="num">{money(e.depense, currency)}</h3>
                  </div>
                  <div>
                    <small>ROAS</small>
                    <h3 className="num">{ratio(e.roas)}</h3>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      s.patch({ selectedSet: e.id });
                      router.push(route("C3.3"));
                    }}
                  >
                    Voir les publicités <ArrowRight size={17} />
                  </Button>
                </div>
              </Card>
            ))}
            {!sets.length && (
              <Empty
                title="Aucun ensemble sur cette sélection"
                action={<Go to="C4.5">Créer un ensemble</Go>}
              />
            )}
          </div>
        </DataState>
      </>
    );
  }
  if (screen.ref === "C3.3") {
    const visibleCreatives = s.creatives.filter(
      (c) =>
        c.accountId === s.accountId &&
        c.name.toLowerCase().includes(q.toLowerCase()) &&
        (!s.selectedSet ||
          s.localSets
            .find((e) => e.id === s.selectedSet)
            ?.creativeIds.includes(c.id) ||
          (
            {
              creative0: "s2",
              creative1: "s2",
              creative2: "s1",
              creative3: "s3",
              creative4: "s2",
              creative5: "s1",
            } as Record<string, string>
          )[c.id] === s.selectedSet),
    );
    return (
      <>
        <Heading
          title="Publicités"
          description="Comparez les résultats ou examinez vos créatives."
          action={
            <Go to="C5.1" variant="primary">
              <Plus size={18} />
              Créer une publicité
            </Go>
          }
        />
        {s.selectedSet && (
          <Button variant="ghost" onClick={() => s.patch({ selectedSet: "" })}>
            Afficher toutes les publicités
          </Button>
        )}
        <div className="table-tools">
          <Search
            value={q}
            onChange={setQ}
            placeholder="Rechercher une publicité"
          />
          <div className="pill-tabs">
            <button
              className={!grid ? "active" : ""}
              onClick={() => setGrid(false)}
            >
              <List size={18} /> Tableau
            </button>
            <button
              className={grid ? "active" : ""}
              onClick={() => setGrid(true)}
            >
              <GridFour size={18} /> Grille
            </button>
          </div>
        </div>
        <DataState>
          {grid ? (
            <div className="creative-grid">
              {visibleCreatives.map((c) => (
                <Card className="creative-card" key={c.id}>
                  <Thumb creative={c} />
                  <div className="creative-body stack tight">
                    <h3>{c.name}</h3>
                    <div className="row between">
                      <span className="num">ROAS {ratio(c.roas)}</span>
                      <Badge tone={c.frequency > 4 ? "warn" : "good"}>
                        {c.frequency > 4 ? "◆ Fatigue" : "▲ Performe"}
                      </Badge>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        s.patch({ selectedCreative: c.id });
                        router.push(route("C6.2"));
                      }}
                    >
                      Examiner
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="flush">
              <table>
                <thead>
                  <tr>
                    <th>Publicité</th>
                    <th>ROAS</th>
                    <th className="hide-mobile">Fréquence</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleCreatives.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div className="row">
                          <Thumb creative={c} small />
                          <div>
                            <strong>{c.name}</strong>
                            <small className="table-sub">{c.format}</small>
                          </div>
                        </div>
                      </td>
                      <td className="num">{ratio(c.roas)}</td>
                      <td className="num hide-mobile">{number(c.frequency)}</td>
                      <td>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            s.patch({ selectedCreative: c.id });
                            router.push(route("C6.2"));
                          }}
                        >
                          Analyser
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
          {!visibleCreatives.length && (
            <Empty
              title="Aucune publicité sur ce compte"
              action={<Go to="C5.1">Ouvrir le studio</Go>}
            />
          )}
        </DataState>
      </>
    );
  }
  return (
    <>
      <Heading
        title="Gestionnaire de publicités"
        description={`${all.length} campagnes · ${accounts.find((a) => a.id === s.accountId)?.nom} · Montants en ${currency === "XOF" ? "FCFA" : currency}`}
        action={
          <>
            <Button
              variant="secondary"
              onClick={() =>
                download(
                  "campagnes-lyads.csv",
                  "Campagne;Budget;Dépense;Achats;ROAS\n" +
                    visible
                      .map((c) =>
                        [
                          c.name,
                          c.budget,
                          c.spend,
                          c.purchases,
                          c.roas ?? "",
                        ].join(";"),
                      )
                      .join("\n"),
                  "text/csv;charset=utf-8",
                )
              }
            >
              <Download size={18} />
              Exporter
            </Button>
            <Go to="C4.1" variant="primary">
              <Plus size={18} />
              Créer une campagne
            </Go>
          </>
        }
      />
      <DataState>
        <div className="table-tools">
          <Search
            value={q}
            onChange={setQ}
            placeholder="Rechercher une campagne"
          />
          <Select
            label="Métrique pilote"
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
          >
            <option value="spend">Dépense ↓</option>
            <option value="roas">ROAS ↑</option>
            <option value="cpa">CPA ↓</option>
            <option value="budget">Budget ↓</option>
          </Select>
          <Button
            variant="secondary"
            onClick={() => {
              setQ("");
              setFilter("Toutes");
            }}
          >
            Réinitialiser
          </Button>
        </div>
        <div
          className="pill-tabs"
          style={{ marginBottom: "var(--ly-size-20)" }}
        >
          {[
            "Toutes",
            "Sous-performantes",
            "Budget épuisé",
            "En pause",
            "Meilleures",
          ].map((f) => (
            <button
              key={f}
              className={filter === f ? "active" : ""}
              onClick={() => setFilter(f)}
            >
              {f}{" "}
              <span className="num">
                {
                  all.filter(
                    (c) =>
                      f === "Toutes" ||
                      (f === "Sous-performantes" && (c.roas ?? 10) < 1.6) ||
                      (f === "Budget épuisé" && c.status === "budget_epuise") ||
                      (f === "En pause" && !c.active) ||
                      (f === "Meilleures" && (c.roas ?? 0) >= 3),
                  ).length
                }
              </span>
            </button>
          ))}
        </div>
        {selected.length > 0 && (
          <div className="selection-bar">
            <strong>{selected.length} sélectionnées</strong>
            <Button
              variant="secondary"
              onClick={() => {
                if (s.guard()) {
                  selected.forEach((id) => {
                    if (s.campaigns.find((c) => c.id === id)?.active)
                      s.toggleCampaign(id);
                  });
                  setSelected([]);
                }
              }}
            >
              Mettre en pause
            </Button>
            <Button variant="secondary" onClick={() => edit("bulk", 15000)}>
              Modifier le budget
            </Button>
            <Button variant="ghost" onClick={() => setSelected([])}>
              Désélectionner
            </Button>
          </div>
        )}
        <Card className="flush campaign-table">
          <table>
            <thead>
              <tr>
                <th>
                  <input
                    aria-label="Sélectionner toutes les campagnes"
                    type="checkbox"
                    checked={
                      visible.length > 0 && selected.length === visible.length
                    }
                    onChange={() =>
                      setSelected(
                        selected.length === visible.length
                          ? []
                          : visible.map((c) => c.id),
                      )
                    }
                  />
                </th>
                <th>Diffusion</th>
                <th>Campagne</th>
                <th className="num">Budget / jour</th>
                <th className="num">Dépense ↓</th>
                <th className="num">Achats</th>
                <th className="num">ROAS</th>
                <th>État</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => (
                <tr key={c.id}>
                  <td>
                    <input
                      aria-label={"Sélectionner " + c.name}
                      type="checkbox"
                      checked={selected.includes(c.id)}
                      onChange={() => toggle(c.id)}
                    />
                  </td>
                  <td>
                    <Toggle
                      label={"Diffusion de " + c.name}
                      checked={c.active}
                      onChange={() => s.toggleCampaign(c.id)}
                      disabled={s.readonly || !s.metaConnected}
                    />
                  </td>
                  <td>
                    <button className="table-name" onClick={() => goSets(c.id)}>
                      {c.name}
                    </button>
                    <div className="table-sub">
                      {c.objective} ·{" "}
                      {c.source === "agent"
                        ? "✦ Modifiée par Lyads"
                        : c.source === "regle"
                          ? "Règle « CPA > cible »"
                          : c.source === "meta"
                            ? "Motif : allégation de santé non autorisée"
                            : "Budget de campagne"}
                    </div>
                  </td>
                  <td className="num">
                    <button
                      className="text-link num"
                      onClick={() => edit(c.id, c.budget)}
                    >
                      {money(c.budget, currency)}
                    </button>
                  </td>
                  <td className="num">{money(c.spend, currency)}</td>
                  <td className="num">{c.purchases || "—"}</td>
                  <td
                    className={
                      "num " + ((c.roas ?? 0) >= 1.6 ? "good-text" : "bad-text")
                    }
                  >
                    {ratio(c.roas)}
                  </td>
                  <td>
                    <Status status={c.status} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="table-total">
                <td colSpan={3}>Total · {visible.length} campagnes</td>
                <td className="num">{money(total.budget, currency)}</td>
                <td className="num">{money(total.spend, currency)}</td>
                <td className="num">{total.purchases}</td>
                <td className="num">{ratio(total.roas)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </Card>
        <div className="campaign-mobile">
          {visible.map((c) => (
            <Card key={c.id}>
              <div className="row between">
                <input
                  type="checkbox"
                  aria-label={"Sélectionner " + c.name}
                  checked={selected.includes(c.id)}
                  onChange={() => toggle(c.id)}
                />
                <Status status={c.status} />
                <Toggle
                  label={"Diffusion de " + c.name}
                  checked={c.active}
                  onChange={() => s.toggleCampaign(c.id)}
                  disabled={s.readonly || !s.metaConnected}
                />
              </div>
              <button className="table-name" onClick={() => goSets(c.id)}>
                {c.name}
              </button>
              <div
                className="row between"
                style={{ marginTop: "var(--ly-space-4)" }}
              >
                <div>
                  <small>
                    {metric === "roas"
                      ? "ROAS"
                      : metric === "cpa"
                        ? "CPA"
                        : metric === "budget"
                          ? "Budget"
                          : "Dépense"}
                  </small>
                  <h2 className="num">
                    {metric === "roas"
                      ? ratio(c.roas)
                      : money(
                          metric === "cpa"
                            ? c.cpa
                            : metric === "budget"
                              ? c.budget
                              : c.spend,
                          currency,
                        )}
                  </h2>
                </div>
                <div>
                  <small>Achats</small>
                  <h3 className="num">{c.purchases}</h3>
                </div>
              </div>
              <div
                className="row between"
                style={{ marginTop: "var(--ly-space-3)" }}
              >
                <Button variant="ghost" onClick={() => edit(c.id, c.budget)}>
                  <PencilSimple size={16} />
                  Budget
                </Button>
                <Button variant="ghost" onClick={() => goSets(c.id)}>
                  Ensembles <ArrowRight size={16} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
        {!visible.length && (
          <Empty
            title="Aucune campagne ne correspond"
            description="Modifiez les filtres ou créez votre première campagne."
            action={<Go to="C4.1">Créer une campagne</Go>}
          />
        )}
        <p className="inline-note">
          {visible.length} résultats · Les montants restent dans la devise du
          compte publicitaire.
        </p>
      </DataState>
      <Modal
        open={!!budgetId}
        onClose={() => setBudgetId("")}
        title="Modifier le budget quotidien"
      >
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            const ids = budgetId === "bulk" ? selected : [budgetId];
            if (!s.guard()) return;
            ids.forEach((id) => s.updateBudget(id, budget));
            setBudgetId("");
            setSelected([]);
          }}
        >
          <Alert>
            Une modification de budget peut relancer la phase d’apprentissage.
            Vérifiez le montant avant de confirmer.
          </Alert>
          <Field
            label={
              "Nouveau budget quotidien (" +
              (currency === "XOF" ? "FCFA" : currency) +
              ")"
            }
            type="number"
            min="0"
            required
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
          />
          <Button type="submit">Confirmer le budget</Button>
        </form>
      </Modal>
    </>
  );
}
