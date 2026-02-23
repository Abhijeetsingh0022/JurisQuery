"use client";

import { useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/hooks/use-api";
import { toast } from "sonner";
import {
    FileText,
    Search,
    Clock,
    ArrowRight,
    Plus,
    Loader2
} from "lucide-react";
import Link from "next/link";

export default function DashboardClient() {
    const { user } = useUser();
    const { fetcher } = useApi();
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch Recent Documents
    const { data: documents, isLoading: isLoadingDocs } = useQuery({
        queryKey: ["documents", "recent"],
        queryFn: async () => fetcher("/api/documents?limit=3"),
    });

    // Upload Mutation
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
            // Also invalidate the main documents list in case the user navigates there
            queryClient.invalidateQueries({ queryKey: ["documents"] });
        },
        onError: (error: any) => {
            toast.error(`Upload failed: ${error.message}`);
        }
    });

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset input
        e.target.value = "";

        uploadMutation.mutate(file);
    };

    // Fetch Recent Chat Sessions (Analysis History)
    const { data: sessions, isLoading: isLoadingSessions } = useQuery({
        queryKey: ["chat", "sessions", "recent"],
        queryFn: async () => fetcher("/api/chat/sessions?limit=5"),
    });

    // Fetch Recent IPC Predictions (Saved Queries)
    const { data: ipcHistory, isLoading: isLoadingIPC } = useQuery({
        queryKey: ["ipc", "history", "recent"],
        queryFn: async () => fetcher("/api/v1/ipc/history?limit=3"),
    });

    const recentDocuments = documents?.documents || [];
    // Using IPC history as Saved Queries
    const savedQueries = ipcHistory?.predictions || [];
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
                    className="bg-[#2a3b4e] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center hover:bg-[#2a3b4e]/90 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {uploadMutation.isPending ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Uploading...
                        </>
                    ) : (
                        <>
                            <Plus className="mr-2 h-4 w-4" />
                            New Upload
                        </>
                    )}
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
                {/* Saved Queries (IPC Predictions) */}
                <section>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-[#2a3b4e] flex items-center">
                            <Search className="mr-2 h-5 w-5 opacity-70" />
                            Recent IPC Predictions
                        </h2>
                        <Link href="/ipc-predictor" className="text-sm text-[#2a3b4e] font-medium hover:underline flex items-center">
                            New Prediction <ArrowRight className="ml-1 h-3 w-4" />
                        </Link>
                    </div>

                    {isLoadingIPC ? (
                        <div className="h-48 bg-[#2a3b4e]/5 rounded-xl animate-pulse" />
                    ) : savedQueries.length > 0 ? (
                        <div className="bg-white rounded-xl shadow-sm border border-[#2a3b4e]/10 overflow-hidden">
                            <ul className="divide-y divide-[#2a3b4e]/5">
                                {savedQueries.map((q: any) => (
                                    <Link href="/ipc-predictor" key={q.id}>
                                        <li className="p-4 hover:bg-[#f7f3f1]/50 transition-colors cursor-pointer flex items-center group">
                                            <Search className="h-4 w-4 text-[#2a3b4e]/40 mr-3 group-hover:text-[#2a3b4e]" />
                                            <div className="overflow-hidden">
                                                <p className="text-sm text-[#2a3b4e] font-medium truncate">
                                                    {q.description}
                                                </p>
                                                <p className="text-xs text-[#2a3b4e]/60 mt-0.5">
                                                    {new Date(q.created_at).toLocaleDateString()} • {q.predicted_sections.length} sections found
                                                </p>
                                            </div>
                                        </li>
                                    </Link>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-[#2a3b4e]/10 p-6 text-center text-[#2a3b4e]/60 italic">
                            No recent predictions.
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
