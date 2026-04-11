import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Save, X, Plus, Settings2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const WORK_MODES = ['Remote', 'Hybrid', 'On-site'];
const OPPORTUNITY_TYPES = ['Internship', 'Full-time Job', 'Part-time Job', 'Hackathon', 'Competition'];
const PLATFORMS = ['LinkedIn', 'Unstop', 'Internshala', 'AngelList', 'Indeed', 'Glassdoor', 'Wellfound'];
const UNSTOP_TYPES = ['Coding Challenge', 'Case Study', 'Quiz', 'Business Plan', 'Design Challenge', 'Hackathon'];

// Mock preferences mapped to UI state
const mockPreferences = {
  work_mode: ['Remote'], 
  preferred_locations: ['Bangalore', 'Mumbai', 'Remote'], 
  min_stipend: 50000,
  opportunity_types: ['Internship', 'Full-time Job'], 
  preferred_platforms: ['LinkedIn', 'Unstop'], 
  industries: ['Technology', 'Fintech', 'Web3'],
  roles_of_interest: ['Frontend Developer', 'Full Stack Developer', 'Software Engineer'], 
  auto_apply: true, 
  daily_apply_limit: 15,
  unstop_preferences: { competition_types: ['Coding Challenge', 'Hackathon'], prize_minimum: 10000 },
};

