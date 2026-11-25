import type { Role } from "./types";

export type ModuleId =
  | "dashboard"
  | "companies"
  | "daily"
  | "finance"
  | "treasury"
  | "assets"
  | "hr"
  | "management"
  | "projects"
  | "land"
  | "investments"
  | "planning"
  | "breakeven"
  | "documents"
  | "tasks"
  | "approvals"
  | "ai"
  | "reports"
  | "notifications"
  | "personal"
  | "register"
  | "users"
  | "settings";

export type Access = "none" | "view" | "edit";

const ALL: ModuleId[] = [
  "dashboard",
  "companies",
  "daily",
  "finance",
  "treasury",
  "assets",
  "hr",
  "management",
  "projects",
  "land",
  "investments",
  "planning",
  "breakeven",
  "documents",
  "tasks",
  "approvals",
  "ai",
  "reports",
  "notifications",
  "personal",
  "register",
  "users",
  "settings",
];

function grant(
  map: Partial<Record<ModuleId, Access>>,
  base: Access = "none",
): Record<ModuleId, Access> {
  return Object.fromEntries(ALL.map((m) => [m, map[m] ?? base])) as Record<ModuleId, Access>;
}

/** Permission matrix. Backend/DB must enforce the same rules (see docs/ARCHITECTURE.md). */
export const PERMISSIONS: Record<Role, Record<ModuleId, Access>> = {
  "Group Owner": grant({}, "edit"),
  "Group Administrator": grant(
    {
      personal: "none",
      register: "none",
      settings: "edit",
      users: "edit",
      ai: "view",
      treasury: "view",
      investments: "view",
    },
    "edit",
  ),
  "Company Director": grant({
    dashboard: "view",
    daily: "view",
    finance: "view",
    assets: "view",
    hr: "view",
    management: "view",
    projects: "edit",
    land: "view",
    documents: "view",
    tasks: "edit",
    approvals: "edit",
    reports: "view",
    notifications: "view",
    breakeven: "view",
    companies: "view",
  }),
  "Company Operator": grant({
    dashboard: "view",
    daily: "edit",
    tasks: "edit",
    documents: "edit",
    notifications: "view",
    projects: "view",
  }),
  "Company Accountant": grant({
    dashboard: "view",
    finance: "edit",
    assets: "edit",
    hr: "view",
    reports: "edit",
    approvals: "view",
    documents: "view",
    notifications: "view",
    breakeven: "view",
    daily: "view",
  }),
  "HR Manager": grant({
    dashboard: "view",
    hr: "edit",
    management: "edit",
    tasks: "edit",
    documents: "edit",
    notifications: "view",
    reports: "view",
  }),
  "Department Manager": grant({
    dashboard: "view",
    daily: "edit",
    tasks: "edit",
    management: "view",
    projects: "view",
    notifications: "view",
  }),
  Investor: grant({ investments: "view", reports: "view", notifications: "view" }),
  Employee: grant({ tasks: "view", notifications: "view", hr: "view" }),
};

export function access(role: Role, module: ModuleId): Access {
  return PERMISSIONS[role][module];
}

export function canView(role: Role, module: ModuleId): boolean {
  return access(role, module) !== "none";
}

export function canEdit(role: Role, module: ModuleId): boolean {
  return access(role, module) === "edit";
}

/** A user may only touch the companies assigned to them (owner/admin: all). */
export function canAccessCompany(role: Role, assigned: string[], companyId: string): boolean {
  if (role === "Group Owner" || role === "Group Administrator") return true;
  return assigned.includes(companyId);
}

export const MODULE_IDS = ALL;
