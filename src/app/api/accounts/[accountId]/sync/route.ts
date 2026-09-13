import { NextRequest } from "next/server";
import {
  authenticated,
  apiFailure,
  accountPermission,
  jsonBody,
  ApiError,
} from "@/lib/backend/http";
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ accountId: string }> },
) {
  try {
    const body = await jsonBody(request);
    const { accountId } = await context.params;
    if (
      typeof body.requestKey !== "string" ||
      body.requestKey.length < 1 ||
      body.requestKey.length > 200
    )
      throw new ApiError(
        "INVALID_REQUEST",
        400,
        "Relancez la synchronisation depuis le compte sélectionné.",
      );
    const client = await authenticated(request);
    await accountPermission(client, accountId);
    const { data, error } = await client.supabase.rpc("lyads_request_sync", {
      target_account: accountId,
      request_key: body.requestKey,
    });
    if (error) {
      if (error.code === "P0001")
        throw new ApiError(
          "SYNC_COOLDOWN",
          429,
          "Une synchronisation est en cours ou vient d’être demandée. Réessayez dans cinq minutes.",
        );
      throw error;
    }
    return client.json({ jobId: data, status: "queued" }, 202);
  } catch (error) {
    return apiFailure(error);
  }
}
