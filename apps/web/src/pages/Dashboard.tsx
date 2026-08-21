import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowUpRight, CalendarClock, CheckCircle2, Clock3, Send, Sparkles, Target, TrendingUp, Zap } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import StatCard from "../components/dashboard/StatCard";
import DailySummaryCard from "../components/dashboard/DailySummaryCard";
import RecentApplications from "../components/dashboard/RecentApplications";
import UpcomingInterviews from "../components/dashboard/UpcomingInterviews";
import AgentStatus from "../components/dashboard/AgentStatus";
import { DashboardSkeleton } from "../components/ui/loading-skeletons";

type Profile = {
  fullName?: string;
  isOnboarded?: boolean;
  [key: string]: unknown;
};

type Application = {
  appliedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  interviewScheduled?: boolean;
  status?: string;
  [key: string]: unknown;
};

type Interview = {
  id: string;
  title: string;
  company: string;
  round?: string | null;
  interviewAt: string;
  duration?: number | null;
  meetingUrl?: string | null;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "RESCHEDULED";
};

const isToday = (value?: string) => {
  if (!value) return false;
  const date = new Date(value);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
};

export default function Dashboard() {
  const { user } = useAuth();
  const { data: profile, isLoading: isProfileLoading } = useQuery<Profile | undefined>({
    queryKey: ["userProfile", user?.email],
    queryFn: async () => {
      const res = await api<{ user: Profile }>("/users/me");
      return res.user;
    },
    enabled: Boolean(user),
  });
  const { data: applications = [], isLoading: isAppsLoading } = useQuery<Application[]>({
    queryKey: ["applications", user?.id],
    queryFn: async () => {
      const res = await api<{ data: Application[] }>("/applications");
      return res.data || [];
    },
    enabled: Boolean(user),
  });
  const { data: tasks = [], isLoading: isTasksLoading } = useQuery<unknown[]>({
    queryKey: ["tasks", user?.id],
    queryFn: async () => {
      const res = await api<{ tasks: unknown[] }>("/tasks");
      return res.tasks || [];
    },
    enabled: Boolean(user),
  });
  const { data: interviews = [] } = useQuery<Interview[]>({
    queryKey: ["interviews", user?.id],
    queryFn: async () => {
      const res = await api<{ interviews: Interview[] }>("/interviews");
      return res.interviews || [];
    },
    enabled: Boolean(user),
  });

  const metrics = useMemo(() => {
    const applicationsSentToday = applications.filter((application) => isToday(application.appliedAt || application.createdAt)).length;
    const interviewsScheduledToday = interviews.filter((interview) => isToday(interview.interviewAt)).length;
    const pendingApplications = applications.filter((application) => !application.interviewScheduled && application.status !== "rejected").length;
    const repliesToday = applications.filter((application) => isToday(application.updatedAt) && Boolean(application.status)).length;
    return { applicationsSentToday, interviewsScheduledToday, pendingApplications, repliesToday };
  }, [applications, interviews]);

  const firstName = profile?.fullName?.split(" ")[0] || "there";
  const isLoading = isProfileLoading || isAppsLoading || isTasksLoading;
  const today = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date());
  const summaries = {
    applications_sent: metrics.applicationsSentToday,
    repliesToday: metrics.repliesToday,
    interviews_scheduled: metrics.interviewsScheduledToday,
    highlights: ["Profile optimization is ready to compound your next move."],
  };

  if (isLoading) {
    return <DashboardSkeleton label="Preparing your career cockpit" />;
  }

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[28px] border border-border/80 bg-card/70 p-6 shadow-[0_26px_70px_-42px_hsl(222_45%_2%_/_0.95)] backdrop-blur-xl lg:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_92%_12%,hsl(var(--accent)/.16),transparent_24%),radial-gradient(circle_at_72%_100%,hsl(var(--primary)/.08),transparent_30%)]" />
        <div className="pointer-events-none absolute right-8 top-8 h-28 w-28 rounded-full border border-primary/10 bg-primary/5 blur-[1px]" />
        <div className="pointer-events-none absolute right-16 top-16 h-12 w-12 animate-float-slow rounded-full border border-primary/20 bg-primary/10" />
        <div className="relative z-10 flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-5 flex flex-wrap items-center gap-3 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-primary"><span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary))]" />Live workspace</span>
              <span>{today}</span>
            </div>
            <h1 className="font-heading text-3xl font-extrabold tracking-[-0.04em] text-foreground sm:text-4xl lg:text-[2.8rem]">Good to see you, <span className="text-gradient">{firstName}.</span></h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">Your career copilot is handling the busywork so you can spend your energy on the opportunities that matter.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/applications" className="group inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-[0_14px_28px_-16px_hsl(var(--primary))] transition-transform hover:-translate-y-0.5">Review applications <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></Link>
              <Link to="/preferences" className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/50 px-4 py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-secondary">Tune strategy <Target className="h-4 w-4 text-accent" /></Link>
            </div>
          </div>
          <div className="grid max-w-sm grid-cols-2 gap-3 sm:grid-cols-3 lg:min-w-[330px]">
            <div className="rounded-2xl border border-border/70 bg-background/45 p-3.5"><Send className="h-4 w-4 text-primary" /><p className="mt-3 font-heading text-2xl font-extrabold text-foreground">{metrics.applicationsSentToday}</p><p className="mt-1 text-[11px] font-semibold text-muted-foreground">Sent today</p></div>
            <div className="rounded-2xl border border-border/70 bg-background/45 p-3.5"><CalendarClock className="h-4 w-4 text-accent" /><p className="mt-3 font-heading text-2xl font-extrabold text-foreground">{metrics.interviewsScheduledToday}</p><p className="mt-1 text-[11px] font-semibold text-muted-foreground">Interviews today</p></div>
            <div className="col-span-2 rounded-2xl border border-primary/15 bg-primary/5 p-3.5 sm:col-span-1"><div className="flex items-center gap-2 text-primary"><Zap className="h-4 w-4" /><span className="text-[11px] font-bold uppercase tracking-wider">Autopilot</span></div><p className="mt-3 text-sm font-bold text-foreground">Working quietly</p><p className="mt-1 text-[11px] leading-4 text-muted-foreground">Matching your preferences in the background.</p></div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Career overview">
        <StatCard icon={Send} label="Total applied" value={applications.length} sublabel="Across your workspace" color="primary" delay={0} />
        <StatCard icon={CheckCircle2} label="Interviews" value={interviews.length} sublabel={`${metrics.interviewsScheduledToday} scheduled today`} color="accent" delay={0.05} />
        <StatCard icon={Clock3} label="Awaiting reply" value={metrics.pendingApplications} sublabel="Keep the momentum" color="warning" delay={0.1} />
        <StatCard icon={TrendingUp} label="Open tasks" value={tasks.length} sublabel="Next actions to finish" color="blue" delay={0.15} />
      </section>

      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary"><Sparkles className="h-3.5 w-3.5" /> Your command center</p>
          <h2 className="font-heading text-xl font-extrabold tracking-tight text-foreground">Keep the next move moving</h2>
          <p className="mt-1 text-sm text-muted-foreground">A clear view of what deserves your attention now.</p>
        </div>
        <Link to="/analytics" className="hidden items-center gap-1 text-sm font-bold text-muted-foreground transition-colors hover:text-primary sm:inline-flex">View insights <ArrowUpRight className="h-4 w-4" /></Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <DailySummaryCard summary={summaries} />
          <RecentApplications applications={applications} />
        </div>
        <div className="space-y-6">
          <AgentStatus profile={profile} />
          <UpcomingInterviews interviews={interviews} />
        </div>
      </div>
    </div>
  );
}
