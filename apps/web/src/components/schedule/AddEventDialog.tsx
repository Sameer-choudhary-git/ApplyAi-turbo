import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2, MapPin, AlignLeft } from "lucide-react";
import { createReminder } from "@/api/schedule";

function combineDateAndTime(date: string, time: string) {
  if (!date) return "";
  return time ? `${date}T${time}` : `${date}T00:00`;
}

export default function AddEventDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");

  const reset = () => {
    setTitle("");
    setDescription("");
    setLocation("");
    setAllDay(false);
    setStartDate("");
    setStartTime("");
    setEndDate("");
    setEndTime("");
  };

  const mutation = useMutation({
    mutationFn: () => {
      const remindAt = allDay
        ? `${startDate}T00:00:00`
        : combineDateAndTime(startDate, startTime);

      const endAt = allDay
        ? endDate
          ? `${endDate}T23:59:59`
          : undefined
        : endDate
          ? combineDateAndTime(endDate, endTime || startTime)
          : undefined;

      return createReminder({
        title,
        description: description || undefined,
        location: location || undefined,
        remindAt,
        endAt,
        allDay,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
      setOpen(false);
      reset();
    },
  });

  const canSubmit = title.trim() && startDate && (allDay || startTime);

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gradient-primary text-white border-0 h-9">
          <Plus className="w-4 h-4 mr-1.5" /> Add Event
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md bg-background/95 backdrop-blur-xl border-border/50">
        <DialogHeader>
          <DialogTitle className="font-heading">Add Event</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2 max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add title"
              className="bg-background border-border/50 text-base font-medium h-11"
            />
          </div>

          {/* All-day toggle */}
          <div className="flex items-center gap-2.5">
            <input
              type="checkbox"
              id="allDay"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="rounded accent-primary w-4 h-4 cursor-pointer"
            />
            <Label htmlFor="allDay" className="text-sm text-foreground cursor-pointer select-none">
              All day
            </Label>
          </div>

          {/* Start */}
          <div>
            <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              Starts
            </Label>
            <div className={`grid ${allDay ? "grid-cols-1" : "grid-cols-2"} gap-2 mt-1.5`}>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-background border-border/50"
              />
              {!allDay && (
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="bg-background border-border/50"
                />
              )}
            </div>
          </div>

          {/* End (optional) */}
          <div>
            <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              Ends <span className="normal-case font-normal text-muted-foreground/70">(optional)</span>
            </Label>
            <div className={`grid ${allDay ? "grid-cols-1" : "grid-cols-2"} gap-2 mt-1.5`}>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-background border-border/50"
              />
              {!allDay && (
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="bg-background border-border/50"
                />
              )}
            </div>
          </div>

          {/* Location */}
          <div>
            <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3 h-3" /> Location
            </Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Add location or meeting link"
              className="mt-1.5 bg-background border-border/50"
            />
          </div>

          {/* Description */}
          <div>
            <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <AlignLeft className="w-3 h-3" /> Description
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes or details"
              className="mt-1.5 h-20 bg-background border-border/50 resize-none"
            />
          </div>

          <Button
            className="w-full gradient-primary text-white border-0 h-10"
            onClick={() => mutation.mutate()}
            disabled={!canSubmit || mutation.isPending}
          >
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Event"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}