export const PASTEL_COLORS = [
  { name: "Pink", value: "#FFD6E8" },
  { name: "Blue", value: "#D6E8FF" },
  { name: "Green", value: "#D6FFD6" },
  { name: "Yellow", value: "#FFF9D6" },
  { name: "Purple", value: "#E8D6FF" },
  { name: "Orange", value: "#FFE8D6" },
  { name: "Teal", value: "#D6FFF0" },
  { name: "Coral", value: "#FFD6D6" },
  { name: "Salmon", value: "#FFE0D6" },
  { name: "Sky", value: "#D6F5FF" },
] as const

export const STORAGE_KEY = "goalritual-goals"

export const PRIORITY_COLORS: Record<number, string> = {
  0: "bg-gray-400 hover:bg-gray-500",
  1: "bg-red-500 hover:bg-red-600",
  2: "bg-orange-500 hover:bg-orange-600",
  3: "bg-yellow-500 hover:bg-yellow-600",
  4: "bg-blue-500 hover:bg-blue-600",
  5: "bg-green-500 hover:bg-green-600",
} as const



