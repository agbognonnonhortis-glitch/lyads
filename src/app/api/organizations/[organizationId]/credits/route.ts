import { NextRequest } from "next/server";
import { authenticated, apiFailure, uuid, ApiError } from "@/lib/backend/http";
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
    const role = await client.supabase.rpc("lyads_organization_role", {
      target_workspace: organizationId,
    });
    if (role.error) throw role.error;
    if (!role.data)
      throw new ApiError(
        "ACCESS_DENIED",
        403,
        "Demandez un accès à cette organisation.",
      );
    const offset = Math.max(
      0,
      Math.min(100000, Number(request.nextUrl.searchParams.get("offset")) || 0),
    );
    const [balance, prices, transactions] = await Promise.all([
      client.supabase.rpc("lyads_credit_balance", {
        target_workspace: organizationId,
      }),
      client.supabase
        .from("lyads_credit_prices")
        .select("action,module,unit_cost,enabled,provisional,updated_at")
        .order("action"),
      client.supabase
        .from("lyads_credit_transactions")
        .select("id,kind,amount,operation_id,created_at")
        .eq("workspace_id", organizationId)
        .order("created_at", { ascending: false })
        .range(offset, offset + 49),
    ]);
    if (balance.error || prices.error || transactions.error)
      throw balance.error || prices.error || transactions.error;
    return client.json({
      balance: balance.data?.[0],
      prices: prices.data,
      transactions: transactions.data,
      offset,
      limit: 50,
    });
  } catch (error) {
    return apiFailure(error);
  }
}
