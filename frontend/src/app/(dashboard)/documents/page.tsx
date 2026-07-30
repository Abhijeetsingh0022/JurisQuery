"use client";

import { useState, useRef } from "react";
import {
    FileText,
    Search,
    Filter,
    Plus,
    Loader2,
    Eye,
    Trash2,
    X,
    AlertTriangle,
    Download,
    MessageSquare
} from "lucide-react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/hooks/use-api";
import { toast } from "sonner";
import type { Document } from "@/types/documents.types";

export default function DocumentsPage() {
    const { fetcher } = useApi();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Action States
    const [viewDoc, setViewDoc] = useState<Document | null>(null);
    const [deleteDoc, setDeleteDoc] = useState<Document | null>(null);

    const { data, isLoading } = useQuery({
        queryKey: ["documents"],
        queryFn: async () => fetcher("/api/documents?limit=100"),
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
            queryClient.invalidateQueries({ queryKey: ["documents"] });
        },
        onError: (error: any) => {
            toast.error(`Upload failed: ${error.message}`);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (docId: string) => {
            return fetcher(`/api/documents/${docId}`, {
                method: "DELETE",
            });
        },
        onSuccess: () => {
            toast.success("Document deleted successfully");
            setDeleteDoc(null);
            queryClient.invalidateQueries({ queryKey: ["documents"] });
        },
        onError: (error: any) => {
            toast.error(`Delete failed: ${error.message}`);
        }
    });

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset input
        e.target.value = "";

        uploadMutation.mutate(file);
    };

    const documents = data?.documents || [];

    const filteredDocs = documents?.filter((doc: any) =>
        doc.original_filename.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const formatFileSize = (bytes: number) => {
        if (!bytes && bytes !== 0) return "Unknown";
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    return (
        <div className="space-y-6 relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-serif text-[#2a3b4e]">Documents</h1>
                    <p className="text-[#2a3b4e]/70 mt-1">Manage and analyze your legal documents.</p>
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
                    className="bg-[#2a3b4e] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center hover:bg-[#2a3b4e]/90 transition-colors shadow-sm w-full sm:w-auto justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {uploadMutation.isPending ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Uploading...
                        </>
                    ) : (
                        <>
                            <Plus className="mr-2 h-4 w-4" />
                            Upload Document
                        </>
                    )}
                </button>
            </div>

            {/* Search and Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#2a3b4e]/40" />
                    <input
                        type="text"
                        placeholder="Search documents..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#2a3b4e]/10 focus:border-[#2a3b4e] focus:ring focus:ring-[#2a3b4e]/10 outline-none transition-all"
                    />
                </div>
                <button className="px-4 py-2.5 rounded-xl border border-[#2a3b4e]/10 bg-white text-[#2a3b4e] font-medium flex items-center hover:bg-[#f7f3f1] transition-colors shadow-sm">
                    <Filter className="mr-2 h-4 w-4" />
                    Filter
                </button>
            </div>

            {/* Documents List */}
            <div className="bg-white rounded-xl shadow-sm border border-[#2a3b4e]/10 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left">
                        <thead className="bg-[#f7f3f1]/50 border-b border-[#2a3b4e]/5">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-[#2a3b4e]/60 uppercase tracking-wider">Document Name</th>
                                <th className="px-6 py-4 text-xs font-semibold text-[#2a3b4e]/60 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-[#2a3b4e]/60 uppercase tracking-wider">Date Uploaded</th>
                                <th className="px-6 py-4 text-xs font-semibold text-[#2a3b4e]/60 uppercase tracking-wider">Size</th>
                                <th className="px-6 py-4 text-xs font-semibold text-[#2a3b4e]/60 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#2a3b4e]/5">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-[#2a3b4e]/60">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                                        Loading documents...
                                    </td>
                                </tr>
                            ) : filteredDocs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-[#2a3b4e]/60">
                                        No documents found.
                                    </td>
                                </tr>
                            ) : (
                                filteredDocs.map((doc: any) => (
                                    <tr key={doc.id} className="hover:bg-[#f7f3f1]/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="h-11 w-11 rounded-xl bg-[#F5F5F5] flex items-center justify-center text-[#2a3b4e] mr-4 shrink-0">
                                                    <FileText className="h-5 w-5 stroke-[1.5]" />
                                                </div>
                                                <span className="font-semibold text-[#2a3b4e] text-[15px]">{doc.original_filename}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${doc.status === "ready"
                                                ? "bg-green-100 text-green-800"
                                                : doc.status === "failed"
                                                    ? "bg-red-100 text-red-800"
                                                    : "bg-yellow-100 text-yellow-800"
                                                }`}>
                                                {doc.status || "Unknown"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-[#2a3b4e]/70">{new Date(doc.created_at).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-sm text-[#2a3b4e]/70">{formatFileSize(doc.file_size)}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end space-x-2">
                                                <Link
                                                    href={`/documents/${doc.id}`}
                                                    className="p-2 text-[#2a3b4e]/60 hover:text-[#2a3b4e] hover:bg-[#2a3b4e]/5 rounded-lg transition-colors inline-block"
                                                    title="Chat with Document"
                                                >
                                                    <MessageSquare className="h-4 w-4" />
                                                </Link>
                                                <button
                                                    onClick={() => setViewDoc(doc)}
                                                    className="p-2 text-[#2a3b4e]/60 hover:text-[#2a3b4e] hover:bg-[#2a3b4e]/5 rounded-lg transition-colors"
                                                    title="View"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteDoc(doc)}
                                                    className="p-2 text-[#2a3b4e]/60 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* View Document Modal */}
            {viewDoc && (
                <DocumentDetailsModal
                    document={viewDoc}
                    isOpen={!!viewDoc}
                    onClose={() => setViewDoc(null)}
                />
            )}

            {/* Delete Confirmation Modal */}
            {deleteDoc && (
                <DeleteModal
                    document={deleteDoc}
                    isOpen={!!deleteDoc}
                    onClose={() => setDeleteDoc(null)}
                    onConfirm={(id) => deleteMutation.mutate(id)}
                    isDeleting={deleteMutation.isPending}
                />
            )}
        </div>
    );
}

function DeleteModal({ document, isOpen, onClose, onConfirm, isDeleting }: { document: any, isOpen: boolean, onClose: () => void, onConfirm: (id: string) => void, isDeleting: boolean }) {
    const { fetcher } = useApi();

    const { data: chunksData, isLoading: isLoadingChunks } = useQuery({
        queryKey: ['documentChunks', document.id],
        queryFn: async () => fetcher(`/api/documents/${document.id}/chunks?limit=100`),
        enabled: isOpen,
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
                <div className="p-6 text-center shrink-0">
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-4 transition-all duration-500 ${isDeleting ? 'bg-red-500 scale-110' : 'bg-red-100'}`}>
                        <AlertTriangle className={`h-6 w-6 transition-colors duration-300 ${isDeleting ? 'text-white' : 'text-red-600'}`} />
                    </div>
                    <h3 className="text-lg font-bold text-[#2a3b4e] mb-2">
                        {isDeleting ? 'Deleting...' : 'Delete Document?'}
                    </h3>
                    <p className="text-[#2a3b4e]/70">
                        {isDeleting ? (
                            <span className="text-red-500 font-medium">Removing chunks and vectors...</span>
                        ) : (
                            <>Are you sure you want to delete <span className="font-semibold text-[#2a3b4e]">{document.original_filename}</span>?</>
                        )}
                    </p>
                </div>

                <div className="px-6 pb-2 flex-1 overflow-hidden flex flex-col min-h-0">
                    <div className="bg-gray-50 rounded-lg border border-gray-100 flex-1 overflow-hidden flex flex-col">
                        <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                            <span className="text-xs font-semibold text-[#2a3b4e]/60 uppercase tracking-wider">
                                Linked Chunks ({isLoadingChunks ? '...' : chunksData?.chunks?.length || 0})
                            </span>
                        </div>
                        <div className="overflow-y-auto p-2 space-y-2">
                            {isLoadingChunks ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-5 w-5 animate-spin text-[#2a3b4e]/40" />
                                </div>
                            ) : chunksData?.chunks?.length > 0 ? (
                                <ul className="space-y-2">
                                    {chunksData.chunks.map((chunk: any, index: number) => (
                                        <li
                                            key={chunk.id}
                                            className="text-left bg-white p-3 rounded border border-gray-100 shadow-sm text-xs text-[#2a3b4e]/80 transition-all duration-500 ease-out"
                                            style={{
                                                opacity: isDeleting ? 0 : 1,
                                                transform: isDeleting ? 'scale(0.8) translateX(-20px)' : 'scale(1) translateX(0)',
                                                transitionDelay: isDeleting ? `${index * 30}ms` : '0ms',
                                            }}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-mono font-bold text-[#2a3b4e]/40">#{chunk.chunk_index}</span>
                                                <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] text-[#2a3b4e]/60 font-medium uppercase">{chunk.chunk_type}</span>
                                            </div>
                                            <p className="line-clamp-2">{chunk.content}</p>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-center py-8 text-xs text-[#2a3b4e]/40 italic">No chunks found.</p>
                            )}
                        </div>
                    </div>
                    <p className={`text-xs mt-3 font-medium text-center shrink-0 transition-colors duration-300 ${isDeleting ? 'text-red-600' : 'text-red-500'}`}>
                        {isDeleting ? 'Data is being permanently removed...' : 'This action is permanent and cannot be undone.'}
                    </p>
                </div>

                <div className="p-6 flex items-center space-x-3 justify-center shrink-0 border-t border-gray-50">
                    <button
                        onClick={onClose}
                        disabled={isDeleting}
                        className="px-4 py-2 rounded-lg border border-[#2a3b4e]/10 text-[#2a3b4e] font-medium hover:bg-[#f7f3f1] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(document.id)}
                        disabled={isDeleting}
                        className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-all flex items-center shadow-sm shadow-red-200 disabled:opacity-80"
                    >
                        {isDeleting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            "Delete Document"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

function DocumentDetailsModal({ document, isOpen, onClose }: { document: any, isOpen: boolean, onClose: () => void }) {
    const [activeTab, setActiveTab] = useState<'overview' | 'chunks'>('overview');
    const { fetcher } = useApi();

    const { data: chunksData, isLoading: isLoadingChunks } = useQuery({
        queryKey: ['documentChunks', document.id],
        queryFn: async () => fetcher(`/api/documents/${document.id}/chunks?limit=100`),
        enabled: activeTab === 'chunks' && isOpen,
    });

    const formatFileSize = (bytes: number) => {
        if (!bytes && bytes !== 0) return "Unknown";
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    if (!isOpen) return null;

    const navItems = [
        { id: 'overview', label: 'Overview', icon: FileText },
        { id: 'chunks', label: 'Chunks', icon: Search },
    ] as const;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden animate-in zoom-in-95 duration-300 flex h-[85vh] ring-1 ring-black/5">
                {/* Sidebar */}
                <div className="w-64 bg-gray-50/50 border-r border-[#2a3b4e]/5 flex flex-col shrink-0">
                    <div className="p-6">
                        <h2 className="text-xs font-bold text-[#2a3b4e]/40 uppercase tracking-widest mb-4">Document Info</h2>
                        <nav className="space-y-1">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = activeTab === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveTab(item.id)}
                                        className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                                            ? 'bg-white text-[#2a3b4e] shadow-sm ring-1 ring-black/5'
                                            : 'text-[#2a3b4e]/60 hover:text-[#2a3b4e] hover:bg-[#2a3b4e]/5'
                                            }`}
                                    >
                                        <Icon className={`h-4 w-4 ${isActive ? 'text-[#2a3b4e]' : 'text-[#2a3b4e]/40'}`} />
                                        <span>{item.label}</span>
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col min-w-0 bg-white">
                    {/* Header */}
                    <div className="flex items-start justify-between px-8 py-6 border-b border-[#2a3b4e]/5 shrink-0 bg-gray-50/30 backdrop-blur-sm">
                        <div className="flex-1 min-w-0 mr-4">
                            <h2 className="text-xl font-bold text-[#2a3b4e] font-serif tracking-tight truncate" title={document.original_filename}>
                                {document.original_filename}
                            </h2>
                            <p className="text-sm text-[#2a3b4e]/60 font-medium mt-1">
                                {activeTab === 'overview' ? 'Document Properties & Status' : 'Processed Text Segments'}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="h-9 w-9 rounded-lg hover:bg-gray-100 flex items-center justify-center text-[#2a3b4e]/60 hover:text-[#2a3b4e] transition-colors shrink-0 ring-1 ring-transparent hover:ring-black/5"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Scrollable Body */}
                    <div className="overflow-y-auto flex-1 p-8">
                        {activeTab === 'overview' ? (
                            <div className="max-w-3xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                {/* Section Title */}
                                <div>
                                    <h3 className="text-sm font-semibold text-[#2a3b4e]/80 border-b border-[#2a3b4e]/10 pb-2 mb-6">General Information</h3>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-[#2a3b4e]/50">Status</label>
                                            <div>
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium uppercase tracking-wide border ${document.status === "ready"
                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                                    }`}>
                                                    {document.status}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-[#2a3b4e]/50">Upload Date</label>
                                            <div className="text-sm font-medium text-[#2a3b4e]">
                                                {new Date(document.created_at).toLocaleString()}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-[#2a3b4e]/50">File Size</label>
                                            <div className="text-sm font-medium text-[#2a3b4e] font-mono">
                                                {formatFileSize(document.file_size)}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-[#2a3b4e]/50">Total Pages</label>
                                            <div className="text-sm font-medium text-[#2a3b4e]">
                                                {document.page_count || '—'}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions Section */}
                                <div>
                                    <h3 className="text-sm font-semibold text-[#2a3b4e]/80 border-b border-[#2a3b4e]/10 pb-2 mb-6">File Actions</h3>
                                    {document.file_url ? (
                                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                                            <div className="flex items-center space-x-3">
                                                <div className="h-10 w-10 bg-white rounded-lg border border-gray-200 flex items-center justify-center text-[#2a3b4e]/60">
                                                    <FileText className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-[#2a3b4e]">Original Document</div>
                                                    <div className="text-xs text-[#2a3b4e]/50">Download the original file</div>
                                                </div>
                                            </div>
                                            <a
                                                href={document.file_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-4 py-2 bg-white border border-gray-200 text-[#2a3b4e] text-sm font-medium rounded-lg hover:border-[#2a3b4e]/30 hover:shadow-sm transition-all"
                                            >
                                                Download
                                            </a>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-[#2a3b4e]/50 italic">No file URL available.</div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="max-w-4xl mx-auto">
                                {isLoadingChunks ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-[#2a3b4e]/60">
                                        <Loader2 className="h-8 w-8 animate-spin mb-4" />
                                        <span className="text-sm font-medium">Fetching chunks...</span>
                                    </div>
                                ) : chunksData?.chunks?.length > 0 ? (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-semibold text-[#2a3b4e]/80">
                                                {chunksData.chunks.length} Segments Found
                                            </h3>
                                        </div>
                                        <div className="grid gap-6">
                                            {chunksData.chunks.map((chunk: any) => (
                                                <div key={chunk.id} className="group bg-white rounded-xl p-6 border border-[#2a3b4e]/10 shadow-sm hover:shadow-md hover:border-[#2a3b4e]/20 transition-all duration-200">
                                                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-50">
                                                        <div className="flex items-center space-x-3">
                                                            <span className="h-6 px-2 rounded-md bg-[#2a3b4e]/5 text-[#2a3b4e] text-xs font-bold font-mono flex items-center">
                                                                #{chunk.chunk_index}
                                                            </span>
                                                            {chunk.page_number && (
                                                                <span className="text-xs font-medium text-[#2a3b4e]/40">
                                                                    Page {chunk.page_number}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <p className="text-[#2a3b4e]/80 leading-relaxed font-serif text-[15px]">
                                                        {chunk.content}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-20 text-[#2a3b4e]/40 bg-gray-50/50 rounded-xl border border-dashed border-[#2a3b4e]/10">
                                        <Search className="h-10 w-10 mb-3 opacity-50" />
                                        <p className="font-medium text-sm">No chunks analyzed yet</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer (Optional, can add Global Actions here) */}
                </div>
            </div>
        </div>
    );
}
