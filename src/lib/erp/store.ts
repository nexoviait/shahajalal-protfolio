import { useSyncExternalStore } from "react";
import type {
  Account,
  AccountType,
  AppState,
  AuditEntry,
  CollectionName,
  Company,
  JournalEntry,
  JournalLine,
  PeriodKey,
  Role,
  Row,
  Settings,
} from "./types";
import {
  expenseLines,
  incomeLines,
  intercompanyLoanEntries,
  intercompanyServiceEntries,
  CHART,
  nextAccountCode,
  registerCustomAccounts,
  reverseLines,
  type NewAccountKind,
  validateLines,
  type PayMode,
} from "./accounting";
import { assetPurchaseEntry, payrollEntry, pendingDepreciation } from "./ledger-ops";
import { DEFAULT_SETTINGS, buildSeed, STATE_VERSION } from "./seed";
import { canEdit, MODULE_IDS, type ModuleId } from "./rbac";
import { isoDate, uid } from "./format";
import { addPeriod, outstanding } from "./register";

const STORAGE_KEY = "sgos:state:v1";

const EMPTY: AppState = {
  version: STATE_VERSION,
  companies: [],
  journal: [],
  collections: {
    dailyReports: [],
    assets: [],
    employees: [],
    responsibilities: [],
    documents: [],
    land: [],
    projects: [],
    investments: [],
    ideas: [],
    tasks: [],
    approvals: [],
    users: [],
    personal: [],
    register: [],
    registerTxns: [],
  },
  audit: [],
  settings: DEFAULT_SETTINGS,
  activeCompanyId: "all",
  period: "month",
  customFrom: "",
  customTo: "",
  currentUserId: "u-owner",
  readNotifications: [],
};

let state: AppState = EMPTY;
let ready = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function persist() {
  try {
    if (typeof localStorage !== "undefined")
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage may be full or blocked; the in-memory state still works */
  }
}

function set(next: AppState) {
  registerCustomAccounts(next.settings.customAccounts);
  state = next;
  persist();
  emit();
}

const BUILT_IN_ACCOUNTS = () => CHART.filter((a) => !a.custom);

export type Result = { ok: true; id?: string } | { ok: false; error: string };
const fail = (error: string): Result => ({ ok: false, error });

export function getState(): AppState {
  return state;
}

export function isReady(): boolean {
  return ready;
}

/** Load saved state (or seed demo data). Call once on the client after mount. */
export function hydrate() {
  if (ready) return;
  let next: AppState | null = null;
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      // Merge defaults so settings added in newer versions exist on older saved data.
      if (parsed.version === STATE_VERSION) {
        next = { ...parsed, settings: { ...DEFAULT_SETTINGS, ...parsed.settings } };
        // Collections added in newer versions: start from the demo data instead of empty.
        if (!parsed.collections.register || !parsed.collections.registerTxns) {
          const seed = buildSeed(new Date());
          next.collections = {
            ...next.collections,
            register: parsed.collections.register ?? seed.collections.register,
            registerTxns: parsed.collections.registerTxns ?? seed.collections.registerTxns,
          };
        }
      }
    }
  } catch {
    next = null;
  }
  state = next ?? buildSeed(new Date());
  registerCustomAccounts(state.settings.customAccounts);
  ready = true;
  if (!next) persist();
  emit();
}

export function useERP(): AppState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => EMPTY,
  );
}

export function useReady(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => ready,
    () => false,
  );
}

export function currentUser(s: AppState = state): Row {
  return (
    s.collections.users.find((u) => u.id === s.currentUserId) ??
    s.collections.users[0] ?? { id: "unknown", name: "Unknown", role: "Employee" }
  );
}

export function currentRole(s: AppState = state): Role {
  return String(currentUser(s).role) as Role;
}

function audit(action: string, target: string, detail: string): AuditEntry {
  return {
    id: uid("aud"),
    at: new Date().toISOString(),
    user: String(currentUser().name),
    action,
    target,
    detail,
  };
}

function withAudit(next: AppState, entry: AuditEntry): AppState {
  return { ...next, audit: [entry, ...next.audit].slice(0, 2000) };
}

function guard(module: ModuleId): Result | null {
  return canEdit(currentRole(), module)
    ? null
    : fail(`Your role (${currentRole()}) cannot edit this module.`);
}

/* ------------------------------- UI state ------------------------------ */

