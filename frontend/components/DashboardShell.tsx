"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, LayoutDashboard, TrendingUp, Globe2,
  FileText, Zap, Settings, LogOut, Menu,
  Wifi, WifiOff, Play, MessageSquare, Bot
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { aiHeaders } from "@/lib/gemini-key";
import type { User } from "@supabase/supabase-js";
import toast, { Toaster } from "react-hot-toast";

const NAV = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Markets", href: "/dashboard/markets", icon: TrendingUp },
  { label: "Regimes", href: "/dashboard/regimes", icon: Globe2 },
  { label: "Predictions", href: "/dashboard/predictions", icon: FileText },
  { label: "AI Agent", href: "/dashboard/agent", icon: Bot },
  { label: "AI Chat", href: "/dashboard/chat", icon: MessageSquare },
  { label: "Stress Test", href: "/dashboard/stress-test", icon: Zap },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

function UTCClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    function update() {
      setTime(new Date().toUTCString().slice(17, 25) + " UTC");
    }
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="text-gray-500 text-xs font-mono">{time}</span>;
}

interface SidebarProps {
  pathname: string;
  user: User;
  onNavClick: () => void;
  onLogout: () => void;
}

function Sidebar({ pathname, user, onNavClick, onLogout }: SidebarProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0">
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <div className="text-base font-bold text-white tracking-tight">RMIDT</div>
            <div className="text-[10px] text-gray-500 leading-none">Decision Twin</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavClick}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group relative",
                active
                  ? "bg-blue-500/15 text-blue-300 border border-blue-500/20"
                  : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
              )}
            >
              <Icon className={cn("w-4 h-4 shrink-0", active ? "text-blue-400" : "text-gray-500 group-hover:text-gray-300")} />
              {label}
              {active && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-400 rounded-full"
                />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-white/5">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
            {user.email?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-gray-200 truncate">{user.email}</div>
            <div className="text-[10px] text-gray-500">Analyst</div>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-xl text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}

export default function DashboardShell({ children, user }: { children: React.ReactNode; user: User }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [pipelineStatus, setPipelineStatus] = useState<"ok" | "error" | "running" | "idle">("idle");

  async function runPipeline() {
    setPipelineRunning(true);
    setPipelineStatus("running");
    try {
      const res = await fetch("/api/pipeline/run", { headers: aiHeaders() });
      if (res.ok) {
        setPipelineStatus("ok");
        toast.success("Pipeline completed — data refreshed");
      } else {
        setPipelineStatus("error");
        toast.error("Pipeline failed");
      }
    } catch {
      setPipelineStatus("error");
      toast.error("Could not reach backend");
    } finally {
      setPipelineRunning(false);
      setTimeout(() => setPipelineStatus("idle"), 5000);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const StatusIcon = pipelineStatus === "error" ? WifiOff : Wifi;
  const statusColor = { ok: "text-emerald-400", error: "text-red-400", running: "text-amber-400", idle: "text-gray-600" }[pipelineStatus];

  const sidebarProps: SidebarProps = {
    pathname,
    user,
    onNavClick: () => setSidebarOpen(false),
    onLogout: logout,
  };

  return (
    <div className="flex h-screen bg-[#0a0e1a] overflow-hidden">
      <Toaster position="top-right" toastOptions={{ style: { background: "#111827", color: "#f9fafb", border: "1px solid #1f2937" } }} />

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-56 flex-col bg-[#0d1221] border-r border-white/5 shrink-0">
        <Sidebar {...sidebarProps} />
      </aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-56 bg-[#0d1221] border-r border-white/5 lg:hidden"
            >
              <Sidebar {...sidebarProps} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-14 flex items-center gap-4 px-4 border-b border-white/5 bg-[#0d1221]/50 backdrop-blur shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-400 hover:text-white transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <StatusIcon className={cn("w-4 h-4 pulse-dot", statusColor)} />
            <span className="text-xs text-gray-500 hidden sm:inline">
              {pipelineStatus === "running" ? "Running..." : pipelineStatus === "ok" ? "Live" : "Ready"}
            </span>
          </div>

          <div className="flex-1" />

          <UTCClock />

          <button
            onClick={runPipeline}
            disabled={pipelineRunning}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-3 h-3" />
            <span className="hidden sm:inline">{pipelineRunning ? "Running..." : "Run Pipeline"}</span>
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="h-full"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
