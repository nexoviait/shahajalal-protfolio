/** Core domain types for b Group. */

export type CompanyStatus =
  | "Active"
  | "Under Development"
  | "Planned"
  | "Investment Stage"
  | "Temporarily Inactive"
  | "Closed";

export const COMPANY_STATUSES: CompanyStatus[] = [
  "Active",
  "Under Development",
  "Planned",
  "Investment Stage",
  "Temporarily Inactive",
  "Closed",
];

export type Company = {
  id: string;
  name: string;
  category: string;
  status: CompanyStatus;
  registrationNo: string;
  tradeLicense: string;
  tin: string;
  bin: string;
  incorporationDate: string;
  address: string;
  website: string;
  contact: string;
  managingDirector: string;
  administrator: string;
  vision: string;
  mission: string;
  objectives: string;
  businessModel: string;
  initialInvestment: number;
  currentValuation: number;
  /** Legal ownership parent (holding structure). Independent when empty. */
  legalParentId: string;
  /** Reporting parent, configured independently from legal ownership. */
  reportingParentId: string;
  /** Planned monthly figures used for break-even status. */
  fixedMonthlyCosts: number;
  currency: string;
};

export type AccountType = "asset" | "liability" | "equity" | "income" | "expense";

export type Account = {
  code: string;
  name: string;
  type: AccountType;
  /** Intercompany accounts are eliminated on consolidation. */
  intercompany?: boolean;
  /** A bank account (counts as cash & bank). */
  bank?: boolean;
  /** Created by the owner in Settings or from a dropdown. */
  custom?: boolean;
};

export type JournalLine = { account: string; debit: number; credit: number };

export type JournalEntry = {
  id: string;
  companyId: string;
  date: string;
  memo: string;
  lines: JournalLine[];
  status: "posted" | "reversed";
  /** Id of the entry this one reverses. */
  reversalOf?: string;
  reversedBy?: string;
  counterpartyId?: string;
  /** Idempotency / traceability key, e.g. "dep:asset-1:2026-11". */
  source?: string;
  createdBy: string;
  createdAt: string;
};

export type AuditEntry = {
  id: string;
  at: string;
  user: string;
  action: string;
  target: string;
  detail: string;
};

export type Role =
  | "Group Owner"
  | "Group Administrator"
  | "Company Director"
  | "Company Operator"
  | "Company Accountant"
  | "HR Manager"
  | "Department Manager"
  | "Investor"
  | "Employee";

export const ROLES: Role[] = [
  "Group Owner",
  "Group Administrator",
  "Company Director",
  "Company Operator",
  "Company Accountant",
  "HR Manager",
  "Department Manager",
  "Investor",
  "Employee",
];

