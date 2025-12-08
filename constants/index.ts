// West Quest themed goal colors - expanded palette with variety
export const PASTEL_COLORS = [
  // Row 1: Deep purples & violets
  { name: "Violet", value: "#7C3AED" },      // Vibrant violet
  { name: "Purple", value: "#9333EA" },      // Rich purple
  { name: "Amethyst", value: "#6D28D9" },    // Deep amethyst
  { name: "Grape", value: "#5B21B6" },       // Dark grape
  { name: "Indigo", value: "#4F46E5" },      // True indigo
  
  // Row 2: Blues & teals (complementary)
  { name: "Sapphire", value: "#2563EB" },    // Royal blue
  { name: "Ocean", value: "#0EA5E9" },       // Ocean blue
  { name: "Teal", value: "#14B8A6" },        // Teal
  { name: "Cyan", value: "#06B6D4" },        // Cyan
  { name: "Navy", value: "#1E40AF" },        // Deep navy
  
  // Row 3: Magentas & pinks
  { name: "Fuchsia", value: "#D946EF" },     // Bright fuchsia
  { name: "Magenta", value: "#A21CAF" },     // Deep magenta
  { name: "Rose", value: "#EC4899" },        // Rose pink
  { name: "Pink", value: "#F472B6" },        // Soft pink
  { name: "Berry", value: "#BE185D" },       // Berry
  
  // Row 4: Soft pastels (lighter options)
  { name: "Lavender", value: "#A78BFA" },    // Soft lavender
  { name: "Orchid", value: "#C084FC" },      // Light orchid
  { name: "Periwinkle", value: "#818CF8" },  // Periwinkle
  { name: "Sky", value: "#7DD3FC" },         // Sky blue
  { name: "Mint", value: "#5EEAD4" },        // Mint teal
] as const

export const STORAGE_KEY = "goalritual-goals"

// Special goal ID for standalone milestones (not tied to any specific goal)
export const STANDALONE_MILESTONES_GOAL_ID = "standalone-milestones"
export const STANDALONE_MILESTONES_GOAL_TITLE = "Quick Milestones"

// West Quest themed priority colors - purple gradient spectrum
export const PRIORITY_COLORS: Record<number, string> = {
  0: "bg-slate-500/70 hover:bg-slate-500/90",           // No priority - muted
  1: "bg-fuchsia-500 hover:bg-fuchsia-600",             // Highest - bright fuchsia
  2: "bg-violet-500 hover:bg-violet-600",               // High - violet
  3: "bg-purple-500 hover:bg-purple-600",               // Medium - purple
  4: "bg-indigo-500 hover:bg-indigo-600",               // Low - indigo
  5: "bg-blue-500/80 hover:bg-blue-500/90",             // Lowest - soft blue
} as const



