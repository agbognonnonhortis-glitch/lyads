import { NextRequest } from "next/server";
import {
  authenticated,
  apiFailure,
  ApiError,
  jsonBody,
  uuid,
} from "@/lib/backend/http";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ adId: string }> },
) {
  try {
    await jsonBody(request);
    const client = await authenticated(request);
    const { adId } = await context.params;
    if (!uuid(adId))
      throw new ApiError(
        "INVALID_AD",
        400,
        "Sélectionnez une publicité valide.",
      );
    const job = await client.supabase.rpc("lyads_request_ad_media", {
      target_ad: adId,
    });
    if (job.error?.code === "42501")
      throw new ApiError(
        "ACCESS_DENIED",
        403,
        "Demandez un accès à ce compte publicitaire.",
      );
    if (job.error?.code === "P0001")
      throw new ApiError(
        "RATE_LIMIT",
        429,
        "Patientez une minute avant de recharger les médias.",
      );
    if (job.error) throw job.error;
    const result = await client.supabase
      .from("lyads_jobs")
      .select("status,result,error_code")
      .eq("id", job.data)
      .single();
    if (result.error) throw result.error;
    return client.json({
      status: result.data.status,
      media: result.data.result?.media || [],
      message:
        result.data.status === "failed"
          ? "Meta n’a pas rendu ce média accessible. Vérifiez les autorisations du compte et de la page, puis réessayez."
          : null,
    });
  } catch (error) {
    return apiFailure(error);
  }
}
