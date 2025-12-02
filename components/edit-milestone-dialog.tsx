"use client"

import type React from "react"
import { useState, useEffect } from "react"
import type { Milestone } from "@/types"
import { useGoals } from "@/components/goals-context"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Plus, X, List, CheckSquare } from "lucide-react"
import { DateQuickSelect } from "@/components/shared/date-quick-select"

interface EditMilestoneDialogProps {
  goalId: string
  milestone: Milestone
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditMilestoneDialog({ goalId, milestone, open, onOpenChange }: EditMilestoneDialogProps) {
  const { updateMilestone, addTask, toggleTask, deleteTask, goals } = useGoals()
  const [title, setTitle] = useState(milestone.title)
  const [description, setDescription] = useState(milestone.description)
  const [targetDate, setTargetDate] = useState(milestone.targetDate)
  const [taskDisplayStyle, setTaskDisplayStyle] = useState<"checkbox" | "bullet">(milestone.taskDisplayStyle || "checkbox")
  const [newTaskTitle, setNewTaskTitle] = useState("")

  useEffect(() => {
    setTitle(milestone.title)
    setDescription(milestone.description)
    setTargetDate(milestone.targetDate)
    setTaskDisplayStyle(milestone.taskDisplayStyle || "checkbox")
  }, [milestone])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title) return

    updateMilestone(goalId, milestone.id, {
      title,
      description,
      targetDate: targetDate || "", // Allow empty date
      taskDisplayStyle,
    })

    onOpenChange(false)
  }

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return
    addTask(goalId, milestone.id, newTaskTitle.trim())
    setNewTaskTitle("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddTask()
    }
  }

  const tasks = milestone.tasks || []
  const completedTasks = tasks.filter((t) => t.completed).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Milestone</DialogTitle>
          <DialogDescription>Update your milestone details and manage tasks.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-milestone-title">Milestone Title</Label>
            <Input
              id="edit-milestone-title"
              placeholder="e.g., Complete market research"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-milestone-description">Description (optional)</Label>
            <Textarea
              id="edit-milestone-description"
              placeholder="Add any details about this milestone..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-milestone-date">Target Date (optional)</Label>
            <div className="flex gap-2">
              <Input
                id="edit-milestone-date"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
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
          </div>


          {/* Task Display Style */}
          <div className="space-y-2 border-t pt-4">
            <Label>Task Display Style</Label>
            <RadioGroup
              value={taskDisplayStyle}
              onValueChange={(value) => setTaskDisplayStyle(value as "checkbox" | "bullet")}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="checkbox" id="checkbox-style" />
                <Label htmlFor="checkbox-style" className="cursor-pointer font-normal flex items-center gap-2">
                  <CheckSquare className="h-4 w-4" />
                  Checkbox
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bullet" id="bullet-style" />
                <Label htmlFor="bullet-style" className="cursor-pointer font-normal flex items-center gap-2">
                  <List className="h-4 w-4" />
                  Bullet Point
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Tasks/Checkboxes Section */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label>Tasks</Label>
              {tasks.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {completedTasks}/{tasks.length} completed
                </span>
              )}
            </div>

            {/* Add new task */}
            <div className="flex gap-2">
              <Input
                placeholder="Add a task..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <Button type="button" size="icon" variant="outline" onClick={handleAddTask}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Task list */}
            {tasks.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 rounded-lg border bg-card/50 p-2.5 group">
                    <Checkbox
                      id={task.id}
                      checked={task.completed}
                      onCheckedChange={() => toggleTask(goalId, milestone.id, task.id)}
                    />
                    <label
                      htmlFor={task.id}
                      className={`flex-1 text-sm cursor-pointer ${
                        task.completed ? "line-through text-muted-foreground" : "text-foreground"
                      }`}
                    >
                      {task.title}
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      onClick={() => deleteTask(goalId, milestone.id, task.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {tasks.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-3">
                No tasks yet. Add tasks to break down this milestone.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
