import { NextRequest } from "next/server";
import { authenticated, apiFailure, ApiError, uuid } from "@/lib/backend/http";
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ organizationId: string }> },
) {
  try {
    const { organizationId } = await context.params;
    if (!uuid(organizationId))
      throw new ApiError(
        "INVALID_ORGANIZATION",
        400,
        "Sélectionnez une organisation valide.",
      );
    const client = await authenticated(request);
    const { data: role, error: roleError } = await client.supabase.rpc(
      "lyads_organization_role",
      { target_workspace: organizationId },
    );
    if (roleError) throw roleError;
    if (!role)
      throw new ApiError(
        "ACCESS_DENIED",
        403,
        "Sélectionnez une organisation accessible.",
      );
    const results = await Promise.all([
      client.supabase
        .from("lyads_ad_accounts")
        .select(
          "id,name,meta_account_id,currency,timezone_name,access_mode,synchronized_at,business_meta_id,account_status",
        )
        .eq("workspace_id", organizationId)
        .order("name")
        .limit(500),
      client.supabase
        .from("lyads_jobs")
        .select("id,kind,status,progress_done,error_code,created_at")
        .eq("workspace_id", organizationId)
        .in("kind", ["meta.discover", "meta.sync"])
        .order("created_at", { ascending: false })
        .limit(30),
      client.supabase
        .from("lyads_meta_resources")
        .select("meta_id,source_data")
        .eq("workspace_id", organizationId)
        .eq("kind", "business")
        .limit(500),
    ]);
    for (const result of results) if (result.error) throw result.error;
    return client.json({
      accounts: results[0].data,
      jobs: results[1].data,
      businesses: results[2].data,
    });
  } catch (error) {
    return apiFailure(error);
  }
}
