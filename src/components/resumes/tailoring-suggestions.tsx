'use client';

import * as React from 'react';
import { TailorResponse } from '@/types';
import { 
  AlertCircle, 
  Check, 
  Sparkles, 
  ArrowRight, 
  ShieldAlert, 
  Tag, 
  CheckCircle2, 
  FileEdit,
  Flame
} from 'lucide-react';

interface TailoringSuggestionsProps {
  tailorData: TailorResponse;
  onAcceptRewrite: (originalBullet: string, suggestedBullet: string) => void;
}

export function TailoringSuggestions({ tailorData, onAcceptRewrite }: TailoringSuggestionsProps) {
  const [acceptedBullets, setAcceptedBullets] = React.useState<Set<string>>(new Set());

  const handleAccept = (original: string, suggested: string) => {
    onAcceptRewrite(original, suggested);
    setAcceptedBullets((prev) => new Set(prev).add(original));
  };

  const { matchScore, missingKeywords = [], suggestedRewrites = [], gaps = [] } = tailorData;

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Top Summary Banner */}
      <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-semibold text-foreground">AI Tailoring Analysis Complete</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Strict anti-hallucination mode: verified against your existing bullets only.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-muted-foreground">Match Rating:</span>
          <span className="px-2.5 py-1 rounded-lg text-sm font-bold font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
            {matchScore} / 100
          </span>
        </div>
      </div>

      {/* Identified Gaps Section — Hard Requirement */}
      {gaps.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
          <div className="flex items-start space-x-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold text-amber-300">
                Identified Experience & Skill Gaps ({gaps.length})
              </h4>
              <p className="text-[11px] text-amber-200/80 mt-0.5 leading-relaxed">
                The job description requests the qualifications below, but they are <strong>not evidenced</strong> anywhere in your resume. To prevent fabrication, they have not been added to your bullets. Address them directly if you possess this experience.
              </p>
            </div>
          </div>

          <div className="space-y-1.5 pl-6">
            {gaps.map((gap, idx) => (
              <div
                key={idx}
                className="text-[11px] text-amber-100 bg-amber-950/40 border border-amber-500/20 rounded-lg p-2.5 leading-relaxed flex items-start space-x-2"
              >
                <span className="text-amber-400 font-bold">•</span>
                <span>{gap}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Missing Keywords Chips */}
      {missingKeywords.length > 0 && (
        <div className="rounded-xl border border-border bg-card/40 p-4 space-y-2">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-foreground">
            <Tag className="w-3.5 h-3.5 text-rose-400" />
            <span>Missing Target Keywords ({missingKeywords.length})</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Frequently cited in the job description but absent from your active resume variant.
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {missingKeywords.map((kw) => (
              <span
                key={kw}
                className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/10 text-rose-300 border border-rose-500/20"
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Rewrites — Individual Acceptance Only */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-semibold text-foreground flex items-center space-x-1.5">
              <FileEdit className="w-3.5 h-3.5 text-indigo-400" />
              <span>Targeted Bullet Rewrites ({suggestedRewrites.length})</span>
            </h4>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Review and explicitly accept suggestions one bullet at a time. No bulk overwrite.
            </p>
          </div>
          <span className="text-[11px] text-muted-foreground font-mono">
            {acceptedBullets.size} of {suggestedRewrites.length} accepted
          </span>
        </div>

        {suggestedRewrites.length === 0 ? (
          <div className="p-4 rounded-xl border border-border bg-card/30 text-center text-xs text-muted-foreground">
            No bullet rewrites suggested. Your bullets already align well with the target terms.
          </div>
        ) : (
          <div className="space-y-3">
            {suggestedRewrites.map((rewrite, idx) => {
              const isAccepted = acceptedBullets.has(rewrite.originalBullet);

              return (
                <div
                  key={idx}
                  className={`rounded-xl border transition-all p-4 space-y-3 ${
                    isAccepted
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : 'border-border bg-card/60 hover:border-border/90'
                  }`}
                >
                  {/* Keywords Addressed */}
                  {rewrite.jdKeywordsAddressed && rewrite.jdKeywordsAddressed.length > 0 && (
                    <div className="flex items-center space-x-1.5 text-[10px]">
                      <span className="text-muted-foreground font-medium">JD terms emphasized:</span>
                      <div className="flex flex-wrap gap-1">
                        {rewrite.jdKeywordsAddressed.map((k) => (
                          <span
                            key={k}
                            className="px-1.5 py-0.2 rounded font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                          >
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Original Bullet */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">
                      Original Bullet:
                    </span>
                    <p className="text-xs text-muted-foreground line-through bg-muted/30 p-2.5 rounded-lg leading-relaxed">
                      {rewrite.originalBullet}
                    </p>
                  </div>

                  {/* Suggested Bullet */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider block flex items-center space-x-1">
                      <Sparkles className="w-3 h-3" />
                      <span>Suggested Tailored Bullet:</span>
                    </span>
                    <p className="text-xs text-foreground bg-indigo-500/5 border border-indigo-500/20 p-2.5 rounded-lg leading-relaxed font-medium">
                      {rewrite.suggestedBullet}
                    </p>
                  </div>

                  {/* Accept Action Button */}
                  <div className="flex items-center justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => handleAccept(rewrite.originalBullet, rewrite.suggestedBullet)}
                      disabled={isAccepted}
                      className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        isAccepted
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 cursor-default'
                          : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm'
                      }`}
                    >
                      {isAccepted ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Accepted into Resume ✓</span>
                        </>
                      ) : (
                        <>
                          <span>Accept Bullet Suggestion</span>
                          <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
