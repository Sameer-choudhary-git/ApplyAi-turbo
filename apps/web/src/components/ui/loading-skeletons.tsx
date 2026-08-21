import type { ReactNode } from "react";

import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

type LoadingShellProps = {
  label?: string;
};

function LoadingShell({
  children,
  label = "Loading content",
  className = "",
}: LoadingShellProps & {   children: ReactNode; className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={`loading-surface rounded-[28px] p-6 ${className}`}
    >
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export function AppLoadingSkeleton({
  label = "Preparing your Apply AI workspace",
}: LoadingShellProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <LoadingShell label={label} className="w-full max-w-md text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Skeleton className="h-8 w-8 rounded-xl" />
        </div>
        <Skeleton className="mx-auto mt-5 h-4 w-44" />
        <Skeleton className="mx-auto mt-3 h-3 w-64 max-w-full" />
        <div className="mx-auto mt-6 h-1.5 w-36 overflow-hidden rounded-full bg-muted/70">
          <div className="h-full w-1/2 rounded-full bg-primary/70 animate-loading-progress" />
        </div>
      </LoadingShell>
    </div>
  );
}

export function DashboardSkeleton({
  label = "Preparing your career cockpit",
}: LoadingShellProps) {
  return (
    <div className="page-enter space-y-6" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      <LoadingShell label={label} className="space-y-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="w-full max-w-2xl space-y-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-10 w-full max-w-xl" />
            <Skeleton className="h-4 w-full max-w-lg" />
            <div className="flex gap-3 pt-2">
              <Skeleton className="h-11 w-36" />
              <Skeleton className="h-11 w-32" />
            </div>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-3 lg:max-w-md">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-24 rounded-2xl" />
            ))}
          </div>
        </div>
      </LoadingShell>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <LoadingShell key={index} className="p-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-4 h-8 w-14" />
            <Skeleton className="mt-2 h-3 w-24" />
          </LoadingShell>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <LoadingShell className="space-y-5 lg:col-span-2">
          <Skeleton className="h-5 w-40" />
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-24 rounded-2xl" />
            ))}
          </div>
          <SkeletonText lines={3} />
        </LoadingShell>
        <LoadingShell className="space-y-4">
          <Skeleton className="h-5 w-32" />
          <SkeletonText lines={5} />
        </LoadingShell>
      </div>
    </div>
  );
}

export function CardGridSkeleton({
  label = "Loading cards",
  cards = 6,
}: LoadingShellProps & { cards?: number }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
    >
      <span className="sr-only">{label}</span>
      {Array.from({ length: cards }).map((_, index) => (
        <LoadingShell key={index} label={label} className="min-h-64 space-y-5 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-1 items-center gap-3">
              <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
          <SkeletonText lines={3} />
          <div className="flex gap-2 pt-3">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 w-10" />
          </div>
        </LoadingShell>
      ))}
    </div>
  );
}

export function ListSkeleton({
  label = "Loading list",
  rows = 5,
}: LoadingShellProps & { rows?: number }) {
  return (
    <LoadingShell label={label} className="overflow-hidden p-0">
      <div className="border-b border-border/60 px-5 py-4">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="mt-2 h-3 w-72 max-w-full" />
      </div>
      <div className="divide-y divide-border/50">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center">
            <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-3 w-2/5" />
            </div>
            <Skeleton className="h-9 w-full sm:w-24" />
          </div>
        ))}
      </div>
    </LoadingShell>
  );
}

export function TableSkeleton({
  label = "Loading table",
  rows = 6,
}: LoadingShellProps & { rows?: number }) {
  return (
    <LoadingShell label={label} className="overflow-hidden p-0">
      <div className="grid grid-cols-3 gap-4 border-b border-border/60 px-5 py-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="divide-y divide-border/50">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-3 sm:items-center">
            <div className="space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-9 w-full sm:w-24" />
          </div>
        ))}
      </div>
    </LoadingShell>
  );
}

export function SearchResultsSkeleton({
  label = "Loading opportunities",
  rows = 5,
}: LoadingShellProps & { rows?: number }) {
  return (
    <LoadingShell label={label} className="overflow-hidden p-0">
      <div className="flex flex-col gap-3 border-b border-border/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-72 max-w-full" />
        </div>
        <Skeleton className="h-10 w-full sm:w-56" />
      </div>
      <div className="divide-y divide-border/50">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="space-y-3 px-5 py-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-5 w-3/5" />
                <Skeleton className="h-3 w-2/5" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
            <SkeletonText lines={2} />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-7 w-28" />
              <Skeleton className="h-9 w-28" />
            </div>
          </div>
        ))}
      </div>
    </LoadingShell>
  );
}

export function ScheduleSkeleton({
  label = "Loading schedule",
}: LoadingShellProps) {
  return (
    <div className="page-enter space-y-6" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      <div className="grid gap-6 lg:grid-cols-3">
        <LoadingShell label={label} className="space-y-5 p-4 lg:col-span-2 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Skeleton className="h-6 w-40" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-8 w-16 rounded-lg" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {Array.from({ length: 35 }).map((_, index) => (
              <Skeleton key={index} className="h-14 rounded-lg sm:h-20 sm:rounded-xl" />
            ))}
          </div>
        </LoadingShell>
        <LoadingShell label={label} className="space-y-5">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-3 w-52 max-w-full" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex gap-3 rounded-xl border border-border/50 p-4">
                <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </LoadingShell>
      </div>
    </div>
  );
}

export function AnalyticsSkeleton({
  label = "Loading analytics",
}: LoadingShellProps) {
  return (
    <div className="page-enter space-y-6" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      <LoadingShell label={label} className="flex items-center gap-4 p-5">
        <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-3 w-72 max-w-full" />
        </div>
      </LoadingShell>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <LoadingShell key={index} label={label} className="p-4">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="mt-4 h-3 w-24" />
            <Skeleton className="mt-2 h-7 w-14" />
          </LoadingShell>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <LoadingShell key={index} label={label} className="space-y-5">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-56 w-full rounded-2xl" />
          </LoadingShell>
        ))}
      </div>
    </div>
  );
}

export function PreferencesSkeleton({
  label = "Loading preferences",
}: LoadingShellProps) {
  return (
    <div className="page-enter space-y-6" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-36" />
            <Skeleton className="h-3 w-56 max-w-full" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-16" />
        </div>
      </div>
      <LoadingShell label={label} className="space-y-5">
        <Skeleton className="h-5 w-48" />
        <SkeletonText lines={3} />
      </LoadingShell>
      <div className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <LoadingShell key={index} label={label} className="space-y-5">
            <Skeleton className="h-5 w-44" />
            <SkeletonText lines={5} />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-8 w-20" />
            </div>
          </LoadingShell>
        ))}
      </div>
      <LoadingShell label={label} className="space-y-5">
        <Skeleton className="h-5 w-52" />
        <SkeletonText lines={4} />
      </LoadingShell>
    </div>
  );
}

export function ErrorState({
  label,
}: {
  label: string;
}) {
  return <p className="text-sm text-muted-foreground">{label}</p>;
}

export function LoadingPlaceholder({
  label = "Loading content",
}: LoadingShellProps) {
  return (
    <LoadingShell label={label} className="space-y-4">
      <Skeleton className="h-5 w-40" />
      <SkeletonText lines={4} />
    </LoadingShell>
  );
}

export function InlineSkeleton({
  label = "Loading",
}: LoadingShellProps) {
  return (
    <span role="status" aria-live="polite" aria-busy="true" className="inline-flex items-center gap-2">
      <Skeleton className="h-4 w-4 rounded-full" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
