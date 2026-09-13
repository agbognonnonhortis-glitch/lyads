"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Sparkle,
  ShieldCheck,
  CheckCircle,
  Envelope,
  List,
  Moon,
  Sun,
  ChartBar,
  Palette,
  GlobeHemisphereWest,
} from "@phosphor-icons/react";
import { useApp, plans } from "@/lib/store";
import { screens, Screen, route } from "@/lib/screens";
import { money, ratio } from "@/lib/domain";
import {
  Button,
  Go,
  Card,
  Field,
  Heading,
  Badge,
  AgentBox,
  Chart,
  Thumb,
  Modal,
  Alert,
  Area,
  Select,
  Empty,
} from "./ui";
import { Logo, navItems } from "./shell";
export function PublicHeader() {
  const s = useApp(),
    [menu, setMenu] = useState(false);
  return (
    <header className="public-header">
      <div className="public-nav">
        <Logo />
        <nav>
          <Link href="/fonctionnalites">Fonctionnalités</Link>
          <Link href="/tarifs">Tarifs</Link>
          <Link href="/contact">Contact</Link>
          <Go to="A4" variant="ghost">
            Connexion
          </Go>
          <Go to="A5" variant="primary">
            Commencer gratuitement
          </Go>
        </nav>
        <Button
          variant="icon"
          aria-label="Changer le thème"
          onClick={() =>
            s.patch({ theme: s.theme === "light" ? "dark" : "light" })
          }
        >
          {s.theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </Button>
        <Button
          className="mobile-menu-button"
          variant="secondary"
          aria-label="Ouvrir le menu"
          onClick={() => setMenu(true)}
        >
          <List size={20} />
        </Button>
      </div>
      <Modal open={menu} onClose={() => setMenu(false)} title="Découvrir Lyads">
        <div className="stack">
          {[
            ["A2", "Fonctionnalités"],
            ["A3", "Tarifs"],
            ["A8", "Contact"],
            ["A4", "Connexion"],
            ["A5", "Créer un compte"],
          ].map(([ref, label]) => (
            <Go key={ref} to={ref}>
              {label}
            </Go>
          ))}
        </div>
      </Modal>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>
          <Logo />
          <p>
            Créer, analyser et optimiser vos publicités Meta. Vous gardez la
            décision.
          </p>
          <p>Version locale · données de démonstration</p>
        </div>
        <div>
          <h3>Produit</h3>
          <Link href="/fonctionnalites">Fonctionnalités</Link>
          <Link href="/tarifs">Tarifs</Link>
          <Link href={route("C1.1")}>Explorer le produit</Link>
        </div>
        <div>
          <h3>Ressources</h3>
          <Link href="/contact">Contact et support</Link>
          <Link href="/parcours">Parcourir toutes les pages</Link>
          <Link href={route("A4")}>Connexion</Link>
        </div>
        <div>
          <h3>Légal</h3>
          <Link href="/legal/mentions">Mentions légales</Link>
          <Link href="/legal/conditions">Conditions générales</Link>
          <Link href="/legal/confidentialite">Confidentialité</Link>
          <Link href="/legal/cookies">Cookies</Link>
        </div>
      </div>
    </footer>
  );
}
export function PlanCards({ onChoose }: { onChoose?: (id: string) => void }) {
  const [currency, setCurrency] = useState<"XOF" | "EUR" | "USD">("XOF");
  const s = useApp(),
    router = useRouter();
  return (
    <div className="stack">
      <div
        className="row"
        style={{ justifyContent: "center", marginBottom: "var(--ly-space-4)" }}
      >
        <div className="pill-tabs">
          {(["XOF", "EUR", "USD"] as const).map((c) => (
            <button
              key={c}
              className={currency === c ? "active" : ""}
              onClick={() => setCurrency(c)}
            >
              {c === "XOF" ? "FCFA" : c}
            </button>
          ))}
        </div>
        <small>Par mois · sans engagement</small>
      </div>
      <div className="plan-grid">
        {plans.map((p, i) => (
          <Card
            className={`plan ${p.id === "pro" ? "recommended" : ""}`}
            key={p.id}
          >
            {p.id === "pro" && <Badge>Recommandé</Badge>}
            <h3>{["Gratuit", "Essentiel", "Pro", "Agence"][i]}</h3>
            <p className="muted" style={{ fontSize: "var(--ly-size-13)" }}>
              {
                [
                  "Pour découvrir Lyads",
                  "Pour votre activité",
                  "Pour aller plus loin",
                  "Pour vos clients",
                ][i]
              }
            </p>
            <div className="plan-price">
              {money(p.prix[currency], currency)}
              <small> / mois</small>
            </div>
            <ul>
              <li>
                <Check size={16} />
                <strong className="num">
                  {p.credits.toLocaleString("fr-FR")}
                </strong>{" "}
                crédits par mois
              </li>
              <li>
                <Check size={16} />
                {p.comptes ?? "Illimité"} compte{p.comptes !== 1 ? "s" : ""}{" "}
                publicitaire{p.comptes !== 1 ? "s" : ""}
              </li>
              <li>
                <Check size={16} />
                {p.utilisateurs} utilisateur{p.utilisateurs > 1 ? "s" : ""}
              </li>
              <li>
                <Check size={16} />
                Agent, studio et rapports
              </li>
            </ul>
            <Button
              variant={p.id === "pro" ? "primary" : "secondary"}
              onClick={() => {
                if (onChoose) onChoose(p.id);
                else {
                  s.patch({ plan: p.id });
                  router.push(route("A5"));
                }
              }}
            >
              {p.id === "gratuit"
                ? "Commencer gratuitement"
                : "Choisir " + ["Gratuit", "Essentiel", "Pro", "Agence"][i]}
            </Button>
          </Card>
        ))}
      </div>
      <div
        className="row wrap"
        style={{ justifyContent: "center", marginTop: "var(--ly-space-3)" }}
      >
        {["Wave", "Orange Money", "MTN MoMo", "Carte bancaire"].map((x) => (
          <Badge key={x}>{x}</Badge>
        ))}
      </div>
    </div>
  );
}
function Landing() {
  const s = useApp(),
    [tab, setTab] = useState(0);
  return (
    <>
      <div className="hero">
        <Badge tone="info">
          <Sparkle size={14} />
          L’agent publicitaire qui vous laisse la décision
        </Badge>
        <h1>
          Créez, analysez et optimisez vos publicités.
          <br />
          <em>Vous validez, Lyads applique.</em>
        </h1>
        <p>
          Lyads se connecte à votre compte Meta et travaille dessus chaque jour.
          Des décisions expliquées, des actions précises.
        </p>
        <div className="row wrap">
          <Go to="A5" variant="primary">
            Créer mon compte gratuitement <ArrowRight size={19} />
          </Go>
          <Go to="C1.1" variant="ghost">
            Explorer la démonstration
          </Go>
        </div>
        <small>
          60 crédits offerts chaque mois · Aucune carte bancaire requise
        </small>
        <div
          className="pill-tabs"
          role="tablist"
          aria-label="Les trois piliers"
        >
          {["Optimisation", "Création", "Intelligence"].map((x, i) => (
            <button
              role="tab"
              aria-selected={tab === i}
              key={x}
              className={tab === i ? "active" : ""}
              onClick={() => setTab(i)}
            >
              {x}
            </button>
          ))}
        </div>
        <div className="hero-preview">
          {tab === 0 ? (
            <div className="grid2">
              <AgentBox>
                <div className="row between">
                  <Badge tone="bad">▼ Critique</Badge>
                  <small>Fiabilité 94 %</small>
                </div>
                <h2 style={{ marginTop: "var(--ly-space-4)" }}>
                  Votre meilleure campagne ne diffuse plus.
                </h2>
                <p className="inline-note">
                  Réallouer une partie du budget d’acquisition pour reprendre la
                  diffusion.
                </p>
                <div className="grid2">
                  <Card>
                    <small>ROAS observé</small>
                    <h2 className="num">4,12</h2>
                  </Card>
                  <Card>
                    <small>Votre décision</small>
                    <h3>Avant chaque action</h3>
                  </Card>
                </div>
                <Go to="C2.1" variant="agent" className="full">
                  Examiner et valider <ArrowRight size={16} />
                </Go>
              </AgentBox>
              <Card>
                <div className="card-title">
                  <h3>Évolution des performances</h3>
                  <Badge tone="good">▲ ROAS</Badge>
                </div>
                <Chart />
                <p className="inline-note">Exemple de compte · Kola Beauté</p>
                <div className="row between">
                  <small>Budget quotidien</small>
                  <strong className="num">Inchangé</strong>
                </div>
              </Card>
            </div>
          ) : tab === 1 ? (
            <div className="grid3">
              {s.creatives.slice(0, 3).map((c) => (
                <Card className="creative-card" key={c.id}>
                  <Thumb creative={c} />
                  <div className="creative-body">
                    <h3>{c.name}</h3>
                    <small>Créative de démonstration</small>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <div className="card-title">
                <h2>Comprendre ce qui fonctionne</h2>
                <Badge>Analyse créative</Badge>
              </div>
              <Chart variant="roas" />
              <div className="row between">
                <span>Le karité, simplement</span>
                <strong className="num good-text">ROAS 4,62</strong>
              </div>
            </Card>
          )}
        </div>
      </div>
      <div className="proof-placeholders">
        <span>Partenaire Meta : à confirmer</span>
        <span>Logos clients : à compléter</span>
        <span>Avis vérifiés : à compléter</span>
      </div>
      <section className="public-section">
        <div className="section-heading">
          <div className="eyebrow">Trois outils, un même contexte</div>
          <h2>
            Moins de temps dans le Gestionnaire de publicités, de meilleures
            décisions.
          </h2>
          <p>
            Le Business Brain relie votre activité, vos campagnes et vos
            créations.
          </p>
        </div>
      </section>
      <section id="optimisation" className="public-section pillar">
        <div>
          <div className="eyebrow">01 · Optimisation</div>
          <h2>La correction à côté du problème.</h2>
          <p>
            Votre agent examine les performances et propose des modifications
            chiffrées. Vous voyez ce qui change avant de prendre une décision.
          </p>
          <Go to="C2.1" variant="primary">
            Découvrir l’agent <ArrowRight size={18} />
          </Go>
        </div>
        <AgentBox>
          <Badge tone="warn">◆ À surveiller</Badge>
          <h2 style={{ marginTop: "var(--ly-space-4)" }}>
            Réallouer le budget vers « Retargeting 30 j »
          </h2>
          <p className="inline-note">
            CPA actuel : 18 550 FCFA · Cible : 12 000 FCFA
          </p>
          <Chart compact />
          <Go to="C2.2" variant="agent">
            Examiner la recommandation
          </Go>
        </AgentBox>
      </section>
      <section id="creation" className="public-section pillar reverse">
        <div>
          <div className="eyebrow">02 · Création</div>
          <h2>Du brief à la campagne prête à publier.</h2>
          <p>
            Textes, visuels et vidéos courtes prennent leur source dans votre
            Business Brain. Le coût est annoncé avant chaque génération.
          </p>
          <Go to="C5.1" variant="primary">
            Ouvrir le studio <ArrowRight size={18} />
          </Go>
        </div>
        <div className="grid2">
          {s.creatives.slice(0, 2).map((c) => (
            <Card className="creative-card" key={c.id}>
              <Thumb creative={c} />
              <div className="creative-body">
                <h3>{c.format}</h3>
                <small>Exemple de création</small>
              </div>
            </Card>
          ))}
        </div>
      </section>
      <section id="intelligence" className="public-section pillar">
        <div>
          <div className="eyebrow">03 · Intelligence</div>
          <h2>Savoir quelle créative fonctionne, et pourquoi.</h2>
          <p>
            Comparez les créations, repérez la fatigue et observez les messages
            présents sur votre marché. Transformez ces observations en
            prochaines actions.
          </p>
          <Go to="C6.1" variant="primary">
            Explorer les analyses <ArrowRight size={18} />
          </Go>
        </div>
        <Card>
          <div className="card-title">
            <h3>Classement des créatives</h3>
            <Badge>Score / 100</Badge>
          </div>
          {s.creatives.slice(0, 3).map((c) => (
            <div className="list-row" key={c.id}>
              <Thumb creative={c} small />
              <strong
                className="grow"
                style={{ fontSize: "var(--ly-size-13)" }}
              >
                {c.name}
              </strong>
              <Badge tone={c.score > 80 ? "good" : "warn"}>{c.score}</Badge>
            </div>
          ))}
        </Card>
      </section>
      <section className="public-section">
        <div className="section-heading">
          <div className="eyebrow">Des prix lisibles</div>
          <h2>Des crédits, et ce qu’ils permettent vraiment.</h2>
          <p>Commencez gratuitement, choisissez votre rythme.</p>
        </div>
        <PlanCards />
      </section>
      <section className="public-section">
        <div className="section-heading">
          <h2>Les retours de nos utilisateurs</h2>
          <p>
            Les témoignages et références clients seront publiés après
            validation.
          </p>
        </div>
        <div className="grid3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <div className="eyebrow">Témoignage à compléter</div>
              <p className="muted">
                Emplacement réservé à un retour client vérifié.
              </p>
            </Card>
          ))}
        </div>
      </section>
      <div className="public-cta">
        <h2>Connectez votre compte, l’agent vous dit quoi examiner.</h2>
        <Go to="A5" variant="primary">
          Commencer gratuitement <ArrowRight size={18} />
        </Go>
      </div>
    </>
  );
}
function Pricing() {
  const [images, setImages] = useState(12),
    [texts, setTexts] = useState(30),
    [videos, setVideos] = useState(2),
    [compare, setCompare] = useState(false);
  const cost = images * 8 + texts + videos * 45;
  const recommended = plans.find((p) => p.credits >= cost) ?? plans[3];
  return (
    <div className="public-section">
      <div className="section-heading">
        <div className="eyebrow">Tarifs</div>
        <h1>Des crédits, et ce qu’ils permettent vraiment.</h1>
        <p>
          Une offre gratuite chaque mois. Des coûts affichés avant chaque
          action.
        </p>
      </div>
      <PlanCards />
      <div className="grid2" style={{ marginTop: "var(--ly-space-7)" }}>
        <Card>
          <h2>Le coût de chaque action</h2>
          <div style={{ marginTop: "var(--ly-size-20)" }}>
            {[
              ["Analyse complète d’un compte", "8 crédits"],
              ["Texte publicitaire", "1 crédit"],
              ["Image", "8 crédits"],
              ["Vidéo courte", "45 crédits"],
              ["Analyse de marché · 120 publicités", "48 crédits"],
              ["Publication d’une campagne", "2 crédits"],
              ["Rapport généré et partagé", "3 crédits"],
            ].map(([k, v]) => (
              <div className="list-row" key={k}>
                <span className="grow">{k}</span>
                <strong className="num">{v}</strong>
              </div>
            ))}
          </div>
        </Card>
        <Card className="stack">
          <h2>Trouvez votre plan</h2>
          <p className="muted">Estimez votre consommation mensuelle.</p>
          <Field
            label="Textes par mois"
            type="number"
            min="0"
            value={texts}
            onChange={(e) => setTexts(Math.max(0, +e.target.value))}
          />
          <Field
            label="Images par mois"
            type="number"
            min="0"
            value={images}
            onChange={(e) => setImages(Math.max(0, +e.target.value))}
          />
          <Field
            label="Vidéos par mois"
            type="number"
            min="0"
            value={videos}
            onChange={(e) => setVideos(Math.max(0, +e.target.value))}
          />
          <Alert tone="good">
            <strong className="num">{cost} crédits / mois</strong>
            <p>
              Plan suggéré : {recommended.id} · {texts} × 1 + {images} × 8 +{" "}
              {videos} × 45.
            </p>
          </Alert>
        </Card>
      </div>
      <Button
        className="full"
        variant="secondary"
        style={{ marginTop: "var(--ly-space-5)" }}
        onClick={() => setCompare(!compare)}
      >
        {compare ? "Replier" : "Afficher"} le comparatif des plans
      </Button>
      {compare && (
        <Card className="flush">
          <table>
            <thead>
              <tr>
                <th>Inclus</th>
                {plans.map((p) => (
                  <th key={p.id}>{p.id}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                "Agent d’optimisation",
                "Studio créatif",
                "Gestionnaire de publicités",
                "Business Brain",
                "Analyse créative",
                "Veille du marché",
                "Rapports",
                "Thème sombre",
                "Support",
                "Export des données",
                "Historique",
                "Sécurité",
              ].map((x) => (
                <tr key={x}>
                  <td>{x}</td>
                  {plans.map((p) => (
                    <td key={p.id}>
                      <Check size={18} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <p className="inline-note">
        Les crédits mensuels expirent à l’échéance. Aucun débit définitif en cas
        d’échec de génération. Les opérations financières sont simulées dans
        cette version.
      </p>
    </div>
  );
}
function Auth({ screen }: { screen: Screen }) {
  const s = useApp(),
    router = useRouter();
  const [email, setEmail] = useState("aminata@exemple.test"),
    [password, setPassword] = useState(""),
    [name, setName] = useState(""),
    [sent, setSent] = useState(false),
    [cooldown, setCooldown] = useState(42);
  useEffect(() => {
    if (cooldown <= 0) return;
    const i = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(i);
  }, [cooldown]);
  const verify = screen.ref === "verify",
    forgot = screen.ref === "A6",
    reset = screen.ref === "reset",
    signup = screen.ref === "A5";
  const strong =
    password.length >= 12 && /[A-Z]/.test(password) && /[0-9]/.test(password);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (forgot) {
      setSent(true);
      return;
    }
    if ((signup || reset) && !strong) {
      s.notify("Le mot de passe doit respecter les trois critères.");
      return;
    }
    if (reset) {
      s.notify("Mot de passe de démonstration modifié");
      router.push(route("A4"));
      return;
    }
    s.patch({
      auth: true,
      profile: { ...s.profile, email, name: name || s.profile.name },
    });
    router.push(route(signup ? "verify" : "C1.1"));
  };
  return (
    <div className="auth-layout">
      <div className="auth-form">
        {verify ? (
          <div className="stack">
            <Envelope size={36} />
            <h1>Vérifiez votre boîte e-mail</h1>
            <p>
              Un e-mail de vérification serait envoyé à{" "}
              <strong>{s.profile.email}</strong>. Cet envoi est simulé.
            </p>
            <Alert tone="info">
              Expéditeur prévu : noreply@lyads.app. Pensez à vérifier vos
              indésirables.
            </Alert>
            <Button
              disabled={cooldown > 0}
              variant="secondary"
              onClick={() => {
                setCooldown(42);
                s.notify("Renvoi de vérification simulé");
              }}
            >
              {cooldown > 0
                ? "Renvoyer dans " + cooldown + " s"
                : "Renvoyer l’e-mail"}
            </Button>
            <Go to="B1" variant="primary">
              Simuler l’ouverture du lien <ArrowRight size={18} />
            </Go>
          </div>
        ) : sent ? (
          <div className="stack">
            <CheckCircle size={36} />
            <h1>Si un compte existe, le lien est parti</h1>
            <p>
              Cette formulation protège la confidentialité des adresses
              enregistrées. Le lien est valable une heure et à usage unique.
            </p>
            <Alert tone="info">
              Aucun e-mail réel n’est envoyé dans cette démonstration.
            </Alert>
            <Go to="reset" variant="primary">
              Simuler l’ouverture du lien
            </Go>
            <Go to="A4">Retour à la connexion</Go>
          </div>
        ) : (
          <>
            <h1>
              {signup
                ? "Créer un compte gratuit"
                : forgot
                  ? "Mot de passe oublié"
                  : reset
                    ? "Nouveau mot de passe"
                    : "Content de vous revoir."}
            </h1>
            <p>
              {forgot
                ? "Saisissez votre adresse e-mail."
                : "Explorez Lyads avec des données de démonstration."}
            </p>
            <form onSubmit={submit}>
              {signup && (
                <>
                  <Field
                    label="Votre nom"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Aminata Diallo"
                  />
                  <Field
                    label="Entreprise"
                    required
                    defaultValue="Kola Beauté"
                  />
                </>
              )}
              {!reset && (
                <Field
                  label="Adresse e-mail"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              )}
              {!forgot && (
                <>
                  <div className="stack tight">
                    <Field
                      label="Mot de passe"
                      type="password"
                      required
                      autoComplete={
                        signup || reset ? "new-password" : "current-password"
                      }
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mot de passe de démonstration"
                    />
                    {!signup && !reset && (
                      <Link className="text-link" href={route("A6")}>
                        Mot de passe oublié ?
                      </Link>
                    )}
                  </div>
                  {(signup || reset) && (
                    <div className="stack tight">
                      {[
                        [password.length >= 12, "12 caractères minimum"],
                        [/[A-Z]/.test(password), "Une majuscule"],
                        [/[0-9]/.test(password), "Un chiffre"],
                      ].map(([ok, label]) => (
                        <small
                          key={String(label)}
                          className={ok ? "good-text" : ""}
                        >
                          {ok ? "✓" : "○"} {label}
                        </small>
                      ))}
                    </div>
                  )}
                </>
              )}
              <Button type="submit">
                {signup
                  ? "Créer mon compte"
                  : forgot
                    ? "Envoyer le lien"
                    : reset
                      ? "Enregistrer le mot de passe"
                      : "Se connecter"}
              </Button>
            </form>
            {!forgot && !reset && (
              <div className="stack" style={{ marginTop: "var(--ly-size-20)" }}>
                <div className="divider">ou</div>
                <Button
                  variant="secondary"
                  onClick={() => {
                    s.patch({ auth: true });
                    router.push(route(signup ? "B1" : "C1.1"));
                  }}
                >
                  Continuer avec Google · démo
                </Button>
                <Go to="C1.1" variant="ghost">
                  Explorer sans créer de compte
                </Go>
                <p
                  style={{ fontSize: "var(--ly-size-13)", textAlign: "center" }}
                >
                  {signup ? "Déjà un compte ?" : "Pas encore de compte ?"}{" "}
                  <Link
                    className="text-link"
                    href={route(signup ? "A4" : "A5")}
                  >
                    {signup ? "Connexion" : "Inscription"}
                  </Link>
                </p>
              </div>
            )}
          </>
        )}
      </div>
      <aside className="auth-aside">
        <div className="eyebrow">Le contrôle vous appartient</div>
        <h2>
          Votre agent propose.
          <br />
          Vous prenez la décision.
        </h2>
        <p>
          Une justification claire avant chaque action. Un historique après
          chaque décision.
        </p>
        <div className="stack">
          {[
            "60 crédits offerts chaque mois",
            "Aucun compte publicitaire modifié sans votre accord",
            "Données conservées localement pour cette démonstration",
          ].map((x) => (
            <div className="row" key={x}>
              <ShieldCheck size={22} />
              <span>{x}</span>
            </div>
          ))}
        </div>
        <Card>
          <div className="row">
            <CheckCircle size={20} />
            <strong>Services de démonstration disponibles</strong>
          </div>
        </Card>
      </aside>
    </div>
  );
}
export function PublicPages({ screen }: { screen: Screen }) {
  const s = useApp();
  const [contact, setContact] = useState(false),
    [message, setMessage] = useState("");
  const legal = ["A7", "terms", "privacy", "cookies"].includes(screen.ref);
  return (
    <div className="public-page">
      <div className="notice-strip">
        Démonstration locale · Les connexions et les paiements sont simulés.
      </div>
      <PublicHeader />
      {screen.ref === "A1" ? (
        <Landing />
      ) : screen.ref === "A3" ? (
        <Pricing />
      ) : ["A4", "A5", "A6", "verify", "reset"].includes(screen.ref) ? (
        <Auth screen={screen} />
      ) : screen.ref === "A2" ? (
        <div className="public-section">
          <div className="section-heading">
            <div className="eyebrow">Les fonctionnalités</div>
            <h2>Tout votre travail publicitaire, dans un même espace.</h2>
            <p>
              Optimisation, création et intelligence, reliées par votre Business
              Brain.
            </p>
          </div>
          <div className="stack">
            {navItems.slice(1).map((i, n) => (
              <Card key={i.ref}>
                <div className="grid2">
                  <div className="stack">
                    <i.icon size={28} />
                    <h2>{i.label}</h2>
                    <p className="muted">
                      {
                        [
                          "Examinez les écarts de performance, comprenez les recommandations et validez les modifications.",
                          "Retrouvez campagnes, ensembles et publicités. Comparez les résultats et adaptez les budgets.",
                          "Décrivez votre offre, choisissez le ciblage et vérifiez chaque placement avant publication.",
                          "Préparez vos textes, visuels et vidéos à partir du contexte de votre entreprise.",
                          "Classez vos créatives, repérez leur fatigue et préparez les prochaines itérations.",
                          "Définissez des conditions, contrôlez les actions et consultez chaque exécution.",
                          "Organisez vos inspirations et analysez les messages de votre secteur.",
                          "Composez vos bilans, adaptez leur marque et partagez une vue en lecture seule.",
                        ][n]
                      }
                    </p>
                    <Go to={i.ref} variant="primary">
                      Explorer le module <ArrowRight size={17} />
                    </Go>
                  </div>
                  <Card>
                    <Chart variant={n % 2 ? "roas" : "spend"} />
                    <small>
                      Aperçu de l’interface · données de démonstration
                    </small>
                  </Card>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : screen.ref === "A8" ? (
        <div className="public-section">
          <Heading
            title="Contact et support"
            description="Décrivez votre demande. Retrouvez l’aide adaptée à votre situation."
          />
          <div className="grid2">
            <Card>
              {contact ? (
                <div className="stack">
                  <CheckCircle size={32} />
                  <h2>Votre demande de démonstration est enregistrée</h2>
                  <p>
                    Aucun message n’a été envoyé. Ce formulaire sera relié au
                    support lors de la phase fonctionnelle.
                  </p>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setContact(false);
                      setMessage("");
                    }}
                  >
                    Nouvelle demande
                  </Button>
                </div>
              ) : (
                <form
                  className="stack"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setContact(true);
                  }}
                >
                  <Field label="Nom" required />
                  <Field label="Adresse e-mail" type="email" required />
                  <Select label="Sujet">
                    <option>Mon compte</option>
                    <option>Connexion Meta</option>
                    <option>Facturation</option>
                    <option>Autre demande</option>
                  </Select>
                  <Area
                    label="Votre message"
                    value={message}
                    onChange={setMessage}
                    required
                  />
                  <Button type="submit">Envoyer la demande · démo</Button>
                </form>
              )}
            </Card>
            <div className="stack">
              <Card>
                <h2>Besoin d’aide pour commencer ?</h2>
                <p className="inline-note">
                  Le parcours guidé présente la connexion du compte et la
                  configuration de votre entreprise.
                </p>
                <Go to="B1">Ouvrir le parcours guidé</Go>
              </Card>
              <Alert>
                Adresse du support, canaux et délais de réponse : à confirmer
                avant la mise en ligne.
              </Alert>
            </div>
          </div>
        </div>
      ) : legal ? (
        <article className="legal">
          <Heading title={screen.title} />
          <nav className="tabs">
            {[
              ["A7", "Mentions légales"],
              ["terms", "Conditions"],
              ["privacy", "Confidentialité"],
              ["cookies", "Cookies"],
            ].map(([ref, label]) => (
              <Link
                key={ref}
                href={route(ref)}
                className={ref === screen.ref ? "active" : ""}
              >
                {label}
              </Link>
            ))}
          </nav>
          <Alert>
            Document provisoire. Le texte juridique définitif et l’identité
            légale doivent être fournis avant publication.
          </Alert>
          <h2>
            {screen.ref === "privacy"
              ? "Vos données"
              : screen.ref === "cookies"
                ? "Stockage local"
                : "À propos du service"}
          </h2>
          <p>
            Cette version de Lyads est une démonstration locale. Les données
            publicitaires, paiements et connexions y sont simulés.
          </p>
          <h2>Informations à compléter</h2>
          <p>
            Identité de l’éditeur, coordonnées, hébergement, conditions
            d’utilisation et informations applicables au service final.
          </p>
          <h2>Préférences de démonstration</h2>
          <p>
            Les réglages et modifications sont enregistrés dans le stockage
            local de votre navigateur. Ils peuvent être réinitialisés depuis le
            menu « Démonstration locale ».
          </p>
          <Go to="A8">Contacter le support</Go>
        </article>
      ) : screen.ref === "directory" ? (
        <div className="public-section">
          <Heading
            title="Parcourir toutes les pages"
            description="Accès direct aux pages, étapes et panneaux de la démonstration."
          />
          <div className="directory-grid">
            {Array.from(new Set(screens.map((x) => x.group))).map((g) => (
              <Card key={g}>
                <h2>{g}</h2>
                {screens
                  .filter((x) => x.group === g)
                  .map((x) => (
                    <Link key={x.ref} href={x.path}>
                      <span className="num">{x.ref}</span>
                      {x.title}
                    </Link>
                  ))}
              </Card>
            ))}
          </div>
        </div>
      ) : null}
      <Footer />
      {!s.cookieConsent && screen.ref === "A1" && (
        <div className="cookie-banner">
          <strong>Vos préférences, sur cet appareil</strong>
          <p>
            La démonstration utilise le stockage local pour conserver vos choix.
            Aucun traceur publicitaire n’est actif.
          </p>
          <div className="row">
            <Button
              variant="secondary"
              onClick={() => s.patch({ cookieConsent: true })}
            >
              Compris
            </Button>
            <Go to="cookies" variant="ghost">
              En savoir plus
            </Go>
          </div>
        </div>
      )}
    </div>
  );
}
