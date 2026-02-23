"use client";

import { useState, useRef } from "react";
import {
    FileText,
    Search,
    Plus,
    Loader2,
    Eye,
    Trash2,
    X,
    AlertTriangle,
    MessageSquare,
    Upload,
    FolderOpen,
    Clock,
    HardDrive,
    ChevronDown,
    BookOpen,
    Hash,
    ExternalLink,
    CheckCircle2,
    AlertCircle,
    Timer,
    ArrowUpRight
} from "lucide-react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/hooks/use-api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import type { Document } from "@/types/documents.types";

export default function DocumentsPage() {
    const { fetcher } = useApi();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [viewDoc, setViewDoc] = useState<Document | null>(null);
    const [deleteDoc, setDeleteDoc] = useState<Document | null>(null);
    const [dragActive, setDragActive] = useState(false);

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
        e.target.value = "";
        uploadMutation.mutate(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
        const file = e.dataTransfer.files?.[0];
        if (file) uploadMutation.mutate(file);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(true);
    };

    const handleDragLeave = () => setDragActive(false);

    const documents = data?.documents || [];
    const filteredDocs = documents?.filter((doc: any) =>
        doc.original_filename.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const readyCount = documents.filter((d: any) => d.status === 'ready').length;
    const processingCount = documents.filter((d: any) => d.status !== 'ready' && d.status !== 'failed').length;
    const totalSize = documents.reduce((acc: number, d: any) => acc + (d.file_size || 0), 0);

    const formatFileSize = (bytes: number) => {
        if (!bytes && bytes !== 0) return "Unknown";
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        const days = Math.floor(diff / 86400000);
        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days}d ago`;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'ready':
                return { icon: CheckCircle2, label: 'Ready', bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200', dot: 'bg-emerald-500' };
            case 'failed':
                return { icon: AlertCircle, label: 'Failed', bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-200', dot: 'bg-red-500' };
            case 'processing':
            case 'vectorizing':
                return { icon: Timer, label: 'Processing', bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200', dot: 'bg-amber-500' };
            default:
                return { icon: Clock, label: status || 'Pending', bg: 'bg-gray-50', text: 'text-gray-600', ring: 'ring-gray-200', dot: 'bg-gray-400' };
        }
    };

    return (
        <div className="space-y-5 relative">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2a3b4e] to-[#4a6b8e] flex items-center justify-center shadow-lg shadow-[#2a3b4e]/20">
                        <FolderOpen className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold font-serif text-[#1a2332] tracking-tight">Documents</h1>
                        <p className="text-xs text-[#2a3b4e]/40">Manage and analyze your legal documents</p>
                    </div>

                    {/* Stat pills */}
                    <div className="hidden md:flex items-center gap-2 ml-4 pl-4 border-l border-[#2a3b4e]/8">
                        <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[11px] font-semibold">
                            <FileText className="h-3 w-3" />
                            {documents.length} Total
                        </div>
                        <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[11px] font-semibold">
                            <CheckCircle2 className="h-3 w-3" />
                            {readyCount} Ready
                        </div>
                        {processingCount > 0 && (
                            <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-[11px] font-semibold">
                                <Timer className="h-3 w-3 animate-pulse" />
                                {processingCount} Processing
                            </div>
                        )}
                        <div className="flex items-center gap-1.5 bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-[11px] font-semibold">
                            <HardDrive className="h-3 w-3" />
                            {formatFileSize(totalSize)}
                        </div>
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

            {/* Search Bar */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#2a3b4e]/25" />
                    <input
                        type="text"
                        placeholder="Search documents by name…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 bg-white rounded-xl border border-[#e8e2de] text-[13px] text-[#1a2332] placeholder:text-[#2a3b4e]/25 focus:outline-none focus:border-[#2a3b4e]/20 focus:ring-2 focus:ring-[#2a3b4e]/5 transition-all"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-[#f7f3f1] text-[#2a3b4e]/30 hover:text-[#2a3b4e]/60 transition-colors"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
                <div className="text-[11px] text-[#2a3b4e]/30 font-medium whitespace-nowrap">
                    {filteredDocs.length} of {documents.length} documents
                </div>
            </div>

            {/* Drag Drop Zone - appears on drag */}
            <AnimatePresence>
                {dragActive && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="fixed inset-0 z-40 bg-[#2a3b4e]/5 backdrop-blur-sm flex items-center justify-center"
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                    >
                        <div className="bg-white rounded-2xl border-2 border-dashed border-[#2a3b4e]/20 p-16 text-center shadow-2xl">
                            <Upload className="h-12 w-12 text-[#2a3b4e]/30 mx-auto mb-4" />
                            <p className="text-lg font-bold text-[#1a2332]">Drop your document here</p>
                            <p className="text-sm text-[#2a3b4e]/40 mt-2">PDF, DOCX, or TXT files supported</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Documents Table */}
            <div
                className="bg-white rounded-xl border border-[#e8e2de] shadow-sm overflow-hidden"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-[#faf8f6] border-b border-[#e8e2de]">
                    <div className="col-span-5 text-[10px] font-bold text-[#2a3b4e]/30 uppercase tracking-wider">Document</div>
                    <div className="col-span-2 text-[10px] font-bold text-[#2a3b4e]/30 uppercase tracking-wider">Status</div>
                    <div className="col-span-2 text-[10px] font-bold text-[#2a3b4e]/30 uppercase tracking-wider">Uploaded</div>
                    <div className="col-span-1 text-[10px] font-bold text-[#2a3b4e]/30 uppercase tracking-wider">Size</div>
                    <div className="col-span-2 text-[10px] font-bold text-[#2a3b4e]/30 uppercase tracking-wider text-right">Actions</div>
                </div>

                {/* Table Body */}
                <div className="divide-y divide-[#e8e2de]/50">
                    {isLoading ? (
                        <div className="px-6 py-20 text-center">
                            <div className="w-12 h-12 rounded-xl bg-[#f7f3f1] flex items-center justify-center mx-auto mb-3">
                                <Loader2 className="h-5 w-5 animate-spin text-[#2a3b4e]/30" />
                            </div>
                            <p className="text-[13px] font-medium text-[#2a3b4e]/40">Loading documents…</p>
                        </div>
                    ) : filteredDocs.length === 0 ? (
                        <div className="px-6 py-20 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-[#f7f3f1] flex items-center justify-center mx-auto mb-4">
                                <FolderOpen className="h-7 w-7 text-[#2a3b4e]/15" />
                            </div>
                            <p className="text-[15px] font-bold text-[#1a2332]/30 mb-1">
                                {searchQuery ? 'No matching documents' : 'No documents yet'}
                            </p>
                            <p className="text-[12px] text-[#2a3b4e]/25">
                                {searchQuery ? 'Try a different search term' : 'Upload your first legal document to get started'}
                            </p>
                            {!searchQuery && (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#f7f3f1] text-[#2a3b4e] rounded-lg text-sm font-medium hover:bg-[#eee8e4] transition-colors"
                                >
                                    <Upload className="h-4 w-4" />
                                    Upload Document
                                </button>
                            )}
                        </div>
                    ) : (
                        filteredDocs.map((doc: any, idx: number) => {
                            const statusConfig = getStatusConfig(doc.status);
                            const StatusIcon = statusConfig.icon;

                            return (
                                <motion.div
                                    key={doc.id}
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2, delay: idx * 0.03 }}
                                    className="grid grid-cols-12 gap-4 px-6 py-4 items-center group hover:bg-[#faf8f6]/80 transition-colors"
                                >
                                    {/* Document name */}
                                    <div className="col-span-5 flex items-center gap-3.5 min-w-0">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f7f3f1] to-[#eee8e4] flex items-center justify-center shrink-0 group-hover:from-[#2a3b4e]/5 group-hover:to-[#2a3b4e]/10 transition-all">
                                            <FileText className="h-4.5 w-4.5 text-[#2a3b4e]/40 group-hover:text-[#2a3b4e]/60" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[13px] font-semibold text-[#1a2332] truncate group-hover:text-[#2a3b4e]">
                                                {doc.original_filename || doc.filename || 'Untitled'}
                                            </p>
                                            <p className="text-[10px] text-[#2a3b4e]/25 mt-0.5 font-medium uppercase">
                                                {doc.file_type || (doc.original_filename || doc.filename || '').split('.').pop()?.toUpperCase() || 'FILE'}
                                                {doc.page_count ? ` · ${doc.page_count} pages` : ''}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Status */}
                                    <div className="col-span-2">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${statusConfig.bg} ${statusConfig.text} ring-1 ${statusConfig.ring}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot} ${doc.status === 'processing' || doc.status === 'vectorizing' ? 'animate-pulse' : ''}`} />
                                            {statusConfig.label}
                                        </span>
                                    </div>

                                    {/* Date */}
                                    <div className="col-span-2">
                                        <span className="text-[12px] text-[#2a3b4e]/45 font-medium">
                                            {formatDate(doc.created_at)}
                                        </span>
                                    </div>

                                    {/* Size */}
                                    <div className="col-span-1">
                                        <span className="text-[12px] text-[#2a3b4e]/45 font-mono font-medium">
                                            {formatFileSize(doc.file_size)}
                                        </span>
                                    </div>

                                    {/* Actions */}
                                    <div className="col-span-2 flex items-center justify-end gap-1">
                                        <Link
                                            href={`/documents/${doc.id}`}
                                            className="p-2 text-[#2a3b4e]/40 hover:text-[#2a3b4e] hover:bg-white rounded-lg transition-all ring-1 ring-transparent hover:ring-[#e8e2de] hover:shadow-sm"
                                            title="Chat with Document"
                                        >
                                            <MessageSquare className="h-3.5 w-3.5" />
                                        </Link>
                                        <button
                                            onClick={() => setViewDoc(doc)}
                                            className="p-2 text-[#2a3b4e]/40 hover:text-[#2a3b4e] hover:bg-white rounded-lg transition-all ring-1 ring-transparent hover:ring-[#e8e2de] hover:shadow-sm"
                                            title="View Details"
                                        >
                                            <Eye className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            onClick={() => setDeleteDoc(doc)}
                                            className="p-2 text-[#2a3b4e]/40 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all ring-1 ring-transparent hover:ring-red-100"
                                            title="Delete"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </div>

                {/* Table Footer */}
                {filteredDocs.length > 0 && (
                    <div className="px-6 py-3 bg-[#faf8f6] border-t border-[#e8e2de] flex items-center justify-between">
                        <span className="text-[11px] text-[#2a3b4e]/25 font-medium">
                            Showing {filteredDocs.length} document{filteredDocs.length !== 1 ? 's' : ''}
                        </span>
                        <span className="text-[11px] text-[#2a3b4e]/25 font-medium">
                            Total: {formatFileSize(totalSize)}
                        </span>
                    </div>
                )}
            </div>

            {/* View Document Modal */}
            <AnimatePresence>
                {viewDoc && (
                    <DocumentDetailsModal
                        document={viewDoc}
                        isOpen={!!viewDoc}
                        onClose={() => setViewDoc(null)}
                    />
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteDoc && (
                    <DeleteModal
                        document={deleteDoc}
                        isOpen={!!deleteDoc}
                        onClose={() => setDeleteDoc(null)}
                        onConfirm={(id) => deleteMutation.mutate(id)}
                        isDeleting={deleteMutation.isPending}
                    />
                )}
            </AnimatePresence>
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
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 400 }}
                className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]"
            >
                <div className="p-6 text-center shrink-0">
                    <div className={`h-14 w-14 rounded-xl flex items-center justify-center mx-auto mb-4 transition-all duration-300 ${isDeleting ? 'bg-red-500 shadow-lg shadow-red-200' : 'bg-red-50'}`}>
                        <AlertTriangle className={`h-6 w-6 transition-colors duration-300 ${isDeleting ? 'text-white' : 'text-red-600'}`} />
                    </div>
                    <h3 className="text-lg font-bold text-[#1a2332] mb-1">
                        {isDeleting ? 'Deleting…' : 'Delete Document?'}
                    </h3>
                    <p className="text-sm text-[#2a3b4e]/50">
                        {isDeleting ? (
                            <span className="text-red-500 font-medium">Removing chunks and vectors…</span>
                        ) : (
                            <>This will permanently delete <span className="font-semibold text-[#1a2332]">{document.original_filename}</span></>
                        )}
                    </p>
                </div>

                <div className="px-6 pb-2 flex-1 overflow-hidden flex flex-col min-h-0">
                    <div className="bg-[#faf8f6] rounded-xl border border-[#e8e2de] flex-1 overflow-hidden flex flex-col">
                        <div className="px-4 py-3 border-b border-[#e8e2de] flex justify-between items-center shrink-0">
                            <span className="text-[10px] font-bold text-[#2a3b4e]/30 uppercase tracking-wider">
                                Linked Chunks ({isLoadingChunks ? '…' : chunksData?.chunks?.length || 0})
                            </span>
                        </div>
                        <div className="overflow-y-auto p-2 space-y-1.5">
                            {isLoadingChunks ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-5 w-5 animate-spin text-[#2a3b4e]/20" />
                                </div>
                            ) : chunksData?.chunks?.length > 0 ? (
                                chunksData.chunks.map((chunk: any, index: number) => (
                                    <div
                                        key={chunk.id}
                                        className="bg-white p-3 rounded-lg border border-[#e8e2de]/60 text-xs text-[#2a3b4e]/70 transition-all duration-500"
                                        style={{
                                            opacity: isDeleting ? 0 : 1,
                                            transform: isDeleting ? 'scale(0.9) translateX(-10px)' : 'scale(1) translateX(0)',
                                            transitionDelay: isDeleting ? `${index * 30}ms` : '0ms',
                                        }}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-mono font-bold text-[#2a3b4e]/25 text-[10px]">#{chunk.chunk_index}</span>
                                            <span className="bg-[#f7f3f1] px-1.5 py-0.5 rounded text-[9px] text-[#2a3b4e]/40 font-semibold uppercase">{chunk.chunk_type}</span>
                                        </div>
                                        <p className="line-clamp-2 leading-relaxed">{chunk.content}</p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center py-8 text-[11px] text-[#2a3b4e]/25 italic">No chunks found</p>
                            )}
                        </div>
                    </div>
                    <p className={`text-[11px] mt-3 font-medium text-center shrink-0 ${isDeleting ? 'text-red-600' : 'text-[#2a3b4e]/30'}`}>
                        {isDeleting ? 'Data is being permanently removed…' : 'This action is permanent and cannot be undone'}
                    </p>
                </div>

                <div className="p-5 flex items-center gap-3 justify-end shrink-0 border-t border-[#e8e2de]">
                    <button
                        onClick={onClose}
                        disabled={isDeleting}
                        className="px-4 py-2.5 rounded-xl border border-[#e8e2de] text-[#2a3b4e] text-sm font-medium hover:bg-[#faf8f6] transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(document.id)}
                        disabled={isDeleting}
                        className="px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-all flex items-center shadow-sm shadow-red-200 disabled:opacity-80 active:scale-[0.98]"
                    >
                        {isDeleting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Deleting…
                            </>
                        ) : (
                            <>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Document
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </motion.div>
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

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 400 }}
                className="bg-white rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden flex h-[85vh]"
            >
                {/* Sidebar */}
                <div className="w-60 bg-[#faf8f6] border-r border-[#e8e2de] flex flex-col shrink-0">
                    <div className="p-5">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2a3b4e] to-[#4a6b8e] flex items-center justify-center mb-4 shadow-sm">
                            <FileText className="h-5 w-5 text-white" />
                        </div>
                        <h2 className="text-[10px] font-bold text-[#2a3b4e]/25 uppercase tracking-wider mb-4">Document Details</h2>
                        <nav className="space-y-1">
                            {[
                                { id: 'overview' as const, label: 'Overview', icon: FileText },
                                { id: 'chunks' as const, label: 'Chunks', icon: BookOpen },
                            ].map((item) => {
                                const Icon = item.icon;
                                const isActive = activeTab === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveTab(item.id)}
                                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all ${isActive
                                            ? 'bg-white text-[#1a2332] shadow-sm ring-1 ring-[#e8e2de]'
                                            : 'text-[#2a3b4e]/40 hover:text-[#2a3b4e] hover:bg-white/50'
                                            }`}
                                    >
                                        <Icon className={`h-4 w-4 ${isActive ? 'text-[#2a3b4e]' : ''}`} />
                                        {item.label}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Quick Info */}
                    <div className="mt-auto p-5 border-t border-[#e8e2de]">
                        <div className="space-y-3">
                            <div>
                                <p className="text-[10px] font-bold text-[#2a3b4e]/20 uppercase tracking-wider">Size</p>
                                <p className="text-[12px] font-mono font-medium text-[#1a2332] mt-0.5">{formatFileSize(document.file_size)}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-[#2a3b4e]/20 uppercase tracking-wider">Pages</p>
                                <p className="text-[12px] font-medium text-[#1a2332] mt-0.5">{document.page_count || '—'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Header */}
                    <div className="flex items-center justify-between px-8 py-5 border-b border-[#e8e2de] shrink-0 bg-[#faf8f6]/50">
                        <div className="min-w-0 mr-4">
                            <h2 className="text-lg font-bold text-[#1a2332] truncate" title={document.original_filename}>
                                {document.original_filename}
                            </h2>
                            <p className="text-[11px] text-[#2a3b4e]/35 font-medium mt-0.5">
                                {activeTab === 'overview' ? 'Document Properties & Status' : 'Processed Text Segments'}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="h-9 w-9 rounded-lg hover:bg-white flex items-center justify-center text-[#2a3b4e]/30 hover:text-[#2a3b4e] transition-all ring-1 ring-transparent hover:ring-[#e8e2de] hover:shadow-sm shrink-0"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="overflow-y-auto flex-1 p-8">
                        {activeTab === 'overview' ? (
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="max-w-3xl space-y-6"
                            >
                                <div>
                                    <h3 className="text-[11px] font-bold text-[#2a3b4e]/25 uppercase tracking-wider mb-4">General Information</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-[#faf8f6] rounded-xl p-4 border border-[#e8e2de]/60">
                                            <p className="text-[10px] font-bold text-[#2a3b4e]/20 uppercase tracking-wider mb-2">Status</p>
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-semibold ${document.status === "ready"
                                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                                : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                                                }`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${document.status === 'ready' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                {document.status}
                                            </span>
                                        </div>
                                        <div className="bg-[#faf8f6] rounded-xl p-4 border border-[#e8e2de]/60">
                                            <p className="text-[10px] font-bold text-[#2a3b4e]/20 uppercase tracking-wider mb-2">Upload Date</p>
                                            <p className="text-[13px] font-medium text-[#1a2332]">
                                                {new Date(document.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                            </p>
                                        </div>
                                        <div className="bg-[#faf8f6] rounded-xl p-4 border border-[#e8e2de]/60">
                                            <p className="text-[10px] font-bold text-[#2a3b4e]/20 uppercase tracking-wider mb-2">File Size</p>
                                            <p className="text-[13px] font-mono font-semibold text-[#1a2332]">{formatFileSize(document.file_size)}</p>
                                        </div>
                                        <div className="bg-[#faf8f6] rounded-xl p-4 border border-[#e8e2de]/60">
                                            <p className="text-[10px] font-bold text-[#2a3b4e]/20 uppercase tracking-wider mb-2">Total Pages</p>
                                            <p className="text-[13px] font-semibold text-[#1a2332]">{document.page_count || '—'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div>
                                    <h3 className="text-[11px] font-bold text-[#2a3b4e]/25 uppercase tracking-wider mb-4">Actions</h3>
                                    <div className="space-y-2">
                                        {document.file_url && (
                                            <a
                                                href={document.file_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-between p-4 bg-white rounded-xl border border-[#e8e2de] hover:border-[#2a3b4e]/15 hover:shadow-sm transition-all group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-[#f7f3f1] flex items-center justify-center group-hover:bg-[#2a3b4e]/5 transition-colors">
                                                        <ExternalLink className="h-4 w-4 text-[#2a3b4e]/30 group-hover:text-[#2a3b4e]/60" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[13px] font-semibold text-[#1a2332]">View Original</p>
                                                        <p className="text-[11px] text-[#2a3b4e]/30">Open in new tab</p>
                                                    </div>
                                                </div>
                                                <ArrowUpRight className="h-4 w-4 text-[#2a3b4e]/20 group-hover:text-[#2a3b4e]/50 transition-colors" />
                                            </a>
                                        )}
                                        <Link
                                            href={`/documents/${document.id}`}
                                            className="flex items-center justify-between p-4 bg-white rounded-xl border border-[#e8e2de] hover:border-[#2a3b4e]/15 hover:shadow-sm transition-all group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-[#f7f3f1] flex items-center justify-center group-hover:bg-[#2a3b4e]/5 transition-colors">
                                                    <MessageSquare className="h-4 w-4 text-[#2a3b4e]/30 group-hover:text-[#2a3b4e]/60" />
                                                </div>
                                                <div>
                                                    <p className="text-[13px] font-semibold text-[#1a2332]">Chat with Document</p>
                                                    <p className="text-[11px] text-[#2a3b4e]/30">Ask questions about this document</p>
                                                </div>
                                            </div>
                                            <ArrowUpRight className="h-4 w-4 text-[#2a3b4e]/20 group-hover:text-[#2a3b4e]/50 transition-colors" />
                                        </Link>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="max-w-4xl mx-auto">
                                {isLoadingChunks ? (
                                    <div className="flex flex-col items-center justify-center py-20">
                                        <div className="w-12 h-12 rounded-xl bg-[#f7f3f1] flex items-center justify-center mb-3">
                                            <Loader2 className="h-5 w-5 animate-spin text-[#2a3b4e]/30" />
                                        </div>
                                        <span className="text-[12px] font-medium text-[#2a3b4e]/30">Loading chunks…</span>
                                    </div>
                                ) : chunksData?.chunks?.length > 0 ? (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="space-y-4"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[11px] font-bold text-[#2a3b4e]/25 uppercase tracking-wider">
                                                {chunksData.chunks.length} Segments
                                            </span>
                                        </div>
                                        <div className="space-y-3">
                                            {chunksData.chunks.map((chunk: any, idx: number) => (
                                                <motion.div
                                                    key={chunk.id}
                                                    initial={{ opacity: 0, y: 4 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: idx * 0.02 }}
                                                    className="bg-white rounded-xl p-5 border border-[#e8e2de] hover:border-[#2a3b4e]/12 hover:shadow-sm transition-all"
                                                >
                                                    <div className="flex items-center gap-2.5 mb-3">
                                                        <span className="px-2 py-0.5 rounded-md bg-[#2a3b4e]/5 text-[#2a3b4e] text-[10px] font-bold font-mono">
                                                            #{chunk.chunk_index}
                                                        </span>
                                                        {chunk.page_number && (
                                                            <span className="text-[10px] text-[#2a3b4e]/25 font-medium">
                                                                Page {chunk.page_number}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[13px] text-[#1a2332]/70 leading-relaxed font-serif">
                                                        {chunk.content}
                                                    </p>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </motion.div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-20">
                                        <div className="w-16 h-16 rounded-2xl bg-[#f7f3f1] flex items-center justify-center mb-4">
                                            <BookOpen className="h-7 w-7 text-[#2a3b4e]/15" />
                                        </div>
                                        <p className="text-[13px] font-medium text-[#2a3b4e]/30">No chunks analyzed yet</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
