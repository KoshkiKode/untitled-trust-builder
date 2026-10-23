import type { EstatePlan } from "@/data/types";
import { getState } from "@/data/states";

export function validatePlan(plan: EstatePlan): string[] {
  const errors: string[] = [];
  const settlorName = plan.settlor.fullName.trim();

  if (!settlorName) errors.push("Enter the settlor's full name.");
  if (!plan.primaryStateCode) errors.push("Select the trust's primary state.");

  if (plan.beneficiaries.length === 0) {
    errors.push("Add at least one beneficiary.");
  } else {
    const total = plan.beneficiaries.reduce((sum, beneficiary) => sum + beneficiary.sharePercent, 0);
    if (Math.abs(total - 100) > 0.001) errors.push("Beneficiary shares must total exactly 100%.");
    if (plan.beneficiaries.some((beneficiary) => !beneficiary.name.trim())) {
      errors.push("Enter a name for every beneficiary.");
    }
    if (plan.beneficiaries.some((beneficiary) => beneficiary.sharePercent <= 0 || beneficiary.sharePercent > 100)) {
      errors.push("Each beneficiary share must be greater than 0% and no more than 100%.");
    }
  }

  for (let index = 0; index < plan.properties.length; index += 1) {
    const property = plan.properties[index];
    const label = property.label.trim() || property.address.trim() || `Property ${index + 1}`;
    const mechanisms = getState(property.stateCode)?.deed.mechanisms ?? [];
    const transferSupported =
      property.transferMethod === "quit_claim_to_trust" ||
      (property.transferMethod === "warranty_deed_purchase" && property.llcOwned) ||
      (property.transferMethod !== "warranty_deed_purchase" &&
        mechanisms.includes(property.transferMethod));
    if (!transferSupported) {
      errors.push(
        `${label}: the selected transfer method is not supported for ${
          getState(property.stateCode)?.name ?? property.stateCode
        }.`
      );
    }
    if (!property.stateCode) errors.push(`${label}: select a state.`);
    if (property.marketValueLow != null && property.marketValueLow < 0) {
      errors.push(`${label}: market value cannot be negative.`);
    }
    if (property.marketValueHigh != null && property.marketValueHigh < 0) {
      errors.push(`${label}: market value cannot be negative.`);
    }
    if (
      property.marketValueLow != null &&
      property.marketValueHigh != null &&
      property.marketValueLow > property.marketValueHigh
    ) {
      errors.push(`${label}: the low market value cannot exceed the high value.`);
    }
    if (property.mortgageBalance != null && property.mortgageBalance < 0) {
      errors.push(`${label}: mortgage balance cannot be negative.`);
    }
  }

  if (plan.purchasePriceLow != null && plan.purchasePriceLow < 0) {
    errors.push("Purchase price cannot be negative.");
  }
  if (plan.purchasePriceHigh != null && plan.purchasePriceHigh < 0) {
    errors.push("Purchase price cannot be negative.");
  }
  if (
    plan.purchasePriceLow != null &&
    plan.purchasePriceHigh != null &&
    plan.purchasePriceLow > plan.purchasePriceHigh
  ) {
    errors.push("The low purchase price cannot exceed the high purchase price.");
  }

  if (plan.funding.useHeloc) {
    if (!plan.funding.helocSourcePropertyId) errors.push("Select the property securing the HELOC.");
    if (!plan.funding.targetPurchasePropertyId) errors.push("Select the property funded by the HELOC.");
    if (
      plan.funding.estimatedRate != null &&
      (plan.funding.estimatedRate < 0 || plan.funding.estimatedRate > 1)
    ) {
      errors.push("The estimated HELOC rate must be between 0% and 100%.");
    }
  }

  return errors;
}
