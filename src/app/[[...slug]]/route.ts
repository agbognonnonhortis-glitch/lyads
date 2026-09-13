import { NextRequest, NextResponse } from "next/server";
import { screens } from "@/lib/screens";
import { renderSource, catalog } from "@/lib/source/render";
import { privatePath } from "@/lib/auth/validation";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  // Accept the configured Site URL fallback used by default Supabase templates.
  if (url.pathname === "/" && url.searchParams.has("code")) {
    const next = new URL("/auth/callback", url);
    next.searchParams.set("code", url.searchParams.get("code")!);
    if (url.searchParams.has("sb_flow_id"))
      next.searchParams.set("sb_flow_id", url.searchParams.get("sb_flow_id")!);
    return NextResponse.redirect(next, 303);
  }
  if (url.pathname === "/parcours")
    return NextResponse.redirect(new URL("/", url), 303);
  const ref =
    url.pathname === "/confirmation-envoi"
      ? "sent"
      : screens.find((s) => s.path === url.pathname)?.ref;
  if (!ref || !catalog[ref]) return new NextResponse(null, { status: 404 });
  const html = () =>
    new NextResponse(
      renderSource(ref, url.searchParams.get("view") ?? undefined),
      {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "private, no-store",
          "Referrer-Policy": "same-origin",
        },
      },
    );
  if (privatePath(url.pathname) || ref === "reset") {
    try {
      const client = createSupabaseRouteClient(request);
      const {
        data: { user },
        error,
      } = await client.supabase.auth.getUser();
      if (error || !user)
        return client.redirect(
          ref === "reset" ? "/mot-de-passe-oublie" : "/connexion",
        );
      return client.apply(html());
    } catch {
      return NextResponse.redirect(
        new URL("/connexion?auth=service_error", url),
        303,
      );
    }
  }
  return html();
}
