"use client"

import { WifiOff, RefreshCw } from "lucide-react"

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="mb-8 flex justify-center">
          <div className="w-24 h-24 rounded-full bg-zinc-900 flex items-center justify-center">
            <WifiOff className="w-12 h-12 text-zinc-500" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold mb-4">You're Offline</h1>
        
        <p className="text-zinc-400 mb-8">
          It looks like you've lost your internet connection. Don't worry – your goals and progress are saved locally.
        </p>
        
        <div className="space-y-4">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          
          <p className="text-sm text-zinc-600">
            Your data will sync automatically when you're back online.
          </p>
        </div>
        
        <div className="mt-12 pt-8 border-t border-zinc-800">
          <div className="flex items-center justify-center gap-2 text-zinc-600">
            <svg 
              viewBox="0 0 100 100" 
              className="w-6 h-6"
              fill="currentColor"
            >
              <path d="M20 30 L45 30 L45 70 L20 50 Z M55 30 L80 50 L55 70 Z" />
            </svg>
            <span className="font-medium">GoalRitual</span>
          </div>
        </div>
      </div>
    </div>
  )
}

