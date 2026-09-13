import { NextRequest } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { initializeAccount } from "@/lib/auth/account";

// Alternative for email templates using TokenHash (also supports another browser).
export async function GET(request: NextRequest) {
  const client = createSupabaseRouteClient(request);
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  if (
    !tokenHash ||
    (type !== "signup" && type !== "recovery" && type !== "email")
  )
    return client.redirect("/connexion?auth=link_error");
  const { data, error } = await client.supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });
  if (error || !data.user) return client.redirect("/connexion?auth=link_error");
  if (type === "recovery") return client.redirect("/nouveau-mot-de-passe");
  try {
    await initializeAccount(client.supabase, data.user);
  } catch {
    await client.supabase.auth.signOut({ scope: "local" });
    return client.redirect("/connexion?auth=service_error");
  }
  return client.redirect("/bienvenue");
}
