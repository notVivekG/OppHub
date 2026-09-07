'use client';

import * as React from 'react';
import { Application, ApplicationStatus } from '@/types';
import { 
  X, 
  Building2, 
  ExternalLink, 
  Calendar, 
  FileText, 
  User, 
  Trash2, 
  Check, 
  Clock, 
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import confetti from 'canvas-confetti';

interface ApplicationModalProps {
  application: Application | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updated: Application) => void;
  onDelete: (id: string) => void;
}

const STATUS_OPTIONS: { id: ApplicationStatus; label: string }[] = [
  { id: 'wishlist', label: 'Wishlist' },
  { id: 'applied', label: 'Applied' },
  { id: 'oa', label: 'Online Assessment (OA)' },
  { id: 'interview', label: 'Interviewing' },
  { id: 'offer', label: '🎉 Offer Received' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'withdrawn', label: 'Withdrawn' },
];

const RESUME_VARIANTS = [
  { id: 'res-base', label: 'Base Resume (General SWE)' },
  { id: 'res-backend', label: 'Backend Heavy (Go / Distributed Systems)' },
  { id: 'res-aiml', label: 'AI/ML Specialized (PyTorch / Data)' },
];

export function ApplicationModal({
  application,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
}: ApplicationModalProps) {
  const [status, setStatus] = React.useState<ApplicationStatus>('applied');
  const [resumeVersionId, setResumeVersionId] = React.useState<string>('res-base');
  const [notes, setNotes] = React.useState('');
  const [followUpDate, setFollowUpDate] = React.useState('');
  const [recruiterContact, setRecruiterContact] = React.useState('');
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    if (application) {
      setStatus(application.status);
      setResumeVersionId(application.resume_version_id || 'res-base');
      setNotes(application.notes || '');
      setFollowUpDate(
        application.follow_up_date ? application.follow_up_date.split('T')[0] : ''
      );
      setRecruiterContact(application.recruiter_contact || '');
    }
  }, [application]);

  if (!isOpen || !application) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const previousStatus = application.status;
    const updated: Application = {
      ...application,
      status,
      resume_version_id: resumeVersionId,
      notes,
      follow_up_date: followUpDate ? new Date(followUpDate).toISOString() : null,
      recruiter_contact: recruiterContact,
      updated_at: new Date().toISOString(),
    };

    if (previousStatus !== 'offer' && status === 'offer') {
      confetti({
        particleCount: 120,
        spread: 100,
        origin: { y: 0.5 },
        colors: ['#10b981', '#6366f1', '#f59e0b', '#ec4899'],
      });
    }

    onUpdate(updated);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 600);
  };

  const isFollowUpOverdue =
    followUpDate && new Date(followUpDate).getTime() < Date.now();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-start justify-between p-5 border-b border-border/80 bg-muted/20">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-foreground">
                {application.opportunity?.company || 'Company'}
              </h2>
              {application.opportunity?.url && (
                <a
                  href={application.opportunity.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  title="View original posting"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {application.opportunity?.title || 'Position'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
          {/* Status Selector */}
          <div>
            <label className="block font-medium text-muted-foreground mb-1.5">
              Pipeline Stage
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Resume Version Used */}
          <div>
            <label className="block font-medium text-muted-foreground mb-1.5 flex items-center space-x-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span>Resume Version Logged</span>
            </label>
            <select
              value={resumeVersionId}
              onChange={(e) => setResumeVersionId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
            >
              {RESUME_VARIANTS.map((res) => (
                <option key={res.id} value={res.id}>
                  {res.label}
                </option>
              ))}
            </select>
          </div>

          {/* Follow-up Date & Recruiter Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-muted-foreground mb-1.5 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>Next Follow-up Date</span>
              </label>
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              {isFollowUpOverdue && (
                <span className="text-[10px] text-rose-400 font-medium mt-1 flex items-center space-x-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>Follow-up is due!</span>
                </span>
              )}
            </div>

            <div>
              <label className="block font-medium text-muted-foreground mb-1.5 flex items-center space-x-1.5">
                <User className="w-3.5 h-3.5 text-sky-400" />
                <span>Recruiter / Referral Contact</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Jane Doe (LinkedIn/email)"
                value={recruiterContact}
                onChange={(e) => setRecruiterContact(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          {/* Notes Textarea */}
          <div>
            <label className="block font-medium text-muted-foreground mb-1.5">
              Interview Notes & Details
            </label>
            <textarea
              rows={4}
              placeholder="Record OA question types, technical round notes, recruiter check-ins, or offer compensation..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none leading-relaxed"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-border/80 flex items-center justify-between">
            <button
              type="button"
              onClick={() => onDelete(application.id)}
              className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center space-x-1"
              title="Delete application"
            >
              <Trash2 className="w-4 h-4" />
              <span>Remove</span>
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-border bg-muted/60 hover:bg-muted text-foreground font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow transition-all flex items-center space-x-1.5"
              >
                {saved ? <Check className="w-3.5 h-3.5" /> : null}
                <span>{saved ? 'Saved' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
