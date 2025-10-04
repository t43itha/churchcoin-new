import { v } from "convex/values";

export const CANONICAL_ROLES = [
  "administrator",
  "finance",
  "pastorate",
  "secured_guest",
] as const;

export type CanonicalRole = (typeof CANONICAL_ROLES)[number];

const legacyRoleMap = {
  admin: "administrator",
} as const;

export type LegacyRole = keyof typeof legacyRoleMap;
export type StoredRole = CanonicalRole | LegacyRole;

const canonicalRoleSet = new Set<string>(CANONICAL_ROLES);

export const userRoleValidator = v.union(
  v.literal("administrator"),
  v.literal("finance"),
  v.literal("pastorate"),
  v.literal("secured_guest"),
  v.literal("admin"),
);

export function normalizeRole(role: StoredRole | string): CanonicalRole {
  if (role in legacyRoleMap) {
    return legacyRoleMap[role as LegacyRole];
  }

  if (canonicalRoleSet.has(role)) {
    return role as CanonicalRole;
  }

  return "administrator";
}

export function isCanonicalRole(role: string): role is CanonicalRole {
  return canonicalRoleSet.has(role);
}

export function isLegacyRole(role: string): role is LegacyRole {
  return role in legacyRoleMap;
}
