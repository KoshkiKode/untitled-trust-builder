import { Link } from "wouter";
import { ArrowRight, FileText, ShieldCheck, Building2, ScrollText, Info } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { LogoMark } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { DISCLAIMER, APP_OWNER } from "@/lib/constants";

const STEPS = [
  {
    icon: ScrollText,
    title: "Answer the questionnaire",
    body: "Describe your estate — settlor, beneficiaries, properties, an optional LLC, and how you'll fund any acquisition.",
  },
  {
    icon: ShieldCheck,
    title: "Get a tailored plan",
    body: "We assemble a business plan with deed strategy, transfer-tax estimates, HELOC math, and real LLC fees for your state.",
  },
  {
    icon: FileText,
    title: "Download the documents",
    body: "Pre-filled trust, will, deeds, LLC agreement, and more — as individual PDFs or one all-in-one booklet.",
  },
];

const FEATURES = [
  { title: "Two-tier structure", body: "A revocable living trust for control and probate avoidance, paired with an LLC to isolate rental liability." },
  { title: "State-aware deeds", body: "Lady Bird, transfer-on-death, or direct-to-trust — chosen from your state's actual statutory mechanism." },
  { title: "Real fees & citations", body: "LLC filing fees, report cadence, and transfer-tax rates pulled from sourced legal data with footnotes." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.5] dark:opacity-[0.35]"
          style={{
            backgroundImage:
              "radial-gradient(60rem 30rem at 70% -10%, hsl(var(--primary) / 0.10), transparent 60%)",
          }}
        />
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <Building2 className="h-3.5 w-3.5 text-primary" />
              Trust + LLC + estate planning
            </div>
            <h1 className="font-serif text-4xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl">
              Build your trust, LLC, and estate documents with confidence.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground" data-testid="text-value-prop">
              Answer a guided questionnaire and generate a tailored business plan plus ready-to-review
              informational document templates for review — entirely in your browser, with no data leaving your device.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/build" data-testid="link-start-plan">
                <Button size="lg" className="gap-2 text-base">
                  Start a Plan
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <span className="text-sm text-muted-foreground">Takes about 5 minutes</span>
            </div>
          </div>

          <div className="relative">
            <div className="mx-auto flex aspect-square w-full max-w-sm items-center justify-center rounded-2xl border border-card-border bg-card shadow-sm">
              <LogoMark size={180} className="text-primary" />
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <h2 className="font-serif text-2xl font-semibold tracking-tight text-foreground">How it works</h2>
        <p className="mt-2 text-muted-foreground">Three steps from questions to review-first templates.</p>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className="rounded-xl border border-card-border bg-card p-6"
              data-testid={`card-step-${i + 1}`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <s.icon className="h-5 w-5" />
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
                <h3 className="font-semibold text-foreground">{s.title}</h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="border-y border-border bg-card/40">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
          <div className="grid gap-5 md:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="border-l-2 border-primary/40 pl-4">
                <h3 className="font-serif text-lg font-semibold text-foreground">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <div
          className="flex gap-3 rounded-xl border border-border bg-muted/40 p-5"
          data-testid="text-disclaimer"
        >
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-semibold text-foreground">Legal disclaimer</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{DISCLAIMER}</p>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:px-8">
          <span>Trust Builder — by {APP_OWNER}</span>
          <span>Informational planning materials only.</span>
        </div>
      </footer>
    </div>
  );
}
