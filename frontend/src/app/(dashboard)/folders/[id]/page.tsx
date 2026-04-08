'use client';

import { Fragment, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Dialog, Transition } from '@headlessui/react';
import { useAddDocumentToFolder, useRemoveDocumentFromFolder } from '@/features/folders/api/hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { useApi } from '@/hooks/use-api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    FolderOpen, FileText, MessageSquare, Loader2, ArrowLeft, Trash2,
    Plus, X
} from 'lucide-react';
import Link from 'next/link';

export default function FolderDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { fetcher } = useApi();
    const queryClient = useQueryClient();
    const [addDocOpen, setAddDocOpen] = useState(false);
    const { mutate: removeDoc } = useRemoveDocumentFromFolder();

    const { data: folder, isLoading } = useQuery({
        queryKey: ['folders', id],
        queryFn: () => fetcher(`/api/folders/${id}`),
        enabled: !!id,
    });

    const handleRemove = (documentId: string, docName: string) => {
        if (confirm(`Remove "${docName}" from this folder?`)) {
            removeDoc(
                { folderId: id, documentId },
                {
                    onSuccess: () => {
                        toast.success('Document removed from folder');
                        queryClient.invalidateQueries({ queryKey: ['folders', id] });
                    },
                    onError: () => toast.error('Failed to remove document'),
                }
            );
        }
    };

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'ready': return { label: 'Ready', bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200', dot: 'bg-emerald-500' };
            case 'failed': return { label: 'Failed', bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-200', dot: 'bg-red-500' };
            case 'processing': case 'vectorizing': return { label: 'Processing', bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200', dot: 'bg-amber-500' };
            default: return { label: status || 'Pending', bg: 'bg-gray-50', text: 'text-gray-600', ring: 'ring-gray-200', dot: 'bg-gray-400' };
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-[#2a3b4e]/30" />
            </div>
        );
    }

    if (!folder) {
        return (
            <div className="text-center py-20">
                <p className="text-[#2a3b4e]/40">Folder not found.</p>
                <Link href="/documents" className="text-blue-600 text-sm mt-2 inline-block">← Back to Documents</Link>
            </div>
        );
    }

    const docs = folder.documents || [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-[#f7f3f1] text-[#2a3b4e]/40 hover:text-[#2a3b4e] transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#2a3b4e]/10 to-[#3d5a80]/10 border border-[#2a3b4e]/8">
                        <FolderOpen className="w-6 h-6 text-[#2a3b4e]/60" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold font-serif text-[#1a2332] tracking-tight">{folder.name}</h1>
                        {folder.description && <p className="text-xs text-[#2a3b4e]/40 mt-0.5">{folder.description}</p>}
                    </div>
                </div>
            </div>

            {/* Stats + Action */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[11px] font-semibold">
                        <FileText className="h-3 w-3" />
                        {docs.length} Document{docs.length !== 1 ? 's' : ''}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href={`/folders/${id}/chat`}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#2a3b4e] to-[#3d5a80] text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-[#2a3b4e]/20 transition-all active:scale-[0.98]"
                    >
                        <MessageSquare className="w-4 h-4" />
                        Chat with Folder
                    </Link>
                    <button
                        onClick={() => setAddDocOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#e8e2de] text-[#2a3b4e] text-sm font-semibold rounded-xl hover:bg-[#faf8f6] transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Add Document
                    </button>
                </div>
            </div>

            {/* Document List */}
            {docs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-[#e8e2de] rounded-xl bg-[#faf8f6]/40">
                    <div className="w-16 h-16 rounded-2xl bg-[#f7f3f1] flex items-center justify-center mb-4">
                        <FileText className="w-7 h-7 text-[#2a3b4e]/15" />
                    </div>
                    <p className="text-[15px] font-bold text-[#1a2332]/30 mb-1">No documents in this folder</p>
                    <p className="text-[12px] text-[#2a3b4e]/25 mb-5">Add documents to run AI-powered cross-document analysis</p>
                    <button
                        onClick={() => setAddDocOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-[#2a3b4e] text-white text-sm font-semibold rounded-xl hover:bg-[#1a2332] transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Add Document
                    </button>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-[#e8e2de] shadow-sm overflow-hidden">
                    <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-[#faf8f6] border-b border-[#e8e2de]">
                        <div className="col-span-6 text-[10px] font-bold text-[#2a3b4e]/30 uppercase tracking-wider">Document</div>
                        <div className="col-span-3 text-[10px] font-bold text-[#2a3b4e]/30 uppercase tracking-wider">Status</div>
                        <div className="col-span-3 text-[10px] font-bold text-[#2a3b4e]/30 uppercase tracking-wider text-right">Actions</div>
                    </div>
                    <div className="divide-y divide-[#e8e2de]/50">
                        <AnimatePresence>
                            {docs.map((doc: any, idx: number) => {
                                const statusConfig = getStatusConfig(doc.status);
                                return (
                                    <motion.div
                                        key={doc.id}
                                        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.2, delay: idx * 0.03 }}
                                        className="grid grid-cols-12 gap-4 px-6 py-4 items-center group hover:bg-[#faf8f6]/80 transition-colors"
                                    >
                                        <div className="col-span-6 flex items-center gap-3.5 min-w-0">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f7f3f1] to-[#eee8e4] flex items-center justify-center shrink-0">
                                                <FileText className="h-4 w-4 text-[#2a3b4e]/40" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[13px] font-semibold text-[#1a2332] truncate">{doc.original_filename}</p>
                                                <p className="text-[10px] text-[#2a3b4e]/25 mt-0.5 font-medium uppercase">
                                                    {doc.file_type || ''}{doc.page_count ? ` · ${doc.page_count} pages` : ''}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="col-span-3">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${statusConfig.bg} ${statusConfig.text} ring-1 ${statusConfig.ring}`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                                                {statusConfig.label}
                                            </span>
                                        </div>
                                        <div className="col-span-3 flex items-center justify-end gap-1">
                                            <Link
                                                href={`/documents/${doc.id}`}
                                                className="p-2 text-[#2a3b4e]/40 hover:text-[#2a3b4e] hover:bg-white rounded-lg transition-all ring-1 ring-transparent hover:ring-[#e8e2de]"
                                                title="Chat with Document"
                                            >
                                                <MessageSquare className="h-3.5 w-3.5" />
                                            </Link>
                                            <button
                                                onClick={() => handleRemove(doc.id, doc.original_filename)}
                                                className="p-2 text-[#2a3b4e]/40 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                title="Remove from folder"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                </div>
            )}

            {/* Pick Documents Modal */}
            {addDocOpen && (
                <PickDocumentsModal
                    folderId={id}
                    existingDocIds={docs.map((d: any) => d.id)}
                    isOpen={addDocOpen}
                    onClose={() => setAddDocOpen(false)}
                />
            )}
        </div>
    );
}

function PickDocumentsModal({ folderId, existingDocIds, isOpen, onClose }: {
    folderId: string; existingDocIds: string[]; isOpen: boolean; onClose: () => void;
}) {
    const { fetcher } = useApi();
    const queryClient = useQueryClient();
    const { data, isLoading } = useQuery({
        queryKey: ['documents'],
        queryFn: () => fetcher('/api/documents?limit=100'),
        enabled: isOpen,
    });
    const { mutate: addDoc, isPending } = useAddDocumentToFolder();

    const allDocs = data?.documents ?? [];
    const availableDocs = allDocs.filter((d: any) => !existingDocIds.includes(d.id) && d.status === 'ready');

    const handleAdd = (documentId: string) => {
        addDoc(
            { folderId, documentId },
            {
                onSuccess: () => {
                    toast.success('Document added to folder');
                    queryClient.invalidateQueries({ queryKey: ['folders', folderId] });
                    onClose();
                },
                onError: () => toast.error('Failed to add document'),
            }
        );
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" />
                </Transition.Child>
                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                            <Dialog.Panel className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
                                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/60">
                                    <Dialog.Title as="h3" className="text-base font-semibold text-[#1a2332]">Add Document to Folder</Dialog.Title>
                                    <button onClick={onClose} className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 transition-colors"><X className="w-4 h-4" /></button>
                                </div>
                                <div className="p-4 max-h-80 overflow-y-auto">
                                    {isLoading ? (
                                        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>
                                    ) : availableDocs.length === 0 ? (
                                        <div className="text-center py-10">
                                            <p className="text-sm text-slate-400">All ready documents are already in this folder.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-1.5">
                                            {availableDocs.map((doc: any) => (
                                                <button
                                                    key={doc.id}
                                                    onClick={() => handleAdd(doc.id)}
                                                    disabled={isPending}
                                                    className="w-full flex items-center gap-3 p-3.5 rounded-xl hover:bg-[#faf8f6] border border-transparent hover:border-[#e8e2de] transition-all text-left disabled:opacity-50"
                                                >
                                                    <div className="p-2 rounded-lg bg-[#f7f3f1]">
                                                        <FileText className="w-4 h-4 text-[#2a3b4e]/50" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-[#1a2332] truncate">{doc.original_filename}</p>
                                                        <p className="text-[11px] text-slate-400">{doc.page_count ? `${doc.page_count} pages` : doc.file_type?.toUpperCase()}</p>
                                                    </div>
                                                    {isPending ? <Loader2 className="ml-auto w-4 h-4 animate-spin text-slate-300 shrink-0" /> : <Plus className="ml-auto w-4 h-4 text-slate-300 shrink-0" />}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
