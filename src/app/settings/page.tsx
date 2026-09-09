'use client';

import * as React from 'react';
import Link from 'next/link';
import { 
  Settings as SettingsIcon, 
  ArrowLeft, 
  Sliders, 
  Bell, 
  Send, 
  Database, 
  Check, 
  Plus, 
  Trash2, 
  Globe, 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { EligibilityRules, NotificationPrefs, WatchlistItem } from '@/types';

export default function SettingsPage() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [savedMessage, setSavedMessage] = React.useState(false);

  // Settings State
  const [gradYears, setGradYears] = React.useState<number[]>([2026, 2027]);
  const [degrees, setDegrees] = React.useState<string[]>(['Bachelors', 'Masters']);
  const [requiresSponsorship, setRequiresSponsorship] = React.useState(false);
  const [remoteOnly, setRemoteOnly] = React.useState(false);
  const [preferredLocations, setPreferredLocations] = React.useState<string[]>([
    'Remote', 'San Francisco, CA', 'New York, NY', 'Seattle, WA', 'Austin, TX'
  ]);
  const [newLocation, setNewLocation] = React.useState('');

  const [targetRoles, setTargetRoles] = React.useState<string[]>([
    'Software Engineer', 'Backend', 'Frontend', 'Full Stack', 'AI/ML'
  ]);
  const [newRole, setNewRole] = React.useState('');

  const [priorityThreshold, setPriorityThreshold] = React.useState(70);
  const [notifyDeadlineDays, setNotifyDeadlineDays] = React.useState(7);
  const [telegramEnabled, setTelegramEnabled] = React.useState(true);

  // Telegram Config
  const [telegramBotToken, setTelegramBotToken] = React.useState('');
  const [telegramChatId, setTelegramChatId] = React.useState('');
  const [testingTelegram, setTestingTelegram] = React.useState(false);
  const [telegramCooldown, setTelegramCooldown] = React.useState(0);
  const isTestingTelegramRef = React.useRef(false);
  const [telegramTestResult, setTelegramTestResult] = React.useState<{ success: boolean; message: string } | null>(null);

  // Watchlist Items
  const [watchlist, setWatchlist] = React.useState<WatchlistItem[]>([]);
  const [newWatchLabel, setNewWatchLabel] = React.useState('');
  const [newWatchUrl, setNewWatchUrl] = React.useState('');
  const [watchlistError, setWatchlistError] = React.useState<string | null>(null);

  const [isConfigured, setIsConfigured] = React.useState(false);

  // Load settings and watchlist on mount
  React.useEffect(() => {
    setIsConfigured(isSupabaseConfigured());

    async function load() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const { settings } = await res.json();
          if (settings.eligibility_rules) {
            const rules: EligibilityRules = settings.eligibility_rules;
            if (rules.gradYears) setGradYears(rules.gradYears);
            if (rules.degrees) setDegrees(rules.degrees);
            if (rules.requiresSponsorship !== undefined) setRequiresSponsorship(rules.requiresSponsorship);
            if (rules.remoteOnly !== undefined) setRemoteOnly(rules.remoteOnly);
            if (rules.preferredLocations) setPreferredLocations(rules.preferredLocations);
            if (rules.targetRoles) setTargetRoles(rules.targetRoles);
          }
          if (settings.notification_prefs) {
            const prefs: NotificationPrefs = settings.notification_prefs;
            if (prefs.priorityThreshold) setPriorityThreshold(prefs.priorityThreshold);
            if (prefs.notifyOnDeadlineDays) setNotifyDeadlineDays(prefs.notifyOnDeadlineDays);
            if (prefs.telegramEnabled !== undefined) setTelegramEnabled(prefs.telegramEnabled);
            if ((prefs as any).telegram_bot_token) setTelegramBotToken((prefs as any).telegram_bot_token);
          }
          if (settings.telegram_chat_id) setTelegramChatId(settings.telegram_chat_id);
        }
      } catch (err) {
        console.warn('Loading default settings:', err);
      } finally {
        setLoading(false);
      }
    }

    async function loadWatchlist() {
      setWatchlistError(null);
      try {
        const res = await fetch('/api/watchlist');
        const data = await res.json().catch(() => ({}));
        if (res.ok && !data.isDemo) {
          // Supabase is authoritative (even if empty array [])
          setWatchlist(data.watchlist || []);
          localStorage.setItem('opphub-watchlist', JSON.stringify(data.watchlist || []));
          return;
        } else if (!res.ok && !data.isDemo) {
          // Supabase is configured but query failed
          setWatchlistError(data.error || 'Failed to load watchlist from Supabase.');
          return;
        }
      } catch (err: any) {
        if (isSupabaseConfigured()) {
          setWatchlistError(err.message || 'Network error while contacting Supabase API.');
          return;
        }
      }

      // Offline / Unconfigured Demo fallback
      const savedWatch = localStorage.getItem('opphub-watchlist');
      if (savedWatch) {
        try {
          setWatchlist(JSON.parse(savedWatch));
          return;
        } catch {}
      }

      // Initial starter targets for local preview only
      const defaultStarter: WatchlistItem[] = [
        { id: 'watch-1', label: 'NASA OSTEM Internship Portal', url: 'https://intern.nasa.gov', last_checked_at: new Date().toISOString() },
        { id: 'watch-2', label: 'Palantir Early Career', url: 'https://www.palantir.com/careers/early-talent/', last_checked_at: new Date().toISOString() },
      ];
      setWatchlist(defaultStarter);
    }

    load();
    loadWatchlist();
  }, []);

  // Countdown timer for Telegram rate-limit cooldown
  React.useEffect(() => {
    if (telegramCooldown <= 0) return;
    const interval = setInterval(() => {
      setTelegramCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [telegramCooldown]);

  const toggleGradYear = (year: number) => {
    setGradYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year].sort()
    );
  };

  const addLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (newLocation.trim() && !preferredLocations.includes(newLocation.trim())) {
      setPreferredLocations([...preferredLocations, newLocation.trim()]);
      setNewLocation('');
    }
  };

  const removeLocation = (loc: string) => {
    setPreferredLocations(preferredLocations.filter((l) => l !== loc));
  };

  const addRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRole.trim() && !targetRoles.includes(newRole.trim())) {
      setTargetRoles([...targetRoles, newRole.trim()]);
      setNewRole('');
    }
  };

  const removeRole = (r: string) => {
    setTargetRoles(targetRoles.filter((item) => item !== r));
  };

  const addWatchlistTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWatchLabel.trim() || !newWatchUrl.trim()) return;

    setWatchlistError(null);
    const label = newWatchLabel.trim();
    const url = newWatchUrl.trim();

    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, url }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && !data.isDemo && data.item) {
        // Supabase successfully inserted the row
        const updated = [...watchlist, data.item];
        setWatchlist(updated);
        localStorage.setItem('opphub-watchlist', JSON.stringify(updated));
        setNewWatchLabel('');
        setNewWatchUrl('');
        return;
      } else if (!res.ok) {
        // Supabase write genuinely failed - do NOT fallback to local state
        setWatchlistError(data.error || 'Failed to add target to Supabase watchlist.');
        return;
      } else if (data.isDemo) {
        if (isConfigured) {
          // Frontend is configured for Supabase, but server returned demo fallback
          setWatchlistError('Supabase is not configured on the server. Please verify SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local.');
          return;
        }

        // Offline / Unconfigured fallback
        const fallbackItem: WatchlistItem = data.item || {
          id: `watch-${Date.now()}`,
          label,
          url,
          last_checked_at: new Date().toISOString(),
        };
        const updated = [...watchlist, fallbackItem];
        setWatchlist(updated);
        localStorage.setItem('opphub-watchlist', JSON.stringify(updated));
        setNewWatchLabel('');
        setNewWatchUrl('');
        return;
      }
    } catch (err: any) {
      if (isConfigured) {
        setWatchlistError(err.message || 'Network error while adding target to Supabase.');
        return;
      }
    }

    // Offline / Demo fallback for pure network error
    const fallbackItem: WatchlistItem = {
      id: `watch-${Date.now()}`,
      label,
      url,
      last_checked_at: new Date().toISOString(),
    };
    const updated = [...watchlist, fallbackItem];
    setWatchlist(updated);
    localStorage.setItem('opphub-watchlist', JSON.stringify(updated));
    setNewWatchLabel('');
    setNewWatchUrl('');
  };

  const removeWatchlistTarget = async (id: string) => {
    setWatchlistError(null);
    try {
      const res = await fetch(`/api/watchlist?id=${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Supabase delete failed - do NOT remove from frontend state/localStorage
        setWatchlistError(data.error || 'Failed to remove target from Supabase watchlist.');
        return;
      } else if (data.isDemo && isConfigured) {
        setWatchlistError('Supabase is not configured on the server.');
        return;
      }
    } catch (err: any) {
      if (isConfigured) {
        setWatchlistError(err.message || 'Network error while removing target from Supabase.');
        return;
      }
    }

    const updated = watchlist.filter((w) => w.id !== id);
    setWatchlist(updated);
    localStorage.setItem('opphub-watchlist', JSON.stringify(updated));
  };

  const testTelegram = async () => {
    // Prevent duplicate calls from rapid double-clicks or while cooldown is active
    if (isTestingTelegramRef.current || testingTelegram || telegramCooldown > 0) {
      return;
    }
    isTestingTelegramRef.current = true;
    setTestingTelegram(true);
    setTelegramTestResult(null);

    try {
      const res = await fetch('/api/telegram/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: telegramBotToken || undefined,
          chatId: telegramChatId || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setTelegramTestResult({
          success: true,
          message: '✓ Test message delivered successfully! Check your Telegram app.',
        });
      } else if (res.status === 429 || data.retryAfter) {
        const waitSec = Number(data.retryAfter) || 8;
        setTelegramCooldown(waitSec);
        setTelegramTestResult({
          success: false,
          message: `Telegram rate limit active. Please wait ${waitSec}s before retrying.`,
        });
      } else {
        setTelegramTestResult({
          success: false,
          message: data.error || 'Failed to send message. Please verify Bot Token and Chat ID.',
        });
      }
    } catch (err: any) {
      setTelegramTestResult({
        success: false,
        message: err.message || 'Network error while contacting test endpoint.',
      });
    } finally {
      isTestingTelegramRef.current = false;
      setTestingTelegram(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      eligibility_rules: {
        gradYears,
        degrees,
        requiresSponsorship,
        remoteOnly,
        preferredLocations,
        targetRoles,
      },
      notification_prefs: {
        priorityThreshold,
        notifyOnDeadlineDays: notifyDeadlineDays,
        telegramEnabled,
        telegram_bot_token: telegramBotToken || undefined,
      },
      telegram_chat_id: telegramChatId,
    };

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.error || 'Failed to save preferences to Supabase.');
        return;
      }

      // Also persist to localStorage for instant local access
      localStorage.setItem('opphub-settings', JSON.stringify(payload));

      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Settings & Rules Engine
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Phase 2 Active
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Configure automated eligibility filtering, Telegram push triggers, and URL watchlist targets.
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

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. Eligibility & Hard Filter Rules */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
          <div className="flex items-center space-x-2 font-semibold text-sm text-foreground">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <span>Eligibility Rules & Hard Filter Criteria</span>
          </div>

          <div className="space-y-4 text-xs">
            {/* Graduation Years */}
            <div>
              <label className="block text-muted-foreground font-medium mb-1.5">
                Target Graduation Years (Click to toggle)
              </label>
              <div className="flex flex-wrap gap-2">
                {[2024, 2025, 2026, 2027, 2028, 2029].map((year) => {
                  const active = gradYears.includes(year);
                  return (
                    <button
                      type="button"
                      key={year}
                      onClick={() => toggleGradYear(year)}
                      className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                        active
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                          : 'bg-muted text-muted-foreground border border-border hover:text-foreground'
                      }`}
                    >
                      {year} {active && '✓'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Remote and Sponsorship Checkboxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <label className="flex items-center space-x-2.5 p-3 rounded-lg border border-border/80 bg-background cursor-pointer hover:border-border transition-colors">
                <input
                  type="checkbox"
                  checked={remoteOnly}
                  onChange={(e) => setRemoteOnly(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary/40 w-4 h-4"
                />
                <div>
                  <span className="text-foreground font-medium block">Remote Roles Only</span>
                  <span className="text-[11px] text-muted-foreground block">
                    Automatically filter out on-site listings from notifications
                  </span>
                </div>
              </label>

              <label className="flex items-center space-x-2.5 p-3 rounded-lg border border-border/80 bg-background cursor-pointer hover:border-border transition-colors">
                <input
                  type="checkbox"
                  checked={requiresSponsorship}
                  onChange={(e) => setRequiresSponsorship(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary/40 w-4 h-4"
                />
                <div>
                  <span className="text-foreground font-medium block">Requires Visa Sponsorship</span>
                  <span className="text-[11px] text-muted-foreground block">
                    Penalize or filter listings requiring US citizenship
                  </span>
                </div>
              </label>
            </div>

            {/* Preferred Locations */}
            <div>
              <label className="block text-muted-foreground font-medium mb-1.5">
                Preferred Locations (Score weight: 15%)
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {preferredLocations.map((loc) => (
                  <span
                    key={loc}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-muted text-foreground border border-border/80 text-[11px]"
                  >
                    <span>{loc}</span>
                    <button
                      type="button"
                      onClick={() => removeLocation(loc)}
                      className="text-muted-foreground hover:text-rose-400 ml-1"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex items-center space-x-2 max-w-sm">
                <input
                  type="text"
                  placeholder="Add location (e.g. Chicago, IL)..."
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button
                  type="button"
                  onClick={addLocation}
                  className="px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-xs font-medium"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Target Roles */}
            <div>
              <label className="block text-muted-foreground font-medium mb-1.5">
                Target Role Keywords
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {targetRoles.map((role) => (
                  <span
                    key={role}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-muted text-foreground border border-border/80 text-[11px]"
                  >
                    <span>{role}</span>
                    <button
                      type="button"
                      onClick={() => removeRole(role)}
                      className="text-muted-foreground hover:text-rose-400 ml-1"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex items-center space-x-2 max-w-sm">
                <input
                  type="text"
                  placeholder="Add role (e.g. Distributed Systems)..."
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button
                  type="button"
                  onClick={addRole}
                  className="px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-xs font-medium"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Notification Preferences & Telegram Wiring */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
          <div className="flex items-center space-x-2 font-semibold text-sm text-foreground">
            <Bell className="w-4 h-4 text-amber-400" />
            <span>Priority Scoring & Push Notification Alerts</span>
          </div>

          <div className="space-y-4 text-xs">
            {/* Priority Score Slider */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-muted-foreground font-medium">
                  Priority Score Push Threshold: <strong className="text-foreground text-sm">{priorityThreshold}/100</strong>
                </label>
                <span className="text-[11px] text-muted-foreground">Default: 70</span>
              </div>
              <input
                type="range"
                min="50"
                max="95"
                step="1"
                value={priorityThreshold}
                onChange={(e) => setPriorityThreshold(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-500 cursor-pointer h-2 bg-muted rounded-lg"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Opportunities with a composite score equal to or exceeding this number trigger a Telegram push message and an unread in-app alert.
              </p>
            </div>

            {/* Telegram Bot Credentials */}
            <div className="pt-2 border-t border-border/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-foreground flex items-center space-x-1.5">
                  <Send className="w-3.5 h-3.5 text-sky-400" />
                  <span>Telegram Bot Notification Setup</span>
                </span>
                <a
                  href="https://t.me/BotFather"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-primary hover:underline"
                >
                  Create Bot via @BotFather ↗
                </a>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1">Telegram Bot Token</label>
                  <input
                    type="password"
                    placeholder="e.g. 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                    value={telegramBotToken}
                    onChange={(e) => setTelegramBotToken(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-muted-foreground mb-1">Telegram Chat ID</label>
                  <input
                    type="text"
                    placeholder="e.g. 987654321"
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
                  />
                </div>
              </div>

              {/* Test Button & Result */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={testTelegram}
                  disabled={testingTelegram || telegramCooldown > 0}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 text-xs font-medium transition-colors disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-muted/50 disabled:border-border disabled:text-muted-foreground"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {testingTelegram
                      ? 'Sending Test Message...'
                      : telegramCooldown > 0
                      ? `Cooldown Active (${telegramCooldown}s)`
                      : 'Send Test Telegram Ping'}
                  </span>
                </button>

                {telegramTestResult && (
                  <span
                    className={`text-xs flex items-center space-x-1 ${
                      telegramTestResult.success ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {telegramTestResult.success ? (
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    )}
                    <span>{telegramTestResult.message}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Watchlist Management (Lightweight change detection) */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 font-semibold text-sm text-foreground">
              <Globe className="w-4 h-4 text-sky-400" />
              <span>Career Page & Government Portal Watchlist</span>
            </div>
            <span className="text-[11px] text-muted-foreground">Checked every 12 hours</span>
          </div>

          <p className="text-xs text-muted-foreground">
            OppHub periodically fetches these URLs, strips HTML, computes SHA-256 hashes, and alerts you via in-app notification and Telegram whenever changes occur.
          </p>

          <div className="space-y-2">
            {watchlist.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border/70 bg-background text-xs"
              >
                <div className="min-w-0 pr-3">
                  <div className="font-semibold text-foreground truncate">{item.label}</div>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-muted-foreground hover:text-primary transition-colors truncate block"
                  >
                    {item.url}
                  </a>
                </div>
                <button
                  type="button"
                  onClick={() => removeWatchlistTarget(item.id)}
                  className="p-1.5 rounded text-muted-foreground hover:text-rose-400 transition-colors"
                  title="Remove from watchlist"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {watchlistError && (
            <div className="flex items-center space-x-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{watchlistError}</span>
            </div>
          )}

          {/* Add to watchlist */}
          <div className="p-3 rounded-lg border border-dashed border-border bg-muted/20 space-y-2">
            <div className="text-xs font-medium text-foreground">Add New Target URL</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Portal Label (e.g. Jane Street Internships)"
                value={newWatchLabel}
                onChange={(e) => setNewWatchLabel(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <input
                type="url"
                placeholder="https://company.com/careers/interns"
                value={newWatchUrl}
                onChange={(e) => setNewWatchUrl(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <button
              type="button"
              onClick={addWatchlistTarget}
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add to Watchlist</span>
            </button>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-end p-4 rounded-xl border border-border bg-card shadow-sm sticky bottom-4 z-20 backdrop-blur-md">
          <div className="flex items-center space-x-3">
            {savedMessage && (
              <span className="text-xs text-emerald-400 font-medium flex items-center space-x-1 animate-in fade-in">
                <Check className="w-3.5 h-3.5" />
                <span>Preferences saved!</span>
              </span>
            )}

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save All Preferences'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
