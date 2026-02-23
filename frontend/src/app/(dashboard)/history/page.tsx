"use client";

import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/hooks/use-api";
import {
    Clock,
    FileText,
    MessageSquare,
    Scale,
    Loader2,
    ArrowUpRight,
    Calendar,
    Filter
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type FilterType = "all" | "documents" | "sessions" | "predictions";

export default function HistoryPage() {
    const { fetcher } = useApi();
    const [filter, setFilter] = useState<FilterType>("all");

    const { data: documentsData, isLoading: isLoadingDocs } = useQuery({
        queryKey: ["documents", "history"],
        queryFn: async () => fetcher("/api/documents"),
    });

    const { data: sessionsData, isLoading: isLoadingSessions } = useQuery({
        queryKey: ["chat", "sessions", "history"],
        queryFn: async () => fetcher("/api/chat/sessions"),
    });

    const { data: ipcData, isLoading: isLoadingIPC } = useQuery({
        queryKey: ["ipc", "history"],
        queryFn: async () => fetcher("/api/v1/ipc/history"),
    });

    const documents = documentsData?.documents || [];
    const sessions = sessionsData?.sessions || [];
    const ipcPredictions = ipcData?.predictions || [];

    const allItems = [
        ...documents.map((doc: any) => ({
            id: `doc-${doc.id}`,
            type: "documents" as const,
            typeLabel: "Document",
            title: doc.original_filename || doc.filename,
            date: doc.created_at,
            icon: FileText,
            iconBg: "bg-blue-50",
            iconColor: "text-blue-500",
            dotColor: "bg-blue-400",
            link: `/documents/${doc.id}`,
        })),
        ...sessions.map((session: any) => ({
            id: `session-${session.id}`,
            type: "sessions" as const,
            typeLabel: "Chat",
            title: session.title || "New Conversation",
            date: session.created_at,
            icon: MessageSquare,
            iconBg: "bg-emerald-50",
            iconColor: "text-emerald-500",
            dotColor: "bg-emerald-400",
            link: `/documents/${session.document_id}`,
        })),
        ...ipcPredictions.map((pred: any) => ({
            id: `ipc-${pred.id}`,
            type: "predictions" as const,
            typeLabel: "IPC",
            title: pred.description.length > 70 ? `${pred.description.substring(0, 70)}…` : pred.description,
            date: pred.created_at,
            icon: Scale,
            iconBg: "bg-purple-50",
            iconColor: "text-purple-500",
            dotColor: "bg-purple-400",
            link: `/ipc-predictor`,
            extra: `${pred.predicted_sections?.length || 0} sections`,
        })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const filteredItems = filter === "all" ? allItems : allItems.filter(i => i.type === filter);

    const isLoading = isLoadingDocs || isLoadingSessions || isLoadingIPC;

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const filters: { key: FilterType; label: string; count: number }[] = [
        { key: "all", label: "All", count: allItems.length },
        { key: "documents", label: "Documents", count: documents.length },
        { key: "sessions", label: "Chats", count: sessions.length },
        { key: "predictions", label: "IPC", count: ipcPredictions.length },
    ];

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2a3b4e] to-[#4a6b8e] flex items-center justify-center shadow-lg shadow-[#2a3b4e]/15">
                        <Clock className="h-4.5 w-4.5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold font-serif text-[#1a2332]">History</h1>
                        <p className="text-xs text-[#2a3b4e]/35">Your activity timeline across all features</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 bg-white rounded-lg border border-[#e8e2de] p-1">
                    {filters.map(f => (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${filter === f.key
                                    ? 'bg-[#1a2332] text-white shadow-sm'
                                    : 'text-[#2a3b4e]/35 hover:text-[#2a3b4e]/60'
                                }`}
                        >
                            {f.label}
                            <span className={`text-[9px] px-1 py-0.5 rounded-full min-w-[16px] text-center ${filter === f.key
                                    ? 'bg-white/20 text-white/80'
                                    : 'bg-[#f7f3f1] text-[#2a3b4e]/25'
                                }`}>
                                {f.count}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-xl border border-[#e8e2de] overflow-hidden">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-10 h-10 rounded-xl bg-[#f7f3f1] flex items-center justify-center mb-3">
                            <Loader2 className="h-5 w-5 animate-spin text-[#2a3b4e]/20" />
                        </div>
                        <p className="text-[12px] font-medium text-[#2a3b4e]/25">Loading history…</p>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-14 h-14 rounded-2xl bg-[#f7f3f1] flex items-center justify-center mb-4">
                            <Clock className="h-6 w-6 text-[#2a3b4e]/12" />
                        </div>
                        <p className="text-[13px] font-semibold text-[#2a3b4e]/25">No activity yet</p>
                        <p className="text-[11px] text-[#2a3b4e]/15 mt-1">Your recent activity will appear here</p>
                    </div>
                ) : (
                    <div className="divide-y divide-[#e8e2de]/50">
                        {filteredItems.map((item) => (
                            <Link key={item.id} href={item.link}>
                                <div className="px-5 py-4 hover:bg-[#faf8f6] transition-colors group flex items-center gap-4">
                                    <div className={`w-9 h-9 rounded-lg ${item.iconBg} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                                        <item.icon className={`h-4 w-4 ${item.iconColor}`} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className={`w-1.5 h-1.5 rounded-full ${item.dotColor} shrink-0`} />
                                            <span className="text-[10px] font-bold text-[#2a3b4e]/20 uppercase tracking-wider">{item.typeLabel}</span>
                                            <span className="text-[#2a3b4e]/10">·</span>
                                            <span className="text-[10px] text-[#2a3b4e]/20 font-medium">{formatDate(item.date)}</span>
                                            {item.extra && (
                                                <>
                                                    <span className="text-[#2a3b4e]/10">·</span>
                                                    <span className="text-[10px] font-semibold text-purple-400">{item.extra}</span>
                                                </>
                                            )}
                                        </div>
                                        <p className="text-[13px] font-medium text-[#1a2332] truncate group-hover:text-[#2a3b4e]">
                                            {item.title}
                                        </p>
                                    </div>
                                    <ArrowUpRight className="h-3.5 w-3.5 text-[#2a3b4e]/8 group-hover:text-[#2a3b4e]/25 shrink-0 transition-colors" />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer stat */}
            {!isLoading && filteredItems.length > 0 && (
                <div className="flex items-center justify-center gap-2 text-[10px] text-[#2a3b4e]/15 font-medium">
                    <Calendar className="h-3 w-3" />
                    Showing {filteredItems.length} of {allItems.length} activities
                </div>
            )}
        </div>
    );
}
