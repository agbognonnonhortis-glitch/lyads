"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApp, accounts, plans } from "@/lib/store";
import { screens, route } from "@/lib/screens";
import { money } from "@/lib/domain";
import { BrainFields } from "./onboarding";
import { PlanCards } from "./public";
import {
  Button,
  Go,
  Card,
  Field,
  Area,
  Select,
  Heading,
  Badge,
  Empty,
  Toggle,
  Modal,
  Progress,
  Alert,
  download,
} from "./ui";
export function Brain({ refId }: { refId: string }) {
  const s = useApp(),
    n = Number(refId.split(".")[1]);
  const [edit, setEdit] = useState(false),
    [product, setProduct] = useState(""),
    [price, setPrice] = useState(7500),
    [desc, setDesc] = useState("");
  return (
    <>
      <Heading
        eyebrow="Contexte de marque"
        title={
          n === 1
            ? "Votre Business Brain"
            : n === 2
              ? "Produits et offres"
              : "Historique du Business Brain"
        }
        description="Ce contexte alimente vos propositions et vos briefs créatifs."
      />
      {n === 1 ? (
        <Card>
          {edit ? (
            <form
              className="stack"
              onSubmit={(e) => {
                e.preventDefault();
                s.log("Contexte entreprise mis à jour", "brain");
                setEdit(false);
                s.notify("Business Brain enregistré");
              }}
            >
              <BrainFields />
              <Button>Enregistrer le contexte</Button>
            </form>
          ) : (
            <div className="stack">
              <div className="row between">
                <h2>{s.brain.company}</h2>
                <Button
                  variant="secondary"
                  onClick={() => {
                    s.patch({
                      brainVersions: [
                        {
                          id: crypto.randomUUID(),
                          at: Date.now(),
                          value: { ...s.brain },
                        },
                        ...s.brainVersions,
                      ],
                    });
                    setEdit(true);
                  }}
                >
                  Modifier
                </Button>
              </div>
              {[
                ["Site", s.brain.site],
                ["Offre", s.brain.offer],
                ["Audience", s.brain.audience],
                ["Objectif", s.brain.objective],
                ["Ton", s.brain.tone],
                ["À éviter", s.brain.forbidden],
                ["CPA cible", money(s.brain.cpa)],
                ["Budget mensuel", money(s.brain.budget)],
              ].map(([l, v]) => (
                <div key={l}>
                  <small>{l}</small>
                  <p>{v || "Non renseigné"}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : n === 2 ? (
        <div className="grid2">
          <div className="stack">
            {s.products.map((p) => (
              <Card key={p.id}>
                <div className="stack tight">
                  <h2>{p.name}</h2>
                  <p>{p.description}</p>
                  <strong className="num">{money(p.price)}</strong>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      s.patch({
                        products: s.products.filter((x) => x.id !== p.id),
                      });
                      s.log("Produit retiré : " + p.name, "brain");
                    }}
                  >
                    Retirer du catalogue
                  </Button>
                </div>
              </Card>
            ))}
          </div>
          <Card>
            <form
              className="stack"
              onSubmit={(e) => {
                e.preventDefault();
                if (!product.trim() || price < 0) return;
                s.patch({
                  products: [
                    ...s.products,
                    {
                      id: crypto.randomUUID(),
                      name: product,
                      price,
                      description: desc,
                    },
                  ],
                });
                s.log("Produit ajouté : " + product, "brain");
                setProduct("");
                setDesc("");
              }}
            >
              <h2>Ajouter un produit ou une offre</h2>
              <Field
                label="Nom"
                required
                value={product}
                onChange={(e) => setProduct(e.target.value)}
              />
              <Field
                label="Prix en FCFA"
                type="number"
                min="0"
                required
                value={price}
                onChange={(e) => setPrice(+e.target.value)}
              />
              <Area label="Description" value={desc} onChange={setDesc} />
              <Button>Ajouter</Button>
            </form>
          </Card>
        </div>
      ) : (
        <div className="stack">
          {s.brainVersions.length > 0 && (
            <Card>
              <h2>Versions sauvegardées</h2>
              {s.brainVersions.map((v) => (
                <div className="list-row" key={v.id}>
                  <div className="grow">
                    <h3>{String(v.value.company)}</h3>
                    <small>{new Date(v.at).toLocaleString("fr-FR")}</small>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      s.patch({ brain: v.value as typeof s.brain });
                      s.log("Version du contexte restaurée", "brain");
                      s.notify("Contexte restauré");
                    }}
                  >
                    Restaurer
                  </Button>
                </div>
              ))}
            </Card>
          )}
          {s.activity.filter((a) => a.kind === "brain").length ? (
            <Card>
              {s.activity
                .filter((a) => a.kind === "brain")
                .map((a) => (
                  <div className="list-row" key={a.id}>
                    <div>
                      <h3>{a.label}</h3>
                      <small>{new Date(a.at).toLocaleString("fr-FR")}</small>
                    </div>
                  </div>
                ))}
            </Card>
          ) : (
            <Empty title="Aucune modification enregistrée" />
          )}
        </div>
      )}
    </>
  );
}
export function Settings({ refId }: { refId: string }) {
  const s = useApp(),
    router = useRouter(),
    n = Number(refId.split(".")[1]);
  const [modal, setModal] = useState(""),
    [pack, setPack] = useState(500),
    [email, setEmail] = useState(""),
    [role, setRole] = useState("Analyste"),
    [confirmation, setConfirmation] = useState(""),
    [memberId, setMemberId] = useState("");
  const save = (label: string) => {
    s.log(label, "settings");
    s.notify(label);
  };
  const currency = accounts.find((a) => a.id === s.accountId)?.devise ?? "XOF";
  return (
    <>
      <Heading
        title="Paramètres"
        description="Gérez votre espace, vos accès et votre consommation."
      />
      <div className="settings-layout">
        <nav className="settings-nav">
          {screens
            .filter((x) => x.ref.startsWith("C11."))
            .map((x) => (
              <Link
                prefetch={false}
                key={x.ref}
                className={x.ref === refId ? "active" : ""}
                href={x.path}
              >
                {x.title}
              </Link>
            ))}
        </nav>
        <div className="stack">
          {n === 1 && (
            <Card>
              <form
                className="stack"
                onSubmit={(e) => {
                  e.preventDefault();
                  save("Profil enregistré");
                }}
              >
                <h2>Profil et préférences</h2>
                <Field
                  label="Nom complet"
                  required
                  value={s.profile.name}
                  onChange={(e) =>
                    s.patch({ profile: { ...s.profile, name: e.target.value } })
                  }
                />
                <Field
                  label="Adresse e-mail"
                  type="email"
                  required
                  value={s.profile.email}
                  onChange={(e) =>
                    s.patch({
                      profile: { ...s.profile, email: e.target.value },
                    })
                  }
                />
                <Field
                  label="Entreprise"
                  value={s.profile.company}
                  onChange={(e) =>
                    s.patch({
                      profile: { ...s.profile, company: e.target.value },
                    })
                  }
                />
                <Select
                  label="Apparence"
                  value={s.theme}
                  onChange={(e) =>
                    s.patch({ theme: e.target.value as "light" | "dark" })
                  }
                >
                  <option value="light">Clair</option>
                  <option value="dark">Sombre</option>
                </Select>
                <Field label="Langue" value="Français" readOnly />
                <Button>Enregistrer les préférences</Button>
              </form>
            </Card>
          )}
          {n === 2 && (
            <>
              <Card>
                <div className="row between wrap">
                  <div>
                    <h2>Connexion Meta</h2>
                    <Badge tone={s.metaConnected ? "good" : "bad"}>
                      {s.metaConnected
                        ? "Connectée · simulation"
                        : "Interrompue"}
                    </Badge>
                  </div>
                  <Button
                    variant={s.metaConnected ? "secondary" : "primary"}
                    onClick={() =>
                      s.metaConnected
                        ? setModal("meta")
                        : (s.patch({ metaConnected: true }),
                          save("Meta reconnecté en démonstration"))
                    }
                  >
                    {s.metaConnected ? "Déconnecter" : "Reconnecter Meta"}
                  </Button>
                </div>
              </Card>
              <Card>
                <h2>Comptes disponibles</h2>
                {accounts.map((a) => (
                  <div className="list-row" key={a.id}>
                    <div className="grow">
                      <h3>{a.nom}</h3>
                      <small>
                        {a.devise} · {a.id}
                      </small>
                    </div>
                    <Button
                      variant="secondary"
                      disabled={s.accountId === a.id}
                      onClick={() => s.switchAccount(a.id)}
                    >
                      {s.accountId === a.id ? "Actif" : "Sélectionner"}
                    </Button>
                  </div>
                ))}
              </Card>
              <Alert tone="info">
                Les autorisations sont simulées. Aucun accès Meta réel n’est
                conservé.
              </Alert>
            </>
          )}
          {n === 3 && (
            <>
              <Card>
                <div className="stack">
                  <Badge tone="good">Plan {s.plan.toUpperCase()}</Badge>
                  <h2>
                    {s.credits} crédits restants sur {s.maxCredits}
                  </h2>
                  <Progress
                    value={((s.maxCredits - s.credits) / s.maxCredits) * 100}
                  />
                  <small>
                    Catalogue de démonstration. Aucun paiement réel.
                  </small>
                </div>
              </Card>
              <PlanCards
                onChoose={(id) => {
                  const p = plans.find((x) => x.id === id);
                  if (!p) return;
                  s.patch({
                    plan: id,
                    maxCredits: p.credits,
                    credits: p.credits,
                  });
                  save("Plan " + id + " activé en démonstration");
                }}
              />
            </>
          )}
          {n === 4 && (
            <>
              <Card>
                <div className="stack">
                  <h2 className="num">{s.credits} crédits disponibles</h2>
                  <Progress value={(s.credits / s.maxCredits) * 100} />
                  <div className="grid2">
                    <Select
                      label="Recharge de démonstration"
                      value={pack}
                      onChange={(e) => setPack(+e.target.value)}
                    >
                      {[100, 500, 1500].map((x) => (
                        <option key={x} value={x}>
                          {x} crédits
                        </option>
                      ))}
                    </Select>
                    <Field
                      label="Seuil d’alerte (%)"
                      type="number"
                      min="0"
                      max="100"
                      value={s.creditThreshold}
                      onChange={(e) =>
                        s.patch({
                          creditThreshold: Math.max(
                            0,
                            Math.min(100, +e.target.value),
                          ),
                        })
                      }
                    />
                  </div>
                  <Button onClick={() => setModal("credits")}>
                    Ajouter {pack} crédits · simulation
                  </Button>
                </div>
              </Card>
              <Card>
                <h2>Historique de consommation</h2>
                {s.activity.filter((a) => a.kind === "credit").length ? (
                  s.activity
                    .filter((a) => a.kind === "credit")
                    .map((a) => (
                      <div className="list-row" key={a.id}>
                        <div className="grow">
                          <h3>{a.label}</h3>
                          <small>
                            {new Date(a.at).toLocaleString("fr-FR")}
                          </small>
                        </div>
                        <strong className="num">−{a.credits}</strong>
                      </div>
                    ))
                ) : (
                  <p className="inline-note">
                    Aucune consommation depuis le démarrage de la démonstration.
                  </p>
                )}
              </Card>
            </>
          )}
          {n === 5 && (
            <Card>
              <div className="stack">
                <h2>Facturation</h2>
                <Field
                  label="Entreprise facturée"
                  value={s.profile.company}
                  onChange={(e) =>
                    s.patch({
                      profile: { ...s.profile, company: e.target.value },
                    })
                  }
                />
                <Alert>
                  Les documents ci-dessous sont des exemples sans valeur
                  comptable.
                </Alert>
                {["Septembre 2026", "Août 2026", "Juillet 2026"].map((m, i) => (
                  <div className="list-row" key={m}>
                    <div className="grow">
                      <h3>{m}</h3>
                      <small>Exemple de facture · plan Pro</small>
                    </div>
                    <Badge tone="good">Simulation</Badge>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        download(
                          "facture-demo-" + (i + 1) + ".txt",
                          "EXEMPLE SANS VALEUR COMPTABLE\nLyads — " +
                            m +
                            "\nEntreprise : " +
                            s.profile.company +
                            "\nPlan : Pro\nAucun paiement effectué.",
                        )
                      }
                    >
                      Télécharger
                    </Button>
                  </div>
                ))}
                <Button
                  onClick={() =>
                    save("Coordonnées de facturation enregistrées")
                  }
                >
                  Enregistrer
                </Button>
              </div>
            </Card>
          )}
          {n === 6 && (
            <Card>
              <h2>Préférences de notifications</h2>
              <p className="inline-note">
                Préférences sauvegardées localement. Aucun e-mail ou message
                n’est envoyé.
              </p>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Événement</th>
                      {["Dans Lyads", "E-mail", "Résumé"].map((x) => (
                        <th key={x}>{x}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      "Recommandation critique",
                      "Budget épuisé",
                      "Publicité rejetée",
                      "Fatigue créative",
                      "Analyse terminée",
                      "Rapport disponible",
                      "Solde faible",
                      "Connexion Meta",
                      "Activité de l’équipe",
                    ].map((event) => (
                      <tr key={event}>
                        <td>{event}</td>
                        {["Dans Lyads", "E-mail", "Résumé"].map((channel) => (
                          <td key={channel}>
                            <Toggle
                              label={event + " — " + channel}
                              checked={
                                s.notifications[event + channel] ??
                                channel === "Dans Lyads"
                              }
                              onChange={() =>
                                s.patch({
                                  notifications: {
                                    ...s.notifications,
                                    [event + channel]: !(
                                      s.notifications[event + channel] ??
                                      channel === "Dans Lyads"
                                    ),
                                  },
                                })
                              }
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
          {n === 7 && (
            <>
              <Card>
                <h2>Équipe et accès</h2>
                {s.members.map((m) => (
                  <div className="list-row wrap" key={m.id}>
                    <div className="grow">
                      <h3>{m.name}</h3>
                      <small>
                        {m.email} · {m.account}
                      </small>
                    </div>
                    <Select
                      label={"Rôle de " + m.name}
                      value={m.role}
                      disabled={m.id === "member1"}
                      onChange={(e) =>
                        s.patch({
                          members: s.members.map((x) =>
                            x.id === m.id ? { ...x, role: e.target.value } : x,
                          ),
                        })
                      }
                    >
                      {["Administrateur", "Éditeur", "Analyste"].map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </Select>
                    {m.id !== "member1" && (
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setMemberId(m.id);
                          setModal("member");
                        }}
                      >
                        Retirer
                      </Button>
                    )}
                  </div>
                ))}
              </Card>
              <Card>
                <form
                  className="stack"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (s.members.some((m) => m.email === email)) {
                      s.notify("Cette adresse fait déjà partie de l’équipe.");
                      return;
                    }
                    s.patch({
                      members: [
                        ...s.members,
                        {
                          id: crypto.randomUUID(),
                          name: email.split("@")[0],
                          email,
                          role,
                          account:
                            accounts.find((a) => a.id === s.accountId)?.nom ??
                            "Compte actif",
                        },
                      ],
                    });
                    save(
                      "Membre ajouté à la démonstration, sans invitation envoyée",
                    );
                    setEmail("");
                  }}
                >
                  <h2>Ajouter un membre de démonstration</h2>
                  <Field
                    label="Adresse e-mail"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Select
                    label="Rôle"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    {["Administrateur", "Éditeur", "Analyste"].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </Select>
                  <Button>Ajouter localement</Button>
                </form>
              </Card>
            </>
          )}
          {n === 8 && (
            <>
              <Card>
                <div className="stack">
                  <h2>Sécurité et session</h2>
                  <p>
                    Session locale de démonstration. Aucun mot de passe n’est
                    conservé dans le navigateur.
                  </p>
                  <Go to="A6">Réinitialiser le mot de passe</Go>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      s.patch({ auth: false });
                      router.push(route("A4"));
                    }}
                  >
                    Se déconnecter
                  </Button>
                </div>
              </Card>
              <Card>
                <div className="stack">
                  <h2>Réinitialiser cet espace local</h2>
                  <p>
                    Cette action efface vos modifications de démonstration et
                    restaure les exemples initiaux.
                  </p>
                  <Button variant="danger" onClick={() => setModal("reset")}>
                    Réinitialiser les données locales
                  </Button>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
      <Modal
        open={!!modal}
        onClose={() => {
          setModal("");
          setConfirmation("");
        }}
        title={
          modal === "credits"
            ? "Confirmer la recharge locale"
            : modal === "meta"
              ? "Déconnecter Meta"
              : modal === "member"
                ? "Retirer le membre"
                : "Réinitialiser la démonstration"
        }
      >
        <div className="stack">
          <p>
            {modal === "credits"
              ? `${pack} crédits seront ajoutés gratuitement au solde local. Aucun paiement ne sera effectué.`
              : modal === "meta"
                ? "Les modifications de campagnes seront bloquées jusqu’à la reconnexion simulée."
                : modal === "member"
                  ? "Le membre sera retiré de cette équipe de démonstration."
                  : "Saisissez EFFACER pour rétablir toutes les données de démonstration."}
          </p>
          {modal === "reset" && (
            <Field
              label="Confirmation"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />
          )}
          <Button
            disabled={modal === "reset" && confirmation !== "EFFACER"}
            onClick={() => {
              if (modal === "credits") {
                s.patch({ credits: s.credits + pack });
                save(pack + " crédits ajoutés en démonstration");
              } else if (modal === "meta") {
                s.patch({ metaConnected: false });
                save("Connexion Meta interrompue");
              } else if (modal === "member") {
                s.patch({
                  members: s.members.filter((m) => m.id !== memberId),
                });
                save("Membre retiré");
              } else {
                s.reset();
                router.push("/");
              }
              setModal("");
              setConfirmation("");
            }}
          >
            Confirmer
          </Button>
        </div>
      </Modal>
    </>
  );
}