export const ui = {
  setActiveCompany(id: string) {
    set({ ...state, activeCompanyId: id });
  },
  setPeriod(period: PeriodKey) {
    set({ ...state, period });
  },
  setCustomRange(from: string, to: string) {
    set({ ...state, period: "custom", customFrom: from, customTo: to });
  },
  setUser(id: string) {
    const user = state.collections.users.find((u) => u.id === id);
    if (!user) return;
    set(
      withAudit(
        { ...state, currentUserId: id },
        audit("Switch user", String(user.name), `Role ${user.role}`),
      ),
    );
  },
  setSettings(patch: Partial<Settings>) {
    // Long values (uploaded images) are summarised so the audit log stays small.
    const detail = JSON.stringify(patch, (_k, v: unknown) =>
      typeof v === "string" && v.length > 120 ? `[${v.length} characters]` : v,
    );
    const entry = audit("Settings", "System", detail);
    const last = state.audit[0];
    // Merge rapid consecutive edits (typing in a field) into one audit entry.
    const merge =
      last?.action === "Settings" &&
      last.user === entry.user &&
      Date.parse(entry.at) - Date.parse(last.at) < 10_000;
    const next = { ...state, settings: { ...state.settings, ...patch } };
    set(
      merge
        ? {
            ...next,
            audit: [
              { ...entry, id: last.id, detail: `${last.detail} ${detail}`.slice(0, 400) },
              ...state.audit.slice(1),
            ],
          }
        : withAudit(next, entry),
    );
  },
  /** Add a dropdown option on demand. `builtIn` lists the fixed options so duplicates are refused. */
  addOption(listId: string, value: string, builtIn: string[] = []): Result {
    const name = value.trim().replace(/\s+/g, " ");
    if (!name) return fail("Enter a name.");
    if (name.length > 60) return fail("Keep the name under 60 characters.");
    if (!MODULE_IDS.some((m) => canEdit(currentRole(), m)))
      return fail(`Your role (${currentRole()}) cannot add options.`);
    const current = state.settings.customOptions[listId] ?? [];
    if ([...builtIn, ...current].some((o) => o.toLowerCase() === name.toLowerCase()))
      return fail("That option already exists.");
    set(
      withAudit(
        {
          ...state,
          settings: {
            ...state.settings,
            customOptions: { ...state.settings.customOptions, [listId]: [...current, name] },
          },
        },
        audit("Add option", listId, name),
      ),
    );
    return { ok: true, id: name };
  },
  removeOption(listId: string, value: string): Result {
    if (!canEdit(currentRole(), "settings"))
      return fail("Only an administrator can remove options.");
    const next = (state.settings.customOptions[listId] ?? []).filter((o) => o !== value);
    const customOptions = { ...state.settings.customOptions };
    if (next.length) customOptions[listId] = next;
    else delete customOptions[listId];
    set(
      withAudit(
        { ...state, settings: { ...state.settings, customOptions } },
        audit("Remove option", listId, value),
      ),
    );
    return { ok: true };
  },
  /** Create a ledger account (income category, expense category or bank account) on demand. */
  addAccount(kind: NewAccountKind, value: string): Result {
    if (!canEdit(currentRole(), "finance"))
      return fail(`Your role (${currentRole()}) cannot add accounts.`);
    const name = value.trim().replace(/\s+/g, " ");
    if (!name) return fail("Enter a name.");
    if (name.length > 60) return fail("Keep the name under 60 characters.");
    const type: AccountType = kind === "bank" ? "asset" : kind;
    const dupe = [...state.settings.customAccounts, ...BUILT_IN_ACCOUNTS()].some(
      (a) =>
        a.type === type &&
        !!a.bank === (kind === "bank") &&
        a.name.toLowerCase() === name.toLowerCase(),
    );
    if (dupe) return fail("An account with that name already exists.");
    const code = nextAccountCode(kind);
    if (!code) return fail("No free account codes are left for this type.");
    const account: Account = {
      code,
      name: kind === "bank" ? `Bank – ${name}` : name,
      type,
      ...(kind === "bank" ? { bank: true } : {}),
    };
    set(
      withAudit(
        {
          ...state,
          settings: {
            ...state.settings,
            customAccounts: [...state.settings.customAccounts, account],
          },
        },
        audit("Add account", code, account.name),
      ),
    );
    return { ok: true, id: code };
  },
  removeAccount(code: string): Result {
    if (!canEdit(currentRole(), "settings"))
      return fail("Only an administrator can remove accounts.");
    if (state.journal.some((e) => e.lines.some((l) => l.account === code)))
      return fail("This account has ledger entries and cannot be removed.");
    set(
      withAudit(
        {
          ...state,
          settings: {
            ...state.settings,
            customAccounts: state.settings.customAccounts.filter((a) => a.code !== code),
          },
        },
        audit("Remove account", code, ""),
      ),
    );
    return { ok: true };
  },
  markRead(ids: string[]) {
    set({ ...state, readNotifications: [...new Set([...state.readNotifications, ...ids])] });
  },
};

