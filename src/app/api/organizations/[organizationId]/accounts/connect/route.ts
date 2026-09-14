import { NextRequest } from "next/server";
import {
  authenticated,
  apiFailure,
  ApiError,
  jsonBody,
  uuid,
} from "@/lib/backend/http";
async function selection(request: NextRequest, id: string) {
  if (!uuid(id))
    throw new ApiError(
      "INVALID_ORGANIZATION",
      400,
      "Sélectionnez votre entreprise.",
    );
  const client = await authenticated(request);
  const role = await client.supabase.rpc("lyads_organization_role", {
    target_workspace: id,
  });
  if (role.error) throw role.error;
  if (!role.data)
    throw new ApiError(
      "ACCESS_DENIED",
      403,
      "Demandez un accès à cette entreprise.",
    );
  const saved = await client.supabase
    .from("lyads_onboarding")
    .select("connection_id,business_meta_id,ad_account_ids,revision")
    .eq("workspace_id", id)
    .single();
  if (saved.error) throw saved.error;
  return { client, saved: saved.data, role: role.data };
}
type Context = { params: Promise<{ organizationId: string }> };
export async function GET(request: NextRequest, context: Context) {
  try {
    const { organizationId } = await context.params;
    const { client, saved, role } = await selection(request, organizationId);
    if (!saved.business_meta_id || !saved.connection_id)
      return client.json({
        accounts: [],
        connected: saved.ad_account_ids,
        revision: saved.revision,
        editable: role === "owner",
        businessName: null,
      });
    const [links, business] = await Promise.all([
      client.supabase
        .from("lyads_business_accounts")
        .select("ad_account_id")
        .eq("workspace_id", organizationId)
        .eq("connection_id", saved.connection_id)
        .eq("business_meta_id", saved.business_meta_id)
        .limit(5000),
      client.supabase
        .from("lyads_meta_resources")
        .select("source_data")
        .eq("workspace_id", organizationId)
        .eq("connection_id", saved.connection_id)
        .eq("kind", "business")
        .eq("meta_id", saved.business_meta_id)
        .maybeSingle(),
    ]);
    if (links.error || business.error) throw links.error || business.error;
    const ids = (links.data || []).map((a) => a.ad_account_id);
    const accounts = ids.length
      ? await client.supabase
          .from("lyads_ad_accounts")
          .select("id,name,currency,meta_account_id")
          .eq("workspace_id", organizationId)
          .eq("connection_id", saved.connection_id)
          .in("id", ids)
          .order("name")
          .limit(5000)
      : { data: [], error: null };
    if (accounts.error) throw accounts.error;
    return client.json({
      accounts: accounts.data,
      connected: saved.ad_account_ids,
      revision: saved.revision,
      editable: role === "owner",
      businessName: business.data?.source_data?.name || null,
    });
  } catch (error) {
    return apiFailure(error);
  }
}
export async function POST(request: NextRequest, context: Context) {
  try {
    const body = await jsonBody(request);
    const { organizationId } = await context.params;
    const { client, saved, role } = await selection(request, organizationId);
    if (role !== "owner")
      throw new ApiError(
        "ACCESS_DENIED",
        403,
        "Le propriétaire de l’entreprise doit connecter les comptes publicitaires.",
      );
    if (
      !Array.isArray(body.accountIds) ||
      !body.accountIds.length ||
      body.accountIds.length > 100 ||
      !body.accountIds.every(uuid) ||
      !Number.isInteger(body.revision)
    )
      throw new ApiError(
        "INVALID_SELECTION",
        400,
        "Choisissez au moins un compte publicitaire.",
      );
    const result = await client.supabase.rpc("lyads_connect_ad_accounts", {
      target_workspace: organizationId,
      expected_revision: body.revision,
      account_ids: body.accountIds,
    });
    if (result.error?.code === "40001")
      throw new ApiError(
        "REVISION_CONFLICT",
        409,
        "Vos comptes ont changé. Fermez puis rouvrez cette fenêtre.",
      );
    if (result.error?.code === "42501")
      throw new ApiError(
        "ACCESS_DENIED",
        403,
        "Ce compte ne fait pas partie des comptes accessibles de votre Business Manager.",
      );
    if (result.error) throw result.error;
    return client.json({ connected: result.data });
  } catch (error) {
    return apiFailure(error);
  }
}
