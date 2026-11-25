import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { OptionSelect } from "@/components/erp/OptionSelect";
import { useListOptions } from "@/components/erp/useListOptions";
import { companies, useERP } from "@/lib/erp/store";
import { COMPANY_STATUSES, type Company } from "@/lib/erp/types";

const EMPTY: Omit<Company, "id"> = {
  name: "",
  category: "",
  status: "Planned",
  registrationNo: "",
  tradeLicense: "",
  tin: "",
  bin: "",
  incorporationDate: "",
  address: "",
  website: "",
  contact: "",
  managingDirector: "",
  administrator: "",
  vision: "",
  mission: "",
  objectives: "",
  businessModel: "",
  initialInvestment: 0,
  currentValuation: 0,
  legalParentId: "",
  reportingParentId: "",
  fixedMonthlyCosts: 0,
  currency: "BDT",
};

type Draft = Omit<Company, "id">;
type TextKey = Exclude<
  { [K in keyof Draft]: Draft[K] extends string ? K : never }[keyof Draft],
  "status"
>;
type NumKey = { [K in keyof Draft]: Draft[K] extends number ? K : never }[keyof Draft];

const TEXT_FIELDS: {
  key: TextKey;
  label: string;
  type?: string;
  wide?: boolean;
  area?: boolean;
}[] = [
  { key: "name", label: "Company name *" },
  { key: "category", label: "Business category" },
  { key: "registrationNo", label: "Registration number" },
  { key: "tradeLicense", label: "Trade license" },
  { key: "tin", label: "TIN" },
  { key: "bin", label: "BIN" },
  { key: "incorporationDate", label: "Incorporation date", type: "date" },
  { key: "website", label: "Website" },
  { key: "contact", label: "Contact information" },
  { key: "managingDirector", label: "Managing director" },
  { key: "administrator", label: "Company administrator" },
  { key: "address", label: "Registered address", wide: true },
  { key: "vision", label: "Vision", wide: true, area: true },
  { key: "mission", label: "Mission", wide: true, area: true },
  { key: "objectives", label: "Business objectives", wide: true, area: true },
  { key: "businessModel", label: "Business model", wide: true, area: true },
];

const NUM_FIELDS: { key: NumKey; label: string }[] = [
  { key: "initialInvestment", label: "Initial investment (BDT)" },
  { key: "currentValuation", label: "Current valuation (BDT)" },
  { key: "fixedMonthlyCosts", label: "Fixed monthly costs (BDT)" },
];

export function CompanyForm({
  open,
  onOpenChange,
  company,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  company?: Company | undefined;
}) {
  const state = useERP();
  const existingCategories = [...new Set(state.companies.map((c) => c.category).filter(Boolean))];
  const categories = useListOptions("companies.category", existingCategories);
  const [draft, setDraft] = useState<Omit<Company, "id">>(company ? { ...company } : EMPTY);
  const [error, setError] = useState("");

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const others = state.companies.filter((c) => c.id !== company?.id);

  const submit = () => {
    const res = company ? companies.update(company.id, draft) : companies.add(draft);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    toast.success(company ? "Company updated" : "Company created");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-3xl">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>{company ? "Edit company profile" : "Add company"}</DialogTitle>
          <DialogDescription>
            Legal ownership and group reporting are configured independently, so a company can be
            reported under the group without being legally owned by a parent.
          </DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-6 py-4 sm:grid-cols-2">
          {TEXT_FIELDS.map((f) => (
            <div
              key={f.key}
              className={
                f.wide
                  ? "grid min-w-0 grid-cols-1 gap-1.5 sm:col-span-2"
                  : "grid min-w-0 grid-cols-1 gap-1.5"
              }
            >
              <Label htmlFor={`c-${f.key}`}>{f.label}</Label>
              {f.key === "category" ? (
                <OptionSelect
                  id="c-category"
                  value={draft.category}
                  onChange={(v) => set("category", v)}
                  options={categories.options}
                  onCreate={categories.onCreate}
                  noun="business category"
                  placeholder="Select category"
                />
              ) : f.area ? (
                <Textarea
                  id={`c-${f.key}`}
                  rows={2}
                  value={draft[f.key]}
                  onChange={(e) => set(f.key, e.target.value)}
                />
              ) : (
                <Input
                  id={`c-${f.key}`}
                  type={f.type ?? "text"}
                  value={draft[f.key]}
                  onChange={(e) => set(f.key, e.target.value)}
                />
              )}
            </div>
          ))}
          {NUM_FIELDS.map((f) => (
            <div key={f.key} className="grid min-w-0 grid-cols-1 gap-1.5">
              <Label htmlFor={`c-${f.key}`}>{f.label}</Label>
              <Input
                id={`c-${f.key}`}
                type="number"
                min={0}
                value={draft[f.key]}
                onChange={(e) => set(f.key, Number(e.target.value) || 0)}
              />
            </div>
          ))}
          <div className="grid min-w-0 grid-cols-1 gap-1.5">
            <Label>Status</Label>
            <Select
              value={draft.status}
              onValueChange={(v) => set("status", v as Company["status"])}
            >
              <SelectTrigger aria-label="Status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMPANY_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-1.5">
            <Label>Legal parent (ownership)</Label>
            <Select
              value={draft.legalParentId || "none"}
              onValueChange={(v) => set("legalParentId", v === "none" ? "" : v)}
            >
              <SelectTrigger aria-label="Legal parent">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Independent company</SelectItem>
                {others.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-1.5">
            <Label>Reporting parent</Label>
            <Select
              value={draft.reportingParentId || "none"}
              onValueChange={(v) => set("reportingParentId", v === "none" ? "" : v)}
            >
              <SelectTrigger aria-label="Reporting parent">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Reports to the group directly</SelectItem>
                {others.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive sm:col-span-2">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter className="border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>{company ? "Save changes" : "Create company"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
