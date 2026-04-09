'use client';

import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, FolderPlus, FileText, Plus, Loader2, ChevronRight, Trash2, FolderOpen } from 'lucide-react';
import { useFolders, useCreateFolder, useDeleteFolder, useAddDocumentToFolder } from '../api/hooks';
import { CaseFolder } from '../api/folders';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/hooks/use-api';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import UpgradeModal from '@/components/shared/UpgradeModal';

// --- Create Folder Modal ---
function CreateFolderModal({ isOpen, onClose, onLimitReached }: { isOpen: boolean; onClose: () => void; onLimitReached: (msg: string) => void }) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const { mutate: createFolder, isPending } = useCreateFolder();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        createFolder(
            { name: name.trim(), description: description.trim() || undefined },
            {
                onSuccess: () => {
                    toast.success('Folder created successfully');
                    setName(''); setDescription('');
                    onClose();
                },
                onError: (error: any) => {
                    if (error.status === 403) {
                        onClose();
                        onLimitReached(error.message);
                    } else {
                        toast.error('Failed to create folder');
                    }
                },
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
                        <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 scale-95 translate-y-2" enterTo="opacity-100 scale-100 translate-y-0" leave="ease-in duration-150" leaveFrom="opacity-100 scale-100 translate-y-0" leaveTo="opacity-0 scale-95 translate-y-2">
                            <Dialog.Panel className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
                                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/60">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 rounded-xl bg-[#2a3b4e]/10 text-[#2a3b4e]">
                                            <FolderPlus className="w-5 h-5" />
                                        </div>
                                        <Dialog.Title as="h3" className="text-lg font-semibold text-[#1a2332]">New Case Folder</Dialog.Title>
                                    </div>
                                    <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Folder Name <span className="text-red-400">*</span></label>
                                        <input
                                            autoFocus type="text" value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="e.g. State v. Sharma, 2024"
                                            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-[#1a2332] text-sm placeholder:text-slate-400 focus:border-[#2a3b4e]/40 focus:outline-none focus:ring-2 focus:ring-[#2a3b4e]/10 bg-white transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Description <span className="text-slate-400 font-normal">(optional)</span></label>
                                        <textarea
                                            value={description} onChange={(e) => setDescription(e.target.value)}
                                            rows={3} placeholder="Brief context about this case..."
                                            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-[#1a2332] text-sm placeholder:text-slate-400 focus:border-[#2a3b4e]/40 focus:outline-none focus:ring-2 focus:ring-[#2a3b4e]/10 bg-white transition-all resize-none"
                                        />
                                    </div>
                                    <div className="flex justify-end gap-3 pt-2">
                                        <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                                        <button
                                            type="submit" disabled={isPending || !name.trim()}
                                            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#2a3b4e] hover:bg-[#1a2332] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm active:scale-[0.98]"
                                        >
                                            {isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating...</> : 'Create Folder'}
                                        </button>
                                    </div>
                                </form>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}

// --- Add to Folder Modal ---
function AddToFolderModal({ isOpen, onClose, documentId, documentName }: { isOpen: boolean; onClose: () => void; documentId: string; documentName: string }) {
    const { data: folders = [], isLoading } = useFolders();
    const { mutate: addDoc, isPending } = useAddDocumentToFolder();

    const handleAdd = (folderId: string) => {
        addDoc(
            { folderId, documentId },
            {
                onSuccess: () => { toast.success('Document added to folder'); onClose(); },
                onError: () => toast.error('Failed to add document to folder'),
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
                        <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 scale-95 translate-y-2" enterTo="opacity-100 scale-100 translate-y-0" leave="ease-in duration-150" leaveFrom="opacity-100 scale-100 translate-y-0" leaveTo="opacity-0 scale-95 translate-y-2">
                            <Dialog.Panel className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
                                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/60">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                                            <FolderOpen className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <Dialog.Title as="h3" className="text-base font-semibold text-[#1a2332]">Add to Folder</Dialog.Title>
                                            <p className="text-xs text-slate-400 truncate max-w-[220px]">{documentName}</p>
                                        </div>
                                    </div>
                                    <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"><X className="w-4 h-4" /></button>
                                </div>
                                <div className="p-4">
                                    {isLoading ? (
                                        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>
                                    ) : folders.length === 0 ? (
                                        <div className="text-center py-10">
                                            <FolderPlus className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                                            <p className="text-sm text-slate-400">No folders yet.</p>
                                            <p className="text-xs text-slate-300">Create a folder from the Case Folders tab.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-1.5 max-h-60 overflow-y-auto">
                                            {folders.map((f: CaseFolder) => (
                                                <button
                                                    key={f.id}
                                                    onClick={() => handleAdd(f.id)}
                                                    disabled={isPending}
                                                    className="w-full flex items-center justify-between gap-3 p-3.5 rounded-xl hover:bg-[#faf8f6] border border-transparent hover:border-[#e8e2de] transition-all group text-left disabled:opacity-50"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="p-2 rounded-lg bg-[#f7f3f1] group-hover:bg-[#2a3b4e]/8 transition-colors">
                                                            <FolderOpen className="w-4 h-4 text-[#2a3b4e]/50" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-semibold text-[#1a2332] truncate">{f.name}</p>
                                                            {f.description && <p className="text-xs text-slate-400 truncate">{f.description}</p>}
                                                        </div>
                                                    </div>
                                                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 shrink-0 transition-colors" />
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

// --- Folder Card ---
function FolderCard({ folder, onDelete }: { folder: any; onDelete: (id: string) => void }) {
    const { fetcher } = useApi();
    const { data: folderDetail } = useQuery({
        queryKey: ['folders', folder.id],
        queryFn: () => fetcher(`/api/folders/${folder.id}`),
    });

    const docCount = folderDetail?.documents?.length ?? 0;
    const formattedDate = new Date(folder.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return (
        <motion.div
            layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="group relative bg-white rounded-xl border border-[#e8e2de] hover:border-[#2a3b4e]/25 hover:shadow-md transition-all overflow-hidden"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-[#2a3b4e]/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative p-5">
                <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-[#2a3b4e]/10 to-[#3d5a80]/10 border border-[#2a3b4e]/8">
                        <FolderOpen className="w-6 h-6 text-[#2a3b4e]/60" />
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(folder.id); }}
                        className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                        title="Delete folder"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
                <h3 className="text-[14px] font-bold text-[#1a2332] truncate mb-1">{folder.name}</h3>
                {folder.description && <p className="text-[12px] text-[#2a3b4e]/40 line-clamp-2 mb-3">{folder.description}</p>}
                <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-1.5 text-[11px] text-[#2a3b4e]/40 font-medium">
                        <FileText className="w-3 h-3" />
                        <span>{docCount} document{docCount !== 1 ? 's' : ''}</span>
                    </div>
                    <span className="text-[10px] text-[#2a3b4e]/25">{formattedDate}</span>
                </div>
            </div>
            <div className="border-t border-[#e8e2de] bg-[#faf8f6]/60">
                <Link
                    href={`/folders/${folder.id}`}
                    className="flex items-center justify-between px-5 py-3 text-[12px] font-semibold text-[#2a3b4e]/60 hover:text-[#1a2332] hover:bg-[#f7f3f1] transition-colors group/link"
                >
                    <span>Open Folder</span>
                    <ChevronRight className="w-4 h-4 group-hover/link:translate-x-0.5 transition-transform" />
                </Link>
            </div>
        </motion.div>
    );
}

// --- Main export ---
export default function CaseFoldersTab() {
    const [createOpen, setCreateOpen] = useState(false);
    const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
    const [lastError, setLastError] = useState<string | null>(null);
    const { data: folders = [], isLoading } = useFolders();
    const { mutate: deleteFolder } = useDeleteFolder();

    const handleDelete = (id: string) => {
        if (confirm('Delete this folder? Documents inside will NOT be deleted.')) {
            deleteFolder(id, {
                onSuccess: () => toast.success('Folder deleted'),
                onError: () => toast.error('Failed to delete folder'),
            });
        }
    };

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-[#1a2332]">Case Folders</h2>
                    <p className="text-xs text-[#2a3b4e]/40 mt-0.5">Group documents and run cross-document AI synthesis</p>
                </div>
                <button
                    onClick={() => setCreateOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#2a3b4e] text-white text-sm font-semibold rounded-xl hover:bg-[#1a2332] transition-all shadow-sm active:scale-[0.98]"
                >
                    <Plus className="w-4 h-4" />
                    New Folder
                </button>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-44 rounded-xl bg-[#faf8f6] animate-pulse border border-[#e8e2de]" />
                    ))}
                </div>
            ) : folders.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-[#e8e2de] rounded-xl bg-[#faf8f6]/40"
                >
                    <div className="w-16 h-16 rounded-2xl bg-[#f7f3f1] flex items-center justify-center mb-4">
                        <FolderPlus className="w-7 h-7 text-[#2a3b4e]/15" />
                    </div>
                    <p className="text-[15px] font-bold text-[#1a2332]/30 mb-1">No case folders yet</p>
                    <p className="text-[12px] text-[#2a3b4e]/25 mb-5">Group documents for cross-document AI analysis</p>
                    <button
                        onClick={() => setCreateOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-[#2a3b4e] text-white text-sm font-semibold rounded-xl hover:bg-[#1a2332] transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Create First Folder
                    </button>
                </motion.div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence>
                        {folders.map((folder: CaseFolder) => (
                            <FolderCard key={folder.id} folder={folder} onDelete={handleDelete} />
                        ))}
                    </AnimatePresence>
                </div>
            )}

            <CreateFolderModal 
                isOpen={createOpen} 
                onClose={() => setCreateOpen(false)} 
                onLimitReached={(msg) => {
                    setLastError(msg);
                    setUpgradeModalOpen(true);
                }}
            />

            <UpgradeModal 
                isOpen={upgradeModalOpen} 
                onClose={() => setUpgradeModalOpen(false)} 
                limitName="Case Folders"
                description={lastError || undefined}
            />
        </div>
    );
}

export { AddToFolderModal };
