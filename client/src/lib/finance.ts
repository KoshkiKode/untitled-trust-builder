import type { Property } from "@/data/types";

/** Mid-point of the market-value range, falling back to a single bound or the assessed value. */
export function valueOf(p: Property): number {
  if (p.marketValueLow != null && p.marketValueHigh != null) return (p.marketValueLow + p.marketValueHigh) / 2;
  return p.marketValueLow ?? p.marketValueHigh ?? p.assessedValue ?? 0;
}

/** Fixed-rate amortizing payment per month. Zero-rate loans are repaid evenly. */
export function monthlyPayment(principal: number, annualRate: number, years: number): number {
  if (principal <= 0 || years <= 0) return 0;
  const n = years * 12;
  if (annualRate === 0) return principal / n;
  const r = annualRate / 12;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

export const DEFAULT_VACANCY = 0.05;
export const DEFAULT_MORTGAGE_YEARS = 30;

export interface PropertyEconomics {
  value: number;
  mortgage: number;
  equity: number;
  cltv: number;
  annualRent: number | null;
  noi: number | null;
  annualDebtService: number | null;
  dscr: number | null;
  capRate: number | null;
  cashFlow: number | null;
}

/**
 * Annual income, debt and coverage for one property. Income metrics need a rent figure; the
 * debt service needs a mortgage balance and rate (assumed 30-year amortization).
 */
export function propertyEconomics(p: Property): PropertyEconomics {
  const value = valueOf(p);
  const mortgage = p.mortgageBalance ?? 0;
  const equity = Math.max(0, value - mortgage);
  const cltv = value > 0 ? mortgage / value : 0;
  const debt =
    mortgage > 0 && p.mortgageRate != null
      ? monthlyPayment(mortgage, p.mortgageRate, DEFAULT_MORTGAGE_YEARS) * 12
      : null;

  if (!p.monthlyRent || p.monthlyRent <= 0) {
    return { value, mortgage, equity, cltv, annualRent: null, noi: null, annualDebtService: debt, dscr: null, capRate: null, cashFlow: null };
  }

  const annualRent = p.monthlyRent * 12;
  const collected = annualRent * (1 - (p.vacancyRate ?? DEFAULT_VACANCY));
  const managementFee = p.management === "manager" ? (p.managementFeePct ?? 0.08) * collected : 0;
  const noi = collected - (p.annualOperatingExpenses ?? 0) - (p.annualTaxes ?? 0) - managementFee;
  const dscr = debt && debt > 0 ? noi / debt : null;
  const capRate = value > 0 ? noi / value : null;
  const cashFlow = debt == null ? noi : noi - debt;
  return { value, mortgage, equity, cltv, annualRent, noi, annualDebtService: debt, dscr, capRate, cashFlow };
}

export interface HelocScenario {
  cltv: number;
  draw: number;
  interestOnlyMonthly: number;
  amortizingMonthly: number | null;
  /** Interest-only cost if the rate rises two percentage points. */
  stressedInterestOnlyMonthly: number;
}

/** Draw amounts and monthly costs at 80%, 85% and 90% combined loan-to-value. */
export function helocScenarios(value: number, mortgage: number, rate: number, termYears: number | null): HelocScenario[] {
  return [0.8, 0.85, 0.9].map((cltv) => {
    const draw = Math.max(0, value * cltv - mortgage);
    return {
      cltv,
      draw,
      interestOnlyMonthly: (draw * rate) / 12,
      amortizingMonthly: termYears ? monthlyPayment(draw, rate, termYears) : null,
      stressedInterestOnlyMonthly: (draw * (rate + 0.02)) / 12,
    };
  });
}
