import { sql } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";

import * as schema from "./schema";

export interface GetDbOptions {
  databaseUrl?: string;
  orgId?: string;
}

export type AgentGitDatabase = PostgresJsDatabase<typeof schema>;
export type AgentGitTransaction = Parameters<
  Parameters<AgentGitDatabase["transaction"]>[0]
>[0];

export interface AgentGitDb {
  db: AgentGitDatabase;
  sql: Sql;
  orgId?: string;
  transaction<T>(callback: (tx: AgentGitTransaction) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export function getDb(optionsOrOrgId: GetDbOptions | string = {}): AgentGitDb {
  const options =
    typeof optionsOrOrgId === "string"
      ? { orgId: optionsOrOrgId }
      : optionsOrOrgId;
  const databaseUrl =
    options.databaseUrl ??
    process.env.DATABASE_URL ??
    "postgres://agentgit:agentgit@localhost:5432/agentgit";
  const client = postgres(databaseUrl);
  const db = drizzle(client, { schema });

  return {
    db,
    sql: client,
    orgId: options.orgId,
    async transaction<T>(callback: (tx: AgentGitTransaction) => Promise<T>) {
      return db.transaction(async (tx) => {
        if (options.orgId) {
          await tx.execute(
            sql`SELECT set_config('app.current_org_id', ${options.orgId}, true)`,
          );
        }

        return callback(tx);
      });
    },
    async close() {
      await client.end();
    },
  };
}
