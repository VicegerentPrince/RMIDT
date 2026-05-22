"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Send, Loader2, Bot, User, AlertCircle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import toast, { Toaster } from "react-hot-toast";

const SUGGESTED = [
  "What is the current macro regime for the US and what does it mean for equities?",
  "Which economy is showing the most risk right now?",
  "How does Pakistan's economy compare to the global regime?",
  "What are the key macro tail risks based on recent news?",
  "Give me an actionable trade recommendation based on the current data.",
];

interface ChatMessage {
  role: "user" | "ai";
  content: UserMsg | AiMsg;
  ts: number;
}

interface UserMsg {
  question: string;
}

interface AiMsg {
  answer: string;
  key_points: string[];
  relevant_data: Record<string, string | number>;
  caveats: string;
  model_version?: string;
  generated_at?: string;
}

function UserBubble({ msg }: { msg: UserMsg }) {
  return (
    <div className="flex justify-end gap-3">
      <div className="max-w-lg bg-blue-600/25 border border-blue-500/30 rounded-2xl rounded-tr-sm px-4 py-3">
        <p className="text-sm text-white leading-relaxed">{msg.question}</p>
      </div>
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-1">
        <User className="w-4 h-4 text-white" />
      </div>
    </div>
  );
}

function AiBubble({ msg }: { msg: AiMsg }) {
  const [showData, setShowData] = useState(false);
  const hasData = msg.relevant_data && Object.keys(msg.relevant_data).length > 0;

  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 mt-1">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 max-w-2xl space-y-3">
        <div className="glass rounded-2xl rounded-tl-sm px-4 py-4 space-y-3">
          <p className="text-sm text-gray-100 leading-relaxed">{msg.answer}</p>

          {msg.key_points?.length > 0 && (
            <ul className="space-y-1.5 border-t border-white/5 pt-3">
              {msg.key_points.map((pt, i) => (
                <li key={i} className="flex gap-2 text-xs text-gray-300">
                  <span className="text-emerald-400 shrink-0 mt-0.5">•</span>
                  {pt}
                </li>
              ))}
            </ul>
          )}

          {hasData && (
            <div className="border-t border-white/5 pt-3">
              <button
                onClick={() => setShowData(v => !v)}
                className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
              >
                <ChevronDown className={cn("w-3 h-3 transition-transform", showData && "rotate-180")} />
                Referenced data
              </button>
              <AnimatePresence>
                {showData && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {Object.entries(msg.relevant_data).map(([k, v]) => (
                        <div key={k} className="bg-white/3 rounded-lg px-3 py-2">
                          <div className="text-[10px] text-gray-500 capitalize">{k.replace(/_/g, " ")}</div>
                          <div className="text-xs text-white font-mono mt-0.5">{String(v)}</div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {msg.caveats && (
            <div className="flex gap-2 border-t border-white/5 pt-3">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-gray-500 leading-relaxed">{msg.caveats}</p>
            </div>
          )}
        </div>

        {msg.model_version && (
          <div className="px-1 text-[10px] text-gray-600 font-mono">{msg.model_version}</div>
        )}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(question: string) {
    if (!question.trim() || loading) return;

    const userMsg: ChatMessage = { role: "user", content: { question }, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data: AiMsg = await res.json();
      const aiMsg: ChatMessage = { role: "ai", content: data, ts: Date.now() };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <Toaster position="top-right" toastOptions={{ style: { background: "#111827", color: "#f9fafb", border: "1px solid #1f2937" } }} />

      {/* Header */}
      <div className="px-4 lg:px-6 py-4 border-b border-white/5 flex-shrink-0">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-emerald-400" />
          AI Macro Analyst
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Ask anything about current regimes, market conditions, and predictions · powered by Gemini 2.5 Flash
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-4 space-y-5">
        {messages.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 mt-4"
          >
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                <Bot className="w-7 h-7 text-emerald-400" />
              </div>
              <p className="text-gray-400 text-sm">Ask a question about the current macro environment.</p>
              <p className="text-gray-600 text-xs mt-1">I have live access to regime data, market prices, predictions, and news.</p>
            </div>

            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Suggested questions</div>
              <div className="space-y-2">
                {SUGGESTED.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(s)}
                    className="w-full text-left px-4 py-3 rounded-xl bg-white/3 hover:bg-emerald-500/8 border border-white/5 hover:border-emerald-500/20 text-sm text-gray-400 hover:text-gray-200 transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.ts}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              {msg.role === "user" ? (
                <UserBubble msg={msg.content as UserMsg} />
              ) : (
                <AiBubble msg={msg.content as AiMsg} />
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="glass rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
              <span className="text-sm text-gray-400">Analyzing market data...</span>
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 lg:px-6 py-4 border-t border-white/5 flex-shrink-0">
        <div className="flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about regimes, risks, market conditions... (Enter to send)"
            rows={1}
            className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-all text-sm resize-none leading-relaxed"
            style={{ maxHeight: "120px", overflowY: "auto" }}
            onInput={e => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 120) + "px";
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="p-3 rounded-xl bg-emerald-600/80 hover:bg-emerald-500/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
          </button>
        </div>
        <div className="text-[10px] text-gray-600 mt-2 text-center">
          Shift+Enter for new line · responses reflect live Supabase data
        </div>
      </div>
    </div>
  );
}
