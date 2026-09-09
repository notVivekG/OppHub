'use client';

import * as React from 'react';
import Link from 'next/link';
import { BarChart3, ArrowLeft, Globe, UserCheck, Loader2 } from 'lucide-react';
import { Opportunity, Application, ResumeVersion } from '@/types';
import { MarketInsights } from '@/components/analytics/market-insights';
import { ProgressAnalytics } from '@/components/analytics/progress-analytics';

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = React.useState<'market' | 'progress'>('market');
  const [loading, setLoading] = React.useState(true);

  // Data states
  const [opportunities, setOpportunities] = React.useState<Opportunity[]>([]);
  const [applications, setApplications] = React.useState<Application[]>([]);
  const [resumeVersions, setResumeVersions] = React.useState<ResumeVersion[]>([]);
  const [isDemo, setIsDemo] = React.useState(false);

  React.useEffect(() => {
    async function loadData() {
      setLoading(true);

      // 1. Fetch Opportunities
      try {
        const oppRes = await fetch('/api/opportunities?sort=discovered');
        if (oppRes.ok) {
          const oppData = await oppRes.json();
          if (oppData.opportunities) {
            setOpportunities(oppData.opportunities);
            setIsDemo(oppData.isDemo ?? false);
          }
        }
      } catch (err) {
        console.warn('Failed to load opportunities for analytics:', err);
      }

      // 2. Fetch Applications
      try {
        const appRes = await fetch('/api/applications');
        if (appRes.ok) {
          const appData = await appRes.json();
          if (appData.applications && appData.applications.length > 0) {
            setApplications(appData.applications);
          } else {
            // LocalStorage fallback
            const savedApps = localStorage.getItem('opphub-applications');
            if (savedApps) {
              setApplications(JSON.parse(savedApps));
            }
          }
        }
      } catch (err) {
        const savedApps = localStorage.getItem('opphub-applications');
        if (savedApps) {
          try {
            setApplications(JSON.parse(savedApps));
          } catch {}
        }
      }

      // 3. Fetch Resume Versions
      try {
        const resRes = await fetch('/api/resumes');
        if (resRes.ok) {
          const resData = await resRes.json();
          if (resData.resumes) {
            setResumeVersions(resData.resumes);
          }
        }
      } catch (err) {
        const savedRes = localStorage.getItem('opphub-resume-versions');
        if (savedRes) {
          try {
            setResumeVersions(JSON.parse(savedRes));
          } catch {}
        }
      }

      setLoading(false);
    }

    loadData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Analytics Hub
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Phase 3 Active
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Strictly segregated views: aggregate industry market intelligence vs. personal pipeline performance.
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

      {/* Dual Tab Switcher with Visual Segregation */}
      <div className="flex items-center space-x-2 border-b border-border/80 pb-2">
        <button
          onClick={() => setActiveTab('market')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'market'
              ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
          }`}
        >
          <Globe className="w-4 h-4 text-cyan-400" />
          <span>Market Insights (Aggregate Market Data)</span>
        </button>

        <button
          onClick={() => setActiveTab('progress')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'progress'
              ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30 shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
          }`}
        >
          <UserCheck className="w-4 h-4 text-purple-400" />
          <span>My Progress (Personal Funnel)</span>
        </button>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="h-64 rounded-xl border border-border bg-card/40 flex items-center justify-center space-x-2 text-muted-foreground text-xs">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span>Loading Analytics Data...</span>
        </div>
      ) : activeTab === 'market' ? (
        <MarketInsights opportunities={opportunities} isDemo={isDemo} />
      ) : (
        <ProgressAnalytics applications={applications} resumeVersions={resumeVersions} />
      )}
    </div>
  );
}