/** Every field name used by the register-style modules (assets, HR, land, ...). */
export const ROW_KEYS = [
  "access",
  "achievements",
  "actualCost",
  "actualReturn",
  "address",
  "agreement",
  "allowances",
  "amount",
  "approvalDate",
  "approvedBy",
  "areaDecimal",
  "assetCode",
  "assignedTo",
  "attendance",
  "bankReceived",
  "basicSalary",
  "bonus",
  "budget",
  "cashBalance",
  "cashReceived",
  "category",
  "challenges",
  "comments",
  "companyIds",
  "competitors",
  "completedWork",
  "concept",
  "constructionCost",
  "consultantFees",
  "currentLevel",
  "customSchedule",
  "customers",
  "dagNumber",
  "date",
  "deadline",
  "decisions",
  "deductions",
  "delayedTasks",
  "department",
  "description",
  "designation",
  "district",
  "dividendPaid",
  "dividendPayable",
  "documents",
  "downloads",
  "email",
  "emergencyContact",
  "employeeCode",
  "equipment",
  "evidence",
  "expectedCompletion",
  "expectedReturn",
  "expectedUnits",
  "expenses",
  "expiryDate",
  "fileName",
  "financialScore",
  "gps",
  "installationCost",
  "insurance",
  "investment",
  "investorName",
  "invoiceNo",
  "issueDate",
  "jlNumber",
  "joiningDate",
  "khatianNumber",
  "kind",
  "kpi",
  "labor",
  "landCost",
  "lastLogin",
  "legalRequirements",
  "legalStatus",
  "loanRecovery",
  "location",
  "maintenance",
  "maintenanceExpense",
  "manager",
  "marketing",
  "materials",
  "method",
  "mission",
  "monthlyExpenses",
  "monthlyRevenue",
  "monthlyTarget",
  "mouza",
  "mutationStatus",
  "name",
  "needsApproval",
  "notes",
  "ongoingActivities",
  "operationalIssues",
  "operationalScore",
  "ordersCompleted",
  "ordersReceived",
  "otherCosts",
  "outstandingPayments",
  "overtime",
  "ownerAttention",
  "ownerComment",
  "ownership",
  "payables",
  "pendingDecisions",
  "phone",
  "pricePerUnit",
  "priority",
  "problems",
  "progress",
  "progressPct",
  "projectProgress",
  "propertyType",
  "purchaseDate",
  "purchasePrice",
  "purpose",
  "ratePercent",
  "reason",
  "receivables",
  "registration",
  "registrationCost",
  "remarks",
  "rentalIncome",
  "reportingFrequency",
  "reportingManager",
  "reportsExpected",
  "reportsSubmitted",
  "requestDate",
  "requestedBy",
  "requiredAssets",
  "requiredInvestment",
  "requiredLevels",
  "requiredManpower",
  "responsiblePerson",
  "revenue",
  "revenueModel",
  "revenueTarget",
  "risks",
  "role",
  "sales",
  "salvageValue",
  "sharePct",
  "sharePrice",
  "shareQty",
  "stage",
  "startDate",
  "startupCost",
  "status",
  "submittedBy",
  "supplier",
  "tags",
  "targetAchievedPct",
  "targetMarket",
  "tasksAssigned",
  "tasksCompleted",
  "taxDeduction",
  "team",
  "title",
  "tomorrowPlan",
  "twoFactor",
  "type",
  "upazila",
  "usefulLifeYears",
  "variableCostPerUnit",
  "vision",
  "version",
  "currentValuation",
  "warranty",
  "scope",
  "party",
  "openingAmount",
  "nextDueDate",
  "installmentAmount",
  "frequency",
  "creditLimit",
  "interestRate",
  "itemId",
  "txnType",
  "partyAlias",
] as const;

export type RowKey = (typeof ROW_KEYS)[number];

/** A register record. Known fields are optional so dot access type-checks under strict settings. */
export type Row = { id: string; companyId?: string | undefined } & {
  [K in RowKey]?: string | number | boolean | undefined;
};

export type CollectionName =
  | "dailyReports"
  | "assets"
  | "employees"
  | "responsibilities"
  | "documents"
  | "land"
  | "projects"
  | "investments"
  | "ideas"
  | "tasks"
  | "approvals"
  | "users"
  | "personal"
  | "register"
  | "registerTxns";

export type Collections = Record<CollectionName, Row[]>;

export type PeriodKey =
  "today" | "yesterday" | "week" | "month" | "lastMonth" | "quarter" | "year" | "custom" | "all";

export type Settings = {
  lang: "en" | "bn";
  theme: "light" | "dark";
  lowCashThreshold: number;
  /** Approval ladder: amounts up to `upTo` need `levels` approvals. */
  approvalLimits: { upTo: number; levels: number }[];
  documentExpiryDays: number;
  /** Notification types that should also be emailed (delivery needs the backend mailer). */
  emailAlerts: string[];
  alertEmail: string;
  /** Branding, editable in System Settings. Images are stored as data URLs. */
  brandName: string;
  brandTagline: string;
  logoDataUrl: string;
  faviconDataUrl: string;
  heroTitle: string;
  heroText: string;
  /** Extra dropdown options created on demand, keyed by list id (e.g. "documents.category"). */
  customOptions: Record<string, string[]>;
  /** Extra ledger accounts (income / expense categories, bank accounts). */
  customAccounts: Account[];
};

export type AppState = {
  version: number;
  companies: Company[];
  journal: JournalEntry[];
  collections: Collections;
  audit: AuditEntry[];
  settings: Settings;
  /** UI state */
  activeCompanyId: string;
  period: PeriodKey;
  customFrom: string;
  customTo: string;
  currentUserId: string;
  readNotifications: string[];
};
