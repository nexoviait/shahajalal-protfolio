import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { useScope } from "@/components/erp/hooks";
import {
  Empty,
  ExportMenu,
  PageHeader,
  Panel,
  SimpleTable,
  Stat,
  StatGrid,
  StatusPill,
} from "@/components/erp/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ACCOUNT_BY_CODE,
  BANK_CODES,
  CHART,
  EXPENSE_ACCOUNTS,
  INCOME_ACCOUNTS,
  accountBalance,
  balanceSheet,
  cashFlow,
  generalLedger,
  profitAndLoss,
  trialBalance,
  validateLines,
  type PayMode,
} from "@/lib/erp/accounting";
import { inRange } from "@/lib/erp/period";
import { isoDate, money } from "@/lib/erp/format";
import { canEdit } from "@/lib/erp/rbac";
import { currentRole, ledger } from "@/lib/erp/store";
import type { JournalLine } from "@/lib/erp/types";

export const Route = createFileRoute("/app/finance")({
  head: () => ({
    meta: [
      { title: "Finance & Accounting | b Group" },
      {
        name: "description",
        content:
          "Double-entry accounting per company with income, expenses, cash, banks, intercompany transactions and financial statements.",
      },
    ],
  }),
  component: Finance,
});

const MODES: { value: PayMode; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank" },
  { value: "credit", label: "On credit (receivable / payable)" },
];

