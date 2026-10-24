import assert from "node:assert/strict";
import test from "node:test";
import { generateDocuments } from "../client/src/lib/documentGenerator";
import { LEAD_WARNING_LESSOR, LEAD_WARNING_SELLER } from "../client/src/lib/federal";
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

const leaseDocs = (docs: ReturnType<typeof generateDocuments>) => docs.filter((d) => d.kind === "lease_lead_disclosure");

test("sale disclosure carries the verbatim federal seller warning", () => {
  const docs = generateDocuments(
    plan({
      buildYear: 1970,
      properties: [property({ id: "purchase", transferMethod: "warranty_deed_purchase", address: "456 Oak Street" })],
      seller: { fullName: "Seller Example" },
    })
  );
  const sale = docs.find((d) => d.kind === "lead_paint_disclosure");
  assert.ok(sale, "sale disclosure generated");
  assert.ok(sale.body.includes(LEAD_WARNING_SELLER), "seller warning is verbatim");
  assert.ok(sale.body.includes("40 CFR 745.110(a)"), "10-day opportunity cites the regulation");
});

test("pre-1978 rental gets a lease disclosure with the verbatim lessor warning", () => {
  const docs = generateDocuments(plan({ properties: [property({ use: "rental", yearBuilt: 1965 })] }));
  const lease = leaseDocs(docs);
  assert.equal(lease.length, 1);
  assert.ok(lease[0].body.includes(LEAD_WARNING_LESSOR), "lessor warning is verbatim");
  assert.ok(lease[0].body.includes("Year built: 1965"));
});

test("post-1978 rental does not get a lease disclosure", () => {
  const docs = generateDocuments(plan({ properties: [property({ use: "rental", yearBuilt: 1995 })] }));
  assert.equal(leaseDocs(docs).length, 0);
});

test("rental with unknown year gets a disclosure flagged for confirmation", () => {
  const docs = generateDocuments(plan({ properties: [property({ use: "rental" })] }));
  const lease = leaseDocs(docs);
  assert.equal(lease.length, 1);
  assert.match(lease[0].body, /NOT ENTERED/);
});
