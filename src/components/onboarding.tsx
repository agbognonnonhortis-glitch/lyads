"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  ShieldCheck,
  Globe,
  Sparkle,
  Link as LinkIcon,
} from "@phosphor-icons/react";
import { Screen, route } from "@/lib/screens";
import { useApp, accounts } from "@/lib/store";
import {
  Card,
  Button,
  Go,
  Heading,
  Field,
  Area,
  Select,
  Alert,
  Progress,
  Badge,
  AgentBox,
  Toggle,
} from "./ui";
import { Logo } from "./shell";
import { PlanCards } from "./public";
export function BrainFields() {
  const s = useApp();
  return (
    <div className="stack">
      <div className="grid2">
        <Field
          label="Nom de l’entreprise"
          required
          value={s.brain.company}
          onChange={(e) =>
            s.patch({ brain: { ...s.brain, company: e.target.value } })
          }
        />
        <Field
          label="Site web (facultatif)"
          type="url"
          value={s.brain.site}
          onChange={(e) =>
            s.patch({ brain: { ...s.brain, site: e.target.value } })
          }
        />
      </div>
      <Area
        label="Votre offre et vos produits"
        value={s.brain.offer}
        onChange={(offer) => s.patch({ brain: { ...s.brain, offer } })}
        required
      />
      <Area
        label="Votre audience"
        value={s.brain.audience}
        onChange={(audience) => s.patch({ brain: { ...s.brain, audience } })}
        required
      />
      <div className="grid3">
        <Select
          label="Objectif principal"
          value={s.brain.objective}
          onChange={(e) =>
            s.patch({ brain: { ...s.brain, objective: e.target.value } })
          }
        >
          <option>Ventes en ligne</option>
          <option>Prospects</option>
          <option>Notoriété</option>
          <option>Messages</option>
        </Select>
        <Field
          label="CPA cible"
          type="number"
          min="1"
          required
          value={s.brain.cpa}
          onChange={(e) =>
            s.patch({ brain: { ...s.brain, cpa: +e.target.value } })
          }
        />
        <Field
          label="Budget mensuel"
          type="number"
          min="1"
          required
          value={s.brain.budget}
          onChange={(e) =>
            s.patch({ brain: { ...s.brain, budget: +e.target.value } })
          }
        />
      </div>
      <Area
        label="Ton de marque"
        value={s.brain.tone}
        onChange={(tone) => s.patch({ brain: { ...s.brain, tone } })}
      />
      <Field
        label="Mots et promesses à éviter"
        value={s.brain.forbidden}
        onChange={(e) =>
          s.patch({ brain: { ...s.brain, forbidden: e.target.value } })
        }
      />
    </div>
  );
}
export function Onboarding({ screen }: { screen: Screen }) {
  const s = useApp(),
    router = useRouter();
  const n = +screen.ref.slice(1);
  const [progress, setProgress] = useState(0),
    [busy, setBusy] = useState(false),
    [failed, setFailed] = useState(false);
  const next = () => {
    if (n === 7) {
      if (
        !s.brain.company ||
        !s.brain.offer ||
        !s.brain.audience ||
        s.brain.cpa <= 0
      ) {
        s.notify(
          "Complétez l’entreprise, l’offre, l’audience et le CPA cible.",
        );
        return;
      }
      s.log("Business Brain enregistré · CPA cible " + s.brain.cpa, "brain");
    }
    router.push(route(n === 11 ? "C1.1" : "B" + (n + 1)));
  };
  const connect = async () => {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 900));
    s.patch({ metaConnected: true });
    setBusy(false);
    next();
  };
  const scan = async () => {
    setBusy(true);
    setFailed(false);
    for (let i = 0; i <= 100; i += 20) {
      setProgress(i);
      await new Promise((r) => setTimeout(r, 180));
    }
    setBusy(false);
    s.notify("Analyse du site simulée · vérifiez les informations proposées");
  };
  return (
    <>
      <div className="onboarding-header">
        <Logo />
        <div className="row">
          <Badge>Configuration · {n}/11</Badge>
          <Go to="C1.1" variant="ghost">
            Explorer d’abord
          </Go>
        </div>
      </div>
      <main className="onboarding">
        <div className="steps">
          {Array.from({ length: 11 }, (_, i) => (
            <button
              key={i}
              className={
                "step " + (i + 1 === n ? "current" : i + 1 < n ? "done" : "")
              }
              aria-label={"Étape " + (i + 1)}
              onClick={() => router.push(route("B" + (i + 1)))}
            >
              {i + 1 < n ? "✓" : i + 1}
            </button>
          ))}
        </div>
        <Heading
          title={screen.title}
          description={
            n <= 6
              ? "Connectez vos ressources publicitaires. Vous gardez le contrôle de chaque accès."
              : "Donnez à Lyads le contexte nécessaire pour des propositions pertinentes."
          }
        />
        {n === 10 ? (
          <PlanCards
            onChoose={(plan) => {
              s.patch({ plan });
              s.notify("Plan choisi pour la démonstration : " + plan);
              next();
            }}
          />
        ) : n === 11 ? (
          <div className="stack">
            <Card>
              <div className="row">
                <CheckCircle size={36} />
                <h2>Votre espace est prêt, {s.profile.name.split(" ")[0]}.</h2>
              </div>
              <div className="grid3" style={{ marginTop: "var(--ly-size-28)" }}>
                {[
                  ["Meta", s.metaConnected],
                  ["Instagram", s.brain.instagram],
                  ["Pixel", s.brain.pixel],
                ].map(([title, ok]) => (
                  <div key={String(title)}>
                    <h3>{title}</h3>
                    <Badge tone={ok ? "good" : "warn"}>
                      {ok ? "✓ Connecté" : "À compléter"}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
            <AgentBox>
              <h2>Commencez par les recommandations de votre compte</h2>
              <p className="inline-note">
                Les données que vous allez voir sont des exemples. Aucune
                analyse de compte réel n’a été effectuée.
              </p>
              <Go to="C1.1" variant="primary">
                Aller au tableau de bord <ArrowRight size={18} />
              </Go>
            </AgentBox>
          </div>
        ) : (
          <div className="wizard-layout">
            <Card>
              {n === 1 ? (
                <div className="stack">
                  <h2>Bonjour {s.profile.name.split(" ")[0]}</h2>
                  {[
                    [
                      "Votre compte sous surveillance",
                      "Les changements importants sont regroupés dans un même fil.",
                    ],
                    [
                      "Des corrections expliquées",
                      "Chaque recommandation présente le constat, les chiffres et son effet.",
                    ],
                    [
                      "Des créatives à votre image",
                      "Le studio s’appuie sur votre offre et votre ton de marque.",
                    ],
                    [
                      "La décision reste entre vos mains",
                      "Lyads ne publie jamais sans votre accord.",
                    ],
                  ].map(([title, body]) => (
                    <div className="list-row" key={title}>
                      <CheckCircle size={24} />
                      <div>
                        <h3>{title}</h3>
                        <p className="inline-note">{body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : n === 2 ? (
                <div className="stack">
                  <h2>Connectez votre compte Meta</h2>
                  {[
                    ["ads_read", "Lire les performances de vos campagnes"],
                    [
                      "ads_management",
                      "Préparer les modifications que vous validez",
                    ],
                    ["pages_show_list", "Sélectionner vos pages Facebook"],
                    ["business_management", "Retrouver vos Business Managers"],
                  ].map(([key, label]) => (
                    <div className="list-row" key={key}>
                      <ShieldCheck size={22} />
                      <div>
                        <h3>{label}</h3>
                        <small className="num">{key}</small>
                      </div>
                      <Badge>Requis</Badge>
                    </div>
                  ))}
                  <Alert tone="info">
                    Lyads ne publie jamais sans votre accord. Cette connexion
                    est simulée : aucun identifiant Meta n’est demandé.
                  </Alert>
                  <Button disabled={busy} onClick={connect}>
                    {busy
                      ? "Connexion en cours…"
                      : "Connecter Meta · démonstration"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      s.patch({ metaConnected: false });
                      router.push(route("B7"));
                    }}
                  >
                    Continuer sans autoriser Meta
                  </Button>
                </div>
              ) : n === 3 ? (
                <div className="stack">
                  {[
                    [
                      "bm_kola",
                      "Kola Distribution",
                      "Administrateur · 3 comptes",
                      "act_2841",
                    ],
                    [
                      "bm_sanou",
                      "Sanou Retail Group",
                      "Analyste · lecture seule",
                      "act_7715",
                    ],
                    [
                      "bm_export",
                      "Kola Export Europe",
                      "Administrateur · 1 compte",
                      "act_5508",
                    ],
                  ].map(([id, name, role, account]) => (
                    <button
                      key={id}
                      className={
                        "option-card " +
                        (accounts.find((a) => a.id === s.accountId)?.bm === id
                          ? "selected"
                          : "")
                      }
                      onClick={() => s.switchAccount(account)}
                    >
                      <span className="avatar">{name.slice(0, 2)}</span>
                      <div>
                        <h3>{name}</h3>
                        <p>{role}</p>
                      </div>
                    </button>
                  ))}
                  {s.readonly && (
                    <Alert>
                      Ce Business Manager permet la consultation. Les
                      modifications et publications seront désactivées.
                    </Alert>
                  )}
                </div>
              ) : n === 4 ? (
                <div className="stack">
                  {accounts.map((a) => (
                    <button
                      key={a.id}
                      className={
                        "option-card " +
                        (s.accountId === a.id ? "selected" : "")
                      }
                      onClick={() => s.switchAccount(a.id)}
                    >
                      <div className="grow">
                        <h3>{a.nom}</h3>
                        <p>
                          {a.devise === "XOF" ? "FCFA" : a.devise} ·{" "}
                          {"fuseau" in a ? a.fuseau : "Afrique de l’Ouest"}
                        </p>
                      </div>
                      {s.accountId === a.id && <CheckCircle size={24} />}
                    </button>
                  ))}
                  <Alert>
                    Un compte en EUR reste affiché en EUR. Les devises de
                    comptes différents ne sont jamais additionnées.
                  </Alert>
                </div>
              ) : n === 5 ? (
                <div className="stack">
                  {[
                    "Kola Beauté",
                    "Kola Distribution",
                    "Kola Pro — grossistes",
                  ].map((name) => (
                    <button
                      key={name}
                      className={
                        "option-card " +
                        (s.brain.page === name ? "selected" : "")
                      }
                      onClick={() =>
                        s.patch({
                          brain: {
                            ...s.brain,
                            page: name,
                            instagram: name !== "Kola Pro — grossistes",
                          },
                        })
                      }
                    >
                      <Globe size={24} />
                      <div>
                        <h3>{name}</h3>
                        <p>
                          {name === "Kola Pro — grossistes"
                            ? "Aucun compte Instagram lié"
                            : "Facebook + Instagram"}
                        </p>
                      </div>
                    </button>
                  ))}
                  {!s.brain.instagram && (
                    <Alert>
                      Les placements Instagram, Stories et Reels ne seront pas
                      disponibles.
                    </Alert>
                  )}
                </div>
              ) : n === 6 ? (
                <div className="stack">
                  <div className="row between">
                    <div>
                      <h3>Pixel Kola Beauté</h3>
                      <small>Événements de démonstration sur 7 jours</small>
                    </div>
                    <Toggle
                      label="Pixel connecté"
                      checked={s.brain.pixel}
                      onChange={() =>
                        s.patch({
                          brain: { ...s.brain, pixel: !s.brain.pixel },
                        })
                      }
                    />
                  </div>
                  {s.brain.pixel ? (
                    [
                      "Achat · 268",
                      "AddToCart · 1 420",
                      "InitiateCheckout · 412",
                      "Prospect · 38",
                    ].map((x, i) => (
                      <div className="list-row" key={x}>
                        <span className="grow">{x}</span>
                        <Badge tone={i === 3 ? "warn" : "good"}>
                          {i === 3 ? "◆ Volume faible" : "✓ Actif"}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <Alert>
                      Aucun pixel actif. Les recommandations liées aux
                      conversions seront limitées.
                    </Alert>
                  )}
                  <Select label="Événement principal">
                    <option>Achat</option>
                    <option>Prospect</option>
                    <option>InitiateCheckout</option>
                  </Select>
                </div>
              ) : n === 7 ? (
                <BrainFields />
              ) : n === 8 ? (
                <div className="stack">
                  <h2>Laissez Lyads lire votre site</h2>
                  <Field
                    label="Adresse du site"
                    type="url"
                    value={s.brain.site}
                    onChange={(e) =>
                      s.patch({ brain: { ...s.brain, site: e.target.value } })
                    }
                  />
                  <Alert tone="info">
                    L’analyse est simulée. Aucune requête n’est envoyée au site
                    saisi.
                  </Alert>
                  {failed ? (
                    <Alert tone="bad">
                      Site inaccessible. Vous pouvez remplir les informations à
                      la main sans perdre votre saisie.
                    </Alert>
                  ) : (
                    <>
                      <Progress value={progress} />
                      <p className="num">
                        {progress} % ·{" "}
                        {progress < 40
                          ? "Lecture des pages"
                          : progress < 80
                            ? "Identification de l’offre"
                            : "Préparation du récapitulatif"}
                      </p>
                    </>
                  )}
                  <Button disabled={busy} onClick={scan}>
                    {busy
                      ? "Analyse en cours…"
                      : progress === 100
                        ? "Relancer l’analyse"
                        : "Analyser mon site · démo"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setFailed(true);
                      setBusy(false);
                    }}
                  >
                    Simuler un site inaccessible
                  </Button>
                  <Go to="B7" variant="ghost">
                    Remplir les informations à la main
                  </Go>
                </div>
              ) : (
                <div className="stack">
                  <h2>Vérifiez ce que Lyads sait de vous</h2>
                  {[
                    ["Entreprise", s.brain.company],
                    ["Offre", s.brain.offer],
                    ["Audience", s.brain.audience],
                    ["Objectif", s.brain.objective],
                    ["CPA cible", s.brain.cpa + " FCFA"],
                    ["Ton de marque", s.brain.tone],
                  ].map(([k, v]) => (
                    <div className="list-row" key={k}>
                      <div className="grow">
                        <small>{k}</small>
                        <p>{v}</p>
                      </div>
                      <Badge tone="good">✓ Vérifiable</Badge>
                    </div>
                  ))}
                  <Go to="B7" variant="secondary">
                    Corriger les informations
                  </Go>
                </div>
              )}
            </Card>
            <aside className="wizard-aside stack">
              <AgentBox>
                <h3>Pourquoi cette étape ?</h3>
                <p className="inline-note">
                  {n < 7
                    ? "Les accès et ressources sélectionnés déterminent ce que vous pourrez consulter et préparer."
                    : "Vos réponses sont réutilisées pour écrire les créatives et évaluer vos performances."}
                </p>
              </AgentBox>
              <Card>
                <h3>Vos choix sont conservés</h3>
                <p className="inline-note">
                  Vous pouvez revenir sur chaque étape. Le contexte est
                  enregistré sur cet appareil.
                </p>
                <Go to="C1.1" variant="ghost">
                  Explorer le tableau de bord
                </Go>
              </Card>
            </aside>
          </div>
        )}
        {n !== 10 && n !== 11 && (
          <div className="wizard-footer">
            <Button
              variant="secondary"
              onClick={() => router.push(route(n === 1 ? "A5" : "B" + (n - 1)))}
            >
              <ArrowLeft size={18} />
              Retour
            </Button>
            <Button disabled={busy} onClick={next}>
              {n === 1
                ? "Commencer la configuration"
                : n === 9
                  ? "Valider mon Business Brain"
                  : "Continuer"}
              <ArrowRight size={18} />
            </Button>
          </div>
        )}
      </main>
    </>
  );
}
