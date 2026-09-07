'use client';

import * as React from 'react';
import { 
  Search, 
  Filter, 
  ExternalLink, 
  Bookmark, 
  BookmarkCheck, 
  LayoutGrid, 
  List, 
  Sparkles, 
  Clock, 
  MapPin, 
  Building2, 
  DollarSign, 
  Terminal, 
  Code2, 
  CheckCircle2, 
  Info, 
  AlertCircle 
} from 'lucide-react';
import { Opportunity, OpportunityType } from '@/types';
import { formatDate, getDaysRemaining } from '@/lib/utils';
import confetti from 'canvas-confetti';

interface FeedResponse {
  opportunities: (Opportunity & { isDemo?: boolean })[];
  count: number;
  isDemo: boolean;
}

export function OpportunityFeed() {
  const [data, setData] = React.useState<FeedResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedType, setSelectedType] = React.useState<string>('all');
  const [remoteOnly, setRemoteOnly] = React.useState(false);
  const [sortBy, setSortBy] = React.useState<'discovered' | 'priority' | 'deadline'>('discovered');
  const [viewMode, setViewMode] = React.useState<'table' | 'grid'>('grid');
  const [savedIds, setSavedIds] = React.useState<Set<string>>(new Set());
  const [trackedIds, setTrackedIds] = React.useState<Set<string>>(new Set());
  const [trackedMessage, setTrackedMessage] = React.useState<string | null>(null);

  // Fetch opportunities
  const fetchOpportunities = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedType !== 'all') params.set('type', selectedType);
      if (remoteOnly) params.set('remote', 'true');
      if (searchQuery) params.set('q', searchQuery);
      params.set('sort', sortBy);

      const res = await fetch(`/api/opportunities?${params.toString()}`);
      if (res.ok) {
        const json: FeedResponse = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load opportunities:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedType, remoteOnly, searchQuery, sortBy]);

  React.useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  // Load saved / tracked from local storage
  React.useEffect(() => {
    const saved = localStorage.getItem('opphub-saved-opps');
    if (saved) {
      try {
        setSavedIds(new Set(JSON.parse(saved)));
      } catch {}
    }
    const tracked = localStorage.getItem('opphub-applications');
    if (tracked) {
      try {
        const parsed = JSON.parse(tracked);
        setTrackedIds(new Set(parsed.map((a: any) => a.opportunity_id)));
      } catch {}
    }
  }, []);

  const toggleSave = (id: string) => {
    const next = new Set(savedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSavedIds(next);
    localStorage.setItem('opphub-saved-opps', JSON.stringify(Array.from(next)));
  };

  const trackApplication = (opp: Opportunity) => {
    const next = new Set(trackedIds);
    next.add(opp.id);
    setTrackedIds(next);

    // Save to local applications pipeline
    const existing = localStorage.getItem('opphub-applications');
    let apps = existing ? JSON.parse(existing) : [];
    if (!apps.some((a: any) => a.opportunity_id === opp.id)) {
      apps.push({
        id: `app-${Date.now()}`,
        opportunity_id: opp.id,
        status: 'applied',
        date_applied: new Date().toISOString(),
        opportunity: opp,
        updated_at: new Date().toISOString(),
      });
      localStorage.setItem('opphub-applications', JSON.stringify(apps));
    }

    // Confetti celebration
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#6366f1', '#38bdf8', '#a855f7'],
    });

    setTrackedMessage(`Added "${opp.company}" to your Application Tracker!`);
    setTimeout(() => setTrackedMessage(null), 3500);
  };

  const opportunities = data?.opportunities || [];
  const isDemo = data?.isDemo ?? true;

  const getTypeBadge = (type: OpportunityType) => {
    switch (type) {
      case 'internship':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Internship
          </span>
        );
      case 'hackathon':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Hackathon
          </span>
        );
      case 'contribution':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Good First Issue
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {trackedMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2 bg-emerald-950/90 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-lg shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-medium">{trackedMessage}</span>
        </div>
      )}

      {/* Demo Mode Notice Banner */}
      {isDemo && (
        <div className="flex items-center justify-between p-3.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-200">
          <div className="flex items-center space-x-2.5">
            <Info className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <div className="text-xs">
              <span className="font-semibold text-amber-300">Demo Data Active: </span>
              Showing sample opportunities with full filter and search capabilities. Connect your Supabase project in{' '}
              <code className="px-1.5 py-0.5 rounded bg-amber-950/50 text-[11px] font-mono border border-amber-500/30">.env.local</code>{' '}
              or run <code className="px-1.5 py-0.5 rounded bg-amber-950/50 text-[11px] font-mono border border-amber-500/30">npm run ingest:simplify</code> to load live SimplifyJobs listings.
            </div>
          </div>
          <span className="ml-3 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 whitespace-nowrap">
            Demo Mode
          </span>
        </div>
      )}

      {/* Category Pipeline Note */}
      {selectedType === 'hackathon' && (
        <div className="flex items-center space-x-2.5 p-3 rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-200 text-xs">
          <Terminal className="w-4 h-4 text-indigo-400 flex-shrink-0" />
          <div>
            <span className="font-semibold text-indigo-300">⚡ Hackathons Pipeline (Scheduled for Phase 4): </span>
            Automated aggregation from 9 hackathon platforms (Devpost, MLH, Unstop, Devfolio, HackerEarth, etc.) via our adapted <code className="text-indigo-300 font-mono">hackathon-api</code> engine launches in Phase 4. Sample collegiate hackathons are displayed below.
          </div>
        </div>
      )}

      {selectedType === 'contribution' && (
        <div className="flex items-center space-x-2.5 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 text-xs">
          <Code2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <div>
            <span className="font-semibold text-emerald-300">⚡ Good First Issue Radar (Scheduled for Phase 4): </span>
            Live queries against GitHub Search API for open-source beginner issues filtered by your watched languages (TypeScript, Python, Go, Rust) launch in Phase 4. Sample issues are displayed below.
          </div>
        </div>
      )}

      {/* Filter and Control Bar */}
      <div className="bg-card/70 border border-border/80 rounded-xl p-4 shadow-sm backdrop-blur-sm space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by company, title, location, or tech stack (e.g. Python, React)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Filter */}
            <div className="flex items-center bg-muted/60 p-1 rounded-lg border border-border/50 text-xs">
              {['all', 'internship', 'hackathon', 'contribution'].map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-2.5 py-1 rounded-md capitalize font-medium transition-all ${
                    selectedType === type
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {type === 'contribution' ? 'Good First Issue' : type}
                </button>
              ))}
            </div>

            {/* Remote Only Toggle */}
            <button
              onClick={() => setRemoteOnly(!remoteOnly)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                remoteOnly
                  ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-400'
                  : 'bg-background border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>🌐 Remote Only</span>
            </button>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
            >
              <option value="discovered">Newest Discovered</option>
              <option value="priority">Highest Priority</option>
              <option value="deadline">Approaching Deadline</option>
            </select>

            {/* View Toggle */}
            <div className="flex items-center bg-muted/60 p-1 rounded-lg border border-border/50">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-all ${
                  viewMode === 'grid' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md transition-all ${
                  viewMode === 'table' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Dense Table View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Counter summary */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
          <span>
            Showing <strong className="text-foreground">{opportunities.length}</strong> opportunities
          </span>
          <span>
            Sorted by <strong className="text-foreground capitalize">{sortBy}</strong>
          </span>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-44 rounded-xl border border-border bg-card/40 animate-pulse p-4 space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded bg-muted" />
                <div className="space-y-1.5 flex-1">
                  <div className="w-24 h-4 rounded bg-muted" />
                  <div className="w-36 h-3 rounded bg-muted" />
                </div>
              </div>
              <div className="w-full h-8 rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : opportunities.length === 0 ? (
        /* Empty State */
        <div className="py-16 text-center rounded-xl border border-dashed border-border bg-card/30">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
          <h3 className="text-sm font-semibold text-foreground">
            {selectedType === 'hackathon'
              ? 'Live Hackathon Feeds Launching in Phase 4'
              : selectedType === 'contribution'
              ? 'Good First Issue Radar Launching in Phase 4'
              : 'No opportunities match your current filters'}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {selectedType === 'hackathon' || selectedType === 'contribution'
              ? 'Automated scheduled scrapers for this category will be wired in Phase 4. Reset filters to view all active internship postings.'
              : 'Try resetting your search query or toggling non-remote opportunities.'}
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedType('all');
              setRemoteOnly(false);
            }}
            className="mt-4 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-xs font-medium transition-colors"
          >
            Show All Opportunities
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {opportunities.map((opp) => {
            const isSaved = savedIds.has(opp.id);
            const isTracked = trackedIds.has(opp.id);
            const daysLeft = getDaysRemaining(opp.deadline);

            return (
              <div
                key={opp.id}
                className="group relative flex flex-col justify-between rounded-xl border border-border bg-card/80 hover:bg-card hover:border-border/90 hover:shadow-md transition-all p-4 space-y-3"
              >
                {/* Header */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center font-bold text-xs text-indigo-400 flex-shrink-0">
                        {opp.company.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <h4 className="text-xs font-semibold text-foreground truncate">{opp.company}</h4>
                          {opp.isDemo && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              Demo Data
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-[11px] text-muted-foreground">
                          <span>{getTypeBadge(opp.type)}</span>
                          {opp.remote && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium">
                              Remote
                            </span>
                          )}
                          {opp.priority_score !== undefined && opp.priority_score !== null && (
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-bold font-mono ${
                                opp.priority_score >= 80
                                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                  : opp.priority_score >= 65
                                  ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                                  : 'bg-muted text-muted-foreground border border-border'
                              }`}
                              title={`Priority Score: ${opp.priority_score}/100 (composite ranking)`}
                            >
                              🎯 {opp.priority_score}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bookmark action */}
                    <button
                      onClick={() => toggleSave(opp.id)}
                      className={`p-1.5 rounded-md transition-colors ${
                        isSaved
                          ? 'text-indigo-400 hover:text-indigo-300'
                          : 'text-muted-foreground/60 hover:text-muted-foreground'
                      }`}
                      title={isSaved ? 'Remove from saved' : 'Save opportunity'}
                    >
                      {isSaved ? <BookmarkCheck className="w-4 h-4 fill-indigo-400/20" /> : <Bookmark className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Title & snippet */}
                  <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2">
                    {opp.title}
                  </h3>

                  {/* Location & Compensation */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <span className="flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-muted-foreground/70" />
                      <span className="truncate max-w-[180px]">{opp.location || 'Multiple Locations'}</span>
                    </span>
                    {opp.stipend && (
                      <span className="flex items-center space-x-1 text-emerald-400 font-medium">
                        <DollarSign className="w-3 h-3" />
                        <span>{opp.stipend}</span>
                      </span>
                    )}
                  </div>

                  {/* Tech stack chips */}
                  {opp.tech_stack && opp.tech_stack.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {opp.tech_stack.slice(0, 4).map((tech) => (
                        <span
                          key={tech}
                          className="px-1.5 py-0.5 rounded text-[10px] bg-muted/80 text-muted-foreground border border-border/60 font-mono"
                        >
                          {tech}
                        </span>
                      ))}
                      {opp.tech_stack.length > 4 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] text-muted-foreground font-mono">
                          +{opp.tech_stack.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer & Actions */}
                <div className="pt-3 border-t border-border/50 flex items-center justify-between">
                  <div className="text-[10px] text-muted-foreground flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    {daysLeft !== null ? (
                      <span className={daysLeft <= 7 ? 'text-rose-400 font-medium' : ''}>
                        {daysLeft <= 0 ? 'Closes today' : `${daysLeft}d left`}
                      </span>
                    ) : (
                      <span>Added {formatDate(opp.date_discovered)}</span>
                    )}
                  </div>

                  {/* Explicit Plain Outbound Link with No Auto-Submit */}
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => trackApplication(opp)}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                        isTracked
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-muted hover:bg-muted/80 text-foreground border border-border'
                      }`}
                    >
                      {isTracked ? 'Tracked ✓' : 'Track'}
                    </button>

                    <a
                      href={opp.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 px-3 py-1 rounded text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground transition-colors shadow-sm"
                    >
                      <span>Apply</span>
                      <ExternalLink className="w-3 h-3 ml-0.5" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* DENSE TABLE VIEW */
        <div className="rounded-xl border border-border bg-card/90 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground">
                  <th className="py-2.5 px-3 font-semibold">Company</th>
                  <th className="py-2.5 px-3 font-semibold">Role Title</th>
                  <th className="py-2.5 px-3 font-semibold">Type</th>
                  <th className="py-2.5 px-3 font-semibold">Priority</th>
                  <th className="py-2.5 px-3 font-semibold">Location</th>
                  <th className="py-2.5 px-3 font-semibold">Tech Stack</th>
                  <th className="py-2.5 px-3 font-semibold">Deadline</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {opportunities.map((opp) => {
                  const isTracked = trackedIds.has(opp.id);
                  const daysLeft = getDaysRemaining(opp.deadline);

                  return (
                    <tr key={opp.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-3 font-medium text-foreground whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <span>{opp.company}</span>
                          {opp.isDemo && (
                            <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-amber-500/20 text-amber-400">
                              DEMO
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-foreground font-normal">
                        <div className="max-w-[260px] truncate">{opp.title}</div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">{getTypeBadge(opp.type)}</td>
                      <td className="py-3 px-3 whitespace-nowrap font-mono text-xs font-semibold">
                        {opp.priority_score !== undefined && opp.priority_score !== null ? (
                          <span
                            className={
                              opp.priority_score >= 80
                                ? 'text-emerald-400'
                                : opp.priority_score >= 65
                                ? 'text-indigo-400'
                                : 'text-muted-foreground'
                            }
                          >
                            {opp.priority_score}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center space-x-1">
                          <span className="truncate max-w-[140px]">{opp.location || 'Multiple'}</span>
                          {opp.remote && (
                            <span className="text-[10px] text-sky-400 font-medium">· Remote</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {(opp.tech_stack || []).slice(0, 3).map((t) => (
                            <span key={t} className="px-1 py-0.2 rounded text-[9px] bg-muted font-mono">
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">
                        {daysLeft !== null ? (
                          <span className={daysLeft <= 7 ? 'text-rose-400 font-medium' : ''}>
                            {daysLeft <= 0 ? 'Today' : `${daysLeft}d`}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => trackApplication(opp)}
                            className={`px-2 py-0.8 rounded text-[11px] font-medium transition-colors ${
                              isTracked
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-muted hover:bg-muted/80 text-foreground'
                            }`}
                          >
                            {isTracked ? 'Tracked' : 'Track'}
                          </button>
                          {/* Plain target="_blank" outbound link */}
                          <a
                            href={opp.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 px-2.5 py-0.8 rounded text-[11px] font-medium bg-primary hover:bg-primary/90 text-primary-foreground transition-colors"
                          >
                            <span>Apply</span>
                            <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
