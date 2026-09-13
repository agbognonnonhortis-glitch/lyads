"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp, Creative } from "@/lib/store";
import { route } from "@/lib/screens";
import { money, ratio, creditCosts } from "@/lib/domain";
import {
  Button,
  Go,
  Card,
  Field,
  Area,
  Select,
  Heading,
  Badge,
  AgentBox,
  Empty,
  Thumb,
  Search,
  Modal,
  Progress,
  Alert,
  download,
} from "./ui";
import { DataState } from "./dashboard";
export function Studio({ refId }: { refId: string }) {
  const s = useApp(),
    router = useRouter(),
    n = Number(refId.split(".")[1]);
  const [brief, setBrief] = useState(s.draft.brief),
    [format, setFormat] = useState(
      n === 2 ? "Texte" : n === 4 ? "Vidéo" : "Image",
    ),
    [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState(false),
    [fail, setFail] = useState(false),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("Tous");
  const selected = s.creatives.find(
    (c) => c.id === s.selectedCreative && c.accountId === s.accountId,
  );
  const [text, setText] = useState(selected?.text ?? s.draft.text);
  const items = s.creatives.filter(
    (c) =>
      c.accountId === s.accountId &&
      (n !== 5 || c.created) &&
      (n !== 7 || c.saved) &&
      (filter === "Tous" || c.format === filter) &&
      c.name.toLowerCase().includes(search.toLowerCase()),
  );
  const generate = async () => {
    setConfirm(false);
    const cost =
      format === "Vidéo"
        ? creditCosts.video
        : format === "Texte"
          ? creditCosts.texte
          : creditCosts.image;
    if (brief.trim().length < 12) {
      s.notify("Décrivez votre demande en au moins 12 caractères.");
      return;
    }
    if (s.credits < cost) {
      s.notify("Crédits insuffisants.");
      return;
    }
    setBusy(true);
    await new Promise((r) => setTimeout(r, 900));
    if (fail) {
      setBusy(false);
      s.notify("Génération simulée échouée. Aucun crédit débité.");
      return;
    }
    if (!s.charge(cost, "Génération " + format.toLowerCase())) {
      setBusy(false);
      return;
    }
    const creative: Creative = {
      id: crypto.randomUUID(),
      accountId: s.accountId,
      name: brief.slice(0, 42),
      format,
      text:
        format === "Vidéo"
          ? "0–3 s : présenter le besoin. 3–12 s : montrer le produit. 12–20 s : témoignage et appel à découvrir la collection."
          : `${s.brain.company} — ${brief}\nDécouvrez notre collection et trouvez votre prochain rituel.`,
      color: "forest",
      score: 0,
      spend: 0,
      roas: 0,
      frequency: 0,
      saved: false,
      created: true,
    };
    useApp.getState().patch({
      creatives: [creative, ...useApp.getState().creatives],
      selectedCreative: creative.id,
    });
    setBusy(false);
    router.push(route("C5.5"));
  };
  const useCreative = (c: Creative) => {
    s.patch({
      draft: {
        ...s.draft,
        published: false,
        creativeIds: Array.from(new Set([...s.draft.creativeIds, c.id])),
        text: c.text,
      },
    });
    router.push(route("C4.6"));
  };
  return (
    <>
      <Heading
        eyebrow="Créer avec votre contexte"
        title={
          [
            "",
            "Studio créatif",
            "Générateur de textes",
            "Générateur de visuels",
            "Studio vidéo",
            "Résultats de génération",
            "Retoucher une créative",
            "Bibliothèque créative",
          ][n]
        }
        description="Les générations de cette version sont des aperçus de démonstration. Les crédits et les sauvegardes évoluent localement."
        action={<Badge>{s.credits} crédits disponibles</Badge>}
      />
      {n === 1 ? (
        <>
          <div className="grid3">
            {[
              [
                "C5.2",
                "Textes",
                "Des accroches et des textes adaptés à votre offre.",
                "1 crédit",
              ],
              [
                "C5.3",
                "Visuels",
                "Composez des idées visuelles pour vos prochaines publicités.",
                "8 crédits",
              ],
              [
                "C5.4",
                "Vidéos",
                "Préparez un script avant de lancer un aperçu vidéo.",
                "45 crédits",
              ],
            ].map(([to, title, desc, cost]) => (
              <Card key={to}>
                <div className="stack">
                  <Badge tone="info">{cost}</Badge>
                  <h2>{title}</h2>
                  <p className="muted">{desc}</p>
                  <Go to={to}>Commencer →</Go>
                </div>
              </Card>
            ))}
          </div>
          <div className="list-row">
            <h2 className="grow">Votre bibliothèque</h2>
            <Go to="C5.7">Tout voir</Go>
          </div>
        </>
      ) : null}
      {[2, 3, 4].includes(n) ? (
        <div className="wizard-layout">
          <Card>
            <div className="stack">
              <Area
                label="Que voulez-vous créer ?"
                value={brief}
                onChange={setBrief}
              />
              <div className="grid2">
                <Select
                  label="Format"
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                >
                  {(n === 2
                    ? ["Texte"]
                    : n === 4
                      ? ["Vidéo"]
                      : ["Image", "Carrousel"]
                  ).map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </Select>
                <Field
                  label="Ton de marque"
                  value={s.brain.tone}
                  onChange={(e) =>
                    s.patch({ brain: { ...s.brain, tone: e.target.value } })
                  }
                />
              </div>
              {n === 4 && (
                <AgentBox>
                  <h3>Script proposé · 20 secondes</h3>
                  <p>
                    Accroche (3 s) → démonstration du produit (9 s) → preuve et
                    appel à l’action (8 s).
                  </p>
                  <small>
                    Le fichier vidéo final sera disponible après le raccordement
                    du service de génération.
                  </small>
                </AgentBox>
              )}
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={fail}
                  onChange={(e) => setFail(e.target.checked)}
                />{" "}
                Tester un échec sans débit
              </label>
              {busy && <Progress value={65} />}
              <Button
                disabled={busy}
                onClick={() => (n === 4 ? setConfirm(true) : generate())}
              >
                {busy
                  ? "Génération…"
                  : n === 4
                    ? "Valider le script et continuer"
                    : `Générer · ${n === 2 ? 1 : 8} crédits`}
              </Button>
            </div>
          </Card>
          <AgentBox>
            <h3>Votre Business Brain est utilisé</h3>
            <p>{s.brain.company}</p>
            <p>{s.brain.audience}</p>
            <Go to="C10.1">Ajuster le contexte</Go>
          </AgentBox>
        </div>
      ) : null}
      {n === 6 ? (
        selected ? (
          <div className="grid2">
            <Card className="creative-card">
              <Thumb creative={{ ...selected, text }} />
            </Card>
            <Card>
              <div className="stack">
                <Heading title="Ajuster votre variante" />
                <Area
                  label="Texte publicitaire"
                  value={text}
                  onChange={setText}
                />
                <Button
                  onClick={() => {
                    s.patch({
                      creatives: s.creatives.map((c) =>
                        c.id === selected.id ? { ...c, text, saved: true } : c,
                      ),
                    });
                    s.log("Retouche : " + selected.name, "creative");
                    s.notify("Modifications sauvegardées");
                  }}
                >
                  Enregistrer les modifications
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => useCreative({ ...selected, text })}
                >
                  Utiliser dans une campagne
                </Button>
              </div>
            </Card>
          </div>
        ) : (
          <Empty />
        )
      ) : null}
      {[1, 5, 7].includes(n) && (
        <DataState>
          <div className="stack">
            <div className="table-tools">
              <Search
                value={search}
                onChange={setSearch}
                placeholder="Rechercher une créative"
              />
              <div className="pill-tabs">
                {["Tous", "Texte", "Image", "Carrousel", "Vidéo"].map((f) => (
                  <button
                    key={f}
                    className={filter === f ? "active" : ""}
                    onClick={() => setFilter(f)}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            {items.length ? (
              <div className="creative-grid">
                {items.map((c) => (
                  <Card key={c.id} className="creative-card">
                    <Thumb creative={c} />
                    <div className="creative-body stack tight">
                      <div className="row between">
                        <Badge>{c.format}</Badge>
                        {c.saved && <Badge tone="good">Enregistrée</Badge>}
                      </div>
                      <h3>{c.name}</h3>
                      <p className="muted">{c.text}</p>
                      <div className="row wrap">
                        <Button
                          variant="secondary"
                          onClick={() => {
                            s.patch({
                              creatives: s.creatives.map((x) =>
                                x.id === c.id ? { ...x, saved: !x.saved } : x,
                              ),
                            });
                            s.notify(
                              c.saved
                                ? "Retirée des favoris"
                                : "Ajoutée à la bibliothèque",
                            );
                          }}
                        >
                          {c.saved ? "Retirer" : "Enregistrer"}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            s.patch({ selectedCreative: c.id });
                            router.push(route("C5.6"));
                          }}
                        >
                          Retoucher
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() =>
                            download(
                              "lyads-creative.txt",
                              c.name + "\n\n" + c.text,
                            )
                          }
                        >
                          Exporter
                        </Button>
                        <Button onClick={() => useCreative(c)}>
                          Utiliser →
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Empty
                title="Aucune créative dans cette vue"
                action={<Go to="C5.2">Créer une première variante</Go>}
              />
            )}
          </div>
        </DataState>
      )}
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Confirmer le script vidéo"
      >
        <div className="stack">
          <p>
            Une génération vidéo de démonstration consommera 45 crédits. Solde
            après génération : {s.credits - 45} crédits.
          </p>
          <p>{brief}</p>
          <Button disabled={s.credits < 45} onClick={generate}>
            Confirmer · 45 crédits
          </Button>
        </div>
      </Modal>
    </>
  );
}
export function CreativeAnalysis({ refId }: { refId: string }) {
  const s = useApp(),
    router = useRouter(),
    n = Number(refId.split(".")[1]);
  const [search, setSearch] = useState(""),
    [busy, setBusy] = useState(false);
  const all = s.creatives.filter(
    (c) => c.accountId === s.accountId && !c.created,
  );
  const current = all.find((c) => c.id === s.selectedCreative) ?? all[0];
  const items = all.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) &&
      (n !== 4 || c.frequency >= 4) &&
      (n !== 5 || (c.roas >= 4 && c.spend < 30000)),
  );
  const analyse = async () => {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 700));
    if (s.charge(8, "Analyse créative complète")) {
      s.notify("Analyse de démonstration terminée");
    }
    setBusy(false);
  };
  return (
    <>
      <Heading
        eyebrow="Comprendre ce qui fonctionne"
        title={
          [
            "",
            "Analyse créative",
            "Détail de la créative",
            "Analyse des éléments",
            "Fatigue créative",
            "Gagnants enterrés",
            "Propositions d’itération",
          ][n]
        }
        description="Comparez les signaux de vos publicités et préparez la prochaine version. Les résultats présentés sont fictifs."
        action={
          <Button disabled={busy} onClick={analyse}>
            {busy ? "Analyse…" : "Analyser · 8 crédits"}
          </Button>
        }
      />
      <DataState>
        {!all.length ? (
          <Empty />
        ) : [1, 4, 5].includes(n) ? (
          <div className="stack">
            {n === 4 && (
              <Alert>
                Une fréquence élevée signale une répétition. Elle ne suffit pas
                à démontrer une baisse de performance.
              </Alert>
            )}
            {n === 5 && (
              <AgentBox>
                Créatives avec un ROAS supérieur à 4 et moins de 30 000 FCFA
                dépensés dans le jeu de démonstration.
              </AgentBox>
            )}
            <Search
              value={search}
              onChange={setSearch}
              placeholder="Rechercher dans l’analyse"
            />
            {items.length ? (
              <div className="creative-grid">
                {items.map((c) => (
                  <Card key={c.id} className="creative-card">
                    <Thumb creative={c} />
                    <div className="creative-body stack tight">
                      <h3>{c.name}</h3>
                      <div className="row between">
                        <Badge tone={c.score > 75 ? "good" : "warn"}>
                          Score {c.score}/100
                        </Badge>
                        <span className="num">ROAS {ratio(c.roas)}</span>
                      </div>
                      <small>
                        {money(c.spend)} dépensés · fréquence{" "}
                        {ratio(c.frequency)}
                      </small>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          s.patch({ selectedCreative: c.id });
                          router.push(route("C6.2"));
                        }}
                      >
                        Voir l’analyse →
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Empty title="Aucun signal dans cette catégorie" />
            )}
          </div>
        ) : current ? (
          <div className="wizard-layout">
            <div className="stack">
              {n === 2 && (
                <>
                  <Card className="creative-card">
                    <Thumb creative={current} />
                  </Card>
                  <div className="grid3">
                    {[
                      ["Score", current.score + "/100"],
                      ["ROAS", ratio(current.roas)],
                      ["Fréquence", ratio(current.frequency)],
                    ].map(([a, b]) => (
                      <Card key={a}>
                        <small>{a}</small>
                        <h2 className="num">{b}</h2>
                      </Card>
                    ))}
                  </div>
                </>
              )}
              {n === 3 && (
                <Card>
                  <h2>Ce que chaque élément apporte</h2>
                  {[
                    ["Accroche", "Claire et centrée sur le bénéfice", 86],
                    ["Produit", "Le produit reste identifiable", 91],
                    [
                      "Appel à l’action",
                      "Rendre la prochaine étape plus précise",
                      62,
                    ],
                    [
                      "Identité de marque",
                      "Les codes de la marque restent cohérents",
                      88,
                    ],
                  ].map(([a, b, c]) => (
                    <div className="list-row" key={a}>
                      <div className="grow">
                        <h3>{a}</h3>
                        <p className="muted">{b}</p>
                        <Progress value={Number(c)} />
                      </div>
                      <Badge>{c}/100</Badge>
                    </div>
                  ))}
                </Card>
              )}
              {n === 6 ? (
                <div className="stack">
                  {[
                    "Une accroche plus directe",
                    "Une preuve au premier plan",
                    "Un appel à l’action plus précis",
                  ].map((t, i) => (
                    <Card key={t}>
                      <div className="stack tight">
                        <Badge tone="info">Variante {i + 1}</Badge>
                        <h2>{t}</h2>
                        <p>{current.text}</p>
                        <Button
                          onClick={() => {
                            s.patch({
                              draft: {
                                ...s.draft,
                                brief: t + " — " + current.text,
                              },
                            });
                            router.push(route("C5.2"));
                          }}
                        >
                          Développer dans le Studio →
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <AgentBox>
                  <h2>
                    {current.frequency > 4
                      ? "Un renouvellement est à tester"
                      : "Une base à décliner"}
                  </h2>
                  <p>
                    Conservez le bénéfice principal et testez une nouvelle
                    accroche. Ces suggestions de démonstration ne prédisent pas
                    les résultats futurs.
                  </p>
                  <Go to="C6.6">Voir les propositions</Go>
                </AgentBox>
              )}
            </div>
            <Card>
              <div className="stack">
                <h2>{current.name}</h2>
                <p>{current.text}</p>
                <Badge>{current.format}</Badge>
                <Go to="C6.3">Détail des éléments</Go>
                <Go to="C6.4">Voir la fatigue</Go>
                <Button
                  variant="secondary"
                  onClick={() =>
                    download(
                      "analyse-creative.json",
                      JSON.stringify(current, null, 2),
                      "application/json",
                    )
                  }
                >
                  Exporter l’analyse
                </Button>
              </div>
            </Card>
          </div>
        ) : (
          <Empty />
        )}
      </DataState>
    </>
  );
}
