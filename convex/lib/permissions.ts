/**
 * Permission constants and role-based access control utilities
 *
 * Roles hierarchy (highest to lowest):
 * - administrator: Full access to all church operations
 * - finance: Can manage transactions, funds, donors, reports
 * - pastorate: Can view financial data, manage donors
 * - secured_guest: Read-only access to limited data
 */

import type { CanonicalRole } from "../roles";

/**
 * Permission levels for different operations
 */
export const PERMISSION_LEVELS = {
  /** Can read data */
  READ: "read",
  /** Can create and update data */
  WRITE: "write",
  /** Can delete data and manage settings */
  ADMIN: "admin",
} as const;

export type PermissionLevel = (typeof PERMISSION_LEVELS)[keyof typeof PERMISSION_LEVELS];

/**
 * Role capabilities mapped to permission levels
 */
export const ROLE_PERMISSIONS: Record<CanonicalRole, {
  read: boolean;
  write: boolean;
  admin: boolean;
}> = {
  administrator: { read: true, write: true, admin: true },
  finance: { read: true, write: true, admin: false },
  pastorate: { read: true, write: false, admin: false },
  secured_guest: { read: true, write: false, admin: false },
};

/**
 * Roles that can write (create/update) data
 */
export const WRITE_ROLES: CanonicalRole[] = ["administrator", "finance"];

/**
 * Roles that can administer (delete, settings)
 */
export const ADMIN_ROLES: CanonicalRole[] = ["administrator"];

/**
 * All roles that have read access
 */
export const READ_ROLES: CanonicalRole[] = [
  "administrator",
  "finance",
  "pastorate",
  "secured_guest",
];

/**
 * Check if a role has a specific permission level
 */
export function hasPermission(
  role: CanonicalRole,
  level: PermissionLevel
): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  return permissions[level];
}

/**
 * Check if a role can write data
 */
export function canWrite(role: CanonicalRole): boolean {
  return hasPermission(role, "write");
}

/**
 * Check if a role can administer
 */
export function canAdmin(role: CanonicalRole): boolean {
  return hasPermission(role, "admin");
}

/**
 * Check if role is at least the specified level
 */
export function isAtLeast(
  role: CanonicalRole,
  requiredRole: CanonicalRole
): boolean {
  const roleHierarchy: CanonicalRole[] = [
    "administrator",
    "finance",
    "pastorate",
    "secured_guest",
  ];

  const roleIndex = roleHierarchy.indexOf(role);
  const requiredIndex = roleHierarchy.indexOf(requiredRole);

  // Lower index = higher permission
  return roleIndex !== -1 && requiredIndex !== -1 && roleIndex <= requiredIndex;
}

/**
 * Operation types that require specific permissions
 */
export const OPERATIONS = {
  // Fund operations
  VIEW_FUNDS: "read",
  CREATE_FUND: "write",
  UPDATE_FUND: "write",
  DELETE_FUND: "admin",

  // Transaction operations
  VIEW_TRANSACTIONS: "read",
  CREATE_TRANSACTION: "write",
  UPDATE_TRANSACTION: "write",
  DELETE_TRANSACTION: "admin",

  // Donor operations
  VIEW_DONORS: "read",
  CREATE_DONOR: "write",
  UPDATE_DONOR: "write",
  DELETE_DONOR: "admin",

  // Report operations
  VIEW_REPORTS: "read",
  GENERATE_REPORTS: "write",

  // Settings operations
  VIEW_SETTINGS: "read",
  UPDATE_SETTINGS: "admin",

  // User management
  VIEW_USERS: "admin",
  INVITE_USERS: "admin",
  MANAGE_USERS: "admin",

  // Bank connections
  VIEW_BANK_CONNECTIONS: "admin",
  MANAGE_BANK_CONNECTIONS: "admin",
  SYNC_BANK_TRANSACTIONS: "write",
} as const satisfies Record<string, PermissionLevel>;

export type Operation = keyof typeof OPERATIONS;

/**
 * Check if a role can perform a specific operation
 */
export function canPerform(role: CanonicalRole, operation: Operation): boolean {
  const requiredLevel = OPERATIONS[operation];
  return hasPermission(role, requiredLevel);
}
