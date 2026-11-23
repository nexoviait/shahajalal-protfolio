import type { Row } from "./types";
import { round2 } from "./format";

export type PayrollInput = {
  basicSalary: number;
  allowances: number;
  bonus: number;
  overtime: number;
  deductions: number;
  loanRecovery: number;
  taxDeduction: number;
};

export function grossSalary(p: PayrollInput): number {
  return round2(p.basicSalary + p.allowances + p.bonus + p.overtime);
}

export function netSalary(p: PayrollInput): number {
  return round2(grossSalary(p) - p.deductions - p.loanRecovery - p.taxDeduction);
}

export function toPayroll(r: Row): PayrollInput {
  const n = (k: keyof PayrollInput) => Number(r[k]) || 0;
  return {
    basicSalary: n("basicSalary"),
    allowances: n("allowances"),
    bonus: n("bonus"),
    overtime: n("overtime"),
    deductions: n("deductions"),
    loanRecovery: n("loanRecovery"),
    taxDeduction: n("taxDeduction"),
  };
}
