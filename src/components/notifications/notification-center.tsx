'use client';

import * as React from 'react';
import { Bell, Check, CheckCheck, Sparkles, Clock, AlertTriangle, Briefcase, ExternalLink } from 'lucide-react';
import { Notification, NotificationType } from '@/types';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';

const DEMO_NOTIFICATIONS: Notification[] = [
  {
    id: 'demo-notif-1',
    type: 'new_opportunity',
    title: 'High Match Role Discovered',
    body: 'Stripe posted SWE Intern - Infrastructure (92% Match with your Base Resume).',
    related_id: 'demo-opp-1',
    read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(), // 35 min ago
  },
  {
    id: 'demo-notif-2',
    type: 'deadline_soon',
    title: 'Deadline Alert: 13 Days Remaining',
    body: 'HackMIT 2026 registration closes on Sep 20. Application requires team submission.',
    related_id: 'demo-opp-4',
    read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(), // 3 hours ago
  },
  {
    id: 'demo-notif-3',
    type: 'new_opportunity',
    title: 'New Remote Opportunity',
    body: 'Figma posted Frontend Engineering Intern (94% Match).',
    related_id: 'demo-opp-3',
    read: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
  },
];

export function NotificationCenter() {
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [filter, setFilter] = React.useState<'all' | 'unread'>('all');
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Initialize notifications
  React.useEffect(() => {
    const isConfigured = isSupabaseConfigured();
    if (!isConfigured) {
      // Local demo mode: load from localStorage or initial demo data
      const saved = localStorage.getItem('opphub-notifications');
      if (saved) {
        try {
          setNotifications(JSON.parse(saved));
        } catch {
          setNotifications(DEMO_NOTIFICATIONS);
        }
      } else {
        setNotifications(DEMO_NOTIFICATIONS);
      }
    } else {
      // Fetch from Supabase
      const supabase = getSupabaseClient();
      if (supabase) {
        supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(30)
          .then(({ data, error }) => {
            if (!error && data) {
              setNotifications(data);
            } else {
              setNotifications(DEMO_NOTIFICATIONS);
            }
          });

        // Setup Realtime subscription
        const channel = supabase
          .channel('notifications-changes')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'notifications' },
            (payload) => {
              setNotifications((prev) => [payload.new as Notification, ...prev]);
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      }
    }
  }, []);

  // Save changes locally in demo mode
  const updateNotifications = (updated: Notification[]) => {
    setNotifications(updated);
    if (!isSupabaseConfigured()) {
      localStorage.setItem('opphub-notifications', JSON.stringify(updated));
    }
  };

  const markAsRead = async (id: string) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    updateNotifications(updated);

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      await supabase.from('notifications').update({ read: true }).eq('id', id);
    }
  };

  const markAllAsRead = async () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    updateNotifications(updated);

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      await supabase.from('notifications').update({ read: true }).eq('read', false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filteredNotifications = filter === 'unread' ? notifications.filter((n) => !n.read) : notifications;

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'new_opportunity':
        return <Sparkles className="w-4 h-4 text-emerald-400" />;
      case 'deadline_soon':
        return <Clock className="w-4 h-4 text-amber-400" />;
      case 'watchlist_change':
        return <AlertTriangle className="w-4 h-4 text-sky-400" />;
      case 'follow_up_due':
        return <Briefcase className="w-4 h-4 text-indigo-400" />;
      default:
        return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg bg-card/60 hover:bg-card border border-border/80 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
        title="Notifications"
        aria-label="Open notifications"
      >
        <Bell className="w-4 h-4 text-foreground/80" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[1rem] px-1 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-semibold text-white shadow-sm ring-2 ring-background animate-in fade-in">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-sm sm:w-96 rounded-xl border border-border bg-card/95 backdrop-blur-md shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between p-3.5 border-b border-border/60 bg-muted/30">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-sm">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-[11px] font-medium rounded-md bg-indigo-500/20 text-indigo-400">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setFilter(filter === 'all' ? 'unread' : 'all')}
                className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded transition-colors"
              >
                {filter === 'all' ? 'Unread only' : 'Show all'}
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[380px] overflow-y-auto divide-y divide-border/40">
            {filteredNotifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No {filter === 'unread' ? 'unread' : ''} notifications
              </div>
            ) : (
              filteredNotifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3.5 text-xs transition-colors flex items-start space-x-3 ${
                    n.read ? 'opacity-70 hover:opacity-100 bg-card' : 'bg-indigo-500/5 hover:bg-indigo-500/10'
                  }`}
                >
                  <div className="mt-0.5 p-1.5 rounded-md bg-muted/60 flex-shrink-0">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-medium text-foreground truncate">{n.title}</span>
                      <span className="text-[10px] text-muted-foreground ml-2 flex-shrink-0">
                        {formatTimeAgo(n.created_at)}
                      </span>
                    </div>
                    <p className="text-muted-foreground line-clamp-2 leading-relaxed">{n.body}</p>
                  </div>
                  {!n.read && (
                    <button
                      onClick={() => markAsRead(n.id)}
                      className="p-1 text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                      title="Mark as read"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="p-2.5 border-t border-border/60 bg-muted/20 text-center">
            <span className="text-[11px] text-muted-foreground">
              {isSupabaseConfigured() ? '⚡ Realtime connected' : '💡 Demo Mode (Local notifications)'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
