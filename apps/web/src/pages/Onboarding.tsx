import React, { useState } from 'react';

import { useMutation } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Bot, ChevronRight, ChevronLeft, Upload, Sparkles, X, Plus } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import OnboardingStep from '../components/onboarding/OnboardingStep';
import { localStore } from '@/utils/localStorage';

const STEPS = ['Profile', 'Education', 'Skills & Experience', 'Preferences', 'Review'];

const WORK_MODES = ['Remote', 'Hybrid', 'On-site'];
const OPP_TYPES = ['Internship', 'Full-time Job', 'Part-time Job', 'Hackathon', 'Competition'];
const PLATFORMS = ['LinkedIn', 'Unstop', 'Internshala', 'AngelList', 'Indeed', 'Glassdoor', 'Wellfound', 'Devfolio'];
const SKILL_SUGGESTIONS = ['JavaScript', 'Python', 'React', 'Node.js', 'SQL', 'Machine Learning', 'Data Analysis', 'UI/UX Design', 'Java', 'C++', 'TypeScript', 'AWS', 'Docker', 'Git'];

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    full_name: '', email: '', phone: '', location: '', bio: '',
    resume_url: '', resume_filename: '',
    linkedin_url: '', github_url: '', portfolio_url: '',
    education: [{ institution: '', degree: '', field: '', gpa: '', start_year: '', end_year: '' }],
    skills: [], experience: [{ company: '', role: '', duration: '', description: '' }],
    preferences: {
      work_mode: [], preferred_locations: [], min_stipend: 0,
      opportunity_types: [], preferred_platforms: [],
      industries: [], roles_of_interest: [], auto_apply: true, daily_apply_limit: 10,
    },
  });
  const [newSkill, setNewSkill] = useState('');

  // ✅ replaced: db.entities.UserProfile.create(...)
  const saveMutation = useMutation({
    mutationFn: (profileData) => {
      return Promise.resolve(localStore.saveProfile(profileData));
    },
    onSuccess: () => onComplete(),
  });

  // ✅ replaced: db.integrations.Core.UploadFile(...)
  // Instead of uploading to a server we just store the filename and a
  // base64 data-URL in state so the rest of the UI keeps working.
  const uploadMutation = useMutation({
    mutationFn: (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ file_url: reader.result, filename: file.name });
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
    },
    onSuccess: ({ file_url, filename }) =>
      setData(d => ({ ...d, resume_url: file_url, resume_filename: filename })),
  });

  const update = (key, value) => setData(d => ({ ...d, [key]: value }));
  const updatePref = (key, value) => setData(d => ({ ...d, preferences: { ...d.preferences, [key]: value } }));
  const togglePref = (key, item) => {
    const arr = data.preferences[key] || [];
    updatePref(key, arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item]);
  };

  const handleResumeUpload = (e) => {
    const file = e.target.files[0];
    if (file) uploadMutation.mutate(file);
  };

  const addSkill = (skill) => {
    if (skill && !data.skills.includes(skill)) {
      update('skills', [...data.skills, skill]);
    }
    setNewSkill('');
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-body">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Bot className="w-7 h-7 text-primary" />
          </div>
          <h1 className="font-heading font-bold text-2xl">Welcome to ApplyAI</h1>
          <p className="text-muted-foreground text-sm mt-1">Let's set up your profile so your AI agent can apply on your behalf.</p>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((s, i) => (
              <span key={s} className={`text-xs font-medium ${i <= step ? 'text-primary' : 'text-muted-foreground'}`}>{s}</span>
            ))}
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        <Card className="border-border/50">
          <CardContent className="p-6">
            <AnimatePresence mode="wait">
              {step === 0 && (
                <OnboardingStep key="profile" title="Basic Information" subtitle="Tell us about yourself">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 sm:col-span-1">
                      <Label>Full Name *</Label>
                      <Input value={data.full_name} onChange={(e) => update('full_name', e.target.value)} placeholder="John Doe" className="mt-1" />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <Label>Email *</Label>
                      <Input value={data.email} onChange={(e) => update('email', e.target.value)} placeholder="john@example.com" className="mt-1" />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <Label>Phone</Label>
                      <Input value={data.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+91 98765 43210" className="mt-1" />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <Label>Location</Label>
                      <Input value={data.location} onChange={(e) => update('location', e.target.value)} placeholder="Mumbai, India" className="mt-1" />
                    </div>
                    <div className="col-span-2">
                      <Label>Bio</Label>
                      <Textarea value={data.bio} onChange={(e) => update('bio', e.target.value)} placeholder="Brief description about yourself..." className="mt-1 h-20" />
                    </div>
                    <div className="col-span-2">
                      <Label>Resume</Label>
                      <div className="mt-1 border-2 border-dashed border-border rounded-xl p-6 text-center">
                        {data.resume_url ? (
                          <div>
                            <p className="text-sm text-accent font-medium">✓ Resume loaded</p>
                            {/* ✅ show filename instead of a server URL */}
                            <p className="text-xs text-muted-foreground mt-1">{data.resume_filename}</p>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground mb-2">Upload your resume (PDF)</p>
                            <input type="file" accept=".pdf,.doc,.docx" onChange={handleResumeUpload} className="hidden" id="resume-upload" />
                            <Button variant="outline" size="sm" onClick={() => document.getElementById('resume-upload').click()} disabled={uploadMutation.isPending}>
                              {uploadMutation.isPending ? 'Reading...' : 'Choose File'}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <Label>LinkedIn URL</Label>
                      <Input value={data.linkedin_url} onChange={(e) => update('linkedin_url', e.target.value)} placeholder="linkedin.com/in/..." className="mt-1" />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <Label>GitHub URL</Label>
                      <Input value={data.github_url} onChange={(e) => update('github_url', e.target.value)} placeholder="github.com/..." className="mt-1" />
                    </div>
                  </div>
                </OnboardingStep>
              )}

              {step === 1 && (
                <OnboardingStep key="edu" title="Education" subtitle="Add your educational background">
                  {data.education.map((edu, i) => (
                    <div key={i} className="space-y-3 p-4 rounded-xl bg-muted/30 border border-border/50">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <Label className="text-xs">Institution</Label>
                          <Input value={edu.institution} onChange={(e) => {
                            const ed = [...data.education]; ed[i].institution = e.target.value; update('education', ed);
                          }} placeholder="University name" className="mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs">Degree</Label>
                          <Input value={edu.degree} onChange={(e) => {
                            const ed = [...data.education]; ed[i].degree = e.target.value; update('education', ed);
                          }} placeholder="B.Tech" className="mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs">Field of Study</Label>
                          <Input value={edu.field} onChange={(e) => {
                            const ed = [...data.education]; ed[i].field = e.target.value; update('education', ed);
                          }} placeholder="Computer Science" className="mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs">GPA</Label>
                          <Input value={edu.gpa} onChange={(e) => {
                            const ed = [...data.education]; ed[i].gpa = e.target.value; update('education', ed);
                          }} placeholder="8.5" className="mt-1" />
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <Label className="text-xs">Start Year</Label>
                            <Input value={edu.start_year} onChange={(e) => {
                              const ed = [...data.education]; ed[i].start_year = e.target.value; update('education', ed);
                            }} placeholder="2021" className="mt-1" />
                          </div>
                          <div className="flex-1">
                            <Label className="text-xs">End Year</Label>
                            <Input value={edu.end_year} onChange={(e) => {
                              const ed = [...data.education]; ed[i].end_year = e.target.value; update('education', ed);
                            }} placeholder="2025" className="mt-1" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => update('education', [...data.education, { institution: '', degree: '', field: '', gpa: '', start_year: '', end_year: '' }])}>
                    <Plus className="w-4 h-4 mr-1" /> Add Another
                  </Button>
                </OnboardingStep>
              )}

              {step === 2 && (
                <OnboardingStep key="skills" title="Skills & Experience" subtitle="What can you do?">
                  <div>
                    <Label className="font-medium mb-2 block">Skills</Label>
                    <div className="flex gap-2 mb-3">
                      <Input value={newSkill} onChange={(e) => setNewSkill(e.target.value)} placeholder="Add a skill..."
                        onKeyDown={(e) => e.key === 'Enter' && addSkill(newSkill)} />
                      <Button variant="outline" size="icon" onClick={() => addSkill(newSkill)}><Plus className="w-4 h-4" /></Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {data.skills.map(s => (
                        <Badge key={s} variant="secondary" className="text-xs gap-1">
                          {s} <X className="w-3 h-3 cursor-pointer" onClick={() => update('skills', data.skills.filter(x => x !== s))} />
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">Suggestions:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {SKILL_SUGGESTIONS.filter(s => !data.skills.includes(s)).map(s => (
                        <Badge key={s} variant="outline" className="text-[10px] cursor-pointer hover:bg-primary/10" onClick={() => addSkill(s)}>
                          + {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="mt-6">
                    <Label className="font-medium mb-3 block">Experience</Label>
                    {data.experience.map((exp, i) => (
                      <div key={i} className="space-y-3 p-4 rounded-xl bg-muted/30 border border-border/50 mb-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Company</Label>
                            <Input value={exp.company} onChange={(e) => {
                              const ex = [...data.experience]; ex[i].company = e.target.value; update('experience', ex);
                            }} placeholder="Company name" className="mt-1" />
                          </div>
                          <div>
                            <Label className="text-xs">Role</Label>
                            <Input value={exp.role} onChange={(e) => {
                              const ex = [...data.experience]; ex[i].role = e.target.value; update('experience', ex);
                            }} placeholder="Software Intern" className="mt-1" />
                          </div>
                          <div>
                            <Label className="text-xs">Duration</Label>
                            <Input value={exp.duration} onChange={(e) => {
                              const ex = [...data.experience]; ex[i].duration = e.target.value; update('experience', ex);
                            }} placeholder="3 months" className="mt-1" />
                          </div>
                          <div>
                            <Label className="text-xs">Description</Label>
                            <Input value={exp.description} onChange={(e) => {
                              const ex = [...data.experience]; ex[i].description = e.target.value; update('experience', ex);
                            }} placeholder="Brief description" className="mt-1" />
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => update('experience', [...data.experience, { company: '', role: '', duration: '', description: '' }])}>
                      <Plus className="w-4 h-4 mr-1" /> Add Experience
                    </Button>
                  </div>
                </OnboardingStep>
              )}

              {step === 3 && (
                <OnboardingStep key="prefs" title="Application Preferences" subtitle="Tell your AI agent what to look for">
                  <div className="space-y-5">
                    <div>
                      <Label className="font-medium mb-2 block">Work Mode</Label>
                      <div className="flex flex-wrap gap-2">
                        {WORK_MODES.map(m => (
                          <Badge key={m} variant={data.preferences.work_mode.includes(m) ? 'default' : 'outline'}
                            className="cursor-pointer text-xs px-3 py-1.5" onClick={() => togglePref('work_mode', m)}>
                            {m}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="font-medium mb-2 block">Opportunity Types</Label>
                      <div className="flex flex-wrap gap-2">
                        {OPP_TYPES.map(t => (
                          <Badge key={t} variant={data.preferences.opportunity_types.includes(t) ? 'default' : 'outline'}
                            className="cursor-pointer text-xs px-3 py-1.5" onClick={() => togglePref('opportunity_types', t)}>
                            {t}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="font-medium mb-2 block">Platforms</Label>
                      <div className="flex flex-wrap gap-2">
                        {PLATFORMS.map(p => (
                          <Badge key={p} variant={data.preferences.preferred_platforms.includes(p) ? 'default' : 'outline'}
                            className="cursor-pointer text-xs px-3 py-1.5" onClick={() => togglePref('preferred_platforms', p)}>
                            {p}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </OnboardingStep>
              )}

              {step === 4 && (
                <OnboardingStep key="review" title="All Set!" subtitle="Review your profile and let the AI agent take over">
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                      <div className="flex items-start gap-3">
                        <Sparkles className="w-5 h-5 text-primary mt-0.5" />
                        <div>
                          <p className="font-medium text-sm">Your AI agent is ready</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            It will start searching and applying to {data.preferences.opportunity_types.join(', ') || 'opportunities'} on {data.preferences.preferred_platforms.join(', ') || 'various platforms'} for you daily.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Name</p>
                        <p className="font-medium mt-0.5">{data.full_name || '—'}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Location</p>
                        <p className="font-medium mt-0.5">{data.location || '—'}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Skills</p>
                        <p className="font-medium mt-0.5">{data.skills.length} added</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Platforms</p>
                        <p className="font-medium mt-0.5">{data.preferences.preferred_platforms.length} selected</p>
                      </div>
                    </div>
                  </div>
                </OnboardingStep>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between mt-6">
          <Button variant="ghost" onClick={() => setStep(s => s - 1)} disabled={step === 0}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(s => s + 1)}>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={() => saveMutation.mutate(data)} disabled={saveMutation.isPending}>
              <Sparkles className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? 'Setting up...' : 'Launch Agent'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}