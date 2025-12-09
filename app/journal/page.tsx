"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import Link from "next/link"
import { 
  ArrowLeft, 
  BookOpen, 
  Plus, 
  Lightbulb, 
  GraduationCap, 
  Brain, 
  Heart, 
  Sparkles, 
  StickyNote,
  Tag,
  X,
  Pencil,
  Trash2,
  Search,
  Calendar,
  Filter,
  Cloud,
  CloudOff
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { TagInput } from "@/components/shared/tag-input"
import { RichTextEditor, MarkdownPreview } from "@/components/shared/rich-text-editor"
import { useGoals } from "@/components/goals-context"
import { useAuth } from "@/components/auth-context"
import { createClient } from "@/lib/supabase/client"
import { getSyncInstance } from "@/lib/supabase/sync"
import type { JournalEntry, JournalEntryType } from "@/types"

const JOURNAL_STORAGE_KEY = "goalritual-journal"

const ENTRY_TYPES: { value: JournalEntryType; label: string; icon: React.ElementType; color: string }[] = [
  { value: "insight", label: "Insight", icon: Lightbulb, color: "text-yellow-500" },
  { value: "learning", label: "Learning", icon: GraduationCap, color: "text-blue-500" },
  { value: "brain-dump", label: "Brain Dump", icon: Brain, color: "text-purple-500" },
  { value: "reflection", label: "Reflection", icon: BookOpen, color: "text-teal-500" },
  { value: "gratitude", label: "Gratitude", icon: Heart, color: "text-pink-500" },
  { value: "idea", label: "Idea", icon: Sparkles, color: "text-orange-500" },
  { value: "note", label: "Note", icon: StickyNote, color: "text-slate-500" },
]

function getEntryTypeInfo(type: JournalEntryType) {
  return ENTRY_TYPES.find(t => t.value === type) || ENTRY_TYPES[6] // Default to 'note'
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatTime(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })
}