/* ------------------------------- Companies ----------------------------- */

export const companies = {
  add(company: Omit<Company, "id"> & { id?: string }): Result {
    const denied = guard("companies");
    if (denied) return denied;
    if (!company.name.trim()) return fail("Company name is required.");
    const id =
      company.id ||
      `${company.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")}-${Math.random().toString(36).slice(2, 5)}`;
    set(
      withAudit(
        { ...state, companies: [...state.companies, { ...company, id } as Company] },
        audit("Create company", company.name, id),
      ),
    );
    return { ok: true, id };
  },
  update(id: string, patch: Partial<Company>): Result {
    const denied = guard("companies");
    if (denied) return denied;
    if (!state.companies.some((c) => c.id === id)) return fail("Company not found.");
    set(
      withAudit(
        { ...state, companies: state.companies.map((c) => (c.id === id ? { ...c, ...patch } : c)) },
        audit("Update company", id, Object.keys(patch).join(", ")),
      ),
    );
    return { ok: true, id };
  },
};

/* -------------------------------- Ledger ------------------------------- */

export const ledger = {
  /** Post a balanced entry. Posted entries can never be edited or deleted – only reversed. */
  post(input: {
    companyId: string;
    date: string;
    memo: string;
    lines: JournalLine[];
    counterpartyId?: string;
    source?: string;
  }): Result {
    const denied = guard("finance");
    if (denied) return denied;
    if (!state.companies.some((c) => c.id === input.companyId)) return fail("Select a company.");
    if (input.source && state.journal.some((e) => e.source === input.source))
      return fail("This entry has already been posted.");
    const v = validateLines(input.lines);
    if (!v.ok) return fail(v.error);
    const entry: JournalEntry = {
      id: uid("je"),
      companyId: input.companyId,
      date: input.date,
      memo: input.memo || "Journal entry",
      lines: input.lines,
      status: "posted",
      createdBy: String(currentUser().name),
      createdAt: new Date().toISOString(),
      ...(input.counterpartyId ? { counterpartyId: input.counterpartyId } : {}),
      ...(input.source ? { source: input.source } : {}),
    };
    set(
      withAudit(
        { ...state, journal: [...state.journal, entry] },
        audit("Post journal", input.companyId, `${entry.id}: ${entry.memo}`),
      ),
    );
    return { ok: true, id: entry.id };
  },

  /** Correction by authorised reversal; the original stays on the ledger, flagged as reversed. */
  reverse(entryId: string, reason: string): Result {
    const denied = guard("finance");
    if (denied) return denied;
    const original = state.journal.find((e) => e.id === entryId);
    if (!original) return fail("Entry not found.");
    if (original.status === "reversed") return fail("Entry is already reversed.");
    if (original.reversalOf) return fail("A reversal entry cannot itself be reversed.");
    if (!reason.trim()) return fail("A reason is required to reverse an entry.");
    const reversal: JournalEntry = {
      id: uid("je"),
      companyId: original.companyId,
      date: isoDate(new Date()),
      memo: `Reversal of ${original.id}: ${reason}`,
      lines: reverseLines(original.lines),
      status: "posted",
      reversalOf: original.id,
      createdBy: String(currentUser().name),
      createdAt: new Date().toISOString(),
    };
    const journal = state.journal.map((e) =>
      e.id === original.id ? { ...e, status: "reversed" as const, reversedBy: reversal.id } : e,
    );
    set(
      withAudit(
        { ...state, journal: [...journal, reversal] },
        audit("Reverse journal", original.id, reason),
      ),
    );
    return { ok: true, id: reversal.id };
  },

  recordTransaction(input: {
    companyId: string;
    date: string;
    kind: "income" | "expense";
    account: string;
    amount: number;
    mode: PayMode;
    memo: string;
    bank?: string;
  }): Result {
    if (!(input.amount > 0)) return fail("Amount must be greater than zero.");
    const bank = input.bank ?? "1200";
    const lines =
      input.kind === "income"
        ? incomeLines(input.account, input.amount, input.mode, bank)
        : expenseLines(input.account, input.amount, input.mode, bank);
    return ledger.post({ companyId: input.companyId, date: input.date, memo: input.memo, lines });
  },

  transferFunds(
    companyId: string,
    date: string,
    from: string,
    to: string,
    amount: number,
    memo: string,
  ): Result {
    if (!(amount > 0)) return fail("Amount must be greater than zero.");
    if (from === to) return fail("Choose two different accounts.");
    const [dr, cr] = [to, from];
    return ledger.post({
      companyId,
      date,
      memo: memo || `Transfer ${from} → ${to}`,
      lines: [
        { account: dr, debit: amount, credit: 0 },
        { account: cr, debit: 0, credit: amount },
      ],
    });
  },

  intercompany(
    kind: "loan" | "service",
    fromId: string,
    toId: string,
    amount: number,
    date: string,
  ): Result {
    const denied = guard("finance");
    if (denied) return denied;
    if (fromId === toId) return fail("Choose two different companies.");
    if (!(amount > 0)) return fail("Amount must be greater than zero.");
    const parts =
      kind === "loan"
        ? intercompanyLoanEntries(fromId, toId, amount)
        : intercompanyServiceEntries(fromId, toId, amount);
    const label = kind === "loan" ? "Intercompany loan" : "Intercompany service";
    const created: JournalEntry[] = parts.map((p, i) => ({
      id: uid("je"),
      companyId: p.companyId,
      date,
      memo: `${label} ${fromId} → ${toId}`,
      lines: p.lines,
      status: "posted" as const,
      counterpartyId: i === 0 ? toId : fromId,
      createdBy: String(currentUser().name),
      createdAt: new Date().toISOString(),
    }));
    set(
      withAudit(
        { ...state, journal: [...state.journal, ...created] },
        audit(label, `${fromId} → ${toId}`, String(amount)),
      ),
    );
    return { ok: true };
  },

  /** Post any depreciation not yet booked, up to the given month. Idempotent. */
  postDepreciation(upToMonth = isoDate(new Date()).slice(0, 7)): number {
    const denied = guard("assets");
    if (denied) return 0;
    const entries = pendingDepreciation(
      state.collections.assets,
      state.journal,
      upToMonth,
      String(currentUser().name),
    );
    if (!entries.length) return 0;
    set(
      withAudit(
        { ...state, journal: [...state.journal, ...entries] },
        audit("Post depreciation", upToMonth, `${entries.length} entries`),
      ),
    );
    return entries.length;
  },

  runPayroll(companyId: string, month: string): Result {
    const denied = guard("hr");
    if (denied) return denied;
    const entry = payrollEntry(
      companyId,
      month,
      state.collections.employees,
      state.journal,
      String(currentUser().name),
    );
    if (!entry) return fail("Payroll already posted for this month, or no active employees.");
    set(
      withAudit(
        { ...state, journal: [...state.journal, entry] },
        audit("Run payroll", companyId, month),
      ),
    );
    return { ok: true, id: entry.id };
  },
};

