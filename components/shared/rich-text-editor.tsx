"use client"

import { useRef, useCallback } from "react"
import { 
  Bold, 
  Italic, 
  Heading2, 
  List, 
  ListOrdered, 
  Quote,
  Strikethrough,
  Code,
  Link2,
  Minus
} from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  minHeight?: string
}

interface FormatAction {
  icon: React.ElementType
  label: string
  prefix: string
  suffix: string
  block?: boolean // If true, applies to whole line
}

const FORMAT_ACTIONS: FormatAction[] = [
  { icon: Bold, label: "Bold", prefix: "**", suffix: "**" },
  { icon: Italic, label: "Italic", prefix: "_", suffix: "_" },
  { icon: Strikethrough, label: "Strikethrough", prefix: "~~", suffix: "~~" },
  { icon: Code, label: "Code", prefix: "`", suffix: "`" },
]

const BLOCK_ACTIONS: FormatAction[] = [
  { icon: Heading2, label: "Heading", prefix: "## ", suffix: "", block: true },
  { icon: List, label: "Bullet List", prefix: "- ", suffix: "", block: true },
  { icon: ListOrdered, label: "Numbered List", prefix: "1. ", suffix: "", block: true },
  { icon: Quote, label: "Quote", prefix: "> ", suffix: "", block: true },
]

export function RichTextEditor({ 
  value, 
  onChange, 
  placeholder = "What's on your mind?",
  className,
  minHeight = "150px"
}: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const applyFormat = useCallback((action: FormatAction) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = value
    const selectedText = text.substring(start, end)

    let newText: string
    let newCursorPos: number

    if (action.block) {
      // For block formatting, find the start of the current line
      const lineStart = text.lastIndexOf('\n', start - 1) + 1
      const lineEnd = text.indexOf('\n', end)
      const actualLineEnd = lineEnd === -1 ? text.length : lineEnd
      const currentLine = text.substring(lineStart, actualLineEnd)

      // Check if the line already has this prefix
      if (currentLine.startsWith(action.prefix)) {
        // Remove the prefix
        newText = text.substring(0, lineStart) + currentLine.substring(action.prefix.length) + text.substring(actualLineEnd)
        newCursorPos = start - action.prefix.length
      } else {
        // Add the prefix
        newText = text.substring(0, lineStart) + action.prefix + currentLine + text.substring(actualLineEnd)
        newCursorPos = start + action.prefix.length
      }
    } else {
      // For inline formatting
      if (selectedText) {
        // Check if already formatted
        const beforeStart = start - action.prefix.length
        const afterEnd = end + action.suffix.length
        const potentialPrefix = text.substring(Math.max(0, beforeStart), start)
        const potentialSuffix = text.substring(end, Math.min(text.length, afterEnd))

        if (potentialPrefix === action.prefix && potentialSuffix === action.suffix) {
          // Remove formatting
          newText = text.substring(0, beforeStart) + selectedText + text.substring(afterEnd)
          newCursorPos = beforeStart + selectedText.length
        } else {
          // Add formatting
          newText = text.substring(0, start) + action.prefix + selectedText + action.suffix + text.substring(end)
          newCursorPos = end + action.prefix.length + action.suffix.length
        }
      } else {
        // No selection - insert placeholder
        const placeholder = action.label.toLowerCase()
        newText = text.substring(0, start) + action.prefix + placeholder + action.suffix + text.substring(end)
        newCursorPos = start + action.prefix.length + placeholder.length
        
        // Select the placeholder text
        setTimeout(() => {
          textarea.setSelectionRange(
            start + action.prefix.length,
            start + action.prefix.length + placeholder.length
          )
        }, 0)
      }
    }

    onChange(newText)
    
    // Restore focus and cursor position
    setTimeout(() => {
      textarea.focus()
      if (!selectedText || action.block) {
        textarea.setSelectionRange(newCursorPos, newCursorPos)
      }
    }, 0)
  }, [value, onChange])

  const insertDivider = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const text = value
    
    // Find if we're at the start of a line
    const lineStart = text.lastIndexOf('\n', start - 1) + 1
    const isAtLineStart = start === lineStart
    
    const divider = "\n---\n"
    const prefix = isAtLineStart ? "" : "\n"
    
    const newText = text.substring(0, start) + prefix + divider + text.substring(start)
    onChange(newText)
    
    setTimeout(() => {
      textarea.focus()
      const newPos = start + prefix.length + divider.length
      textarea.setSelectionRange(newPos, newPos)
    }, 0)
  }, [value, onChange])

  const insertLink = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = value
    const selectedText = text.substring(start, end)

    const linkText = selectedText || "link text"
    const linkMarkdown = `[${linkText}](url)`
    
    const newText = text.substring(0, start) + linkMarkdown + text.substring(end)
    onChange(newText)
    
    setTimeout(() => {
      textarea.focus()
      // Select "url" part for easy replacement
      const urlStart = start + linkText.length + 3 // [linkText](
      const urlEnd = urlStart + 3 // url
      textarea.setSelectionRange(urlStart, urlEnd)
    }, 0)
  }, [value, onChange])

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault()
          applyFormat(FORMAT_ACTIONS[0]) // Bold
          break
        case 'i':
          e.preventDefault()
          applyFormat(FORMAT_ACTIONS[1]) // Italic
          break
        case 'k':
          e.preventDefault()
          insertLink()
          break
      }
    }
  }, [applyFormat, insertLink])

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-1 rounded-lg border border-border bg-muted/30">
        {/* Inline formatting */}
        {FORMAT_ACTIONS.map((action) => (
          <Toggle
            key={action.label}
            size="sm"
            aria-label={action.label}
            onClick={() => applyFormat(action)}
            className="h-8 w-8 p-0 data-[state=on]:bg-primary/20"
          >
            <action.icon className="h-4 w-4" />
          </Toggle>
        ))}
        
        <Separator orientation="vertical" className="mx-1 h-6" />
        
        {/* Block formatting */}
        {BLOCK_ACTIONS.map((action) => (
          <Toggle
            key={action.label}
            size="sm"
            aria-label={action.label}
            onClick={() => applyFormat(action)}
            className="h-8 w-8 p-0 data-[state=on]:bg-primary/20"
          >
            <action.icon className="h-4 w-4" />
          </Toggle>
        ))}
        
        <Separator orientation="vertical" className="mx-1 h-6" />
        
        {/* Special actions */}
        <Toggle
          size="sm"
          aria-label="Insert Link"
          onClick={insertLink}
          className="h-8 w-8 p-0 data-[state=on]:bg-primary/20"
        >
          <Link2 className="h-4 w-4" />
        </Toggle>
        
        <Toggle
          size="sm"
          aria-label="Insert Divider"
          onClick={insertDivider}
          className="h-8 w-8 p-0 data-[state=on]:bg-primary/20"
        >
          <Minus className="h-4 w-4" />
        </Toggle>
      </div>
      
      {/* Hints */}
      <p className="text-[10px] text-muted-foreground">
        <span className="hidden sm:inline">Shortcuts: </span>
        <kbd className="px-1 py-0.5 text-[9px] bg-muted rounded">Ctrl+B</kbd> Bold
        <span className="mx-1">•</span>
        <kbd className="px-1 py-0.5 text-[9px] bg-muted rounded">Ctrl+I</kbd> Italic
        <span className="mx-1">•</span>
        <kbd className="px-1 py-0.5 text-[9px] bg-muted rounded">Ctrl+K</kbd> Link
      </p>
      
      {/* Textarea */}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn("font-mono text-sm", className)}
        style={{ minHeight }}
      />
    </div>
  )
}

