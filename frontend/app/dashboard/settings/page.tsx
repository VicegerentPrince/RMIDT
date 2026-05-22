"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Settings, KeyRound, Info, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import toast, { Toaster } from "react-hot-toast";

export default function SettingsPage() {
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function updatePassword() {
    if (newPassword.length < 8) { toast.error("Min 8 characters"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password updated");
      setNewPassword("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setLoading(false);
    }
  }

  const cards = [
    {
      icon: Info,
      title: "About RMIDT",
      content: (
        <div className="space-y-2 text-sm text-gray-400">
          <div className="flex justify-between"><span>Version</span><span className="text-white font-mono">1.0.0</span></div>
          <div className="flex justify-between"><span>AI Model</span><span className="text-white font-mono">gemini-2.5-flash</span></div>
          <div className="flex justify-between"><span>Regime Model</span><span className="text-white font-mono">RandomForest (scikit-learn)</span></div>
          <div className="flex justify-between"><span>Pipeline Interval</span><span className="text-white font-mono">15 minutes</span></div>
          <div className="flex justify-between"><span>Data Sources</span><span className="text-white font-mono">yfinance · FRED · WorldBank · CoinGecko · NewsAPI</span></div>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-2xl">
      <Toaster position="top-right" toastOptions={{ style: { background: "#111827", color: "#f9fafb", border: "1px solid #1f2937" } }} />

      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-400" />
          Settings
        </h1>
      </div>

      {/* Change password */}
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
          disabled={loading || !newPassword}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/30 text-blue-300 text-sm font-medium transition-all disabled:opacity-40"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Update Password
        </motion.button>
      </div>

      {/* About */}
      {cards.map(({ icon: Icon, title, content }) => (
        <div key={title} className="glass rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-semibold text-white">{title}</span>
          </div>
          {content}
        </div>
      ))}
    </div>
  );
}
