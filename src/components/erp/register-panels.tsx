import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Check, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { DataModule, type FieldDef } from "@/components/erp/DataModule";
import {
  Empty,
  ExportMenu,
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
import { Textarea } from "@/components/ui/textarea";
import { parseEntry, type Draft } from "@/lib/erp/assistant";
import { isoDate, money, moneyShort, percent } from "@/lib/erp/format";
import {
  byScope,
  daysUntil,
  dueAmount,
  dueStage,
  FREQUENCIES,
  installmentSchedule,
  KINDS,
  outstanding,
  parties,
  partyStatement,
  SCOPES,
  summarizeRegister,
  weOwe,
} from "@/lib/erp/register";
import { canEdit } from "@/lib/erp/rbac";
import { currentRole, financeRegister, useERP } from "@/lib/erp/store";
import type { Row } from "@/lib/erp/types";

const today = () => isoDate(new Date());

function useRegister(scope: string) {
  const state = useERP();
  const all = state.collections.register;
  const txns = state.collections.registerTxns;
  const items = scope === "All" ? all : all.filter((i) => i.scope === scope);
  const name = (id?: string) => state.companies.find((c) => c.id === id)?.name ?? "—";
  return { state, items, all, txns, name };
}

const STAGE_LABEL: Record<string, string> = {
  overdue: "Delayed",
  today: "Delayed",
  within3: "Pending",
  within7: "Submitted",
  later: "Active",
  none: "Closed",
};

function dueText(item: Row, bal: number): string {
  const stage = dueStage(item, bal, today());
  if (stage === "none") return "—";
  const d = daysUntil(String(item.nextDueDate), today());
  return stage === "overdue"
    ? `${String(item.nextDueDate)} · ${Math.abs(d)}d overdue`
    : `${String(item.nextDueDate)} · in ${d}d`;
}

/* ----------------------------- Overview ------------------------------ */

export function Overview({ scope }: { scope: string }) {
  const { items, txns, name } = useRegister(scope);
  const s = summarizeRegister(items, txns, today());
  const split = byScope(items, txns, name);
  const rows = split.map((r) => ({
    Scope: r.label,
    Payable: r.payable,
    Receivable: r.receivable,
    "Net position": r.net,
  }));
  rows.push({
    Scope: "Total",
    Payable: s.payable,
    Receivable: s.receivable,
    "Net position": s.net,
  });
  return (
    <div className="space-y-6">
      <StatGrid>
        <Stat label="Total payable" value={moneyShort(s.payable)} hint="What you owe" tone="bad" />
        <Stat
          label="Total receivable"
          value={moneyShort(s.receivable)}
          hint="What is owed to you"
          tone="good"
        />
        <Stat
          label="Net position"
          value={moneyShort(s.net)}
          hint="Receivable − payable"
          tone={s.net >= 0 ? "good" : "bad"}
        />
        <Stat
          label="Overdue"
          value={moneyShort(s.overdueAmount)}
          hint={`${s.overdueCount} account(s)`}
          tone={s.overdueCount ? "bad" : "default"}
        />
        <Stat
          label="Credit card due"
          value={moneyShort(s.cardDue)}
          hint={`Card balance ${moneyShort(s.cardBalance)}`}
          tone={s.cardDue ? "warn" : "default"}
        />
        <Stat label="Open accounts" value={String(s.accounts)} />
      </StatGrid>
      <Panel
        title="Payable and receivable by scope"
        description="Personal, each company, and other accounts are always kept apart."
        actions={
          <div className="flex gap-2">
            <ExportMenu name="financial-register-summary" rows={rows} />
          </div>
        }
      >
        <SimpleTable
          head={["Scope", "Payable", "Receivable", "Net position"]}
          align={["left", "right", "right", "right"]}
          rows={[
            ...split.map((r) => [
              r.label,
              money(r.payable),
              money(r.receivable),
              <span key="n" className={r.net < 0 ? "text-destructive" : ""}>
                {money(r.net)}
              </span>,
            ]),
            [
              <strong key="t">Total</strong>,
              <strong key="p">{money(s.payable)}</strong>,
              <strong key="r">{money(s.receivable)}</strong>,
              <strong key="n" className={s.net < 0 ? "text-destructive" : ""}>
                {money(s.net)}
              </strong>,
            ],
          ]}
          empty="No open accounts."
        />
      </Panel>
    </div>
  );
}

/* ------------------------------ Accounts ----------------------------- */

const FIELDS: FieldDef[] = [
  { key: "title", label: "Account name", required: true },
  {
    key: "scope",
    label: "Scope",
    type: "select",
    options: [...SCOPES],
    extensible: false,
    defaultValue: "Personal",
  },
  {
    key: "kind",
    label: "Type",
    type: "select",
    options: [...KINDS],
    extensible: false,
    defaultValue: "Loan Taken",
  },
  { key: "party", label: "Party (person / bank / card issuer)", required: true },
  {
    key: "partyAlias",
    label: "Also known as (e.g. Bangla name, comma separated) – used by the AI assistant",
    table: false,
  },
  { key: "openingAmount", label: "Opening amount", type: "money", required: true },
  { key: "nextDueDate", label: "Next due date", type: "date" },
  { key: "installmentAmount", label: "Instalment / minimum due", type: "money", table: false },
  {
    key: "frequency",
    label: "Frequency",
    type: "select",
    options: [...FREQUENCIES],
    extensible: false,
    defaultValue: "One-time",
    table: false,
  },
  { key: "creditLimit", label: "Credit limit (cards)", type: "money", table: false },
  { key: "interestRate", label: "Interest rate % (per year)", type: "percent", table: false },
  {
    key: "date",
    label: "Opening date",
    type: "date",
    table: false,
    defaultValue: isoDate(new Date()),
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: ["Active", "Closed"],
    extensible: false,
    defaultValue: "Active",
  },
  { key: "notes", label: "Notes", type: "textarea", table: false },
];

function ItemDetail({ row }: { row: Row }) {
  const state = useERP();
  const saved = state.collections.register.find((r) => r.id === row.id);
  const [txnType, setTxnType] = useState<"Settlement" | "Increase">("Settlement");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");
  if (!saved) {
    return (
      <p className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
        Save the account first, then record payments and new amounts against it.
      </p>
    );
  }
  const txns = state.collections.registerTxns.filter((t) => t.itemId === saved.id);
  const bal = outstanding(saved, state.collections.registerTxns);
  const owe = weOwe(saved.kind);
  const editable = canEdit(currentRole(state), "register");
  const settleLabel = owe
    ? "Payment made (reduces what you owe)"
    : "Payment received (reduces what is owed to you)";
  const increaseLabel =
    saved.kind === "Credit Card"
      ? "New charge / spending"
      : owe
        ? "Additional amount borrowed"
        : "Additional amount lent";
  const submit = () => {
    const r = financeRegister.addTxn({
      itemId: saved.id,
      txnType,
      amount: Number(amount),
      date,
      notes,
    });
    if (r.ok) {
      toast.success(txnType === "Settlement" ? "Payment recorded" : "Amount added");
      setAmount("");
      setNotes("");
    } else toast.error(r.error);
  };
  return (
    <div className="space-y-3 rounded-md border bg-muted/30 p-3 text-sm">
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div>
          <dt className="text-xs text-muted-foreground">Outstanding</dt>
          <dd className="font-mono">{money(bal)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{owe ? "You owe" : "Owed to you"}</dt>
          <dd>{String(saved.party)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Next due</dt>
          <dd>{dueText(saved, bal)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Due amount</dt>
          <dd className="font-mono">{money(dueAmount(saved, bal))}</dd>
        </div>
      </dl>
      {saved.kind === "Credit Card" && Number(saved.creditLimit) > 0 ? (
        <p className="text-xs text-muted-foreground">
          Available credit {money(Number(saved.creditLimit) - bal)} · utilisation{" "}
          {percent((bal / Number(saved.creditLimit)) * 100, 0)}
        </p>
      ) : null}
      {editable && saved.status !== "Closed" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid min-w-0 grid-cols-1 gap-1.5 sm:col-span-2">
            <Label>Record</Label>
            <Select
              value={txnType}
              onValueChange={(v) => setTxnType(v as "Settlement" | "Increase")}
            >
              <SelectTrigger aria-label="Transaction type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Settlement">{settleLabel}</SelectItem>
                <SelectItem value="Increase">{increaseLabel}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-1.5">
            <Label htmlFor="rt-amt">Amount</Label>
            <Input
              id="rt-amt"
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-1.5">
            <Label htmlFor="rt-date">Date</Label>
            <Input
              id="rt-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-1.5 sm:col-span-2">
            <Label htmlFor="rt-note">Note</Label>
            <Input id="rt-note" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Button size="sm" onClick={submit}>
              Record transaction
            </Button>
          </div>
        </div>
      ) : null}
      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          History
        </p>
        <SimpleTable
          head={["Date", "Type", "Amount", "Note"]}
          align={["left", "left", "right", "left"]}
          rows={[...txns]
            .sort((a, b) => String(b.date).localeCompare(String(a.date)))
            .slice(0, 8)
            .map((t) => [
              String(t.date),
              t.txnType === "Settlement" ? "Payment" : "Increase",
              money(Number(t.amount)),
              String(t.notes ?? ""),
            ])}
          empty="No transactions yet."
        />
      </div>
    </div>
  );
}

export function Accounts({ scope }: { scope: string }) {
  const state = useERP();
  const txns = state.collections.registerTxns;
  return (
    <DataModule
      collection="register"
      module="register"
      title="Accounts"
      noun="Account"
      companyScoped="optional"
      description="Every loan, credit card, payable and receivable. Scope is mandatory on each record, so a personal liability is never mistaken for a company's."
      fields={FIELDS}
      statusKey="status"
      filter={(r) => scope === "All" || r.scope === scope}
      extraColumns={[
        {
          label: "Outstanding",
          render: (r) => (
            <span
              className={`font-mono tabular-nums ${weOwe(r.kind) ? "text-destructive" : "text-primary"}`}
            >
              {money(outstanding(r, txns))}
            </span>
          ),
          export: (r) => outstanding(r, txns),
        },
      ]}
      beforeSave={(row) => ({ ...row, party: String(row.party ?? "").trim() })}
      detail={(row) => <ItemDetail row={row} />}
    />
  );
}

/* ----------------------------- Loan schedule ------------------------- */

export function Schedule({ scope }: { scope: string }) {
  const { items, txns } = useRegister(scope);
  const list = useMemo(() => installmentSchedule(items, txns, today(), 12), [items, txns]);
  const pay = list.filter((i) => i.direction === "pay").reduce((s, i) => s + i.amount, 0);
  const collect = list.filter((i) => i.direction === "collect").reduce((s, i) => s + i.amount, 0);
  const rows = list.map((i) => ({
    Date: i.date,
    Account: i.title,
    Party: i.party,
    Type: i.kind,
    Direction: i.direction === "pay" ? "You pay" : "You collect",
    Amount: i.amount,
  }));
  return (
    <div className="space-y-6">
      <StatGrid>
        <Stat label="To pay (12 months)" value={moneyShort(pay)} tone="bad" />
        <Stat label="To collect (12 months)" value={moneyShort(collect)} tone="good" />
        <Stat label="Instalments" value={String(list.length)} />
        <Stat
          label="Overdue now"
          value={String(list.filter((i) => i.overdue).length)}
          tone={list.some((i) => i.overdue) ? "bad" : "default"}
        />
      </StatGrid>
      <Panel
        title="Loan schedule"
        description="Upcoming instalments for the next 12 months, projected from each account's outstanding balance."
        actions={
          <div className="flex gap-2">
            <ExportMenu name="loan-schedule" rows={rows} />
          </div>
        }
      >
        <SimpleTable
          head={["Due date", "Account", "Party", "You…", "Amount", ""]}
          align={["left", "left", "left", "left", "right", "left"]}
          rows={list.map((i) => [
            i.date,
            i.title,
            i.party,
            i.direction === "pay" ? "pay" : "collect",
            money(i.amount),
            i.overdue ? <StatusPill key="o" value="Delayed" /> : "",
          ])}
          empty="No scheduled instalments."
        />
      </Panel>
    </div>
  );
}

/* ----------------------------- Credit cards -------------------------- */

export function Cards({ scope }: { scope: string }) {
  const { items, txns } = useRegister(scope);
  const cards = items.filter((i) => i.kind === "Credit Card" && i.status !== "Closed");
  const rows = cards.map((c) => {
    const bal = outstanding(c, txns);
    const limit = Number(c.creditLimit) || 0;
    return { c, bal, limit, due: dueAmount(c, bal), stage: dueStage(c, bal, today()) };
  });
  const exportRows = rows.map((r) => ({
    Card: r.c.title,
    Issuer: r.c.party,
    Balance: r.bal,
    Limit: r.limit,
    "Minimum due": r.due,
    "Due date": r.c.nextDueDate,
  }));
  return (
    <Panel
      title="Credit card due"
      description="Balance, available credit and the next payment date for each card."
      actions={
        <div className="flex gap-2">
          <ExportMenu name="credit-card-due" rows={exportRows} />
        </div>
      }
    >
      <SimpleTable
        head={["Card", "Issuer", "Balance", "Limit", "Available", "Used", "Min. due", "Due"]}
        align={["left", "left", "right", "right", "right", "right", "right", "left"]}
        rows={rows.map((r) => [
          String(r.c.title),
          String(r.c.party),
          money(r.bal),
          r.limit ? money(r.limit) : "—",
          r.limit ? money(r.limit - r.bal) : "—",
          r.limit ? percent((r.bal / r.limit) * 100, 0) : "—",
          money(r.due),
          <span key="d" className="flex items-center gap-2">
            {dueText(r.c, r.bal)}
            {r.stage !== "later" && r.stage !== "none" ? (
              <StatusPill value={STAGE_LABEL[r.stage] ?? "Pending"} />
            ) : null}
          </span>,
        ])}
        empty="No open credit cards."
      />
    </Panel>
  );
}

/* --------------------------- Party statement ------------------------- */

export function PartyStatementPanel({ scope }: { scope: string }) {
  const { items, txns } = useRegister(scope);
  const list = parties(items);
  const [party, setParty] = useState("");
  const selected = party && list.includes(party) ? party : (list[0] ?? "");
  const st = selected ? partyStatement(items, txns, selected) : null;
  const rows = (st?.lines ?? []).map((l) => ({
    Account: l.item.title,
    Type: l.item.kind,
    Direction: l.direction,
    Total: l.total,
    Settled: l.settled,
    Balance: l.balance,
  }));
  return (
    <Panel
      title="Party statement"
      description="One person or institution: total, settled and remaining, with the net position, in one view."
      actions={
        <div className="flex gap-2">
          {st ? <ExportMenu name={`party-statement-${selected}`} rows={rows} /> : null}
        </div>
      }
    >
      {list.length === 0 ? (
        <Empty>No parties yet.</Empty>
      ) : (
        <>
          <div className="mb-4 max-w-sm print:hidden">
            <Label>Party</Label>
            <Select value={selected} onValueChange={setParty}>
              <SelectTrigger className="mt-1.5" aria-label="Party">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {list.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {st ? (
            <>
              <StatGrid>
                <Stat label="You owe" value={money(st.payable)} tone="bad" />
                <Stat label="Owed to you" value={money(st.receivable)} tone="good" />
                <Stat
                  label="Net with this party"
                  value={money(st.net)}
                  tone={st.net >= 0 ? "good" : "bad"}
                  hint={st.net >= 0 ? "They owe you" : "You owe them"}
                />
                <Stat
                  label="Total settled"
                  value={money(st.lines.reduce((s, l) => s + l.settled, 0))}
                />
              </StatGrid>
              <SimpleTable
                head={["Account", "Direction", "Total", "Settled", "Remaining"]}
                align={["left", "left", "right", "right", "right"]}
                rows={st.lines.map((l) => [
                  String(l.item.title),
                  l.direction,
                  money(l.total),
                  money(l.settled),
                  money(l.balance),
                ])}
              />
            </>
          ) : null}
        </>
      )}
    </Panel>
  );
}

/* ---------------------------- Transactions --------------------------- */

export function Transactions({ scope }: { scope: string }) {
  const { state, items, txns } = useRegister(scope);
  const ids = new Set(items.map((i) => i.id));
  const list = txns
    .filter((t) => ids.has(String(t.itemId)))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const title = (id?: string | number | boolean) =>
    String(state.collections.register.find((r) => r.id === id)?.title ?? "—");
  const editable = canEdit(currentRole(state), "register");
  const [voidId, setVoidId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const rows = list.map((t) => ({
    Date: t.date,
    Account: title(t.itemId),
    Type: t.txnType === "Settlement" ? "Payment" : "Increase",
    Amount: t.amount,
    Status: t.status,
    Note: t.notes,
  }));
  return (
    <Panel
      title="Transactions"
      description="Permanent record. A mistake is voided with a reason (kept for the audit trail), never deleted."
      actions={
        <div className="flex gap-2">
          <ExportMenu name="register-transactions" rows={rows} />
        </div>
      }
    >
      <SimpleTable
        head={["Date", "Account", "Type", "Amount", "Status", "Note", ""]}
        align={["left", "left", "left", "right", "left", "left", "left"]}
        rows={list.map((t) => [
          String(t.date),
          title(t.itemId),
          t.txnType === "Settlement" ? "Payment" : "Increase",
          money(Number(t.amount)),
          <StatusPill key="s" value={t.status === "Voided" ? "Rejected" : "Approved"} />,
          String(t.notes ?? ""),
          editable && t.status !== "Voided" ? (
            voidId === t.id ? (
              <div key="v" className="flex gap-1.5">
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason"
                  aria-label="Void reason"
                  className="h-8 w-36"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    const r = financeRegister.voidTxn(t.id, reason);
                    if (r.ok) {
                      toast.success("Transaction voided");
                      setVoidId(null);
                      setReason("");
                    } else toast.error(r.error);
                  }}
                >
                  Void
                </Button>
              </div>
            ) : (
              <Button key="v" size="sm" variant="ghost" onClick={() => setVoidId(t.id)}>
                Void
              </Button>
            )
          ) : (
            ""
          ),
        ])}
        empty="No transactions."
      />
    </Panel>
  );
}

/* ------------------------------ AI assistant ------------------------- */

const EXAMPLES = [
  "আজ জমির মালিককে ৫ লাখ টাকা দিয়েছি।",
  "Paid the landowner 5 lakh today",
  "রহিমের কাছ থেকে ৫০ হাজার টাকা পেয়েছি",
  "Paid 20,000 on Visa Platinum yesterday",
];

export type PendingDraft = Draft & { key: string };

export function Assistant({
  scope,
  drafts,
  setDrafts,
}: {
  scope: string;
  drafts: PendingDraft[];
  setDrafts: Dispatch<SetStateAction<PendingDraft[]>>;
}) {
  const { state, items, txns } = useRegister(scope);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const editable = canEdit(currentRole(state), "register");
  const active = items.filter((i) => i.status !== "Closed");

  const prepare = (input: string) => {
    const res = parseEntry(input, active, txns, today());
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setError("");
    setDrafts((d) => [{ ...res.draft, key: `${Date.now()}-${d.length}` }, ...d]);
    setText("");
  };
  const patch = (key: string, p: Partial<Draft>) =>
    setDrafts((d) => d.map((x) => (x.key === key ? { ...x, ...p } : x)));
  const approve = (d: PendingDraft) => {
    const r = financeRegister.addTxn({
      itemId: d.itemId,
      txnType: d.txnType,
      amount: d.amount,
      date: d.date,
      notes: d.notes,
    });
    if (r.ok) {
      toast.success("Approved and recorded. Balances are updated.");
      setDrafts((all) => all.filter((x) => x.key !== d.key));
    } else toast.error(r.error);
  };

  return (
    <div className="space-y-6">
      <Panel
        title="Financial assistant"
        description="Write what happened in Bangla or English. The assistant prepares a draft; nothing is recorded until you approve it."
      >
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            prepare(text);
          }}
        >
          <Textarea
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="আজ জমির মালিককে ৫ লাখ টাকা দিয়েছি।"
            aria-label="What happened?"
            disabled={!editable}
          />
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" disabled={!editable || !text.trim()}>
              <Sparkles className="size-4" /> Prepare draft
            </Button>
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                disabled={!editable}
                onClick={() => prepare(ex)}
                className="rounded-full border px-3 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                {ex}
              </button>
            ))}
          </div>
        </form>
      </Panel>
      {drafts.length === 0 ? (
        <Empty>No drafts waiting for approval.</Empty>
      ) : (
        <div className="space-y-4" aria-live="polite">
          {drafts.map((d) => {
            const item = active.find((i) => i.id === d.itemId);
            const owe = item ? weOwe(item.kind) : false;
            return (
              <Panel key={d.key} title="Draft for approval" description={d.notes}>
                <p className="text-sm">{d.explanation}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Confidence: <strong>{d.confidence}</strong>
                </p>
                {d.warnings.map((w) => (
                  <p key={w} role="alert" className="mt-1 text-xs text-chart-2">
                    ⚠ {w}
                  </p>
                ))}
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="grid min-w-0 grid-cols-1 gap-1.5 sm:col-span-2">
                    <Label>Account</Label>
                    <Select value={d.itemId} onValueChange={(v) => patch(d.key, { itemId: v })}>
                      <SelectTrigger aria-label="Account">
                        <SelectValue placeholder="Choose account" />
                      </SelectTrigger>
                      <SelectContent>
                        {active.map((i) => (
                          <SelectItem key={i.id} value={i.id}>
                            {String(i.title)} · {String(i.party)} ({String(i.scope)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid min-w-0 grid-cols-1 gap-1.5">
                    <Label>Records as</Label>
                    <Select
                      value={d.txnType}
                      onValueChange={(v) => patch(d.key, { txnType: v as Draft["txnType"] })}
                    >
                      <SelectTrigger aria-label="Records as">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Settlement">
                          {owe ? "Payment made" : "Payment received"}
                        </SelectItem>
                        <SelectItem value="Increase">
                          {owe ? "Added borrowing / charge" : "Additional lent"}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid min-w-0 grid-cols-1 gap-1.5">
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      min={0}
                      value={d.amount}
                      onChange={(e) => patch(d.key, { amount: Number(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="grid min-w-0 grid-cols-1 gap-1.5">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={d.date}
                      onChange={(e) => patch(d.key, { date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" disabled={!d.itemId} onClick={() => approve(d)}>
                    <Check className="size-4" /> Approve & record
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDrafts((all) => all.filter((x) => x.key !== d.key))}
                  >
                    <X className="size-4" /> Discard
                  </Button>
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}
