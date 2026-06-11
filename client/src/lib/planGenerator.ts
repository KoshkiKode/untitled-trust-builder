import type {
  EstatePlan,
  BusinessPlan,
  PlanSection,
  CostLine,
  Property,
} from "@/data/types";
import { getState, type StateLaw, type SourceRef } from "@/data/states";
import { fmtUSD, fmtRange, fmtPct } from "./constants";

/** Format a state's sources array into footnote lines. */
function sourceLines(sources: SourceRef[]): string[] {
  return sources.map((s) => `  • ${s.label} — ${s.url}`);
}

function mechanismLabel(m: string): string {
  switch (m) {
    case "lady_bird":
      return "Lady Bird (enhanced life estate) deed";
    case "tod":
      return "Transfer-on-Death (TOD) deed";
    case "tod_affidavit":
      return "Transfer on Death Designation Affidavit";
    case "trust_only":
      return "direct transfer to the revocable living trust";
    default:
      return m;
  }
}

function transferMethodLabel(m: string): string {
  switch (m) {
    case "lady_bird":
      return "Lady Bird deed";
    case "tod":
      return "TOD deed";
    case "tod_affidavit":
      return "TOD designation affidavit";
    case "quit_claim_to_trust":
      return "Quit-claim deed into the trust";
    case "warranty_deed_purchase":
      return "Warranty deed (purchase)";
    default:
      return m;
  }
}

function midValue(p: Property): number {
  if (p.marketValueLow != null && p.marketValueHigh != null)
    return (p.marketValueLow + p.marketValueHigh) / 2;
  return p.marketValueLow ?? p.marketValueHigh ?? p.assessedValue ?? 0;
}

