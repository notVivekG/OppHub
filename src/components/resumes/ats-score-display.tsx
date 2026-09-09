'use client';

import * as React from 'react';
import { AtsAnalysisResult } from '@/types';
import { CheckCircle2, AlertTriangle, Info, Zap, Sparkles, FileText, Check, Hash } from 'lucide-react';

interface AtsScoreDisplayProps {
  analysis: AtsAnalysisResult;
  hasJobDescription: boolean;
}

export function AtsScoreDisplay({ analysis, hasJobDescription }: AtsScoreDisplayProps) {
  const { totalScore, categories, keywordAnalysis, wordCount, actionVerbsFound, quantifiedCount } = analysis;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
    if (score >= 65) return 'text-indigo-400 border-indigo-500/40 bg-indigo-500/10';
    if (score >= 50) return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/40 bg-rose-500/10';
  };

  const getScoreGrade = (score: number) => {
    if (score >= 85) return 'Excellent ATS Fit';
    if (score >= 70) return 'Good Pass Rate';
    if (score >= 55) return 'Needs Polish';
    return 'High Risk of Rejection';
  };

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="p-4 rounded-xl border border-border bg-card/60 flex items-center justify-between">
        <div>
          <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
            ATS Quick-Score (Client-Side)
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Deterministic structure, verb density, and format heuristics
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-right">
            <div className="text-xs font-semibold text-foreground">{getScoreGrade(totalScore)}</div>
            <div className="text-[11px] text-muted-foreground">{wordCount} total words</div>
          </div>
          <div
            className={`w-14 h-14 rounded-xl border flex flex-col items-center justify-center font-bold font-mono ${getScoreColor(
              totalScore
            )}`}
          >
            <span className="text-xl leading-none">{totalScore}</span>
            <span className="text-[9px] opacity-70">/ 100</span>
          </div>
        </div>
      </div>

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-2.5 rounded-lg border border-border/80 bg-background/50 text-center">
          <div className="text-[10px] text-muted-foreground">Action Verbs</div>
          <div className="text-sm font-bold font-mono text-indigo-400 mt-0.5">
            {actionVerbsFound.length} <span className="text-[10px] text-muted-foreground font-normal">distinct</span>
          </div>
        </div>
        <div className="p-2.5 rounded-lg border border-border/80 bg-background/50 text-center">
          <div className="text-[10px] text-muted-foreground">Quantified Metrics</div>
          <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
            {quantifiedCount} <span className="text-[10px] text-muted-foreground font-normal">found</span>
          </div>
        </div>
        <div className="p-2.5 rounded-lg border border-border/80 bg-background/50 text-center">
          <div className="text-[10px] text-muted-foreground">JD Keyword Match</div>
          <div className="text-sm font-bold font-mono text-cyan-400 mt-0.5">
            {keywordAnalysis ? `${keywordAnalysis.pct}%` : '—'}
          </div>
        </div>
      </div>

      {/* Category Progress Bars */}
      <div className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
        <div className="text-xs font-semibold text-foreground">Section & Parsing Checks</div>
        <div className="space-y-2.5">
          {categories.map((cat) => {
            const pct = Math.round((cat.score / cat.max) * 100);
            return (
              <div key={cat.key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{cat.key}</span>
                  <span className="font-mono text-[11px] text-foreground font-medium">
                    {cat.score} / {cat.max}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      pct >= 80 ? 'bg-emerald-400' : pct >= 50 ? 'bg-indigo-400' : 'bg-rose-400'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Keyword Match Section */}
      {keywordAnalysis ? (
        <div className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-foreground">Job Description Keywords</div>
            <span className="text-[11px] font-mono text-cyan-400 font-semibold">
              {keywordAnalysis.hit.length} matched / {keywordAnalysis.hit.length + keywordAnalysis.miss.length} top terms
            </span>
          </div>

          {/* Matched Keywords */}
          {keywordAnalysis.hit.length > 0 && (
            <div>
              <div className="text-[11px] text-emerald-400 font-medium mb-1.5 flex items-center space-x-1">
                <Check className="w-3 h-3" />
                <span>Found in Resume ({keywordAnalysis.hit.length})</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {keywordAnalysis.hit.map((kw) => (
                  <span
                    key={kw}
                    className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Missing Keywords */}
          {keywordAnalysis.miss.length > 0 && (
            <div className="pt-2 border-t border-border/50">
              <div className="text-[11px] text-amber-400 font-medium mb-1.5 flex items-center space-x-1">
                <AlertTriangle className="w-3 h-3" />
                <span>Missing from Resume ({keywordAnalysis.miss.length})</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {keywordAnalysis.miss.map((kw) => (
                  <span
                    key={kw}
                    className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-3 rounded-lg border border-dashed border-border bg-muted/20 text-center text-xs text-muted-foreground">
          Paste a Job Description on the right to compare keyword density in real-time.
        </div>
      )}

      {/* Actionable ATS Tips Checklist */}
      {categories.some((c) => c.tips.length > 0) && (
        <div className="rounded-xl border border-border bg-card/40 p-4 space-y-2">
          <div className="text-xs font-semibold text-foreground">Actionable Improvement Tips</div>
          <div className="space-y-1.5">
            {categories.flatMap((cat) =>
              cat.tips.map((tip, idx) => (
                <div
                  key={`${cat.key}-${idx}`}
                  className="flex items-start space-x-2 p-2 rounded-lg bg-background/60 border border-border/60 text-[11px]"
                >
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider flex-shrink-0 mt-0.5 ${
                      tip.priority === 'hi'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : tip.priority === 'me'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    }`}
                  >
                    {tip.priority === 'hi' ? 'Fix' : tip.priority === 'me' ? 'Warn' : 'Tip'}
                  </span>
                  <span className="text-muted-foreground leading-relaxed">{tip.text}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
