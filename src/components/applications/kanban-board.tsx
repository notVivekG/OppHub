'use client';

import * as React from 'react';
import { Application, ApplicationStatus } from '@/types';
import { ApplicationModal } from '@/components/applications/application-modal';
import { 
  Building2, 
  Clock, 
  MapPin, 
  ChevronRight, 
  ChevronLeft, 
  Search, 
  Sparkles, 
  AlertCircle, 
  Calendar, 
  FileText,
  Plus,
  ArrowRight
} from 'lucide-react';
import { formatDate, getDaysRemaining } from '@/lib/utils';
import confetti from 'canvas-confetti';

const COLUMNS: { id: ApplicationStatus; title: string; color: string; badgeColor: string }[] = [
  { 
    id: 'wishlist', 
    title: 'Wishlist', 
    color: 'border-slate-500/30 bg-slate-500/5', 
    badgeColor: 'bg-slate-500/10 text-slate-300' 
  },
  { 
    id: 'applied', 
    title: 'Applied', 
    color: 'border-blue-500/30 bg-blue-500/5', 
    badgeColor: 'bg-blue-500/10 text-blue-400' 
  },
  { 
    id: 'oa', 
    title: 'Online Assessment', 
    color: 'border-amber-500/30 bg-amber-500/5', 
    badgeColor: 'bg-amber-500/10 text-amber-400' 
  },
  { 
    id: 'interview', 
    title: 'Interviewing', 
    color: 'border-purple-500/30 bg-purple-500/5', 
    badgeColor: 'bg-purple-500/10 text-purple-400' 
  },
  { 
    id: 'offer', 
    title: 'Offer Received', 
    color: 'border-emerald-500/30 bg-emerald-500/5', 
    badgeColor: 'bg-emerald-500/10 text-emerald-400' 
  },
  { 
    id: 'rejected', 
    title: 'Rejected', 
    color: 'border-rose-500/20 bg-rose-500/5 opacity-80', 
    badgeColor: 'bg-rose-500/10 text-rose-400' 
  },
];

const ORDERED_STAGES: ApplicationStatus[] = [
  'wishlist',
  'applied',
  'oa',
  'interview',
  'offer',
  'rejected',
];

interface KanbanBoardProps {
  initialApplications?: Application[];
}

