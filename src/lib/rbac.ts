export const ALL_ROLES = [
  "administrator",
  "finance",
  "pastorate",
  "secured_guest",
] as const;

export type UserRole = (typeof ALL_ROLES)[number];

export type RolePermissions = {
  /** Ability to view financial dashboards and ledgers */
  canViewFinancialData: boolean;
  /** Ability to create, edit, reconcile, or delete financial records */
  canManageFinancialData: boolean;
  /** Ability to administer user accounts and system settings */
  canManageUsers: boolean;
  /** Ability to create manual transaction entries */
  canRecordManualTransactions: boolean;
  /** Whether the role should be limited to manual entry tooling only */
  restrictedToManualEntry: boolean;
};

const ROLE_LABELS: Record<UserRole, string> = {
  administrator: "Administrator",
  finance: "Finance team",
  pastorate: "Pastorate",
  secured_guest: "Secured guest access",
};

const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  administrator: {
    canViewFinancialData: true,
    canManageFinancialData: true,
    canManageUsers: true,
    canRecordManualTransactions: true,
    restrictedToManualEntry: false,
  },
  finance: {
    canViewFinancialData: true,
    canManageFinancialData: true,
    canManageUsers: false,
    canRecordManualTransactions: true,
    restrictedToManualEntry: false,
  },
  pastorate: {
    canViewFinancialData: true,
    canManageFinancialData: false,
    canManageUsers: false,
    canRecordManualTransactions: false,
    restrictedToManualEntry: false,
  },
  secured_guest: {
    canViewFinancialData: false,
    canManageFinancialData: false,
    canManageUsers: false,
    canRecordManualTransactions: true,
    restrictedToManualEntry: true,
  },
};

const DEFAULT_PERMISSIONS: RolePermissions = {
  canViewFinancialData: false,
  canManageFinancialData: false,
  canManageUsers: false,
  canRecordManualTransactions: false,
  restrictedToManualEntry: false,
};

const ROLE_LOOKUP = new Set<UserRole>(ALL_ROLES);

export const DEFAULT_ROLE: UserRole = "administrator";

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && ROLE_LOOKUP.has(value as UserRole);
}

export function resolveUserRole(role: unknown): UserRole {
  if (isUserRole(role)) {
    return role;
  }
  return DEFAULT_ROLE;
}

export function getRolePermissions(role: unknown): RolePermissions {
  const resolved = resolveUserRole(role);
  return ROLE_PERMISSIONS[resolved] ?? DEFAULT_PERMISSIONS;
}

export function getRoleDisplayName(role: unknown): string {
  const resolved = resolveUserRole(role);
  return ROLE_LABELS[resolved] ?? resolved;
}
