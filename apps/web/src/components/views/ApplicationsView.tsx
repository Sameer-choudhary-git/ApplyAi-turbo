import React, { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Briefcase, SearchX } from "lucide-react";
import ApplicationFilters from "../applications/ApplicationFilters";
import ApplicationRow from "../applications/ApplicationRow";
import type { Application as ApplicationData } from "@/types/application";
import { useQueryClient } from "@tanstack/react-query";

interface ApplicationsProps {
  applications?: ApplicationData[];
  isLoading?: boolean;
}

export default function Applications({
  applications = [],
  isLoading = false,
}: ApplicationsProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // Normalize field names to what ApplicationRow expects
  const normalised = useMemo(() => {
    return applications.map((app) => ({
      ...app,
      title: app.jobTitle ?? app.title ?? "",
      applied_date: app.appliedAt ?? app.applied_date,
      stipend: app.metadata?.stipend ?? app.stipend,
    }));
  }, [applications]);

  const filtered = normalised.filter((app) => {
    const matchSearch =
      !search ||
      app.title?.toLowerCase().includes(search.toLowerCase()) ||
      app.company?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || app.status === statusFilter;
    const matchType = typeFilter === "all" || app.type === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center glow-primary shadow-lg flex-shrink-0">
          <Briefcase className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl lg:text-3xl font-heading font-bold text-foreground">
            Applications
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track and manage all your automated and manual applications.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm">
        <ApplicationFilters
          search={search}
          setSearch={setSearch}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
        />
      </div>

      {/* List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-16 text-center">
              <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4 border border-border/50 shadow-sm">
                <SearchX className="w-8 h-8 text-muted-foreground/70" />
              </div>
              <p className="text-foreground font-semibold text-lg">
                No matches found
              </p>
              <p className="text-sm text-muted-foreground mt-2 max-w-[300px] leading-relaxed">
                {applications.length === 0
                  ? "You haven't applied to any positions yet. EngiBuddy will start hunting soon!"
                  : "Try adjusting your filters or search terms to find what you're looking for."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {filtered.map((app) => (
                <ApplicationRow
                  key={app.id}
                  app={app}
                  onInterviewScheduled={() => {
                    queryClient.invalidateQueries({
                      queryKey: ["applications"],
                    });
                    queryClient.invalidateQueries({ queryKey: ["schedule"] });
                    queryClient.invalidateQueries({ queryKey: ["interviews"] });
                  }}
                />
              ))}
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