export function KanbanBoard({ initialApplications }: KanbanBoardProps) {
  const [applications, setApplications] = React.useState<Application[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedApp, setSelectedApp] = React.useState<Application | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [dragOverCol, setDragOverCol] = React.useState<ApplicationStatus | null>(null);

  // Load applications
  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/applications');
        if (res.ok) {
          const { applications: data, isDemo } = await res.json();
          if (data && data.length > 0) {
            setApplications(data);
            return;
          }
        }
      } catch {}

      // Local storage fallback
      const saved = localStorage.getItem('opphub-applications');
      if (saved) {
        try {
          setApplications(JSON.parse(saved));
        } catch {}
      } else if (initialApplications) {
        setApplications(initialApplications);
      }
    }

    load();
  }, [initialApplications]);

  const persistApplications = (updated: Application[]) => {
    setApplications(updated);
    localStorage.setItem('opphub-applications', JSON.stringify(updated));
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, colId: ApplicationStatus) => {
    e.preventDefault();
    if (dragOverCol !== colId) {
      setDragOverCol(colId);
    }
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
  };

  const handleDrop = (e: React.DragEvent, targetStatus: ApplicationStatus) => {
    e.preventDefault();
    setDragOverCol(null);
    const appId = e.dataTransfer.getData('text/plain');
    if (!appId) return;

    const targetApp = applications.find((a) => a.id === appId);
    if (!targetApp || targetApp.status === targetStatus) return;

    if (targetStatus === 'offer') {
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.5 },
        colors: ['#10b981', '#6366f1', '#f59e0b'],
      });
    }

    const now = new Date().toISOString();
    const updated = applications.map((a) =>
      a.id === appId
        ? { ...a, status: targetStatus, status_changed_at: now, updated_at: now }
        : a
    );

    persistApplications(updated);

    // Sync with API
    fetch('/api/applications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: appId, status: targetStatus }),
    }).catch(() => {});
  };

  // Quick move between stages
  const advanceStage = (e: React.MouseEvent, app: Application, direction: 1 | -1) => {
    e.stopPropagation();
    const currentIndex = ORDERED_STAGES.indexOf(app.status);
    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= ORDERED_STAGES.length) return;

    const nextStatus = ORDERED_STAGES[nextIndex];
    if (nextStatus === 'offer') {
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.6 },
      });
    }

    const now = new Date().toISOString();
    const updated = applications.map((a) =>
      a.id === app.id
        ? { ...a, status: nextStatus, status_changed_at: now, updated_at: now }
        : a
    );
    persistApplications(updated);

    fetch('/api/applications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: app.id, status: nextStatus }),
    }).catch(() => {});
  };

  // Modal updates
  const handleUpdate = (updatedApp: Application) => {
    const updated = applications.map((a) =>
      a.id === updatedApp.id ? updatedApp : a
    );
    persistApplications(updated);

    fetch('/api/applications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedApp),
    }).catch(() => {});
  };

  const handleDelete = (id: string) => {
    const updated = applications.filter((a) => a.id !== id);
    persistApplications(updated);
    setIsModalOpen(false);

    fetch(`/api/applications?id=${id}`, { method: 'DELETE' }).catch(() => {});
  };

  // Filtered applications
  const filtered = applications.filter((app) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (app.opportunity?.company && app.opportunity.company.toLowerCase().includes(q)) ||
      (app.opportunity?.title && app.opportunity.title.toLowerCase().includes(q)) ||
      (app.notes && app.notes.toLowerCase().includes(q))
    );
  });

  // Analytics summary strip
  const totalCount = applications.length;
  const inProgressCount = applications.filter((a) => ['applied', 'oa', 'interview'].includes(a.status)).length;
  const offerCount = applications.filter((a) => a.status === 'offer').length;
  const followUpsDue = applications.filter(
    (a) => a.follow_up_date && new Date(a.follow_up_date).getTime() <= Date.now()
  ).length;

  return (
    <div className="space-y-6">
      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-border bg-card/70 backdrop-blur-sm">
          <div className="text-[11px] font-medium text-muted-foreground">Total In Pipeline</div>
          <div className="text-xl font-bold text-foreground mt-0.5">{totalCount}</div>
        </div>
        <div className="p-3.5 rounded-xl border border-border bg-card/70 backdrop-blur-sm">
          <div className="text-[11px] font-medium text-blue-400">Active Applications</div>
          <div className="text-xl font-bold text-foreground mt-0.5">{inProgressCount}</div>
        </div>
        <div className="p-3.5 rounded-xl border border-border bg-card/70 backdrop-blur-sm">
          <div className="text-[11px] font-medium text-emerald-400">Offers Secured</div>
          <div className="text-xl font-bold text-emerald-400 mt-0.5 flex items-center space-x-1.5">
            <span>{offerCount}</span>
            {offerCount > 0 && <Sparkles className="w-4 h-4 text-emerald-400" />}
          </div>
        </div>
        <div className="p-3.5 rounded-xl border border-border bg-card/70 backdrop-blur-sm">
          <div className="text-[11px] font-medium text-amber-400">Follow-ups Due</div>
          <div className={`text-xl font-bold mt-0.5 ${followUpsDue > 0 ? 'text-amber-400' : 'text-foreground'}`}>
            {followUpsDue}
          </div>
        </div>
      </div>

      {/* Control / Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card/50 border border-border/80 p-3 rounded-xl">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search pipeline by company, role, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        <div className="text-xs text-muted-foreground flex items-center space-x-2">
          <span>💡 Drag cards between columns or use arrows to advance</span>
        </div>
      </div>

      {/* Kanban Board Columns: Horizontal snap-swipe on mobile, standard responsive grid on desktop */}
      <div className="flex md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth">
        {COLUMNS.map((col) => {
          const colApps = filtered.filter((a) => a.status === col.id);
          const isOver = dragOverCol === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`min-w-[280px] sm:min-w-[320px] md:min-w-0 snap-center rounded-xl border ${col.color} p-3 flex flex-col min-h-[480px] transition-all flex-shrink-0 md:flex-shrink ${
                isOver ? 'ring-2 ring-primary/60 scale-[1.01]' : ''
              }`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-bold text-foreground tracking-tight">{col.title}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${col.badgeColor}`}>
                  {colApps.length}
                </span>
              </div>

              {/* Cards Container */}
              <div className="flex-1 space-y-2.5 overflow-y-auto">
                {colApps.length === 0 ? (
                  <div className="h-28 border border-dashed border-border/50 rounded-lg flex items-center justify-center text-center p-3">
                    <span className="text-[11px] text-muted-foreground/50">Drop here</span>
                  </div>
                ) : (
                  colApps.map((item) => {
                    const currentIndex = ORDERED_STAGES.indexOf(item.status);
                    const canGoLeft = currentIndex > 0;
                    const canGoRight = currentIndex < ORDERED_STAGES.length - 1;
                    const isFollowUpDue =
                      item.follow_up_date && new Date(item.follow_up_date).getTime() <= Date.now();

                    return (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, item.id)}
                        onClick={() => {
                          setSelectedApp(item);
                          setIsModalOpen(true);
                        }}
                        className="group relative rounded-lg border border-border/90 bg-card hover:border-primary/50 hover:shadow-md transition-all p-3 space-y-2.5 cursor-pointer active:cursor-grabbing"
                      >
                        {/* Company & Date */}
                        <div className="flex items-start justify-between gap-1">
                          <div className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                            {item.opportunity?.company || 'Company'}
                          </div>
                          <span className="text-[10px] text-muted-foreground flex-shrink-0">
                            {formatDate(item.date_applied)}
                          </span>
                        </div>

                        {/* Title */}
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-tight">
                          {item.opportunity?.title || 'Position'}
                        </p>

                        {/* Metadata pills */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                          {item.opportunity?.location && (
                            <span className="text-muted-foreground/80 truncate max-w-[130px]">
                              📍 {item.opportunity.location}
                            </span>
                          )}
                          {isFollowUpDue && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 font-medium flex items-center space-x-1">
                              <AlertCircle className="w-2.5 h-2.5" />
                              <span>Follow-up</span>
                            </span>
                          )}
                        </div>

                        {/* Card Footer with Quick Navigation Arrows */}
                        <div className="pt-2 border-t border-border/50 flex items-center justify-between text-muted-foreground">
                          <span className="text-[10px] text-muted-foreground/70 font-mono">
                            {item.resume_version_id === 'res-aiml'
                              ? 'AI/ML'
                              : item.resume_version_id === 'res-backend'
                              ? 'Backend'
                              : 'Base'}
                          </span>

                          <div className="flex items-center space-x-1">
                            {canGoLeft && (
                              <button
                                type="button"
                                onClick={(e) => advanceStage(e, item, -1)}
                                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                title="Move back"
                              >
                                <ChevronLeft className="w-3 h-3" />
                              </button>
                            )}
                            {canGoRight && (
                              <button
                                type="button"
                                onClick={(e) => advanceStage(e, item, 1)}
                                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                title="Advance to next stage"
                              >
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Application Detail Modal */}
      <ApplicationModal
        application={selectedApp}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedApp(null);
        }}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    </div>
  );
}
