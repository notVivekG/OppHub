import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString?: string | null): string {
  if (!dateString) return 'Ongoing / Not specified';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function getDaysRemaining(dateString?: string | null): number | null {
  if (!dateString) return null;
  try {
    const target = new Date(dateString).getTime();
    const now = new Date().getTime();
    const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    return diff;
  } catch {
    return null;
  }
}
