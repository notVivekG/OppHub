'use client';

import * as React from 'react';
import Link from 'next/link';
import { 
  FileText, 
  ArrowLeft, 
  Sparkles, 
  Check, 
  Plus, 
  Copy, 
  Trash2, 
  Save, 
  Send, 
  AlertCircle,
  Clock,
  Briefcase,
  Zap,
  CheckCircle2,
  FileDown
} from 'lucide-react';
import { JsonResume, ResumeVersion, AtsAnalysisResult, TailorResponse } from '@/types';
import { ResumeEditor } from '@/components/resumes/resume-editor';
import { AtsScoreDisplay } from '@/components/resumes/ats-score-display';
import { TailoringSuggestions } from '@/components/resumes/tailoring-suggestions';
import { ResumePdfButton } from '@/components/resumes/resume-pdf-button';
import { analyzeResumeAts, jsonResumeToPlainText } from '@/lib/ats-score';

export default function ResumesPage() {
  const [resumes, setResumes] = React.useState<ResumeVersion[]>([]);
  const [activeId, setActiveId] = React.useState<string>('');
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);

  // Job description & tailoring state
  const [jobDescription, setJobDescription] = React.useState('');
  const [rightPanelTab, setRightPanelTab] = React.useState<'ats' | 'tailor'>('ats');

  // AI Tailoring state
  const [tailoring, setTailoring] = React.useState(false);
  const [tailorCooldown, setTailorCooldown] = React.useState(0);
  const [tailorResult, setTailorResult] = React.useState<TailorResponse | null>(null);
  const [tailorError, setTailorError] = React.useState<string | null>(null);
  const isTailoringRef = React.useRef(false);

  // Load resumes from API / local storage
  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/resumes');
        if (res.ok) {
          const data = await res.json();
          if (data.resumes && data.resumes.length > 0) {
            setResumes(data.resumes);
            setActiveId(data.resumes[0].id);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Loading resumes failed:', err);
      }

      // Check localStorage
      const saved = localStorage.getItem('opphub-resume-versions');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.length > 0) {
            setResumes(parsed);
            setActiveId(parsed[0].id);
            setLoading(false);
            return;
          }
        } catch {}
      }
      setLoading(false);
    }

    load();
  }, []);

  // Cooldown countdown timer
  React.useEffect(() => {
    if (tailorCooldown <= 0) return;
    const interval = setInterval(() => {
      setTailorCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [tailorCooldown]);

  const activeResume = resumes.find((r) => r.id === activeId) || resumes[0];

  // Instant client-side ATS analysis (recalculates whenever active resume or JD changes, zero network call)
  const atsAnalysis = React.useMemo(() => {
    if (!activeResume) return null;
    const plainText = jsonResumeToPlainText(activeResume.json_resume);
    return analyzeResumeAts(plainText, jobDescription);
  }, [activeResume, jobDescription]);

  // Update active resume content
  const handleResumeContentChange = (updatedContent: JsonResume) => {
    setResumes((prev) =>
      prev.map((r) =>
        r.id === activeId ? { ...r, json_resume: updatedContent, updated_at: new Date().toISOString() } : r
      )
    );
  };

  // Save current resume variant
  const handleSaveActiveResume = async () => {
    if (!activeResume || saving) return;
    setSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/resumes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeResume.id,
          label: activeResume.label,
          json_resume: activeResume.json_resume,
        }),
      });

      // Also persist to localStorage for offline reliability
      localStorage.setItem('opphub-resume-versions', JSON.stringify(resumes));

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  // Create new variant
  const handleCreateVariant = () => {
    const label = prompt('Enter a label for the new resume variant (e.g., fullstack, data-infra):');
    if (!label || !label.trim()) return;

    const newVariant: ResumeVersion = {
      id: `res-${Date.now()}`,
      label: label.trim().toLowerCase(),
      json_resume: activeResume ? JSON.parse(JSON.stringify(activeResume.json_resume)) : {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updated = [newVariant, ...resumes];
    setResumes(updated);
    setActiveId(newVariant.id);
    localStorage.setItem('opphub-resume-versions', JSON.stringify(updated));

    fetch('/api/resumes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: newVariant.label, json_resume: newVariant.json_resume }),
    }).catch(() => {});
  };

  // Duplicate current variant
  const handleDuplicateVariant = () => {
    if (!activeResume) return;
    const label = prompt('Enter label for duplicated variant:', `${activeResume.label}-copy`);
    if (!label || !label.trim()) return;

    const duplicate: ResumeVersion = {
      id: `res-${Date.now()}`,
      label: label.trim().toLowerCase(),
      json_resume: JSON.parse(JSON.stringify(activeResume.json_resume)),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updated = [...resumes, duplicate];
    setResumes(updated);
    setActiveId(duplicate.id);
    localStorage.setItem('opphub-resume-versions', JSON.stringify(updated));

    fetch('/api/resumes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: duplicate.label, json_resume: duplicate.json_resume }),
    }).catch(() => {});
  };

  // Delete current variant
  const handleDeleteVariant = () => {
    if (!activeResume) return;
    if (resumes.length <= 1) {
      alert('Cannot delete the last remaining resume variant.');
      return;
    }

    if (!confirm(`Are you sure you want to delete the "${activeResume.label}" resume variant?`)) {
      return;
    }

    const nextList = resumes.filter((r) => r.id !== activeResume.id);
    setResumes(nextList);
    setActiveId(nextList[0].id);
    localStorage.setItem('opphub-resume-versions', JSON.stringify(nextList));

    fetch(`/api/resumes?id=${activeResume.id}`, { method: 'DELETE' }).catch(() => {});
  };

  // AI Tailoring dispatch with synchronous click-protection & cooldown
  const handleGenerateTailoring = async () => {
    if (isTailoringRef.current || tailoring || tailorCooldown > 0 || !activeResume) {
      return;
    }

    if (!jobDescription.trim() || jobDescription.trim().length < 30) {
      setTailorError('Please paste a substantive Job Description (at least 30 characters) to analyze.');
      return;
    }

    isTailoringRef.current = true;
    setTailoring(true);
    setTailorError(null);
    setRightPanelTab('tailor');

    try {
      const res = await fetch('/api/resume/tailor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeVariantId: activeResume.id,
          resumeJson: activeResume.json_resume,
          jobDescription: jobDescription.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setTailorResult({
          matchScore: data.matchScore,
          missingKeywords: data.missingKeywords || [],
          suggestedRewrites: data.suggestedRewrites || [],
          gaps: data.gaps || [],
        });
        setTailorCooldown(10); // 10s cooldown to protect free-tier LLM quota
      } else if (res.status === 429 || data.retryAfter) {
        const wait = Number(data.retryAfter) || 15;
        setTailorCooldown(wait);
        setTailorError(`LLM rate limit active. Please wait ${wait}s before retrying.`);
      } else {
        setTailorError(data.error || 'Failed to tailor resume. Verify API key in .env.local.');
      }
    } catch (err: any) {
      setTailorError(err.message || 'Network error while contacting tailoring engine.');
    } finally {
      isTailoringRef.current = false;
      setTailoring(false);
    }
  };

  // Accept a single suggested bullet rewrite into active resume
  const handleAcceptRewrite = (originalBullet: string, suggestedBullet: string) => {
    if (!activeResume) return;

    let modified = false;
    const resumeCopy: JsonResume = JSON.parse(JSON.stringify(activeResume.json_resume));

    // Check work highlights
    if (resumeCopy.work) {
      for (const job of resumeCopy.work) {
        if (job.highlights) {
          const idx = job.highlights.indexOf(originalBullet);
          if (idx !== -1) {
            job.highlights[idx] = suggestedBullet;
            modified = true;
            break;
          }
        }
      }
    }

    // Check project highlights if not found in work
    if (!modified && resumeCopy.projects) {
      for (const proj of resumeCopy.projects) {
        if (proj.highlights) {
          const idx = proj.highlights.indexOf(originalBullet);
          if (idx !== -1) {
            proj.highlights[idx] = suggestedBullet;
            modified = true;
            break;
          }
        }
      }
    }

    if (modified) {
      handleResumeContentChange(resumeCopy);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Resume Workspace & Tailoring Engine
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Phase 3 Active
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Standard JSON Resume variants, deterministic client-side ATS checks, and strict zero-hallucination AI tailoring.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            href="/"
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-card/80 text-xs font-medium text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Feed</span>
          </Link>
        </div>
      </div>

      {/* Variant Selector Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-card/70 backdrop-blur-sm shadow-sm">
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap mr-1">
            Variants:
          </span>
          {resumes.map((variant) => (
            <button
              key={variant.id}
              onClick={() => setActiveId(variant.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all whitespace-nowrap flex items-center space-x-1.5 ${
                activeId === variant.id
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                  : 'bg-muted/80 text-muted-foreground border border-border/70 hover:text-foreground'
              }`}
            >
              <FileText className="w-3 h-3" />
              <span>{variant.label}</span>
            </button>
          ))}

          <button
            onClick={handleCreateVariant}
            className="px-2.5 py-1.5 rounded-lg border border-dashed border-border text-muted-foreground hover:text-foreground text-xs font-medium flex items-center space-x-1 transition-colors whitespace-nowrap"
            title="Create new empty resume variant"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Variant</span>
          </button>
        </div>

        {/* Variant Actions */}
        {activeResume && (
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleDuplicateVariant}
              className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Duplicate this variant"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleDeleteVariant}
              disabled={resumes.length <= 1}
              className="p-1.5 rounded-lg border border-border bg-card hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 transition-colors disabled:opacity-40"
              title="Delete this variant"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            <ResumePdfButton resume={activeResume.json_resume} label={activeResume.label} />

            <button
              type="button"
              onClick={handleSaveActiveResume}
              disabled={saving}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Main Workspace Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Structured JSON Resume Editor (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-semibold text-foreground">
                Editing: <span className="font-mono text-indigo-300">"{activeResume?.label}"</span>
              </h2>
            </div>
            <span className="text-[11px] text-muted-foreground">JSON Resume Standard Schema</span>
          </div>

          {activeResume && (
            <ResumeEditor
              resume={activeResume.json_resume}
              onChange={handleResumeContentChange}
            />
          )}
        </div>

        {/* Right Column: ATS Quick-Score & AI Tailoring (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Job Description Target Input */}
          <div className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-foreground flex items-center space-x-1.5">
                <Briefcase className="w-3.5 h-3.5 text-cyan-400" />
                <span>Target Job Description</span>
              </div>
              <span className="text-[11px] text-muted-foreground font-mono">
                {jobDescription.length} chars
              </span>
            </div>

            <textarea
              rows={4}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste job description text here (e.g. responsibilities, requirements, qualifications)..."
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 leading-relaxed font-sans"
            />

            {/* AI Tailoring Action Button */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1 border-t border-border/50">
              <button
                type="button"
                onClick={handleGenerateTailoring}
                disabled={tailoring || tailorCooldown > 0 || jobDescription.trim().length < 30}
                className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-semibold shadow transition-all disabled:opacity-75 disabled:cursor-not-allowed disabled:from-muted disabled:to-muted disabled:text-muted-foreground disabled:border disabled:border-border"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {tailoring
                    ? 'Analyzing with LLM...'
                    : tailorCooldown > 0
                    ? `Cooldown Active (${tailorCooldown}s)`
                    : 'Generate AI Tailoring'}
                </span>
              </button>

              <span className="text-[10px] text-muted-foreground text-center sm:text-right">
                Free-Tier Gemini / Groq Adapter
              </span>
            </div>

            {tailorError && (
              <div className="flex items-center space-x-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{tailorError}</span>
              </div>
            )}
          </div>

          {/* Right Panel Sub-Tabs */}
          <div className="flex items-center space-x-2 border-b border-border/60 pb-1">
            <button
              onClick={() => setRightPanelTab('ats')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                rightPanelTab === 'ats'
                  ? 'bg-muted text-foreground border border-border/80'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Client-Side ATS Score</span>
            </button>

            <button
              onClick={() => setRightPanelTab('tailor')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                rightPanelTab === 'tailor'
                  ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>AI Tailoring & Gaps {tailorResult && `(${tailorResult.suggestedRewrites.length})`}</span>
            </button>
          </div>

          {/* Right Panel Content */}
          {rightPanelTab === 'ats' ? (
            atsAnalysis ? (
              <AtsScoreDisplay
                analysis={atsAnalysis}
                hasJobDescription={jobDescription.trim().length > 30}
              />
            ) : null
          ) : tailorResult ? (
            <TailoringSuggestions
              tailorData={tailorResult}
              onAcceptRewrite={handleAcceptRewrite}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-card/30 p-8 text-center space-y-2">
              <Sparkles className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
              <div className="text-xs font-semibold text-foreground">No Tailoring Run Yet</div>
              <p className="text-[11px] text-muted-foreground max-w-xs mx-auto leading-relaxed">
                Paste a job description above and click "Generate AI Tailoring" to run our zero-hallucination rewrite engine.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
