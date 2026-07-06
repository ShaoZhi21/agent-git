import {
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { orgs } from "./orgs";
import { users } from "./users";

export const membershipRole = pgEnum("membership_role", [
  "owner",
  "admin",
  "member",
  "viewer",
]);

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    role: membershipRole("role").notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userOrgUnique: uniqueIndex("memberships_user_id_org_id_unique").on(
      table.userId,
      table.orgId,
    ),
  }),
);