/* ------------------------------ Collections ---------------------------- */

const COLLECTION_MODULE: Record<CollectionName, ModuleId> = {
  dailyReports: "daily",
  assets: "assets",
  employees: "hr",
  responsibilities: "management",
  documents: "documents",
  land: "land",
  projects: "projects",
  investments: "investments",
  ideas: "planning",
  tasks: "tasks",
  approvals: "approvals",
  users: "users",
  personal: "personal",
  register: "register",
  registerTxns: "register",
};

export const data = {
  save(collection: CollectionName, row: Row): Result {
    const denied = guard(COLLECTION_MODULE[collection]);
    if (denied) return denied;
    const rows = state.collections[collection];
    const exists = rows.some((r) => r.id === row.id);
    if (
      collection === "approvals" &&
      exists &&
      rows.find((r) => r.id === row.id)?.status === "Approved"
    ) {
      return fail("Approved records are locked.");
    }
    let saved = row;
    let journal = state.journal;
    if (!exists && collection === "assets") {
      const entry = assetPurchaseEntry(row, String(currentUser().name));
      if (entry) journal = [...journal, entry];
    }
    if (collection === "approvals" && !exists) {
      const amount = Number(row.amount) || 0;
      const limit =
        state.settings.approvalLimits.find((l) => amount <= l.upTo) ??
        state.settings.approvalLimits[state.settings.approvalLimits.length - 1];
      saved = { ...row, status: "Pending", requiredLevels: limit?.levels ?? 1, currentLevel: 0 };
    }
    const next = exists ? rows.map((r) => (r.id === row.id ? saved : r)) : [...rows, saved];
    set(
      withAudit(
        { ...state, journal, collections: { ...state.collections, [collection]: next } },
        audit(exists ? "Update" : "Create", collection, row.id),
      ),
    );
    return { ok: true, id: row.id };
  },

  remove(collection: CollectionName, id: string): Result {
    const denied = guard(COLLECTION_MODULE[collection]);
    if (denied) return denied;
    const row = state.collections[collection].find((r) => r.id === id);
    if (!row) return fail("Record not found.");
    if (collection === "approvals" && row.status === "Approved")
      return fail("Approved records cannot be deleted.");
    if (collection === "register" && state.collections.registerTxns.some((t) => t.itemId === id))
      return fail("This account has transactions. Mark it as Closed instead of deleting it.");
    if (collection === "registerTxns")
      return fail("Register transactions are permanent. Void the transaction instead.");
    if (
      collection === "assets" &&
      state.journal.some((e) => e.source?.endsWith(`:${id}`) || e.source?.startsWith(`dep:${id}:`))
    ) {
      return fail("This asset has posted ledger entries. Mark it as Disposed instead of deleting.");
    }
    set(
      withAudit(
        {
          ...state,
          collections: {
            ...state.collections,
            [collection]: state.collections[collection].filter((r) => r.id !== id),
          },
        },
        audit("Delete", collection, id),
      ),
    );
    return { ok: true };
  },

  /** One approval step. Rows move to Approved when the required number of levels is reached. */
  decide(id: string, approve: boolean, remarks: string): Result {
    const denied = guard("approvals");
    if (denied) return denied;
    const row = state.collections.approvals.find((r) => r.id === id);
    if (!row) return fail("Approval not found.");
    if (row.status !== "Pending") return fail("This request is already decided.");
    const user = String(currentUser().name);
    const level = (Number(row.currentLevel) || 0) + (approve ? 1 : 0);
    const done = approve && level >= (Number(row.requiredLevels) || 1);
    const updated: Row = {
      ...row,
      currentLevel: level,
      status: !approve ? "Rejected" : done ? "Approved" : "Pending",
      approvedBy: approve ? [row.approvedBy, user].filter(Boolean).join(" → ") : user,
      approvalDate: !approve || done ? isoDate(new Date()) : "",
      remarks: [row.remarks, remarks].filter(Boolean).join(" | "),
    };
    set(
      withAudit(
        {
          ...state,
          collections: {
            ...state.collections,
            approvals: state.collections.approvals.map((r) => (r.id === id ? updated : r)),
          },
        },
        audit(approve ? "Approve" : "Reject", "approvals", `${id} → ${updated.status}`),
      ),
    );
    return { ok: true };
  },

  reviewReport(id: string, status: "Approved" | "Correction Requested", comment: string): Result {
    const denied = guard("daily");
    if (denied) return denied;
    const row = state.collections.dailyReports.find((r) => r.id === id);
    if (!row) return fail("Report not found.");
    const updated = { ...row, status, ownerComment: comment };
    set(
      withAudit(
        {
          ...state,
          collections: {
            ...state.collections,
            dailyReports: state.collections.dailyReports.map((r) => (r.id === id ? updated : r)),
          },
        },
        audit("Review report", id, status),
      ),
    );
    return { ok: true };
  },
};

