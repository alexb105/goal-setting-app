"use client"

import type React from "react"

import { useState } from "react"
import { AlertTriangle, X, Calendar, Palette, Tag, FolderOpen, Heart, ChevronDown, Settings2, Link2 } from "lucide-react"
import { useGoals } from "@/components/goals-context"
import { PASTEL_COLORS } from "@/constants"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { BarChart3 } from "lucide-react"
import { TagInput } from "@/components/shared/tag-input"
import { DateQuickSelect } from "@/components/shared/date-quick-select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

interface CreateGoalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface SectionProps {
  icon: React.ReactNode
  title: string
  description?: string
  children: React.ReactNode
  defaultOpen?: boolean
  badge?: string
}

function Section({ icon, title, description, children, defaultOpen = false, badge }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-3 px-3 -mx-3 rounded-lg hover:bg-muted/50 transition-colors group">
        <div className="flex items-center gap-3">
          <div className="text-muted-foreground group-hover:text-foreground transition-colors">
            {icon}
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{title}</span>
              {badge && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {badge}
                </span>
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        <ChevronDown className={cn(
          "h-4 w-4 text-muted-foreground transition-transform duration-200",
          isOpen && "rotate-180"
        )} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pt-2 pb-3 pl-9 space-y-3">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function CreateGoalDialog({ open, onOpenChange }: CreateGoalDialogProps) {
  const { addGoal, getAllTags, goals } = useGoals()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [why, setWhy] = useState("")
  const [targetDate, setTargetDate] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [negativeImpactOn, setNegativeImpactOn] = useState<string[]>([])
  const [negativeImpactOnAll, setNegativeImpactOnAll] = useState(false)
  const [selectedColor, setSelectedColor] = useState<string | undefined>(undefined)
  const [showProgress, setShowProgress] = useState(true)
  const [group, setGroup] = useState<string>("")

  const existingTags = getAllTags()
  const existingGroups = Array.from(new Set(goals.map((g) => g.group).filter((g): g is string => !!g)))

  const handleToggleNegativeImpact = (goalId: string) => {
    setNegativeImpactOn((prev) =>
      prev.includes(goalId) ? prev.filter((id) => id !== goalId) : [...prev, goalId]
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title) return

    addGoal({
      title,
      description,
      why: why.trim() || undefined,
      tags,
      targetDate: targetDate || "",
      milestones: [],
      negativeImpactOn: negativeImpactOnAll ? [] : negativeImpactOn,
      negativeImpactOnAll,
      color: selectedColor,
      showProgress,
      group: group.trim() || undefined,
    })

    setTitle("")
    setDescription("")
    setWhy("")
    setTargetDate("")
    setTags([])
    setNegativeImpactOn([])
    setNegativeImpactOnAll(false)
    setSelectedColor(undefined)
    setShowProgress(true)
    setGroup("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] sm:max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 flex-shrink-0 border-b">
          <DialogTitle className="text-lg sm:text-xl">Create New Goal</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Add a title and description to get started. Expand sections below to customize.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="flex-1 overflow-y-auto px-4 sm:px-6">
            <div className="space-y-4 py-4">
              {/* Essential Fields - Always Visible */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-medium">
                    Goal Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="title"
                    placeholder="What do you want to achieve?"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Briefly describe your goal..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className="resize-none"
                  />
                </div>
              </div>

              {/* Divider */}
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-background px-2 text-muted-foreground">Optional settings</span>
                </div>
              </div>

              {/* Collapsible Sections */}
              <div className="space-y-1">
                {/* Motivation Section */}
                <Section
                  icon={<Heart className="h-4 w-4" />}
                  title="Motivation"
                  description="Why does this goal matter to you?"
                >
                  <Textarea
                    id="why"
                    placeholder="Write a short note about why this goal matters to you..."
                    value={why}
                    onChange={(e) => setWhy(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    This stays private and helps keep you motivated.
                  </p>
                </Section>

                {/* Timeline Section */}
                <Section
                  icon={<Calendar className="h-4 w-4" />}
                  title="Timeline"
                  description="Set a target completion date"
                  badge={targetDate ? "Set" : undefined}
                >
                  <div className="flex gap-2">
                    <Input
                      id="targetDate"
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="flex-1"
                    />
                    {targetDate && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setTargetDate("")}
                        title="Clear date"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <DateQuickSelect onSelect={setTargetDate} />
                  <p className="text-xs text-muted-foreground">
                    Leave empty to use your milestone dates instead.
                  </p>
                </Section>

                {/* Organization Section */}
                <Section
                  icon={<FolderOpen className="h-4 w-4" />}
                  title="Organization"
                  description="Tags and grouping for your goal"
                  badge={tags.length > 0 || group ? `${tags.length + (group ? 1 : 0)}` : undefined}
                >
                  <div className="space-y-4">
                    <TagInput tags={tags} onTagsChange={setTags} existingTags={existingTags} />

                    <div className="space-y-2">
                      <Label htmlFor="group" className="text-sm">Group</Label>
                      <Input
                        id="group"
                        placeholder="e.g., Work, Personal, Health"
                        value={group}
                        onChange={(e) => setGroup(e.target.value)}
                        list="group-suggestions"
                      />
                      <datalist id="group-suggestions">
                        {existingGroups.map((g) => (
                          <option key={g} value={g} />
                        ))}
                      </datalist>
                      {existingGroups.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {existingGroups.map((g) => (
                            <button
                              key={g}
                              type="button"
                              onClick={() => setGroup(g)}
                              className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted-foreground/20 transition-colors"
                            >
                              {g}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Section>

                {/* Appearance Section */}
                <Section
                  icon={<Palette className="h-4 w-4" />}
                  title="Appearance"
                  description="Color for your goal card"
                  badge={selectedColor ? "Custom" : undefined}
                >
                  <div className="space-y-2">
                    <Label className="text-sm">Card Color</Label>
                    <div className="grid grid-cols-5 gap-2">
                      {PASTEL_COLORS.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setSelectedColor(selectedColor === color.value ? undefined : color.value)}
                          className={cn(
                            "h-8 w-full rounded-md border-2 transition-all",
                            selectedColor === color.value
                              ? "border-foreground ring-2 ring-ring ring-offset-1"
                              : "border-transparent hover:border-foreground/30"
                          )}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                          aria-label={`Select ${color.name} color`}
                        />
                      ))}
                    </div>
                    {selectedColor && (
                      <p className="text-xs text-muted-foreground">
                        Selected: {PASTEL_COLORS.find((c) => c.value === selectedColor)?.name}
                      </p>
                    )}
                  </div>
                </Section>

                {/* Miscellaneous Section */}
                <Section
                  icon={<Settings2 className="h-4 w-4" />}
                  title="Miscellaneous"
                  description="Additional settings"
                >
                  <div className="flex items-center space-x-3 py-1">
                    <Checkbox
                      id="show-progress"
                      checked={showProgress}
                      onCheckedChange={(checked) => setShowProgress(checked as boolean)}
                    />
                    <div className="flex-1">
                      <Label htmlFor="show-progress" className="text-sm font-normal cursor-pointer flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        Show progress tracking
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {showProgress ? "Track progress with milestones" : "Simple goal without progress bar"}
                      </p>
                    </div>
                  </div>
                </Section>

                {/* Dependencies Section */}
                <Section
                  icon={<Link2 className="h-4 w-4" />}
                  title="Dependencies"
                  description="Link to other goals"
                  badge={negativeImpactOnAll ? "All" : negativeImpactOn.length > 0 ? `${negativeImpactOn.length}` : undefined}
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <span>Goals impacted if this isn't completed:</span>
                    </div>
                    
                    {/* All Goals Toggle */}
                    <button
                      type="button"
                      onClick={() => setNegativeImpactOnAll(!negativeImpactOnAll)}
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all",
                        negativeImpactOnAll 
                          ? "border-amber-500 bg-amber-500/10" 
                          : "border-border hover:border-muted-foreground/30"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                          negativeImpactOnAll ? "border-amber-500 bg-amber-500" : "border-muted-foreground"
                        )}>
                          {negativeImpactOnAll && (
                            <div className="w-2 h-2 rounded-full bg-white" />
                          )}
                        </div>
                        <span className="text-sm font-medium">All goals (including future)</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {negativeImpactOnAll ? "Enabled" : ""}
                      </span>
                    </button>

                    {/* Individual Goals - only show if not "all" */}
                    {!negativeImpactOnAll && goals.length > 0 && (
                      <ScrollArea className="h-28 rounded-md border border-border p-2">
                        <div className="space-y-1.5">
                          {goals.map((goal) => (
                            <div key={goal.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`negative-impact-${goal.id}`}
                                checked={negativeImpactOn.includes(goal.id)}
                                onCheckedChange={() => handleToggleNegativeImpact(goal.id)}
                              />
                              <label
                                htmlFor={`negative-impact-${goal.id}`}
                                className="text-sm leading-none cursor-pointer truncate"
                              >
                                {goal.title}
                              </label>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}

                    {negativeImpactOnAll && (
                      <p className="text-xs text-muted-foreground">
                        This goal will impact all your other goals, including any you create in the future.
                      </p>
                    )}
                  </div>
                </Section>
              </div>
            </div>
          </ScrollArea>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-3 sm:pt-4 pb-4 sm:pb-6 px-4 sm:px-6 border-t flex-shrink-0 bg-background">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-10 sm:h-9">
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim()} className="h-10 sm:h-9">
              Create Goal
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
