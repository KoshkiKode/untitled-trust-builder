import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import type {
  EstatePlan,
  Beneficiary,
  Property,
  LlcPlan,
  FundingPlan,
  PartyName,
  BusinessPlan,
  GeneratedDocument,
} from "@/data/types";

let _id = 0;
export function uid(prefix = "id"): string {
  _id += 1;
  return `${prefix}-${Date.now().toString(36)}-${_id}`;
}

export function emptyPlan(): EstatePlan {
  return {
    settlor: { fullName: "", cityState: "" },
    successorTrustee: "",
    trustName: "",
    notaryCounty: "",
    beneficiaries: [],
    properties: [],
    llc: { enabled: false, name: "", stateCode: "", registeredAgent: "", soleMemberIsTrust: true },
    funding: { useHeloc: false, structureAsLoanToLlc: true },
    primaryStateCode: "MI",
  };
}

interface PlanContextValue {
  plan: EstatePlan;
  setPlan: (updater: (p: EstatePlan) => EstatePlan) => void;
  patch: (partial: Partial<EstatePlan>) => void;
  setSettlor: (s: PartyName) => void;
  addBeneficiary: () => void;
  updateBeneficiary: (id: string, partial: Partial<Beneficiary>) => void;
  removeBeneficiary: (id: string) => void;
  addProperty: () => void;
  updateProperty: (id: string, partial: Partial<Property>) => void;
  removeProperty: (id: string) => void;
  setLlc: (partial: Partial<LlcPlan>) => void;
  setFunding: (partial: Partial<FundingPlan>) => void;
  reset: () => void;
  // generated results cache
  result: { businessPlan: BusinessPlan; documents: GeneratedDocument[] } | null;
  setResult: (r: { businessPlan: BusinessPlan; documents: GeneratedDocument[] } | null) => void;
}

const PlanContext = createContext<PlanContextValue | null>(null);

export function PlanProvider({ children }: { children: ReactNode }) {
  const [plan, setPlanState] = useState<EstatePlan>(emptyPlan);
  const [result, setResult] = useState<PlanContextValue["result"]>(null);

  const setPlan = useCallback((updater: (p: EstatePlan) => EstatePlan) => {
    setPlanState((prev) => updater(prev));
  }, []);

  const patch = useCallback((partial: Partial<EstatePlan>) => {
    setPlanState((prev) => ({ ...prev, ...partial }));
  }, []);

  const setSettlor = useCallback((s: PartyName) => {
    setPlanState((prev) => ({ ...prev, settlor: s }));
  }, []);

  const addBeneficiary = useCallback(() => {
    setPlanState((prev) => ({
      ...prev,
      beneficiaries: [
        ...prev.beneficiaries,
        { id: uid("ben"), name: "", sharePercent: 0, relationship: "" },
      ],
    }));
  }, []);

  const updateBeneficiary = useCallback((id: string, partial: Partial<Beneficiary>) => {
    setPlanState((prev) => ({
      ...prev,
      beneficiaries: prev.beneficiaries.map((b) => (b.id === id ? { ...b, ...partial } : b)),
    }));
  }, []);

  const removeBeneficiary = useCallback((id: string) => {
    setPlanState((prev) => ({
      ...prev,
      beneficiaries: prev.beneficiaries.filter((b) => b.id !== id),
    }));
  }, []);

  const addProperty = useCallback(() => {
    setPlanState((prev) => ({
      ...prev,
      properties: [
        ...prev.properties,
        {
          id: uid("prop"),
          label: "",
          address: "",
          stateCode: prev.primaryStateCode,
          county: "",
          parcelNumbers: [""],
          legalDescription: "",
          use: "primary_residence",
          ownedFreeAndClear: false,
          transferMethod: "quit_claim_to_trust",
          llcOwned: false,
        },
      ],
    }));
  }, []);

  const updateProperty = useCallback((id: string, partial: Partial<Property>) => {
    setPlanState((prev) => ({
      ...prev,
      properties: prev.properties.map((p) => (p.id === id ? { ...p, ...partial } : p)),
    }));
  }, []);

  const removeProperty = useCallback((id: string) => {
    setPlanState((prev) => ({
      ...prev,
      properties: prev.properties.filter((p) => p.id !== id),
      funding: {
        ...prev.funding,
        helocSourcePropertyId:
          prev.funding.helocSourcePropertyId === id ? undefined : prev.funding.helocSourcePropertyId,
        targetPurchasePropertyId:
          prev.funding.targetPurchasePropertyId === id
            ? undefined
            : prev.funding.targetPurchasePropertyId,
      },
    }));
  }, []);

  const setLlc = useCallback((partial: Partial<LlcPlan>) => {
    setPlanState((prev) => ({ ...prev, llc: { ...prev.llc, ...partial } }));
  }, []);

  const setFunding = useCallback((partial: Partial<FundingPlan>) => {
    setPlanState((prev) => ({ ...prev, funding: { ...prev.funding, ...partial } }));
  }, []);

  const reset = useCallback(() => {
    setPlanState(emptyPlan());
    setResult(null);
  }, []);

  return (
    <PlanContext.Provider
      value={{
        plan,
        setPlan,
        patch,
        setSettlor,
        addBeneficiary,
        updateBeneficiary,
        removeBeneficiary,
        addProperty,
        updateProperty,
        removeProperty,
        setLlc,
        setFunding,
        reset,
        result,
        setResult,
      }}
    >
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan(): PlanContextValue {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error("usePlan must be used within a PlanProvider");
  return ctx;
}
