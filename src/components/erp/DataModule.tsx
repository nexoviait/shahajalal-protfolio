import { Fragment, useMemo, useState, type ReactNode } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ExportMenu, PageHeader, StatusPill, Empty } from "@/components/erp/kit";
import { OptionSelect } from "@/components/erp/OptionSelect";
import { useListOptions } from "@/components/erp/useListOptions";
import { scoped } from "@/lib/erp/analytics";
import { money } from "@/lib/erp/format";
import { canEdit, type ModuleId } from "@/lib/erp/rbac";
import { currentRole, data, useERP } from "@/lib/erp/store";
import type { CollectionName, Row, RowKey } from "@/lib/erp/types";
import { uid } from "@/lib/erp/format";

export type FieldType =
  "text" | "number" | "money" | "percent" | "date" | "select" | "textarea" | "boolean";

export type FieldDef = {
  key: RowKey;
  label: string;
  type?: FieldType;
  options?: string[];
  required?: boolean;
  readOnly?: boolean;
  /** Show in the table (default true for the first 6 fields). */
  table?: boolean;
  span?: 1 | 2;
  /** Select fields can be extended on demand unless the values drive logic (set false). */
  extensible?: boolean;
  /** Heading rendered above this field in the form. */
  section?: string;
  placeholder?: string;
  defaultValue?: string | number | boolean;
};

export type DataModuleProps = {
  collection: CollectionName;
  module: ModuleId;
  title: string;
  description: string;
  fields: FieldDef[];
  noun: string;
  /** Rows belong to a company (default true). */
  companyScoped?: boolean | "optional";
  /** Extra content above the table (summaries, charts). Receives the filtered rows. */
  summary?: (rows: Row[]) => ReactNode;
  /** Extra header actions. */
  actions?: ReactNode;
  /** Extra per-row content inside the edit dialog. */
  detail?: (row: Row) => ReactNode;
  /** Restrict visible rows. */
  filter?: (row: Row) => boolean;
  /** Field that identifies a row in the table's first cell. */
  statusKey?: RowKey;
  canDelete?: (row: Row) => boolean;
  /** Computed columns shown after the fields (not stored). */
  extraColumns?: {
    label: string;
    render: (row: Row) => ReactNode;
    export?: (row: Row) => string | number;
  }[];
  /** Prepare a row just before saving (e.g. compute totals). */
  beforeSave?: (row: Row, isNew: boolean) => Row;
};

function display(field: FieldDef, row: Row): ReactNode {
  const v = row[field.key];
  if (v === undefined || v === "") return <span className="text-muted-foreground">—</span>;
  switch (field.type) {
    case "money":
      return <span className="font-mono tabular-nums">{money(Number(v))}</span>;
    case "percent":
      return <span className="font-mono tabular-nums">{Number(v)}%</span>;
    case "number":
      return <span className="font-mono tabular-nums">{Number(v).toLocaleString("en-BD")}</span>;
    case "boolean":
      return v ? "Yes" : "No";
    default:
      return String(v);
  }
}

function SelectField({
  id,
  listId,
  field,
  value,
  onChange,
  disabled,
}: {
  id: string;
  listId: string;
  field: FieldDef;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean | undefined;
}) {
  const { options, onCreate } = useListOptions(listId, field.options ?? []);
  return (
    <OptionSelect
      id={id}
      value={value}
      onChange={onChange}
      options={options}
      onCreate={field.extensible === false ? undefined : onCreate}
      noun={field.label.toLowerCase()}
      disabled={disabled}
    />
  );
}

