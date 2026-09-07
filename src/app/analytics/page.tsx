'use client';

import * as React from 'react';
import Link from 'next/link';
import { BarChart3, ArrowLeft, Globe, UserCheck, TrendingUp, Calendar, Zap } from 'lucide-react';

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = React.useState<'market' | 'progress'>('market');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Analytics Hub
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Phase 3 Preview
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Strictly segregated views: aggregate market data vs. your personal application funnel.
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

      {/* Dual Tab Switcher with Visual Separation */}
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
          <span>Market Insights (Aggregate Data)</span>
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
          <span>My Progress (Personal Pipeline)</span>
        </button>
      </div>

      {/* Tab Contents Preview */}
      {activeTab === 'market' ? (
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/5 p-6 space-y-4">
          <div className="flex items-center space-x-2 text-cyan-400 font-semibold text-sm">
            <Globe className="w-4 h-4" />
            <span>Market Dynamics & Industry Postings</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Market Insights provides aggregate industry intelligence: weekly internship volume, trending keywords across job descriptions, deadline distributions, and hackathon heatmaps.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-lg border border-cyan-500/20 bg-card/60">
              <div className="text-[11px] text-cyan-400 font-medium">Trending Keyword</div>
              <div className="text-base font-bold text-foreground mt-1">AI / ML (+42%)</div>
            </div>
            <div className="p-4 rounded-lg border border-cyan-500/20 bg-card/60">
              <div className="text-[11px] text-cyan-400 font-medium">Total Open Roles</div>
              <div className="text-base font-bold text-foreground mt-1">1,180+ Tracked</div>
            </div>
            <div className="p-4 rounded-lg border border-cyan-500/20 bg-card/60">
              <div className="text-[11px] text-cyan-400 font-medium">Deadlines in &lt;14 Days</div>
              <div className="text-base font-bold text-foreground mt-1">38 Listings</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-purple-500/20 bg-purple-950/5 p-6 space-y-4">
          <div className="flex items-center space-x-2 text-purple-400 font-semibold text-sm">
            <UserCheck className="w-4 h-4" />
            <span>Personal Application Performance</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            My Progress focuses solely on your personal funnel: response rates by resume version, conversion from applied to OA to interview, and upcoming follow-ups.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-lg border border-purple-500/20 bg-card/60">
              <div className="text-[11px] text-purple-400 font-medium">Applications Logged</div>
              <div className="text-base font-bold text-foreground mt-1">Ready in Phase 2</div>
            </div>
            <div className="p-4 rounded-lg border border-purple-500/20 bg-card/60">
              <div className="text-[11px] text-purple-400 font-medium">Funnel Conversion</div>
              <div className="text-base font-bold text-foreground mt-1">Live in Phase 3</div>
            </div>
            <div className="p-4 rounded-lg border border-purple-500/20 bg-card/60">
              <div className="text-[11px] text-purple-400 font-medium">Best Resume Variant</div>
              <div className="text-base font-bold text-foreground mt-1">Base vs AI-ML</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
