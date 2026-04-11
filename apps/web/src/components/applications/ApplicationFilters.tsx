import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';

export default function ApplicationFilters({ search, setSearch, statusFilter, setStatusFilter, typeFilter, setTypeFilter }) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by role or company..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-background/50 border-border/50 focus-visible:ring-primary/30 transition-all h-10"
        />
      </div>
      
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-full sm:w-[180px] bg-background/50 border-border/50 h-10">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent className="border-border/50 backdrop-blur-xl bg-background/95">
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="applied">Applied</SelectItem>
          <SelectItem value="under_review">Under Review</SelectItem>
          <SelectItem value="shortlisted">Shortlisted</SelectItem>
          <SelectItem value="interview_scheduled">Interview Scheduled</SelectItem>
          <SelectItem value="accepted">Accepted</SelectItem>
          <SelectItem value="rejected">Rejected</SelectItem>
        </SelectContent>
      </Select>

      <Select value={typeFilter} onValueChange={setTypeFilter}>
        <SelectTrigger className="w-full sm:w-[160px] bg-background/50 border-border/50 h-10">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent className="border-border/50 backdrop-blur-xl bg-background/95">
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="internship">Internship</SelectItem>
          <SelectItem value="job">Full-time Job</SelectItem>
          <SelectItem value="hackathon">Hackathon</SelectItem>
          <SelectItem value="competition">Competition</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}