/* --------------------------- Financial register ------------------------- */

export const financeRegister = {
  /**
   * Record a settlement (payment made/received) or an increase (new borrowing, charge, further
   * lending) against a register account. Settlements move the next due date forward and close
   * the account when the balance reaches zero.
   */
  addTxn(input: {
    itemId: string;
    txnType: "Increase" | "Settlement";
    amount: number;
    date: string;
    notes?: string;
  }): Result {
    const denied = guard("register");
    if (denied) return denied;
    const item = state.collections.register.find((r) => r.id === input.itemId);
    if (!item) return fail("Choose an account.");
    if (item.status === "Closed") return fail("This account is closed.");
    if (!(input.amount > 0)) return fail("Amount must be greater than zero.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return fail("Enter a valid date.");
    const balance = outstandingOf(item);
    if (input.txnType === "Settlement" && input.amount > balance + 0.005)
      return fail(
        `The amount is more than the outstanding balance of ${balance.toLocaleString("en-BD")}.`,
      );

    const txn: Row = {
      id: uid("rtx"),
      itemId: item.id,
      date: input.date,
      amount: input.amount,
      txnType: input.txnType,
      status: "Posted",
      notes: input.notes ?? "",
      submittedBy: String(currentUser().name),
    };
    let updated: Row = item;
    if (input.txnType === "Settlement") {
      const left = Math.round((balance - input.amount) * 100) / 100;
      if (left <= 0) updated = { ...item, status: "Closed", nextDueDate: "" };
      else if (item.nextDueDate && item.frequency !== "One-time") {
        // One instalment is cleared for each full instalment paid (at least one for any payment
        // when no instalment amount is set).
        const inst = Number(item.installmentAmount) || 0;
        const steps = inst > 0 ? Math.floor(input.amount / inst) : 1;
        let due = String(item.nextDueDate);
        for (let i = 0; i < steps; i++) due = addPeriod(due, item.frequency);
        updated = { ...item, nextDueDate: due };
      }
    }
    set(
      withAudit(
        {
          ...state,
          collections: {
            ...state.collections,
            registerTxns: [...state.collections.registerTxns, txn],
            register: state.collections.register.map((r) => (r.id === item.id ? updated : r)),
          },
        },
        audit(input.txnType, "register", `${item.title}: ${input.amount}`),
      ),
    );
    return { ok: true, id: txn.id };
  },

  /** Void a transaction (kept for the audit trail, excluded from balances). */
  voidTxn(id: string, reason: string): Result {
    const denied = guard("register");
    if (denied) return denied;
    const txn = state.collections.registerTxns.find((t) => t.id === id);
    if (!txn) return fail("Transaction not found.");
    if (txn.status === "Voided") return fail("Already voided.");
    if (!reason.trim()) return fail("A reason is required to void a transaction.");
    const item = state.collections.register.find((r) => r.id === txn.itemId);
    set(
      withAudit(
        {
          ...state,
          collections: {
            ...state.collections,
            registerTxns: state.collections.registerTxns.map((t) =>
              t.id === id
                ? { ...t, status: "Voided", notes: `${t.notes ?? ""} [Voided: ${reason}]`.trim() }
                : t,
            ),
            // Re-open an account that a now-voided payment had closed.
            register: state.collections.register.map((r) =>
              r.id === txn.itemId && r.status === "Closed" ? { ...r, status: "Active" } : r,
            ),
          },
        },
        audit("Void transaction", "register", `${item?.title ?? txn.itemId}: ${reason}`),
      ),
    );
    return { ok: true };
  },
};

function outstandingOf(item: Row): number {
  return outstanding(item, state.collections.registerTxns);
}

/* ------------------------------ Maintenance ---------------------------- */

export const system = {
  exportBackup(): string {
    return JSON.stringify(state, null, 2);
  },
  importBackup(json: string): Result {
    try {
      const parsed = JSON.parse(json) as AppState;
      if (
        parsed.version !== STATE_VERSION ||
        !Array.isArray(parsed.companies) ||
        !Array.isArray(parsed.journal)
      ) {
        return fail("This file is not a valid b Group backup.");
      }
      set(
        withAudit(
          { ...parsed, settings: { ...DEFAULT_SETTINGS, ...parsed.settings } },
          audit("Restore backup", "System", `${parsed.journal.length} journal entries`),
        ),
      );
      return { ok: true };
    } catch {
      return fail("The backup file could not be read.");
    }
  },
  resetDemo() {
    set(buildSeed(new Date()));
  },
  /** Test helper: replace the whole state. */
  _replace(next: AppState) {
    registerCustomAccounts(next.settings.customAccounts);
    state = next;
    ready = true;
    emit();
  },
};
