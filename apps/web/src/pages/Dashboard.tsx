import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/supabaseClient";
import { Send, CheckCircle2, Clock, TrendingUp, Loader2 } from "lucide-react";

import StatCard from "../components/dashboard/StatCard";
import DailySummaryCard from "../components/dashboard/DailySummaryCard";
import RecentApplications from "../components/dashboard/RecentApplications";
import UpcomingInterviews from "../components/dashboard/UpcomingInterviews";
import AgentStatus from "../components/dashboard/AgentStatus";

export default function Dashboard() {
  const { user } = useAuth();

  // Fetch real profile from the cache initialized in AppShell
  const { data: profile, isLoading } = useQuery({
    queryKey: ["userProfile", user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const { data, error } = await supabase
        .from("users")
        .select("*, preferences:user_preferences(*)")
        .eq("email", user.email)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.email,
  });

  // TODO: Replace with real applications fetch once your backend supports it
  const applications = [];
  const summaries = {
    applications_sent: profile?.queueCountToday || 0,
    responses_received: 0,
    interviews_scheduled: 0,
    ai_insights:
      "Your agent is calibrated and scanning for new opportunities matching your preferences.",
    highlights: ["Profile Optimization Complete"],
  };

  const totalApplied = applications.length;
  const shortlisted = applications.filter((a) =>
    ["shortlisted", "interview_scheduled", "accepted"].includes(a.status),
  ).length;
  const pending = applications.filter((a) =>
    ["applied", "under_review"].includes(a.status),
  ).length;
  const successRate =
    totalApplied > 0 ? Math.round((shortlisted / totalApplied) * 100) : 0;

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Get first name safely based on Prisma schema 'fullName'
  const firstName = profile?.fullName
    ? profile.fullName.split(" ")[0]
    : "Engineer";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Welcome Banner */}
      {/* Replace the top banner in Dashboard.tsx with this tightened version */}
      <div
        className="relative overflow-hidden rounded-2xl border border-violet-500/20 px-6 py-6"
        style={{
          background:
            "linear-gradient(135deg, hsla(258,92%,68%,0.15) 0%, hsla(234,32%,10%,1) 60%, hsla(172,85%,48%,0.1) 100%)",
        }}
      >
        <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-6 -bottom-6 w-40 h-40 rounded-full bg-accent/20 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <p className="text-[10px] text-primary/80 font-bold uppercase tracking-widest mb-1.5">
            EngiBuddy Dashboard
          </p>
          <h1 className="text-2xl lg:text-3xl font-heading font-extrabold text-white">
            Good {greeting}, {firstName} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-1.5 max-w-xl">
            Your automated career agent is online. We are actively matching and
            applying to roles based on your latest preferences.
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Send}
          label="Total Applied"
          value={totalApplied}
          sublabel="Lifetime applications"
          color="primary"
          delay={0}
        />
        <StatCard
          icon={CheckCircle2}
          label="Shortlisted"
          value={shortlisted}
          sublabel={`${successRate}% success rate`}
          color="accent"
          delay={0.05}
        />
        <StatCard
          icon={Clock}
          label="Pending"
          value={pending}
          sublabel="Awaiting response"
          color="warning"
          delay={0.1}
        />
        <StatCard
          icon={TrendingUp}
          label="Platform Rank"
          value="Top 15%"
          sublabel="Profile strength"
          color="blue"
          delay={0.15}
        />
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <DailySummaryCard summary={summaries} />
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
