import { renderAppShell } from "@/lib/shell/render";
import { renderDashboard } from "@/lib/dashboard/render";
import {
  canSwitchOrganization,
  renderOrganization,
} from "@/lib/onboarding/organization";
import { NextRequest, NextResponse } from "next/server";
import { onboardingData, onboardingDestination } from "@/lib/onboarding/data";
import { renderOnboarding, onboardingStep } from "@/lib/onboarding/render";
import { stepPaths } from "@/lib/onboarding/model";
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
      if (ref.startsWith("B")) {
        const data = await onboardingData(
          client.supabase,
          user.id,
          request.cookies.get("lyads-organization")?.value,
        );
        const section = url.searchParams.get("section") || "activity";
        if (ref === "B1")
          return client.redirect(
            await onboardingDestination(client.supabase, user.id),
          );
        if (ref === "B4")
          return client.redirect("/configuration/business-manager");
        const step = onboardingStep(ref, section);
        if (
          !data.state.completed_at &&
          step > data.state.current_step &&
          !(ref === "B3" && data.connection)
        )
          return client.redirect(
            stepPaths[Math.min(8, data.state.current_step - 1)],
          );
        return client.apply(
          new NextResponse(renderOnboarding(ref, data, section), {
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              "Cache-Control": "private, no-store",
              "Referrer-Policy": "same-origin",
            },
          }),
        );
      }
      if (url.pathname.startsWith("/app/")) {
        const data = await onboardingData(
          client.supabase,
          user.id,
          request.cookies.get("lyads-organization")?.value,
        );
        if (!data.state.completed_at)
          return client.redirect(
            stepPaths[Math.min(8, Math.max(0, data.state.current_step - 1))],
          );
        if (ref === "C1.2" && !canSwitchOrganization(data.organizations || []))
          return client.redirect("/app/tableau-de-bord");
        return client.apply(
          new NextResponse(
            renderAppShell(
              renderOrganization(
                ref === "C1.1"
                  ? renderDashboard(
                      renderSource(
                        ref,
                        url.searchParams.get("view") ?? undefined,
                      )!,
                      data,
                    )
                  : renderSource(
                      ref,
                      url.searchParams.get("view") ?? undefined,
                    )!,
                ref,
                data.organization,
                data.organizations || [],
              ),
              ref,
              data,
            ),
            {
              headers: {
                "Content-Type": "text/html; charset=utf-8",
                "Cache-Control": "private, no-store",
                "Referrer-Policy": "same-origin",
              },
            },
          ),
        );
      }
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
