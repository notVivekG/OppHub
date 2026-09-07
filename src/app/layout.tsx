import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Navbar } from '@/components/layout/navbar';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'OppHub — Personal Internship & Opportunity Command Center',
  description: 'Automated internship and hackathon aggregation, real-time alerts, ATS-proof resume tailoring, and pipeline analytics.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body className={`${inter.variable} min-h-screen flex flex-col font-sans bg-background text-foreground selection:bg-primary/20 selection:text-primary`}>
        <ThemeProvider>
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
            {children}
          </main>
          <footer className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground bg-card/20">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
              <div>
                OppHub © {new Date().getFullYear()} — Built for personal zero-cost productivity
              </div>
              <div className="flex items-center space-x-4 text-[11px]">
                <a 
                  href="https://github.com/SimplifyJobs/Summer2026-Internships" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  SimplifyJobs Source
                </a>
                <span>·</span>
                <span className="text-muted-foreground/60">No auto-apply, ever</span>
              </div>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
