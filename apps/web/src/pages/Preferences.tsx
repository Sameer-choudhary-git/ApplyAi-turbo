import React, { useState, useEffect } from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Save, X, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const WORK_MODES = ['Remote', 'Hybrid', 'On-site'];
const OPPORTUNITY_TYPES = ['Internship', 'Full-time Job', 'Part-time Job', 'Hackathon', 'Competition'];
const PLATFORMS = ['LinkedIn', 'Unstop', 'Internshala', 'AngelList', 'Indeed', 'Glassdoor', 'Wellfound', 'Devfolio', 'HackerEarth'];
const UNSTOP_TYPES = ['Coding Challenge', 'Case Study', 'Quiz', 'Business Plan', 'Design Challenge', 'Hackathon'];

// Mock preferences
const mockPreferences = {
  work_mode: ['Remote'], 
  preferred_locations: ['Bangalore', 'Mumbai'], 
  min_stipend: 50000,
  opportunity_types: ['Internship', 'Full-time Job'], 
  preferred_platforms: ['LinkedIn', 'Unstop'], 
  industries: ['Technology', 'Finance'],
  roles_of_interest: ['Frontend Developer', 'Full Stack Developer'], 
  auto_apply: true, 
  daily_apply_limit: 10,
  unstop_preferences: { competition_types: ['Coding Challenge'], team_size_preference: 'any', prize_minimum: 0 },
};

