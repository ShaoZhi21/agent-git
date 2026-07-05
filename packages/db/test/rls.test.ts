import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { eq } from "drizzle-orm";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getDb } from "../src/client";
import { newId } from "../src/id";
import { orgs, repos } from "../src/schema";

const ownerDatabaseUrl =
  process.env.DATABASE_URL ??
  "postgres://agentgit:agentgit@localhost:5432/agentgit";

const appRolePassword = process.env.AGENTGIT_APP_DB_PASSWORD ?? "agentgit_app";
let testDatabaseName = "";
let testOwnerDatabaseUrl = "";

function databaseUrlForDatabase(databaseUrl: string, databaseName: string) {
  const url = new URL(databaseUrl);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

function quoteIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

async function applyMigrations(databaseUrl: string) {
  const sql = postgres(databaseUrl, { max: 1 });
  const migrationsDir = join(import.meta.dirname, "..", "migrations");
  const migrationFiles = ["0000_init.sql", "0001_rls.sql"];

  try {
    for (const file of migrationFiles) {
      await sql.unsafe(await readFile(join(migrationsDir, file), "utf8"));
    }
  } finally {
    await sql.end();
  }
}

beforeAll(async () => {
  testDatabaseName = `agentgit_test_${randomUUID().replaceAll("-", "_")}`;
  testOwnerDatabaseUrl = databaseUrlForDatabase(
    ownerDatabaseUrl,
    testDatabaseName,
  );
  const admin = postgres(databaseUrlForDatabase(ownerDatabaseUrl, "postgres"), {
    max: 1,
  });

  try {
    await admin.unsafe(`CREATE DATABASE ${quoteIdentifier(testDatabaseName)}`);
  } finally {
    await admin.end();
  }

  await applyMigrations(testOwnerDatabaseUrl);
});

afterAll(async () => {
  if (!testDatabaseName) return;

  const admin = postgres(databaseUrlForDatabase(ownerDatabaseUrl, "postgres"), {
    max: 1,
  });

  try {
    await admin`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = ${testDatabaseName}
    `;
    await admin.unsafe(
      `DROP DATABASE IF EXISTS ${quoteIdentifier(testDatabaseName)}`,
    );
  } finally {
    await admin.end();
  }
});

describe("tenant RLS", () => {
  it("limits app-role repo reads to app.current_org_id", async () => {
    const owner = getDb({ databaseUrl: testOwnerDatabaseUrl });
    const orgAId = newId();
    const orgBId = newId();
    const repoAId = newId();
    const repoBId = newId();

    try {
      await owner.db.insert(orgs).values([
        { id: orgAId, name: "Org A" },
        { id: orgBId, name: "Org B" },
      ]);
      await owner.db.insert(repos).values([
        {
          id: repoAId,
          orgId: orgAId,
          githubRepoId: 101,
          fullName: "org-a/repo",
          defaultBranch: "main",
        },
        {
          id: repoBId,
          orgId: orgBId,
          githubRepoId: 202,
          fullName: "org-b/repo",
          defaultBranch: "main",
        },
      ]);
    } finally {
      await owner.close();
    }

    const appRoleUrl = databaseUrlForDatabase(
      `postgres://agentgit_app:${appRolePassword}@localhost:5432/agentgit`,
      testDatabaseName,
    );
    const orgA = getDb({ databaseUrl: appRoleUrl, orgId: orgAId });

    try {
      const rows = await orgA.transaction((tx) =>
        tx.select().from(repos).orderBy(repos.fullName),
      );

      expect(rows.map((row) => row.fullName)).toEqual(["org-a/repo"]);
    } finally {
      await orgA.close();
    }
  });

  it("rejects app-role writes for a different tenant", async () => {
    const owner = getDb({ databaseUrl: testOwnerDatabaseUrl });
    const orgAId = newId();
    const orgBId = newId();

    try {
      await owner.db.insert(orgs).values([
        { id: orgAId, name: "Write Org A" },
        { id: orgBId, name: "Write Org B" },
      ]);
    } finally {
      await owner.close();
    }

    const appRoleUrl = databaseUrlForDatabase(
      `postgres://agentgit_app:${appRolePassword}@localhost:5432/agentgit`,
      testDatabaseName,
    );
    const orgA = getDb({ databaseUrl: appRoleUrl, orgId: orgAId });

    try {
      await expect(
        orgA.transaction((tx) =>
          tx.insert(repos).values({
            id: newId(),
            orgId: orgBId,
            githubRepoId: 303,
            fullName: "org-b/blocked",
            defaultBranch: "main",
          }),
        ),
      ).rejects.toThrow();

      const leakedRows = await orgA.transaction((tx) =>
        tx.select().from(repos).where(eq(repos.fullName, "org-b/blocked")),
      );
      expect(leakedRows).toEqual([]);
    } finally {
      await orgA.close();
    }
  });
});
