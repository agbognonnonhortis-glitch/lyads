import {
  getSupabaseConfig,
  SupabaseConfigurationError,
} from "@/lib/supabase/config";
import { checkSupabaseConnection } from "@/lib/supabase/connection";

export const dynamic = "force-dynamic";

export async function GET() {
  // Diagnostics stay local. Production must use its own authenticated operational checks.
  if (process.env.NODE_ENV === "production")
    return new Response(null, { status: 404 });
  const headers = { "Cache-Control": "no-store" };
  try {
    const result = await checkSupabaseConnection(getSupabaseConfig());
    return Response.json(result, {
      status: result.status === "services_reachable" ? 200 : 503,
      headers,
    });
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) {
      return Response.json(
        { status: "configuration_required", code: error.code },
        { status: 503, headers },
      );
    }
    return Response.json(
      { status: "service_unavailable" },
      { status: 503, headers },
    );
  }
}
