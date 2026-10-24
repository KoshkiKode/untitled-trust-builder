import type { EstatePlan, Property, RiskFlag, RiskSeverity } from "@/data/types";
import { getState, hasCoreData, isGroupUsable } from "@/data/jurisdictions";
import { fmtPct, fmtUSD } from "@/lib/constants";
import { helocScenarios, propertyEconomics } from "@/lib/finance";

export const RISK_LABEL: Record<RiskSeverity, string> = {
  critical: "CRITICAL",
  high: "HIGH",
  medium: "MEDIUM",
  info: "INFO",
};

const RANK: Record<RiskSeverity, number> = { critical: 0, high: 1, medium: 2, info: 3 };

type Add = (risk: RiskFlag) => void;

function label(p: Property): string {
  return p.label || p.address || "Property";
}

function propertyRisks(p: Property, add: Add): void {
  const name = label(p);
  const econ = propertyEconomics(p);

  if (p.llcOwned && (p.mortgageBalance ?? 0) > 0) {
    add({
      id: `due-on-sale-${p.id}`,
      severity: "high",
      propertyId: p.id,
      title: `${name}: lender consent may be needed before the loan property goes into the LLC`,
      detail:
        "Lenders can enforce a due-on-sale clause (12 U.S.C. § 1701j-3(b)). For residential property with fewer than five units, the statute exempts a transfer into an inter vivos trust where the borrower remains a beneficiary (§ 1701j-3(d)(8)). Transfers to an LLC are not on that list, so the transfer can trigger the clause.",
      action: "Request the lender's written consent before recording the deed into the LLC. Until consent is in hand, keep title in the trust.",
    });
  }

  if (p.llcOwned && p.use === "primary_residence") {
    add({
      id: `homestead-llc-${p.id}`,
      severity: "high",
      propertyId: p.id,
      title: `${name}: a home held by an LLC may lose homestead protections`,
      detail:
        "Homestead exemptions, creditor protection and some property-tax relief are generally tied to the owner's residence. Moving a home into an LLC can end them and can trigger reassessment, depending on the state.",
      action: "Keep the primary residence in the trust rather than the LLC unless a local attorney has confirmed the result in your state.",
    });
  }

  if (p.use === "rental" && !p.llcOwned) {
    add({
      id: `rental-liability-${p.id}`,
      severity: "medium",
      propertyId: p.id,
      title: `${name}: rental liability reaches the trust's other assets`,
      detail: "A rental held directly in the trust exposes the trust's other assets to tenant and premises claims.",
      action: "Consider holding rentals in an LLC, and carry landlord liability insurance (with an umbrella policy).",
    });
  }

  if (econ.dscr != null && econ.dscr < 1) {
    add({
      id: `dscr-negative-${p.id}`,
      severity: "critical",
      propertyId: p.id,
      title: `${name}: rent does not cover the mortgage and operating costs`,
      detail: `Estimated net operating income is ${fmtUSD(econ.noi)} against annual debt service of ${fmtUSD(econ.annualDebtService)} (coverage ${econ.dscr.toFixed(2)}).`,
      action: "Raise rent, cut costs, or reduce the loan before committing. Check the figures against the actual lease and expense records.",
    });
  } else if (econ.dscr != null && econ.dscr < 1.25) {
    add({
      id: `dscr-thin-${p.id}`,
      severity: "high",
      propertyId: p.id,
      title: `${name}: thin debt-service coverage (${econ.dscr.toFixed(2)})`,
      detail: "Many lenders look for coverage of 1.20 to 1.25 or better on rental income. Thin coverage leaves little room for a vacancy or a repair.",
      action: "Stress-test the budget for a month of vacancy and one large repair before relying on the cash flow.",
    });
  }

  if (econ.cltv > 0.85) {
    add({
      id: `cltv-high-${p.id}`,
      severity: "medium",
      propertyId: p.id,
      title: `${name}: high loan-to-value (${fmtPct(econ.cltv)})`,
      detail: "Mortgage debt above 85% of value leaves little equity to borrow against and limits refinancing options.",
      action: "Avoid adding debt against this property until the balance comes down or the value is confirmed by an appraisal.",
    });
  }

  if (p.yearBuilt != null && p.yearBuilt < 1978) {
    add({
      id: `lead-${p.id}`,
      severity: p.use === "rental" ? "high" : "medium",
      propertyId: p.id,
      title: `${name}: built before 1978, so federal lead-paint disclosures apply`,
      detail:
        "Sales need the seller's Lead Warning Statement and disclosure. Leases need the lessor's Lead Warning Statement and disclosure. Keep the signed copies for at least 3 years.",
      action: "Use the generated lead-paint disclosure and keep the signed copy with the closing or lease file.",
    });
  } else if (p.yearBuilt == null && p.use === "rental") {
    add({
      id: `year-unknown-${p.id}`,
      severity: "medium",
      propertyId: p.id,
      title: `${name}: year built not entered`,
      detail: "The federal lead-paint disclosure for leases depends on whether the dwelling was built before 1978.",
      action: "Enter the year built. The county assessor's records usually show it.",
    });
  }
}

