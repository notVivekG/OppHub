'use client';

import * as React from 'react';
import { Opportunity } from '@/types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  PieChart, 
  Pie,
  Legend
} from 'recharts';
import { 
  Globe, 
  TrendingUp, 
  Clock, 
  Building2, 
  Calendar, 
  Terminal, 
  Sparkles,
  Layers
} from 'lucide-react';
import { getDaysRemaining } from '@/lib/utils';

interface MarketInsightsProps {
  opportunities: Opportunity[];
  isDemo?: boolean;
}

export function MarketInsights({ opportunities, isDemo }: MarketInsightsProps) {
  // 1. Opportunities added per week by type
  const weeklyData = React.useMemo(() => {
    const weeksMap: Record<string, { week: string; internship: number; hackathon: number; contribution: number }> = {};

    // Sort opportunities by discovery date
    const sorted = [...opportunities].sort(
      (a, b) => new Date(a.date_discovered).getTime() - new Date(b.date_discovered).getTime()
    );

    for (const opp of sorted) {
      const d = new Date(opp.date_discovered);
      // Format as "MM/DD" for the start of the week
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const weekStart = new Date(d.setDate(diff));
      const label = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;

      if (!weeksMap[label]) {
        weeksMap[label] = { week: label, internship: 0, hackathon: 0, contribution: 0 };
      }
      if (opp.type === 'internship') weeksMap[label].internship++;
      else if (opp.type === 'hackathon') weeksMap[label].hackathon++;
      else if (opp.type === 'contribution') weeksMap[label].contribution++;
    }

    const res = Object.values(weeksMap);
    return res.length > 0
      ? res.slice(-6)
      : [
          { week: 'Recent', internship: opportunities.length, hackathon: 0, contribution: 0 },
        ];
  }, [opportunities]);

  // 2. Trending tech stacks / keywords across postings
  const techStackData = React.useMemo(() => {
    const freq: Record<string, number> = {};
    for (const opp of opportunities) {
      if (opp.tech_stack) {
        for (const tech of opp.tech_stack) {
          const t = tech.trim();
          if (t) freq[t] = (freq[t] || 0) + 1;
        }
      }
    }

    return Object.entries(freq)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [opportunities]);

  // 3. Deadline distribution (<7, <14, <30, >30 or ongoing)
  const deadlineData = React.useMemo(() => {
    let under7 = 0;
    let under14 = 0;
    let under30 = 0;
    let ongoing = 0;

    for (const opp of opportunities) {
      if (!opp.deadline) {
        ongoing++;
        continue;
      }
      const days = getDaysRemaining(opp.deadline);
      if (days === null || days < 0) {
        continue;
      } else if (days <= 7) {
        under7++;
      } else if (days <= 14) {
        under14++;
      } else if (days <= 30) {
        under30++;
      } else {
        ongoing++;
      }
    }

    return [
      { name: '< 7 Days (Urgent)', count: under7, color: '#f43f5e' },
      { name: '7 - 14 Days', count: under14, color: '#f59e0b' },
      { name: '15 - 30 Days', count: under30, color: '#06b6d4' },
      { name: 'Ongoing / >30d', count: ongoing, color: '#6366f1' },
    ];
  }, [opportunities]);

  // 4. Top companies posting this month
  const topCompanies = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const opp of opportunities) {
      if (opp.company) {
        counts[opp.company] = (counts[opp.company] || 0) + 1;
      }
    }

    return Object.entries(counts)
      .map(([company, count]) => ({ company, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [opportunities]);

  return (
    <div className="space-y-6">
      {/* Top Banner with Cyan Visual Accent */}
      <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-foreground">Market Insights & Industry Volume</h2>
              <span className="px-2 py-0.2 rounded text-[10px] font-mono font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                Aggregate Data
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Derived strictly from {opportunities.length} open opportunities across tracked sources.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-background/50 text-right">
            <span className="text-[10px] text-muted-foreground block">Active Postings</span>
            <span className="text-sm font-bold font-mono text-cyan-400">{opportunities.length}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-background/50 text-right">
            <span className="text-[10px] text-muted-foreground block">Remote Ratio</span>
            <span className="text-sm font-bold font-mono text-cyan-400">
              {opportunities.length
                ? `${Math.round(
                    (opportunities.filter((o) => o.remote).length / opportunities.length) * 100
                  )}%`
                : '0%'}
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Volume Trends & Tech Stacks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Opportunities Added Per Week By Type */}
        <div className="rounded-xl border border-border bg-card/60 p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-semibold text-foreground">Weekly Postings by Type</h3>
            </div>
            <span className="text-[11px] text-muted-foreground">Last 6 Weeks</span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="week" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '11px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                  }}
                  itemStyle={{ color: '#f8fafc' }}
                  labelStyle={{ color: '#94a3b8', fontWeight: 600, marginBottom: '2px' }}
                />
                <Bar dataKey="internship" name="Internships" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                <Bar dataKey="hackathon" name="Hackathons" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="contribution" name="Good First Issues" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Trending Tech Stacks & Languages */}
        <div className="rounded-xl border border-border bg-card/60 p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-semibold text-foreground">Trending Tech Stacks & Keywords</h3>
            </div>
            <span className="text-[11px] text-muted-foreground">Most in Demand</span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={techStackData}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
              >
                <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '11px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                  }}
                  itemStyle={{ color: '#f8fafc' }}
                  labelStyle={{ color: '#94a3b8', fontWeight: 600, marginBottom: '2px' }}
                />
                <Bar dataKey="count" name="Openings Mentioning" fill="#0891b2" radius={[0, 4, 4, 0]}>
                  {techStackData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === 0 ? '#06b6d4' : index < 3 ? '#0891b2' : '#0e7490'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Grid: Deadline Distribution & Top Companies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 3. Deadline Distribution */}
        <div className="rounded-xl border border-border bg-card/60 p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-semibold text-foreground">Application Deadline Urgency</h3>
            </div>
            <span className="text-[11px] text-muted-foreground">Closing Windows</span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            {deadlineData.map((d) => (
              <div
                key={d.name}
                className="p-3.5 rounded-xl border border-border/80 bg-background/50 flex flex-col justify-between"
              >
                <span className="text-[11px] text-muted-foreground font-medium">{d.name}</span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-xl font-bold font-mono" style={{ color: d.color }}>
                    {d.count}
                  </span>
                  <span className="text-[10px] text-muted-foreground">roles</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Top Companies Posting This Month */}
        <div className="rounded-xl border border-border bg-card/60 p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-semibold text-foreground">Top Hiring Companies</h3>
            </div>
            <span className="text-[11px] text-muted-foreground">Current Cycle</span>
          </div>

          <div className="space-y-2 pt-1">
            {topCompanies.map((c, idx) => (
              <div
                key={c.company}
                className="flex items-center justify-between p-2.5 rounded-lg border border-border/70 bg-background/50 text-xs"
              >
                <div className="flex items-center space-x-2.5">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-mono text-[10px] font-bold">
                    {idx + 1}
                  </span>
                  <span className="font-semibold text-foreground">{c.company}</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  {c.count} openings
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Functional Hackathon Calendar Heatmap */}
      {(() => {
        const hackathons = opportunities.filter((o) => o.type === 'hackathon');

        if (hackathons.length === 0) {
          return (
            <div className="rounded-xl border border-dashed border-cyan-500/30 bg-cyan-950/10 p-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-cyan-400 font-semibold text-xs">
                  <Calendar className="w-4 h-4" />
                  <span>Hackathon Calendar Heatmap</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  0 Events Tracked
                </span>
              </div>

              <div className="py-8 text-center space-y-2">
                <Calendar className="w-8 h-8 mx-auto text-muted-foreground/40" />
                <h4 className="text-xs font-semibold text-foreground">No Upcoming Hackathons Ingested Yet</h4>
                <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                  Run <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-[11px] text-cyan-300">npm run ingest:hackathons</code> or trigger the GitHub Actions workflow to aggregate upcoming collegiate and open hackathons from Devpost, Devfolio, MLH, and Unstop.
                </p>
              </div>
            </div>
          );
        }

        // Generate next 42 days (6 weeks) for calendar grid
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dayOfWeek = today.getDay(); // 0 = Sun
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - dayOfWeek); // start on Sunday

        const days = Array.from({ length: 42 }).map((_, i) => {
          const d = new Date(startDate);
          d.setDate(startDate.getDate() + i);
          const dateStr = d.toISOString().split('T')[0];
          const isToday = d.getTime() === today.getTime();
          const isPast = d.getTime() < today.getTime();

          // Find hackathons whose deadline matches this day
          const matching = hackathons.filter((h) => {
            if (!h.deadline) return false;
            return h.deadline.startsWith(dateStr);
          });

          return {
            date: d,
            dateStr,
            dayOfMonth: d.getDate(),
            monthLabel: d.toLocaleDateString('en-US', { month: 'short' }),
            count: matching.length,
            events: matching,
            isToday,
            isPast,
          };
        });

        // Upcoming sorted hackathons with deadlines
        const upcomingHackathons = [...hackathons]
          .filter((h) => h.deadline && new Date(h.deadline).getTime() >= Date.now())
          .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
          .slice(0, 5);

        return (
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/10 p-5 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2 text-cyan-400 font-semibold text-xs">
                <Calendar className="w-4 h-4" />
                <span>Upcoming Hackathon Calendar Heatmap</span>
              </div>
              <div className="flex items-center space-x-3 text-[11px]">
                <span className="text-muted-foreground font-mono">
                  {hackathons.length} Total Tracked
                </span>
                <div className="flex items-center space-x-1 text-[10px] text-muted-foreground">
                  <span>Less</span>
                  <span className="w-2.5 h-2.5 rounded-sm bg-muted/60" />
                  <span className="w-2.5 h-2.5 rounded-sm bg-cyan-500/30" />
                  <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400" />
                  <span>More</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Visualizing registration windows and submission deadlines across tracked platforms (Devpost, Devfolio, MLH, Unstop).
            </p>

            {/* 6-Week Calendar Heatmap Grid */}
            <div className="overflow-x-auto pb-1">
              <div className="min-w-[480px]">
                <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] text-muted-foreground font-medium mb-1">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day}>{day}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {days.map((d, idx) => {
                    const hasEvents = d.count > 0;
                    return (
                      <div
                        key={idx}
                        className={`h-12 rounded-lg border p-1 flex flex-col justify-between transition-all ${
                          d.isToday
                            ? 'ring-2 ring-cyan-400/80 border-cyan-400'
                            : ''
                        } ${
                          hasEvents
                            ? d.count >= 2
                              ? 'bg-cyan-500/30 border-cyan-400/50 text-cyan-100'
                              : 'bg-cyan-500/15 border-cyan-500/30 text-cyan-200'
                            : d.isPast
                            ? 'bg-muted/20 border-border/30 opacity-40'
                            : 'bg-card/50 border-border/50 text-muted-foreground'
                        }`}
                        title={`${d.date.toLocaleDateString()}: ${d.count} event deadlines`}
                      >
                        <div className="flex items-center justify-between text-[10px]">
                          <span className={d.isToday ? 'font-bold text-cyan-400' : ''}>
                            {d.dayOfMonth === 1 ? `${d.monthLabel} 1` : d.dayOfMonth}
                          </span>
                          {hasEvents && (
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                          )}
                        </div>
                        {hasEvents && (
                          <div className="text-[9px] font-mono font-bold truncate text-cyan-300">
                            {d.count} {d.count === 1 ? 'event' : 'events'}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Upcoming Hackathon Deadlines Spotlight */}
            {upcomingHackathons.length > 0 && (
              <div className="pt-2 border-t border-cyan-500/20 space-y-2">
                <span className="text-[11px] font-semibold text-foreground block">
                  Approaching Hackathon Deadlines
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {upcomingHackathons.map((h) => (
                    <a
                      key={h.id}
                      href={h.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-lg border border-border/70 bg-card/60 hover:bg-card hover:border-cyan-500/40 transition-colors flex items-center justify-between group"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs font-semibold text-foreground truncate group-hover:text-cyan-300 transition-colors">
                            {h.title}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-[10px] text-muted-foreground mt-0.5">
                          <span>{h.company}</span>
                          <span>•</span>
                          <span>{h.location || (h.remote ? 'Online' : 'In-Person')}</span>
                          {h.stipend && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-400">{h.stipend}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                          {new Date(h.deadline!).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
