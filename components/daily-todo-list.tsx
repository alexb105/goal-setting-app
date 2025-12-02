"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, X, Sun, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import type { DailyTodo } from "@/types"

const STORAGE_KEY = "pathwise-daily-todos"
const LAST_RESET_KEY = "pathwise-daily-todos-last-reset"

function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0]
}

export function DailyTodoList() {
  const [todos, setTodos] = useState<DailyTodo[]>([])
  const [newTodoTitle, setNewTodoTitle] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load todos from localStorage and handle daily reset
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    const lastReset = localStorage.getItem(LAST_RESET_KEY)
    const today = getTodayDateString()

    let loadedTodos: DailyTodo[] = []

    if (stored) {
      try {
        loadedTodos = JSON.parse(stored)
      } catch {
        loadedTodos = []
      }
    }

    // Check if we need to reset (new day)
    if (lastReset !== today) {
      // Filter out completed todos, keep only uncompleted ones
      loadedTodos = loadedTodos.filter((todo) => !todo.completed)
      localStorage.setItem(LAST_RESET_KEY, today)
    }

    setTodos(loadedTodos)
    setIsLoaded(true)
  }, [])

  // Save todos to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
    }
  }, [todos, isLoaded])

  const addTodo = useCallback(() => {
    if (!newTodoTitle.trim()) return

    const newTodo: DailyTodo = {
      id: crypto.randomUUID(),
      title: newTodoTitle.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    }

    setTodos((prev) => [...prev, newTodo])
    setNewTodoTitle("")
    setIsAdding(false)
  }, [newTodoTitle])

  const toggleTodo = useCallback((id: string) => {
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    )
  }, [])

  const deleteTodo = useCallback((id: string) => {
    setTodos((prev) => prev.filter((todo) => todo.id !== id))
  }, [])

  const clearCompleted = useCallback(() => {
    setTodos((prev) => prev.filter((todo) => !todo.completed))
  }, [])

  const completedCount = todos.filter((t) => t.completed).length
  const totalCount = todos.length

  return (
    <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
            <Sun className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Today's Tasks</h3>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {totalCount === 0
                ? "No tasks for today"
                : `${completedCount}/${totalCount} completed`}
            </p>
          </div>
        </div>
        {completedCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearCompleted}
            className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2"
          >
            <Trash2 className="h-3 w-3" />
            <span className="hidden sm:inline">Clear done</span>
          </Button>
        )}
      </div>

      {/* Todo List */}
      <div className="space-y-1.5">
        {todos.map((todo) => (
          <div
            key={todo.id}
            className="group flex items-center gap-2 rounded-lg border border-border/50 bg-background/50 px-2.5 py-2 transition-colors hover:bg-muted/30"
          >
            <Checkbox
              id={`daily-todo-${todo.id}`}
              checked={todo.completed}
              onCheckedChange={() => toggleTodo(todo.id)}
              className="h-4 w-4"
            />
            <label
              htmlFor={`daily-todo-${todo.id}`}
              className={cn(
                "flex-1 text-sm cursor-pointer",
                todo.completed && "line-through text-muted-foreground"
              )}
            >
              {todo.title}
            </label>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => deleteTodo(todo.id)}
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      {/* Add Todo */}
      {isAdding ? (
        <div className="mt-2 flex items-center gap-2">
          <Input
            placeholder="What needs to be done today?"
            value={newTodoTitle}
            onChange={(e) => setNewTodoTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addTodo()
              if (e.key === "Escape") {
                setIsAdding(false)
                setNewTodoTitle("")
              }
            }}
            className="h-9 text-sm flex-1"
            autoFocus
          />
          <Button size="sm" onClick={addTodo} disabled={!newTodoTitle.trim()} className="h-9">
            Add
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setIsAdding(false)
              setNewTodoTitle("")
            }}
            className="h-9"
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsAdding(true)}
          className="mt-2 w-full h-9 text-xs text-muted-foreground hover:text-foreground justify-start gap-2"
        >
          <Plus className="h-3.5 w-3.5" />
          Add a task for today
        </Button>
      )}

      {/* Info text */}
      <p className="mt-2 text-[10px] text-muted-foreground/70 text-center">
        Completed tasks clear at midnight. Uncompleted tasks carry over.
      </p>
    </div>
  )
}

