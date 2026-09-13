import { NextRequest } from "next/server";
import {
  authenticated,
  apiFailure,
  jsonBody,
  ApiError,
  uuid,
} from "@/lib/backend/http";
type Context = { params: Promise<{ organizationId: string }> };
export async function GET(request: NextRequest, context: Context) {
  try {
    const { organizationId } = await context.params;
    if (!uuid(organizationId))
      throw new ApiError(
        "INVALID_ORGANIZATION",
        400,
        "Sélectionnez une organisation valide.",
      );
    const client = await authenticated(request);
    const { data: org, error: orgError } = await client.supabase
      .from("lyads_workspaces")
      .select("owner_id")
      .eq("id", organizationId)
      .maybeSingle();
    if (orgError) throw orgError;
    if (!org)
      throw new ApiError(
        "ACCESS_DENIED",
        403,
        "Demandez un accès à cette organisation.",
      );
    const [members, grants] = await Promise.all([
      client.supabase
        .from("lyads_memberships")
        .select("user_id,role,created_at")
        .eq("workspace_id", organizationId)
        .order("created_at")
        .limit(500),
      client.supabase
        .from("lyads_account_access")
        .select("user_id,ad_account_id,can_edit")
        .eq("workspace_id", organizationId)
        .limit(5000),
    ]);
    if (members.error || grants.error) throw members.error || grants.error;
    return client.json({
      owner: { user_id: org.owner_id, role: "owner" },
      members: members.data,
      accountAccess: grants.data,
    });
  } catch (error) {
    return apiFailure(error);
  }
}
export async function POST(request: NextRequest, context: Context) {
  try {
    const body = await jsonBody(request);
    const { organizationId } = await context.params;
    if (
      !uuid(organizationId) ||
      !uuid(body.userId) ||
      ![null, "admin", "editor", "viewer"].includes(
        body.role as string | null,
      ) ||
      !Array.isArray(body.accounts) ||
      body.accounts.length > 500 ||
      !body.accounts.every(
        (a) =>
          a &&
          typeof a === "object" &&
          uuid(a.ad_account_id) &&
          typeof a.can_edit === "boolean",
      )
    )
      throw new ApiError(
        "INVALID_MEMBERSHIP",
        400,
        "Vérifiez le membre, son rôle et les comptes attribués.",
      );
    const client = await authenticated(request);
    const { error } = await client.supabase.rpc("lyads_set_member", {
      target_workspace: organizationId,
      target_user: body.userId,
      target_role: body.role,
      accounts: body.accounts.map((a) => ({
        ad_account_id: a.ad_account_id,
        can_edit: a.can_edit,
      })),
    });
    if (error) {
      if (error.code === "42501")
        throw new ApiError(
          "ACCESS_DENIED",
          403,
          "Vous ne pouvez pas attribuer ces droits. Contactez le propriétaire.",
        );
      throw new ApiError(
        "INVALID_MEMBERSHIP",
        400,
        "Vérifiez que le membre existe et que les comptes appartiennent à cette organisation.",
      );
    }
    return client.json({ ok: true });
  } catch (error) {
    return apiFailure(error);
  }
}
