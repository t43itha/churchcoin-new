"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface ChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  churchId?: string;
  context?: {
    page?: string;
    fundId?: string;
    donorId?: string;
    transactionId?: string;
  };
}

export function ChatDialog({ open, onOpenChange, churchId, context }: ChatDialogProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isReady = Boolean(churchId);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (open && messages.length === 0) {
      const greeting: Message = {
        role: "assistant",
        content: `Hello! I'm your AI assistant for ChurchCoin. I can help you with:\n\n• Analyzing financial data and trends\n• Generating reports and insights\n• Answering questions about your church finances\n• Finding specific transactions or donors\n\nWhat would you like to know?`,
        timestamp: Date.now(),
      };
      setMessages([greeting]);
    }
  }, [open, messages.length]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;
    if (!churchId) {
      const errorMessage: Message = {
        role: "assistant",
        content:
          "I need to know which church you're working with before I can help. Please wait for the dashboard to finish loading and try again.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      return;
    }

    const userMessage: Message = {
      role: "user",
      content,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setInput("");

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          context,
          history: messages.slice(-5),
          churchId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();

      const assistantMessage: Message = {
        role: "assistant",
        content: data.message || "I'm sorry, I couldn't process that request.",
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        role: "assistant",
        content: "I'm sorry, I encountered an error. Please try again.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => {
    void sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickActions = [
    "Show me top donors this year",
    "What's our current balance?",
    "Generate a monthly report",
    "Which expenses increased?",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[600px] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-ledger">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-highlight">
                <Sparkles className="h-5 w-5 text-ink" />
              </div>
              <div>
                <DialogTitle className="text-ink font-primary">AI Assistant</DialogTitle>
                <DialogDescription className="text-grey-mid font-primary">
                  Ask me anything about your church finances
                </DialogDescription>
              </div>
            </div>
          </div>
          {context?.page && (
            <Badge variant="secondary" className="w-fit mt-2 font-primary">
              Context: {context.page}
            </Badge>
          )}
        </DialogHeader>

        <ScrollArea className="flex-1 px-6" ref={scrollRef}>
          <div className="space-y-4 py-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 ${
                    message.role === "user"
                      ? "bg-ink text-paper"
                      : "bg-highlight border border-ledger text-ink"
                  }`}
                >
                  <p className="text-sm font-primary whitespace-pre-wrap">
                    {message.content}
                  </p>
                  <p
                    className={`text-xs mt-1 ${
                      message.role === "user" ? "text-grey-light" : "text-grey-mid"
                    }`}
                  >
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-highlight border border-ledger rounded-lg px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-grey-mid" />
                </div>
              </div>
            )}
          </div>

          {messages.length === 1 && (
            <div className="space-y-2 pb-4">
              <p className="text-xs uppercase tracking-wide text-grey-mid font-primary">
                Quick actions
              </p>
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((action, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="border-ledger font-primary text-xs justify-start h-auto py-2"
                    disabled={!isReady || isLoading}
                    onClick={() => {
                      if (!isReady || isLoading) {
                        return;
                      }
                      setInput(action);
                      void sendMessage(action);
                    }}
                  >
                    {action}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>

        <div className="px-6 py-4 border-t border-ledger">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              className="font-primary"
              disabled={isLoading || !isReady}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading || !isReady}
              className="shrink-0"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-grey-mid mt-2 font-primary">
            {isReady
              ? "Press Enter to send, Shift+Enter for new line"
              : "Loading church data… you can start chatting once it finishes."}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
