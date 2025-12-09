import { NextRequest, NextResponse } from "next/server"

// Increase max duration for serverless functions (Vercel default is 10s, we need more for AI)
export const maxDuration = 60

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_TIMEOUT = 55000 // 55 seconds (slightly less than maxDuration to avoid gateway timeout)

export async function POST(request: NextRequest) {
  if (!OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OpenAI API key not configured" },
      { status: 500 }
    )
  }

  const abortController = new AbortController()
  const timeoutId = setTimeout(() => abortController.abort(), OPENAI_TIMEOUT)

  try {
    const body = await request.json()
    const { messages, max_tokens = 4000, temperature = 0.7 } = body

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      )
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature,
        max_tokens,
      }),
      signal: abortController.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("OpenAI API error:", errorData)
      return NextResponse.json(
        { error: errorData.error?.message || `OpenAI API error: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    clearTimeout(timeoutId)
    
    if (error instanceof Error && error.name === 'AbortError') {
      console.error("OpenAI API timeout:", error)
      return NextResponse.json(
        { error: "Request timed out. The AI service is taking too long to respond. Please try again." },
        { status: 504 }
      )
    }
    
    console.error("AI API route error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    )
  }
}








