/**
 * components/RoleSpecificationsCard.tsx
 *
 * Work mode, opportunity types, min stipend, and target locations.
 */

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Plus, X } from "lucide-react";
import { motion } from "framer-motion";

const WORK_MODES = ["Remote", "Hybrid", "On-site"] as const;
const OPPORTUNITY_TYPES = [
  "Internship",
  "Full-time Job",
  "Part-time Job",
  "Hackathon",
  "Competition",
] as const;

interface RoleSpecificationsCardProps {
  workMode: string[];
  opportunityTypes: string[];
  minStipend: number;
  preferredLocations: string[];
  onWorkModeToggle: (mode: string) => void;
  onOpportunityTypeToggle: (type: string) => void;
  onMinStipendChange: (value: number) => void;
  onAddLocation: (location: string) => void;
  onRemoveLocation: (location: string) => void;
}

export function RoleSpecificationsCard({
  workMode,
  opportunityTypes,
  minStipend,
  preferredLocations,
  onWorkModeToggle,
  onOpportunityTypeToggle,
  onMinStipendChange,
  onAddLocation,
  onRemoveLocation,
}: RoleSpecificationsCardProps) {
  const [newLocation, setNewLocation] = React.useState("");

  const handleAddLocation = () => {
    if (!newLocation.trim()) return;
    onAddLocation(newLocation.trim());
    setNewLocation("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="h-full"
    >
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm h-full">
        <div className="px-6 py-4 border-b border-border/50 bg-muted/10">
          <h3 className="font-heading font-bold text-foreground">
            Role Specifications
          </h3>
        </div>
        <CardContent className="p-6 space-y-8">
          {/* Work Mode */}
          <div>
            <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-3 block">
              Work Mode
            </Label>
            <div className="flex flex-wrap gap-2">
              {WORK_MODES.map((mode) => (
                <Badge
                  key={mode}
                  variant="outline"
                  className={`cursor-pointer px-4 py-2 transition-all ${
                    workMode.includes(mode)
                      ? "bg-primary text-primary-foreground border-primary shadow-md"
                      : "bg-background/50 text-muted-foreground hover:bg-muted"
                  }`}
                  onClick={() => onWorkModeToggle(mode)}
                >
                  {mode}
                </Badge>
              ))}
            </div>
          </div>

          {/* Opportunity Types */}
          <div>
            <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-3 block">
              Opportunity Types
            </Label>
            <div className="flex flex-wrap gap-2">
              {OPPORTUNITY_TYPES.map((type) => (
                <Badge
                  key={type}
                  variant="outline"
                  className={`cursor-pointer px-4 py-2 transition-all ${
                    opportunityTypes.includes(type)
                      ? "bg-primary text-primary-foreground border-primary shadow-md"
                      : "bg-background/50 text-muted-foreground hover:bg-muted"
                  }`}
                  onClick={() => onOpportunityTypeToggle(type)}
                >
                  {type}
                </Badge>
              ))}
            </div>
          </div>

          {/* Min Stipend */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                Min. Stipend/Salary
              </Label>
              <span className="text-sm font-bold text-emerald-400">
                ₹{minStipend.toLocaleString()}/mo
              </span>
            </div>
            <Slider
              value={[minStipend]}
              onValueChange={([v]) => onMinStipendChange(v)}
              min={0}
              max={150000}
              step={5000}
            />
          </div>

          {/* Target Locations */}
          <div>
            <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-3 block">
              Target Locations
            </Label>
            <div className="flex gap-2 mb-3">
              <Input
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="e.g. Bangalore, Remote…"
                className="bg-background/50 border-border/50"
                onKeyDown={(e) => e.key === "Enter" && handleAddLocation()}
              />
              <Button
                variant="secondary"
                size="icon"
                onClick={handleAddLocation}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {preferredLocations.map((loc) => (
                <Badge
                  key={loc}
                  variant="secondary"
                  className="px-3 py-1.5 text-xs bg-background border border-border/50"
                >
                  {loc}
                  <X
                    className="w-3 h-3 ml-1.5 cursor-pointer hover:text-destructive"
                    onClick={() => onRemoveLocation(loc)}
                  />
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
