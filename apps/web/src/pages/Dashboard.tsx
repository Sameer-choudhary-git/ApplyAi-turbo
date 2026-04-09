import React from 'react';

import { Send, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import StatCard from '../components/dashboard/StatCard';
import DailySummaryCard from '../components/dashboard/DailySummaryCard';
import RecentApplications from '../components/dashboard/RecentApplications';
import UpcomingInterviews from '../components/dashboard/UpcomingInterviews';
import AgentStatus from '../components/dashboard/AgentStatus';

// Mock data - replace with actual backend API calls when ready
const mockApplications = [
  { id: 1, status: 'shortlisted', created_date: new Date() },
  { id: 2, status: 'applied', created_date: new Date() },
  { id: 3, status: 'interview_scheduled', created_date: new Date() },
];

const mockProfile = {
  id: 1,
  full_name: 'John Doe',
  created_date: new Date(),
};

const mockSummary = {
  id: 1,
  date: new Date(),
};

export default function Dashboard() {
  const applications = mockApplications;
  const profiles = [mockProfile];
  const summaries = [mockSummary];

  const profile = profiles[0];
  const todaySummary = summaries[0];

  const totalApplied = applications.length;
  const shortlisted = applications.filter(a => ['shortlisted', 'interview_scheduled', 'accepted'].includes(a.status)).length;
  const pending = applications.filter(a => ['applied', 'under_review'].includes(a.status)).length;
  const successRate = totalApplied > 0 ? Math.round((shortlisted / totalApplied) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 px-6 py-5" style={{ background: 'linear-gradient(135deg, hsla(258,92%,68%,0.12) 0%, hsla(234,32%,7%,1) 60%, hsla(172,85%,48%,0.08) 100%)' }}>
        <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-6 -bottom-6 w-32 h-32 rounded-full bg-accent/10 blur-2xl pointer-events-none" />
        <div className="relative">
          <p className="text-xs text-primary/70 font-semibold uppercase tracking-widest mb-1">AI Agent Platform</p>
          <h1 className="text-2xl lg:text-3xl font-heading font-bold">
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}
            {profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Your AI agent is actively applying. Here's today's snapshot.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Send} label="Total Applied" value={totalApplied} sublabel="All time" color="primary" delay={0} />
        <StatCard icon={CheckCircle2} label="Shortlisted" value={shortlisted} sublabel={`${successRate}% rate`} color="accent" delay={0.05} />
        <StatCard icon={Clock} label="Pending" value={pending} sublabel="Awaiting response" color="warning" delay={0.1} />
        <StatCard icon={TrendingUp} label="Success Rate" value={`${successRate}%`} sublabel="Overall" color="blue" delay={0.15} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <DailySummaryCard summary={todaySummary} />
          <RecentApplications applications={applications} />
        </div>
        <div className="space-y-6">
          <AgentStatus profile={profile} />
          <UpcomingInterviews applications={applications} />
        </div>
      </div>
    </div>
  );
}