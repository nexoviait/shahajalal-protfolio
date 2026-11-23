import type { Opt } from "@/components/erp/OptionSelect";
import { ui, useERP, type Result } from "@/lib/erp/store";

/** Options for a plain-text list: the built-in values plus the ones created in Settings or inline. */
export function useListOptions(listId: string, builtIn: string[]) {
  const { settings } = useERP();
  const custom = settings.customOptions[listId] ?? [];
  const options: Opt[] = [...builtIn, ...custom].map((v) => ({ value: v, label: v }));
  const onCreate = (name: string): Result => ui.addOption(listId, name, builtIn);
  return { options, onCreate };
}
