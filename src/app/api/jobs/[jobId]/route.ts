import { NextRequest } from "next/server";
import { authenticated, apiFailure, uuid, ApiError } from "@/lib/backend/http";
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await context.params;
    if (!uuid(jobId))
      throw new ApiError(
        "INVALID_JOB",
        400,
        "Sélectionnez un traitement valide.",
      );
    const client = await authenticated(request);
    const { data, error } = await client.supabase
      .from("lyads_jobs")
      .select(
        "id,kind,status,progress_done,progress_total,result,error_code,created_at,updated_at",
      )
      .eq("id", jobId)
      .maybeSingle();
    if (error) throw error;
    if (!data)
      throw new ApiError(
        "JOB_NOT_FOUND",
        404,
        "Ce traitement est introuvable ou inaccessible.",
      );
    return client.json({ job: data });
  } catch (error) {
    return apiFailure(error);
  }
}
