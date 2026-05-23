"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings, KeyRound, Info, Loader2, Bot, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getGeminiKey, saveGeminiKey, clearGeminiKey } from "@/lib/gemini-key";
import { cn } from "@/lib/utils";
import toast, { Toaster } from "react-hot-toast";

function Toggle({ enabled, onChange, disabled }: { enabled: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={cn(
        "relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed",
        enabled ? "bg-emerald-500" : "bg-white/10"
      )}
    >
      <span className={cn(
        "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200",
        enabled && "translate-x-5"
      )} />
    </button>
  );
}

export default function SettingsPage() {
  const supabase = createClient();

  // Password
  const [newPassword, setNewPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  // API key
  const [geminiKey, setGeminiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [savedKey, setSavedKey] = useState("");

  // AI toggle
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Load key from localStorage and AI state from backend on mount
  useEffect(() => {
    const k = getGeminiKey();
    setSavedKey(k);
    setGeminiKey(k);

    fetch("/api/settings")
      .then(r => r.json())
      .then(d => {
        setAiEnabled(d.ai_enabled ?? true);
        setSettingsLoaded(true);
      })
      .catch(() => setSettingsLoaded(true));
  }, []);

  async function updatePassword() {
    if (newPassword.length < 8) { toast.error("Min 8 characters"); return; }
    setPwLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password updated");
      setNewPassword("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setPwLoading(false);
    }
  }

  function handleSaveKey() {
    saveGeminiKey(geminiKey);
    setSavedKey(geminiKey.trim());
    toast.success(geminiKey.trim() ? "API key saved to browser" : "API key cleared");
  }

  function handleClearKey() {
    clearGeminiKey();
    setGeminiKey("");
    setSavedKey("");
    toast.success("API key cleared");
  }

  async function handleAiToggle(value: boolean) {
    setAiLoading(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ai_enabled: value }),
      });
      if (!res.ok) throw new Error();
      setAiEnabled(value);
      toast.success(value ? "AI auto-run enabled" : "AI auto-run paused — pipeline will skip Gemini");
    } catch {
      toast.error("Failed to update setting");
    } finally {
      setAiLoading(false);
    }
  }

  const keyIsActive = Boolean(savedKey);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-2xl">
      <Toaster position="top-right" toastOptions={{ style: { background: "#111827", color: "#f9fafb", border: "1px solid #1f2937" } }} />

      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-400" />
          Settings
        </h1>
      </div>

      {/* Gemini API Key */}
      <div className="glass rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-semibold text-white">Gemini API Key</span>
          </div>
          {keyIsActive ? (
            <span className="flex items-center gap-1.5 text-[11px] text-emerald-400">
              <CheckCircle className="w-3.5 h-3.5" /> Using your key
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <XCircle className="w-3.5 h-3.5" /> Using server key
            </span>
          )}
        </div>

        <p className="text-xs text-gray-500 leading-relaxed">
          Enter your own Google AI Studio key to use your quota instead of the server key.
          The key is stored only in your browser — never sent to any server other than Gemini directly via the backend.
        </p>

        <div className="relative">
          <input
            type={showKey ? "text" : "password"}
            value={geminiKey}
            onChange={e => setGeminiKey(e.target.value)}
            placeholder="AIzaSy..."
            className="w-full px-4 py-3 pr-11 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 transition-all text-sm font-mono"
          />
          <button
            onClick={() => setShowKey(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
          >
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex gap-2">
          <motion.button
            onClick={handleSaveKey}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="flex-1 px-4 py-2 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/30 text-amber-300 text-sm font-medium transition-all"
          >
            Save Key
          </motion.button>
          {keyIsActive && (
            <motion.button
              onClick={handleClearKey}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/20 text-gray-400 hover:text-red-400 text-sm font-medium transition-all"
            >
              Clear
            </motion.button>
          )}
        </div>
      </div>

      {/* AI Auto-Run Toggle */}
      <div className="glass rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-semibold text-white">AI Auto-Run</span>
        </div>

        <div className="flex items-start justify-between gap-4">
          <p className="text-xs text-gray-500 leading-relaxed">
            When <span className="text-emerald-400 font-medium">enabled</span>, the 15-minute pipeline calls Gemini for predictions and news sentiment.
            When <span className="text-red-400 font-medium">disabled</span>, the pipeline still fetches market data and classifies regimes (both free),
            but skips all Gemini API calls — saving tokens.
          </p>
          <div className="shrink-0 pt-0.5">
            {settingsLoaded ? (
              <Toggle enabled={aiEnabled} onChange={handleAiToggle} disabled={aiLoading} />
            ) : (
              <div className="w-11 h-6 rounded-full bg-white/5 animate-pulse" />
            )}
          </div>
        </div>

        <div className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-colors",
          aiEnabled
            ? "bg-emerald-500/8 border-emerald-500/20 text-emerald-300"
            : "bg-red-500/8 border-red-500/20 text-red-300"
        )}>
          {aiLoading
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : aiEnabled
              ? <CheckCircle className="w-3.5 h-3.5" />
              : <XCircle className="w-3.5 h-3.5" />
          }
          {aiEnabled ? "Gemini will run every 15 minutes" : "Gemini paused — data & ML still run on schedule"}
        </div>
      </div>

      {/* Change Password */}
      <div className="glass rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-white">Change Password</span>
        </div>
        <input
          type="password"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          placeholder="New password (min 8 chars)"
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-all text-sm"
        />
        <motion.button
          onClick={updatePassword}
          disabled={pwLoading || !newPassword}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/30 text-blue-300 text-sm font-medium transition-all disabled:opacity-40"
        >
          {pwLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Update Password
        </motion.button>
      </div>

      {/* About */}
      <div className="glass rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-white">About RMIDT</span>
        </div>
        <div className="space-y-2 text-sm text-gray-400">
          <div className="flex justify-between"><span>Version</span><span className="text-white font-mono">1.0.0</span></div>
          <div className="flex justify-between"><span>AI Model</span><span className="text-white font-mono">gemini-2.5-flash</span></div>
          <div className="flex justify-between"><span>Regime Model</span><span className="text-white font-mono">RandomForest (scikit-learn)</span></div>
          <div className="flex justify-between"><span>Search</span><span className="text-white font-mono">k-NN cosine similarity</span></div>
          <div className="flex justify-between"><span>Pipeline Interval</span><span className="text-white font-mono">15 minutes</span></div>
          <div className="flex justify-between"><span>Data Sources</span><span className="text-white font-mono">yfinance · FRED · WorldBank · CoinGecko · NewsAPI</span></div>
        </div>
      </div>
    </div>
  );
}
