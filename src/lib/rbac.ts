export type UserRole =
  | "administrator"
  | "finance"
  | "pastorate"
  | "secured_guest";

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

export function getRolePermissions(role: UserRole | null | undefined): RolePermissions {
  if (!role) {
    return DEFAULT_PERMISSIONS;
  }
  return ROLE_PERMISSIONS[role] ?? DEFAULT_PERMISSIONS;
}

export function getRoleDisplayName(role: UserRole | null | undefined): string {
  if (!role) {
    return "";
  }
  return ROLE_LABELS[role] ?? role;
}

export const ALL_ROLES: UserRole[] = [
  "administrator",
  "finance",
  "pastorate",
  "secured_guest",
];