export function DataModule(props: DataModuleProps) {
  const state = useERP();
  const role = currentRole(state);
  const editable = canEdit(role, props.module);
  const companyMode = props.companyScoped ?? true;
  const companyScoped = companyMode !== false;
  /** "optional": rows may belong to a company or to none (personal / other). */
  const companyRequired = companyMode === true;
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [error, setError] = useState("");

  const all = state.collections[props.collection];
  const rows = useMemo(() => {
    const base = companyScoped ? scoped(state, all) : all;
    const filtered = props.filter ? base.filter(props.filter) : base;
    const q = query.trim().toLowerCase();
    if (!q) return filtered;
    return filtered.filter((r) =>
      Object.values(r).some((v) =>
        String(v ?? "")
          .toLowerCase()
          .includes(q),
      ),
    );
  }, [state, all, query, companyScoped, props.filter]);

  const tableFields = props.fields.filter((f, i) => (f.table === undefined ? i < 6 : f.table));
  const companyName = (id?: string) => state.companies.find((c) => c.id === id)?.name ?? "—";

  const openNew = () => {
    const base: Row = { id: uid(props.collection.slice(0, 3)) };
    if (companyRequired) {
      const preferred =
        state.activeCompanyId !== "all"
          ? state.activeCompanyId
          : (state.companies.find((c) => c.status === "Active") ?? state.companies[0])?.id;
      if (preferred) base.companyId = preferred;
    }
    for (const f of props.fields) {
      if (f.defaultValue !== undefined) (base as Record<string, unknown>)[f.key] = f.defaultValue;
      else if (f.type === "select" && f.options?.[0])
        (base as Record<string, unknown>)[f.key] = f.options[0];
      else if (f.type === "number" || f.type === "money" || f.type === "percent")
        (base as Record<string, unknown>)[f.key] = 0;
    }
    setError("");
    setIsNew(true);
    setEditing(base);
  };

  const setField = (key: RowKey, value: string | number | boolean) =>
    setEditing((r) => (r ? { ...r, [key]: value } : r));

  const save = () => {
    if (!editing) return;
    for (const f of props.fields) {
      if (f.required && (editing[f.key] === undefined || editing[f.key] === "")) {
        setError(`${f.label} is required.`);
        return;
      }
    }
    if (companyRequired && !editing.companyId) {
      setError("Select a company.");
      return;
    }
    const prepared = props.beforeSave ? props.beforeSave(editing, isNew) : editing;
    const res = data.save(props.collection, prepared);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    toast.success(`${props.noun} saved`);
    setEditing(null);
  };

  const remove = () => {
    if (!editing) return;
    if (
      !window.confirm(`Delete this ${props.noun.toLowerCase()}? This is recorded in the audit log.`)
    )
      return;
    const res = data.remove(props.collection, editing.id);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    toast.success(`${props.noun} deleted`);
    setEditing(null);
  };

  const exportRows = rows.map((r) => {
    const out: Record<string, string | number | boolean | undefined> = {};
    if (companyScoped) out["Company"] = companyName(r.companyId);
    for (const f of props.fields) out[f.label] = r[f.key];
    for (const c of props.extraColumns ?? []) if (c.export) out[c.label] = c.export(r);
    return out;
  });

  const canDeleteRow = editing ? (props.canDelete ? props.canDelete(editing) : true) : false;

  return (
    <div>
      <PageHeader
        title={props.title}
        description={props.description}
        actions={
          <>
            {props.actions}
            <ExportMenu name={props.collection} rows={exportRows} />
            {editable ? (
              <Button size="sm" onClick={openNew}>
                <Plus className="size-4" /> Add {props.noun.toLowerCase()}
              </Button>
            ) : null}
          </>
        }
      />
      {props.summary ? props.summary(rows) : null}

      <div data-anim="card" className="rounded-lg border bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b p-3 print:hidden">
          <Search className="size-4 text-muted-foreground" aria-hidden />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${props.title.toLowerCase()}`}
            aria-label={`Search ${props.title}`}
            className="h-8 max-w-sm border-0 shadow-none focus-visible:ring-0"
          />
          <span className="ml-auto text-xs text-muted-foreground">{rows.length} records</span>
        </div>
        {rows.length === 0 ? (
          <Empty>No {props.title.toLowerCase()} for this selection yet.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  {companyScoped ? <th className="px-3 py-2 font-medium">Company</th> : null}
                  {tableFields.map((f) => (
                    <th key={f.key} className="px-3 py-2 font-medium">
                      {f.label}
                    </th>
                  ))}
                  {(props.extraColumns ?? []).map((c) => (
                    <th key={c.label} className="px-3 py-2 font-medium">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    data-anim="row"
                    tabIndex={0}
                    className="cursor-pointer hover:bg-muted/40 focus:bg-muted/40 focus:outline-none"
                    onClick={() => {
                      setError("");
                      setIsNew(false);
                      setEditing(r);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setError("");
                        setIsNew(false);
                        setEditing(r);
                      }
                    }}
                  >
                    {companyScoped ? (
                      <td className="px-3 py-2">{companyName(r.companyId)}</td>
                    ) : null}
                    {tableFields.map((f) => (
                      <td key={f.key} className="px-3 py-2">
                        {props.statusKey === f.key ? (
                          <StatusPill value={String(r[f.key] ?? "")} />
                        ) : (
                          display(f, r)
                        )}
                      </td>
                    ))}
                    {(props.extraColumns ?? []).map((c) => (
                      <td key={c.label} className="px-3 py-2">
                        {c.render(r)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-2xl">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>
              {isNew ? "New" : editable ? "Edit" : "View"} {props.noun.toLowerCase()}
            </DialogTitle>
            <DialogDescription>
              {editable
                ? "Changes are saved to this workspace and recorded in the audit log."
                : "Your role has read-only access."}
            </DialogDescription>
          </DialogHeader>
          {editing ? (
            <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-6 py-4 sm:grid-cols-2">
              {companyScoped ? (
                <div className="grid min-w-0 grid-cols-1 gap-1.5 sm:col-span-2">
                  <Label>Company</Label>
                  <Select
                    value={editing.companyId || (companyRequired ? "" : "__none__")}
                    onValueChange={(v) => {
                      if (v === "__none__") {
                        const { companyId: _drop, ...rest } = editing;
                        setEditing(rest);
                      } else setEditing({ ...editing, companyId: v });
                    }}
                    disabled={!editable || (companyRequired && !isNew)}
                  >
                    <SelectTrigger aria-label="Company">
                      <SelectValue placeholder="Select company" />
                    </SelectTrigger>
                    <SelectContent>
                      {companyRequired ? null : (
                        <SelectItem value="__none__">None (personal / other)</SelectItem>
                      )}
                      {state.companies.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              {props.fields.map((f) => {
                const id = `f-${f.key}`;
                const heading = f.section ? (
                  <h3 className="border-b pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:col-span-2">
                    {f.section}
                  </h3>
                ) : null;
                const v = editing[f.key];
                const disabled = !editable || f.readOnly;
                const wide = f.span === 2 || f.type === "textarea";
                return (
                  <Fragment key={f.key}>
                    {heading}
                    <div
                      className={
                        wide
                          ? "grid min-w-0 grid-cols-1 gap-1.5 sm:col-span-2"
                          : "grid min-w-0 grid-cols-1 gap-1.5"
                      }
                    >
                      <Label htmlFor={id}>
                        {f.label}
                        {f.required ? <span className="text-destructive"> *</span> : null}
                      </Label>
                      {f.type === "select" ? (
                        <SelectField
                          id={id}
                          listId={`${props.collection}.${f.key}`}
                          field={f}
                          value={String(v ?? "")}
                          onChange={(val) => setField(f.key, val)}
                          disabled={disabled}
                        />
                      ) : f.type === "textarea" ? (
                        <Textarea
                          id={id}
                          value={String(v ?? "")}
                          onChange={(e) => setField(f.key, e.target.value)}
                          disabled={disabled}
                          rows={3}
                          placeholder={f.placeholder}
                        />
                      ) : f.type === "boolean" ? (
                        <Switch
                          id={id}
                          checked={Boolean(v)}
                          onCheckedChange={(c) => setField(f.key, c)}
                          disabled={disabled}
                        />
                      ) : (
                        <Input
                          id={id}
                          type={
                            f.type === "date"
                              ? "date"
                              : f.type === "number" || f.type === "money" || f.type === "percent"
                                ? "number"
                                : "text"
                          }
                          min={
                            f.type === "number" || f.type === "money" || f.type === "percent"
                              ? 0
                              : undefined
                          }
                          step={f.type === "money" ? "0.01" : undefined}
                          value={String(v ?? "")}
                          onChange={(e) =>
                            setField(
                              f.key,
                              f.type === "number" || f.type === "money" || f.type === "percent"
                                ? e.target.value === ""
                                  ? ""
                                  : Number(e.target.value)
                                : e.target.value,
                            )
                          }
                          disabled={disabled}
                          placeholder={f.placeholder}
                        />
                      )}
                    </div>
                  </Fragment>
                );
              })}
              {props.detail ? <div className="sm:col-span-2">{props.detail(editing)}</div> : null}
              {error ? (
                <p role="alert" className="text-sm text-destructive sm:col-span-2">
                  {error}
                </p>
              ) : null}
            </div>
          ) : null}
          <DialogFooter className="gap-2 border-t px-6 py-4 sm:justify-between">
            <div>
              {editable && !isNew && canDeleteRow ? (
                <Button variant="outline" onClick={remove} className="text-destructive">
                  <Trash2 className="size-4" /> Delete
                </Button>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>
                {editable ? "Cancel" : "Close"}
              </Button>
              {editable ? <Button onClick={save}>Save</Button> : null}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
