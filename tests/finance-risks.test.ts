import assert from "node:assert/strict";
import test from "node:test";
import { helocScenarios, monthlyPayment, propertyEconomics } from "../client/src/lib/finance";
import { assessRisks } from "../client/src/lib/riskEngine";
import type { EstatePlan, Property } from "../client/src/data/types";

function property(overrides: Partial<Property> = {}): Property {
  return {
    id: "home",
    label: "Home",
    address: "123 Main Street",
    stateCode: "MI",
    county: "Wayne",
    parcelNumbers: ["12-345-678"],
    legalDescription: "Lot 1, Example Subdivision",
    use: "primary_residence",
    ownedFreeAndClear: true,
    transferMethod: "lady_bird",
    llcOwned: false,
    ...overrides,
  };
}

function plan(overrides: Partial<EstatePlan> = {}): EstatePlan {
  return {
    settlor: { fullName: "Alex Example" },
    successorTrustee: "Jordan Example",
    trustName: "Alex Example Revocable Living Trust",
    notaryCounty: "Wayne",
    notaryStateCode: "MI",
    primaryStateCode: "MI",
    beneficiaries: [{ id: "b1", name: "Jordan Example", sharePercent: 100 }],
    properties: [property()],
    llc: { enabled: false, stateCode: "", soleMemberIsTrust: true },
    funding: { useHeloc: false, structureAsLoanToLlc: false },
    ...overrides,
  };
}

const ids = (p: EstatePlan) => assessRisks(p).map((r) => r.id);

test("monthly payment matches the standard amortization formula", () => {
  assert.ok(Math.abs(monthlyPayment(200_000, 0.06, 30) - 1199.1) < 0.05);
  assert.equal(monthlyPayment(120_000, 0, 10), 1000);
  assert.equal(monthlyPayment(0, 0.06, 30), 0);
});

test("rent that does not cover debt is a critical finding", () => {
  const p = property({
    use: "rental",
    marketValueLow: 300_000,
    marketValueHigh: 300_000,
    mortgageBalance: 200_000,
    mortgageRate: 0.06,
    monthlyRent: 2000,
    annualOperatingExpenses: 6000,
    annualTaxes: 3000,
  });
  const econ = propertyEconomics(p);
  assert.ok(econ.dscr != null && econ.dscr < 1, `coverage ${econ.dscr}`);
  const risks = assessRisks(plan({ properties: [p] }));
  const critical = risks.find((r) => r.id === `dscr-negative-${p.id}`);
  assert.equal(critical?.severity, "critical");
  assert.equal(risks[0].severity, "critical", "most urgent item first");
});

test("healthy rental produces no coverage warning", () => {
  const p = property({
    use: "rental",
    marketValueLow: 300_000,
    marketValueHigh: 300_000,
    mortgageBalance: 200_000,
    mortgageRate: 0.06,
    monthlyRent: 3000,
    annualOperatingExpenses: 6000,
    annualTaxes: 3000,
  });
  assert.ok(propertyEconomics(p).dscr! > 1.5);
  assert.equal(ids(plan({ properties: [p] })).filter((id) => id.startsWith("dscr")).length, 0);
});

test("mortgaged property moved into an LLC triggers a due-on-sale warning", () => {
  const p = property({ id: "rental1", use: "rental", llcOwned: true, mortgageBalance: 150_000, mortgageRate: 0.065 });
  const risks = assessRisks(plan({ properties: [p], llc: { enabled: true, name: "Example Holdings, LLC", stateCode: "MI", soleMemberIsTrust: true } }));
  const risk = risks.find((r) => r.id === "due-on-sale-rental1");
  assert.equal(risk?.severity, "high");
  assert.match(risk!.detail, /1701j-3\(d\)\(8\)/);
});

test("a home placed in an LLC is flagged for homestead loss", () => {
  const p = property({ llcOwned: true, use: "primary_residence" });
  assert.ok(ids(plan({ properties: [p], llc: { enabled: true, name: "X, LLC", stateCode: "MI", soleMemberIsTrust: true } })).includes(`homestead-llc-${p.id}`));
});

test("pre-1978 rental needs a lead disclosure finding; newer rental does not", () => {
  const old = plan({ properties: [property({ id: "old", use: "rental", yearBuilt: 1960 })] });
  const newer = plan({ properties: [property({ id: "new", use: "rental", yearBuilt: 2001 })] });
  assert.ok(ids(old).includes("lead-old"));
  assert.ok(!ids(newer).includes("lead-new"));
});

test("missing successor trustee is high severity", () => {
  const risks = assessRisks(plan({ successorTrustee: "" }));
  assert.equal(risks.find((r) => r.id === "no-successor-trustee")?.severity, "high");
});

test("clean estate plan has no critical or high findings", () => {
  const risks = assessRisks(plan());
  assert.equal(risks.filter((r) => r.severity === "critical" || r.severity === "high").length, 0);
});

test("HELOC scenarios scale with combined loan-to-value", () => {
  const [s80, s85, s90] = helocScenarios(400_000, 200_000, 0.08, 20);
  assert.equal(s80.draw, 120_000);
  assert.equal(s85.draw, 140_000);
  assert.equal(s90.draw, 160_000);
  assert.ok(s85.stressedInterestOnlyMonthly > s85.interestOnlyMonthly);
  assert.ok(s85.amortizingMonthly! > s85.interestOnlyMonthly);
});
