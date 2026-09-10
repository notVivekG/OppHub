import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Opportunity } from '@/types';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { calculatePriorityScore } from '@/lib/scoring';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const remote = searchParams.get('remote');
  const query = searchParams.get('q')?.toLowerCase();
  const sort = searchParams.get('sort') || 'discovered';
  const showExpired = searchParams.get('show_expired') === 'true';

  const supabase = getSupabaseAdmin();

  // 1. If Supabase is live and configured, query Supabase
  if (supabase) {
    try {
      let queryBuilder = supabase.from('opportunities').select('*');

      if (type && type !== 'all') {
        queryBuilder = queryBuilder.eq('type', type);
      }
      if (remote === 'true') {
        queryBuilder = queryBuilder.eq('remote', true);
      }
      if (query) {
        queryBuilder = queryBuilder.or(`company.ilike.%${query}%,title.ilike.%${query}%,location.ilike.%${query}%`);
      }

      const { data, error } = await queryBuilder.limit(150);

      if (!error && data && data.length > 0) {
        // Compute scoring and expiration for each item
        let scored = data.map((item: any) => {
          const breakdown = calculatePriorityScore({
            type: item.type,
            matchScore: item.match_score || 75,
            deadline: item.deadline,
            remote: item.remote,
            location: item.location,
            company: item.company,
            title: item.title,
          });

          // An opportunity is expired if its deadline has passed and it is not an open-ended contribution
          const isExpired = item.type !== 'contribution' &&
            Boolean(item.deadline) &&
            new Date(item.deadline).getTime() < Date.now();

          return {
            ...item,
            priority_score: item.priority_score || breakdown.finalScore,
            score_breakdown: breakdown,
            is_expired: isExpired,
          };
        });

        // Filter expired items out of default view unless explicitly requested
        if (!showExpired) {
          scored = scored.filter((item: any) => !item.is_expired);
        }

        if (sort === 'priority') {
          scored.sort((a: any, b: any) => (b.priority_score || 0) - (a.priority_score || 0));
        } else if (sort === 'deadline') {
          scored.sort((a: any, b: any) => {
            if (!a.deadline) return 1;
            if (!b.deadline) return -1;
            return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
          });
        } else {
          scored.sort(
            (a: any, b: any) =>
              new Date(b.date_discovered).getTime() - new Date(a.date_discovered).getTime()
          );
        }

        return NextResponse.json({
          opportunities: scored,
          count: scored.length,
          isDemo: false,
        });
      }
    } catch (err) {
      console.warn('Supabase query failed, falling back to local seed data:', err);
    }
  }

  // 2. Graceful fallback: Local Seed JSON
  try {
    const seedPath = path.resolve(process.cwd(), 'src/data/seed-opportunities.json');
    if (fs.existsSync(seedPath)) {
      const fileContent = fs.readFileSync(seedPath, 'utf8');
      let items: (Opportunity & { isDemo?: boolean; score_breakdown?: any })[] = JSON.parse(fileContent);

      // Label as demo items & compute priority scores + expiration
      items = items.map((item) => {
        const breakdown = calculatePriorityScore({
          type: item.type,
          matchScore: item.match_score || 75,
          deadline: item.deadline,
          remote: item.remote,
          location: item.location,
          company: item.company,
          title: item.title,
        });

        // An opportunity is expired if its deadline has passed and it is not an open-ended contribution
        const isExpired = item.type !== 'contribution' &&
          Boolean(item.deadline) &&
          new Date(item.deadline).getTime() < Date.now();

        return {
          ...item,
          priority_score: item.priority_score || breakdown.finalScore,
          score_breakdown: breakdown,
          is_expired: isExpired,
          isDemo: true,
        };
      });

      // Apply filters
      if (type && type !== 'all') {
        items = items.filter((o) => o.type === type);
      }
      if (remote === 'true') {
        items = items.filter((o) => o.remote === true);
      }
      if (query) {
        items = items.filter(
          (o) =>
            o.company.toLowerCase().includes(query) ||
            o.title.toLowerCase().includes(query) ||
            (o.location && o.location.toLowerCase().includes(query)) ||
            (o.tech_stack && o.tech_stack.some((t) => t.toLowerCase().includes(query)))
        );
      }

      // Filter expired items out of default view unless explicitly requested
      if (!showExpired) {
        items = items.filter((o) => !o.is_expired);
      }

      // Sort
      if (sort === 'priority') {
        items.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));
      } else if (sort === 'deadline') {
        items.sort((a, b) => {
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        });
      } else {
        items.sort(
          (a, b) => new Date(b.date_discovered).getTime() - new Date(a.date_discovered).getTime()
        );
      }

      return NextResponse.json({
        opportunities: items,
        count: items.length,
        isDemo: true,
      });
    }
  } catch (err) {
    console.error('Error reading local seed data:', err);
  }

  return NextResponse.json({
    opportunities: [],
    count: 0,
    isDemo: true,
  });
}
