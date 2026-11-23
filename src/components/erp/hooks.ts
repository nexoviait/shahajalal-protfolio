import { useMemo } from "react";

import { currentRange, scopeCompanies, summarize, type CompanySummary } from "@/lib/erp/analytics";
import type { JournalEntry, Company, AppState } from "@/lib/erp/types";
import type { Range } from "@/lib/erp/period";
import { useERP } from "@/lib/erp/store";

export type Scope = {
  state: AppState;
  companies: Company[];
  ids: string[];
  range: Range;
  /** Ledger entries in the selected company scope (all dates). */
  entries: JournalEntry[];
  /** Consolidated (or single-company) summary for the selected period. */
  summary: CompanySummary;
  perCompany: { company: Company; summary: CompanySummary }[];
  name: (companyId?: string) => string;
};

/** Everything a page needs to know about the current company/period selection. */
export function useScope(): Scope {
  const state = useERP();
  return useMemo(() => {
    const companies = scopeCompanies(state);
    const ids = companies.map((c) => c.id);
    const range = currentRange(state);
    const entries = state.journal.filter((e) => ids.includes(e.companyId));
    const summary = summarize(state, ids, range, { consolidated: true });
    const perCompany = companies.map((company) => ({
      company,
      summary: summarize(state, [company.id], range),
    }));
    const name = (id?: string) => state.companies.find((c) => c.id === id)?.name ?? "—";
    return { state, companies, ids, range, entries, summary, perCompany, name };
  }, [state]);
}
