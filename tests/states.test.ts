import assert from "node:assert/strict";
import test from "node:test";
import { STATES } from "../client/src/data/jurisdictions";
import { STATE_GROUP_KEYS, stateLawSchema } from "../client/src/data/stateSchema";

const EXPECTED_CODES = [
  "AL","AK","AZ","AR","CA","CO","CT","DC","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA",
  "MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX",
  "UT","VT","VA","WA","WV","WI","WY","PR","GU","VI","AS","MP",
];

const entries = Object.entries(STATES);

test("covers all 56 jurisdictions exactly once", () => {
  assert.deepEqual(Object.keys(STATES).sort(), [...EXPECTED_CODES].sort());
});

for (const [code, law] of entries) {
  test(`${code}: schema-valid, code matches key`, () => {
    const parsed = stateLawSchema.safeParse(law);
    assert.ok(parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.issues.slice(0, 5), null, 1));
    assert.equal(law.code, code);
    assert.match(law.asOf, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(new Date(law.asOf).getTime() <= Date.now() + 86_400_000, "asOf must not be in the future");
  });

  test(`${code}: verified/partial groups cite sources with https URLs`, () => {
    for (const key of STATE_GROUP_KEYS) {
      const group = law[key] as { confidence?: string; sources: { url: string; label: string; quote?: string | null }[] };
      if (group.confidence === "unverified") continue;
      assert.ok(group.sources.length >= 1, `${code}.${key} is ${group.confidence ?? "unmarked"} but has no sources`);
      for (const s of group.sources) {
        assert.match(s.url, /^https:\/\//, `${code}.${key} source must be https: ${s.url}`);
        assert.ok(s.label.trim().length > 0);
        if (s.quote) assert.ok(s.quote.length <= 400, `${code}.${key} quote too long`);
      }
    }
  });

  test(`${code}: numeric ranges are plausible`, () => {
    const { llc, transferTax, recording, estateTax, propertyTaxAffidavit, landlordTenant } = law;
    if (llc.formationFee != null) assert.ok(llc.formationFee >= 0 && llc.formationFee <= 1500, `llc.formationFee ${llc.formationFee}`);
    if (llc.reportFee != null) assert.ok(llc.reportFee >= 0 && llc.reportFee <= 1500, `llc.reportFee ${llc.reportFee}`);
    if (llc.annualStateTax.amount != null) assert.ok(llc.annualStateTax.amount >= 0 && llc.annualStateTax.amount <= 5000, `annualStateTax ${llc.annualStateTax.amount}`);
    if (llc.foreignRegistrationFee != null) assert.ok(llc.foreignRegistrationFee >= 0 && llc.foreignRegistrationFee <= 1500);
    if (transferTax.approxCombinedRate != null) assert.ok(transferTax.approxCombinedRate >= 0 && transferTax.approxCombinedRate <= 0.06, `rate ${transferTax.approxCombinedRate}`);
    if (recording.feeLow != null && recording.feeHigh != null) {
      assert.ok(recording.feeLow >= 0 && recording.feeLow <= recording.feeHigh && recording.feeHigh <= 1000, `recording ${recording.feeLow}-${recording.feeHigh}`);
    }
    if (estateTax.exemption != null) assert.ok(estateTax.exemption >= 100_000 && estateTax.exemption <= 20_000_000, `estate exemption ${estateTax.exemption}`);
    if (estateTax.topRate != null) assert.ok(estateTax.topRate > 0 && estateTax.topRate <= 0.2, `estate top rate ${estateTax.topRate}`);
    if (propertyTaxAffidavit.deadlineDays != null) assert.ok(propertyTaxAffidavit.deadlineDays >= 0 && propertyTaxAffidavit.deadlineDays <= 365);
    if (landlordTenant.depositReturnDays != null) assert.ok(landlordTenant.depositReturnDays >= 1 && landlordTenant.depositReturnDays <= 120);
    if (landlordTenant.nonpaymentNoticeDays != null) assert.ok(landlordTenant.nonpaymentNoticeDays >= 0 && landlordTenant.nonpaymentNoticeDays <= 60);
  });

  test(`${code}: logical consistency`, () => {
    const { deed, estateTax, llc, trust } = law;
    assert.ok(deed.mechanisms.includes(deed.primaryMechanism), "primary mechanism must be listed in mechanisms");
    if (deed.confidence !== "unverified") assert.ok(deed.mechanisms.includes("trust_only"), "trust_only is always available");
    if (estateTax.imposed === false) assert.equal(estateTax.exemption, null, "no estate tax -> no exemption amount");
    if (llc.reportCadence === "none") assert.ok(llc.reportFee === 0 || llc.reportFee === null);
    if (trust.execution.mode === "none") assert.equal(trust.execution.witnesses, 0);
    for (const key of ["trust", "will", "poa", "healthcareDirective", "deed"] as const) {
      const rule = law[key].execution;
      if (rule.mode === "witnesses" || rule.mode === "witnesses_or_notary" || rule.mode === "witnesses_and_notary") {
        assert.ok(rule.witnesses >= 1, `${code}.${key}.execution needs a witness count`);
      }
    }
  });

  test(`${code}: coverage label matches group confidence`, () => {
    const confidences = STATE_GROUP_KEYS.map((k) => (law[k] as { confidence?: string }).confidence ?? "verified");
    if (law.coverage === "full") {
      assert.ok(confidences.every((c) => c === "verified"), "coverage=full requires every group verified");
    }
    if (law.coverage === "partial") {
      assert.ok(confidences.some((c) => c !== "unverified"), "coverage=partial requires at least one usable group");
    }
  });
}