// Simple markdown preview component
export function MarkdownPreview({ content, className }: { content: string; className?: string }) {
  const renderMarkdown = (text: string): string => {
    if (!text) return ""
    
    let html = text
      // Escape HTML first
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      // Headers
      .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-3 mb-1">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mt-4 mb-2">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-4 mb-2">$1</h1>')
      // Horizontal rule
      .replace(/^---$/gm, '<hr class="my-3 border-border" />')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      // Italic
      .replace(/_(.+?)_/g, '<em class="italic">$1</em>')
      // Strikethrough
      .replace(/~~(.+?)~~/g, '<del class="line-through opacity-60">$1</del>')
      // Code
      .replace(/`(.+?)`/g, '<code class="px-1 py-0.5 bg-muted rounded text-xs font-mono">$1</code>')
      // Links
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-primary underline hover:no-underline" target="_blank" rel="noopener noreferrer">$1</a>')
      // Block quotes
      .replace(/^&gt; (.+)$/gm, '<blockquote class="pl-3 border-l-2 border-primary/50 text-muted-foreground italic">$1</blockquote>')
      // Bullet lists
      .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
      // Numbered lists (simple approach)
      .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
      // Line breaks
      .replace(/\n/g, '<br />')
    
    return html
  }

  return (
    <div 
      className={cn("prose prose-sm dark:prose-invert max-w-none", className)}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  )
}
