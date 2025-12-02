"use client"

import { useState, useRef } from "react"
import { Settings, Tag, Pencil, X, Check, Download, Upload, Database } from "lucide-react"
import { useGoals } from "@/components/goals-context"
import { STORAGE_KEY } from "@/constants"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { getAllTags, renameTag, goals } = useGoals()
  const allTags = getAllTags()
  const [editingTag, setEditingTag] = useState<string | null>(null)
  const [editedTagValue, setEditedTagValue] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = () => {
    // Get all data from localStorage
    const exportData = {
      goals: goals,
      groupOrder: JSON.parse(localStorage.getItem("goal-group-order") || "[]"),
      exportedAt: new Date().toISOString(),
      version: "1.0",
    }

    // Create blob and download
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `goals-backup-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const result = e.target?.result
        if (!result || typeof result !== "string") {
          alert("Failed to read file. Please try again.")
          return
        }

        const data = JSON.parse(result)
        
        if (!data.goals || !Array.isArray(data.goals)) {
          alert("Invalid backup file. The file must contain a 'goals' array. Please select a valid goals backup.")
          return
        }

        if (data.goals.length === 0) {
          alert("The backup file contains no goals. Nothing to import.")
          return
        }

        const confirmImport = confirm(
          `This will replace all your current data with ${data.goals.length} goals from the backup. This cannot be undone. Continue?`
        )

        if (confirmImport) {
          // Import goals using the correct storage key
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.goals))
          
          // Import group order if present
          if (data.groupOrder) {
            localStorage.setItem("goal-group-order", JSON.stringify(data.groupOrder))
          }

          // Reload page to apply changes
          window.location.reload()
        }
      } catch (error) {
        console.error("Import error:", error)
        alert(`Failed to parse backup file: ${error instanceof Error ? error.message : "Unknown error"}. Please make sure it's a valid JSON file.`)
      }
    }
    
    reader.onerror = () => {
      alert("Failed to read file. Please try again.")
    }
    
    reader.readAsText(file)

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleStartEdit = (tag: string) => {
    setEditingTag(tag)
    setEditedTagValue(tag)
  }

  const handleSaveEdit = (oldTag: string) => {
    const newTag = editedTagValue.trim()
    if (!newTag) {
      // Empty tag, just cancel
      handleCancelEdit()
      return
    }

    const normalizedOldTag = oldTag.toLowerCase()
    const normalizedNewTag = newTag.toLowerCase()

    // If tag hasn't changed, just close edit mode
    if (normalizedNewTag === normalizedOldTag) {
      handleCancelEdit()
      return
    }

    // Check if the new tag already exists (excluding the current tag)
    const existingTags = allTags
      .filter((t) => t.toLowerCase() !== normalizedOldTag)
      .map((t) => t.toLowerCase())

    if (existingTags.includes(normalizedNewTag)) {
      alert(`Tag "${newTag}" already exists. Please choose a different name.`)
      return
    }

    renameTag(oldTag, newTag)
    setEditingTag(null)
    setEditedTagValue("")
  }

  const handleCancelEdit = () => {
    setEditingTag(null)
    setEditedTagValue("")
  }

  const handleKeyDown = (e: React.KeyboardEvent, oldTag: string) => {
    if (e.key === "Enter") {
      handleSaveEdit(oldTag)
    } else if (e.key === "Escape") {
      handleCancelEdit()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Settings
          </DialogTitle>
          <DialogDescription>Manage your global tag names</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              Tags
            </Label>
            {allTags.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No tags yet. Create tags when adding or editing goals.
              </p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {allTags.map((tag) => (
                  <div
                    key={tag}
                    className="flex items-center gap-2 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/50"
                  >
                    {editingTag === tag ? (
                      <>
                        <Input
                          value={editedTagValue}
                          onChange={(e) => setEditedTagValue(e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, tag)}
                          className="flex-1"
                          autoFocus
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => handleSaveEdit(tag)}
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={handleCancelEdit}
                        >
                          <X className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm font-medium text-foreground">{tag}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => handleStartEdit(tag)}
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">
              <strong>Note:</strong> Renaming a tag will update it across all goals that use it.
            </p>
          </div>

          <Separator className="my-4" />

          {/* Data Management Section */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              Data Management
            </Label>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={handleExport}
              >
                <Download className="h-4 w-4" />
                Export Data
              </Button>
              
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                Import Data
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Export your goals to a JSON file for backup, or import from a previous backup.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

