"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useApp, Creative } from "@/lib/store";
import { route } from "@/lib/screens";
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
  Thumb,
  Search,
  Modal,
  Progress,
  Alert,
  download,
} from "./ui";
import { DataState } from "./dashboard";
const catalog: Creative[] = [
  "Maison Naya",
  "Karité & Co",
  "Rituel Nature",
  "Atelier Soin",
  "Baobab Studio",
  "Essentiel Beauté",
].map((name, i) => ({
  id: "m" + (i + 1),
  accountId: "market",
  name,
  format: i % 2 ? "Vidéo" : "Image",
  text: [
    "Un rituel simple, des ingrédients essentiels.",
    "Découvrez la collection de saison.",
    "Le soin commence par vous.",
  ][i % 3],
  color: ["sand", "forest", "clay", "mint", "rose", "dark"][i],
  score: 0,
  spend: 0,
  roas: 0,
  frequency: 0,
  saved: false,
  created: false,
}));
export function Market({ refId }: { refId: string }) {
  const s = useApp(),
    router = useRouter(),
    n = Number(refId.split(".")[1]);
  const [search, setSearch] = useState(""),
    [country, setCountry] = useState("Tous"),
    [format, setFormat] = useState("Tous"),
    [collection, setCollection] = useState(s.selectedCollection),
    [name, setName] = useState(""),
    [modal, setModal] = useState(false),
    [busy, setBusy] = useState(false),
    [fail, setFail] = useState(false),
    [topic, setTopic] = useState("Soins naturels au Sénégal");
  const { data = catalog, isPending } = useQuery({
    queryKey: ["market-demo"],
    queryFn: async () => catalog,
  });
  const current = data.find((c) => c.id === s.selectedMarket) ?? data[0];
  const col =
    s.collections.find((c) => c.id === collection) ?? s.collections[0];
  const items = data.filter(
    (c, i) =>
      c.name.toLowerCase().includes(search.toLowerCase()) &&
      (format === "Tous" || c.format === format) &&
      (country === "Tous" || i % 2 === (country === "Sénégal" ? 0 : 1)) &&
      (n !== 4 || col?.items.includes(c.id)),
  );
  const save = (id: string) => {
    if (!col) {
      s.notify("Créez d’abord une collection.");
      return;
    }
    s.patch({
      collections: s.collections.map((c) =>
        c.id === col.id
          ? {
              ...c,
              items: c.items.includes(id)
                ? c.items.filter((x) => x !== id)
                : [...c.items, id],
            }
          : c,
      ),
    });
    s.notify(
      col.items.includes(id)
        ? "Retirée de la collection"
        : "Ajoutée à " + col.name,
    );
  };
  const analyse = async () => {
    if (topic.trim().length < 5) {
      s.notify("Précisez votre marché.");
      return;
    }
    if (s.credits < 48) {
      s.notify("48 crédits sont nécessaires.");
      return;
    }
    setBusy(true);
    await new Promise((r) => setTimeout(r, 1000));
    if (fail) {
      setBusy(false);
      s.notify("Analyse interrompue. Aucun crédit débité.");
      return;
    }
    if (s.charge(48, "Analyse de marché : " + topic)) {
      s.patch({
        marketAnalyses: [
          { id: crypto.randomUUID(), name: topic, at: Date.now(), volume: 6 },
          ...useApp.getState().marketAnalyses,
        ],
      });
      router.push(route("C8.6"));
    }
    setBusy(false);
  };
  return (
    <>
      <Heading
        eyebrow="Intelligence marché"
        title={
          [
            "",
            "Explorez votre marché",
            "Détail de la publicité",
            "Vos collections",
            "Collection d’inspirations",
            "Lancer une analyse",
            "Rapport de marché",
            "Axes créatifs",
            "Historique des analyses",
          ][n]
        }
        description="Bibliothèque et analyses de démonstration : marques fictives, aucun résultat publicitaire concurrent réel."
        action={
          <Go to="C8.5" variant="primary">
            Analyser un marché · 48 crédits
          </Go>
        }
      />
      <DataState>
        {[1, 4].includes(n) && (
          <div className="stack">
            <div className="table-tools">
              <Search
                value={search}
                onChange={setSearch}
                placeholder="Rechercher une marque"
              />
              <Select
                label="Pays"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              >
                {["Tous", "Sénégal", "France"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </Select>
              <Select
                label="Format"
                value={format}
                onChange={(e) => setFormat(e.target.value)}
              >
                {["Tous", "Image", "Vidéo"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </Select>
              <Select
                label="Collection active"
                value={collection}
                onChange={(e) => setCollection(e.target.value)}
              >
                {s.collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            {isPending ? (
              <Progress value={40} />
            ) : items.length ? (
              <div className="creative-grid">
                {items.map((c) => (
                  <Card key={c.id} className="creative-card">
                    <Thumb creative={c} />
                    <div className="creative-body stack tight">
                      <Badge>Publicité fictive · {c.format}</Badge>
                      <h3>{c.name}</h3>
                      <p>{c.text}</p>
                      <div className="row wrap">
                        <Button
                          variant="secondary"
                          onClick={() => {
                            s.patch({ selectedMarket: c.id });
                            router.push(route("C8.2"));
                          }}
                        >
                          Voir le détail
                        </Button>
                        <Button variant="ghost" onClick={() => save(c.id)}>
                          {col?.items.includes(c.id)
                            ? "Retirer"
                            : "Collection +"}
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Empty title="Aucune publicité dans cette vue" />
            )}
          </div>
        )}
        {n === 2 && (
          <div className="grid2">
            <Card className="creative-card">
              <Thumb creative={current} />
            </Card>
            <Card>
              <div className="stack">
                <Badge>{current.format} · données fictives</Badge>
                <h2>{current.name}</h2>
                <p>{current.text}</p>
                <p className="muted">
                  Diffusion illustrée sur Facebook et Instagram. Les dépenses et
                  le ROAS des concurrents ne sont pas disponibles.
                </p>
                <Select
                  label="Enregistrer dans"
                  value={collection}
                  onChange={(e) => setCollection(e.target.value)}
                >
                  {s.collections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
                <Button onClick={() => save(current.id)}>
                  {col?.items.includes(current.id)
                    ? "Retirer de la collection"
                    : "Enregistrer dans la collection"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    s.patch({
                      draft: {
                        ...s.draft,
                        brief:
                          "Créer une approche originale autour de : " +
                          current.text,
                      },
                    });
                    router.push(route("C5.2"));
                  }}
                >
                  S’inspirer dans le Studio
                </Button>
              </div>
            </Card>
          </div>
        )}
        {n === 3 && (
          <div className="stack">
            <Button onClick={() => setModal(true)}>Nouvelle collection</Button>
            <div className="grid3">
              {s.collections.map((c) => (
                <Card key={c.id}>
                  <div className="stack">
                    <Badge>{c.items.length} publicités</Badge>
                    <h2>{c.name}</h2>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        s.patch({ selectedCollection: c.id });
                        setCollection(c.id);
                        router.push(route("C8.4") + "?collection=" + c.id);
                      }}
                    >
                      Ouvrir la collection
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        if (c.items.length) {
                          s.notify(
                            "Retirez les publicités avant de supprimer la collection.",
                          );
                          return;
                        }
                        s.patch({
                          collections: s.collections.filter(
                            (x) => x.id !== c.id,
                          ),
                        });
                      }}
                    >
                      Supprimer la collection vide
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
        {n === 5 && (
          <div className="wizard-layout">
            <Card>
              <div className="stack">
                <Field
                  label="Secteur, pays ou question à explorer"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
                <Alert tone="info">
                  Échantillon de démonstration : 6 publicités fictives. Le
                  rapport présente des hypothèses à tester.
                </Alert>
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={fail}
                    onChange={(e) => setFail(e.target.checked)}
                  />{" "}
                  Tester un échec de l’analyse
                </label>
                {busy && <Progress value={60} />}
                <Button disabled={busy || s.credits < 48} onClick={analyse}>
                  {busy ? "Analyse…" : "Lancer · 48 crédits"}
                </Button>
              </div>
            </Card>
            <AgentBox>
              <h3>Ce que vous obtiendrez</h3>
              <p>
                Les messages récurrents, les formats et des axes créatifs
                possibles.
              </p>
              <small>Solde : {s.credits} crédits</small>
            </AgentBox>
          </div>
        )}
        {n === 6 && (
          <div className="stack">
            <Card>
              <Heading
                title={
                  s.marketAnalyses[0]?.name ??
                  "Soins naturels · rapport exemple"
                }
                description="6 publicités fictives • exemple pédagogique"
                action={
                  <Button
                    variant="secondary"
                    onClick={() =>
                      download(
                        "rapport-marche.json",
                        JSON.stringify(
                          {
                            title: s.marketAnalyses[0]?.name ?? "Exemple",
                            sample: 6,
                            insights: [
                              "Bénéfice clair",
                              "Démonstration du produit",
                              "Rituel quotidien",
                            ],
                            demo: true,
                          },
                          null,
                          2,
                        ),
                        "application/json",
                      )
                    }
                  >
                    Exporter
                  </Button>
                }
              />
              <div className="grid3">
                {[
                  ["3/6", "Le bénéfice d’abord"],
                  ["2/6", "Démonstration du produit"],
                  ["1/6", "Preuve par témoignage"],
                ].map(([v, t]) => (
                  <Card key={t}>
                    <h2 className="num">{v}</h2>
                    <p>{t}</p>
                  </Card>
                ))}
              </div>
            </Card>
            <AgentBox>
              <h2>Une occasion de rendre le rituel concret</h2>
              <p>
                Testez une démonstration simple, puis comparez les résultats sur
                votre propre compte. Cet échantillon ne permet pas d’estimer les
                performances du marché.
              </p>
              <Go to="C8.7">Explorer les axes créatifs</Go>
            </AgentBox>
          </div>
        )}
        {n === 7 && (
          <div className="grid3">
            {[
              "Montrer le geste quotidien",
              "Expliquer un seul bénéfice",
              "Mettre le produit en situation",
            ].map((t) => (
              <Card key={t}>
                <div className="stack">
                  <Badge tone="info">Hypothèse créative</Badge>
                  <h2>{t}</h2>
                  <p className="muted">
                    Un point de départ à adapter à votre marque et à tester.
                  </p>
                  <Button
                    onClick={() => {
                      s.patch({
                        draft: {
                          ...s.draft,
                          brief: t + " pour " + s.brain.company,
                        },
                      });
                      router.push(route("C5.2"));
                    }}
                  >
                    Créer une variante
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
        {n === 8 &&
          (s.marketAnalyses.length ? (
            <Card>
              {s.marketAnalyses.map((a) => (
                <div className="list-row" key={a.id}>
                  <div className="grow">
                    <h3>{a.name}</h3>
                    <small>
                      {new Date(a.at).toLocaleString("fr-FR")} · {a.volume}{" "}
                      publicités
                    </small>
                  </div>
                  <Go to="C8.6">Ouvrir</Go>
                </div>
              ))}
            </Card>
          ) : (
            <Empty
              title="Aucune analyse lancée"
              action={<Go to="C8.5">Lancer votre première analyse</Go>}
            />
          ))}
      </DataState>
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Nouvelle collection"
      >
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            const id = crypto.randomUUID();
            s.patch({
              collections: [
                ...s.collections,
                { id, name: name.trim(), items: [] },
              ],
            });
            setCollection(id);
            setModal(false);
            setName("");
          }}
        >
          <Field
            label="Nom de la collection"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button>Créer la collection</Button>
        </form>
      </Modal>
    </>
  );
}
