import Link from "next/link";
export default function NotFound() {
  return (
    <main className="legal">
      <h1>Cette page n’existe pas</h1>
      <p>Retrouvez votre espace ou la liste des parcours disponibles.</p>
      <div className="row wrap">
        <Link className="btn primary" href="/app/tableau-de-bord">
          Tableau de bord
        </Link>
        <Link className="btn secondary" href="/parcours">
          Tous les écrans
        </Link>
      </div>
    </main>
  );
}
