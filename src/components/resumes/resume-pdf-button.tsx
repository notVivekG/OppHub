'use client';

import * as React from 'react';
import { Download, Loader2, FileDown } from 'lucide-react';
import { JsonResume } from '@/types';
import { ResumePdfDocument } from './resume-pdf-document';

interface ResumePdfButtonProps {
  resume: JsonResume;
  label?: string;
  className?: string;
}

export function ResumePdfButton({ resume, label = 'resume', className = '' }: ResumePdfButtonProps) {
  const [generating, setGenerating] = React.useState(false);

  const handleExportPdf = async () => {
    if (generating) return;
    setGenerating(true);

    try {
      // Dynamic import to guarantee client-only execution
      const { pdf } = await import('@react-pdf/renderer');
      const blob = await pdf(<ResumePdfDocument resume={resume} />).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const sanitizedLabel = label.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const filename = `${resume.basics?.name?.toLowerCase().replace(/\s+/g, '-') || 'resume'}-${sanitizedLabel}.pdf`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('PDF generation failed:', err);
      alert('Failed to generate PDF. Please check console for details.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleExportPdf}
      disabled={generating}
      className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted/70 hover:border-indigo-500/40 text-xs font-medium text-foreground transition-all disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
      title="Export clean ATS-friendly PDF"
    >
      {generating ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
          <span>Generating PDF...</span>
        </>
      ) : (
        <>
          <FileDown className="w-3.5 h-3.5 text-indigo-400" />
          <span>Export PDF</span>
        </>
      )}
    </button>
  );
}
