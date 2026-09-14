import { NextRequest } from "next/server";
import {
  authenticated,
  accountPermission,
  apiFailure,
  ApiError,
  jsonBody,
} from "@/lib/backend/http";
import {
  alertFields,
  defaultAlertSettings,
  validateAlertSettings,
} from "@/lib/alerts/settings";
type Context = { params: Promise<{ accountId: string }> };
export async function GET(request: NextRequest, context: Context) {
  try {
    const { accountId } = await context.params;
    const client = await authenticated(request);
    const permission = await accountPermission(client, accountId);
    const result = await client.supabase
      .from("lyads_alert_settings")
      .select("*")
      .eq("ad_account_id", accountId)
      .maybeSingle();
    if (result.error) throw result.error;
    const account = await client.supabase
      .from("lyads_ad_accounts")
      .select("currency,name")
      .eq("id", accountId)
      .single();
    if (account.error) throw account.error;
    return client.json({
      settings: Object.fromEntries(
        Object.keys(alertFields).map((key) => [
          key,
          result.data?.[key] ?? defaultAlertSettings[key],
        ]),
      ),
      fields: alertFields,
      canEdit: permission.can_edit,
      ...account.data,
    });
  } catch (error) {
    return apiFailure(error);
  }
}
export async function PUT(request: NextRequest, context: Context) {
  try {
    const body = await jsonBody(request);
    let settings;
    try {
      settings = validateAlertSettings(body);
    } catch {
      throw new ApiError(
        "INVALID_SETTINGS",
        400,
        "Vérifiez les seuils : les volumes minimum protègent contre les conclusions prématurées.",
      );
    }
    const { accountId } = await context.params;
    const client = await authenticated(request);
    const permission = await accountPermission(client, accountId, true);
    const result = await client.supabase
      .from("lyads_alert_settings")
      .upsert(
        {
          ...settings,
          ad_account_id: accountId,
          workspace_id: permission.workspace_id,
        },
        { onConflict: "ad_account_id" },
      );
    if (result.error) throw result.error;
    return client.json({ saved: true });
  } catch (error) {
    return apiFailure(error);
  }
}
