'use client';

import * as React from 'react';
import { 
  JsonResume, 
  JsonResumeWork, 
  JsonResumeEducation, 
  JsonResumeSkill, 
  JsonResumeProject 
} from '@/types';
import { 
  User, 
  Briefcase, 
  GraduationCap, 
  Wrench, 
  FolderGit2, 
  Plus, 
  Trash2, 
  Check, 
  ChevronRight,
  ListPlus
} from 'lucide-react';

interface ResumeEditorProps {
  resume: JsonResume;
  onChange: (updated: JsonResume) => void;
}

export function ResumeEditor({ resume, onChange }: ResumeEditorProps) {
  const [activeTab, setActiveTab] = React.useState<'basics' | 'work' | 'education' | 'skills' | 'projects'>('work');

  // Basics Handlers
  const handleBasicsChange = (field: string, value: any) => {
    const next = {
      ...resume,
      basics: {
        ...resume.basics,
        [field]: value,
      },
    };
    onChange(next);
  };

  const handleLocationChange = (field: string, value: string) => {
    const next = {
      ...resume,
      basics: {
        ...resume.basics,
        location: {
          ...resume.basics?.location,
          [field]: value,
        },
      },
    };
    onChange(next);
  };

  // Work Handlers
  const addWork = () => {
    const newWork: JsonResumeWork = {
      name: 'New Company',
      position: 'Software Engineer Intern',
      startDate: '2024-06',
      endDate: '2024-08',
      summary: '',
      highlights: ['Engineered scalable microservices handling 5,000+ daily requests.'],
    };
    onChange({
      ...resume,
      work: [newWork, ...(resume.work || [])],
    });
  };

  const updateWork = (index: number, updated: Partial<JsonResumeWork>) => {
    const list = [...(resume.work || [])];
    list[index] = { ...list[index], ...updated };
    onChange({ ...resume, work: list });
  };

  const removeWork = (index: number) => {
    const list = [...(resume.work || [])];
    list.splice(index, 1);
    onChange({ ...resume, work: list });
  };

  const addHighlight = (workIndex: number) => {
    const list = [...(resume.work || [])];
    const highlights = [...(list[workIndex].highlights || []), 'Engineered and shipped new feature increasing conversion by 15%.'];
    list[workIndex] = { ...list[workIndex], highlights };
    onChange({ ...resume, work: list });
  };

  const updateHighlight = (workIndex: number, hlIndex: number, text: string) => {
    const list = [...(resume.work || [])];
    const highlights = [...(list[workIndex].highlights || [])];
    highlights[hlIndex] = text;
    list[workIndex] = { ...list[workIndex], highlights };
    onChange({ ...resume, work: list });
  };

  const removeHighlight = (workIndex: number, hlIndex: number) => {
    const list = [...(resume.work || [])];
    const highlights = [...(list[workIndex].highlights || [])];
    highlights.splice(hlIndex, 1);
    list[workIndex] = { ...list[workIndex], highlights };
    onChange({ ...resume, work: list });
  };

  // Education Handlers
  const addEducation = () => {
    const newEdu: JsonResumeEducation = {
      institution: 'University',
      area: 'Computer Science',
      studyType: 'Bachelor of Science',
      startDate: '2022-09',
      endDate: '2026-06',
      score: '3.8 / 4.0',
      courses: [],
    };
    onChange({
      ...resume,
      education: [...(resume.education || []), newEdu],
    });
  };

  const updateEducation = (index: number, updated: Partial<JsonResumeEducation>) => {
    const list = [...(resume.education || [])];
    list[index] = { ...list[index], ...updated };
    onChange({ ...resume, education: list });
  };

  const removeEducation = (index: number) => {
    const list = [...(resume.education || [])];
    list.splice(index, 1);
    onChange({ ...resume, education: list });
  };

  // Skills Handlers
  const addSkillCategory = () => {
    const newSkill: JsonResumeSkill = {
      name: 'Technical Skills',
      keywords: ['TypeScript', 'Python', 'Docker'],
    };
    onChange({
      ...resume,
      skills: [...(resume.skills || []), newSkill],
    });
  };

  const updateSkill = (index: number, name: string, keywordsStr: string) => {
    const list = [...(resume.skills || [])];
    const keywords = keywordsStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    list[index] = { ...list[index], name, keywords };
    onChange({ ...resume, skills: list });
  };

  const removeSkill = (index: number) => {
    const list = [...(resume.skills || [])];
    list.splice(index, 1);
    onChange({ ...resume, skills: list });
  };

  // Project Handlers
  const addProject = () => {
    const newProj: JsonResumeProject = {
      name: 'New Project',
      description: 'Full-stack application built with modern architecture.',
      highlights: ['Implemented REST APIs and optimized database queries.'],
      keywords: ['Next.js', 'PostgreSQL', 'Docker'],
    };
    onChange({
      ...resume,
      projects: [...(resume.projects || []), newProj],
    });
  };

  const updateProject = (index: number, updated: Partial<JsonResumeProject>) => {
    const list = [...(resume.projects || [])];
    list[index] = { ...list[index], ...updated };
    onChange({ ...resume, projects: list });
  };

  const removeProject = (index: number) => {
    const list = [...(resume.projects || [])];
    list.splice(index, 1);
    onChange({ ...resume, projects: list });
  };

  const addProjectHighlight = (projIndex: number) => {
    const list = [...(resume.projects || [])];
    const highlights = [...(list[projIndex].highlights || []), 'Built and deployed scalable application.'];
    list[projIndex] = { ...list[projIndex], highlights };
    onChange({ ...resume, projects: list });
  };

  const updateProjectHighlight = (projIndex: number, hlIndex: number, text: string) => {
    const list = [...(resume.projects || [])];
    const highlights = [...(list[projIndex].highlights || [])];
    highlights[hlIndex] = text;
    list[projIndex] = { ...list[projIndex], highlights };
    onChange({ ...resume, projects: list });
  };

  const removeProjectHighlight = (projIndex: number, hlIndex: number) => {
    const list = [...(resume.projects || [])];
    const highlights = [...(list[projIndex].highlights || [])];
    highlights.splice(hlIndex, 1);
    list[projIndex] = { ...list[projIndex], highlights };
    onChange({ ...resume, projects: list });
  };

  return (
    <div className="space-y-4">
      {/* Editor Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border/60 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('work')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
            activeTab === 'work'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>Experience ({resume.work?.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('skills')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
            activeTab === 'skills'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>Skills ({resume.skills?.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('projects')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
            activeTab === 'projects'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <FolderGit2 className="w-3.5 h-3.5" />
          <span>Projects ({resume.projects?.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('education')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
            activeTab === 'education'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5" />
          <span>Education ({resume.education?.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('basics')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
            activeTab === 'basics'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Basics</span>
        </button>
      </div>

      {/* 1. Basics Tab */}
      {activeTab === 'basics' && (
        <div className="rounded-xl border border-border bg-card/60 p-4 space-y-4">
          <div className="text-xs font-semibold text-foreground">Contact & Profile Information</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-muted-foreground mb-1">Full Name</label>
              <input
                type="text"
                value={resume.basics?.name || ''}
                onChange={(e) => handleBasicsChange('name', e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div>
              <label className="block text-muted-foreground mb-1">Professional Title / Headline</label>
              <input
                type="text"
                value={resume.basics?.label || ''}
                onChange={(e) => handleBasicsChange('label', e.target.value)}
                placeholder="e.g. Computer Science Student / Backend Engineer"
                className="w-full px-3 py-1.5 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div>
              <label className="block text-muted-foreground mb-1">Email</label>
              <input
                type="email"
                value={resume.basics?.email || ''}
                onChange={(e) => handleBasicsChange('email', e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div>
              <label className="block text-muted-foreground mb-1">Phone</label>
              <input
                type="text"
                value={resume.basics?.phone || ''}
                onChange={(e) => handleBasicsChange('phone', e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div>
              <label className="block text-muted-foreground mb-1">City, State</label>
              <input
                type="text"
                value={resume.basics?.location?.city || ''}
                onChange={(e) => handleLocationChange('city', e.target.value)}
                placeholder="Seattle, WA"
                className="w-full px-3 py-1.5 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div>
              <label className="block text-muted-foreground mb-1">Portfolio / GitHub URL</label>
              <input
                type="url"
                value={resume.basics?.url || ''}
                onChange={(e) => handleBasicsChange('url', e.target.value)}
                placeholder="https://github.com/username"
                className="w-full px-3 py-1.5 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          <div className="text-xs">
            <label className="block text-muted-foreground mb-1">Professional Summary</label>
            <textarea
              rows={3}
              value={resume.basics?.summary || ''}
              onChange={(e) => handleBasicsChange('summary', e.target.value)}
              placeholder="Brief overview of technical focus and career goals..."
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>
      )}

      {/* 2. Work Experience Tab */}
      {activeTab === 'work' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Work & Internship Experience ({resume.work?.length || 0})
            </span>
            <button
              type="button"
              onClick={addWork}
              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Role</span>
            </button>
          </div>

          {(resume.work || []).map((job, jIdx) => (
            <div key={jIdx} className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 text-xs">
                  <div>
                    <label className="block text-muted-foreground text-[11px] mb-1">Company</label>
                    <input
                      type="text"
                      value={job.name || ''}
                      onChange={(e) => updateWork(jIdx, { name: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div>
                    <label className="block text-muted-foreground text-[11px] mb-1">Title / Position</label>
                    <input
                      type="text"
                      value={job.position || ''}
                      onChange={(e) => updateWork(jIdx, { position: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div>
                    <label className="block text-muted-foreground text-[11px] mb-1">Start Date</label>
                    <input
                      type="text"
                      value={job.startDate || ''}
                      onChange={(e) => updateWork(jIdx, { startDate: e.target.value })}
                      placeholder="YYYY-MM"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-muted-foreground text-[11px] mb-1">End Date</label>
                    <input
                      type="text"
                      value={job.endDate || ''}
                      onChange={(e) => updateWork(jIdx, { endDate: e.target.value })}
                      placeholder="YYYY-MM or Present"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeWork(jIdx)}
                  className="p-1.5 rounded text-muted-foreground hover:text-rose-400 transition-colors"
                  title="Remove this role"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Bullet Points */}
              <div className="pt-2 border-t border-border/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-foreground">Bullet Points (Impact & Wins)</span>
                  <button
                    type="button"
                    onClick={() => addHighlight(jIdx)}
                    className="text-[11px] text-primary hover:underline flex items-center space-x-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Bullet</span>
                  </button>
                </div>

                <div className="space-y-1.5">
                  {(job.highlights || []).map((bullet, bIdx) => (
                    <div key={bIdx} className="flex items-start space-x-1.5">
                      <span className="text-muted-foreground mt-2">•</span>
                      <textarea
                        rows={2}
                        value={bullet}
                        onChange={(e) => updateHighlight(jIdx, bIdx, e.target.value)}
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 leading-relaxed"
                      />
                      <button
                        type="button"
                        onClick={() => removeHighlight(jIdx, bIdx)}
                        className="p-1 rounded text-muted-foreground hover:text-rose-400 mt-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. Skills Tab */}
      {activeTab === 'skills' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Technical Skill Categories</span>
            <button
              type="button"
              onClick={addSkillCategory}
              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Category</span>
            </button>
          </div>

          {(resume.skills || []).map((skill, sIdx) => (
            <div key={sIdx} className="rounded-xl border border-border bg-card/60 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  value={skill.name || ''}
                  onChange={(e) => updateSkill(sIdx, e.target.value, (skill.keywords || []).join(', '))}
                  placeholder="Category (e.g. Languages, Frameworks)"
                  className="font-semibold text-xs px-2.5 py-1 rounded-lg bg-background border border-border text-foreground w-48 focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button
                  type="button"
                  onClick={() => removeSkill(sIdx)}
                  className="p-1.5 rounded text-muted-foreground hover:text-rose-400"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div>
                <label className="block text-muted-foreground text-[10px] mb-1">
                  Comma-separated keywords (e.g. TypeScript, React, PostgreSQL)
                </label>
                <input
                  type="text"
                  value={(skill.keywords || []).join(', ')}
                  onChange={(e) => updateSkill(sIdx, skill.name || '', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. Projects Tab */}
      {activeTab === 'projects' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Key Technical Projects</span>
            <button
              type="button"
              onClick={addProject}
              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Project</span>
            </button>
          </div>

          {(resume.projects || []).map((proj, pIdx) => (
            <div key={pIdx} className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 text-xs">
                  <div>
                    <label className="block text-muted-foreground text-[11px] mb-1">Project Name</label>
                    <input
                      type="text"
                      value={proj.name || ''}
                      onChange={(e) => updateProject(pIdx, { name: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div>
                    <label className="block text-muted-foreground text-[11px] mb-1">Project URL / Repository</label>
                    <input
                      type="text"
                      value={proj.url || ''}
                      onChange={(e) => updateProject(pIdx, { url: e.target.value })}
                      placeholder="https://github.com/..."
                      className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeProject(pIdx)}
                  className="p-1.5 rounded text-muted-foreground hover:text-rose-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs">
                <label className="block text-muted-foreground text-[11px] mb-1">
                  Tech Stack (Comma-separated)
                </label>
                <input
                  type="text"
                  value={(proj.keywords || []).join(', ')}
                  onChange={(e) =>
                    updateProject(pIdx, {
                      keywords: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="Go, Raft, gRPC, Docker"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              {/* Project Bullets */}
              <div className="pt-2 border-t border-border/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-foreground">Project Highlights</span>
                  <button
                    type="button"
                    onClick={() => addProjectHighlight(pIdx)}
                    className="text-[11px] text-primary hover:underline flex items-center space-x-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Bullet</span>
                  </button>
                </div>

                <div className="space-y-1.5">
                  {(proj.highlights || []).map((bullet, bIdx) => (
                    <div key={bIdx} className="flex items-start space-x-1.5">
                      <span className="text-muted-foreground mt-2">•</span>
                      <textarea
                        rows={2}
                        value={bullet}
                        onChange={(e) => updateProjectHighlight(pIdx, bIdx, e.target.value)}
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 leading-relaxed"
                      />
                      <button
                        type="button"
                        onClick={() => removeProjectHighlight(pIdx, bIdx)}
                        className="p-1 rounded text-muted-foreground hover:text-rose-400 mt-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. Education Tab */}
      {activeTab === 'education' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Education & Degrees</span>
            <button
              type="button"
              onClick={addEducation}
              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Education</span>
            </button>
          </div>

          {(resume.education || []).map((edu, eIdx) => (
            <div key={eIdx} className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 text-xs">
                  <div>
                    <label className="block text-muted-foreground text-[11px] mb-1">Institution</label>
                    <input
                      type="text"
                      value={edu.institution || ''}
                      onChange={(e) => updateEducation(eIdx, { institution: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div>
                    <label className="block text-muted-foreground text-[11px] mb-1">Major / Area</label>
                    <input
                      type="text"
                      value={edu.area || ''}
                      onChange={(e) => updateEducation(eIdx, { area: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div>
                    <label className="block text-muted-foreground text-[11px] mb-1">Degree Type</label>
                    <input
                      type="text"
                      value={edu.studyType || ''}
                      onChange={(e) => updateEducation(eIdx, { studyType: e.target.value })}
                      placeholder="Bachelor of Science"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div>
                    <label className="block text-muted-foreground text-[11px] mb-1">GPA / Score</label>
                    <input
                      type="text"
                      value={edu.score || ''}
                      onChange={(e) => updateEducation(eIdx, { score: e.target.value })}
                      placeholder="3.85 / 4.00"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-muted-foreground text-[11px] mb-1">Start Date</label>
                    <input
                      type="text"
                      value={edu.startDate || ''}
                      onChange={(e) => updateEducation(eIdx, { startDate: e.target.value })}
                      placeholder="YYYY-MM"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-muted-foreground text-[11px] mb-1">End Date (Expected)</label>
                    <input
                      type="text"
                      value={edu.endDate || ''}
                      onChange={(e) => updateEducation(eIdx, { endDate: e.target.value })}
                      placeholder="YYYY-MM"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeEducation(eIdx)}
                  className="p-1.5 rounded text-muted-foreground hover:text-rose-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
