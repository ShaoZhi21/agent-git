import { z } from 'zod';

// Validated environment. Fail fast at boot if config is wrong.
export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().default(3001),
  // Required once packages/db is wired (build step 1):
  DATABASE_URL: z.string().url().optional(),
  // GitHub App (F1.3) — required to mint installation tokens; PEM may use
  // literal \n escapes. GitHub OAuth (F1.2) is a separate credential pair:
  // OAuth = user login, App = repo access. Do not conflate (auth.md).
  GITHUB_APP_ID: z.string().optional(),
  GITHUB_APP_PRIVATE_KEY: z.string().optional(),
  GITHUB_WEBHOOK_SECRET: z.string().optional(),
  GITHUB_OAUTH_CLIENT_ID: z.string().optional(),
  GITHUB_OAUTH_CLIENT_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  return envSchema.parse(raw);
}
