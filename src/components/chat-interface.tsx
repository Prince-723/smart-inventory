"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Send, Sparkles, TrendingUp, Package, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"

interface Message {
  id: string
  type: "user" | "assistant" | "confirmation" | "success"
  content: string
  timestamp: Date
}

interface ChatInterfaceProps {
  currentProduct: string
}

const callGeminiAPI = async (message: string, product: string): Promise<string> => {
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        product,
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to get response from Gemini API")
    }

    const data = await response.json()
    return data.reply
  } catch (error) {
    console.error("Error calling Gemini API:", error)
    return "Sorry, I encountered an error processing your request. Please try again."
  }
}

const EXAMPLE_PROMPTS = [
  {
    icon: TrendingUp,
    text: "Forecast demand for bananas for the next 30 days",
  },
  {
    icon: Package,
    text: "Will I run out of stock next month?",
  },
  {
    icon: Calendar,
    text: "Show sales trend for the last 6 months",
  },
]

export function ChatInterface({ currentProduct }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "assistant",
      content: `Hello! I'm your AI inventory assistant. I can help you forecast demand, analyze trends, and update inventory levels for ${currentProduct}. What would you like to know?`,
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const reply = await callGeminiAPI(input, currentProduct)
      const responseMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: reply,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, responseMessage])
    } catch (error) {
      console.error("Error:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleExampleClick = (text: string) => {
    setInput(text)
  }

  return (
    <div className="flex h-[950px] w-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* Chat Messages - Fixed scrollable area */}
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="space-y-4">
          {messages.map((message) => (
          <div key={message.id} className={cn("flex", message.type === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-lg px-4 py-3 break-words",
                message.type === "user" && "bg-primary text-primary-foreground",
                message.type === "assistant" && "bg-muted text-foreground",
                message.type === "confirmation" && "border-2 border-amber-500/50 bg-amber-500/10 text-foreground",
                message.type === "success" && "border-2 border-emerald-500/50 bg-emerald-500/10 text-foreground",
              )}
            >
              <div className="max-h-full overflow-hidden text-sm leading-relaxed text-current">
                <ReactMarkdown
                  components={{
                    p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                    strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
                    em: ({node, ...props}) => <em className="italic" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc list-inside mb-2" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-2" {...props} />,
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
              {message.type === "confirmation" && (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="default">
                    Confirm
                  </Button>
                  <Button size="sm" variant="outline">
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-3">
              <Sparkles className="h-4 w-4 animate-pulse text-primary" />
              <p className="text-sm text-muted-foreground">Analyzing data...</p>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Example Prompts */}
      <div className="flex-shrink-0 border-t border-border bg-muted/30 px-6 py-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Example Questions</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_PROMPTS.map((prompt, index) => {
            const Icon = prompt.icon
            return (
              <button
                key={index}
                onClick={() => handleExampleClick(prompt.text)}
                className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{prompt.text}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 border-t border-border p-4">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask about inventory, demand, or update stock levels..."
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={isLoading} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
