'use client';

import * as React from 'react';
import Link from 'next/link';
import { KanbanBoard } from '@/components/applications/kanban-board';
import { ArrowLeft, Compass } from 'lucide-react';

export default function ApplicationsPage() {
  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Application Pipeline
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Interactive Kanban
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Track applications from submission through OA, technical interviews, and offers. Log resume variants and follow-up deadlines.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            href="/"
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-card/80 text-xs font-medium text-foreground transition-colors"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Browse More Opportunities</span>
          </Link>
        </div>
      </div>

      {/* Main Kanban Board */}
      <KanbanBoard />
    </div>
  );
}
