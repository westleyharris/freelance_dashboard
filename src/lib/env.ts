/**
 * Environment validation.
 *
 * Without this, a missing variable surfaces as a bare "Internal Server Error"
 * from middleware — no stack, no page, no clue which variable. Vercel doesn't
 * inherit your local .env, so every value has to be set again in the project
 * settings, and forgetting one is the single most likely deploy failure.
 */

export interface EnvCheck {
  ok: boolean;
  missing: string[];
}

const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

export function checkEnv(): EnvCheck {
  const missing = REQUIRED.filter((name) => !process.env[name]?.trim());
  return { ok: missing.length === 0, missing };
}

/**
 * Only the two public values are needed to build a browser/session client.
 * Checked separately so the app can still sign you in even if the service-role
 * key is missing (only the intake form and cron need that one).
 */
export function hasPublicEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  );
}