export default function Preferences() {
  const [prefs, setPrefs] = useState(mockPreferences);
  const [newLocation, setNewLocation] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newIndustry, setNewIndustry] = useState('');

  const handleSave = () => {
    toast.success('Preferences saved!');
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
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-heading font-bold">Preferences</h1>
          <p className="text-muted-foreground text-sm mt-1">Customize how your AI agent searches and applies.</p>
        </div>
       <Button onClick={handleSave}>
           <Save className="w-4 h-4 mr-2" />Save
         </Button>
      </div>

      {/* Agent Control */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-border/50">
          <div className="px-6 py-4 border-b border-border/50">
            <h3 className="font-heading font-bold">Agent Control</h3>
          </div>
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Auto Apply</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Let the agent apply automatically</p>
              </div>
              <Switch checked={prefs.auto_apply} onCheckedChange={(v) => setPrefs(p => ({ ...p, auto_apply: v }))} />
            </div>
            <div>
              <Label className="font-medium">Daily Application Limit: {prefs.daily_apply_limit}</Label>
              <Slider
                value={[prefs.daily_apply_limit || 10]}
                onValueChange={([v]) => setPrefs(p => ({ ...p, daily_apply_limit: v }))}
                min={1} max={50} step={1}
                className="mt-3"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Work Preferences */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className="border-border/50">
          <div className="px-6 py-4 border-b border-border/50">
            <h3 className="font-heading font-bold">Work Preferences</h3>
          </div>
          <CardContent className="p-6 space-y-6">
            <div>
              <Label className="font-medium mb-3 block">Work Mode</Label>
              <div className="flex flex-wrap gap-2">
                {WORK_MODES.map(mode => (
                  <Badge
                    key={mode}
                    variant={prefs.work_mode?.includes(mode) ? 'default' : 'outline'}
                    className="cursor-pointer text-xs px-3 py-1.5 transition-all"
                    onClick={() => setPrefs(p => ({ ...p, work_mode: toggleArray(p.work_mode || [], mode) }))}
                  >
                    {mode}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <Label className="font-medium mb-3 block">Opportunity Types</Label>
              <div className="flex flex-wrap gap-2">
                {OPPORTUNITY_TYPES.map(type => (
                  <Badge
                    key={type}
                    variant={prefs.opportunity_types?.includes(type) ? 'default' : 'outline'}
                    className="cursor-pointer text-xs px-3 py-1.5 transition-all"
                    onClick={() => setPrefs(p => ({ ...p, opportunity_types: toggleArray(p.opportunity_types || [], type) }))}
                  >
                    {type}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <Label className="font-medium">Minimum Stipend (₹/month): {prefs.min_stipend?.toLocaleString() || 0}</Label>
              <Slider
                value={[prefs.min_stipend || 0]}
                onValueChange={([v]) => setPrefs(p => ({ ...p, min_stipend: v }))}
                min={0} max={100000} step={1000}
                className="mt-3"
              />
            </div>
            <div>
              <Label className="font-medium mb-2 block">Preferred Locations</Label>
              <div className="flex gap-2 mb-2">
                <Input value={newLocation} onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="Add location..." onKeyDown={(e) => e.key === 'Enter' && addToArray('preferred_locations', newLocation, setNewLocation)} />
                <Button variant="outline" size="icon" onClick={() => addToArray('preferred_locations', newLocation, setNewLocation)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(prefs.preferred_locations || []).map(loc => (
                  <Badge key={loc} variant="secondary" className="text-xs gap-1">
                    {loc}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => removeFromArray('preferred_locations', loc)} />
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Platforms */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="border-border/50">
          <div className="px-6 py-4 border-b border-border/50">
            <h3 className="font-heading font-bold">Platforms</h3>
          </div>
          <CardContent className="p-6 space-y-6">
            <div>
              <Label className="font-medium mb-3 block">Active Platforms</Label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map(p => (
                  <Badge
                    key={p}
                    variant={prefs.preferred_platforms?.includes(p) ? 'default' : 'outline'}
                    className="cursor-pointer text-xs px-3 py-1.5 transition-all"
                    onClick={() => setPrefs(pr => ({ ...pr, preferred_platforms: toggleArray(pr.preferred_platforms || [], p) }))}
                  >
                    {p}
                  </Badge>
                ))}
              </div>
            </div>

            {prefs.preferred_platforms?.includes('Unstop') && (
              <div className="p-4 rounded-xl bg-muted/50 border border-border/50 space-y-4">
                <h4 className="font-medium text-sm">Unstop Preferences</h4>
                <div>
                  <Label className="text-xs mb-2 block">Competition Types</Label>
                  <div className="flex flex-wrap gap-2">
                    {UNSTOP_TYPES.map(t => (
                      <Badge
                        key={t}
                        variant={prefs.unstop_preferences?.competition_types?.includes(t) ? 'default' : 'outline'}
                        className="cursor-pointer text-[10px] px-2 py-1 transition-all"
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
                  <Label className="text-xs">Min Prize (₹): {prefs.unstop_preferences?.prize_minimum?.toLocaleString() || 0}</Label>
                  <Slider
                    value={[prefs.unstop_preferences?.prize_minimum || 0]}
                    onValueChange={([v]) => setPrefs(p => ({
                      ...p,
                      unstop_preferences: { ...p.unstop_preferences, prize_minimum: v },
                    }))}
                    min={0} max={500000} step={5000}
                    className="mt-2"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Roles & Industries */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card className="border-border/50">
          <div className="px-6 py-4 border-b border-border/50">
            <h3 className="font-heading font-bold">Roles & Industries</h3>
          </div>
          <CardContent className="p-6 space-y-6">
            <div>
              <Label className="font-medium mb-2 block">Target Roles</Label>
              <div className="flex gap-2 mb-2">
                <Input value={newRole} onChange={(e) => setNewRole(e.target.value)}
                  placeholder="e.g. Frontend Developer" onKeyDown={(e) => e.key === 'Enter' && addToArray('roles_of_interest', newRole, setNewRole)} />
                <Button variant="outline" size="icon" onClick={() => addToArray('roles_of_interest', newRole, setNewRole)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(prefs.roles_of_interest || []).map(r => (
                  <Badge key={r} variant="secondary" className="text-xs gap-1">
                    {r} <X className="w-3 h-3 cursor-pointer" onClick={() => removeFromArray('roles_of_interest', r)} />
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <Label className="font-medium mb-2 block">Preferred Industries</Label>
              <div className="flex gap-2 mb-2">
                <Input value={newIndustry} onChange={(e) => setNewIndustry(e.target.value)}
                  placeholder="e.g. Fintech" onKeyDown={(e) => e.key === 'Enter' && addToArray('industries', newIndustry, setNewIndustry)} />
                <Button variant="outline" size="icon" onClick={() => addToArray('industries', newIndustry, setNewIndustry)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(prefs.industries || []).map(ind => (
                  <Badge key={ind} variant="secondary" className="text-xs gap-1">
                    {ind} <X className="w-3 h-3 cursor-pointer" onClick={() => removeFromArray('industries', ind)} />
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="flex justify-end pb-8">
         <Button onClick={handleSave} size="lg">
           <Save className="w-4 h-4 mr-2" />Save All Preferences
         </Button>
       </div>
    </div>
  );
}