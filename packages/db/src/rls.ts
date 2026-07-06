export const tenantScopedTables = [
  "memberships",
  "installations",
  "repos",
] as const;

export type TenantScopedTable = (typeof tenantScopedTables)[number];

export function tenantPolicyName(tableName: TenantScopedTable) {
  return `${tableName}_tenant_isolation`;
}
