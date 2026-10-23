import assert from "node:assert/strict";
import test from "node:test";
import { generateDocuments } from "../client/src/lib/documentGenerator";
import { validatePlan } from "../client/src/lib/validatePlan";
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

test("accepts a complete Michigan trust plan", () => {
  assert.deepEqual(validatePlan(plan()), []);
});

test("rejects LLC-owned property without a configured LLC", () => {
  const errors = validatePlan(plan({ properties: [property({ llcOwned: true })] }));
  assert.ok(errors.some((error) => error.includes("Enable the LLC")));
});

test("rejects invalid HELOC source and target combinations", () => {
  const errors = validatePlan(
    plan({
      properties: [property()],
      funding: {
        useHeloc: true,
        helocSourcePropertyId: "home",
        targetPurchasePropertyId: "home",
        structureAsLoanToLlc: false,
      },
    })
  );
  assert.ok(errors.some((error) => error.includes("must be different properties")));
});

test("does not attach lead-paint disclosure to an unrelated first property", () => {
  const docs = generateDocuments(
    plan({
      buildYear: 1970,
      properties: [
        property({ id: "existing", label: "Existing home", transferMethod: "lady_bird" }),
        property({
          id: "purchase",
          label: "Acquisition target",
          transferMethod: "warranty_deed_purchase",
          address: "456 Oak Street",
        }),
      ],
      seller: { fullName: "Seller Example" },
    })
  );
  const leadPaint = docs.find((document) => document.kind === "lead_paint_disclosure");
  assert.equal(leadPaint?.propertyId, "purchase");
});