function financingRisks(plan: EstatePlan, add: Add): void {
  const { funding, llc } = plan;
  if (!funding.useHeloc) return;
  const source = plan.properties.find((p) => p.id === funding.helocSourcePropertyId);
  if (!source) return;

  const value = propertyEconomics(source).value;
  const mortgage = source.mortgageBalance ?? 0;
  if (funding.estimatedRate != null && value > 0) {
    const scenario = helocScenarios(value, mortgage, funding.estimatedRate, null)[1];
    add({
      id: "heloc-capacity",
      severity: "info",
      propertyId: source.id,
      title: `HELOC capacity against ${label(source)}`,
      detail: `At 85% combined loan-to-value the available draw is about ${fmtUSD(scenario.draw)}. Interest-only cost is about ${fmtUSD(scenario.interestOnlyMonthly)} a month at ${fmtPct(funding.estimatedRate)}, or ${fmtUSD(scenario.stressedInterestOnlyMonthly)} a month if the rate rises two points.`,
      action: "Compare the stressed payment with your monthly budget before drawing. Variable-rate lines can rise.",
    });
  }

  if (funding.structureAsLoanToLlc && llc.enabled) {
    add({
      id: "heloc-loan-to-llc",
      severity: "info",
      title: "HELOC proceeds lent to the LLC",
      detail:
        "Document the loan with a promissory note at a market rate, keep the LLC's bank account separate, and ask a CPA how the interest is deducted. Interest generally follows how the proceeds are used (Treas. Reg. § 1.163-8T).",
      action: "Use the generated promissory note, set a repayment schedule, and keep a ledger of every advance.",
    });
  }

  add({
    id: "heloc-interest-deduction",
    severity: "info",
    title: "Deductibility of HELOC interest depends on how the money is used",
    detail:
      "Under IRC § 163(h), interest on home-equity debt is generally deductible only when the proceeds buy, build or substantially improve the home that secures the loan. Proceeds used for a rental generally follow the separate tracing rules.",
    action: "Keep records of where each HELOC dollar goes, and confirm the treatment with a tax professional.",
  });
}

function estateRisks(plan: EstatePlan, add: Add): void {
  if (!plan.successorTrustee?.trim()) {
    add({
      id: "no-successor-trustee",
      severity: "high",
      title: "No successor trustee named",
      detail: "If you die or become incapacitated, someone must be able to act for the trust without a court appointment.",
      action: "Name a successor trustee and at least one alternate.",
    });
  }
}

function jurisdictionRisks(plan: EstatePlan, add: Add): void {
  const trustLaw = getState(plan.primaryStateCode);
  if (!hasCoreData(trustLaw)) {
    add({
      id: "unverified-trust-state",
      severity: "medium",
      title: `${trustLaw?.name ?? plan.primaryStateCode}: signing and recording rules are not yet verified`,
      detail: "The trust, deed and LLC rules shown for this state are generic guidance, not verified statutes.",
      action: "Have a local attorney or the county recorder confirm the signing requirements for each document before anyone signs.",
    });
  }
  plan.properties.forEach((p) => {
    if (p.transferMethod === "warranty_deed_purchase") return;
    if (isGroupUsable(getState(p.stateCode), "transferTax")) return;
    add({
      id: `transfer-tax-unverified-${p.id}`,
      severity: "medium",
      propertyId: p.id,
      title: `${label(p)}: transfer-tax treatment is not verified for ${getState(p.stateCode)?.name ?? p.stateCode}`,
      detail: "Whether a transfer into the trust or LLC is exempt from transfer tax depends on local rules that are not verified here.",
      action: "Ask the county recorder or a local title company about exemptions before recording.",
    });
  });
}

/** Rule-based review of the plan. Sorted from most to least urgent. */
export function assessRisks(plan: EstatePlan): RiskFlag[] {
  const risks: RiskFlag[] = [];
  const add: Add = (risk) => {
    risks.push(risk);
  };
  plan.properties.forEach((p) => propertyRisks(p, add));
  financingRisks(plan, add);
  estateRisks(plan, add);
  jurisdictionRisks(plan, add);
  return risks.sort((a, b) => RANK[a.severity] - RANK[b.severity]);
}
