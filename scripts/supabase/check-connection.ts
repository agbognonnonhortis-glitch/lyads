import {
  getSupabaseConfig,
  SupabaseConfigurationError,
  SUPABASE_PROJECT_REF,
} from "../../src/lib/supabase/config";
import { checkSupabaseConnection } from "../../src/lib/supabase/connection";

async function main() {
  try {
    const result = await checkSupabaseConnection(getSupabaseConfig());
    console.log(
      JSON.stringify({ project: SUPABASE_PROJECT_REF, ...result }, null, 2),
    );
    if (result.status !== "services_reachable") process.exitCode = 1;
  } catch (error) {
    console.error(
      error instanceof SupabaseConfigurationError
        ? `Configuration Supabase : ${error.code}. Compléter .env.local avec la clé publiable du projet.`
        : "La vérification Supabase a échoué.",
    );
    process.exitCode = 1;
  }
}
void main();
