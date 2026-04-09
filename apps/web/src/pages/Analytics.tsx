import React from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Area, AreaChart } from 'recharts';
import { TrendingUp, Target, Award, Zap } from 'lucide-react';

// Mock data
const mockApplications = [
  { id: 1, status: 'applied', type: 'full-time', platform: 'LinkedIn', success_probability: 75 },
  { id: 2, status: 'shortlisted', type: 'remote', platform: 'LinkedIn', success_probability: 85 },
  { id: 3, status: 'interview_scheduled', type: 'hybrid', platform: 'Indeed', success_probability: 90 },
  { id: 4, status: 'accepted', type: 'full-time', platform: 'Direct', success_probability: 100 },
];

const mockSummaries = [
  { date: '2024-01-01', applications_sent: 5, responses_received: 2 },
  { date: '2024-01-02', applications_sent: 8, responses_received: 3 },
  { date: '2024-01-03', applications_sent: 6, responses_received: 1 },
];

export default function Analytics() {
  const applications = mockApplications;
  const summaries = mockSummaries;

  // Status breakdown
  const statusCounts = applications.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(statusCounts).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }));
  const pieColors = ['hsl(252,85%,60%)', 'hsl(170,75%,45%)', 'hsl(35,95%,55%)', 'hsl(200,80%,55%)', 'hsl(120,60%,45%)', 'hsl(0,75%,60%)', 'hsl(225,10%,60%)'];

  // Type breakdown
  const typeCounts = applications.reduce((acc, app) => {
    acc[app.type || 'other'] = (acc[app.type || 'other'] || 0) + 1;
    return acc;
  }, {});
  const typeData = Object.entries(typeCounts).map(([name, count]) => ({ name, count }));

  // Platform breakdown
  const platformCounts = applications.reduce((acc, app) => {
    acc[app.platform || 'Direct'] = (acc[app.platform || 'Direct'] || 0) + 1;
    return acc;
  }, {});
  const platformData = Object.entries(platformCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Daily trend from summaries
  const trendData = summaries.slice().reverse().map(s => ({
    date: s.date?.slice(5) || '',
    applied: s.applications_sent || 0,
    responses: s.responses_received || 0,
  }));

  const totalApplied = applications.length;
  const accepted = applications.filter(a => a.status === 'accepted').length;
  const shortlisted = applications.filter(a => ['shortlisted', 'interview_scheduled', 'accepted'].includes(a.status)).length;
  const avgSuccess = applications.filter(a => a.success_probability > 0);
  const avgProb = avgSuccess.length > 0 ? Math.round(avgSuccess.reduce((s, a) => s + a.success_probability, 0) / avgSuccess.length) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-heading font-bold">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Track your application performance and trends.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Target, label: 'Total Applied', value: totalApplied, color: 'text-primary bg-primary/10' },
          { icon: Award, label: 'Accepted', value: accepted, color: 'text-green-500 bg-green-500/10' },
          { icon: TrendingUp, label: 'Shortlisted', value: shortlisted, color: 'text-accent bg-accent/10' },
          { icon: Zap, label: 'Avg Match Score', value: `${avgProb}%`, color: 'text-orange-500 bg-orange-500/10' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="p-5 border-border/50">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${stat.color}`}>
                  <stat.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-xl font-heading font-bold">{stat.value}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-border/50">
            <div className="px-6 py-4 border-b border-border/50">
              <h3 className="font-heading font-bold">Application Trend</h3>
            </div>
            <CardContent className="p-4">
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="colorApplied" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(252,85%,60%)" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="hsl(252,85%,60%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(225,15%,90%)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(225,10%,50%)" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(225,10%,50%)" />
                    <Tooltip />
                    <Area type="monotone" dataKey="applied" stroke="hsl(252,85%,60%)" fill="url(#colorApplied)" strokeWidth={2} />
                    <Line type="monotone" dataKey="responses" stroke="hsl(170,75%,45%)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
                  Data will appear as your agent applies daily
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="border-border/50">
            <div className="px-6 py-4 border-b border-border/50">
              <h3 className="font-heading font-bold">Status Breakdown</h3>
            </div>
            <CardContent className="p-4">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={pieColors[i % pieColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
                  No data yet
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-border/50">
            <div className="px-6 py-4 border-b border-border/50">
              <h3 className="font-heading font-bold">By Type</h3>
            </div>
            <CardContent className="p-4">
              {typeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={typeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(225,15%,90%)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(225,10%,50%)" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(225,10%,50%)" />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(252,85%,60%)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
                  No data yet
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card className="border-border/50">
            <div className="px-6 py-4 border-b border-border/50">
              <h3 className="font-heading font-bold">Top Platforms</h3>
            </div>
            <CardContent className="p-4 space-y-3">
              {platformData.length > 0 ? (
                platformData.map((p, i) => (
                  <div key={p.name} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-24 truncate">{p.name}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${(p.count / (platformData[0]?.count || 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground font-medium w-8 text-right">{p.count}</span>
                  </div>
                ))
              ) : (
                <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">
                  No data yet
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}