import { useLocation } from "wouter";
import { Plus, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { usePlan } from "@/context/PlanProvider";
import { allSelectableStates, getState, hasCoreData, isGroupUsable } from "@/data/jurisdictions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  defaultTransferMethod,
  TRANSFER_METHOD_OPTIONS,
  PROPERTY_USE_OPTIONS,
} from "@/lib/transferDefaults";
import { fmtUSD } from "@/lib/constants";

const states = allSelectableStates();

function transferOptions(stateCode: string, llcOwned: boolean) {
  const mechanisms = getState(stateCode)?.deed.mechanisms ?? [];
  return TRANSFER_METHOD_OPTIONS.filter((option) => {
    if (option.value === "warranty_deed_purchase") return llcOwned;
    if (option.value === "quit_claim_to_trust") return true;
    return mechanisms.includes(option.value);
  });
}

function numOrUndef(v: string): number | undefined {
  if (v === "") return undefined;
  const n = Number(v.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? undefined : n;
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ---------- Step 1: Jurisdiction & Settlor ----------
export function StepJurisdiction() {
  const { plan, patch, setSettlor, setLlc } = usePlan();
  const suggested = plan.settlor.fullName
    ? `The ${plan.settlor.fullName} Revocable Living Trust`
    : "";
  return (
    <div className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Primary state (trust jurisdiction)">
          <Select
            value={plan.primaryStateCode}
            onValueChange={(v) => {
              patch({ primaryStateCode: v });
              if (!plan.llc.stateCode) setLlc({ stateCode: v });
            }}
          >
            <SelectTrigger data-testid="select-primary-state">
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent>
              {states.map((s) => (
                <SelectItem key={s.code} value={s.code}>
                  {s.name} {s.core ? "" : "(coming soon)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <div className="flex items-end">
          {hasCoreData(getState(plan.primaryStateCode)) ? (
            <Badge variant="secondary" className="gap-1.5" data-testid="badge-state-status">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              Full legal data available
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1.5 text-muted-foreground" data-testid="badge-state-status">
              <AlertTriangle className="h-3.5 w-3.5" />
              Data coming soon — generic templates
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Settlor full name">
          <Input
            data-testid="input-settlor-name"
            placeholder="e.g. Jordan A. Whitfield"
            value={plan.settlor.fullName}
            onChange={(e) => setSettlor({ ...plan.settlor, fullName: e.target.value })}
          />
        </Field>
        <Field label="Settlor city / state" hint="As you'd write it on a deed.">
          <Input
            data-testid="input-settlor-city"
            placeholder="e.g. Worthington, Franklin County, Ohio"
            value={plan.settlor.cityState ?? ""}
            onChange={(e) => setSettlor({ ...plan.settlor, cityState: e.target.value })}
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Trust name">
          <div className="flex gap-2">
            <Input
              data-testid="input-trust-name"
              placeholder={suggested || "The … Revocable Living Trust"}
              value={plan.trustName ?? ""}
              onChange={(e) => patch({ trustName: e.target.value })}
            />
            {suggested && plan.trustName !== suggested && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                data-testid="button-suggest-trust-name"
                onClick={() => patch({ trustName: suggested })}
              >
                Suggest
              </Button>
            )}
          </div>
        </Field>
        <Field label="Signing / notary venue" hint="Use the actual state and county where the document will be signed or notarized.">
          <div className="grid gap-2 sm:grid-cols-2">
            <Select
              value={plan.notaryStateCode || plan.primaryStateCode}
              onValueChange={(v) => patch({ notaryStateCode: v })}
            >
              <SelectTrigger data-testid="select-notary-state">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                {states.map((s) => (
                  <SelectItem key={s.code} value={s.code}>
                    {s.code} — {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              data-testid="input-notary-county"
              placeholder="County"
              value={plan.notaryCounty ?? ""}
              onChange={(e) => patch({ notaryCounty: e.target.value })}
            />
          </div>
        </Field>
      </div>

      <Field label="Successor trustee (optional)" hint="Who administers the trust after the settlor.">
        <Input
          data-testid="input-successor-trustee"
          placeholder="e.g. Avery Whitfield"
          value={plan.successorTrustee ?? ""}
          onChange={(e) => patch({ successorTrustee: e.target.value })}
        />
      </Field>
    </div>
  );
}

// ---------- Step 2: Beneficiaries ----------
export function StepBeneficiaries() {
  const { plan, addBeneficiary, updateBeneficiary, removeBeneficiary } = usePlan();
  const total = plan.beneficiaries.reduce((s, b) => s + (Number(b.sharePercent) || 0), 0);
  return (
    <div className="space-y-5">
      {plan.beneficiaries.length === 0 && (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No beneficiaries yet. Add the people who will inherit shares of the trust estate.
        </p>
      )}
      <div className="space-y-3">
        {plan.beneficiaries.map((b, i) => (
          <div
            key={b.id}
            className="grid items-end gap-3 rounded-lg border border-card-border bg-card p-4 sm:grid-cols-[1fr_1fr_auto_auto]"
            data-testid={`row-beneficiary-${i}`}
          >
            <Field label="Name">
              <Input
                data-testid={`input-beneficiary-name-${i}`}
                value={b.name}
                placeholder="Full name"
                onChange={(e) => updateBeneficiary(b.id, { name: e.target.value })}
              />
            </Field>
            <Field label="Relationship">
              <Input
                data-testid={`input-beneficiary-rel-${i}`}
                value={b.relationship ?? ""}
                placeholder="e.g. Child"
                onChange={(e) => updateBeneficiary(b.id, { relationship: e.target.value })}
              />
            </Field>
            <Field label="Share %">
              <Input
                data-testid={`input-beneficiary-share-${i}`}
                type="number"
                className="w-24"
                value={b.sharePercent === 0 ? "" : b.sharePercent}
                placeholder="0"
                onChange={(e) => updateBeneficiary(b.id, { sharePercent: Number(e.target.value) || 0 })}
              />
            </Field>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground"
              data-testid={`button-remove-beneficiary-${i}`}
              onClick={() => removeBeneficiary(b.id)}
              aria-label="Remove beneficiary"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" onClick={addBeneficiary} data-testid="button-add-beneficiary" className="gap-2">
          <Plus className="h-4 w-4" /> Add beneficiary
        </Button>
        {plan.beneficiaries.length > 0 && (
          <div
            className={`text-sm font-medium ${total === 100 ? "text-primary" : "text-destructive"}`}
            data-testid="text-share-total"
          >
            Total: {total}% {total === 100 ? "✓" : "(must equal 100%)"}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Step 3: Properties ----------
export function StepProperties() {
  const { plan, addProperty, updateProperty, removeProperty } = usePlan();
  return (
    <div className="space-y-5">
      {plan.properties.length === 0 && (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No properties yet. Add each parcel you want to place into the structure.
        </p>
      )}
      <div className="space-y-5">
        {plan.properties.map((p, i) => {
          const st = getState(p.stateCode);
          return (
            <div
              key={p.id}
              className="space-y-4 rounded-xl border border-card-border bg-card p-5"
              data-testid={`card-property-${i}`}
            >
              <div className="flex items-center justify-between">
                <h4 className="font-serif text-base font-semibold text-foreground">
                  {p.label || `Property ${i + 1}`}
                </h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground"
                  data-testid={`button-remove-property-${i}`}
                  onClick={() => removeProperty(p.id)}
                  aria-label="Remove property"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Label">
                  <Input
                    data-testid={`input-property-label-${i}`}
                    value={p.label}
                    placeholder="e.g. Maplewood Lane residence"
                    onChange={(e) => updateProperty(p.id, { label: e.target.value })}
                  />
                </Field>
                <Field label="Address">
                  <Input
                    data-testid={`input-property-address-${i}`}
                    value={p.address}
                    placeholder="Street, city, ST ZIP"
                    onChange={(e) => updateProperty(p.id, { address: e.target.value })}
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="State">
                  <Select
                    value={p.stateCode}
                    onValueChange={(v) =>
                      updateProperty(p.id, {
                        stateCode: v,
                        transferMethod: defaultTransferMethod(v, p.use, p.llcOwned),
                      })
                    }
                  >
                    <SelectTrigger data-testid={`select-property-state-${i}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {states.map((s) => (
                        <SelectItem key={s.code} value={s.code}>
                          {s.code} — {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="County">
                  <Input
                    data-testid={`input-property-county-${i}`}
                    value={p.county}
                    placeholder="County"
                    onChange={(e) => updateProperty(p.id, { county: e.target.value })}
                  />
                </Field>
                <Field label="Use">
                  <Select
                    value={p.use}
                    onValueChange={(v) =>
                      updateProperty(p.id, {
                        use: v as any,
                        transferMethod: defaultTransferMethod(p.stateCode, v as any, p.llcOwned),
                      })
                    }
                  >
                    <SelectTrigger data-testid={`select-property-use-${i}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROPERTY_USE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Parcel number(s)" hint="Comma-separated if more than one.">
                  <Input
                    data-testid={`input-property-parcel-${i}`}
                    value={p.parcelNumbers.join(", ")}
                    placeholder="e.g. 100-882041-00"
                    onChange={(e) =>
                      updateProperty(p.id, {
                        parcelNumbers: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                      })
                    }
                  />
                </Field>
                <Field label="Transfer method" hint={`Defaulted from ${st?.name ?? p.stateCode}'s mechanism + use.`}>
                  <Select
                    value={p.transferMethod}
                    onValueChange={(v) => updateProperty(p.id, { transferMethod: v as any })}
                  >
                    <SelectTrigger data-testid={`select-property-transfer-${i}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {transferOptions(p.stateCode, p.llcOwned).map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field label="Legal description" hint="Copy exactly from the current recorded deed.">
                <Textarea
                  data-testid={`input-property-legal-${i}`}
                  rows={2}
                  value={p.legalDescription ?? ""}
                  placeholder="Lot …, as recorded in Plat Book …, Page …"
                  onChange={(e) => updateProperty(p.id, { legalDescription: e.target.value })}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Year built" hint="Pre-1978 housing needs a federal lead-paint disclosure.">
                  <Input
                    data-testid={`input-property-yearbuilt-${i}`}
                    value={p.yearBuilt ?? ""}
                    placeholder="e.g. 1964"
                    onChange={(e) => updateProperty(p.id, { yearBuilt: numOrUndef(e.target.value) })}
                  />
                </Field>
                <Field label="Monthly rent (if rented)">
                  <Input
                    data-testid={`input-property-rent-${i}`}
                    value={p.monthlyRent ?? ""}
                    placeholder="$"
                    onChange={(e) => updateProperty(p.id, { monthlyRent: numOrUndef(e.target.value) })}
                  />
                </Field>
                <Field label="Annual operating costs" hint="Insurance, repairs, utilities, management. Excludes taxes and debt.">
                  <Input
                    data-testid={`input-property-opex-${i}`}
                    value={p.annualOperatingExpenses ?? ""}
                    placeholder="$"
                    onChange={(e) => updateProperty(p.id, { annualOperatingExpenses: numOrUndef(e.target.value) })}
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-4">
                <Field label="Market value (low)">
                  <Input
                    data-testid={`input-property-mvlow-${i}`}
                    value={p.marketValueLow ?? ""}
                    placeholder="$"
                    onChange={(e) => updateProperty(p.id, { marketValueLow: numOrUndef(e.target.value) })}
                  />
                </Field>
                <Field label="Market value (high)">
                  <Input
                    data-testid={`input-property-mvhigh-${i}`}
                    value={p.marketValueHigh ?? ""}
                    placeholder="$"
                    onChange={(e) => updateProperty(p.id, { marketValueHigh: numOrUndef(e.target.value) })}
                  />
                </Field>
                <Field label="Assessed value">
                  <Input
                    data-testid={`input-property-assessed-${i}`}
                    value={p.assessedValue ?? ""}
                    placeholder="$"
                    onChange={(e) => updateProperty(p.id, { assessedValue: numOrUndef(e.target.value) })}
                  />
                </Field>
                <Field label="Annual taxes">
                  <Input
                    data-testid={`input-property-taxes-${i}`}
                    value={p.annualTaxes ?? ""}
                    placeholder="$"
                    onChange={(e) => updateProperty(p.id, { annualTaxes: numOrUndef(e.target.value) })}
                  />
                </Field>
              </div>

              <div className="grid items-center gap-4 sm:grid-cols-3">
                <Field label="Mortgage balance">
                  <Input
                    data-testid={`input-property-mortgage-${i}`}
                    value={p.mortgageBalance ?? ""}
                    placeholder="$ (0 if none)"
                    onChange={(e) =>
                      updateProperty(p.id, {
                        mortgageBalance: numOrUndef(e.target.value),
                        ownedFreeAndClear: (numOrUndef(e.target.value) ?? 0) === 0,
                      })
                    }
                  />
                </Field>
                <label className="flex items-center gap-3 pt-5" data-testid={`switch-freeclear-wrap-${i}`}>
                  <Switch
                    checked={p.ownedFreeAndClear}
                    onCheckedChange={(v) => updateProperty(p.id, { ownedFreeAndClear: v })}
                    data-testid={`switch-property-freeclear-${i}`}
                  />
                  <span className="text-sm">Owned free &amp; clear</span>
                </label>
                <label className="flex items-center gap-3 pt-5">
                  <Switch
                    checked={p.llcOwned}
                    onCheckedChange={(v) =>
                      updateProperty(p.id, {
                        llcOwned: v,
                        transferMethod: defaultTransferMethod(p.stateCode, p.use, v),
                      })
                    }
                    data-testid={`switch-property-llc-${i}`}
                  />
                  <span className="text-sm">Held by the LLC</span>
                </label>
              </div>
            </div>
          );
        })}
      </div>

      <Button type="button" variant="outline" onClick={addProperty} data-testid="button-add-property" className="gap-2">
        <Plus className="h-4 w-4" /> Add property
      </Button>
    </div>
  );
}

// ---------- Step 4: LLC ----------
export function StepLlc() {
  const { plan, setLlc } = usePlan();
  return (
    <div className="space-y-6">
      <label className="flex items-center gap-3 rounded-lg border border-card-border bg-card p-4">
        <Switch
          checked={plan.llc.enabled}
          onCheckedChange={(v) => setLlc({ enabled: v })}
          data-testid="switch-llc-enabled"
        />
        <div>
          <p className="text-sm font-medium">Form an LLC</p>
          <p className="text-xs text-muted-foreground">Recommended to isolate rental / investment liability.</p>
        </div>
      </label>

      {plan.llc.enabled && (
        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Proposed LLC name">
              <Input
                data-testid="input-llc-name"
                value={plan.llc.name ?? ""}
                placeholder="e.g. Whitfield Holdings, LLC"
                onChange={(e) => setLlc({ name: e.target.value })}
              />
            </Field>
            <Field label="LLC state">
              <Select value={plan.llc.stateCode || plan.primaryStateCode} onValueChange={(v) => setLlc({ stateCode: v })}>
                <SelectTrigger data-testid="select-llc-state">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {states.map((s) => (
                    <SelectItem key={s.code} value={s.code}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Registered agent" hint="Defaults to the settlor if left blank.">
            <Input
              data-testid="input-llc-agent"
              value={plan.llc.registeredAgent ?? ""}
              placeholder="e.g. Jordan A. Whitfield"
              onChange={(e) => setLlc({ registeredAgent: e.target.value })}
            />
          </Field>
          <label className="flex items-center gap-3">
            <Switch
              checked={plan.llc.soleMemberIsTrust}
              onCheckedChange={(v) => setLlc({ soleMemberIsTrust: v })}
              data-testid="switch-llc-trust-member"
            />
            <span className="text-sm">The trust is the sole member of the LLC (recommended)</span>
          </label>

          {isGroupUsable(getState(plan.llc.stateCode || plan.primaryStateCode), "llc") && (
            <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground" data-testid="text-llc-fees">
              {(() => {
                const l = getState(plan.llc.stateCode || plan.primaryStateCode)!.llc;
                return (
                  <ul className="space-y-1">
                    <li>Formation fee: <span className="font-medium text-foreground">{fmtUSD(l.formationFee)}</span></li>
                    <li>Report: <span className="font-medium text-foreground">{l.reportCadence === "none" ? "none required" : `${l.reportCadence}, ${fmtUSD(l.reportFee)}`}</span></li>
                    <li>Series LLC: <span className="font-medium text-foreground">{l.seriesLlcAllowed ? "allowed" : "not allowed"}</span></li>
                  </ul>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Step 5: Funding ----------
export function StepFunding() {
  const { plan, setFunding } = usePlan();
  return (
    <div className="space-y-6">
      <label className="flex items-center gap-3 rounded-lg border border-card-border bg-card p-4">
        <Switch
          checked={plan.funding.useHeloc}
          onCheckedChange={(v) => setFunding({ useHeloc: v })}
          data-testid="switch-use-heloc"
        />
        <div>
          <p className="text-sm font-medium">Use a HELOC / home equity to fund an acquisition</p>
          <p className="text-xs text-muted-foreground">Draws against equity in one property to buy another.</p>
        </div>
      </label>

      {plan.funding.useHeloc && (
        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Source property (security)">
              <Select
                value={plan.funding.helocSourcePropertyId ?? ""}
                onValueChange={(v) => setFunding({ helocSourcePropertyId: v })}
              >
                <SelectTrigger data-testid="select-heloc-source">
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  {plan.properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label || p.address || "Property"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Target property (being acquired)">
              <Select
                value={plan.funding.targetPurchasePropertyId ?? ""}
                onValueChange={(v) => setFunding({ targetPurchasePropertyId: v })}
              >
                <SelectTrigger data-testid="select-heloc-target">
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  {plan.properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label || p.address || "Property"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Estimated rate (APR %)">
            <Input
              data-testid="input-heloc-rate"
              className="w-40"
              value={plan.funding.estimatedRate != null ? (plan.funding.estimatedRate * 100).toString() : ""}
              placeholder="e.g. 8"
              onChange={(e) => {
                const n = numOrUndef(e.target.value);
                setFunding({ estimatedRate: n != null ? n / 100 : undefined });
              }}
            />
          </Field>
          <label className="flex items-center gap-3">
            <Switch
              checked={plan.funding.structureAsLoanToLlc}
              onCheckedChange={(v) => setFunding({ structureAsLoanToLlc: v })}
              data-testid="switch-loan-to-llc"
            />
            <span className="text-sm">Structure the draw as a documented loan to the LLC (promissory note)</span>
          </label>
        </div>
      )}
    </div>
  );
}

// ---------- Step 6: Acquisition ----------
export function StepAcquisition() {
  const { plan, patch } = usePlan();
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Optional — fill in if you're buying a property (e.g. a family sale). Build year before 1978 triggers a federal lead-paint disclosure.
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Seller name">
          <Input
            data-testid="input-seller-name"
            value={plan.seller?.fullName ?? ""}
            placeholder="e.g. Morgan Reyes"
            onChange={(e) => patch({ seller: { ...(plan.seller ?? { fullName: "" }), fullName: e.target.value } })}
          />
        </Field>
        <Field label="Build year">
          <Input
            data-testid="input-build-year"
            value={plan.buildYear ?? ""}
            placeholder="e.g. 1969"
            onChange={(e) => patch({ buildYear: numOrUndef(e.target.value) })}
          />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Purchase price (low)">
          <Input
            data-testid="input-price-low"
            value={plan.purchasePriceLow ?? ""}
            placeholder="$"
            onChange={(e) => patch({ purchasePriceLow: numOrUndef(e.target.value) })}
          />
        </Field>
        <Field label="Purchase price (high)">
          <Input
            data-testid="input-price-high"
            value={plan.purchasePriceHigh ?? ""}
            placeholder="$"
            onChange={(e) => patch({ purchasePriceHigh: numOrUndef(e.target.value) })}
          />
        </Field>
      </div>
    </div>
  );
}

// ---------- Step 7: Review ----------
export function StepReview() {
  const { plan } = usePlan();
  useLocation();
  const total = plan.beneficiaries.reduce((s, b) => s + (Number(b.sharePercent) || 0), 0);
  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex justify-between gap-4 border-b border-border py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-card-border bg-card p-5">
        <h4 className="mb-2 font-serif text-base font-semibold">Settlor & trust</h4>
        <Row label="Settlor" value={plan.settlor.fullName || "—"} />
        <Row label="Trust" value={plan.trustName || `The ${plan.settlor.fullName || "…"} Revocable Living Trust`} />
        <Row label="State" value={getState(plan.primaryStateCode)?.name ?? plan.primaryStateCode} />
        <Row label="Notary county" value={plan.notaryCounty || "—"} />
        <Row label="Successor trustee" value={plan.successorTrustee || "—"} />
      </div>

      <div className="rounded-xl border border-card-border bg-card p-5">
        <h4 className="mb-2 font-serif text-base font-semibold">Beneficiaries</h4>
        {plan.beneficiaries.length ? (
          plan.beneficiaries.map((b) => (
            <Row key={b.id} label={`${b.name || "—"}${b.relationship ? ` (${b.relationship})` : ""}`} value={`${b.sharePercent}%`} />
          ))
        ) : (
          <p className="text-sm text-muted-foreground">None added.</p>
        )}
        {plan.beneficiaries.length > 0 && (
          <p className={`mt-2 text-sm font-medium ${total === 100 ? "text-primary" : "text-destructive"}`}>
            Total {total}%
          </p>
        )}
      </div>

      <div className="rounded-xl border border-card-border bg-card p-5">
        <h4 className="mb-2 font-serif text-base font-semibold">Properties</h4>
        {plan.properties.length ? (
          plan.properties.map((p) => (
            <Row
              key={p.id}
              label={p.label || p.address || "Property"}
              value={`${p.stateCode}${p.llcOwned ? " · LLC" : " · Trust"}`}
            />
          ))
        ) : (
          <p className="text-sm text-muted-foreground">None added.</p>
        )}
      </div>

      <div className="rounded-xl border border-card-border bg-card p-5">
        <h4 className="mb-2 font-serif text-base font-semibold">Structure</h4>
        <Row label="LLC" value={plan.llc.enabled ? `${plan.llc.name || "(unnamed)"} · ${plan.llc.stateCode}` : "None"} />
        <Row label="HELOC funding" value={plan.funding.useHeloc ? "Yes" : "No"} />
        <Row label="Acquisition" value={plan.seller?.fullName ? `from ${plan.seller.fullName}` : "—"} />
      </div>
    </div>
  );
}
