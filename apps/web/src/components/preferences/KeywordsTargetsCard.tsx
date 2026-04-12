/**
 * components/KeywordsTargetsCard.tsx
 *
 * Target roles and preferred industries — free-form tag inputs.
 */

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
import { motion } from "framer-motion";

interface KeywordsTargetsCardProps {
  rolesOfInterest: string[];
  industries: string[];
  onAddRole: (role: string) => void;
  onRemoveRole: (role: string) => void;
  onAddIndustry: (industry: string) => void;
  onRemoveIndustry: (industry: string) => void;
}

export function KeywordsTargetsCard({
  rolesOfInterest,
  industries,
  onAddRole,
  onRemoveRole,
  onAddIndustry,
  onRemoveIndustry,
}: KeywordsTargetsCardProps) {
  const [newRole, setNewRole] = React.useState("");
  const [newIndustry, setNewIndustry] = React.useState("");

  const handleAddRole = () => {
    if (!newRole.trim()) return;
    onAddRole(newRole.trim());
    setNewRole("");
  };

  const handleAddIndustry = () => {
    if (!newIndustry.trim()) return;
    onAddIndustry(newIndustry.trim());
    setNewIndustry("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="h-full"
    >
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm h-full">
        <div className="px-6 py-4 border-b border-border/50 bg-muted/10">
          <h3 className="font-heading font-bold text-foreground">
            Keywords & Targets
          </h3>
        </div>
        <CardContent className="p-6 space-y-8">
          {/* Target Roles */}
          <div>
            <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-3 block">
              Target Roles
            </Label>
            <div className="flex gap-2 mb-3">
              <Input
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                placeholder="e.g. Full Stack Developer…"
                className="bg-background/50 border-border/50"
                onKeyDown={(e) => e.key === "Enter" && handleAddRole()}
              />
              <Button
                variant="secondary"
                size="icon"
                onClick={handleAddRole}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {rolesOfInterest.map((role) => (
                <Badge
                  key={role}
                  variant="secondary"
                  className="px-3 py-1.5 text-xs bg-primary/10 text-primary border border-primary/20"
                >
                  {role}
                  <X
                    className="w-3 h-3 ml-1.5 cursor-pointer"
                    onClick={() => onRemoveRole(role)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* Preferred Industries */}
          <div>
            <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-3 block">
              Preferred Industries
            </Label>
            <div className="flex gap-2 mb-3">
              <Input
                value={newIndustry}
                onChange={(e) => setNewIndustry(e.target.value)}
                placeholder="e.g. Fintech, Web3…"
                className="bg-background/50 border-border/50"
                onKeyDown={(e) => e.key === "Enter" && handleAddIndustry()}
              />
              <Button
                variant="secondary"
                size="icon"
                onClick={handleAddIndustry}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {industries.map((ind) => (
                <Badge
                  key={ind}
                  variant="secondary"
                  className="px-3 py-1.5 text-xs bg-accent/10 text-accent border border-accent/20"
                >
                  {ind}
                  <X
                    className="w-3 h-3 ml-1.5 cursor-pointer"
                    onClick={() => onRemoveIndustry(ind)}
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
