'use client';

import * as React from 'react';
import { Application, ResumeVersion, ApplicationStatus } from '@/types';
import { 
  UserCheck, 
  Target, 
  Clock, 
  Award, 
  TrendingUp, 
  AlertCircle, 
  Calendar, 
  FileText, 
  Mail,
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  AreaChart, 
  Area,
  Cell
} from 'recharts';
import { formatDate } from '@/lib/utils';

interface ProgressAnalyticsProps {
  applications: Application[];
  resumeVersions: ResumeVersion[];
}

const FUNNEL_STAGES: { id: ApplicationStatus; label: string; color: string }[] = [
  { id: 'wishlist', label: 'Wishlist', color: '#64748b' },
  { id: 'applied', label: 'Applied', color: '#38bdf8' },
  { id: 'oa', label: 'OA Received', color: '#f59e0b' },
  { id: 'interview', label: 'Interviewing', color: '#a855f7' },
  { id: 'offer', label: 'Offer Received', color: '#10b981' },
];

export function ProgressAnalytics({ applications, resumeVersions }: ProgressAnalyticsProps) {
  // 1. Funnel conversion
  const funnelData = React.useMemo(() => {
    const counts: Record<string, number> = {
      wishlist: 0,
      applied: 0,
      oa: 0,
      interview: 0,
      offer: 0,
    };

    for (const app of applications) {
      if (counts[app.status] !== undefined) {
        counts[app.status]++;
      } else if (app.status === 'rejected' || app.status === 'withdrawn') {
        // Counted towards applied base
        counts.applied++;
      }
    }

    // Cumulative funnel: all who reached offer reached interview, etc.
    const offer = counts.offer;
    const interview = counts.interview + offer;
    const oa = counts.oa + interview;
    const applied = counts.applied + oa;
    const wishlist = counts.wishlist + applied;

    return [
      { stage: 'Wishlist', count: wishlist, color: '#64748b' },
      { stage: 'Applied', count: applied, color: '#38bdf8' },
      { stage: 'OA', count: oa, color: '#f59e0b' },
      { stage: 'Interview', count: interview, color: '#a855f7' },
      { stage: 'Offer', count: offer, color: '#10b981' },
    ];
  }, [applications]);

  // 2. Response rate & Average time-to-first-response by Resume Variant
  const variantAnalytics = React.useMemo(() => {
    const resumeLabelMap: Record<string, string> = {
      'res-base': 'base',
      'res-backend': 'backend',
      'res-aiml': 'ai-ml',
      'demo-res-base': 'base',
      'demo-res-backend': 'backend',
      'demo-res-aiml': 'ai-ml',
    };

    for (const rv of resumeVersions) {
      resumeLabelMap[rv.id] = rv.label;
    }

    const stats: Record<
      string,
      { label: string; totalApplied: number; responses: number; totalDays: number }
    > = {};

    for (const app of applications) {
      // Must be at least applied
      if (app.status === 'wishlist') continue;

      const variantKey = app.resume_version_id || 'unassigned';
      const label = resumeLabelMap[variantKey] || (variantKey === 'unassigned' ? 'Standard / Unset' : variantKey);

      if (!stats[label]) {
        stats[label] = { label, totalApplied: 0, responses: 0, totalDays: 0 };
      }

      stats[label].totalApplied++;

      // Has received a response (OA, Interview, Offer, or Rejected)
      const hasResponse = ['oa', 'interview', 'offer', 'rejected'].includes(app.status);
      if (hasResponse) {
        stats[label].responses++;

        // Compute time-to-first-response (using status_changed_at or updated_at)
        const appliedTime = app.date_applied ? new Date(app.date_applied).getTime() : 0;
        const responseTime = app.status_changed_at
          ? new Date(app.status_changed_at).getTime()
          : app.updated_at
          ? new Date(app.updated_at).getTime()
          : 0;

        if (appliedTime > 0 && responseTime >= appliedTime) {
          const diffDays = Math.max(1, Math.round((responseTime - appliedTime) / (1000 * 60 * 60 * 24)));
          stats[label].totalDays += diffDays;
        } else {
          // Default fallback estimate for mock / freshly moved items
          stats[label].totalDays += 7;
        }
      }
    }

    return Object.values(stats).map((s) => ({
      label: s.label,
      totalApplied: s.totalApplied,
      responses: s.responses,
      responseRate: s.totalApplied > 0 ? Math.round((s.responses / s.totalApplied) * 100) : 0,
      avgResponseDays: s.responses > 0 ? Math.round((s.totalDays / s.responses) * 10) / 10 : 0,
    }));
  }, [applications, resumeVersions]);

  // 3. Applications submitted per week
  const weeklyApplications = React.useMemo(() => {
    const weeksMap: Record<string, { week: string; count: number }> = {};

    const submitted = applications.filter((a) => a.status !== 'wishlist');
    for (const app of submitted) {
      const d = new Date(app.date_applied || app.updated_at);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const weekStart = new Date(d.setDate(diff));
      const label = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;

      if (!weeksMap[label]) {
        weeksMap[label] = { week: label, count: 0 };
      }
      weeksMap[label].count++;
    }

    const res = Object.values(weeksMap);
    return res.length > 0
      ? res.slice(-6)
      : [{ week: 'This Week', count: submitted.length }];
  }, [applications]);

  // 4. Deadlines Met vs Missed
  const deadlineMetrics = React.useMemo(() => {
    let met = 0;
    let missed = 0;
    let noDeadline = 0;

    for (const app of applications) {
      if (!app.opportunity?.deadline) {
        noDeadline++;
        continue;
      }
      const appliedTime = app.date_applied ? new Date(app.date_applied).getTime() : 0;
      const deadlineTime = new Date(app.opportunity.deadline).getTime();

      if (appliedTime > 0 && appliedTime <= deadlineTime) {
        met++;
      } else if (appliedTime > deadlineTime) {
        missed++;
      } else {
        met++;
      }
    }

    return { met, missed, noDeadline, total: applications.length };
  }, [applications]);

  // 5. Follow-ups due this week
  const upcomingFollowUps = React.useMemo(() => {
    const now = Date.now();
    const oneWeekLater = now + 7 * 24 * 60 * 60 * 1000;

    return applications.filter((app) => {
      if (!app.follow_up_date) return false;
      const fTime = new Date(app.follow_up_date).getTime();
      return fTime >= now - 24 * 60 * 60 * 1000 && fTime <= oneWeekLater;
    });
  }, [applications]);

  const totalOffers = applications.filter((a) => a.status === 'offer').length;
  const totalInPipeline = applications.filter((a) => ['applied', 'oa', 'interview'].includes(a.status)).length;

  return (
    <div className="space-y-6">
      {/* Top Banner with Purple Visual Accent */}
      <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-foreground">My Progress & Personal Pipeline</h2>
              <span className="px-2 py-0.2 rounded text-[10px] font-mono font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                Personal Funnel
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Strictly derived from your tracked applications and saved resume variants.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="px-3 py-1.5 rounded-lg border border-purple-500/30 bg-background/50 text-right">
            <span className="text-[10px] text-muted-foreground block">Active In Pipeline</span>
            <span className="text-sm font-bold font-mono text-purple-400">{totalInPipeline}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-background/50 text-right">
            <span className="text-[10px] text-muted-foreground block">Offers Landed</span>
            <span className="text-sm font-bold font-mono text-emerald-400">{totalOffers}</span>
          </div>
        </div>
      </div>

      {/* Grid: Application Funnel & Weekly Submissions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Funnel Conversion */}
        <div className="rounded-xl border border-border bg-card/60 p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Target className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-semibold text-foreground">Application Conversion Funnel</h3>
            </div>
            <span className="text-[11px] text-muted-foreground">Stage Retention</span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={funnelData}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis dataKey="stage" type="category" stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="count" name="Applications" radius={[0, 4, 4, 0]}>
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Submissions Per Week Trend */}
        <div className="rounded-xl border border-border bg-card/60 p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-semibold text-foreground">Submissions Per Week</h3>
            </div>
            <span className="text-[11px] text-muted-foreground">Volume Trend</span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyApplications} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="week" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Applications Sent"
                  stroke="#a855f7"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#purpleGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 3. Performance by Resume Variant (Response Rate & Time-to-First-Response) */}
      <div className="rounded-xl border border-border bg-card/60 p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-purple-400" />
            <h3 className="text-xs font-semibold text-foreground">
              Response Rate & Velocity by Resume Variant
            </h3>
          </div>
          <span className="text-[11px] text-muted-foreground">
            A/B Performance Across Variants
          </span>
        </div>

        {variantAnalytics.length === 0 ? (
          <div className="p-6 rounded-lg border border-dashed border-border bg-muted/20 text-center text-xs text-muted-foreground">
            Log applications with your resume variants in the Kanban board to view conversion rates here.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            {variantAnalytics.map((v) => (
              <div
                key={v.label}
                className="p-4 rounded-xl border border-purple-500/20 bg-background/50 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-purple-300 capitalize">
                    {v.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {v.totalApplied} applied
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50 text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Response Rate</span>
                    <span className="text-base font-bold font-mono text-emerald-400">
                      {v.responseRate}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Avg First Response</span>
                    <span className="text-base font-bold font-mono text-purple-400">
                      {v.avgResponseDays > 0 ? `${v.avgResponseDays}d` : '—'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grid: Deadlines Met vs Missed & Follow-ups Due */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 4. Deadlines Met vs Missed */}
        <div className="rounded-xl border border-border bg-card/60 p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-semibold text-foreground">Deadlines Met vs Missed</h3>
            </div>
            <span className="text-[11px] text-muted-foreground">Submission Timing</span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 space-y-1">
              <div className="flex items-center space-x-1.5 text-xs text-emerald-400 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                <span>Submitted On Time</span>
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-300">
                {deadlineMetrics.met}
              </div>
              <span className="text-[10px] text-muted-foreground">Before posted deadline</span>
            </div>

            <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 space-y-1">
              <div className="flex items-center space-x-1.5 text-xs text-rose-400 font-medium">
                <XCircle className="w-4 h-4" />
                <span>Missed Deadlines</span>
              </div>
              <div className="text-2xl font-bold font-mono text-rose-300">
                {deadlineMetrics.missed}
              </div>
              <span className="text-[10px] text-muted-foreground">Submitted post-deadline</span>
            </div>
          </div>
        </div>

        {/* 5. Follow-ups Due This Week */}
        <div className="rounded-xl border border-border bg-card/60 p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-semibold text-foreground">Follow-ups Due This Week</h3>
            </div>
            <span className="text-[11px] text-muted-foreground font-mono">
              {upcomingFollowUps.length} pending
            </span>
          </div>

          {upcomingFollowUps.length === 0 ? (
            <div className="p-6 rounded-lg border border-dashed border-border bg-muted/20 text-center text-xs text-muted-foreground">
              No follow-up dates scheduled for this week. Set follow-up reminders inside Kanban cards.
            </div>
          ) : (
            <div className="space-y-2 pt-1">
              {upcomingFollowUps.map((app) => (
                <div
                  key={app.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border/70 bg-background/50 text-xs"
                >
                  <div>
                    <span className="font-semibold text-foreground block">
                      {app.opportunity?.company || 'Company'}
                    </span>
                    <span className="text-[11px] text-muted-foreground block truncate max-w-xs">
                      {app.opportunity?.title || 'Application'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20">
                      {app.follow_up_date ? formatDate(app.follow_up_date) : 'Soon'}
                    </span>
                    {app.recruiter_contact && (
                      <span className="text-[10px] text-muted-foreground block mt-0.5">
                        {app.recruiter_contact}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
