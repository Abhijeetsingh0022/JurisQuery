"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/hooks/use-api";
import {
    FileText,
    Search,
    Clock,
    ArrowRight,
    Plus
} from "lucide-react";
import Link from "next/link";

export default function DashboardClient() {
    const { user } = useUser();
    const { fetcher } = useApi();

    // Fetch Recent Documents
    const { data: documents, isLoading: isLoadingDocs } = useQuery({
        queryKey: ["documents", "recent"],
        queryFn: async () => fetcher("/api/documents?limit=3"),
    });

    // Fetch Recent Chat Sessions (serving as Saved Queries & History)
    const { data: sessions, isLoading: isLoadingSessions } = useQuery({
        queryKey: ["chat", "sessions", "recent"],
        queryFn: async () => fetcher("/api/chat/sessions?limit=5"),
    });

    const recentDocuments = documents?.documents || [];
    // Using chat sessions titles as "Saved Queries" for now
    const savedQueries = sessions?.sessions?.slice(0, 3) || [];
    // Using recent sessions as Analysis History
    const analysisHistory = sessions?.sessions || [];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold font-serif text-[#2a3b4e]">
                        Welcome back, {user?.firstName || "Counsel"}
                    </h1>
                    <p className="text-[#2a3b4e]/70 mt-1">Here's what's happened since your last visit.</p>
                </div>
                <button className="bg-[#2a3b4e] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center hover:bg-[#2a3b4e]/90 transition-colors shadow-sm">
                    <Plus className="mr-2 h-4 w-4" />
                    New Upload
                </button>
            </div>

            {/* Recent Documents */}
            <section>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-[#2a3b4e] flex items-center">
                        <FileText className="mr-2 h-5 w-5 opacity-70" />
                        Recent Documents
                    </h2>
                    <Link href="/documents" className="text-sm text-[#2a3b4e] font-medium hover:underline flex items-center">
                        View All <ArrowRight className="ml-1 h-3 w-4" />
                    </Link>
                </div>

                {isLoadingDocs ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-32 bg-[#2a3b4e]/5 rounded-xl animate-pulse" />
                        ))}
                    </div>
                ) : recentDocuments.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {recentDocuments.map((doc: any) => (
                            <div key={doc.id} className="bg-white p-5 rounded-xl shadow-sm border border-[#2a3b4e]/10 hover:shadow-md transition-shadow cursor-pointer group">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="h-10 w-10 rounded-lg bg-[#2a3b4e]/5 flex items-center justify-center text-[#2a3b4e] group-hover:bg-[#2a3b4e] group-hover:text-white transition-colors">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${doc.status === "ready" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                                        }`}>
                                        {doc.status || "Unknown"}
                                    </span>
                                </div>
                                <h3 className="font-semibold text-[#2a3b4e] truncate mb-1">{doc.filename}</h3>
                                <p className="text-xs text-[#2a3b4e]/60">{new Date(doc.created_at).toLocaleDateString()}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-[#2a3b4e]/60 italic">No recent documents found.</p>
                )}
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Saved Queries (Chat Sessions) */}
                <section>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-[#2a3b4e] flex items-center">
                            <Search className="mr-2 h-5 w-5 opacity-70" />
                            Saved Queries
                        </h2>
                    </div>

                    {isLoadingSessions ? (
                        <div className="h-48 bg-[#2a3b4e]/5 rounded-xl animate-pulse" />
                    ) : savedQueries.length > 0 ? (
                        <div className="bg-white rounded-xl shadow-sm border border-[#2a3b4e]/10 overflow-hidden">
                            <ul className="divide-y divide-[#2a3b4e]/5">
                                {savedQueries.map((q: any) => (
                                    <li key={q.id} className="p-4 hover:bg-[#f7f3f1]/50 transition-colors cursor-pointer flex items-center group">
                                        <Search className="h-4 w-4 text-[#2a3b4e]/40 mr-3 group-hover:text-[#2a3b4e]" />
                                        <span className="text-sm text-[#2a3b4e] font-medium">{q.title || "Untitled Query"}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-[#2a3b4e]/10 p-6 text-center text-[#2a3b4e]/60 italic">
                            No saved queries yet.
                        </div>
                    )}
                </section>

                {/* Analysis History */}
                <section>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-[#2a3b4e] flex items-center">
                            <Clock className="mr-2 h-5 w-5 opacity-70" />
                            Analysis History
                        </h2>
                        <Link href="/history" className="text-sm text-[#2a3b4e] font-medium hover:underline flex items-center">
                            View Full <ArrowRight className="ml-1 h-3 w-4" />
                        </Link>
                    </div>

                    {isLoadingSessions ? (
                        <div className="h-48 bg-[#2a3b4e]/5 rounded-xl animate-pulse" />
                    ) : analysisHistory.length > 0 ? (
                        <div className="bg-white rounded-xl shadow-sm border border-[#2a3b4e]/10 p-4">
                            <div className="space-y-4">
                                {analysisHistory.map((s: any) => (
                                    <div key={s.id} className="flex items-start pb-4 border-b border-[#2a3b4e]/5 last:border-0 last:pb-0">
                                        <div className="h-2 w-2 rounded-full bg-[#2a3b4e] mt-2 mr-3" />
                                        <div>
                                            <p className="text-sm font-medium text-[#2a3b4e]">{s.title || "Document Analysis"}</p>
                                            <p className="text-xs text-[#2a3b4e]/60 mt-0.5">
                                                {new Date(s.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-[#2a3b4e]/10 p-6 text-center text-[#2a3b4e]/60 italic">
                            No analysis history yet.
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
