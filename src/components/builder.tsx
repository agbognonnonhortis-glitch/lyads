"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkle,
  PencilSimple,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  WarningCircle,
  Plus,
} from "@phosphor-icons/react";
import { Screen, route, screens } from "@/lib/screens";
import { useApp, accounts } from "@/lib/store";
import { money } from "@/lib/domain";
import {
  Button,
  Go,
  Card,
  Heading,
  Field,
  Area,
  Select,
  AgentBox,
  Alert,
  Thumb,
  Badge,
  Progress,
  Modal,
} from "./ui";
export function Builder({ screen }: { screen: Screen }) {
  const s = useApp(),
    router = useRouter(),
    d = s.draft;
  const n = +screen.ref.split(".")[1];
  const [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState(false),
    [placement, setPlacement] = useState("Fil Facebook"),
    [failed, setFailed] = useState(false);
  const set = (value: Partial<typeof d>) =>
    s.patch({ draft: { ...d, published: false, ...value } });
  const cs = s.creatives.filter((c) => c.accountId === s.accountId);
  const chosen = cs.find((c) => d.creativeIds.includes(c.id));
  const currency = accounts.find((a) => a.id === s.accountId)?.devise ?? "XOF";
  const blockers = [
    !d.name ? "Le nom de campagne est requis" : null,
    d.budget <= 0 ? "Le budget doit être positif" : null,
    !d.audience ? "Une audience doit être définie" : null,
    !chosen ? "Sélectionnez une créative" : null,
    !d.text ? "Ajoutez un texte publicitaire" : null,
    !d.placements.length ? "Sélectionnez un placement" : null,
    !s.brain.instagram &&
    d.placements.some((p) => ["Instagram", "Stories", "Reels"].includes(p))
      ? "Reconnectez Instagram ou retirez ses placements"
      : null,
  ].filter(Boolean);
  const next = async () => {
    if (n === 2) {
      if (d.brief.trim().length < 20) {
        s.notify("Décrivez votre offre en au moins 20 caractères.");
        return;
      }
      setBusy(true);
      await new Promise((r) => setTimeout(r, 900));
      setBusy(false);
    }
    if (n === 4 && (!d.name || d.budget <= 0)) {
      s.notify("Renseignez un nom et un budget positif.");
      return;
    }
    router.push(route("C4." + (n + 1)));
  };
  const publish = async () => {
    if (blockers.length || !s.guard()) return;
    if (s.credits < 2) {
      s.notify("2 crédits sont nécessaires pour publier.");
      return;
    }
    setConfirm(false);
    setBusy(true);
    await new Promise((r) => setTimeout(r, 900));
    setBusy(false);
    if (failed) {
      s.notify("Publication simulée rejetée · aucun crédit débité");
      return;
    }
    if (!s.charge(2, "Publication de démonstration : " + d.name)) return;
    const id = "campaign-" + Date.now();
    s.patch({
      localSets: [
        ...s.localSets,
        {
          id: "set-" + id,
          campagne: id,
          nom:
            d.mode === "agent"
              ? "Acquisition et retargeting"
              : d.name + " — ensemble",
          audience: d.audience,
          placements: d.placements,
          creativeIds: d.creativeIds,
        },
      ],
      campaigns: [
        {
          id,
          accountId: s.accountId,
          name: d.name,
          budget: d.budget,
          spend: 0,
          purchases: 0,
          roas: null,
          cpa: null,
          status: "en_revision",
          active: true,
          source: "utilisateur",
          objective: d.objective,
        },
        ...s.campaigns,
      ],
      draft: { ...d, published: true },
      scenario: "full",
    });
    s.notify("Campagne créée localement · en révision simulée");
  };
  return (
    <>
      <Heading
        title={screen.title}
        description="Construisez votre campagne à partir d’un brief ou gardez la main sur chaque étape."
        action={
          <Go to="C3.1" variant="ghost">
            Enregistrer et quitter
          </Go>
        }
      />
      <div className="steps">
        {Array.from({ length: 9 }, (_, i) => (
          <button
            key={i}
            className={
              "step " + (i + 1 === n ? "current" : i + 1 < n ? "done" : "")
            }
            aria-label={screens.find((x) => x.ref === "C4." + (i + 1))?.title}
            onClick={() => router.push(route("C4." + (i + 1)))}
          >
            {i + 1}
          </button>
        ))}
      </div>
      <div className="wizard-layout">
        <Card>
          {n === 1 ? (
            <div className="stack">
              <h2>Comment voulez-vous créer cette campagne ?</h2>
              <button
                className={
                  "option-card " + (d.mode === "agent" ? "selected" : "")
                }
                onClick={() => {
                  set({ mode: "agent", published: false });
                  router.push(route("C4.2"));
                }}
              >
                <Sparkle size={28} />
                <div>
                  <h3>Avec l’agent Lyads</h3>
                  <p>
                    Décrivez votre offre. L’agent propose une structure que vous
                    pouvez modifier.
                  </p>
                </div>
                <ArrowRight size={18} />
              </button>
              <button
                className={
                  "option-card " + (d.mode === "manual" ? "selected" : "")
                }
                onClick={() => {
                  set({ mode: "manual", published: false });
                  router.push(route("C4.4"));
                }}
              >
                <PencilSimple size={28} />
                <div>
                  <h3>Construction manuelle</h3>
                  <p>
                    Choisissez l’objectif, le budget, l’audience et les
                    créatives.
                  </p>
                </div>
                <ArrowRight size={18} />
              </button>
            </div>
          ) : n === 2 ? (
            <div className="stack">
              <Area
                label="Décrivez votre campagne"
                value={d.brief}
                onChange={(brief) => set({ brief, published: false })}
                required
              />
              <div className="grid2">
                <Select
                  label="Objectif"
                  value={d.objective}
                  onChange={(e) => set({ objective: e.target.value })}
                >
                  <option>Ventes</option>
                  <option>Prospects</option>
                  <option>Messages</option>
                  <option>Notoriété</option>
                </Select>
                <Field
                  label="Budget quotidien"
                  type="number"
                  min="1"
                  value={d.budget}
                  onChange={(e) => set({ budget: +e.target.value })}
                />
              </div>
              <Alert tone="info">
                Votre Business Brain complète ce brief : {s.brain.company} ·{" "}
                {s.brain.objective}.
              </Alert>
            </div>
          ) : n === 3 ? (
            <div className="stack">
              <AgentBox>
                <h2>Une structure simple pour commencer</h2>
                <p className="inline-note">
                  Proposition de démonstration fondée sur votre brief et votre
                  Business Brain.
                </p>
                <div className="list-row">
                  <strong className="grow">Campagne · {d.name}</strong>
                  <Badge>{d.objective}</Badge>
                </div>
                <div className="list-row">
                  <span className="grow">Acquisition · {d.audience}</span>
                  <strong className="num">70 %</strong>
                </div>
                <div className="list-row">
                  <span className="grow">Retargeting · Visiteurs 30 jours</span>
                  <strong className="num">30 %</strong>
                </div>
                <p className="inline-note">
                  Budget total : {money(d.budget, currency)} / jour.
                </p>
              </AgentBox>
              <div className="row wrap">
                <Go to="C4.8" variant="primary">
                  Accepter et prévisualiser
                </Go>
                <Go to="C4.4">Modifier la proposition</Go>
              </div>
            </div>
          ) : n === 4 ? (
            <div className="stack">
              <Field
                label="Nom de la campagne"
                required
                value={d.name}
                onChange={(e) =>
                  set({ name: e.target.value, published: false })
                }
              />
              <Select
                label="Objectif Meta"
                value={d.objective}
                onChange={(e) => set({ objective: e.target.value })}
              >
                <option>Ventes</option>
                <option>Prospects</option>
                <option>Messages</option>
                <option>Notoriété</option>
              </Select>
              <Field
                label={"Budget quotidien (" + currency + ")"}
                type="number"
                min="1"
                value={d.budget}
                onChange={(e) => set({ budget: +e.target.value })}
              />
              <Alert>
                Le budget est une limite quotidienne de démonstration. Aucune
                dépense réelle n’est engagée.
              </Alert>
            </div>
          ) : n === 5 ? (
            <div className="stack">
              <Area
                label="Audience et ciblage"
                value={d.audience}
                onChange={(audience) => set({ audience })}
              />
              <h3>Placements</h3>
              {[
                "Fil Facebook",
                "Instagram",
                "Stories",
                "Reels",
                "Audience Network",
              ].map((p) => (
                <label key={p} className="check-row">
                  <input
                    type="checkbox"
                    checked={d.placements.includes(p)}
                    disabled={
                      !s.brain.instagram &&
                      ["Instagram", "Stories", "Reels"].includes(p)
                    }
                    onChange={() =>
                      set({
                        placements: d.placements.includes(p)
                          ? d.placements.filter((x) => x !== p)
                          : [...d.placements, p],
                      })
                    }
                  />
                  {p}
                  {!s.brain.instagram &&
                    ["Instagram", "Stories", "Reels"].includes(p) && (
                      <small>Instagram non lié</small>
                    )}
                </label>
              ))}
              <AgentBox>
                <h3>Gardez une audience suffisamment large</h3>
                <p className="inline-note">
                  Une audience trop restreinte ralentit l’apprentissage et peut
                  augmenter le coût par résultat.
                </p>
              </AgentBox>
            </div>
          ) : n === 6 ? (
            <div className="stack">
              <div className="row between">
                <h2>Choisir vos créatives</h2>
                <Go to="C5.1" variant="ghost">
                  <Plus size={16} />
                  Ouvrir le studio
                </Go>
              </div>
              <div className="creative-grid">
                {cs.map((c) => (
                  <button
                    key={c.id}
                    className={
                      "card creative-card " +
                      (d.creativeIds.includes(c.id) ? "selected-creative" : "")
                    }
                    onClick={() =>
                      set({
                        creativeIds: d.creativeIds.includes(c.id)
                          ? d.creativeIds.filter((x) => x !== c.id)
                          : [...d.creativeIds, c.id],
                      })
                    }
                  >
                    <Thumb creative={c} />
                    <div className="creative-body">
                      <h3>{c.name}</h3>
                      <Badge
                        tone={d.creativeIds.includes(c.id) ? "good" : "neutral"}
                      >
                        {d.creativeIds.includes(c.id)
                          ? "✓ Sélectionnée"
                          : "Sélectionner"}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : n === 7 ? (
            <div className="stack">
              <Field
                label="Titre de la publicité"
                value={d.name}
                onChange={(e) => set({ name: e.target.value })}
              />
              <Area
                label="Texte principal"
                value={d.text}
                onChange={(text) => set({ text })}
              />
              <div className="row between">
                <small>{d.text.length} caractères</small>
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (s.charge(1, "Variante de texte générée")) {
                      set({
                        text:
                          "Découvrez " +
                          s.brain.company +
                          " : des soins au karité pour votre rituel quotidien. Commandez votre collection préférée.",
                      });
                      s.notify("Nouvelle proposition de texte · 1 crédit");
                    }
                  }}
                >
                  <Sparkle size={16} />
                  Proposer un texte · 1 crédit
                </Button>
              </div>
              <Select
                label="Appel à l’action"
                value={d.cta ?? "Acheter"}
                onChange={(e) => set({ cta: e.target.value })}
              >
                <option>Acheter</option>
                <option>En savoir plus</option>
                <option>Envoyer un message</option>
              </Select>
            </div>
          ) : n === 8 ? (
            <div className="stack">
              <div className="pill-tabs">
                {["Fil Facebook", "Instagram", "Stories", "Reels"].map((p) => (
                  <button
                    key={p}
                    className={placement === p ? "active" : ""}
                    disabled={!s.brain.instagram && p !== "Fil Facebook"}
                    onClick={() => setPlacement(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <Card className="creative-card">
                <div className="creative-body">
                  <div className="row">
                    <span className="avatar">KB</span>
                    <div>
                      <h3>{s.brain.company}</h3>
                      <small>Sponsorisé · aperçu {placement}</small>
                    </div>
                  </div>
                  <p style={{ marginTop: "var(--ly-space-4)" }}>{d.text}</p>
                </div>
                {chosen ? (
                  <Thumb creative={chosen} />
                ) : (
                  <Alert>Aucune créative sélectionnée.</Alert>
                )}
                <div className="creative-body row between">
                  <h3>{d.name}</h3>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      s.notify(
                        "Aperçu uniquement · aucun lien commercial ouvert",
                      )
                    }
                  >
                    {d.cta ?? "Acheter"}
                  </Button>
                </div>
              </Card>
            </div>
          ) : (
            <div className="stack">
              <h2>
                {d.published
                  ? "Votre campagne est créée"
                  : "Dernière vérification avant publication"}
              </h2>
              {d.published ? (
                <Alert tone="good">
                  <strong>{d.name}</strong>
                  <p>
                    Créée localement. Vous la retrouvez dans le gestionnaire,
                    avec le statut En révision.
                  </p>
                </Alert>
              ) : (
                <>
                  {[
                    ["Nom", d.name],
                    ["Objectif", d.objective],
                    ["Budget / jour", money(d.budget, currency)],
                    ["Audience", d.audience],
                    ["Placements", d.placements.join(", ")],
                    ["Créatives", d.creativeIds.length + " sélectionnée(s)"],
                  ].map(([k, v]) => (
                    <div className="list-row" key={k}>
                      <span className="grow muted">{k}</span>
                      <strong>{v}</strong>
                    </div>
                  ))}
                  {blockers.length ? (
                    <Alert tone="bad">
                      <strong>Contrôles bloquants</strong>
                      <ul>
                        {blockers.map((x) => (
                          <li key={x}>{x}</li>
                        ))}
                      </ul>
                    </Alert>
                  ) : (
                    <Alert tone="good">
                      Tous les contrôles sont passés. Publication de
                      démonstration : 2 crédits.
                    </Alert>
                  )}
                  <label className="check-row">
                    <input
                      type="checkbox"
                      checked={failed}
                      onChange={(e) => setFailed(e.target.checked)}
                    />
                    Simuler un rejet Meta
                  </label>
                  {failed && (
                    <Alert>
                      Le scénario de rejet affichera le motif sans débiter de
                      crédits.
                    </Alert>
                  )}
                  <Button
                    disabled={
                      !!blockers.length ||
                      busy ||
                      s.readonly ||
                      !s.metaConnected
                    }
                    onClick={() => setConfirm(true)}
                  >
                    {busy
                      ? "Publication en cours…"
                      : "Publier la campagne · 2 crédits"}
                  </Button>
                </>
              )}
              {d.published && (
                <Go to="C3.1" variant="primary">
                  Voir la campagne
                </Go>
              )}
            </div>
          )}
        </Card>
        <aside className="wizard-aside stack">
          <AgentBox>
            <h3>Votre campagne</h3>
            <p className="inline-note">{d.name}</p>
            <div className="row between">
              <span>Budget quotidien</span>
              <strong className="num">{money(d.budget, currency)}</strong>
            </div>
            <p className="inline-note">
              Objectif : {d.objective}
              <br />
              {d.creativeIds.length} créative(s) · {d.placements.length}{" "}
              placement(s)
            </p>
          </AgentBox>
          <Card>
            <h3>Votre contexte de marque</h3>
            <p className="inline-note">{s.brain.offer}</p>
            <Go to="C10.1" variant="ghost">
              Consulter le Business Brain
            </Go>
          </Card>
        </aside>
      </div>
      {n > 1 && n < 9 && (
        <div className="wizard-footer">
          <Go to={"C4." + (n - 1)}>
            <ArrowLeft size={17} />
            Retour
          </Go>
          <Button disabled={busy} onClick={next}>
            {busy
              ? "Préparation…"
              : n === 2
                ? "Générer la proposition"
                : "Continuer"}
            <ArrowRight size={17} />
          </Button>
        </div>
      )}
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Confirmer la publication"
      >
        <div className="stack">
          <p>
            Créer localement « {d.name} » avec un budget de{" "}
            {money(d.budget, currency)} par jour ?
          </p>
          <Alert>
            Aucune campagne ne sera envoyée à Meta. Le solde de démonstration
            sera débité de 2 crédits en cas de succès.
          </Alert>
          <Button onClick={publish}>Confirmer la publication simulée</Button>
        </div>
      </Modal>
    </>
  );
}
