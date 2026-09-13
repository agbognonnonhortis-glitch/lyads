export const SUPABASE_PROJECT_REF = "beplqbktgbizhfcoixoi";
export const SUPABASE_PROJECT_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co`;

export type SupabaseConfig = { url: string; publishableKey: string };
export type SupabaseEnvironment = {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
};

export class SupabaseConfigurationError extends Error {
  constructor(
    public readonly code:
      "MISSING_CONFIGURATION" | "WRONG_PROJECT" | "INVALID_PUBLIC_KEY",
  ) {
    super(code);
    this.name = "SupabaseConfigurationError";
  }
}

export function getSupabaseConfig(
  env: SupabaseEnvironment = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  },
): SupabaseConfig {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "");
  const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !publishableKey)
    throw new SupabaseConfigurationError("MISSING_CONFIGURATION");
  if (url !== SUPABASE_PROJECT_URL)
    throw new SupabaseConfigurationError("WRONG_PROJECT");
  // Only the modern public key belongs in NEXT_PUBLIC_ variables. No secret or service-role key.
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey)) {
    throw new SupabaseConfigurationError("INVALID_PUBLIC_KEY");
  }
  return { url, publishableKey };
}
