"use client";
import { ReactNode, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  SquaresFour,
  Sparkle,
  Megaphone,
  RocketLaunch,
  Palette,
  ChartBar,
  FlowArrow,
  GlobeHemisphereWest,
  FileText,
  Brain,
  GearSix,
  Bell,
  CaretUpDown,
  SidebarSimple,
  Sun,
  Moon,
  DotsThree,
  ArrowRight,
  ArrowSquareOut,
  CheckCircle,
  Flask,
  SignOut,
} from "@phosphor-icons/react";
import { useApp, accounts } from "@/lib/store";
import { route, screens, Screen } from "@/lib/screens";
import {
  Button,
  Go,
  Modal,
  Progress,
  Search,
  Badge,
  Alert,
  Select,
  Field,
} from "./ui";
export const navItems = [
  { ref: "C1.1", label: "Tableau de bord", icon: SquaresFour },
  { ref: "C2.1", label: "Agent d’optimisation", icon: Sparkle },
  {
    ref: "C3.1",
    label: "Gestionnaire de publicités",
    icon: Megaphone,
    group: "Campagnes",
  },
  { ref: "C4.1", label: "Constructeur de campagne", icon: RocketLaunch },
  { ref: "C5.1", label: "Studio créatif", icon: Palette, group: "Créatif" },
  { ref: "C6.1", label: "Analyse créative", icon: ChartBar },
  {
    ref: "C7.1",
    label: "Règles automatisées",
    icon: FlowArrow,
    group: "Pilotage",
  },
  { ref: "C8.1", label: "Analyse marché", icon: GlobeHemisphereWest },
  { ref: "C9.1", label: "Rapports", icon: FileText },
];
export function Logo() {
  return (
    <Link href="/" className="logo" prefetch={false}>
      <span className="logo-mark">L</span>
      <span className="logo-name">Lyads</span>
    </Link>
  );
}
export function AccountPicker({ onClose }: { onClose?: () => void }) {
  const s = useApp();
  const [search, setSearch] = useState("");
  return (
    <div className="stack">
      <Search
        value={search}
        onChange={setSearch}
        placeholder="Rechercher un compte ou une entreprise"
      />
      {["bm_kola", "bm_sanou", "bm_export"].map((bm) => (
        <div key={bm}>
          <div className="eyebrow">
            {bm === "bm_kola"
              ? "Kola Distribution"
              : bm === "bm_sanou"
                ? "Sanou Retail Group"
                : "Kola Export Europe"}
          </div>
          <div className="stack tight">
            {accounts
              .filter(
                (a) =>
                  a.bm === bm &&
                  a.nom.toLowerCase().includes(search.toLowerCase()),
              )
              .map((a) => (
                <button
                  key={a.id}
                  className={`option-card ${s.accountId === a.id ? "selected" : ""}`}
                  onClick={() => {
                    s.switchAccount(a.id);
                    onClose?.();
                  }}
                >
                  <span className="avatar">
                    {a.nom.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="grow">
                    <h3>{a.nom}</h3>
                    <p>
                      {a.devise === "XOF" ? "FCFA" : a.devise} ·{" "}
                      {"lecture_seule" in a
                        ? "Mode consultation"
                        : "Administrateur"}
                    </p>
                  </div>
                  {s.accountId === a.id && <CheckCircle size={22} />}
                </button>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
export function ModuleTabs({
  screen,
  include = true,
}: {
  screen: Screen;
  include?: boolean;
}) {
  const prefix = screen.ref.split(".")[0];
  const items = screens.filter((x) => x.ref.startsWith(prefix + "."));
  if (!include || items.length < 2 || ["C1", "C4", "C11"].includes(prefix))
    return null;
  return (
    <nav className="tabs" aria-label="Pages du module">
      {items.map((x) => (
        <Link
          prefetch={false}
          key={x.ref}
          href={x.path}
          className={x.ref === screen.ref ? "active" : ""}
        >
          {x.title}
        </Link>
      ))}
    </nav>
  );
}
export function Shell({
  screen,
  children,
}: {
  screen: Screen;
  children: ReactNode;
}) {
  const s = useApp();
  const router = useRouter();
  const [picker, setPicker] = useState(false),
    [more, setMore] = useState(false),
    [demo, setDemo] = useState(false);
  const account = accounts.find((a) => a.id === s.accountId)!;
  const count = s.recommendations.filter(
    (r) => r.accountId === s.accountId && r.status === "pending",
  ).length;
  const active = (ref: string) =>
    screen.ref.split(".")[0] === ref.split(".")[0];
  return (
    <div className={s.collapsed ? "collapsed" : ""}>
      <aside className="sidebar">
        <Logo />
        <button className="account-button" onClick={() => setPicker(true)}>
          <span className="avatar">KB</span>
          <span className="grow account-copy">
            <strong>{account.nom}</strong>
            <small>
              {account.devise === "XOF" ? "FCFA" : account.devise} ·{" "}
              {s.readonly ? "Consultation" : "Actif"}
            </small>
          </span>
          <CaretUpDown size={16} />
        </button>
        <nav>
          {navItems.map((item) => (
            <div key={item.ref}>
              {item.group && <div className="nav-group">{item.group}</div>}
              <Link
                href={route(item.ref)}
                prefetch={false}
                title={item.label}
                className={`nav-link ${active(item.ref) ? "active" : ""}`}
              >
                <item.icon size={20} />
                <span className="nav-label">{item.label}</span>
                {item.ref === "C2.1" && count > 0 && (
                  <span className="count">{count}</span>
                )}
              </Link>
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link
            aria-label="Business Brain"
            href={route("C10.1")}
            prefetch={false}
            className={`nav-link ${active("C10.1") ? "active" : ""}`}
          >
            <Brain size={20} />
            <span className="nav-label">Business Brain</span>
          </Link>
          <Link href={route("C11.4")} prefetch={false} className="credit-card">
            <div className="row between">
              <span>Crédits</span>
              <strong className="num">
                {s.credits} / {s.maxCredits}
              </strong>
            </div>
            <Progress value={(s.credits / s.maxCredits) * 100} />
            <small>
              {(s.credits / s.maxCredits) * 100 < s.creditThreshold
                ? "Solde faible · Racheter"
                : "Consulter la consommation"}
            </small>
          </Link>
          <Link
            aria-label="Paramètres"
            href={route("C11.1")}
            prefetch={false}
            className={`nav-link ${active("C11.1") ? "active" : ""}`}
          >
            <GearSix size={20} />
            <span className="nav-label">Paramètres</span>
          </Link>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <Button
            variant="icon"
            className="desktop-only"
            aria-label="Réduire la barre latérale"
            onClick={() => s.patch({ collapsed: !s.collapsed })}
          >
            <SidebarSimple size={20} />
          </Button>
          <div className="grow">
            <div className="topbar-title">{screen.group}</div>
            <small>
              {s.scenario === "stale"
                ? "Données de 3 h 20"
                : "Synchronisé il y a 12 min"}{" "}
              · {account.nom}
            </small>
          </div>
          <button className="demo-label" onClick={() => setDemo(true)}>
            Démonstration locale
          </button>
          <Button
            variant="icon"
            aria-label="Changer le thème"
            onClick={() =>
              s.patch({ theme: s.theme === "light" ? "dark" : "light" })
            }
          >
            {s.theme === "light" ? <Moon size={19} /> : <Sun size={19} />}
          </Button>
          <Link
            className="btn icon"
            href={route("C2.1")}
            aria-label={`${count} recommandations`}
          >
            <Bell size={20} />
            {count > 0 && <span className="badge info">{count}</span>}
          </Link>
          <button
            className="avatar"
            aria-label="Choisir le compte publicitaire"
            onClick={() => setPicker(true)}
          >
            AD
          </button>
        </header>
        <main id="contenu" className="app-content">
          {!s.metaConnected ? (
            <div className="system-banner">
              <Alert tone="bad">
                <div className="row between wrap">
                  <div>
                    <strong>Connexion Meta interrompue</strong>
                    <p>
                      Les dernières données restent consultables. Les
                      modifications sont suspendues.
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      s.patch({ metaConnected: true });
                      s.notify(
                        "Connexion Meta rétablie · synchronisation terminée",
                      );
                    }}
                  >
                    Reconnecter
                  </Button>
                </div>
              </Alert>
            </div>
          ) : s.readonly ? (
            <div className="system-banner">
              <Alert>
                <strong>Mode consultation</strong>
                <p>
                  Vous pouvez examiner ce compte. Les actions d’écriture
                  nécessitent le rôle Annonceur.
                </p>
              </Alert>
            </div>
          ) : (s.credits / s.maxCredits) * 100 < s.creditThreshold ? (
            <div className="system-banner">
              <Alert>
                <div className="row between wrap">
                  <div>
                    <strong>
                      {s.credits === 0
                        ? "Crédits épuisés"
                        : "Solde de crédits faible"}
                    </strong>
                    <p>{s.credits} crédits disponibles.</p>
                  </div>
                  <Go to="C11.4">Racheter des crédits</Go>
                </div>
              </Alert>
            </div>
          ) : null}
          <ModuleTabs screen={screen} />
          {children}
        </main>
      </div>
      <nav className="mobile-nav" aria-label="Navigation mobile">
        {[
          { ref: "C1.1", label: "Bord", icon: SquaresFour },
          { ref: "C2.1", label: "Agent", icon: Sparkle },
          { ref: "C3.1", label: "Publicités", icon: Megaphone },
          { ref: "C9.1", label: "Rapports", icon: FileText },
        ].map((i) => (
          <Link
            key={i.ref}
            prefetch={false}
            href={route(i.ref)}
            className={active(i.ref) ? "active" : ""}
          >
            <i.icon size={22} />
            {i.label}
          </Link>
        ))}
        <button onClick={() => setMore(true)}>
          <DotsThree size={22} />
          Plus
        </button>
      </nav>
      <Modal
        open={picker}
        onClose={() => setPicker(false)}
        title="Choisir un compte publicitaire"
      >
        <AccountPicker onClose={() => setPicker(false)} />
      </Modal>
      <Modal open={more} onClose={() => setMore(false)} title="Tous vos outils">
        <div className="stack tight">
          {[
            ...navItems,
            { ref: "C10.1", label: "Business Brain", icon: Brain },
            { ref: "C11.1", label: "Paramètres", icon: GearSix },
          ].map((i) => (
            <button
              key={i.ref}
              className="nav-link"
              onClick={() => {
                router.push(route(i.ref));
                setMore(false);
              }}
            >
              <i.icon size={20} />
              {i.label}
            </button>
          ))}
        </div>
      </Modal>
      <Modal
        open={demo}
        onClose={() => setDemo(false)}
        title="Explorer la démonstration"
      >
        <div className="stack">
          <Alert tone="info">
            Les interactions sont locales. Aucun compte Meta, paiement ou e-mail
            réel n’est utilisé.
          </Alert>
          <Select
            label="État des données"
            value={s.scenario}
            onChange={(e) =>
              s.patch({ scenario: e.target.value as typeof s.scenario })
            }
          >
            <option value="full">Données complètes</option>
            <option value="empty">Aucune donnée</option>
            <option value="error">Erreur de synchronisation</option>
            <option value="stale">Données en retard</option>
          </Select>
          <div className="grid2">
            <Select
              label="Accès au compte"
              value={s.readonly ? "read" : "write"}
              onChange={(e) => s.patch({ readonly: e.target.value === "read" })}
            >
              <option value="write">Administrateur</option>
              <option value="read">Consultation seule</option>
            </Select>
            <Select
              label="Connexion Meta"
              value={s.metaConnected ? "yes" : "no"}
              onChange={(e) =>
                s.patch({ metaConnected: e.target.value === "yes" })
              }
            >
              <option value="yes">Connectée</option>
              <option value="no">Interrompue</option>
            </Select>
          </div>
          <Field
            label="Crédits disponibles"
            type="number"
            min="0"
            value={s.credits}
            onChange={(e) =>
              s.patch({ credits: Math.max(0, Number(e.target.value)) })
            }
          />
          <Go to="directory">
            Voir les 84 pages et étapes <ArrowRight size={18} />
          </Go>
          <Button
            variant="secondary"
            onClick={() => {
              s.reset();
              setDemo(false);
            }}
          >
            Réinitialiser les données de démonstration
          </Button>
        </div>
      </Modal>
    </div>
  );
}
