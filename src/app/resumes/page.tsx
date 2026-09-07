import Link from 'next/link';
import { FileText, ArrowLeft, Sparkles, CheckCircle } from 'lucide-react';

export default function ResumesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Resume Workspace & Tailoring Engine
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Phase 3 Preview
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Standard JSON Resume schemas, client-side ATS checks, and Gemini/Groq LLM tailoring.
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-card/80 text-xs font-medium text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Feed</span>
        </Link>
      </div>

      <div className="rounded-xl border border-dashed border-border bg-card/40 p-8 text-center max-w-xl mx-auto space-y-4">
        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
          <FileText className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-foreground">Scheduled for Phase 3</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          In Phase 3, you will be able to store base/backend/AI-ML resume variants in JSON Resume schema, run instant ATS checks using our port of <code className="text-foreground font-mono">ats-checker</code>, and generate tailored bullet suggestions without hallucinated experience.
        </p>
      </div>
    </div>
  );
}