export default function JournalPage() {
  const { getAllTags } = useGoals()
  const { user } = useAuth()
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<JournalEntryType | "all">("all")
  const [filterTags, setFilterTags] = useState<string[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  
  // Form state
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [entryType, setEntryType] = useState<JournalEntryType>("note")
  const [tags, setTags] = useState<string[]>([])
  
  const existingTags = getAllTags()
  const hasLoadedFromStorage = useRef(false)
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  
  // Initialize Supabase client and sync
  const supabase = createClient()
  const sync = getSyncInstance(supabase)
  
  // Debounced sync to cloud
  const debouncedSyncToCloud = useCallback(async () => {
    if (!user) return
    
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current)
    }
    
    syncTimeoutRef.current = setTimeout(async () => {
      setIsSyncing(true)
      try {
        await sync.syncToCloud()
      } catch (error) {
        console.error("Journal sync error:", error)
      } finally {
        setIsSyncing(false)
      }
    }, 1000) // Debounce for 1 second
  }, [sync, user])
  
  // Load entries from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(JOURNAL_STORAGE_KEY)
    if (stored) {
      try {
        setEntries(JSON.parse(stored))
      } catch {
        setEntries([])
      }
    }
    hasLoadedFromStorage.current = true
  }, [])
  
  // Save entries to localStorage and sync to cloud
  useEffect(() => {
    if (hasLoadedFromStorage.current) {
      localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(entries))
      debouncedSyncToCloud()
    }
  }, [entries, debouncedSyncToCloud])
  
  // Listen for external storage changes (e.g., from sync)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === JOURNAL_STORAGE_KEY && e.newValue) {
        try {
          setEntries(JSON.parse(e.newValue))
        } catch {
          // Ignore parse errors
        }
      }
    }
    
    const handleCustomStorageUpdate = () => {
      const stored = localStorage.getItem(JOURNAL_STORAGE_KEY)
      if (stored) {
        try {
          setEntries(JSON.parse(stored))
        } catch {
          // Ignore parse errors
        }
      }
    }

    window.addEventListener("storage", handleStorageChange)
    window.addEventListener("goalritual-storage-updated", handleCustomStorageUpdate)
    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("goalritual-storage-updated", handleCustomStorageUpdate)
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
    }
  }, [])
  
  // Filter and search entries
  const filteredEntries = useMemo(() => {
    return entries
      .filter(entry => {
        // Search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase()
          const matchesSearch = 
            entry.title.toLowerCase().includes(query) ||
            entry.content.toLowerCase().includes(query) ||
            entry.tags.some(tag => tag.toLowerCase().includes(query))
          if (!matchesSearch) return false
        }
        
        // Type filter
        if (filterType !== "all" && entry.entryType !== filterType) {
          return false
        }
        
        // Tags filter
        if (filterTags.length > 0) {
          const hasAllTags = filterTags.every(tag => entry.tags.includes(tag))
          if (!hasAllTags) return false
        }
        
        return true
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [entries, searchQuery, filterType, filterTags])
  
  // Get all tags used in journal entries
  const journalTags = useMemo(() => {
    const tagSet = new Set<string>()
    entries.forEach(entry => entry.tags.forEach(tag => tagSet.add(tag)))
    return Array.from(tagSet).sort()
  }, [entries])
  
  const resetForm = () => {
    setTitle("")
    setContent("")
    setEntryType("note")
    setTags([])
  }
  
  const handleCreate = () => {
    if (!content.trim()) return
    
    const newEntry: JournalEntry = {
      id: crypto.randomUUID(),
      title: title.trim() || `${getEntryTypeInfo(entryType).label} - ${formatDate(new Date().toISOString())}`,
      content: content.trim(),
      entryType,
      tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    
    setEntries(prev => [newEntry, ...prev])
    resetForm()
    setIsCreateOpen(false)
  }
  
  const handleUpdate = () => {
    if (!editingEntry || !content.trim()) return
    
    setEntries(prev => prev.map(entry => 
      entry.id === editingEntry.id
        ? {
            ...entry,
            title: title.trim() || entry.title,
            content: content.trim(),
            entryType,
            tags,
            updatedAt: new Date().toISOString(),
          }
        : entry
    ))
    
    setEditingEntry(null)
    resetForm()
  }
  
  const handleDelete = (id: string) => {
    setEntries(prev => prev.filter(entry => entry.id !== id))
  }
  
  const openEditDialog = (entry: JournalEntry) => {
    setTitle(entry.title)
    setContent(entry.content)
    setEntryType(entry.entryType)
    setTags(entry.tags)
    setEditingEntry(entry)
  }
  
  const closeEditDialog = () => {
    setEditingEntry(null)
    resetForm()
  }
  
  const toggleFilterTag = (tag: string) => {
    setFilterTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  return (
    <div className="min-h-screen safe-area-top pb-24 md:pb-8">
      {/* Header */}
      <header className="border-b border-border glass-strong sticky top-0 z-40">
        <div className="mx-auto max-w-4xl px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Link href="/">
                <Button variant="ghost" className="gap-2 -ml-2 h-9 px-2 sm:px-3">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
              </Link>
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-violet-500 flex-shrink-0">
                <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">Journal</h1>
                <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5">
                  {entries.length} {entries.length === 1 ? "entry" : "entries"}
                  {user && (
                    <span className="inline-flex items-center gap-1">
                      •
                      {isSyncing ? (
                        <Cloud className="h-3 w-3 animate-pulse text-primary" />
                      ) : (
                        <Cloud className="h-3 w-3 text-green-500" />
                      )}
                    </span>
                  )}
                </p>
              </div>
            </div>
            
            {/* Create Button */}
            <Dialog open={isCreateOpen} onOpenChange={(open) => {
              setIsCreateOpen(open)
              if (!open) resetForm()
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">New Entry</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>New Journal Entry</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {/* Entry Type */}
                  <div className="space-y-2">
                    <Label>Entry Type</Label>
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                      {ENTRY_TYPES.map(type => {
                        const Icon = type.icon
                        const isSelected = entryType === type.value
                        return (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => setEntryType(type.value)}
                            className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                              isSelected 
                                ? "border-primary bg-primary/10" 
                                : "border-border hover:border-primary/50 hover:bg-muted"
                            }`}
                          >
                            <Icon className={`h-5 w-5 ${type.color}`} />
                            <span className="text-[10px] font-medium truncate w-full text-center">
                              {type.label}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  
                  {/* Title (Optional) */}
                  <div className="space-y-2">
                    <Label htmlFor="title">Title (optional)</Label>
                    <Input
                      id="title"
                      placeholder="Give your entry a title..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                  
                  {/* Content */}
                  <div className="space-y-2">
                    <Label>Content *</Label>
                    <RichTextEditor
                      value={content}
                      onChange={setContent}
                      placeholder="What's on your mind?"
                      minHeight="150px"
                    />
                  </div>
                  
                  {/* Tags */}
                  <TagInput
                    label="Tags"
                    tags={tags}
                    onTagsChange={setTags}
                    existingTags={existingTags}
                    placeholder="Add tags..."
                  />
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button onClick={handleCreate} disabled={!content.trim()}>
                    Create Entry
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>
      
      <div className="mx-auto max-w-4xl px-3 sm:px-6 py-4 sm:py-6">
        {/* Search and Filters */}
        <div className="mb-4 sm:mb-6 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search entries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Type Filter */}
            <Select 
              value={filterType} 
              onValueChange={(value) => setFilterType(value as JournalEntryType | "all")}
            >
              <SelectTrigger className="w-[140px] h-9">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {ENTRY_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <type.icon className={`h-4 w-4 ${type.color}`} />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Clear Filters */}
            {(filterType !== "all" || filterTags.length > 0 || searchQuery) && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setFilterType("all")
                  setFilterTags([])
                  setSearchQuery("")
                }}
                className="h-9 gap-1 text-muted-foreground"
              >
                <X className="h-3 w-3" />
                Clear
              </Button>
            )}
          </div>
          
          {/* Tag Filters */}
          {journalTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {journalTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleFilterTag(tag)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                    filterTags.includes(tag)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted-foreground/20"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Results Count */}
        {(searchQuery || filterType !== "all" || filterTags.length > 0) && (
          <p className="text-sm text-muted-foreground mb-4">
            Showing {filteredEntries.length} of {entries.length} entries
          </p>
        )}
        
        {/* Entries List */}
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card/50 py-12 sm:py-16 px-4">
            <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-violet-500/10 mb-4">
              <BookOpen className="h-7 w-7 sm:h-8 sm:w-8 text-violet-600" />
            </div>
            <h3 className="mb-2 text-base sm:text-lg font-semibold text-foreground text-center">
              Start your journal
            </h3>
            <p className="mb-6 text-center text-sm text-muted-foreground max-w-sm">
              Capture your insights, learnings, and reflections. Your journal is a private space to document your journey.
            </p>
            <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create First Entry
            </Button>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card/50 py-12 sm:py-16 px-4">
            <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-muted mb-4">
              <Search className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-base sm:text-lg font-semibold text-foreground text-center">
              No matching entries
            </h3>
            <p className="mb-6 text-center text-sm text-muted-foreground max-w-sm">
              Try adjusting your search or filters.
            </p>
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchQuery("")
                setFilterType("all")
                setFilterTags([])
              }}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEntries.map(entry => {
              const typeInfo = getEntryTypeInfo(entry.entryType)
              const TypeIcon = typeInfo.icon
              
              return (
                <article
                  key={entry.id}
                  className="rounded-xl border border-border bg-card p-4 sm:p-5 transition-all hover:shadow-md"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-muted flex-shrink-0`}>
                        <TypeIcon className={`h-5 w-5 ${typeInfo.color}`} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground truncate">
                          {entry.title}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(entry.createdAt)}</span>
                          <span>•</span>
                          <span>{formatTime(entry.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => openEditDialog(entry)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Entry</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this journal entry? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDelete(entry.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="text-sm text-foreground/90 mb-3">
                    <MarkdownPreview content={entry.content} />
                  </div>
                  
                  {/* Tags */}
                  {entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {entry.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  {/* Type Badge */}
                  <div className="mt-3 pt-3 border-t border-border">
                    <Badge variant="outline" className="gap-1.5">
                      <TypeIcon className={`h-3 w-3 ${typeInfo.color}`} />
                      {typeInfo.label}
                    </Badge>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
      
      {/* Edit Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Journal Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Entry Type */}
            <div className="space-y-2">
              <Label>Entry Type</Label>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {ENTRY_TYPES.map(type => {
                  const Icon = type.icon
                  const isSelected = entryType === type.value
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setEntryType(type.value)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                        isSelected 
                          ? "border-primary bg-primary/10" 
                          : "border-border hover:border-primary/50 hover:bg-muted"
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${type.color}`} />
                      <span className="text-[10px] font-medium truncate w-full text-center">
                        {type.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
            
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                placeholder="Give your entry a title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            
            {/* Content */}
            <div className="space-y-2">
              <Label>Content *</Label>
              <RichTextEditor
                value={content}
                onChange={setContent}
                placeholder="What's on your mind?"
                minHeight="150px"
              />
            </div>
            
            {/* Tags */}
            <TagInput
              label="Tags"
              tags={tags}
              onTagsChange={setTags}
              existingTags={existingTags}
              placeholder="Add tags..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={!content.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
