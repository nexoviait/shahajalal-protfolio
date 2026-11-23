import { useState } from "react";
import { Plus } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Result } from "@/lib/erp/store";

export type Opt = { value: string; label: string };

const ADD = "__add_new__";

/**
 * A dropdown whose options can be extended on demand: choosing "+ Add new…" opens a small
 * dialog, creates the option through `onCreate`, and selects it.
 */
export function OptionSelect({
  value,
  onChange,
  options,
  onCreate,
  noun = "option",
  placeholder = "Select",
  disabled,
  id,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Opt[];
  /** Creates the option and returns the value to select. Omit to make the list fixed. */
  onCreate?: ((name: string) => Result) | undefined;
  noun?: string;
  placeholder?: string;
  disabled?: boolean | undefined;
  id?: string | undefined;
  ariaLabel?: string | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  // Keep a stored value visible even if its option was later removed.
  const all =
    value && !options.some((o) => o.value === value)
      ? [...options, { value, label: value }]
      : options;

  const create = () => {
    if (!onCreate) return;
    const res = onCreate(name);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onChange(res.id ?? name.trim());
    toast.success(`Added “${name.trim()}”`);
    setOpen(false);
    setName("");
    setError("");
  };

  return (
    <>
      <Select
        value={value}
        onValueChange={(v) => {
          if (v === ADD) {
            setName("");
            setError("");
            setOpen(true);
          } else onChange(v);
        }}
        disabled={disabled}
      >
        <SelectTrigger id={id} aria-label={ariaLabel}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {all.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
          {onCreate && !disabled ? (
            <>
              <SelectSeparator />
              <SelectItem value={ADD} className="font-medium text-primary">
                <span className="flex items-center gap-1.5">
                  <Plus className="size-3.5" /> Add new {noun}…
                </span>
              </SelectItem>
            </>
          ) : null}
        </SelectContent>
      </Select>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add new {noun}</DialogTitle>
            <DialogDescription>
              It becomes available in this dropdown straight away.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              create();
            }}
          >
            <Input
              autoFocus
              value={name}
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
              aria-label={`New ${noun} name`}
              placeholder={`Name of the new ${noun}`}
            />
            {error ? (
              <p role="alert" className="mt-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Add</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
