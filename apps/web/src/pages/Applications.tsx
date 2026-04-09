import React, { useState } from 'react';

import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import ApplicationFilters from '../components/applications/ApplicationFilters';
import ApplicationRow from '../components/applications/ApplicationRow';

// Mock data - replace with actual backend API calls when ready
const mockApplications = [
  { id: 1, title: 'Software Engineer', company: 'Tech Corp', status: 'applied', type: 'full-time', created_date: new Date() },
  { id: 2, title: 'Frontend Developer', company: 'Web Inc', status: 'shortlisted', type: 'remote', created_date: new Date() },
  { id: 3, title: 'Full Stack Developer', company: 'StartUp', status: 'interview_scheduled', type: 'hybrid', created_date: new Date() },
];

export default function Applications() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const applications = mockApplications;
  const isLoading = false;

  const filtered = applications.filter(app => {
    const matchSearch = !search || 
      app.title?.toLowerCase().includes(search.toLowerCase()) ||
      app.company?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || app.status === statusFilter;
    const matchType = typeFilter === 'all' || app.type === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-heading font-bold">Applications</h1>
        <p className="text-muted-foreground text-sm mt-1">Track all your applications in one place.</p>
      </div>

      <ApplicationFilters
        search={search} setSearch={setSearch}
        statusFilter={statusFilter} setStatusFilter={setStatusFilter}
        typeFilter={typeFilter} setTypeFilter={setTypeFilter}
      />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card className="border-border/50 overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm">
              {applications.length === 0 ? 'No applications yet. Your AI agent will start applying based on your preferences!' : 'No applications match your filters.'}
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {filtered.map((app) => (
                <ApplicationRow key={app.id} app={app} />
              ))}
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}