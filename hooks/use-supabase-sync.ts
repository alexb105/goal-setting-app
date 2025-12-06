"use client"

import { useEffect, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { getSyncInstance } from "@/lib/supabase/sync"
import type { User } from "@supabase/supabase-js"

/**
 * Hook to sync local storage data changes with Supabase.
 * Call this in components that modify localStorage to trigger cloud sync.
 */
export function useSupabaseSync() {
  const supabase = createClient()
  const sync = getSyncInstance(supabase)
  const userRef = useRef<User | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Get current user on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      userRef.current = session?.user ?? null
      sync.setUser(userRef.current)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => {
        userRef.current = session?.user ?? null
        sync.setUser(userRef.current)
      }
    )

    return () => {
      subscription.unsubscribe()
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [supabase.auth, sync])

  // Debounced sync function
  const triggerSync = useCallback(() => {
    if (!userRef.current) return

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(async () => {
      try {
        await sync.syncToCloud()
      } catch (error) {
        console.error("Sync error:", error)
      }
    }, 1000) // Debounce for 1 second
  }, [sync])

  return { triggerSync }
}



