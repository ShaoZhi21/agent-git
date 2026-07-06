import { bigint, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { orgs } from "./orgs";

export const installations = pgTable("installations", {
  id: bigint("id", { mode: "bigint" }).primaryKey(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => orgs.id),
  accountLogin: text("account_login").notNull(),
  accountType: text("account_type").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
