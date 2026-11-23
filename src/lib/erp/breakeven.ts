import { dateParts, round2 } from "./format";

export type BreakEvenInput = {
  initialInvestment: number;
  fixedMonthlyCosts: number;
  variableCostPerUnit: number;
  pricePerUnit: number;
  expectedUnitsPerMonth: number;
};

export type BreakEvenResult = {
  contributionPerUnit: number;
  contributionMarginRatio: number;
  breakEvenUnits: number;
  breakEvenRevenue: number;
  monthlyRevenue: number;
  monthlyProfit: number;
  profitMarginPct: number;
  /** Months of operation to recover the initial investment from monthly profit. */
  paybackMonths: number;
  annualRoiPct: number;
  /** Months until cumulative profit covers the initial investment (null if never). */
  monthsToRecoverInvestment: number | null;
  remainingUnitsToBreakEven: number;
  feasible: boolean;
};

/** Contribution = price − variable cost; BE units = fixed / contribution; BE revenue = fixed / CM ratio. */
export function breakEven(i: BreakEvenInput): BreakEvenResult {
  const contributionPerUnit = round2(i.pricePerUnit - i.variableCostPerUnit);
  const feasible = contributionPerUnit > 0 && i.pricePerUnit > 0;
  const ratio = i.pricePerUnit > 0 ? contributionPerUnit / i.pricePerUnit : 0;
  const breakEvenUnits = feasible ? Math.ceil(i.fixedMonthlyCosts / contributionPerUnit) : Infinity;
  const breakEvenRevenue = feasible && ratio > 0 ? round2(i.fixedMonthlyCosts / ratio) : Infinity;
  const monthlyRevenue = round2(i.pricePerUnit * i.expectedUnitsPerMonth);
  const monthlyProfit = round2(contributionPerUnit * i.expectedUnitsPerMonth - i.fixedMonthlyCosts);
  const profitMarginPct = monthlyRevenue > 0 ? (monthlyProfit / monthlyRevenue) * 100 : 0;
  const paybackMonths = monthlyProfit > 0 ? i.initialInvestment / monthlyProfit : Infinity;
  const annualRoiPct =
    i.initialInvestment > 0 ? ((monthlyProfit * 12) / i.initialInvestment) * 100 : 0;
  return {
    contributionPerUnit,
    contributionMarginRatio: ratio,
    breakEvenUnits,
    breakEvenRevenue,
    monthlyRevenue,
    monthlyProfit,
    profitMarginPct,
    paybackMonths,
    annualRoiPct,
    monthsToRecoverInvestment: Number.isFinite(paybackMonths) ? Math.ceil(paybackMonths) : null,
    remainingUnitsToBreakEven: Number.isFinite(breakEvenUnits)
      ? Math.max(0, breakEvenUnits - i.expectedUnitsPerMonth)
      : Infinity,
    feasible,
  };
}

export type Scenario = "Worst" | "Base" | "Best";

/** Scenario multipliers on volume and price (owner can override). */
export const SCENARIO_FACTORS: Record<Scenario, { volume: number; price: number; cost: number }> = {
  Worst: { volume: 0.7, price: 0.95, cost: 1.1 },
  Base: { volume: 1, price: 1, cost: 1 },
  Best: { volume: 1.3, price: 1.05, cost: 0.95 },
};

export function scenarios(i: BreakEvenInput): Record<Scenario, BreakEvenResult> {
  const out = {} as Record<Scenario, BreakEvenResult>;
  (Object.keys(SCENARIO_FACTORS) as Scenario[]).forEach((k) => {
    const f = SCENARIO_FACTORS[k];
    out[k] = breakEven({
      ...i,
      expectedUnitsPerMonth: i.expectedUnitsPerMonth * f.volume,
      pricePerUnit: i.pricePerUnit * f.price,
      variableCostPerUnit: i.variableCostPerUnit * f.cost,
      fixedMonthlyCosts: i.fixedMonthlyCosts * f.cost,
    });
  });
  return out;
}

/** Estimated break-even date from a start date and months needed. */
export function addMonthsISO(start: string, months: number): string {
  const [y, m, d] = dateParts(start);
  const dt = new Date(y, m - 1 + months, d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}
