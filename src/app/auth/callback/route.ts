import { onboardingDestination } from "@/lib/onboarding/data";
import { NextRequest } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { initializeAccount } from "@/lib/auth/account";

export async function GET(request: NextRequest) {
  const client = createSupabaseRouteClient(request);
  const code = request.nextUrl.searchParams.get("code");
  if (!code || request.nextUrl.searchParams.has("error"))
    return client.redirect("/connexion?auth=link_error");
  const { data, error } = await client.supabase.auth.exchangeCodeForSession(
    code,
    request.nextUrl.searchParams.get("sb_flow_id")
      ? { flowId: request.nextUrl.searchParams.get("sb_flow_id")! }
      : undefined,
  );
  if (error || !data.user) return client.redirect("/connexion?auth=link_error");
  if (
    ("redirectType" in data && data.redirectType === "recovery") ||
    request.nextUrl.searchParams.get("flow") === "recovery"
  )
    return client.redirect("/nouveau-mot-de-passe");
  try {
    await initializeAccount(client.supabase, data.user);
  } catch {
    await client.supabase.auth.signOut({ scope: "local" });
    return client.redirect("/connexion?auth=service_error");
  }
  return client.redirect(
    await onboardingDestination(client.supabase, data.user.id),
  );
}
