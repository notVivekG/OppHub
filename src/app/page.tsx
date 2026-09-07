import { OpportunityFeed } from '@/components/feed/opportunity-feed';
import { Compass, Sparkles, TrendingUp, ShieldCheck } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="space-y-6">
      {/* Top Hero Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Opportunity Radar
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Live Ingest Active
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Aggregated Summer internships, collegiate hackathons, and good first issues scored against your profile.
          </p>
        </div>

        {/* Quick Value Metrics */}
        <div className="flex items-center space-x-3 text-xs">
          <div className="px-3 py-2 rounded-lg bg-card border border-border/80 flex items-center space-x-2.5">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-[10px] text-muted-foreground font-medium">Daily Ingest</div>
              <div className="font-semibold text-foreground">SimplifyJobs + GitHub</div>
            </div>
          </div>
          <div className="px-3 py-2 rounded-lg bg-card border border-border/80 flex items-center space-x-2.5">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <div>
              <div className="text-[10px] text-muted-foreground font-medium">Auto-Apply Safe</div>
              <div className="font-semibold text-foreground">100% Review First</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Feed */}
      <OpportunityFeed />
    </div>
  );
}
