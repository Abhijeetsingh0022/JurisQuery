"use client";

import { useRef, useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/hooks/use-api";
import { toast } from "sonner";
import {
    FileText,
    Search,
    Clock,
    ArrowRight,
    Loader2,
    Upload,
    FolderOpen,
    Scale,
    MessageSquare,
    Sparkles,
    CheckCircle2,
    HardDrive,
    ArrowUpRight
} from "lucide-react";
import Link from "next/link";

export default function DashboardClient() {
    const { user } = useUser();
    const { fetcher } = useApi();
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data: documents, isLoading: isLoadingDocs } = useQuery({
        queryKey: ["documents", "recent"],
        queryFn: async () => fetcher("/api/documents?limit=3"),
    });

    const uploadMutation = useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append("file", file);
            return fetcher("/api/documents/upload", {
                method: "POST",
                body: formData,
            });
        },
        onSuccess: () => {
            toast.success("Document uploaded successfully");
            queryClient.invalidateQueries({ queryKey: ["documents", "recent"] });
            queryClient.invalidateQueries({ queryKey: ["documents"] });
        },
        onError: (error: any) => {
            toast.error(`Upload failed: ${error.message}`);
        }
    });

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = "";
        uploadMutation.mutate(file);
    };

    const { data: sessions, isLoading: isLoadingSessions } = useQuery({
        queryKey: ["chat", "sessions", "recent"],
        queryFn: async () => fetcher("/api/chat/sessions?limit=5"),
    });

    const { data: ipcHistory, isLoading: isLoadingIPC } = useQuery({
        queryKey: ["ipc", "history", "recent"],
        queryFn: async () => fetcher("/api/v1/ipc/history?limit=3"),
    });

    const recentDocuments = documents?.documents || [];
    const savedQueries = ipcHistory?.predictions || [];
    const analysisHistory = sessions?.sessions || [];

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        const days = Math.floor(diff / 86400000);
        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days}d ago`;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const formatFileSize = (bytes: number) => {
        if (!bytes) return '';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const [greeting, setGreeting] = useState('Welcome');
    useEffect(() => {
        const h = new Date().getHours();
        if (h < 12) setGreeting('Good morning');
        else if (h < 17) setGreeting('Good afternoon');
        else setGreeting('Good evening');
    }, []);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#2a3b4e] to-[#4a6b8e] flex items-center justify-center shadow-lg shadow-[#2a3b4e]/20">
                        <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold font-serif text-[#1a2332] tracking-tight">
                            {greeting}, {user?.firstName || "Counsel"}
                        </h1>
                        <p className="text-xs text-[#2a3b4e]/35">Here&apos;s your legal workspace overview</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        className="hidden"
                        accept=".pdf,.docx,.txt"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadMutation.isPending}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#2a3b4e] to-[#3d5a80] text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-[#2a3b4e]/20 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {uploadMutation.isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Uploading…
                            </>
                        ) : (
                            <>
                                <Upload className="h-4 w-4" />
                                Upload Document
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-xl border border-[#e8e2de] p-4 flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                        <FileText className="h-4.5 w-4.5 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-[#2a3b4e]/25 uppercase tracking-wider">Documents</p>
                        <p className="text-xl font-bold text-[#1a2332] mt-0.5">{recentDocuments.length}</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-[#e8e2de] p-4 flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                        <Scale className="h-4.5 w-4.5 text-purple-600" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-[#2a3b4e]/25 uppercase tracking-wider">IPC Analyses</p>
                        <p className="text-xl font-bold text-[#1a2332] mt-0.5">{savedQueries.length}</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-[#e8e2de] p-4 flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                        <MessageSquare className="h-4.5 w-4.5 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-[#2a3b4e]/25 uppercase tracking-wider">Conversations</p>
                        <p className="text-xl font-bold text-[#1a2332] mt-0.5">{analysisHistory.length}</p>
                    </div>
                </div>
            </div>

            {/* Recent Documents */}
            <section>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-[#2a3b4e]/20" />
                        <h2 className="text-[13px] font-bold text-[#1a2332]">Recent Documents</h2>
                    </div>
                    <Link href="/documents" className="flex items-center gap-1 text-[11px] font-semibold text-[#2a3b4e]/30 hover:text-[#2a3b4e] transition-colors">
                        View All <ArrowRight className="h-3 w-3" />
                    </Link>
                </div>

                {isLoadingDocs ? (
                    <div className="grid grid-cols-3 gap-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-28 bg-[#f7f3f1] rounded-xl animate-pulse" />
                        ))}
                    </div>
                ) : recentDocuments.length > 0 ? (
                    <div className="grid grid-cols-3 gap-3">
                        {recentDocuments.map((doc: any) => (
                            <Link key={doc.id} href={`/documents/${doc.id}`}>
                                <div className="bg-white rounded-xl border border-[#e8e2de] p-4 hover:border-[#2a3b4e]/15 hover:shadow-sm transition-all group cursor-pointer">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#f7f3f1] to-[#eee8e4] flex items-center justify-center group-hover:from-[#2a3b4e]/5 group-hover:to-[#2a3b4e]/10 transition-all">
                                            <FileText className="h-4 w-4 text-[#2a3b4e]/30 group-hover:text-[#2a3b4e]/60" />
                                        </div>
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ring-1 ${doc.status === "ready"
                                            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                            : "bg-amber-50 text-amber-700 ring-amber-200"
                                            }`}>
                                            <div className={`w-1 h-1 rounded-full ${doc.status === 'ready' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                            {doc.status || "Pending"}
                                        </span>
                                    </div>
                                    <p className="text-[12px] font-semibold text-[#1a2332] truncate group-hover:text-[#2a3b4e]">
                                        {doc.original_filename || doc.filename}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className="text-[10px] text-[#2a3b4e]/25 font-medium">{formatDate(doc.created_at)}</span>
                                        {doc.file_size && (
                                            <>
                                                <span className="text-[#2a3b4e]/10">·</span>
                                                <span className="text-[10px] text-[#2a3b4e]/25 font-mono font-medium">{formatFileSize(doc.file_size)}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-[#e8e2de] p-10 text-center">
                        <div className="w-12 h-12 rounded-xl bg-[#f7f3f1] flex items-center justify-center mx-auto mb-3">
                            <FolderOpen className="h-5 w-5 text-[#2a3b4e]/15" />
                        </div>
                        <p className="text-[12px] font-medium text-[#2a3b4e]/25">No documents yet</p>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="mt-3 text-[11px] font-semibold text-[#2a3b4e]/40 hover:text-[#2a3b4e] transition-colors"
                        >
                            Upload your first document →
                        </button>
                    </div>
                )}
            </section>

            {/* Bottom Grid */}
            <div className="grid grid-cols-2 gap-4">
                {/* IPC Predictions */}
                <section>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Scale className="h-4 w-4 text-[#2a3b4e]/20" />
                            <h2 className="text-[13px] font-bold text-[#1a2332]">IPC Predictions</h2>
                        </div>
                        <Link href="/ipc-predictor" className="flex items-center gap-1 text-[11px] font-semibold text-[#2a3b4e]/30 hover:text-[#2a3b4e] transition-colors">
                            New <ArrowRight className="h-3 w-3" />
                        </Link>
                    </div>

                    <div className="bg-white rounded-xl border border-[#e8e2de] overflow-hidden">
                        {isLoadingIPC ? (
                            <div className="p-10 flex items-center justify-center">
                                <Loader2 className="h-5 w-5 animate-spin text-[#2a3b4e]/20" />
                            </div>
                        ) : savedQueries.length > 0 ? (
                            <div className="divide-y divide-[#e8e2de]/50">
                                {savedQueries.map((q: any) => (
                                    <Link href="/ipc-predictor" key={q.id}>
                                        <div className="px-4 py-3.5 hover:bg-[#faf8f6] transition-colors group flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0 group-hover:bg-purple-100 transition-colors">
                                                <Search className="h-3.5 w-3.5 text-purple-500" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[12px] font-semibold text-[#1a2332] truncate group-hover:text-[#2a3b4e]">
                                                    {q.description}
                                                </p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] text-[#2a3b4e]/25 font-medium">{formatDate(q.created_at)}</span>
                                                    <span className="text-[#2a3b4e]/10">·</span>
                                                    <span className="text-[10px] font-semibold text-purple-500/70">{q.predicted_sections?.length || 0} sections</span>
                                                </div>
                                            </div>
                                            <ArrowUpRight className="h-3.5 w-3.5 text-[#2a3b4e]/10 group-hover:text-[#2a3b4e]/30 shrink-0 transition-colors" />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="p-10 text-center">
                                <div className="w-10 h-10 rounded-xl bg-[#f7f3f1] flex items-center justify-center mx-auto mb-2.5">
                                    <Scale className="h-4 w-4 text-[#2a3b4e]/15" />
                                </div>
                                <p className="text-[11px] font-medium text-[#2a3b4e]/25">No predictions yet</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* Analysis History */}
                <section>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-[#2a3b4e]/20" />
                            <h2 className="text-[13px] font-bold text-[#1a2332]">Chat History</h2>
                        </div>
                        <Link href="/history" className="flex items-center gap-1 text-[11px] font-semibold text-[#2a3b4e]/30 hover:text-[#2a3b4e] transition-colors">
                            View All <ArrowRight className="h-3 w-3" />
                        </Link>
                    </div>

                    <div className="bg-white rounded-xl border border-[#e8e2de] overflow-hidden">
                        {isLoadingSessions ? (
                            <div className="p-10 flex items-center justify-center">
                                <Loader2 className="h-5 w-5 animate-spin text-[#2a3b4e]/20" />
                            </div>
                        ) : analysisHistory.length > 0 ? (
                            <div className="divide-y divide-[#e8e2de]/50">
                                {analysisHistory.map((s: any) => (
                                    <div key={s.id} className="px-4 py-3.5 hover:bg-[#faf8f6] transition-colors group flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 group-hover:bg-emerald-100 transition-colors">
                                            <MessageSquare className="h-3.5 w-3.5 text-emerald-500" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[12px] font-semibold text-[#1a2332] truncate">
                                                {s.title || "New Conversation"}
                                            </p>
                                            <span className="text-[10px] text-[#2a3b4e]/25 font-medium">{formatDate(s.created_at)}</span>
                                        </div>
                                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${new Date(s.updated_at || s.created_at).getTime() > Date.now() - 86400000
                                            ? 'bg-emerald-400'
                                            : 'bg-[#2a3b4e]/10'
                                            }`} />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-10 text-center">
                                <div className="w-10 h-10 rounded-xl bg-[#f7f3f1] flex items-center justify-center mx-auto mb-2.5">
                                    <MessageSquare className="h-4 w-4 text-[#2a3b4e]/15" />
                                </div>
                                <p className="text-[11px] font-medium text-[#2a3b4e]/25">No conversations yet</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