export function generatePlan(plan: EstatePlan): BusinessPlan {
  const state = getState(plan.primaryStateCode);
  const stateName = state?.name ?? plan.primaryStateCode;
  const sections: PlanSection[] = [];

  const settlorName = plan.settlor.fullName || "the Settlor";
  const trustName = plan.trustName || `The ${settlorName} Revocable Living Trust`;
  const llcEnabled = plan.llc.enabled;
  const llcState = getState(plan.llc.stateCode || plan.primaryStateCode);
  const llcName = plan.llc.name || "[LLC name to be selected]";

  const trustProps = plan.properties.filter((p) => !p.llcOwned);
  const llcProps = plan.properties.filter((p) => p.llcOwned);

  // ---------- Executive Summary ----------
  const exec: string[] = [];
  exec.push(
    `This plan outlines a two-tier estate structure for ${settlorName}, anchored by a ${stateName} revocable living trust (${trustName}) and, where useful for liability isolation, one or more limited liability companies.`
  );
  exec.push("");
  exec.push(
    `Tier 1 — The Trust. ${trustName} holds title to assets that should pass outside of probate and remain under the Settlor's full control during life. While ${settlorName} serves as trustee, the trust is a grantor trust: income is reported on the personal Form 1040, with no separate Form 1041 required.`
  );
  if (llcEnabled) {
    exec.push("");
    exec.push(
      `Tier 2 — The LLC. ${llcName} (a ${llcState?.name ?? plan.llc.stateCode} LLC) holds investment / rental property to wall off liability from the Settlor's personal and homestead assets. ${
        plan.llc.soleMemberIsTrust
          ? "The trust is the sole member of the LLC, so the LLC interest itself passes through the trust and avoids probate."
          : "The LLC is owned directly; consider making the trust the member so the membership interest avoids probate."
      }`
    );
  } else {
    exec.push("");
    exec.push(
      "No LLC is enabled in this version of the plan. All real property is routed through the trust directly. If a rental or investment property is added later, forming an LLC is recommended to isolate tenant/liability exposure from the homestead."
    );
  }
  exec.push("");
  exec.push(
    `The plan covers ${plan.properties.length} ${
      plan.properties.length === 1 ? "property" : "properties"
    } and ${plan.beneficiaries.length} ${
      plan.beneficiaries.length === 1 ? "beneficiary" : "beneficiaries"
    }.`
  );
  sections.push({ id: "executive-summary", title: "Executive Summary", body: exec });

  // ---------- Trust Foundation ----------
  if (state?.complete && state.trust) {
    const t = state.trust;
    const tb: string[] = [];
    tb.push(t.notes);
    tb.push("");
    tb.push(`Execution formalities in ${stateName}:`);
    tb.push(`  • Notarization required: ${t.notarizationRequired ? "Yes" : "No"}`);
    tb.push(
      `  • Witnesses required: ${t.witnessesRequired === 0 ? "None (notarization suffices)" : t.witnessesRequired}`
    );
    tb.push(
      `  • Certificate of trust recognized: ${t.certificateOfTrustRecognized ? "Yes — use it to prove authority without disclosing the full trust" : "No"}`
    );
    tb.push(
      `  • Grantor trust during life: ${t.grantorTrustDuringLife ? "Yes — personal 1040, no separate 1041" : "No"}`
    );
    if (plan.notaryCounty) {
      tb.push("");
      tb.push(`Notarization is planned in ${plan.notaryCounty}.`);
    }
    tb.push("");
    tb.push("Sources:");
    tb.push(...sourceLines(t.sources));
    sections.push({ id: "trust-foundation", title: "Trust Foundation", body: tb });
  } else {
    sections.push({
      id: "trust-foundation",
      title: "Trust Foundation",
      body: [
        `Detailed trust data for ${stateName} has not yet been researched in this version. The generic templates assume a notarized revocable living trust treated as a grantor trust during life. Verify ${stateName}'s execution formalities (notary and witness requirements) before signing.`,
      ],
    });
  }

  // ---------- Deed / Transfer Strategy ----------
  const deedBody: string[] = [];
  if (state?.complete && state.deed) {
    const d = state.deed;
    const prim = d.primaryMechanism;
    deedBody.push(
      `${stateName}'s primary probate-avoidance mechanism for real property is the ${mechanismLabel(prim)}.`
    );
    deedBody.push("");
    deedBody.push(d.notes);
    deedBody.push("");
    // per-property recommendation
    deedBody.push("Recommended handling, property by property:");
    plan.properties.forEach((p) => {
      const label = p.label || p.address || "Unnamed property";
      let rec = "";
      if (p.llcOwned) {
        rec = `Hold in ${llcName}. Convey by warranty deed at acquisition (or quit-claim from the Settlor into the LLC), then the LLC membership interest passes through the trust.`;
      } else if (prim === "lady_bird") {
        if (p.use === "primary_residence") {
          rec = `Use a Lady Bird deed. It preserves the homestead / Principal Residence Exemption and Medicaid eligibility, works with the existing mortgage${
            (p.mortgageBalance ?? 0) > 0 ? ` (balance ${fmtUSD(p.mortgageBalance)})` : ""
          }, keeps full lifetime control, and avoids probate with a stepped-up basis to the beneficiaries.`;
        } else {
          rec = `Either a Lady Bird deed (retains control, avoids probate) or a quit-claim transfer into ${trustName}. For non-homestead property, transferring into the trust is often cleaner.`;
        }
      } else if (prim === "tod" || prim === "tod_affidavit") {
        rec = `Use the ${mechanismLabel(prim)} to name the beneficiaries directly, OR transfer the property into ${trustName} by quit-claim deed. ${
          (p.mortgageBalance ?? 0) > 0
            ? "Both options work alongside the existing mortgage (a due-on-sale clause is generally not triggered by an estate-planning transfer to your own trust under the Garn-St. Germain Act)."
            : ""
        }`;
      } else if (prim === "trust_only") {
        rec = `${stateName} has no statutory TOD deed and does not recognize Lady Bird deeds, so transfer this property DIRECTLY into ${trustName} by deed. The trust is the probate-avoidance vehicle here.`;
      }
      deedBody.push(`  • ${label} (${transferMethodLabel(p.transferMethod)} selected): ${rec}`);
    });
    deedBody.push("");
    deedBody.push("Sources:");
    deedBody.push(...sourceLines(d.sources));
  } else {
    deedBody.push(
      `${stateName} deed data is not yet researched. Default approach: transfer real property into ${trustName} by a recordable deed (quit-claim or warranty), and confirm whether ${stateName} offers a TOD deed or Lady Bird deed as an alternative.`
    );
  }
  sections.push({ id: "deed-strategy", title: "Deed & Transfer Strategy", body: deedBody });

  // ---------- LLC Structure ----------
  if (llcEnabled && llcState?.complete && llcState.llc) {
    const l = llcState.llc;
    const lb: string[] = [];
    lb.push(
      `${llcName} will be organized in ${llcState.name} by filing the ${l.formationFormName} with the ${l.filingAgency}${
        l.onlinePortal ? ` (online portal: ${l.onlinePortal})` : ""
      }.`
    );
    lb.push("");
    lb.push(`  • Formation filing fee: ${fmtUSD(l.formationFee)}`);
    lb.push(
      `  • Ongoing report: ${
        l.reportCadence === "none"
          ? "None required"
          : `${l.reportCadence} report, fee ${fmtUSD(l.reportFee)}`
      }`
    );
    lb.push(`  • ${l.reportNotes}`);
    lb.push(
      `  • Series LLC permitted: ${l.seriesLlcAllowed ? "Yes — additional properties can be isolated within one filing" : "No — each property needing isolation requires its own LLC"}`
    );
    lb.push(
      `  • Written operating agreement required by statute: ${l.operatingAgreementRequired ? "Yes" : "No (still strongly recommended; kept internally)"}`
    );
    lb.push("");
    lb.push(l.notes);
    lb.push("");
    lb.push(
      plan.llc.soleMemberIsTrust
        ? `Ownership: ${trustName} is the sole member of ${llcName}. The LLC is a disregarded entity for federal tax (single member), and the membership interest passes through the trust at death — no probate.`
        : `Ownership: the LLC is owned directly by ${settlorName}. Strongly consider assigning the membership interest to ${trustName} so it avoids probate.`
    );
    if (plan.llc.registeredAgent) {
      lb.push(`Registered agent: ${plan.llc.registeredAgent}.`);
    }
    if (llcProps.length) {
      lb.push("");
      lb.push(
        `Properties held in the LLC: ${llcProps.map((p) => p.label || p.address).join("; ")}.`
      );
    }
    lb.push("");
    lb.push("Sources:");
    lb.push(...sourceLines(l.sources));
    sections.push({ id: "llc-structure", title: "LLC Structure", body: lb });
  } else if (llcEnabled) {
    sections.push({
      id: "llc-structure",
      title: "LLC Structure",
      body: [
        `${llcName} is planned in ${
          llcState?.name ?? plan.llc.stateCode
        }, but detailed LLC fee/report data for that state is not yet researched. Verify the Articles of Organization filing fee, annual/biennial report cadence and fee, and whether series LLCs are allowed before filing.`,
      ],
    });
  }

  // ---------- Transfer Tax Estimates ----------
  if (state?.complete && state.transferTax) {
    const tt = state.transferTax;
    const ttb: string[] = [];
    ttb.push(`${stateName} transfer tax: ${tt.stateRateDescription}.`);
    ttb.push(
      `Approximate combined rate used for estimates: ${fmtPct(tt.approxCombinedRate)} of price.`
    );
    ttb.push("");
    if (tt.familyExemptionAvailable) {
      ttb.push(
        "A family / revocable-trust exemption is generally available. Transfers from an individual to their own revocable trust usually involve no change in beneficial ownership and are exempt; verify each conveyance."
      );
    }
    ttb.push(tt.notes);
    ttb.push("");
    // estimate for purchase / acquisition
    const price =
      plan.purchasePriceLow != null && plan.purchasePriceHigh != null
        ? (plan.purchasePriceLow + plan.purchasePriceHigh) / 2
        : plan.purchasePriceLow ?? plan.purchasePriceHigh;
    if (price && price > 0) {
      ttb.push(
        `Estimated transfer tax on a purchase at ${fmtRange(
          plan.purchasePriceLow,
          plan.purchasePriceHigh
        )}: ≈ ${fmtUSD(price * tt.approxCombinedRate)} (at ${fmtPct(
          tt.approxCombinedRate
        )}), before any exemption.`
      );
    }
    plan.properties.forEach((p) => {
      const v = midValue(p);
      if (v > 0) {
        ttb.push(
          `  • ${p.label || p.address}: a non-exempt transfer at ~${fmtUSD(v)} would carry ≈ ${fmtUSD(
            v * tt.approxCombinedRate
          )} in transfer tax (likely $0 if the trust/family exemption applies).`
        );
      }
    });
    ttb.push("");
    ttb.push("Sources:");
    ttb.push(...sourceLines(tt.sources));
    sections.push({ id: "transfer-tax", title: "Transfer Tax Estimates", body: ttb });
  }

  // ---------- HELOC / Funding ----------
  if (plan.funding.useHeloc) {
    const src = plan.properties.find((p) => p.id === plan.funding.helocSourcePropertyId);
    const tgt = plan.properties.find((p) => p.id === plan.funding.targetPurchasePropertyId);
    const fb: string[] = [];
    if (src) {
      const value = midValue(src);
      const mortgage = src.mortgageBalance ?? 0;
      const equity = Math.max(0, value - mortgage);
      fb.push(
        `Funding source: ${src.label || src.address} — estimated value ${fmtUSD(
          value
        )}, mortgage balance ${fmtUSD(mortgage)}, so current equity ≈ ${fmtUSD(equity)}.`
      );
      fb.push("");
      fb.push("Borrowing capacity at common combined loan-to-value (CLTV) limits:");
      [0.8, 0.85, 0.9].forEach((cltv) => {
        const maxDebt = value * cltv;
        const available = Math.max(0, maxDebt - mortgage);
        fb.push(
          `  • ${fmtPct(cltv)} CLTV → max total debt ${fmtUSD(maxDebt)}, available to draw ≈ ${fmtUSD(
            available
          )}.`
        );
      });
      if (plan.funding.estimatedRate) {
        const draw = Math.max(0, value * 0.85 - mortgage);
        const annualInterest = draw * plan.funding.estimatedRate;
        fb.push("");
        fb.push(
          `At an estimated rate of ${fmtPct(plan.funding.estimatedRate)} on an 85% CLTV draw of ${fmtUSD(
            draw
          )}, interest-only cost ≈ ${fmtUSD(annualInterest)}/yr (${fmtUSD(
            annualInterest / 12
          )}/mo).`
        );
      }
    } else {
      fb.push("A HELOC is enabled but no source property has been selected. Pick the property with the most equity as the security.");
    }
    if (tgt) {
      fb.push("");
      fb.push(
        `Use of funds: acquiring ${tgt.label || tgt.address}${
          plan.purchasePriceLow != null
            ? ` at ${fmtRange(plan.purchasePriceLow, plan.purchasePriceHigh)}`
            : ""
        }.`
      );
    }
    if (plan.funding.structureAsLoanToLlc && llcEnabled) {
      fb.push("");
      fb.push(
        `Structure: the Settlor (or trust) draws on the HELOC and lends the proceeds to ${llcName} under a written promissory note. This keeps the debt documented, supports the LLC's separate-entity integrity, and lets interest flow through cleanly. A promissory note is generated in the Documents tab.`
      );
    }
    sections.push({ id: "funding", title: "Funding & HELOC Strategy", body: fb });
  }

  // ---------- Liability Architecture ----------
  const liab: string[] = [];
  liab.push(
    "The structure separates control, probate avoidance, and liability into distinct layers:"
  );
  liab.push("");
  liab.push(
    `  • Homestead / personal-use property → ${trustName}. Probate avoidance and control without exposing the home to business creditors.`
  );
  if (llcEnabled) {
    liab.push(
      `  • Rental / investment property → ${llcName}. Tenant and operational liability is contained inside the LLC; a claim against the rental does not reach the homestead or personal assets.`
    );
    liab.push(
      `  • The LLC membership interest → owned by the trust, so the business itself still avoids probate.`
    );
  }
  liab.push("");
  liab.push(
    "Maintain the LLC's separateness (its own bank account, no commingling, leases in the LLC's name, adequate insurance) so the liability shield holds up. The trust does not provide asset protection from the Settlor's own creditors during life — it is a probate-avoidance and control tool."
  );
  sections.push({ id: "liability", title: "Liability Architecture", body: liab });

  // ---------- Beneficiaries ----------
  if (plan.beneficiaries.length) {
    const bb: string[] = [];
    const total = plan.beneficiaries.reduce((s, b) => s + (b.sharePercent || 0), 0);
    bb.push("Distribution of the trust estate:");
    plan.beneficiaries.forEach((b) => {
      bb.push(
        `  • ${b.name || "[unnamed]"}${b.relationship ? ` (${b.relationship})` : ""}: ${b.sharePercent}%`
      );
    });
    bb.push("");
    bb.push(
      total === 100
        ? "Shares total 100%. ✓"
        : `⚠ Shares total ${total}% — adjust so they sum to 100% before finalizing.`
    );
    sections.push({ id: "beneficiaries", title: "Beneficiaries & Distribution", body: bb });
  }

  // ---------- Cost Summary ----------
  const setupCosts: CostLine[] = [];
  const annualCosts: CostLine[] = [];

  setupCosts.push({
    item: "Revocable living trust (self-prepared template)",
    low: 0,
    high: 0,
    note: "Templates included; notarization fee extra",
  });
  setupCosts.push({
    item: "Notarization",
    low: 10,
    high: 50,
    note: "Per signing, varies by notary",
  });

  // recording fees per property (use county if available)
  plan.properties.forEach((p) => {
    const ps = getState(p.stateCode);
    const county = ps?.counties?.find(
      (c) => c.name.toLowerCase() === (p.county || "").toLowerCase()
    );
    const fee = county?.recordingFee ?? 30;
    setupCosts.push({
      item: `Deed recording — ${p.label || p.address || p.stateCode}`,
      low: fee,
      high: fee + 20,
      note: county ? `${county.name} County standard fee` : "Estimated county recording fee",
    });
  });

  if (llcEnabled && llcState?.llc) {
    setupCosts.push({
      item: `LLC formation — ${llcName}`,
      low: llcState.llc.formationFee,
      high: llcState.llc.formationFee,
      note: llcState.llc.formationFormName,
    });
    if (llcState.code === "NY") {
      setupCosts.push({
        item: "NY LLC publication + Certificate of Publication",
        low: 350,
        high: 1600,
        note: "Two newspapers + $50 filing; NYC counties far higher",
      });
    }
    if (llcState.llc.reportCadence !== "none" && llcState.llc.reportFee > 0) {
      annualCosts.push({
        item: `LLC ${llcState.llc.reportCadence} report`,
        low: llcState.llc.reportFee,
        high: llcState.llc.reportFee,
        note: llcState.llc.reportNotes,
      });
    }
  }

  // registered agent if not self
  annualCosts.push({
    item: "Registered agent (if not self-serving)",
    low: 0,
    high: 125,
    note: "$0 if you serve as your own agent",
  });

  // ---------- Outstanding Items ----------
  const outstandingItems: { item: string; action: string }[] = [];
  if (!plan.successorTrustee) {
    outstandingItems.push({
      item: "Successor trustee not named",
      action: "Designate who administers the trust after the Settlor; name a backup.",
    });
  }
  if (llcEnabled && !plan.llc.name) {
    outstandingItems.push({
      item: "LLC name not chosen",
      action: `Select and clear an available name with the ${llcState?.name ?? "state"} business registry.`,
    });
  }
  const total = plan.beneficiaries.reduce((s, b) => s + (b.sharePercent || 0), 0);
  if (plan.beneficiaries.length && total !== 100) {
    outstandingItems.push({
      item: `Beneficiary shares total ${total}%`,
      action: "Adjust shares so they sum to exactly 100%.",
    });
  }
  if (!plan.notaryCounty) {
    outstandingItems.push({
      item: "Notary county not set",
      action: "Confirm the county where signing/notarization will occur for the acknowledgment block.",
    });
  }
  plan.properties.forEach((p) => {
    if (!p.parcelNumbers.filter(Boolean).length) {
      outstandingItems.push({
        item: `Missing parcel number — ${p.label || p.address}`,
        action: "Obtain the parcel / tax ID from the county before recording any deed.",
      });
    }
    if (!p.legalDescription) {
      outstandingItems.push({
        item: `Missing legal description — ${p.label || p.address}`,
        action: "Copy the exact legal description from the current recorded deed.",
      });
    }
  });
  if (!state?.complete) {
    outstandingItems.push({
      item: `${stateName} data not yet researched`,
      action: "Verify trust, deed, LLC, and transfer-tax rules with the state/county before filing.",
    });
  }

  return {
    title: `Estate Plan — ${settlorName}`,
    subtitle: `${stateName} revocable living trust${
      llcEnabled ? ` + ${llcState?.name ?? plan.llc.stateCode} LLC` : ""
    }`,
    generatedAt: new Date().toLocaleString("en-US"),
    sections,
    setupCosts,
    annualCosts,
    outstandingItems,
  };
}
