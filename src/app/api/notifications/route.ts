import { NextRequest } from "next/server";
import {
  authenticated,
  apiFailure,
  ApiError,
  jsonBody,
  uuid,
} from "@/lib/backend/http";
async function scope(request: NextRequest, organization: unknown) {
  if (!uuid(organization))
    throw new ApiError(
      "INVALID_ORGANIZATION",
      400,
      "Sélectionnez votre entreprise.",
    );
  const client = await authenticated(request);
  const { data, error } = await client.supabase.rpc("lyads_organization_role", {
    target_workspace: organization,
  });
  if (error) throw error;
  if (!data)
    throw new ApiError(
      "ACCESS_DENIED",
      403,
      "Vous n’avez plus accès aux notifications de cette entreprise.",
    );
  return { client, organization };
}
function before(value: unknown) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T/.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    Date.parse(value) > Date.now() + 1000
  )
    throw new ApiError(
      "INVALID_DATE",
      400,
      "Actualisez vos notifications avant de réessayer.",
    );
  return new Date(value).toISOString();
}
export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams;
    const { client, organization } = await scope(
      request,
      q.get("organization"),
    );
    const asOf = q.has("asOf")
      ? before(q.get("asOf"))
      : new Date().toISOString();
    const page = Number(q.get("page") || 0);
    if (!Number.isInteger(page) || page < 0 || page > 500)
      throw new ApiError("INVALID_PAGE", 400, "Rechargez les notifications.");
    // Queries run as the signed-in user; RLS also checks current account grants.
    const count = await client.supabase
      .from("lyads_notifications")
      .select("id", { head: true, count: "exact" })
      .eq("workspace_id", organization)
      .eq("user_id", client.user.id)
      .is("read_at", null);
    if (count.error) throw count.error;
    if (q.get("countOnly") === "1")
      return client.json({ unreadCount: count.count || 0, asOf });
    const list = await client.supabase
      .from("lyads_notifications")
      .select("id,kind,message,created_at,read_at,ad_account_id")
      .eq("workspace_id", organization)
      .eq("user_id", client.user.id)
      .lte("created_at", asOf)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(page * 20, page * 20 + 20);
    if (list.error) throw list.error;
    return client.json({
      notifications: list.data.slice(0, 20),
      hasMore: list.data.length > 20,
      page,
      asOf,
      unreadCount: count.count || 0,
    });
  } catch (error) {
    return apiFailure(error);
  }
}
export async function PATCH(request: NextRequest) {
  try {
    const body = await jsonBody(request);
    const { client, organization } = await scope(request, body.organization);
    if (
      body.all !== true &&
      (!Array.isArray(body.ids) ||
        body.ids.length < 1 ||
        body.ids.length > 20 ||
        !body.ids.every(uuid))
    )
      throw new ApiError(
        "INVALID_REQUEST",
        400,
        "Sélectionnez les notifications à marquer comme lues.",
      );
    let update = client.supabase
      .from("lyads_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("workspace_id", organization)
      .eq("user_id", client.user.id)
      .is("read_at", null);
    update =
      body.all === true
        ? update.lte("created_at", before(body.asOf))
        : update.in("id", body.ids as string[]);
    const result = await update.select("id");
    if (result.error) throw result.error;
    return client.json({ updated: result.data.length });
  } catch (error) {
    return apiFailure(error);
  }
}