function CompanyPick({
  value,
  onChange,
  label = "Company",
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  const { companies } = useScope();
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={label}>
          <SelectValue placeholder="Select company" />
        </SelectTrigger>
        <SelectContent>
          {companies.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function Transactions() {
  const { companies, entries, name, state } = useScope();
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [kind, setKind] = useState<"income" | "expense">("income");
  const [account, setAccount] = useState("4100");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<PayMode>("bank");
  const [bank, setBank] = useState("1200");
  const [date, setDate] = useState(isoDate(new Date()));
  const [memo, setMemo] = useState("");
  const editable = canEdit(currentRole(state), "finance");
  const accounts = kind === "income" ? INCOME_ACCOUNTS : EXPENSE_ACCOUNTS;

  const submit = () => {
    const res = ledger.recordTransaction({
      companyId,
      date,
      kind,
      account,
      amount: Number(amount),
      mode,
      memo: memo || (kind === "income" ? "Income" : "Expense"),
      bank,
    });
    if (res.ok) {
      toast.success("Transaction posted with matching debit and credit entries");
      setAmount("");
      setMemo("");
    } else toast.error(res.error);
  };

  const [reverseId, setReverseId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const recent = [...entries]
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 25);

  return (
    <div className="space-y-6">
      {editable ? (
        <Panel
          title="Record income or expense"
          description="Every transaction generates balanced debit and credit entries in the company ledger."
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <CompanyPick value={companyId} onChange={setCompanyId} />
            <div className="grid gap-1.5">
              <Label>Type</Label>
              <Select
                value={kind}
                onValueChange={(v) => {
                  setKind(v as "income" | "expense");
                  setAccount(v === "income" ? "4100" : "5300");
                }}
              >
                <SelectTrigger aria-label="Type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Category</Label>
              <Select value={account} onValueChange={setAccount}>
                <SelectTrigger aria-label="Category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.code} value={a.code}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="tx-amount">Amount (BDT)</Label>
              <Input
                id="tx-amount"
                type="number"
                min={0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Payment</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as PayMode)}>
                <SelectTrigger aria-label="Payment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {mode === "bank" ? (
              <div className="grid gap-1.5">
                <Label>Bank account</Label>
                <Select value={bank} onValueChange={setBank}>
                  <SelectTrigger aria-label="Bank account">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BANK_CODES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {ACCOUNT_BY_CODE[c]?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="grid gap-1.5">
              <Label htmlFor="tx-date">Date</Label>
              <Input
                id="tx-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="tx-memo">Memo</Label>
              <Input id="tx-memo" value={memo} onChange={(e) => setMemo(e.target.value)} />
            </div>
          </div>
          <Button className="mt-4" onClick={submit}>
            <Plus className="size-4" /> Post transaction
          </Button>
        </Panel>
      ) : null}

      <Panel
        title="General journal"
        description="Posted entries are never edited or deleted. Corrections are made by reversal, which keeps a full audit trail."
      >
        {recent.length === 0 ? (
          <Empty>No entries.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Company</th>
                  <th className="px-3 py-2">Memo</th>
                  <th className="px-3 py-2">Lines</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {recent.map((e) => (
                  <tr key={e.id} className="align-top">
                    <td className="px-3 py-2 whitespace-nowrap">{e.date}</td>
                    <td className="px-3 py-2">{name(e.companyId)}</td>
                    <td className="px-3 py-2">{e.memo}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {e.lines
                        .map(
                          (l) =>
                            `${l.debit ? "Dr" : "Cr"} ${l.account} ${ACCOUNT_BY_CODE[l.account]?.name ?? ""}`,
                        )
                        .join(" · ")}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      {money(e.lines.reduce((s, l) => s + l.debit, 0))}
                    </td>
                    <td className="px-3 py-2">
                      <StatusPill
                        value={
                          e.status === "reversed"
                            ? "Rejected"
                            : e.reversalOf
                              ? "Pending"
                              : "Approved"
                        }
                      />
                      <span className="sr-only">{e.status}</span>
                    </td>
                    <td className="px-3 py-2">
                      {editable && e.status === "posted" && !e.reversalOf ? (
                        reverseId === e.id ? (
                          <div className="flex gap-1.5">
                            <Input
                              value={reason}
                              onChange={(ev) => setReason(ev.target.value)}
                              placeholder="Reason"
                              aria-label="Reversal reason"
                              className="h-8 w-40"
                            />
                            <Button
                              size="sm"
                              onClick={() => {
                                const r = ledger.reverse(e.id, reason);
                                if (r.ok) {
                                  toast.success("Entry reversed");
                                  setReverseId(null);
                                  setReason("");
                                } else toast.error(r.error);
                              }}
                            >
                              Confirm
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => setReverseId(e.id)}>
                            <Undo2 className="size-3.5" /> Reverse
                          </Button>
                        )
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

function ManualJournal() {
  const { companies, state } = useScope();
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [date, setDate] = useState(isoDate(new Date()));
  const [memo, setMemo] = useState("");
  const [lines, setLines] = useState<JournalLine[]>([
    { account: "1100", debit: 0, credit: 0 },
    { account: "4100", debit: 0, credit: 0 },
  ]);
  const v = validateLines(lines);
  const d = lines.reduce((s, l) => s + l.debit, 0);
  const c = lines.reduce((s, l) => s + l.credit, 0);
  if (!canEdit(currentRole(state), "finance"))
    return <Empty>Your role has read-only access to finance.</Empty>;
  const setLine = (i: number, patch: Partial<JournalLine>) =>
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  return (
    <Panel
      title="Manual journal entry"
      description="For adjustments and transactions not covered by the quick forms. Debits must equal credits."
    >
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <CompanyPick value={companyId} onChange={setCompanyId} />
        <div className="grid gap-1.5">
          <Label htmlFor="mj-date">Date</Label>
          <Input id="mj-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="mj-memo">Memo</Label>
          <Input id="mj-memo" value={memo} onChange={(e) => setMemo(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        {lines.map((l, i) => (
          <div key={i} className="grid grid-cols-[1fr_7rem_7rem_2.5rem] gap-2">
            <Select value={l.account} onValueChange={(a) => setLine(i, { account: a })}>
              <SelectTrigger aria-label={`Account line ${i + 1}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHART.map((a) => (
                  <SelectItem key={a.code} value={a.code}>
                    {a.code} · {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              min={0}
              aria-label={`Debit line ${i + 1}`}
              placeholder="Debit"
              value={l.debit || ""}
              onChange={(e) => setLine(i, { debit: Number(e.target.value) || 0, credit: 0 })}
            />
            <Input
              type="number"
              min={0}
              aria-label={`Credit line ${i + 1}`}
              placeholder="Credit"
              value={l.credit || ""}
              onChange={(e) => setLine(i, { credit: Number(e.target.value) || 0, debit: 0 })}
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Remove line ${i + 1}`}
              onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}
              disabled={lines.length <= 2}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLines((ls) => [...ls, { account: "1100", debit: 0, credit: 0 }])}
        >
          <Plus className="size-4" /> Add line
        </Button>
        <span
          className={`font-mono text-sm ${d === c && d > 0 ? "text-primary" : "text-destructive"}`}
        >
          Debit {money(d)} · Credit {money(c)}
        </span>
        {!v.ok ? <span className="text-xs text-muted-foreground">{v.error}</span> : null}
        <Button
          className="ml-auto"
          disabled={!v.ok}
          onClick={() => {
            const r = ledger.post({ companyId, date, memo: memo || "Manual journal", lines });
            if (r.ok) {
              toast.success("Journal posted");
              setMemo("");
              setLines([
                { account: "1100", debit: 0, credit: 0 },
                { account: "4100", debit: 0, credit: 0 },
              ]);
            } else toast.error(r.error);
          }}
        >
          Post entry
        </Button>
      </div>
    </Panel>
  );
}

function Intercompany() {
  const { companies, state, entries, name } = useScope();
  const [from, setFrom] = useState(companies[0]?.id ?? "");
  const [to, setTo] = useState(companies[1]?.id ?? "");
  const [kind, setKind] = useState<"loan" | "service">("loan");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(isoDate(new Date()));
  const rows = entries.filter(
    (e) =>
      e.lines.some((l) => l.account === "1300" || l.account === "2300") ||
      e.lines.some((l) => l.account === "4900" || l.account === "5900"),
  );
  const pos = new Map<string, { recv: number; pay: number }>();
  for (const c of companies) {
    const tb = trialBalance(entries.filter((e) => e.companyId === c.id));
    pos.set(c.id, { recv: accountBalance(tb, "1300"), pay: accountBalance(tb, "2300") });
  }
  return (
    <div className="space-y-6">
      {canEdit(currentRole(state), "finance") ? (
        <Panel
          title="Intercompany transaction"
          description="Lender/provider books a receivable; borrower/receiver books a payable. Group consolidated reports eliminate both sides."
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="grid gap-1.5">
              <Label>Type</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as "loan" | "service")}>
                <SelectTrigger aria-label="Type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="loan">Loan</SelectItem>
                  <SelectItem value="service">Services / shared expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <CompanyPick
              value={from}
              onChange={setFrom}
              label={kind === "loan" ? "Lender" : "Provider"}
            />
            <CompanyPick
              value={to}
              onChange={setTo}
              label={kind === "loan" ? "Borrower" : "Receiver"}
            />
            <div className="grid gap-1.5">
              <Label htmlFor="ic-amt">Amount</Label>
              <Input
                id="ic-amt"
                type="number"
                min={0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ic-date">Date</Label>
              <Input
                id="ic-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          <Button
            className="mt-4"
            onClick={() => {
              const r = ledger.intercompany(kind, from, to, Number(amount), date);
              if (r.ok) {
                toast.success("Intercompany entries posted to both companies");
                setAmount("");
              } else toast.error(r.error);
            }}
          >
            Post to both ledgers
          </Button>
        </Panel>
      ) : null}
      <Panel title="Intercompany receivables & payables">
        <SimpleTable
          head={["Company", "Receivable", "Payable"]}
          align={["left", "right", "right"]}
          rows={companies
            .filter((c) => (pos.get(c.id)?.recv ?? 0) || (pos.get(c.id)?.pay ?? 0))
            .map((c) => [c.name, money(pos.get(c.id)?.recv ?? 0), money(pos.get(c.id)?.pay ?? 0)])}
        />
      </Panel>
      <Panel title="Intercompany entries">
        <SimpleTable
          head={["Date", "Company", "Memo"]}
          rows={rows
            .slice(-15)
            .reverse()
            .map((e) => [e.date, name(e.companyId), e.memo])}
        />
      </Panel>
    </div>
  );
}

function BankCash() {
  const { companies, entries, state, name } = useScope();
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [from, setFrom] = useState("1100");
  const [to, setTo] = useState("1200");
  const [amount, setAmount] = useState("");
  const [stmt, setStmt] = useState<Record<string, string>>({});
  const tb = trialBalance(entries.filter((e) => e.companyId === companyId));
  const accts = ["1100", ...BANK_CODES];
  return (
    <div className="space-y-6">
      <Panel
        title="Account-wise balance"
        description="Cash in hand and each bank account for one company"
      >
        <div className="mb-4 max-w-xs">
          <CompanyPick value={companyId} onChange={setCompanyId} />
        </div>
        <SimpleTable
          head={[
            "Account",
            "Ledger balance",
            "Bank statement balance",
            "Difference (reconciliation)",
          ]}
          align={["left", "right", "right", "right"]}
          rows={accts.map((a) => {
            const bal = accountBalance(tb, a);
            const raw = stmt[a];
            const diff = raw === undefined || raw === "" ? null : Number(raw) - bal;
            return [
              ACCOUNT_BY_CODE[a]?.name ?? a,
              money(bal),
              a === "1100" ? (
                "—"
              ) : (
                <Input
                  key={a}
                  type="number"
                  aria-label={`Statement balance ${a}`}
                  className="ml-auto h-8 w-36 text-right"
                  value={raw ?? ""}
                  onChange={(e) => setStmt({ ...stmt, [a]: e.target.value })}
                />
              ),
              diff === null ? (
                "—"
              ) : (
                <span key="d" className={diff === 0 ? "text-primary" : "text-destructive"}>
                  {diff === 0 ? "Reconciled" : money(diff)}
                </span>
              ),
            ];
          })}
        />
      </Panel>
      {canEdit(currentRole(state), "finance") ? (
        <Panel
          title="Transfers, deposits and withdrawals"
          description={`Move money between cash and bank accounts for ${name(companyId)}. Deposit = cash → bank; withdrawal = bank → cash.`}
        >
          <div className="grid gap-4 sm:grid-cols-4">
            {(
              [
                ["From", from, setFrom],
                ["To", to, setTo],
              ] as const
            ).map(([label, val, set]) => (
              <div key={label} className="grid gap-1.5">
                <Label>{label}</Label>
                <Select value={val} onValueChange={set}>
                  <SelectTrigger aria-label={label}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accts.map((a) => (
                      <SelectItem key={a} value={a}>
                        {ACCOUNT_BY_CODE[a]?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
            <div className="grid gap-1.5">
              <Label htmlFor="tr-amt">Amount</Label>
              <Input
                id="tr-amt"
                type="number"
                min={0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => {
                  const r = ledger.transferFunds(
                    companyId,
                    isoDate(new Date()),
                    from,
                    to,
                    Number(amount),
                    "",
                  );
                  if (r.ok) {
                    toast.success("Transfer posted");
                    setAmount("");
                  } else toast.error(r.error);
                }}
              >
                Post transfer
              </Button>
            </div>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

const STATEMENTS = [
  "Profit & Loss",
  "Balance Sheet",
  "Cash Flow",
  "Trial Balance",
  "General Ledger",
  "Accounts Receivable",
  "Accounts Payable",
  "Expense Report",
  "Income Report",
] as const;

function Statements() {
  const { state, entries, range, ids } = useScope();
  const [which, setWhich] = useState<(typeof STATEMENTS)[number]>("Profit & Loss");
  const [code, setCode] = useState("1200");
  const multi = ids.length > 1;
  const [consolidated, setConsolidated] = useState(true);
  const opts = { consolidated: multi && consolidated };
  const period = entries.filter((e) => inRange(e.date, range));
  const asOf = entries.filter((e) => e.date <= range.to);

  const view = (() => {
    switch (which) {
      case "Profit & Loss": {
        const pl = profitAndLoss(period, opts);
        return {
          head: ["Account", "Amount"],
          rows: [
            ["INCOME", ""],
            ...pl.income.map((r) => [`${r.code} ${r.name}`, r.amount]),
            ["Total income", pl.totalIncome],
            ["EXPENSES", ""],
            ...pl.expenses.map((r) => [`${r.code} ${r.name}`, r.amount]),
            ["Total expenses", pl.totalExpenses],
            ["NET PROFIT / (LOSS)", pl.netProfit],
          ] as (string | number)[][],
        };
      }
      case "Balance Sheet": {
        const b = balanceSheet(asOf, opts);
        return {
          head: ["Account", "Amount"],
          rows: [
            ["ASSETS", ""],
            ...b.assets.map((r) => [`${r.code} ${r.name}`, r.amount]),
            ["Total assets", b.totalAssets],
            ["LIABILITIES", ""],
            ...b.liabilities.map((r) => [`${r.code} ${r.name}`, r.amount]),
            ["Total liabilities", b.totalLiabilities],
            ["EQUITY", ""],
            ...b.equity.map((r) => [`${r.code} ${r.name}`, r.amount]),
            ["Total equity", b.totalEquity],
            [
              "Check: assets − liabilities − equity",
              b.totalAssets - b.totalLiabilities - b.totalEquity,
            ],
          ] as (string | number)[][],
        };
      }
      case "Cash Flow": {
        const f = cashFlow(period);
        return {
          head: ["Activity", "Amount"],
          rows: [
            ["Operating activities", f.operating],
            ["Investing activities", f.investing],
            ["Financing activities", f.financing],
            ["Net change in cash & bank", f.net],
          ] as (string | number)[][],
        };
      }
      case "Trial Balance": {
        const tb = trialBalance(asOf, opts);
        return {
          head: ["Account", "Debit", "Credit"],
          rows: [
            ...tb.map((b) => [`${b.code} ${b.name}`, b.debit, b.credit]),
            ["Total", tb.reduce((s, b) => s + b.debit, 0), tb.reduce((s, b) => s + b.credit, 0)],
          ] as (string | number)[][],
        };
      }
      case "General Ledger": {
        const rows = generalLedger(asOf, code);
        return {
          head: ["Date", "Memo", "Debit", "Credit", "Balance"],
          rows: rows.map((r) => [r.date, r.memo, r.debit, r.credit, r.running]) as (
            string | number
          )[][],
        };
      }
      case "Accounts Receivable": {
        const tb = trialBalance(asOf, opts);
        return {
          head: ["Account", "Outstanding"],
          rows: [
            ["Customer receivables", accountBalance(tb, "1400")],
            ["Intercompany receivable", accountBalance(tb, "1300")],
          ] as (string | number)[][],
        };
      }
      case "Accounts Payable": {
        const tb = trialBalance(asOf, opts);
        return {
          head: ["Account", "Outstanding"],
          rows: [
            ["Supplier payables", accountBalance(tb, "2100")],
            ["Tax & VAT payable", accountBalance(tb, "2200")],
            ["Loans payable", accountBalance(tb, "2400")],
            ["Intercompany payable", accountBalance(tb, "2300")],
          ] as (string | number)[][],
        };
      }
      case "Expense Report": {
        const pl = profitAndLoss(period, opts);
        return {
          head: ["Expense", "Amount", "Share"],
          rows: pl.expenses.map((r) => [
            `${r.code} ${r.name}`,
            r.amount,
            `${pl.totalExpenses ? ((r.amount / pl.totalExpenses) * 100).toFixed(1) : 0}%`,
          ]) as (string | number)[][],
        };
      }
      case "Income Report": {
        const pl = profitAndLoss(period, opts);
        return {
          head: ["Income", "Amount", "Share"],
          rows: pl.income.map((r) => [
            `${r.code} ${r.name}`,
            r.amount,
            `${pl.totalIncome ? ((r.amount / pl.totalIncome) * 100).toFixed(1) : 0}%`,
          ]) as (string | number)[][],
        };
      }
    }
  })();

  const exportRows = view.rows.map((r) =>
    Object.fromEntries(view.head.map((h, i) => [h, r[i] ?? ""])),
  );
  const isMoney = (v: string | number, i: number) =>
    typeof v === "number" && !(which === "General Ledger" && i === 0);
  return (
    <Panel
      title={which}
      description={`${which === "Balance Sheet" || which === "Trial Balance" || which === "General Ledger" || which.startsWith("Accounts") ? `As of ${range.to}` : `${range.from} → ${range.to}`} · generated from the accounting ledger${multi && consolidated ? " · consolidated (intercompany eliminated)" : ""}`}
      actions={
        <div className="flex flex-wrap gap-2">
          <ExportMenu name={which.toLowerCase().replace(/[^a-z]+/g, "-")} rows={exportRows} />
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap items-end gap-3 print:hidden">
        <div className="grid gap-1.5">
          <Label>Statement</Label>
          <Select value={which} onValueChange={(v) => setWhich(v as (typeof STATEMENTS)[number])}>
            <SelectTrigger className="w-56" aria-label="Statement">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATEMENTS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {which === "General Ledger" ? (
          <div className="grid gap-1.5">
            <Label>Account</Label>
            <Select value={code} onValueChange={setCode}>
              <SelectTrigger className="w-64" aria-label="Account">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHART.map((a) => (
                  <SelectItem key={a.code} value={a.code}>
                    {a.code} · {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        {multi ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={consolidated}
              onChange={(e) => setConsolidated(e.target.checked)}
            />{" "}
            Consolidate (eliminate intercompany)
          </label>
        ) : null}
        <span className="text-xs text-muted-foreground">
          {ids.length} {ids.length === 1 ? "company" : "companies"} in scope · {state.period}
        </span>
      </div>
      <SimpleTable
        head={view.head}
        align={view.head.map((_, i) =>
          i === 0 || (which === "General Ledger" && i === 1) ? "left" : "right",
        )}
        rows={view.rows.map((r) =>
          r.map((cell, i) => (isMoney(cell, i) ? money(Number(cell)) : cell)),
        )}
      />
    </Panel>
  );
}

function Finance() {
  const { summary } = useScope();
  return (
    <div>
      <PageHeader
        title="Finance & Accounting"
        description="Independent double-entry accounting for every company, with consolidated group statements. All reports are generated from the ledger."
      />
      <StatGrid>
        <Stat label="Income" value={money(summary.revenue)} />
        <Stat label="Expenses" value={money(summary.expenses)} />
        <Stat
          label="Net profit / loss"
          value={money(summary.profit)}
          tone={summary.profit >= 0 ? "good" : "bad"}
        />
        <Stat
          label="Cash & bank"
          value={money(summary.cash + summary.bank)}
          hint={`Receivables ${money(summary.receivables)} · Payables ${money(summary.payables)}`}
        />
      </StatGrid>
      <Tabs defaultValue="transactions">
        <TabsList className="mb-4 flex h-auto flex-wrap">
          <TabsTrigger value="transactions">Transactions & journal</TabsTrigger>
          <TabsTrigger value="manual">Manual entry</TabsTrigger>
          <TabsTrigger value="bank">Cash & bank</TabsTrigger>
          <TabsTrigger value="intercompany">Intercompany</TabsTrigger>
          <TabsTrigger value="statements">Financial statements</TabsTrigger>
        </TabsList>
        <TabsContent value="transactions">
          <Transactions />
        </TabsContent>
        <TabsContent value="manual">
          <ManualJournal />
        </TabsContent>
        <TabsContent value="bank">
          <BankCash />
        </TabsContent>
        <TabsContent value="intercompany">
          <Intercompany />
        </TabsContent>
        <TabsContent value="statements">
          <Statements />
        </TabsContent>
      </Tabs>
    </div>
  );
}
