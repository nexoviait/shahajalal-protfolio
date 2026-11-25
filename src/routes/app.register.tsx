import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import {
  Accounts,
  Assistant,
  type PendingDraft,
  Cards,
  Overview,
  PartyStatementPanel,
  Schedule,
  Transactions,
} from "@/components/erp/register-panels";
import { PageHeader } from "@/components/erp/kit";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SCOPES } from "@/lib/erp/register";

export const Route = createFileRoute("/app/register")({
  head: () => ({
    meta: [
      { title: "Financial Register | b Group" },
      {
        name: "description",
        content:
          "Owner central financial register: personal, company and other loans, credit cards, payables and receivables with due-date alerts, party statements and an AI assistant.",
      },
    ],
  }),
  component: FinancialRegister,
});

function FinancialRegister() {
  const [scope, setScope] = useState("All");
  // Pending assistant drafts live here so they survive switching tabs.
  const [drafts, setDrafts] = useState<PendingDraft[]>([]);
  return (
    <div>
      <PageHeader
        title="Owner Central Financial Register"
        description="Personal, company and other loans, credit cards, payables and receivables in one place, with the scope recorded on every entry. This register is separate from the company ledgers."
        actions={
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Scope</span>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger className="h-9 w-36" aria-label="Scope filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All scopes</SelectItem>
                {SCOPES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />
      <Tabs defaultValue="overview">
        <TabsList className="mb-4 flex h-auto w-full flex-nowrap justify-start overflow-x-auto [&>*]:shrink-0">
          <TabsTrigger value="overview">Central reports</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="schedule">Loan schedule</TabsTrigger>
          <TabsTrigger value="cards">Credit cards</TabsTrigger>
          <TabsTrigger value="party">Party statement</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="assistant">AI assistant</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <Overview scope={scope} />
        </TabsContent>
        <TabsContent value="accounts">
          <Accounts scope={scope} />
        </TabsContent>
        <TabsContent value="schedule">
          <Schedule scope={scope} />
        </TabsContent>
        <TabsContent value="cards">
          <Cards scope={scope} />
        </TabsContent>
        <TabsContent value="party">
          <PartyStatementPanel scope={scope} />
        </TabsContent>
        <TabsContent value="transactions">
          <Transactions scope={scope} />
        </TabsContent>
        <TabsContent value="assistant">
          <Assistant scope={scope} drafts={drafts} setDrafts={setDrafts} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
