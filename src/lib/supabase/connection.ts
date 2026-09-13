import type { SupabaseConfig } from "./config";

type ServiceStatus = {
  service: "auth" | "data_api";
  ok: boolean;
  httpStatus: number | null;
  evidence: "http_success" | "schema_cache_response" | null;
};
export type SupabaseConnectionStatus = {
  status: "services_reachable" | "service_unavailable";
  checks: ServiceStatus[];
  databaseReadVerified: false;
};

/** Tests reachability and the public key, without reading or changing client data. */
export async function checkSupabaseConnection(
  config: SupabaseConfig,
  fetcher: typeof fetch = fetch,
): Promise<SupabaseConnectionStatus> {
  const services = [
    { service: "auth" as const, path: "/auth/v1/health" },
    // OpenAPI at /rest/v1/ requires an administrator key. A deliberately absent
    // relation tests publishable-key access to PostgREST without returning rows.
    {
      service: "data_api" as const,
      path: "/rest/v1/__lyads_connection_probe__?select=*&limit=0",
    },
  ];
  const checks = await Promise.all(
    services.map(async ({ service, path }) => {
      try {
        const response = await fetcher(config.url + path, {
          method: "GET",
          headers: { apikey: config.publishableKey },
          cache: "no-store",
          signal: AbortSignal.timeout(8000),
        });
        let schemaCacheResponded = false;
        if (service === "data_api" && response.status === 404) {
          const body: unknown = await response.json();
          schemaCacheResponded =
            typeof body === "object" &&
            body !== null &&
            "code" in body &&
            body.code === "PGRST205";
        } else {
          await response.body?.cancel();
        }
        return {
          service,
          ok: response.ok || schemaCacheResponded,
          httpStatus: response.status,
          evidence: schemaCacheResponded
            ? ("schema_cache_response" as const)
            : response.ok
              ? ("http_success" as const)
              : null,
        };
      } catch {
        // Never return request headers, credentials or upstream response contents.
        return { service, ok: false, httpStatus: null, evidence: null };
      }
    }),
  );
  return {
    status: checks.every((check) => check.ok)
      ? "services_reachable"
      : "service_unavailable",
    checks,
    databaseReadVerified: false,
  };
}
