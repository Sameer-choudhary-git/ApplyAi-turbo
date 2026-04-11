import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Calendar, Trash2, CheckSquare, SearchX } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const priorityConfig = {
  low: { label: 'Low', class: 'bg-muted/50 text-muted-foreground border-border/50' },
  medium: { label: 'Medium', class: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  high: { label: 'High', class: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
};

const categoryConfig = {
  interview_prep: 'Interview Prep',
  document: 'Document',
  follow_up: 'Follow Up',
  skill_building: 'Skill Building',
  other: 'Other',
};

const mockTasks = [
  { id: 1, title: 'Update Resume with React Projects', priority: 'high', completed: false, due_date: new Date(Date.now() + 86400000).toISOString(), category: 'document' },
  { id: 2, title: 'Practice System Design (Rate Limiter)', priority: 'medium', completed: false, due_date: new Date(Date.now() + 172800000).toISOString(), category: 'skill_building' },
  { id: 3, title: 'Send Thank You email to Google recruiter', priority: 'low', completed: true, due_date: new Date(Date.now() - 86400000).toISOString(), category: 'follow_up' },
];

export default function Tasks() {
  const [tasks, setTasks] = useState(mockTasks);
  const [newTask, setNewTask] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [filter, setFilter] = useState('all');

  const handleAdd = () => {
    if (!newTask.trim()) return;
    const newTaskObj = {
      id: Math.max(...tasks.map(t => t.id), 0) + 1,
      title: newTask,
      priority: newPriority,
      completed: false,
      category: 'other',
    };
    setTasks([newTaskObj, ...tasks]);
    setNewTask('');
  };

  const handleToggle = (id: number, completed: boolean) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed } : t));
  };

  const handleDelete = (id: number) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const filtered = tasks.filter(t => {
    if (filter === 'active') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  const completedCount = tasks.filter(t => t.completed).length;
  const progress = tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100);

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center glow-primary shadow-lg flex-shrink-0">
            <CheckSquare className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-heading font-bold text-foreground">Task Manager</h1>
            <p className="text-muted-foreground text-sm mt-1">Organize your preparation and follow-ups.</p>
          </div>
        </div>
        <div className="hidden sm:flex flex-col items-end">
           <span className="text-sm font-bold text-primary">{progress}% Complete</span>
           <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden mt-1.5">
             <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
           </div>
        </div>
      </div>

      {/* Add Task Input */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="border-border/50 bg-card/60 backdrop-blur-md p-2 flex flex-col sm:flex-row gap-2 shadow-sm">
          <Input
            placeholder="What needs to be done?"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="flex-1 bg-background/50 border-0 h-11 focus-visible:ring-1 focus-visible:ring-primary/30 text-base"
          />
          <div className="flex gap-2">
            <Select value={newPriority} onValueChange={setNewPriority}>
              <SelectTrigger className="w-[110px] h-11 bg-background/50 border-border/50 font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background/95 backdrop-blur-xl border-border/50">
                <SelectItem value="low">Low Pri</SelectItem>
                <SelectItem value="medium">Med Pri</SelectItem>
                <SelectItem value="high">High Pri</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleAdd} disabled={!newTask.trim()} className="h-11 px-5 gradient-primary text-white border-0 shadow-md hover:opacity-90 transition-opacity">
              <Plus className="w-4 h-4 mr-1.5" /> Add
            </Button>
          </div>
        </Card>
      </motion.div>

      {/* Filters */}
      <div className="flex items-center gap-2 p-1.5 rounded-lg bg-card/50 backdrop-blur-sm border border-border/50 w-fit">
        {['all', 'active', 'completed'].map(f => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter(f)}
            className={cn("capitalize text-xs font-semibold px-4 transition-all", filter === f && "bg-background text-foreground shadow-sm hover:bg-background")}
          >
            {f}
          </Button>
        ))}
      </div>

      {/* Tasks List */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="border-border/50 bg-card/40 backdrop-blur-sm overflow-hidden min-h-[300px]">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center h-full">
              <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mb-4 border border-border/50">
                 {filter === 'all' ? <CheckSquare className="w-6 h-6 text-muted-foreground/60" /> : <SearchX className="w-6 h-6 text-muted-foreground/60" />}
              </div>
              <p className="font-semibold text-foreground text-lg">
                {filter === 'all' ? "You're all caught up!" : "No matching tasks"}
              </p>
              <p className="text-sm text-muted-foreground mt-1 max-w-[250px]">
                {filter === 'all' ? 'Add a new task above to keep your preparation on track.' : 'Try changing your filter to see your tasks.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              <AnimatePresence initial={false}>
                {filtered.map((task) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      "px-6 py-4 flex items-center gap-4 group hover:bg-muted/20 transition-colors",
                      task.completed && "bg-muted/10 opacity-70"
                    )}
                  >
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={(checked) => handleToggle(task.id, checked as boolean)}
                      className="w-5 h-5 rounded-md data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-semibold text-foreground transition-all duration-300', task.completed && 'line-through text-muted-foreground')}>
                        {task.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge variant="outline" className={cn('text-[10px] uppercase font-bold tracking-wider px-2', priorityConfig[task.priority]?.class)}>
                          {priorityConfig[task.priority]?.label}
                        </Badge>
                        {task.due_date && (
                          <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5 bg-background/50 px-2 py-0.5 rounded-md border border-border/50">
                            <Calendar className="w-3 h-3" />{format(new Date(task.due_date), 'MMM d')}
                          </span>
                        )}
                        {task.category && task.category !== 'other' && (
                          <span className="text-[11px] text-muted-foreground font-medium bg-background/50 px-2 py-0.5 rounded-md border border-border/50">
                            {categoryConfig[task.category] || task.category}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10"
                      onClick={() => handleDelete(task.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}