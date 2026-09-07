'use client';

import * as React from 'react';
import Link from 'next/link';
import { ShieldCheck, Mail, ArrowRight, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = React.useState('');
  const [sent, setSent] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isConfigured, setIsConfigured] = React.useState(false);

  React.useEffect(() => {
    setIsConfigured(isSupabaseConfigured());
  }, []);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    if (!isConfigured) {
      // Simulate login in demo mode
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        setSent(true);
      }, 700);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not initialized');

      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (authError) throw authError;
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send magic link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <div className="rounded-2xl border border-border bg-card/90 backdrop-blur-md p-6 sm:p-8 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Sign in to OppHub</h1>
          <p className="text-xs text-muted-foreground">
            Enter your email to receive a passwordless magic link.
          </p>
        </div>

        {!isConfigured && (
          <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold">Demo Mode Active:</strong> Supabase credentials not found in{' '}
              <code className="px-1 py-0.2 rounded bg-amber-950/60 font-mono text-[10px]">.env.local</code>. Submitting below will simulate authentication so you can test the user flow immediately.
            </div>
          </div>
        )}

        {sent ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Check your inbox</h3>
            <p className="text-xs text-muted-foreground">
              {isConfigured
                ? `We sent a magic link to ${email}. Click the link to log into your OppHub dashboard.`
                : `Simulated magic link dispatched to ${email}. You are ready to explore!`}
            </p>
            <Link
              href="/"
              className="inline-flex items-center space-x-1.5 mt-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              <span>Back to Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <form onSubmit={handleMagicLink} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-foreground mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <span>Sending magic link...</span>
              ) : (
                <>
                  <span>Send Magic Link</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        )}

        <div className="pt-4 border-t border-border/50 text-center">
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            ← Continue browsing as guest
          </Link>
        </div>
      </div>
    </div>
  );
}
