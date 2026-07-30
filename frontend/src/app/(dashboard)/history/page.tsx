"use client";

import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/hooks/use-api";
import { Clock, FileText, MessageSquare, Scale, Loader2, Link as LinkIcon, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function HistoryPage() {
    const { fetcher } = useApi();

    const { data: documentsData, isLoading: isLoadingDocs, error: docError } = useQuery({
        queryKey: ["documents", "history"],
        queryFn: async () => fetcher("/api/documents"),
    });

    const { data: sessionsData, isLoading: isLoadingSessions, error: sessionError } = useQuery({
        queryKey: ["chat", "sessions", "history"],
        queryFn: async () => fetcher("/api/chat/sessions"),
    });

    const { data: ipcData, isLoading: isLoadingIPC, error: ipcError } = useQuery({
        queryKey: ["ipc", "history"],
        queryFn: async () => fetcher("/api/v1/ipc/history"),
    });

    const documents = documentsData?.documents || [];
    const sessions = sessionsData?.sessions || [];
    const ipcPredictions = ipcData?.predictions || [];

    const historyItems = [
        ...documents.map((doc: any) => ({
            id: `doc-${doc.id}`,
            originalId: doc.id,
            type: "Document Upload",
            title: doc.filename,
            date: doc.created_at,
            icon: FileText,
            link: `/documents/${doc.id}`,
            status: "bg-[#2a3b4e]/5 text-[#2a3b4e]/70 ring-[#2a3b4e]/10",
        })),
        ...sessions.map((session: any) => ({
            id: `session-${session.id}`,
            originalId: session.id,
            type: "Analysis Session",
            title: session.title || "Untitled Session",
            date: session.created_at,
            icon: MessageSquare,
            link: `/documents/${session.document_id}`,
            status: "bg-[#2a3b4e]/5 text-[#2a3b4e]/70 ring-[#2a3b4e]/10",
        })),
        ...ipcPredictions.map((pred: any) => ({
            id: `ipc-${pred.id}`,
            originalId: pred.id,
            type: "IPC Prediction",
            title: pred.description.length > 60 ? `${pred.description.substring(0, 60)}...` : pred.description,
            date: pred.created_at,
            icon: Scale,
            link: `/ipc-predictor?id=${pred.id}`, // Assuming we might support loading past predictions later, for now leads to predictor
            status: "bg-[#2a3b4e]/5 text-[#2a3b4e]/70 ring-[#2a3b4e]/10",
        })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const isLoading = isLoadingDocs || isLoadingSessions || isLoadingIPC;
    const hasError = docError || sessionError || ipcError;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold font-serif text-[#2a3b4e]">History</h1>
                <p className="text-[#2a3b4e]/70 mt-2">Your recent activity and analysis timeline.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-[#2a3b4e]/5 overflow-hidden">
                <ul className="divide-y divide-[#2a3b4e]/5">
                    {isLoading ? (
                        <li className="p-12 text-center text-[#2a3b4e]/60 flex flex-col items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin mb-4 text-[#2a3b4e]/40" />
                            <p>Loading your history...</p>
                        </li>
                    ) : historyItems.length === 0 ? (
                        <li className="p-12 text-center text-[#2a3b4e]/60 flex flex-col items-center justify-center">
                            <Clock className="h-12 w-12 mb-4 text-[#2a3b4e]/20" />
                            <p className="text-lg font-medium text-[#2a3b4e]">No history found</p>
                            <p className="text-sm mt-1">Your recent activity will appear here.</p>
                        </li>
                    ) : (
                        historyItems.map((item) => (
                            <li key={item.id} className="group hover:bg-[#f7f3f1]/50 transition-colors duration-200">
                                <Link href={item.link} className="block p-5 sm:p-6">
                                    <div className="flex items-center gap-4">
                                        <div className="flex-shrink-0">
                                            <div className="h-12 w-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 bg-[#2a3b4e]/5 text-[#2a3b4e]">
                                                <item.icon className="h-6 w-6" />
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${item.status}`}>
                                                    {item.type}
                                                </span>
                                                <span className="text-xs text-[#2a3b4e]/40">•</span>
                                                <span className="text-xs text-[#2a3b4e]/60 flex items-center">
                                                    <Clock className="h-3 w-3 mr-1" />
                                                    {new Date(item.date).toLocaleDateString(undefined, {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                            <p className="text-base font-medium text-[#2a3b4e] truncate group-hover:text-[#c5a572] transition-colors">
                                                {item.title}
                                            </p>
                                        </div>
                                        <div className="flex-shrink-0 text-[#2a3b4e]/20 group-hover:text-[#c5a572] transition-colors">
                                            <LinkIcon className="h-5 w-5" />
                                        </div>
                                    </div>
                                </Link>
                            </li>
                        ))
                    )}
                </ul>
            </div>
        </div>
    );
}
