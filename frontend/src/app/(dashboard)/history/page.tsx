"use client";

import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/hooks/use-api";
import { Clock, FileText, Search, Loader2 } from "lucide-react";

export default function HistoryPage() {
    const { fetcher } = useApi();

    const { data: documentsData, isLoading: isLoadingDocs } = useQuery({
        queryKey: ["documents", "history"],
        queryFn: async () => fetcher("/api/documents"),
    });

    const { data: sessionsData, isLoading: isLoadingSessions } = useQuery({
        queryKey: ["chat", "sessions", "history"],
        queryFn: async () => fetcher("/api/chat/sessions"),
    });

    const documents = documentsData?.documents || [];
    const sessions = sessionsData?.sessions || [];

    const historyItems = [
        ...documents.map((doc: any) => ({
            id: `doc-${doc.id}`,
            type: "Document Upload",
            title: doc.filename,
            date: doc.created_at,
            icon: FileText,
        })),
        ...sessions.map((session: any) => ({
            id: `session-${session.id}`,
            type: "Analysis Session",
            title: session.title || "Untitled Session",
            date: session.created_at,
            icon: Search,
        })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const isLoading = isLoadingDocs || isLoadingSessions;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold font-serif text-[#2a3b4e]">History</h1>
                <p className="text-[#2a3b4e]/70 mt-2">Your recent activity and analysis timeline.</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-[#2a3b4e]/10 overflow-hidden">
                <ul className="divide-y divide-[#2a3b4e]/5">
                    {isLoading ? (
                        <li className="p-8 text-center text-[#2a3b4e]/60">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                            Loading history...
                        </li>
                    ) : historyItems.length === 0 ? (
                        <li className="p-8 text-center text-[#2a3b4e]/60">
                            No history found.
                        </li>
                    ) : (
                        historyItems.map((item) => (
                            <li key={item.id} className="p-4 hover:bg-[#f7f3f1]/50 transition-colors">
                                <div className="flex items-center space-x-4">
                                    <div className="flex-shrink-0">
                                        <div className="h-10 w-10 rounded-full bg-[#2a3b4e]/5 flex items-center justify-center text-[#2a3b4e]">
                                            <item.icon className="h-5 w-5" />
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-[#2a3b4e] truncate">
                                            {item.title}
                                        </p>
                                        <div className="flex items-center text-xs text-[#2a3b4e]/60 mt-0.5">
                                            <span className="font-semibold mr-2">{item.type}</span>
                                            <span>• {new Date(item.date).toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <button className="text-sm text-[#2a3b4e] font-medium hover:underline">
                                            View
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))
                    )}
                </ul>
            </div>
        </div>
    );
}
