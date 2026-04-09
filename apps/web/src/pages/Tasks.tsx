import React, { useState } from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Circle, Calendar, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const priorityConfig = {
  low: { label: 'Low', class: 'bg-muted text-muted-foreground' },
  medium: { label: 'Med', class: 'bg-amber-500/10 text-amber-600' },
  high: { label: 'High', class: 'bg-destructive/10 text-destructive' },
};

const categoryConfig = {
  interview_prep: 'Interview Prep',
  document: 'Document',
  follow_up: 'Follow Up',
  skill_building: 'Skill Building',
  other: 'Other',
};

// Mock data
const mockTasks = [
  { id: 1, title: 'Prepare resume', priority: 'high', completed: false, due_date: new Date(Date.now() + 86400000).toISOString(), category: 'interview_prep' },
  { id: 2, title: 'Practice coding', priority: 'medium', completed: false, due_date: new Date(Date.now() + 172800000).toISOString(), category: 'skill_building' },
  { id: 3, title: 'Follow up with recruiter', priority: 'low', completed: true, due_date: new Date(Date.now() - 86400000).toISOString(), category: 'follow_up' },
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

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-heading font-bold">Tasks</h1>
          <p className="text-muted-foreground text-sm mt-1">{completedCount}/{tasks.length} completed</p>
        </div>
      </div>

      <Card className="border-border/50 p-4">
        <div className="flex gap-3">
          <Input
            placeholder="Add a new task..."
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="flex-1"
          />
          <Select value={newPriority} onValueChange={setNewPriority}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleAdd} disabled={!newTask.trim()}>
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>
      </Card>

      <div className="flex items-center gap-2">
        {['all', 'active', 'completed'].map(f => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter(f)}
            className="capitalize text-xs"
          >
            {f}
          </Button>
        ))}
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Card className="border-border/50 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm">
              {tasks.length === 0 ? 'No tasks yet. Add one above!' : 'No tasks match this filter.'}
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              <AnimatePresence>
                {filtered.map((task) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-5 py-4 flex items-center gap-4 group hover:bg-muted/30 transition-colors"
                  >
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={(checked) => handleToggle(task.id, checked as boolean)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-medium', task.completed && 'line-through text-muted-foreground')}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className={cn('text-[10px]', priorityConfig[task.priority]?.class)}>
                          {priorityConfig[task.priority]?.label}
                        </Badge>
                        {task.due_date && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />{format(new Date(task.due_date), 'MMM d')}
                          </span>
                        )}
                        {task.category && (
                          <span className="text-[10px] text-muted-foreground">
                            {categoryConfig[task.category] || task.category}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
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