export default function Preferences() {
  const [prefs, setPrefs] = useState(mockPreferences);
  const [newLocation, setNewLocation] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newIndustry, setNewIndustry] = useState('');

  const handleSave = () => {
    toast.success('Preferences successfully updated!');
  };

  if (!prefs) return null;

  const toggleArray = (arr, item) => arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];
  const addToArray = (key, value, setter) => {
    if (!value.trim()) return;
    setPrefs(p => ({ ...p, [key]: [...(p[key] || []), value.trim()] }));
    setter('');
  };
  const removeFromArray = (key, value) => {
    setPrefs(p => ({ ...p, [key]: (p[key] || []).filter(x => x !== value) }));
  };

  return (
    <div className="space-y-6 max-w-4xl pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center glow-primary shadow-lg flex-shrink-0">
            <Settings2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-heading font-bold text-foreground">Preferences</h1>
            <p className="text-muted-foreground text-sm mt-1">Configure your AI agent's targeting parameters.</p>
          </div>
        </div>
        <Button onClick={handleSave} className="gradient-primary text-white border-0 glow-primary hover:opacity-90 transition-opacity h-10 px-6 shadow-lg sm:w-auto w-full">
          <Save className="w-4 h-4 mr-2" /> Save Changes
        </Button>
      </div>

      {/* Agent Control */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border/50 bg-muted/10">
            <h3 className="font-heading font-bold text-foreground">Automation Control</h3>
          </div>
          <CardContent className="p-6 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-primary/20 bg-primary/5">
              <div>
                <Label className="text-base font-bold text-foreground">Auto-Apply Engine</Label>
                <p className="text-sm text-muted-foreground mt-1">Allow EngiBuddy to automatically submit applications on your behalf.</p>
              </div>
              <Switch checked={prefs.auto_apply} onCheckedChange={(v) => setPrefs(p => ({ ...p, auto_apply: v }))} className="data-[state=checked]:bg-primary" />
            </div>
            
            <div className={!prefs.auto_apply ? "opacity-50 pointer-events-none transition-opacity" : ""}>
              <div className="flex items-center justify-between mb-4">
                <Label className="text-sm font-semibold text-foreground">Daily Application Limit</Label>
                <span className="text-xl font-heading font-bold text-primary">{prefs.daily_apply_limit}</span>
              </div>
              <Slider
                value={[prefs.daily_apply_limit || 15]}
                onValueChange={([v]) => setPrefs(p => ({ ...p, daily_apply_limit: v }))}
                min={1} max={50} step={1}
                className="py-2"
              />
              <p className="text-xs text-muted-foreground mt-3 font-medium">To avoid platform rate-limits, we recommend keeping this under 25/day.</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Work Preferences */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm h-full">
            <div className="px-6 py-4 border-b border-border/50 bg-muted/10">
              <h3 className="font-heading font-bold text-foreground">Role Specifications</h3>
            </div>
            <CardContent className="p-6 space-y-8">
              <div>
                <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-3 block">Work Mode</Label>
                <div className="flex flex-wrap gap-2">
                  {WORK_MODES.map(mode => (
                    <Badge
                      key={mode}
                      variant="outline"
                      className={`cursor-pointer px-4 py-2 transition-all ${prefs.work_mode?.includes(mode) ? 'bg-primary text-primary-foreground border-primary shadow-md' : 'bg-background/50 text-muted-foreground hover:bg-muted'}`}
                      onClick={() => setPrefs(p => ({ ...p, work_mode: toggleArray(p.work_mode || [], mode) }))}
                    >
                      {mode}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-3 block">Opportunity Types</Label>
                <div className="flex flex-wrap gap-2">
                  {OPPORTUNITY_TYPES.map(type => (
                    <Badge
                      key={type}
                      variant="outline"
                      className={`cursor-pointer px-4 py-2 transition-all ${prefs.opportunity_types?.includes(type) ? 'bg-primary text-primary-foreground border-primary shadow-md' : 'bg-background/50 text-muted-foreground hover:bg-muted'}`}
                      onClick={() => setPrefs(p => ({ ...p, opportunity_types: toggleArray(p.opportunity_types || [], type) }))}
                    >
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider block">Min. Stipend/Salary</Label>
                  <span className="text-sm font-bold text-emerald-400">₹{prefs.min_stipend?.toLocaleString() || 0}/mo</span>
                </div>
                <Slider
                  value={[prefs.min_stipend || 0]}
                  onValueChange={([v]) => setPrefs(p => ({ ...p, min_stipend: v }))}
                  min={0} max={150000} step={5000}
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-3 block">Target Locations</Label>
                <div className="flex gap-2 mb-3">
                  <Input value={newLocation} onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="e.g. Bangalore, Remote..." className="bg-background/50 border-border/50" 
                    onKeyDown={(e) => e.key === 'Enter' && addToArray('preferred_locations', newLocation, setNewLocation)} />
                  <Button variant="secondary" size="icon" onClick={() => addToArray('preferred_locations', newLocation, setNewLocation)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(prefs.preferred_locations || []).map(loc => (
                    <Badge key={loc} variant="secondary" className="px-3 py-1.5 text-xs bg-background border border-border/50">
                      {loc} <X className="w-3 h-3 ml-1.5 cursor-pointer hover:text-destructive transition-colors" onClick={() => removeFromArray('preferred_locations', loc)} />
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Roles & Industries */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm h-full">
            <div className="px-6 py-4 border-b border-border/50 bg-muted/10">
              <h3 className="font-heading font-bold text-foreground">Keywords & Targets</h3>
            </div>
            <CardContent className="p-6 space-y-8">
              <div>
                <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-3 block">Target Roles</Label>
                <div className="flex gap-2 mb-3">
                  <Input value={newRole} onChange={(e) => setNewRole(e.target.value)}
                    placeholder="e.g. Full Stack Developer..." className="bg-background/50 border-border/50" 
                    onKeyDown={(e) => e.key === 'Enter' && addToArray('roles_of_interest', newRole, setNewRole)} />
                  <Button variant="secondary" size="icon" onClick={() => addToArray('roles_of_interest', newRole, setNewRole)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(prefs.roles_of_interest || []).map(r => (
                    <Badge key={r} variant="secondary" className="px-3 py-1.5 text-xs bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20">
                      {r} <X className="w-3 h-3 ml-1.5 cursor-pointer hover:text-foreground transition-colors" onClick={() => removeFromArray('roles_of_interest', r)} />
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-3 block">Preferred Industries</Label>
                <div className="flex gap-2 mb-3">
                  <Input value={newIndustry} onChange={(e) => setNewIndustry(e.target.value)}
                    placeholder="e.g. Fintech, Web3..." className="bg-background/50 border-border/50"
                    onKeyDown={(e) => e.key === 'Enter' && addToArray('industries', newIndustry, setNewIndustry)} />
                  <Button variant="secondary" size="icon" onClick={() => addToArray('industries', newIndustry, setNewIndustry)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(prefs.industries || []).map(ind => (
                    <Badge key={ind} variant="secondary" className="px-3 py-1.5 text-xs bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20">
                      {ind} <X className="w-3 h-3 ml-1.5 cursor-pointer hover:text-foreground transition-colors" onClick={() => removeFromArray('industries', ind)} />
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Platforms */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border/50 bg-muted/10">
            <h3 className="font-heading font-bold text-foreground">Platform Integrations</h3>
          </div>
          <CardContent className="p-6 space-y-6">
            <div>
              <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-4 block">Active Data Sources</Label>
              <div className="flex flex-wrap gap-2.5">
                {PLATFORMS.map(p => (
                  <Badge
                    key={p}
                    variant="outline"
                    className={`cursor-pointer px-4 py-2 transition-all ${prefs.preferred_platforms?.includes(p) ? 'bg-primary text-primary-foreground border-primary shadow-md' : 'bg-background/50 text-muted-foreground hover:bg-muted'}`}
                    onClick={() => setPrefs(pr => ({ ...pr, preferred_platforms: toggleArray(pr.preferred_platforms || [], p) }))}
                  >
                    {p}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Unstop Specific Settings */}
            {prefs.preferred_platforms?.includes('Unstop') && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-4">
                <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border border-blue-500/20 space-y-6">
                  <h4 className="font-bold text-sm text-blue-400 uppercase tracking-wider">Unstop Optimization</h4>
                  
                  <div>
                    <Label className="text-xs text-foreground font-semibold mb-3 block">Competition Types</Label>
                    <div className="flex flex-wrap gap-2">
                      {UNSTOP_TYPES.map(t => (
                        <Badge
                          key={t}
                          variant="outline"
                          className={`cursor-pointer px-3 py-1.5 transition-all border ${prefs.unstop_preferences?.competition_types?.includes(t) ? 'bg-blue-500 text-white border-blue-500' : 'bg-background/50 text-muted-foreground hover:bg-muted/80 border-border/50'}`}
                          onClick={() => setPrefs(p => ({
                            ...p,
                            unstop_preferences: {
                              ...p.unstop_preferences,
                              competition_types: toggleArray(p.unstop_preferences?.competition_types || [], t),
                            },
                          }))}
                        >
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-xs text-foreground font-semibold">Minimum Prize Pool (₹)</Label>
                      <span className="text-sm font-bold text-blue-400">₹{prefs.unstop_preferences?.prize_minimum?.toLocaleString() || 0}</span>
                    </div>
                    <Slider
                      value={[prefs.unstop_preferences?.prize_minimum || 0]}
                      onValueChange={([v]) => setPrefs(p => ({
                        ...p,
                        unstop_preferences: { ...p.unstop_preferences, prize_minimum: v },
                      }))}
                      min={0} max={250000} step={5000}
                      className="py-2"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

