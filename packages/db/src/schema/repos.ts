import {
  bigint,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { installations } from "./installations";
import { orgs } from "./orgs";

export const repos = pgTable(
  "repos",
  {
    id: uuid("id").primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id),
    installationId: bigint("installation_id", { mode: "bigint" }).references(
      () => installations.id,
    ),
    githubRepoId: bigint("github_repo_id", { mode: "bigint" }).notNull(),
    fullName: text("full_name").notNull(),
    defaultBranch: text("default_branch").notNull().default("main"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    orgGithubRepoUnique: uniqueIndex("repos_org_id_github_repo_id_unique").on(
      table.orgId,
      table.githubRepoId,
    ),
  }),
);
