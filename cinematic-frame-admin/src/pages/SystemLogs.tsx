import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Activity, AlertCircle, ArrowDown, ChevronDown, ChevronRight,
    Clock, Loader2, RefreshCw, Search, Server, Shield, Trash2, Wifi, WifiOff,
} from "lucide-react";
import { getLogs, getLogStats, clearAllLogs } from "@/lib/api";
import { toast } from "@/components/ui/use-toast";

// ─── Types ───────────────────────────────────────────────────────────────────
interface LogEntry {
    id: number;
    method: string;
    url: string;
    statusCode: number | null;
    requestHeaders: Record<string, string> | null;
    requestBody: Record<string, unknown> | null;
    requestQuery: Record<string, string> | null;
    responseBody: unknown | null;
    responseSize: number | null;
    duration: number | null;
    ipAddress: string | null;
    userAgent: string | null;
    logType: "request" | "response" | "error" | "system";
    isError: boolean;
    createdAt: string;
}

interface LogStats {
    total: number;
    requests: number;
    responses: number;
    errors: number;
    blocked: number;
    avgResponseMs: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const METHOD_COLORS: Record<string, string> = {
    GET: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    POST: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    PUT: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    PATCH: "bg-violet-500/20 text-violet-400 border-violet-500/30",
    DELETE: "bg-red-500/20 text-red-400 border-red-500/30",
    OPTIONS: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    HEAD: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

function statusColor(code: number | null): string {
    if (!code) return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    if (code < 300) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    if (code < 400) return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    if (code < 500) return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    return "bg-red-500/20 text-red-400 border-red-500/30";
}

function formatBytes(bytes: number | null): string {
    if (!bytes) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
}

function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString("en-IN", { hour12: false });
}

function formatDuration(ms: number | null): string {
    if (!ms && ms !== 0) return "-";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
}

function shortenUrl(url: string, max = 70): string {
    return url.length > max ? url.slice(0, max) + "…" : url;
}

// ─── JSON Viewer ─────────────────────────────────────────────────────────────
function JsonViewer({ data }: { data: unknown }) {
    if (data === null || data === undefined) {
        return <span className="text-slate-500 text-xs italic">null</span>;
    }
    return (
        <pre className="text-xs leading-5 whitespace-pre-wrap break-all font-mono text-slate-300">
            {JSON.stringify(data, null, 2)}
        </pre>
    );
}

// ─── Log Row ─────────────────────────────────────────────────────────────────
function LogRow({ log }: { log: LogEntry }) {
    const [expanded, setExpanded] = useState(false);
    const showReq = log.requestHeaders || log.requestBody || log.requestQuery;
    const showRes = log.responseBody;

    return (
        <div
            className={`border-b border-white/5 transition-colors ${log.isError ? "bg-red-900/5 hover:bg-red-900/10" : "hover:bg-white/3"
                }`}
        >
            {/* Row Header */}
            <button
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left"
                onClick={() => setExpanded((p) => !p)}
            >
                {/* Method badge */}
                <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border tracking-wider uppercase flex-shrink-0 w-16 justify-center ${METHOD_COLORS[log.method] || "bg-slate-500/20 text-slate-400 border-slate-500/30"
                        }`}
                >
                    {log.method}
                </span>

                {/* URL */}
                <span className="flex-1 font-mono text-xs text-slate-200 truncate">
                    {shortenUrl(log.url)}
                </span>

                {/* Status */}
                {log.statusCode && (
                    <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded border flex-shrink-0 ${statusColor(
                            log.statusCode
                        )}`}
                    >
                        {log.statusCode}
                    </span>
                )}

                {/* Size */}
                <span className="text-[11px] text-slate-500 w-16 text-right flex-shrink-0">
                    {formatBytes(log.responseSize)}
                </span>

                {/* Duration */}
                <span className="text-[11px] text-slate-500 w-14 text-right flex-shrink-0">
                    {formatDuration(log.duration)}
                </span>

                {/* Time */}
                <span className="text-[11px] text-slate-500 w-20 text-right flex-shrink-0">
                    {formatTime(log.createdAt)}
                </span>

                {/* Chevron */}
                <span className="text-slate-600 flex-shrink-0 ml-1">
                    {expanded ? (
                        <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                        <ChevronRight className="h-3.5 w-3.5" />
                    )}
                </span>
            </button>

            {/* Expanded Detail */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 space-y-3">
                            {/* Request */}
                            {showReq && (
                                <div className="rounded-lg border border-white/8 overflow-hidden">
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/4 border-b border-white/8">
                                        <ArrowDown className="h-3 w-3 text-emerald-400 rotate-180" />
                                        <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-widest">
                                            Request
                                        </span>
                                    </div>
                                    <div className="p-3 bg-[#0d1117]">
                                        <JsonViewer
                                            data={{
                                                ...(log.requestQuery ? { query: log.requestQuery } : {}),
                                                ...(log.requestBody ? { body: log.requestBody } : {}),
                                                ...(log.requestHeaders ? { headers: log.requestHeaders } : {}),
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Response */}
                            {showRes && (
                                <div className="rounded-lg border border-white/8 overflow-hidden">
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/4 border-b border-white/8">
                                        <ArrowDown className="h-3 w-3 text-sky-400" />
                                        <span className="text-[10px] font-semibold text-sky-400 uppercase tracking-widest">
                                            Response
                                        </span>
                                    </div>
                                    <div className="p-3 bg-[#0d1117] max-h-72 overflow-y-auto">
                                        <JsonViewer data={log.responseBody} />
                                    </div>
                                </div>
                            )}

                            {/* Meta */}
                            <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-slate-500">
                                {log.ipAddress && <span>IP: <span className="text-slate-400">{log.ipAddress}</span></span>}
                                {log.userAgent && (
                                    <span className="truncate max-w-sm">
                                        UA: <span className="text-slate-400">{log.userAgent}</span>
                                    </span>
                                )}
                                <span>Type: <span className="text-slate-400">{log.logType}</span></span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Stat Chip ────────────────────────────────────────────────────────────────
function StatChip({
    label,
    value,
    color = "text-slate-300",
}: {
    label: string;
    value: number | string;
    color?: string;
}) {
    return (
        <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 uppercase tracking-widest text-[10px]">{label}</span>
            <span className={`font-bold ${color}`}>{value}</span>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const TABS = ["All", "Requests", "Responses", "Errors", "System"] as const;
type Tab = (typeof TABS)[number];

const TAB_TYPE: Record<Tab, string> = {
    All: "all",
    Requests: "request",
    Responses: "response",
    Errors: "error",
    System: "system",
};

export default function SystemLogs() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [stats, setStats] = useState<LogStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [clearing, setClearing] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>("All");
    const [search, setSearch] = useState("");
    const [autoScroll, setAutoScroll] = useState(true);
    const [connected, setConnected] = useState(true);
    const listRef = useRef<HTMLDivElement>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ─── Fetch ──────────────────────────────────────────────────────────────────
    const fetchLogs = useCallback(
        async (silent = false) => {
            if (!silent) setLoading(true);
            try {
                const [logsRes, statsRes] = await Promise.all([
                    getLogs({ limit: 100, type: TAB_TYPE[activeTab], search: search || undefined }),
                    getLogStats(),
                ]);
                if (logsRes.success) setLogs(logsRes.data);
                if (statsRes.success) setStats(statsRes.data);
                setConnected(true);
            } catch {
                setConnected(false);
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [activeTab, search]
    );

    // Initial + refetch on tab/search change
    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    // Auto-poll every 5 seconds
    useEffect(() => {
        pollRef.current = setInterval(() => fetchLogs(true), 5000);
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [fetchLogs]);

    // Auto-scroll to bottom when new logs arrive
    useEffect(() => {
        if (autoScroll && listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [logs, autoScroll]);

    // ─── Clear all ──────────────────────────────────────────────────────────────
    const handleClear = async () => {
        if (!confirm("Clear all API logs? This cannot be undone.")) return;
        setClearing(true);
        try {
            await clearAllLogs();
            setLogs([]);
            setStats(null);
            toast({ title: "Logs cleared", description: "All API logs have been deleted." });
        } catch {
            toast({ title: "Failed", description: "Could not clear logs.", variant: "destructive" });
        } finally {
            setClearing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchLogs(false);
    };

    // ─── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col h-screen bg-background overflow-hidden">
            <Header title="API Log Viewer" subtitle="Real-time request & response monitor" />

            {/* ── Top bar ─────────────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/8 bg-card/60 backdrop-blur-sm flex-shrink-0">
                {/* Connection badge */}
                <div className="flex items-center gap-2">
                    {connected ? (
                        <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                            <Wifi className="h-3.5 w-3.5" />
                            Connected
                        </span>
                    ) : (
                        <span className="flex items-center gap-1.5 text-xs text-red-400 font-medium">
                            <WifiOff className="h-3.5 w-3.5" />
                            Disconnected
                        </span>
                    )}
                </div>

                {/* Stats chips */}
                <div className="flex items-center gap-5">
                    <StatChip label="Total" value={stats?.total ?? 0} color="text-slate-200" />
                    <div className="h-3 w-px bg-white/10" />
                    <StatChip label="Requests" value={stats?.requests ?? 0} />
                    <StatChip label="Blocked" value={stats?.blocked ?? 0} color="text-amber-400" />
                    <StatChip label="Errors" value={stats?.errors ?? 0} color="text-red-400" />
                    <div className="h-3 w-px bg-white/10" />
                    <StatChip
                        label="Avg Response"
                        value={stats ? `${stats.avgResponseMs}ms` : "0ms"}
                        color="text-sky-400"
                    />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="ghost"
                        className={`text-xs h-7 px-3 gap-1.5 ${autoScroll ? "text-primary bg-primary/10" : "text-muted-foreground"}`}
                        onClick={() => setAutoScroll((p) => !p)}
                    >
                        <Activity className="h-3.5 w-3.5" />
                        Auto Scroll: {autoScroll ? "ON" : "OFF"}
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-7 px-3 gap-1.5 text-muted-foreground hover:text-foreground"
                        onClick={handleRefresh}
                        disabled={refreshing}
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-7 px-3 gap-1.5 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                        onClick={handleClear}
                        disabled={clearing}
                    >
                        {clearing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        Clear Logs
                    </Button>
                </div>
            </div>

            {/* ── Filter bar ──────────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/8 bg-card/40 flex-shrink-0">
                {/* Tabs */}
                <div className="flex items-center gap-1">
                    {TABS.map((tab) => {
                        const active = activeTab === tab;
                        const tabIcons: Record<Tab, JSX.Element> = {
                            All: <Server className="h-3 w-3" />,
                            Requests: <ArrowDown className="h-3 w-3 rotate-180" />,
                            Responses: <ArrowDown className="h-3 w-3" />,
                            Errors: <AlertCircle className="h-3 w-3" />,
                            System: <Shield className="h-3 w-3" />,
                        };
                        return (
                            <button
                                key={tab}
                                onClick={() => { setActiveTab(tab); }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${active
                                        ? "bg-primary text-primary-foreground shadow"
                                        : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                                    }`}
                            >
                                {tabIcons[tab]}
                                {tab}
                                {tab === "Errors" && (stats?.errors ?? 0) > 0 && (
                                    <span className="ml-0.5 bg-red-500 text-white text-[9px] rounded-full px-1 py-px leading-none">
                                        {stats?.errors}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search URL…"
                        className="pl-8 h-8 w-64 text-xs bg-muted/50 border-white/10 focus:border-primary/50"
                    />
                </div>
            </div>

            {/* ── Log List ────────────────────────────────────────────────────────── */}
            <div ref={listRef} className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center h-40">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                ) : logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 gap-3 text-muted-foreground">
                        <Clock className="h-8 w-8 opacity-30" />
                        <p className="text-sm">No logs yet. Make some API requests to see them here.</p>
                    </div>
                ) : (
                    <div>
                        {/* Column headers */}
                        <div className="sticky top-0 flex items-center gap-3 px-4 py-1.5 bg-background/95 backdrop-blur border-b border-white/5 z-10">
                            <span className="w-16 text-[10px] text-slate-600 uppercase tracking-widest">Method</span>
                            <span className="flex-1 text-[10px] text-slate-600 uppercase tracking-widest">URL</span>
                            <span className="w-14 text-[10px] text-slate-600 uppercase tracking-widest text-right">Status</span>
                            <span className="w-16 text-[10px] text-slate-600 uppercase tracking-widest text-right">Size</span>
                            <span className="w-14 text-[10px] text-slate-600 uppercase tracking-widest text-right">Time</span>
                            <span className="w-20 text-[10px] text-slate-600 uppercase tracking-widest text-right">Clock</span>
                            <span className="w-4" />
                        </div>

                        {logs.map((log, i) => (
                            <motion.div
                                key={log.id}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.01, duration: 0.18 }}
                            >
                                <LogRow log={log} />
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
