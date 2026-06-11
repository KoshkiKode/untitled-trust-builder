import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Sparkles, Wand2 } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { usePlan } from "@/context/PlanProvider";
import { generatePlan } from "@/lib/planGenerator";
import { generateDocuments } from "@/lib/documentGenerator";
import { sampledPlan } from "@/lib/sampleData";
import {
  StepJurisdiction,
  StepBeneficiaries,
  StepProperties,
  StepLlc,
  StepFunding,
  StepAcquisition,
  StepReview,
} from "./steps";

const STEPS = [
  { id: "jurisdiction", title: "Jurisdiction & Settlor", sub: "Where the trust lives and who creates it.", el: <StepJurisdiction /> },
  { id: "beneficiaries", title: "Beneficiaries", sub: "Who inherits, and in what shares.", el: <StepBeneficiaries /> },
  { id: "properties", title: "Properties", sub: "The real property entering the structure.", el: <StepProperties /> },
  { id: "llc", title: "LLC", sub: "Optional liability-isolation entity.", el: <StepLlc /> },
  { id: "funding", title: "Funding", sub: "HELOC / equity to fund an acquisition.", el: <StepFunding /> },
  { id: "acquisition", title: "Acquisition", sub: "Optional purchase details.", el: <StepAcquisition /> },
  { id: "review", title: "Review", sub: "Confirm, then generate everything.", el: <StepReview /> },
];

export default function Build() {
  const [step, setStep] = useState(0);
  const [, navigate] = useLocation();
  const { plan, setPlan, setResult } = usePlan();

  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;
  const pct = Math.round(((step + 1) / STEPS.length) * 100);

  function loadSample() {
    setPlan(() => sampledPlan());
    setStep(STEPS.length - 1);
  }

  function generate() {
    const businessPlan = generatePlan(plan);
    const documents = generateDocuments(plan);
    setResult({ businessPlan, documents });
    navigate("/results");
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
        {/* progress */}
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex flex-wrap gap-1.5" data-testid="stepper">
              {STEPS.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStep(i)}
                  data-testid={`step-dot-${i}`}
                  aria-label={`Go to step ${i + 1}: ${s.title}`}
                  className={`h-1.5 rounded-full transition-all ${
                    i === step ? "w-8 bg-primary" : i < step ? "w-4 bg-primary/50" : "w-4 bg-border"
                  }`}
                />
              ))}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground"
              onClick={loadSample}
              data-testid="button-load-sample"
            >
              <Wand2 className="h-3.5 w-3.5" /> Load sample
            </Button>
          </div>
          <p className="text-xs font-medium text-muted-foreground" data-testid="text-step-progress">
            Step {step + 1} of {STEPS.length} · {pct}%
          </p>
        </div>

        {/* step header */}
        <div className="mb-6">
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground" data-testid="text-step-title">
            {STEPS[step].title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{STEPS[step].sub}</p>
        </div>

        {/* step body */}
        <div className="min-h-[280px]" data-testid={`step-body-${STEPS[step].id}`}>
          {STEPS[step].el}
        </div>

        {/* nav */}
        <div className="mt-10 flex items-center justify-between border-t border-border pt-6">
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            disabled={isFirst}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            data-testid="button-prev-step"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          {isLast ? (
            <Button type="button" className="gap-2" onClick={generate} data-testid="button-generate">
              <Sparkles className="h-4 w-4" /> Generate Plan &amp; Documents
            </Button>
          ) : (
            <Button
              type="button"
              className="gap-2"
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              data-testid="button-next-step"
            >
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
