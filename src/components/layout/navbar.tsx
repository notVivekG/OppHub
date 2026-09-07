'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Compass, 
  KanbanSquare, 
  FileText, 
  BarChart3, 
  Settings as SettingsIcon, 
  Sun, 
  Moon, 
  Database,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { NotificationCenter } from '@/components/notifications/notification-center';
import { isSupabaseConfigured } from '@/lib/supabase/client';

export function Navbar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [isConfigured, setIsConfigured] = React.useState(false);

  React.useEffect(() => {
    setIsConfigured(isSupabaseConfigured());
  }, []);

  const navLinks = [
    { href: '/', label: 'Opportunity Feed', icon: Compass },
    { href: '/applications', label: 'Pipeline (Kanban)', icon: KanbanSquare },
    { href: '/resumes', label: 'Resume Tailor', icon: FileText, badge: 'Phase 3' },
    { href: '/analytics', label: 'Analytics', icon: BarChart3, badge: 'Phase 3' },
    { href: '/settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Brand & Left Navigation */}
        <div className="flex items-center space-x-6">
          <Link href="/" className="flex items-center space-x-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 flex items-center justify-center shadow-sm group-hover:shadow transition-shadow">
              <Compass className="w-4 h-4 text-white animate-pulse" />
            </div>
            <span className="font-bold text-base tracking-tight bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
              OppHub
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{link.label}</span>
                  {link.badge && (
                    <span className="ml-1 text-[9px] px-1.5 py-0.2 rounded font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right side controls */}
        <div className="flex items-center space-x-2.5">
          {/* Supabase Status Pill */}
          <div className="hidden sm:flex items-center">
            {isConfigured ? (
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Supabase Live</span>
              </div>
            ) : (
              <div
                className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 cursor-help"
                title="Running in local preview mode. Add Supabase keys to .env.local for database persistence."
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span className="font-semibold">Demo Mode</span>
              </div>
            )}
          </div>

          {/* In-app Notification Bell */}
          <NotificationCenter />

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-card/60 hover:bg-card border border-border/80 text-foreground/80 hover:text-foreground transition-colors focus:outline-none"
            aria-label="Toggle theme"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>

          {/* Login / Auth */}
          <Link
            href="/login"
            className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
