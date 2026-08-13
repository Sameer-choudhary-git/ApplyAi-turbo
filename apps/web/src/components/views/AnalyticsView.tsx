import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
  Line,
} from "recharts";
import { TrendingUp, Target, Award, Zap, Activity } from "lucide-react";

const chartColors = [
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#0ea5e9",
  "#f43f5e",
  "#6366f1",
];

const tooltipContentStyle = {
  backgroundColor: "rgba(9, 9, 11, 0.85)",
  backdropFilter: "blur(8px)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "8px",
  color: "#fff",
};

export default function Analytics({ applications = [], isLoading = false }) {
  // ?"??"? Derived stats ?"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"?

  const totalApplied = applications.length;

  const accepted = applications.filter((a) => a.status === "accepted").length;

  const shortlisted = applications.filter((a) =>
    ["shortlisted", "interview_scheduled", "accepted"].includes(a.status),
  ).length;

  const withProb = applications.filter((a) => a.success_probability > 0);
  const avgProb =
    withProb.length > 0
      ? Math.round(
          withProb.reduce((s, a) => s + a.success_probability, 0) /
            withProb.length,
        )
      : 0;

  // ?"??"? Status pie ?"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"?

  const statusCounts = applications.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(statusCounts).map(([name, value]) => ({
    name: name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    value,
  }));

  // ?"??"? Type bar ?"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"?

  const typeLabelMap = {
    job: "Full-Time",
    internship: "Internship",
    hackathon: "Hackathon",
  };

  const typeCounts = applications.reduce((acc, app) => {
    const label = typeLabelMap[app.type] ?? app.type ?? "Other";
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});

  const typeData = Object.entries(typeCounts).map(([name, count]) => ({
    name,
    count,
  }));

  // ?"??"? Platform bars ?"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"?

  const platformCounts = applications.reduce((acc, app) => {
    acc[app.platform ?? "Direct"] = (acc[app.platform ?? "Direct"] || 0) + 1;
    return acc;
  }, {});

  const platformData = Object.entries(platformCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // ?"??"? Daily trend ??" derived by grouping appliedAt ?"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"?
  // Groups applications by date (YYYY-MM-DD) and counts applied vs those that
  // got a positive response (shortlisted / interview_scheduled / accepted).
  // Shows the last 14 days with data, sorted ascending.

  const positiveStatuses = new Set([
    "shortlisted",
    "interview_scheduled",
    "accepted",
  ]);

  const dailyMap = applications.reduce((acc, app) => {
    const dateKey = new Date(app.appliedAt).toISOString().slice(0, 10);
    if (!acc[dateKey]) acc[dateKey] = { applied: 0, responses: 0 };
    acc[dateKey].applied += 1;
    if (positiveStatuses.has(app.status)) acc[dateKey].responses += 1;
    return acc;
  }, {});

  const trendData = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, counts]) => ({
      date: date.slice(5), // MM-DD
      ...counts,
    }));

  // ?"??"? Render ?"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"?

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center glow-primary shadow-lg flex-shrink-0">
          <Activity className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl lg:text-3xl font-heading font-bold text-foreground">
            Analytics
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track your application performance and AI agent trends.
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: Target,
            label: "Total Applied",
            value: totalApplied,
            color: "text-violet-400 bg-violet-500/10 border-violet-500/20",
          },
          {
            icon: Award,
            label: "Accepted",
            value: accepted,
            color: "text-sky-300 bg-sky-400/10 border-sky-400/20",
          },
          {
            icon: TrendingUp,
            label: "Shortlisted",
            value: shortlisted,
            color: "text-sky-400 bg-sky-500/10 border-sky-500/20",
          },
          {
            icon: Zap,
            label: "Avg Match Score",
            value: `${avgProb}%`,
            color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="p-5 border-border/50 bg-card/50 backdrop-blur-sm transition-all hover:bg-card/80">
              <div className="flex items-center gap-3.5">
                <div className={`p-2.5 rounded-xl border ${stat.color}`}>
                  <stat.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-heading font-bold mt-0.5 text-foreground">
                    {stat.value}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden h-full">
            <div className="px-6 py-4 border-b border-border/50 bg-muted/10">
              <h3 className="font-heading font-bold text-foreground">
                Application Trend
              </h3>
            </div>
            <CardContent className="p-5">
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart
                    data={trendData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="colorApplied"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#8b5cf6"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#8b5cf6"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.05)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12, fill: "rgba(255,255,255,0.5)" }}
                      stroke="transparent"
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "rgba(255,255,255,0.5)" }}
                      stroke="transparent"
                    />
                    <Tooltip
                      contentStyle={tooltipContentStyle}
                      itemStyle={{ color: "#fff" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="applied"
                      name="Sent"
                      stroke="#8b5cf6"
                      fill="url(#colorApplied)"
                      strokeWidth={3}
                    />
                    <Line
                      type="monotone"
                      dataKey="responses"
                      name="Replies"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#10b981", strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground font-medium">
                  Data will appear as your agent applies daily
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Status Pie */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden h-full">
            <div className="px-6 py-4 border-b border-border/50 bg-muted/10">
              <h3 className="font-heading font-bold text-foreground">
                Status Breakdown
              </h3>
            </div>
            <CardContent className="p-5">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={chartColors[i % chartColors.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipContentStyle}
                      itemStyle={{ color: "#fff" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground font-medium">
                  No data yet
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Type Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden h-full">
            <div className="px-6 py-4 border-b border-border/50 bg-muted/10">
              <h3 className="font-heading font-bold text-foreground">
                Opportunity Types
              </h3>
            </div>
            <CardContent className="p-5">
              {typeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={typeData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.05)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12, fill: "rgba(255,255,255,0.5)" }}
                      stroke="transparent"
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 12, fill: "rgba(255,255,255,0.5)" }}
                      stroke="transparent"
                    />
                    <Tooltip
                      contentStyle={tooltipContentStyle}
                      cursor={{ fill: "rgba(255,255,255,0.05)" }}
                    />
                    <Bar
                      dataKey="count"
                      name="Count"
                      radius={[4, 4, 0, 0]}
                      barSize={40}
                    >
                      {typeData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={chartColors[(i + 3) % chartColors.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground font-medium">
                  No data yet
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Platform Progress Bars */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden h-full">
            <div className="px-6 py-4 border-b border-border/50 bg-muted/10">
              <h3 className="font-heading font-bold text-foreground">
                Top Platforms
              </h3>
            </div>
            <CardContent className="p-6 space-y-5">
              {platformData.length > 0 ? (
                platformData.map((p, i) => (
                  <div key={p.name} className="flex items-center gap-4">
                    <span className="text-sm font-semibold text-foreground w-24 truncate">
                      {p.name}
                    </span>
                    <div className="flex-1 h-2.5 bg-muted/50 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: `${(p.count / (platformData[0]?.count || 1)) * 100}%`,
                        }}
                        transition={{ duration: 1, delay: 0.4 }}
                        className="h-full rounded-full"
                        style={{
                          backgroundColor: chartColors[i % chartColors.length],
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground font-bold w-6 text-right">
                      {p.count}
                    </span>
                  </div>
                ))
              ) : (
                <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground font-medium">
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
