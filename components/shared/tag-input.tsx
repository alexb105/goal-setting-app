"use client"

import { useState, type KeyboardEvent } from "react"
import { X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface TagInputProps {
  label?: string
  tags: string[]
  onTagsChange: (tags: string[]) => void
  existingTags?: string[]
  placeholder?: string
}

export function TagInput({ label = "Tags", tags, onTagsChange, existingTags = [], placeholder = "Add a tag and press Enter" }: TagInputProps) {
  const [tagInput, setTagInput] = useState("")

  const handleAddTag = (tag: string) => {
    const normalizedTag = tag.trim().toLowerCase()
    if (normalizedTag && !tags.includes(normalizedTag)) {
      onTagsChange([...tags, normalizedTag])
    }
    setTagInput("")
  }

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddTag(tagInput)
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(tags.filter((t) => t !== tagToRemove))
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="tags">{label}</Label>
      <div className="flex gap-2">
        <Input
          id="tags"
          placeholder={placeholder}
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleTagKeyDown}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => handleAddTag(tagInput)}
          disabled={!tagInput.trim()}
        >
          Add
        </Button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1 pr-1">
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      {existingTags.length > 0 && (
        <div className="pt-1">
          <p className="text-xs text-muted-foreground mb-1">Existing tags:</p>
          <div className="flex flex-wrap gap-1">
            {existingTags
              .filter((t) => !tags.includes(t))
              .map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleAddTag(tag)}
                  className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted-foreground/20 transition-colors"
                >
                  + {tag}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

