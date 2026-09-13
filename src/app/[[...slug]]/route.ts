import { screens } from "@/lib/screens";
import { renderSource, catalog } from "@/lib/source/render";
export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.pathname === "/parcours") return Response.redirect(new URL("/", url));
  const ref =
    url.pathname === "/confirmation-envoi"
      ? "sent"
      : screens.find((s) => s.path === url.pathname)?.ref;
  if (!ref || !catalog[ref]) return new Response(null, { status: 404 });
  return new Response(
    renderSource(ref, url.searchParams.get("view") ?? undefined),
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
}
