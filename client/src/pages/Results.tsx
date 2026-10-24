import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Download, FileText, BookOpen, ArrowLeft, Loader2, AlertCircle, Info } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePlan } from "@/context/PlanProvider";
import { renderTextPdf, renderBooklet } from "@/lib/pdf";
import { DISCLAIMER, fmtUSD } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import type { GeneratedDocument } from "@/data/types";

function renderBodyLine(ln: string, key: number) {
  const trimmed = ln.trim();
  if (trimmed === "") return <div key={key} className="h-2" />;
  const isHeading = /^(ARTICLE|SCHEDULE|ACKNOWLEDGMENT|Sources:|Setup|Annual|WITNESSES)/.test(trimmed);
  const isBullet = trimmed.startsWith("•") || ln.startsWith("  •");
  const isSource = ln.startsWith("  •") && ln.includes("http");
  return (
    <p
      key={key}
      className={[
        "leading-relaxed",
        isHeading ? "mt-2 font-semibold text-foreground" : "text-muted-foreground",
        isBullet ? "pl-4" : "",
        isSource ? "break-all text-xs" : "text-sm",
      ].join(" ")}
    >
      {ln}
    </p>
  );
}

export default function Results() {
  const { plan, result } = usePlan();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  if (!result) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto flex max-w-md flex-col items-center px-5 py-24 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 font-serif text-xl font-semibold">No plan generated yet</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Complete the questionnaire to generate your business plan and documents.
          </p>
          <Button className="mt-6" onClick={() => navigate("/build")} data-testid="button-go-build">
            Start a Plan
          </Button>
        </div>
      </div>
    );
  }

  const { businessPlan, documents } = result;

  async function withBusy(key: string, fn: () => Promise<string[] | void>) {
    try {
      setBusy(key);
      const substituted = await fn();
      if (substituted && substituted.length > 0) {
        toast({
          title: "Some characters were substituted in the PDF",
          description: `The PDF font cannot print ${substituted.join(" ")}. The on-screen text keeps the original characters. Check names and addresses in the PDF before signing.`,
        });
      }
    } catch (e: any) {
      toast({ title: "PDF generation failed", description: String(e?.message ?? e), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  const setupTotal = businessPlan.setupCosts.reduce(
    (a, c) => ({ low: a.low + c.low, high: a.high + c.high }),
    { low: 0, high: 0 }
  );
  const annualTotal = businessPlan.annualCosts.reduce(
    (a, c) => ({ low: a.low + c.low, high: a.high + c.high }),
    { low: 0, high: 0 }
  );

  function downloadPlanPdf() {
    const body = businessPlan.sections.map((s) => `${s.title}\n${"=".repeat(s.title.length)}\n${s.body.join("\n")}`).join("\n\n");
    return renderTextPdf(businessPlan.title, body);
  }

  function downloadDoc(d: GeneratedDocument) {
    return renderTextPdf(d.title, d.body);
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8 sm:py-12">
        <Link href="/build" data-testid="link-back-build">
          <button className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to questionnaire
          </button>
        </Link>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground" data-testid="text-results-title">
          {businessPlan.title}
        </h1>
        <p className="mt-1 text-muted-foreground">{businessPlan.subtitle}</p>
        <p className="mt-1 text-xs text-muted-foreground">Generated {businessPlan.generatedAt}</p>
        <div className="mt-5 flex gap-3 rounded-xl border border-border bg-muted/40 p-4" role="note">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">Not legal advice:</span> {DISCLAIMER}
          </p>
        </div>

        <Tabs defaultValue="plan" className="mt-8">
          <TabsList data-testid="tabs-results">
            <TabsTrigger value="plan" data-testid="tab-plan">Business Plan</TabsTrigger>
            <TabsTrigger value="docs" data-testid="tab-docs">Documents ({documents.length})</TabsTrigger>
          </TabsList>

          {/* ---- Business Plan ---- */}
          <TabsContent value="plan" className="mt-6 space-y-6">
            <div className="flex justify-end">
              <Button
                className="gap-2"
                onClick={() => withBusy("plan", downloadPlanPdf)}
                disabled={busy === "plan"}
                data-testid="button-download-plan"
              >
                {busy === "plan" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Download Plan PDF
              </Button>
            </div>

            {businessPlan.sections.map((s) => (
              <section key={s.id} className="rounded-xl border border-card-border bg-card p-6" data-testid={`section-${s.id}`}>
                <h2 className="font-serif text-lg font-semibold text-primary">{s.title}</h2>
                <div className="mt-3 space-y-0.5">{s.body.map(renderBodyLine)}</div>
              </section>
            ))}

            {/* Cost tables */}
            <section className="rounded-xl border border-card-border bg-card p-6" data-testid="section-costs">
              <h2 className="font-serif text-lg font-semibold text-primary">Cost Summary</h2>
              <div className="mt-4 grid gap-6 sm:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-foreground">Setup (one-time)</h3>
                  <table className="w-full text-sm">
                    <tbody>
                      {businessPlan.setupCosts.map((c, i) => (
                        <tr key={i} className="border-b border-border/60 last:border-0">
                          <td className="py-1.5 pr-2 text-muted-foreground">{c.item}</td>
                          <td className="py-1.5 text-right font-medium">{c.low === c.high ? fmtUSD(c.low) : `${fmtUSD(c.low)}–${fmtUSD(c.high)}`}</td>
                        </tr>
                      ))}
                      <tr className="font-semibold">
                        <td className="pt-2">Total</td>
                        <td className="pt-2 text-right">{fmtUSD(setupTotal.low)}–{fmtUSD(setupTotal.high)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-foreground">Annual (recurring)</h3>
                  <table className="w-full text-sm">
                    <tbody>
                      {businessPlan.annualCosts.map((c, i) => (
                        <tr key={i} className="border-b border-border/60 last:border-0">
                          <td className="py-1.5 pr-2 text-muted-foreground">{c.item}</td>
                          <td className="py-1.5 text-right font-medium">{c.low === c.high ? fmtUSD(c.low) : `${fmtUSD(c.low)}–${fmtUSD(c.high)}`}</td>
                        </tr>
                      ))}
                      <tr className="font-semibold">
                        <td className="pt-2">Total</td>
                        <td className="pt-2 text-right">{fmtUSD(annualTotal.low)}–{fmtUSD(annualTotal.high)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* Outstanding items */}
            {businessPlan.outstandingItems.length > 0 && (
              <section className="rounded-xl border border-card-border bg-card p-6" data-testid="section-outstanding">
                <h2 className="font-serif text-lg font-semibold text-primary">Outstanding Items</h2>
                <ul className="mt-3 space-y-3">
                  {businessPlan.outstandingItems.map((o, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                      <span>
                        <span className="font-medium text-foreground">{o.item}.</span>{" "}
                        <span className="text-muted-foreground">{o.action}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </TabsContent>

          {/* ---- Documents ---- */}
          <TabsContent value="docs" className="mt-6 space-y-6">
            <div className="flex justify-end">
              <Button
                className="gap-2"
                onClick={() => withBusy("booklet", () => renderBooklet(plan, businessPlan, documents))}
                disabled={busy === "booklet"}
                data-testid="button-download-booklet"
              >
                {busy === "booklet" ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
                Download All-in-One Booklet PDF
              </Button>
            </div>

            <div className="space-y-3">
              {documents.map((d, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-4 rounded-lg border border-card-border bg-card p-4"
                  data-testid={`doc-row-${i}`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <FileText className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground" data-testid={`doc-title-${i}`}>{d.title}</p>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{d.kind.replace(/_/g, " ")}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1.5"
                    onClick={() => withBusy(`doc-${i}`, () => downloadDoc(d))}
                    disabled={busy === `doc-${i}`}
                    data-testid={`button-download-doc-${i}`}
                  >
                    {busy === `doc-${i}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    PDF
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
